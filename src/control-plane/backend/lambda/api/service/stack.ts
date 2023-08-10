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

import { Parameter, StackStatus, Tag } from '@aws-sdk/client-cloudformation';
import {
  DescribeExecutionCommand,
  DescribeExecutionCommandOutput,
  StartExecutionCommand,
  StartExecutionCommandOutput,
  DescribeExecutionOutput,
  ExecutionStatus,
} from '@aws-sdk/client-sfn';
import { stackWorkflowS3Bucket, stackWorkflowStateMachineArn } from '../common/constants';
import { sfnClient } from '../common/sfn';
import {
  PipelineStackType,
  PipelineStatus,
  PipelineStatusDetail,
  PipelineStatusType,
  WorkflowParallelBranch,
  WorkflowState,
  WorkflowStateType,
  WorkflowTemplate,
} from '../common/types';
import { isEmpty } from '../common/utils';
import { IPipeline } from '../model/pipeline';
import { describeStack } from '../store/aws/cloudformation';


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

  public setExecWorkflow(workflow: WorkflowTemplate): undefined {
    this.execWorkflow = JSON.parse(JSON.stringify(workflow));
    return ;
  }

  public getExecWorkflow(): WorkflowTemplate | undefined {
    return this.execWorkflow;
  }

  public updateWorkflowForApp(appIds: string[],
    ingestionStackName: string, dataProcessingStackName: string, analyticsStackName: string, reportStackName: string): void {
    if (!this.execWorkflow || !this.workflow) {
      throw new Error('Pipeline workflow is empty.');
    }

    // Update execWorkflow AppIds Parameter and Action
    this.execWorkflow.Workflow = this.setWorkflowType(this.execWorkflow.Workflow, WorkflowStateType.PASS);

    this.execWorkflow.Workflow = this.updateStackParameter(
      this.execWorkflow.Workflow, ingestionStackName, 'AppIds', appIds.join(','), 'Update');
    this.execWorkflow.Workflow = this.updateStackParameter(
      this.execWorkflow.Workflow, dataProcessingStackName, 'AppIds', appIds.join(','), 'Update');
    this.execWorkflow.Workflow = this.updateStackParameter(
      this.execWorkflow.Workflow, analyticsStackName, 'AppIds', appIds.join(','), 'Update');
    this.execWorkflow.Workflow = this.updateStackParameter(
      this.execWorkflow.Workflow, reportStackName, 'RedShiftDBSchemaParam', appIds.join(','), 'Update');

    // Update saveWorkflow AppIds Parameter
    this.workflow.Workflow = this.updateStackParameter(
      this.workflow.Workflow, ingestionStackName, 'AppIds', appIds.join(','), 'Create');
    this.workflow.Workflow = this.updateStackParameter(
      this.workflow.Workflow, dataProcessingStackName, 'AppIds', appIds.join(','), 'Create');
    this.workflow.Workflow = this.updateStackParameter(
      this.workflow.Workflow, analyticsStackName, 'AppIds', appIds.join(','), 'Create');
    this.workflow.Workflow = this.updateStackParameter(
      this.workflow.Workflow, reportStackName, 'RedShiftDBSchemaParam', appIds.join(','), 'Create');
  }

  public deleteWorkflow(): void {
    if (!this.execWorkflow) {
      throw new Error('Pipeline workflow is empty.');
    }
    this.execWorkflow.Workflow = this.getDeleteWorkflow(this.execWorkflow.Workflow);
  }

  public upgradeWorkflow(stackTemplateMap: Map<string, string>, stackTags: Tag[]): void {
    if (!this.execWorkflow || !this.workflow) {
      throw new Error('Pipeline workflow is empty.');
    }
    this.execWorkflow.Workflow = this.getUpgradeWorkflow(this.execWorkflow.Workflow, stackTemplateMap, stackTags, false);
    this.workflow.Workflow = this.getUpgradeWorkflow(this.workflow.Workflow, stackTemplateMap, stackTags, true);
  }

  public retryWorkflow(): void {
    if (!this.execWorkflow || !this.pipeline.status?.stackDetails) {
      throw new Error('Pipeline workflow or stack information is empty.');
    }
    const stackDetails = this.pipeline.status?.stackDetails;
    this.execWorkflow.Workflow = this.getRetryWorkflow(this.execWorkflow.Workflow, stackDetails);
  }

  public updateWorkflow(editStacks: string[]): void {
    if (!this.execWorkflow || !this.pipeline.status?.stackDetails) {
      throw new Error('Pipeline workflow or stack information is empty.');
    }
    const stackDetails = this.pipeline.status?.stackDetails;

    this.execWorkflow.Workflow = this.getUpdateWorkflow(this.execWorkflow.Workflow, stackDetails, editStacks);
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
      stackStatusDetails.push({
        stackName: stackName,
        stackType: stackName.split('-')[1] as PipelineStackType,
        stackStatus: stack?.StackStatus as StackStatus,
        stackStatusReason: stack?.StackStatusReason ?? '',
        outputs: stack?.Outputs ?? [],
      });
    }
    if (!isEmpty(stackStatusDetails)) {
      let action: string = 'CREATE';
      if (executionDetail?.input) {
        const executionInput = JSON.parse(executionDetail?.input);
        action = this.getWorkflowCurrentAction(executionInput as WorkflowState) ?? 'CREATE';
      }
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
      } else {
        if (executionDetail?.status === ExecutionStatus.RUNNING) {
          if (action === 'CREATE') {
            status = PipelineStatusType.CREATING;
          } else if (action === 'DELETE') {
            status = PipelineStatusType.DELETING;
          } else {
            status = PipelineStatusType.UPDATING;
          }
        }
      }
      return {
        status: status,
        stackDetails: stackStatusDetails,
        executionDetail: {
          name: executionDetail?.name,
          status: executionDetail?.status,
        },
      } as PipelineStatus;
    }

    return {
      status: PipelineStatusType.ACTIVE,
      stackDetails: [],
      executionDetail: {},
    } as PipelineStatus;
  }

  private async getExecutionDetail(executionArn: string): Promise<DescribeExecutionOutput | undefined> {
    const params: DescribeExecutionCommand = new DescribeExecutionCommand({
      executionArn: executionArn,
    });
    const result: DescribeExecutionCommandOutput = await sfnClient.send(params);
    return result;
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
        const orderMap = new Map<string, string>();
        for (let key of Object.keys(branch.States)) {
          if (branch.States[key].End) {
            orderMap.set(key, 'End');
          } else if (branch.States[key].Next) {
            orderMap.set(key, branch.States[key].Next!);
          }
          branch.States[key] = this.getDeleteWorkflow(branch.States[key]);
        }
        orderMap.forEach((value, key, _map) => {
          if (value !== 'End') {
            branch.States[value].Next = key;
          } else if (branch.StartAt !== key) {
            branch.States[branch.StartAt].End = true;
            delete branch.States[branch.StartAt].Next;
            delete branch.States[key].End;
            branch.StartAt = key;
          }
        });
      }
    } else if (state.Type === WorkflowStateType.STACK) {
      state.Data!.Input.Action = 'Delete';
      state.Data!.Callback = {
        BucketName: stackWorkflowS3Bucket ?? '',
        BucketPrefix: `clickstream/workflow/${this.pipeline.executionName}`,
      };
    }
    return state;
  }

  private getUpgradeWorkflow(state: WorkflowState, stackTemplateMap: Map<string, string>, stackTags: Tag[], origin: boolean): WorkflowState {
    if (state.Type === WorkflowStateType.PARALLEL) {
      for (let branch of state.Branches as WorkflowParallelBranch[]) {
        for (let key of Object.keys(branch.States)) {
          branch.States[key] = this.getUpgradeWorkflow(branch.States[key], stackTemplateMap, stackTags, origin);
        }
      }
    } else if (state.Type === WorkflowStateType.STACK && state.Data?.Input) {
      state.Data.Input.TemplateURL = stackTemplateMap.get(state.Data?.Input.StackName) ?? '';
      if (!origin) {
        state.Data.Input.Action = 'Upgrade';
      }
      state.Data.Input.Tags = stackTags;
      state.Data!.Callback = {
        BucketName: stackWorkflowS3Bucket ?? '',
        BucketPrefix: `clickstream/workflow/${this.pipeline.executionName}`,
      };
    }
    return state;
  }

  private getRetryWorkflow(state: WorkflowState, statusDetail: PipelineStatusDetail[]): WorkflowState {
    if (state.Type === WorkflowStateType.PARALLEL) {
      for (let branch of state.Branches as WorkflowParallelBranch[]) {
        for (let key of Object.keys(branch.States)) {
          branch.States[key] = this.getRetryWorkflow(branch.States[key], statusDetail);
        }
      }
    } else if (state.Type === WorkflowStateType.STACK && state.Data?.Input.StackName) {
      const status = this.getStackStatusByName(state.Data?.Input.StackName, statusDetail);
      if (status?.endsWith('_FAILED')) {
        state.Data.Input.Action = 'Update';
      } else if (status?.endsWith('_IN_PROGRESS') || status?.endsWith('_COMPLETE')) {
        state.Type = WorkflowStateType.PASS;
      }
      state.Data!.Callback = {
        BucketName: stackWorkflowS3Bucket ?? '',
        BucketPrefix: `clickstream/workflow/${this.pipeline.executionName}`,
      };
    }
    return state;
  }

  private getUpdateWorkflow(state: WorkflowState, statusDetail: PipelineStatusDetail[], editStacks: string[]): WorkflowState {
    if (state.Type === WorkflowStateType.PARALLEL) {
      for (let branch of state.Branches as WorkflowParallelBranch[]) {
        for (let key of Object.keys(branch.States)) {
          branch.States[key] = this.getUpdateWorkflow(branch.States[key], statusDetail, editStacks);
        }
      }
    } else if (state.Type === WorkflowStateType.STACK && state.Data?.Input.StackName) {
      const status = this.getStackStatusByName(state.Data?.Input.StackName, statusDetail);
      if (status?.endsWith('_FAILED')) {
        state.Data.Input.Action = 'Update';
      } else if (status?.endsWith('_IN_PROGRESS')) {
        state.Type = WorkflowStateType.PASS;
      } else if (status?.endsWith('_COMPLETE')) {
        if (editStacks.includes(state.Data?.Input.StackName)) {
          state.Data.Input.Action = 'Update';
        } else {
          state.Type = WorkflowStateType.PASS;
        }
      }
      state.Data!.Callback = {
        BucketName: stackWorkflowS3Bucket ?? '',
        BucketPrefix: `clickstream/workflow/${this.pipeline.executionName}`,
      };
    }
    return state;
  }

  private getStackStatusByName(stackName: string, statusDetail: PipelineStatusDetail[]) {
    for (let detail of statusDetail) {
      if (detail.stackName === stackName) {
        return detail.stackStatus;
      }
    }
    return undefined;
  }

  public getWorkflowStacks(state: WorkflowState): string[] {
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

  public getWorkflowStackParametersMap(state: WorkflowState) {
    const compareWorkflow = JSON.parse(JSON.stringify(state));
    const stacks = this.getWorkflowStackParameters(compareWorkflow);
    const parametersMap: Map<string, string> = new Map<string, string>();
    for (let stack of stacks) {
      const stackName = stack.StackName;
      for (let param of stack.Parameters) {
        parametersMap.set(`${stackName}.${param.ParameterKey}`, param.ParameterValue);
      }
    }
    return Object.fromEntries(parametersMap);
  }

  public getWorkflowStackParameters(state: WorkflowState): any[] {
    let res: any[] = [];
    if (state.Type === WorkflowStateType.PARALLEL) {
      for (let branch of state.Branches as WorkflowParallelBranch[]) {
        for (let key of Object.keys(branch.States)) {
          res = res.concat(this.getWorkflowStackParameters(branch.States[key]));
        }
      }
    } else if (state.Type === WorkflowStateType.STACK) {
      if (state.Data?.Input.StackName) {
        res.push({
          StackName: state.Data?.Input.StackName,
          Parameters: state.Data?.Input.Parameters,
        });
      }
    }
    return res;
  }

  private updateStackParameter(
    state: WorkflowState, stackName: string, parameterKey: string, parameterValue: string, action: string): WorkflowState {
    if (state.Type === WorkflowStateType.PARALLEL) {
      for (let branch of state.Branches as WorkflowParallelBranch[]) {
        for (let key of Object.keys(branch.States)) {
          branch.States[key] = this.updateStackParameter(branch.States[key], stackName, parameterKey, parameterValue, action);
        }
      }
    } else if (state.Data?.Input.StackName === stackName) {
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

  public getWorkflowCurrentAction(state: WorkflowState): string {
    let res: string = '';
    if (state.Type === WorkflowStateType.PARALLEL) {
      for (let branch of state.Branches as WorkflowParallelBranch[]) {
        for (let key of Object.keys(branch.States)) {
          const action = this.getWorkflowCurrentAction(branch.States[key]);
          if (action) {
            res = action;
          }
        }
      }
    } else if (state.Type === WorkflowStateType.STACK) {
      if (state.Data?.Input.Action) {
        res = state.Data?.Input.Action;
      }
    }
    return res.toUpperCase();
  }

}