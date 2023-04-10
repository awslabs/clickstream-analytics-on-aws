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

import { Parameter, Output } from '@aws-sdk/client-cloudformation';
import {
  StartExecutionCommand,
  StartExecutionCommandOutput,
  DescribeExecutionCommand,
  DescribeExecutionCommandOutput,
  ExecutionStatus,
} from '@aws-sdk/client-sfn';
import { v4 as uuidv4 } from 'uuid';
import { awsUrlSuffix, s3MainRegion, stackWorkflowS3Bucket, stackWorkflowStateMachineArn } from '../common/constants';
import { sfnClient } from '../common/sfn';
import { WorkflowParallelBranch, WorkflowState, WorkflowStateType, WorkflowTemplate } from '../common/types';
import { isEmpty, tryToJson } from '../common/utils';
import {
  getDataAnalyticsStackParameters,
  getETLPipelineStackParameters,
  getIngestionStackParameters,
  getKafkaConnectorStackParameters,
  Pipeline,
} from '../model/pipeline';
import { describeStack } from '../store/aws/cloudformation';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const store: ClickStreamStore = new DynamoDbStore();

export class StackManager {
  public async generateWorkflow(pipeline: Pipeline): Promise<WorkflowTemplate> {

    const workflowTemplate: WorkflowTemplate = {
      Version: '2022-03-15',
      Workflow: {
        Type: WorkflowStateType.PARALLEL,
        End: true,
        Branches: [],
      },
    };
    if (!isEmpty(pipeline.ingestionServer)) {
      const branch = await this.getStackData(pipeline, 'Ingestion');
      if (branch) {
        workflowTemplate.Workflow.Branches?.push(branch);
      }
    }
    if (!isEmpty(pipeline.etl)) {
      const branch = await this.getStackData(pipeline, 'ETL');
      if (branch) {
        workflowTemplate.Workflow.Branches?.push(branch);
      }
    }
    if (!isEmpty(pipeline.dataAnalytics)) {
      const branch = await this.getStackData(pipeline, 'DataAnalytics');
      if (branch) {
        workflowTemplate.Workflow.Branches?.push(branch);
      }
    }
    return workflowTemplate;
  }

  public async updateETLWorkflow(pipeline: Pipeline): Promise<void> {
    if (!pipeline.workflow) {
      return;
    }
    const curPipeline = pipeline;

    const apps = await store.listApplication(pipeline.projectId, 'asc', false, 1, 1);
    const appIds: string[] = apps.items.map(a => a.appId);

    let update: boolean = false;

    // update AppIds Parameter
    pipeline.workflow.Workflow = this.setWorkflowType(pipeline.workflow.Workflow, WorkflowStateType.PASS);
    for (let branch of pipeline.workflow?.Workflow.Branches as WorkflowParallelBranch[]) {
      if (Object.keys(branch.States).indexOf('ETL') > -1) {
        for (let p of branch.States.ETL.Data?.Input.Parameters as Parameter[]) {
          if (p.ParameterKey === 'AppIds' && p.ParameterValue !== appIds.join(',')) {
            p.ParameterValue = appIds.join(',');
            branch.States.ETL.Type = WorkflowStateType.STACK;
            branch.States.ETL.Data!.Input.Action = 'Update';
            update = true;
            break;
          }
        }
      }
      if (Object.keys(branch.States).indexOf('DataAnalytics') > -1) {
        for (let p of branch.States.DataAnalytics.Data?.Input.Parameters as Parameter[]) {
          if (p.ParameterKey === 'AppIds' && p.ParameterValue !== appIds.join(',')) {
            p.ParameterValue = appIds.join(',');
            branch.States.DataAnalytics.Type = WorkflowStateType.STACK;
            branch.States.DataAnalytics.Data!.Input.Action = 'Update';
            update = true;
            break;
          }
        }
      }
    }

    if (update) {
      // update stack
      pipeline.executionName = `main-${uuidv4()}`;
      pipeline.executionArn = await this.execute(pipeline.workflow, pipeline.executionName);
      // update pipline metadata
      await store.updatePipeline(pipeline, curPipeline);
    }
  }

  public async generateDeleteWorkflow(pipeline: Pipeline): Promise<WorkflowTemplate> {
    const workflowTemplate: WorkflowTemplate = {
      Version: '2022-03-15',
      Workflow: {
        Type: WorkflowStateType.PARALLEL,
        End: true,
        Branches: [],
      },
    };
    if (!isEmpty(pipeline.ingestionServer)) {
      const branch = await this.getStackData(pipeline, 'Ingestion');
      if (branch) {
        workflowTemplate.Workflow.Branches?.push(branch);
      }
    }
    if (!isEmpty(pipeline.etl)) {
      const branch = await this.getStackData(pipeline, 'ETL');
      if (branch) {
        workflowTemplate.Workflow.Branches?.push(branch);
      }
    }
    return workflowTemplate;
  }

  public async execute(workflow: WorkflowTemplate | undefined, executionName: string): Promise<string> {
    if (workflow === undefined) {
      throw new Error('Pipeline workflow is empty.');
    }
    const params: StartExecutionCommand = new StartExecutionCommand({
      stateMachineArn: stackWorkflowStateMachineArn,
      input: JSON.stringify(workflow.Workflow),
      name: executionName,
    });
    const result: StartExecutionCommandOutput = await sfnClient.send(params);
    return result.executionArn ?? '';
  }

  public async getStackData(pipeline: Pipeline, type: string): Promise<WorkflowParallelBranch | undefined> {
    if (!stackWorkflowS3Bucket) {
      throw new Error('Stack Workflow S3Bucket can not empty.');
    }
    if (type === 'Ingestion') {
      const ingestionTemplateURL = await this.getTemplateUrl(`ingestion_${pipeline.ingestionServer.sinkType}`);
      if (!ingestionTemplateURL) {
        throw Error(`Template: ingestion_${pipeline.ingestionServer.sinkType} not found in dictionary.`);
      }
      const ingestionStackParameters = await getIngestionStackParameters(pipeline);
      const ingestionStackName = this.getStackName(pipeline, 'ingestion');
      const ingestionState: WorkflowState = {
        Type: WorkflowStateType.STACK,
        Data: {
          Input: {
            Action: 'Create',
            StackName: ingestionStackName,
            TemplateURL: ingestionTemplateURL,
            Parameters: ingestionStackParameters,
          },
          Callback: {
            BucketName: stackWorkflowS3Bucket,
            BucketPrefix: `clickstream/workflow/${pipeline.executionName}/${ingestionStackName}`,
          },
        },
      };

      if (pipeline.ingestionServer.sinkType === 'kafka' && pipeline.ingestionServer.sinkKafka?.kafkaConnector.enable) {
        const kafkaConnectorTemplateURL = await this.getTemplateUrl('kafka-s3-sink');
        if (!kafkaConnectorTemplateURL) {
          throw Error('Template: kafka-s3-sink not found in dictionary.');
        }
        const kafkaConnectorStackParameters = await getKafkaConnectorStackParameters(pipeline);
        const kafkaConnectorStackName = this.getStackName(pipeline, 'kafka-connector');
        const kafkaConnectorState: WorkflowState = {
          Type: WorkflowStateType.STACK,
          Data: {
            Input: {
              Action: 'Create',
              StackName: kafkaConnectorStackName,
              TemplateURL: kafkaConnectorTemplateURL,
              Parameters: kafkaConnectorStackParameters,
            },
            Callback: {
              BucketName: stackWorkflowS3Bucket,
              BucketPrefix: `clickstream/workflow/${pipeline.executionName}/${kafkaConnectorStackName}`,
            },
          },
          End: true,
        };
        ingestionState.Next = 'KafkaConnector';
        return {
          StartAt: 'Ingestion',
          States: {
            Ingestion: ingestionState,
            KafkaConnector: kafkaConnectorState,
          },
        };
      }
      ingestionState.End = true;
      return {
        StartAt: 'Ingestion',
        States: {
          Ingestion: ingestionState,
        },
      };
    }
    if (type === 'ETL') {
      if (pipeline.ingestionServer.sinkType === 'kafka' && !pipeline.ingestionServer.sinkKafka?.kafkaConnector.enable) {
        return undefined;
      }
      const dataPipelineTemplateURL = await this.getTemplateUrl('data-pipeline');
      if (!dataPipelineTemplateURL) {
        throw Error('Template: data-pipeline not found in dictionary.');
      }

      const pipelineStackParameters = await getETLPipelineStackParameters(pipeline);
      const pipelineStackName = this.getStackName(pipeline, 'etl');
      const etlState: WorkflowState = {
        Type: WorkflowStateType.STACK,
        Data: {
          Input: {
            Action: 'Create',
            StackName: pipelineStackName,
            TemplateURL: dataPipelineTemplateURL,
            Parameters: pipelineStackParameters,
          },
          Callback: {
            BucketName: stackWorkflowS3Bucket,
            BucketPrefix: `clickstream/workflow/${pipeline.executionName}/${pipelineStackName}`,
          },
        },
        End: true,
      };
      return {
        StartAt: 'ETL',
        States: {
          ETL: etlState,
        },
      };
    }
    if (type === 'DataAnalytics') {
      if (pipeline.ingestionServer.sinkType === 'kafka' && !pipeline.ingestionServer.sinkKafka?.kafkaConnector.enable) {
        return undefined;
      }
      const dataAnalyticsTemplateURL = await this.getTemplateUrl('data-analytics');
      if (!dataAnalyticsTemplateURL) {
        throw Error('Template: data-analytics not found in dictionary.');
      }

      const dataAnalyticsStackParameters = await getDataAnalyticsStackParameters(pipeline);
      const dataAnalyticsStackName = this.getStackName(pipeline, 'data-analytics');
      const dataAnalyticsState: WorkflowState = {
        Type: WorkflowStateType.STACK,
        Data: {
          Input: {
            Action: 'Create',
            StackName: dataAnalyticsStackName,
            TemplateURL: dataAnalyticsTemplateURL,
            Parameters: dataAnalyticsStackParameters,
          },
          Callback: {
            BucketName: stackWorkflowS3Bucket,
            BucketPrefix: `clickstream/workflow/${pipeline.executionName}/${dataAnalyticsStackName}`,
          },
        },
        End: true,
      };
      return {
        StartAt: 'DataAnalytics',
        States: {
          DataAnalytics: dataAnalyticsState,
        },
      };
    }
    return undefined;
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

  public async getStackOutput(pipeline: Pipeline, key: string, outputKey: string): Promise<string | undefined> {
    const stack = await describeStack(pipeline.region, this.getStackName(pipeline, key));
    if (stack) {
      for (let out of stack.Outputs as Output[]) {
        if (out.OutputKey?.endsWith(outputKey)) {
          return out.OutputValue ?? '';
        }
      }
    }
    return undefined;
  }

  public async getStackStatus(pipeline: Pipeline, key: string): Promise<string | undefined> {
    const stack = await describeStack(pipeline.region, this.getStackName(pipeline, key));
    return stack ? stack.StackStatus : undefined;
  }

  public getStackName(pipeline: Pipeline, key: string): string {
    const names: Map<string, string> = new Map();
    names.set('ingestion', `clickstream-ingestion-${pipeline.ingestionServer.sinkType}-${pipeline.pipelineId}`);
    names.set('kafka-connector', `clickstream-kafka-connector-${pipeline.pipelineId}`);
    names.set('etl', `clickstream-etl-${pipeline.pipelineId}`);
    names.set('data-analytics', `clickstream-data-analytics-${pipeline.pipelineId}`);
    return names.get(key)?? '';
  }

  public setWorkflowType(state: WorkflowState, type: WorkflowStateType): WorkflowState {
    if (state.Type === 'Parallel') {
      for (let branch of state.Branches as WorkflowParallelBranch[]) {
        for (let key of Object.keys(branch.States)) {
          branch.States[key] = this.setWorkflowType(branch.States[key], type);
        }
      }
    } else {
      state.Type = type;
    }
    return state;
  }

}