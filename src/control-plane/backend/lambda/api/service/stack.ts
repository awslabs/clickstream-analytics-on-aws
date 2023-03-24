/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

import { Parameter } from '@aws-sdk/client-cloudformation';
import {
  StartExecutionCommand,
  StartExecutionCommandOutput,
  DescribeExecutionCommand,
  DescribeExecutionCommandOutput,
  ExecutionStatus,
} from '@aws-sdk/client-sfn';
import { awsUrlSuffix, s3MainRegion, stackWorkflowS3Bucket, stackWorkflowStateMachineArn } from '../common/constants';
import { sfnClient } from '../common/sfn';
import { isEmpty, tryToJson } from '../common/utils';
import { getETLPipelineStackParameters, getIngestionStackParameters, getKafkaConnectorStackParameters, Pipeline } from '../model/pipeline';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

export interface StackDataMap {
  [name: string]: StackData;
}

export interface StackData {
  readonly Input: SfnStackInput;
  readonly Callback: SfnStackCallback;
}

interface SfnStackInput {
  readonly Action: string;
  readonly StackName: string;
  readonly TemplateURL: string;
  readonly Parameters: Parameter[];
}

interface SfnStackCallback {
  readonly BucketName: string;
  readonly BucketPrefix: string;
}

interface WorkflowTemplate {
  readonly Version: string;
  readonly Workflow: WorkflowParallel;
}

interface WorkflowParallel {
  readonly Type: string;
  readonly Branches: WorkflowParallelBranch[];
  readonly End?: boolean;
}

interface WorkflowParallelBranch {
  readonly StartAt: string;
  readonly States: WorkflowState;
}

interface WorkflowState {
  [name: string]: {
    readonly Type: string;
    readonly Data: any;
    readonly End: boolean;
  };
}

const store: ClickStreamStore = new DynamoDbStore();

export class StackManager {
  public async generateWorkflow(pipeline: Pipeline, executionName: string): Promise<any> {

    const stackData = await this.getStackData(pipeline, executionName);
    // TODO：read workflow template from dictionary （）
    const workflowTemplate: WorkflowTemplate = {
      Version: '2022-03-15',
      Workflow: {
        Type: 'Parallel',
        End: true,
        Branches: [
          {
            StartAt: 'Ingestion',
            States: {
              Ingestion: {
                Type: 'Stack',
                Data: stackData.Ingestion,
                End: true,
              },
            },
          },
        ],
      },
    };
    if (pipeline.ingestionServer.sinkType === 'kafka') {
      workflowTemplate.Workflow.Branches.push({
        StartAt: 'KafkaConnector',
        States: {
          KafkaConnector: {
            Type: 'Stack',
            Data: stackData.KafkaConnector,
            End: true,
          },
        },
      });
    }
    if (!isEmpty(pipeline.etl)) {
      workflowTemplate.Workflow.Branches.push({
        StartAt: 'ETL',
        States: {
          ETL: {
            Type: 'Stack',
            Data: stackData.ETL,
            End: true,
          },
        },
      });
    }
    return workflowTemplate;
  }

  public async execute(input: string, name: string): Promise<string> {
    const params: StartExecutionCommand = new StartExecutionCommand({
      stateMachineArn: stackWorkflowStateMachineArn,
      input: input,
      name: name,
    });
    const result: StartExecutionCommandOutput = await sfnClient.send(params);
    return result.executionArn ?? '';
  }

  public async getStackData(pipeline: Pipeline, executionName: string): Promise<StackDataMap> {
    if (!stackWorkflowS3Bucket) {
      throw Error('Stack Workflow S3Bucket can not empty.');
    }
    const stackDataMap: StackDataMap = {};

    const ingestionTemplateURL = await this.getTemplateUrl(`ingestion_${pipeline.ingestionServer.sinkType}`);
    if (!ingestionTemplateURL) {
      throw Error(`Template: ingestion_${pipeline.ingestionServer.sinkType} not found in dictionary.`);
    }
    const ingestionStackParameters = await getIngestionStackParameters(pipeline);
    const ingestionStackName = `clickstream-ingestion-${pipeline.ingestionServer.sinkType}-${pipeline.pipelineId}`;
    stackDataMap.Ingestion = {
      Input: {
        Action: 'Create',
        StackName: ingestionStackName,
        TemplateURL: ingestionTemplateURL,
        Parameters: ingestionStackParameters,
      },
      Callback: {
        BucketName: stackWorkflowS3Bucket,
        BucketPrefix: `workflow/${executionName}/Ingestion`,
      },
    };

    const kafkaConnectorTemplateURL = await this.getTemplateUrl('kafka-s3-sink');
    if (!kafkaConnectorTemplateURL) {
      throw Error('Template: kafka-s3-sink not found in dictionary.');
    }
    const kafkaConnectorStackParameters = await getKafkaConnectorStackParameters(pipeline);
    const kafkaConnectorStackName = `clickstream-kafka-connector-${pipeline.pipelineId}`;
    stackDataMap.KafkaConnector = {
      Input: {
        Action: 'Create',
        StackName: kafkaConnectorStackName,
        TemplateURL: kafkaConnectorTemplateURL,
        Parameters: kafkaConnectorStackParameters,
      },
      Callback: {
        BucketName: stackWorkflowS3Bucket,
        BucketPrefix: `workflow/${executionName}/KafkaConnector`,
      },
    };

    const dataPipelineTemplateURL = await this.getTemplateUrl('data-pipeline');
    if (!dataPipelineTemplateURL) {
      throw Error('Template: data-pipeline not found in dictionary.');
    }

    const pipelineStackParameters = await getETLPipelineStackParameters(pipeline);
    const pipelineStackName = `clickstream-etl-${pipeline.pipelineId}`;
    stackDataMap.ETL = {
      Input: {
        Action: 'Create',
        StackName: pipelineStackName,
        TemplateURL: dataPipelineTemplateURL,
        Parameters: pipelineStackParameters,
      },
      Callback: {
        BucketName: stackWorkflowS3Bucket,
        BucketPrefix: `workflow/${executionName}/ETL`,
      },
    };

    return stackDataMap;
  }

  public async getExecutionStatus(executionArn: string): Promise<ExecutionStatus | string | undefined> {
    const params: DescribeExecutionCommand = new DescribeExecutionCommand({
      executionArn: executionArn,
    });
    const result: DescribeExecutionCommandOutput = await sfnClient.send(params);
    return result.status;
  }

  public async getTemplateUrl(name: string) {
    const solution = await store.getDictionary('Solution');
    const templates = await store.getDictionary('Templates');
    if (solution && templates) {
      solution.data = tryToJson(solution.data);
      templates.data = tryToJson(templates.data);
      if (isEmpty(templates.data[name])) {
        return undefined;
      }
      const s3Host = `https://${solution.data.dist_output_bucket}.s3.${s3MainRegion}.${awsUrlSuffix}`;
      const prefix = solution.data.prefix;
      return `${s3Host}/${solution.data.name}/${prefix}/${templates.data[name]}`;
    }
    return undefined;
  };

}