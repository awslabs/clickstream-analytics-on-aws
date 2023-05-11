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

import { Parameter, StackStatus } from '@aws-sdk/client-cloudformation';
import {
  DescribeExecutionCommand,
  DescribeExecutionCommandOutput,
  StartExecutionCommand,
  StartExecutionCommandOutput,
  DescribeExecutionOutput,
  ExecutionStatus,
} from '@aws-sdk/client-sfn';
import { stackWorkflowStateMachineArn } from '../common/constants';
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

  public getExecWorkflow(): WorkflowTemplate | undefined {
    return this.execWorkflow;
  }

  public updateETLWorkflow(appIds: string[], etlStackName: string, analyticsStackName: string, reportStackName: string): void {
    if (!this.execWorkflow || !this.workflow) {
      throw new Error('Pipeline workflow is empty.');
    }

    // Update execWorkflow AppIds Parameter and Action
    this.execWorkflow.Workflow = this.setWorkflowType(this.execWorkflow.Workflow, WorkflowStateType.PASS);

    this.execWorkflow.Workflow = this.updateStackParameter(
      this.execWorkflow.Workflow, etlStackName, 'AppIds', appIds.join(','), 'Update');
    this.execWorkflow.Workflow = this.updateStackParameter(
      this.execWorkflow.Workflow, analyticsStackName, 'AppIds', appIds.join(','), 'Update');
    this.execWorkflow.Workflow = this.updateStackParameter(
      this.execWorkflow.Workflow, reportStackName, 'RedShiftDBSchemaParam', appIds.join(','), 'Update');

    // Update saveWorkflow AppIds Parameter
    this.workflow.Workflow = this.updateStackParameter(
      this.workflow.Workflow, etlStackName, 'AppIds', appIds.join(','), 'Create');
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

  public retryWorkflow(): void {
    if (!this.execWorkflow || !this.pipeline.status?.stackDetails) {
      throw new Error('Pipeline workflow or stack information is empty.');
    }
    const stackDetails = this.pipeline.status?.stackDetails;
    this.execWorkflow.Workflow = this.getRetryWorkflow(this.execWorkflow.Workflow, stackDetails);
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
        for (let key of Object.keys(branch.States)) {
          branch.States[key] = this.getDeleteWorkflow(branch.States[key]);
        }
      }
    } else if (state.Type === WorkflowStateType.STACK) {
      state.Data!.Input.Action = 'Delete';
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

}