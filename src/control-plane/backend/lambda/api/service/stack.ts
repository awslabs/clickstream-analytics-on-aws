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

import { Output, Parameter, StackStatus } from '@aws-sdk/client-cloudformation';
import {
  DescribeExecutionCommand,
  DescribeExecutionCommandOutput,
  StartExecutionCommand,
  StartExecutionCommandOutput,
  DescribeExecutionOutput,
  ExecutionStatus,
} from '@aws-sdk/client-sfn';
import { v4 as uuidv4 } from 'uuid';
import { awsUrlSuffix, s3MainRegion, stackWorkflowS3Bucket, stackWorkflowStateMachineArn } from '../common/constants';
import { sfnClient } from '../common/sfn';
import {
  PipelineStackType,
  PipelineStatus,
  PipelineStatusDetail,
  PipelineStatusType,
  WorkflowParallelBranch,
  WorkflowState,
  WorkflowStateType,
  WorkflowTemplate, WorkflowVersion,
} from '../common/types';
import { isEmpty, tryToJson } from '../common/utils';
import {
  getDataAnalyticsStackParameters,
  getETLPipelineStackParameters,
  getIngestionStackParameters,
  getKafkaConnectorStackParameters,
  IPipeline,
} from '../model/pipeline';
import { describeStack } from '../store/aws/cloudformation';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const store: ClickStreamStore = new DynamoDbStore();

export class StackManager {

  private pipeline: IPipeline;
  private workflow?: WorkflowTemplate;
  private execWorkflow?: WorkflowTemplate;

  constructor(pipeline: IPipeline) {
    this.pipeline = pipeline;
    this.workflow = pipeline.workflow;
    if (pipeline.workflow) {
      // Deep Copy Workflow
      this.execWorkflow = JSON.parse(JSON.stringify(pipeline.workflow));
    }
  }

  public getExecWorkflow(): WorkflowTemplate | undefined {
    return this.execWorkflow;
  }

  public async generateWorkflow(): Promise<WorkflowTemplate> {

    const workflowTemplate: WorkflowTemplate = {
      Version: WorkflowVersion.V20220315,
      Workflow: {
        Type: WorkflowStateType.PARALLEL,
        End: true,
        Branches: [],
      },
    };
    if (!isEmpty(this.pipeline.ingestionServer)) {
      const branch = await this.getStackData(PipelineStackType.INGESTION);
      if (branch) {
        workflowTemplate.Workflow.Branches?.push(branch);
      }
    }
    if (!isEmpty(this.pipeline.etl)) {
      const branch = await this.getStackData(PipelineStackType.ETL);
      if (branch) {
        workflowTemplate.Workflow.Branches?.push(branch);
      }
    }
    if (!isEmpty(this.pipeline.dataAnalytics)) {
      const branch = await this.getStackData(PipelineStackType.DATA_ANALYTICS);
      if (branch) {
        workflowTemplate.Workflow.Branches?.push(branch);
      }
    }
    return workflowTemplate;
  }

  public async updateETLWorkflow(appIds: string[]): Promise<void> {
    if (!this.execWorkflow || !this.workflow) {
      throw new Error('Pipeline workflow is empty.');
    }

    // Update execWorkflow AppIds Parameter and Action
    this.execWorkflow.Workflow = this.setWorkflowType(this.execWorkflow.Workflow, WorkflowStateType.PASS);

    this.execWorkflow.Workflow = this.updateStackParameter(
      this.execWorkflow.Workflow, PipelineStackType.ETL, 'AppIds', appIds.join(','), 'Update');
    this.execWorkflow.Workflow = this.updateStackParameter(
      this.execWorkflow.Workflow, PipelineStackType.DATA_ANALYTICS, 'AppIds', appIds.join(','), 'Update');

    // Update saveWorkflow AppIds Parameter
    this.workflow.Workflow = this.updateStackParameter(
      this.workflow.Workflow, PipelineStackType.ETL, 'AppIds', appIds.join(','), 'Create');
    this.workflow.Workflow = this.updateStackParameter(
      this.workflow.Workflow, PipelineStackType.DATA_ANALYTICS, 'AppIds', appIds.join(','), 'Create');

    // update stack
    this.pipeline.executionName = `main-${uuidv4()}`;
    this.pipeline.executionArn = await this.execute(this.execWorkflow, this.pipeline.executionName);
    // update pipline metadata
    await store.updatePipelineAtCurrentVersion(this.pipeline);
  }

  public async deleteWorkflow(): Promise<void> {
    if (!this.execWorkflow) {
      throw new Error('Pipeline workflow is empty.');
    }

    this.execWorkflow.Workflow = this.getDeleteWorkflow(this.execWorkflow.Workflow);

    // update stack
    this.pipeline.executionName = `main-${uuidv4()}`;
    this.pipeline.executionArn = await this.execute(this.execWorkflow, this.pipeline.executionName);
    // update pipline metadata
    await store.updatePipelineAtCurrentVersion(this.pipeline);
  }

  public async retryWorkflow(stackType?: PipelineStackType): Promise<void> {
    if (!this.execWorkflow || !this.pipeline.status?.stackDetails) {
      throw new Error('Pipeline workflow or stack information is empty.');
    }
    const stackDetails = this.pipeline.status?.stackDetails;
    let failStackNames: string[] = stackDetails.filter(status => status.stackStatus?.endsWith('_FAILED')).map(status => status.stackName);
    if (stackType) {
      failStackNames = failStackNames.filter(stackName => stackName === this.getStackName(stackType));
    }
    if (failStackNames.length === 0) {
      return;
    }

    this.execWorkflow.Workflow = this.getRetryWorkflow(this.execWorkflow.Workflow, failStackNames);

    // update stack
    this.pipeline.executionName = `main-${uuidv4()}`;
    this.pipeline.executionArn = await this.execute(this.execWorkflow, this.pipeline.executionName);
    // update pipline metadata
    await store.updatePipelineAtCurrentVersion(this.pipeline);
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

  public async getPipelineStatus(): Promise<PipelineStatus> {
    if (!this.workflow?.Workflow || !this.pipeline.executionArn) {
      return {
        status: PipelineStatusType.ACTIVE,
        stackDetails: [],
        executionDetail: {},
      };
    }
    const executionDetail = await this.getExecutionDetail(this.pipeline.executionArn);
    const stackNames = this.getWorkflowStacks(this.workflow?.Workflow);
    const stackStatusDetails: PipelineStatusDetail[] = [];
    for (let stackName of stackNames as string[]) {
      const stack = await describeStack(this.pipeline.region, stackName);
      let consoleDomain = 'console.aws.amazon.com';
      if (this.pipeline.region.startsWith('cn')) {
        consoleDomain = 'console.amazonaws.cn';
      }
      stackStatusDetails.push({
        stackName: stackName,
        stackType: stackName.split('-')[1] as PipelineStackType,
        stackStatus: stack?.StackStatus as StackStatus,
        stackStatusReason: stack?.StackStatusReason ?? '',
        url: `https://${this.pipeline.region}.${consoleDomain}/cloudformation/home?region=${this.pipeline.region}#/stacks/stackinfo?stackId=${stack?.StackId}`,
      });
    }
    if (!isEmpty(stackStatusDetails)) {
      let action: string = 'CREATE';
      let miss: boolean = false;
      let status: string = PipelineStatusType.ACTIVE;
      for (let s of stackStatusDetails) {
        if (s.stackStatus === undefined) {
          miss = true;
        } else if (s.stackStatus.endsWith('_FAILED')) {
          action = s.stackStatus.split('_')[0];
          status = PipelineStatusType.FAILED;
          break;
        } else if (s.stackStatus.endsWith('_IN_PROGRESS')) {
          action = s.stackStatus.split('_')[0];
          if (action === 'CREATE') {
            status = PipelineStatusType.CREATING;
          } else if (action === 'DELETE') {
            status = PipelineStatusType.DELETING;
          } else {
            status = PipelineStatusType.UPDATING;
          }
        }
      }
      if (miss) {
        if (executionDetail?.status === ExecutionStatus.FAILED ||
          executionDetail?.status === ExecutionStatus.TIMED_OUT ||
          executionDetail?.status === ExecutionStatus.ABORTED) {
          status = PipelineStatusType.FAILED;
        } else {
          status = PipelineStatusType.CREATING;
        }
      }
      return {
        status: status,
        stackDetails: stackStatusDetails,
        executionDetail: {
          name: executionDetail?.name,
          status: executionDetail?.status,
          output: executionDetail?.output,
        },
      } as PipelineStatus;
    }

    return {
      status: PipelineStatusType.ACTIVE,
      stackDetails: [],
      executionDetail: {},
    } as PipelineStatus;
  }

  public async getStackOutput(key: PipelineStackType, outputKey: string): Promise<string | undefined> {
    const stack = await describeStack(this.pipeline.region, this.getStackName(key));
    if (stack) {
      for (let out of stack.Outputs as Output[]) {
        if (out.OutputKey?.endsWith(outputKey)) {
          return out.OutputValue ?? '';
        }
      }
    }
    return undefined;
  }

  private async getStackData(type: string): Promise<WorkflowParallelBranch | undefined> {
    if (!stackWorkflowS3Bucket) {
      throw new Error('Stack Workflow S3Bucket can not empty.');
    }
    if (type === PipelineStackType.INGESTION) {
      const ingestionTemplateURL = await this.getTemplateUrl(`ingestion_${this.pipeline.ingestionServer.sinkType}`);
      if (!ingestionTemplateURL) {
        throw Error(`Template: ingestion_${this.pipeline.ingestionServer.sinkType} not found in dictionary.`);
      }
      const ingestionStackParameters = await getIngestionStackParameters(this.pipeline);
      const ingestionStackName = this.getStackName(PipelineStackType.INGESTION);
      const ingestionState: WorkflowState = {
        Type: WorkflowStateType.STACK,
        Data: {
          Input: {
            Action: 'Create',
            Region: this.pipeline.region,
            StackName: ingestionStackName,
            TemplateURL: ingestionTemplateURL,
            Parameters: ingestionStackParameters,
          },
          Callback: {
            BucketName: stackWorkflowS3Bucket,
            BucketPrefix: `clickstream/workflow/${this.pipeline.executionName}/${ingestionStackName}`,
          },
        },
      };

      if (this.pipeline.ingestionServer.sinkType === 'kafka' && this.pipeline.ingestionServer.sinkKafka?.kafkaConnector.enable) {
        const kafkaConnectorTemplateURL = await this.getTemplateUrl('kafka-s3-sink');
        if (!kafkaConnectorTemplateURL) {
          throw Error('Template: kafka-s3-sink not found in dictionary.');
        }
        const kafkaConnectorStackParameters = await getKafkaConnectorStackParameters(this.pipeline);
        const kafkaConnectorStackName = this.getStackName(PipelineStackType.KAFKA_CONNECTOR);
        const kafkaConnectorState: WorkflowState = {
          Type: WorkflowStateType.STACK,
          Data: {
            Input: {
              Action: 'Create',
              Region: this.pipeline.region,
              StackName: kafkaConnectorStackName,
              TemplateURL: kafkaConnectorTemplateURL,
              Parameters: kafkaConnectorStackParameters,
            },
            Callback: {
              BucketName: stackWorkflowS3Bucket,
              BucketPrefix: `clickstream/workflow/${this.pipeline.executionName}/${kafkaConnectorStackName}`,
            },
          },
          End: true,
        };
        ingestionState.Next = PipelineStackType.KAFKA_CONNECTOR;
        return {
          StartAt: PipelineStackType.INGESTION,
          States: {
            [PipelineStackType.INGESTION]: ingestionState,
            [PipelineStackType.KAFKA_CONNECTOR]: kafkaConnectorState,
          },
        };
      }
      ingestionState.End = true;
      return {
        StartAt: PipelineStackType.INGESTION,
        States: {
          [PipelineStackType.INGESTION]: ingestionState,
        },
      };
    }
    if (type === PipelineStackType.ETL) {
      if (this.pipeline.ingestionServer.sinkType === 'kafka' && !this.pipeline.ingestionServer.sinkKafka?.kafkaConnector.enable) {
        return undefined;
      }
      const dataPipelineTemplateURL = await this.getTemplateUrl('data-pipeline');
      if (!dataPipelineTemplateURL) {
        throw Error('Template: data-pipeline not found in dictionary.');
      }

      const pipelineStackParameters = await getETLPipelineStackParameters(this.pipeline);
      const pipelineStackName = this.getStackName(PipelineStackType.ETL);
      const etlState: WorkflowState = {
        Type: WorkflowStateType.STACK,
        Data: {
          Input: {
            Action: 'Create',
            Region: this.pipeline.region,
            StackName: pipelineStackName,
            TemplateURL: dataPipelineTemplateURL,
            Parameters: pipelineStackParameters,
          },
          Callback: {
            BucketName: stackWorkflowS3Bucket,
            BucketPrefix: `clickstream/workflow/${this.pipeline.executionName}/${pipelineStackName}`,
          },
        },
        End: true,
      };
      return {
        StartAt: PipelineStackType.ETL,
        States: {
          [PipelineStackType.ETL]: etlState,
        },
      };
    }
    if (type === PipelineStackType.DATA_ANALYTICS) {
      if (this.pipeline.ingestionServer.sinkType === 'kafka' && !this.pipeline.ingestionServer.sinkKafka?.kafkaConnector.enable) {
        return undefined;
      }
      const dataAnalyticsTemplateURL = await this.getTemplateUrl('data-analytics');
      if (!dataAnalyticsTemplateURL) {
        throw Error('Template: data-analytics not found in dictionary.');
      }

      const dataAnalyticsStackParameters = await getDataAnalyticsStackParameters(this.pipeline);
      const dataAnalyticsStackName = this.getStackName(PipelineStackType.DATA_ANALYTICS);
      const dataAnalyticsState: WorkflowState = {
        Type: WorkflowStateType.STACK,
        Data: {
          Input: {
            Action: 'Create',
            Region: this.pipeline.region,
            StackName: dataAnalyticsStackName,
            TemplateURL: dataAnalyticsTemplateURL,
            Parameters: dataAnalyticsStackParameters,
          },
          Callback: {
            BucketName: stackWorkflowS3Bucket,
            BucketPrefix: `clickstream/workflow/${this.pipeline.executionName}/${dataAnalyticsStackName}`,
          },
        },
        End: true,
      };
      return {
        StartAt: PipelineStackType.DATA_ANALYTICS,
        States: {
          [PipelineStackType.DATA_ANALYTICS]: dataAnalyticsState,
        },
      };
    }
    return undefined;
  }

  private async getExecutionDetail(executionArn: string): Promise<DescribeExecutionOutput | undefined> {
    const params: DescribeExecutionCommand = new DescribeExecutionCommand({
      executionArn: executionArn,
    });
    const result: DescribeExecutionCommandOutput = await sfnClient.send(params);
    return result;
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

  private getStackName(key: PipelineStackType): string {
    const names: Map<string, string> = new Map();
    names.set(PipelineStackType.INGESTION, `Clickstream-${PipelineStackType.INGESTION}-${this.pipeline.ingestionServer.sinkType}-${this.pipeline.pipelineId}`);
    names.set(PipelineStackType.KAFKA_CONNECTOR, `Clickstream-${PipelineStackType.KAFKA_CONNECTOR}-${this.pipeline.pipelineId}`);
    names.set(PipelineStackType.ETL, `Clickstream-${PipelineStackType.ETL}-${this.pipeline.pipelineId}`);
    names.set(PipelineStackType.DATA_ANALYTICS, `Clickstream-${PipelineStackType.DATA_ANALYTICS}-${this.pipeline.pipelineId}`);
    return names.get(key) ?? '';
  }

  public setWorkflowType(state: WorkflowState, type: WorkflowStateType): WorkflowState {
    if (state.Type === WorkflowStateType.PARALLEL) {
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

  private getDeleteWorkflow(state: WorkflowState): WorkflowState {
    if (state.Type === WorkflowStateType.PARALLEL) {
      for (let branch of state.Branches as WorkflowParallelBranch[]) {
        for (let key of Object.keys(branch.States)) {
          branch.States[key] = this.getDeleteWorkflow(branch.States[key]);
        }
      }
    } else if (state.Type === WorkflowStateType.STACK) {
      state.Data!.Input.Action = 'Delete';
    }
    return state;
  }

  private getRetryWorkflow(state: WorkflowState, failStacks: string[]): WorkflowState {
    if (state.Type === WorkflowStateType.PARALLEL) {
      for (let branch of state.Branches as WorkflowParallelBranch[]) {
        for (let key of Object.keys(branch.States)) {
          branch.States[key] = this.getRetryWorkflow(branch.States[key], failStacks);
        }
      }
    } else if (state.Type === WorkflowStateType.STACK && state.Data?.Input.StackName) {
      if (failStacks.indexOf(state.Data?.Input.StackName) > -1) {
        state.Data.Input.Action = 'Update';
      } else {
        state.Type = WorkflowStateType.PASS;
      }
    }
    return state;
  }

  private getWorkflowStacks(state: WorkflowState): string[] {
    let res: string[] = [];
    if (state.Type === WorkflowStateType.PARALLEL) {
      for (let branch of state.Branches as WorkflowParallelBranch[]) {
        for (let key of Object.keys(branch.States)) {
          res = res.concat(this.getWorkflowStacks(branch.States[key]));
        }
      }
    } else if (state.Type === WorkflowStateType.STACK) {
      if (state.Data?.Input.StackName) {
        res.push(state.Data?.Input.StackName);
      }
    }
    return res;
  }

  private updateStackParameter(
    state: WorkflowState, type: PipelineStackType, parameterKey: string, parameterValue: string, action: string): WorkflowState {
    if (state.Type === WorkflowStateType.PARALLEL) {
      for (let branch of state.Branches as WorkflowParallelBranch[]) {
        for (let key of Object.keys(branch.States)) {
          branch.States[key] = this.updateStackParameter(branch.States[key], type, parameterKey, parameterValue, action);
        }
      }
    } else if (state.Data?.Input.StackName === this.getStackName(type)) {
      state.Type = WorkflowStateType.STACK;
      state.Data.Input.Action = action;
      for (let p of state.Data?.Input.Parameters as Parameter[]) {
        if (p.ParameterKey === parameterKey) {
          p.ParameterValue = parameterValue;
          break;
        }
      }
    }
    return state;
  }

}