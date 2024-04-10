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

import { StackStatus } from '@aws-sdk/client-cloudformation';
import { awsRegion, stackWorkflowS3Bucket, stackWorkflowStateMachineArn } from '../common/constants';
import { PipelineStackType, PipelineStatusDetail } from '../common/model-ln';
import {
  WorkflowParallelBranch,
  WorkflowState,
  WorkflowStateType,
  WorkflowTemplate,
} from '../common/types';
import { getPipelineLastActionFromStacksStatus, getStackName, getStackTags } from '../common/utils';
import { IPipeline } from '../model/pipeline';
import { startExecution } from '../store/aws/sfn';


export class StackManager {

  private pipeline: IPipeline;
  private workflow?: WorkflowTemplate;
  private execWorkflow?: WorkflowTemplate;

  constructor(pipeline: IPipeline) {
    this.pipeline = pipeline;
    if (pipeline.workflow) {
      // Deep Copy Workflow
      this.workflow = JSON.parse(JSON.stringify(pipeline.workflow));
      this.execWorkflow = JSON.parse(JSON.stringify(pipeline.workflow));
    }
  }

  public setExecWorkflow(workflow: WorkflowTemplate) {
    this.execWorkflow = JSON.parse(JSON.stringify(workflow));
  }

  public getExecWorkflow(): WorkflowTemplate | undefined {
    return this.execWorkflow;
  }

  public getWorkflow(): WorkflowTemplate | undefined {
    return this.workflow;
  }

  public updateWorkflowForApp(
    updateList: { stackType: PipelineStackType; parameterKey: string; parameterValue: string }[],
  ): void {
    if (!this.execWorkflow || !this.workflow) {
      throw new Error('Pipeline workflow is empty.');
    }

    // Update execWorkflow AppIds Parameter and Action
    this.execWorkflow.Workflow = this.setWorkflowType(this.execWorkflow.Workflow, WorkflowStateType.PASS);

    for (let item of updateList) {
      const stackName = getStackName(
        this.pipeline.pipelineId, item.stackType, this.pipeline.ingestionServer.sinkType);
      this.execWorkflow.Workflow = this.updateStackParameter(
        this.execWorkflow.Workflow, stackName, item.parameterKey, item.parameterValue, 'Update');
      // Update saveWorkflow AppIds Parameter
      this.execWorkflow.Workflow = this.updateStackParameter(
        this.workflow.Workflow, stackName, item.parameterKey, item.parameterValue, 'Create');
    }
  }

  public deleteWorkflow(): void {
    if (!this.execWorkflow) {
      throw new Error('Pipeline workflow is empty.');
    }
    this.execWorkflow.Workflow = this.getDeleteWorkflow(this.execWorkflow.Workflow);
  }

  public upgradeWorkflow(oldStackNames: string[]): void {
    if (!this.execWorkflow || !this.workflow) {
      throw new Error('Pipeline workflow is empty.');
    }
    this.execWorkflow.Workflow = this.getUpgradeWorkflow(this.execWorkflow.Workflow, oldStackNames, false);
    this.workflow.Workflow = this.getUpgradeWorkflow(this.workflow.Workflow, oldStackNames, true);
  }

  public retryWorkflow(): void {
    if (!this.execWorkflow || !this.workflow) {
      throw new Error('Pipeline workflow or stack information is empty.');
    }
    let lastAction = this.pipeline.lastAction;
    if (!lastAction || lastAction === '') {
      lastAction = getPipelineLastActionFromStacksStatus(
        this.pipeline.stackDetails ?? this.pipeline.status?.stackDetails, this.pipeline.templateVersion);
    }
    const retryStackNames = this._getRetryStackNames();
    this.execWorkflow.Workflow = this.getRetryWorkflow(
      this.execWorkflow.Workflow,
      this.pipeline.stackDetails ?? this.pipeline.status?.stackDetails ?? [],
      retryStackNames,
      lastAction);
  }

  private _getRetryStackNames(): string[] {
    const retryStackNames: string[] = [];
    const retryStackTypes: PipelineStackType[] = [];
    const stackDetails = this.pipeline.stackDetails ?? this.pipeline.status?.stackDetails;
    if (!stackDetails) {
      return retryStackNames;
    }
    for (let stackDetail of stackDetails) {
      if (!stackDetail.stackStatus ||
        stackDetail.stackStatus?.endsWith('_FAILED') ||
        stackDetail.stackStatus?.endsWith('_ROLLBACK_COMPLETE') ) {
        retryStackNames.push(stackDetail.stackName);
        retryStackTypes.push(stackDetail.stackType);
      }
    }
    if (retryStackTypes.includes(PipelineStackType.INGESTION)) {
      retryStackNames.push(
        getStackName(this.pipeline.pipelineId, PipelineStackType.KAFKA_CONNECTOR, this.pipeline.ingestionServer.sinkType),
      );
    }
    if (retryStackTypes.includes(PipelineStackType.DATA_PROCESSING)) {
      retryStackNames.push(
        getStackName(this.pipeline.pipelineId, PipelineStackType.ATHENA, this.pipeline.ingestionServer.sinkType),
      );
      retryStackNames.push(
        getStackName(this.pipeline.pipelineId, PipelineStackType.DATA_MODELING_REDSHIFT, this.pipeline.ingestionServer.sinkType),
      );
      retryStackNames.push(
        getStackName(this.pipeline.pipelineId, PipelineStackType.REPORTING, this.pipeline.ingestionServer.sinkType),
      );
    }
    if (retryStackTypes.includes(PipelineStackType.ATHENA) || retryStackTypes.includes(PipelineStackType.DATA_MODELING_REDSHIFT)) {
      retryStackNames.push(
        getStackName(this.pipeline.pipelineId, PipelineStackType.REPORTING, this.pipeline.ingestionServer.sinkType),
      );
    }
    return Array.from(new Set(retryStackNames));
  }


  public updateWorkflowParameters(editedParameters: {stackName: string; parameterKey: string; parameterValue: any}[]): void {
    if (!this.execWorkflow || !this.workflow) {
      throw new Error('Pipeline workflow is empty.');
    }

    for (let param of editedParameters) {
      this.execWorkflow.Workflow = this.updateStackParameter(
        this.execWorkflow.Workflow, param.stackName, param.parameterKey, param.parameterValue, 'Update');
      this.workflow.Workflow = this.updateStackParameter(
        this.workflow.Workflow, param.stackName, param.parameterKey, param.parameterValue, 'Create');
    }
  }

  public updateWorkflowAction(editStacks: string[]): void {
    if (!this.execWorkflow) {
      throw new Error('Pipeline workflow or stack information is empty.');
    }
    const stackDetails = this.pipeline.stackDetails ?? this.pipeline.status?.stackDetails ?? [];
    this.execWorkflow.Workflow = this.getUpdateWorkflow(this.execWorkflow.Workflow, stackDetails, editStacks);
  }

  public updateWorkflowReporting(reportingState: WorkflowState): void {
    this._updateWorkflowReporting(this.execWorkflow?.Workflow as WorkflowState, reportingState);
    this._updateWorkflowReporting(this.workflow?.Workflow as WorkflowState, reportingState);
  }

  public _updateWorkflowReporting(workflow: WorkflowState, reportingState: WorkflowState): void {
    const dataProcessingBranch = this._findBranch(workflow, PipelineStackType.DATA_PROCESSING);
    if (dataProcessingBranch && PipelineStackType.DATA_MODELING_REDSHIFT in dataProcessingBranch.States) {
      dataProcessingBranch.States[PipelineStackType.REPORTING] = reportingState;
      dataProcessingBranch.States[PipelineStackType.DATA_MODELING_REDSHIFT].Next = PipelineStackType.REPORTING;
      delete dataProcessingBranch.States[PipelineStackType.DATA_MODELING_REDSHIFT].End;
    }
  }

  private _findBranch(state: WorkflowState, startAt: string): WorkflowParallelBranch | undefined {
    if (state.Type === WorkflowStateType.PARALLEL) {
      const targetBranch = state.Branches?.find((b) => b.StartAt === startAt);
      if (targetBranch) {
        return targetBranch;
      }
      for (let branch of state.Branches as WorkflowParallelBranch[]) {
        for (let key of Object.keys(branch.States)) {
          return this._findBranch(branch.States[key], startAt);
        }
      }
    }
    return undefined;
  }

  public async execute(workflow: WorkflowTemplate | undefined, executionName: string): Promise<string> {
    if (workflow === undefined) {
      throw new Error('Pipeline workflow is empty.');
    }
    const executionArn = await startExecution(awsRegion, stackWorkflowStateMachineArn, executionName, JSON.stringify(workflow.Workflow));
    return executionArn ?? '';
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
      this._getParallelDeleteWorkflow(state);
    } else if (state.Type === WorkflowStateType.STACK) {
      state.Data!.Input.Action = 'Delete';
      state.Data!.Callback = {
        BucketName: stackWorkflowS3Bucket ?? '',
        BucketPrefix: `clickstream/workflow/${this.pipeline.executionDetail?.name}`,
      };
    }
    return state;
  }

  private _getParallelDeleteWorkflow(state: WorkflowState) {
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
  }

  private getUpgradeWorkflow(state: WorkflowState, oldStackNames: string[], origin: boolean): WorkflowState {
    if (state.Type === WorkflowStateType.PARALLEL) {
      for (let branch of state.Branches as WorkflowParallelBranch[]) {
        for (let key of Object.keys(branch.States)) {
          branch.States[key] = this.getUpgradeWorkflow(branch.States[key], oldStackNames, origin);
        }
      }
    } else if (state.Type === WorkflowStateType.STACK && state.Data?.Input) {
      if (!origin && oldStackNames.includes(state.Data.Input.StackName)) {
        state.Data.Input.Action = 'Upgrade';
      }
      state.Data.Callback = {
        BucketName: stackWorkflowS3Bucket ?? '',
        BucketPrefix: `clickstream/workflow/${this.pipeline.executionDetail?.name}`,
      };
    }
    return state;
  }

  private getRetryWorkflow(
    state: WorkflowState, stackDetails: PipelineStatusDetail[],
    retryStackNames: string[], lastAction: string): WorkflowState {
    if (state.Type === WorkflowStateType.PARALLEL) {
      for (let branch of state.Branches as WorkflowParallelBranch[]) {
        for (let key of Object.keys(branch.States)) {
          branch.States[key] = this.getRetryWorkflow(
            branch.States[key], stackDetails, retryStackNames, lastAction);
        }
      }
    } else if (state.Type === WorkflowStateType.STACK) {
      state = this._getRetryState(state, stackDetails, retryStackNames, lastAction);
    }
    return state;
  }

  private _getRetryAction(lastAction: string, status: StackStatus | undefined) {
    const retryActionMap: Map<string, string> = new Map();
    retryActionMap.set('Create+EMPTY', 'Create');
    retryActionMap.set('Create+FAILED', 'Update');
    retryActionMap.set('Create+COMPLETE', 'Update');
    retryActionMap.set('Create+ROLLBACK_COMPLETE', 'Update');
    retryActionMap.set('Update+FAILED', 'Update');
    retryActionMap.set('Update+COMPLETE', 'Update');
    retryActionMap.set('Update+ROLLBACK_COMPLETE', 'Update');
    retryActionMap.set('Upgrade+FAILED', 'Upgrade');
    retryActionMap.set('Upgrade+COMPLETE', 'Upgrade');
    retryActionMap.set('Upgrade+ROLLBACK_COMPLETE', 'Upgrade');
    retryActionMap.set('Delete+FAILED', 'Delete');
    retryActionMap.set('Delete+COMPLETE', 'Delete');
    retryActionMap.set('Delete+ROLLBACK_COMPLETE', 'Delete');

    let shortStatus = 'EMPTY';
    if (status?.endsWith('FAILED')) {
      shortStatus = 'FAILED';
    } else if (status?.endsWith('ROLLBACK_COMPLETE')) {
      shortStatus = 'ROLLBACK_COMPLETE';
    } else if (status?.endsWith('COMPLETE')) {
      shortStatus = 'COMPLETE';
    }
    return retryActionMap.get(`${lastAction}+${shortStatus}`) ?? '';
  }

  private _getRetryState(
    state: WorkflowState, stackDetails: PipelineStatusDetail[], retryStackNames: string[],
    lastAction: string): WorkflowState {
    if (state.Data?.Input.StackName && retryStackNames.includes(state.Data.Input.StackName)) {
      const status = this.getStackStatusByName(state.Data?.Input.StackName, stackDetails);
      state.Data.Input.Action = this._getRetryAction(lastAction, status);
    } else {
      state.Type = WorkflowStateType.PASS;
    }
    state.Data!.Callback = {
      BucketName: stackWorkflowS3Bucket ?? '',
      BucketPrefix: `clickstream/workflow/${this.pipeline.executionDetail?.name}`,
    };
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
      this._updateUpdateWorkflow(state, statusDetail, editStacks);
    }
    return state;
  }

  private _updateUpdateWorkflow(state: WorkflowState, statusDetail: PipelineStatusDetail[], editStacks: string[]) {
    const status = this.getStackStatusByName(state.Data!.Input.StackName, statusDetail);
    if (status?.endsWith('_FAILED')) {
      state.Data!.Input.Action = 'Update';
    } else if (status?.endsWith('_IN_PROGRESS')) {
      state.Type = WorkflowStateType.PASS;
    } else if (status?.endsWith('_COMPLETE')) {
      if (editStacks.includes(state.Data!.Input.StackName)) {
        state.Data!.Input.Action = 'Update';
      } else {
        state.Type = WorkflowStateType.PASS;
      }
    }
    state.Data!.Callback = {
      BucketName: stackWorkflowS3Bucket ?? '',
      BucketPrefix: `clickstream/workflow/${this.pipeline.executionDetail?.name}`,
    };
  }

  public updateWorkflowTags(): void {
    if (!this.execWorkflow || !this.workflow) {
      throw new Error('Pipeline workflow is empty.');
    }
    this.execWorkflow.Workflow = this._updateTags(this.execWorkflow.Workflow, 'Update');
    this.workflow.Workflow = this._updateTags(this.workflow.Workflow, 'Create');
  }

  private _updateTags(state: WorkflowState, action: string): WorkflowState {
    if (state.Type === WorkflowStateType.PARALLEL) {
      for (let branch of state.Branches as WorkflowParallelBranch[]) {
        for (let key of Object.keys(branch.States)) {
          branch.States[key] = this._updateTags(branch.States[key], action);
        }
      }
    } else if (state.Type === WorkflowStateType.STACK || state.Type === WorkflowStateType.PASS) {
      state.Type = WorkflowStateType.STACK;
      state.Data!.Input.Action = action;
      state.Data!.Input.Tags = getStackTags(this.pipeline);
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
      for (let p of state.Data.Input.Parameters) {
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