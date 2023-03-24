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

import { ExecutionStatus } from '@aws-sdk/client-sfn';
import { v4 as uuidv4 } from 'uuid';
import { StackManager } from './stack';
import { ApiFail, ApiSuccess } from '../common/request-valid';
import { Pipeline } from '../model/pipeline';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';


const store: ClickStreamStore = new DynamoDbStore();
const stackManager: StackManager = new StackManager();

export class PipelineServ {
  public async list(req: any, res: any, next: any) {
    try {
      const { pid, version, pageNumber, pageSize } = req.query;
      const result = await store.listPipeline(pid, version, true, pageSize, pageNumber);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  };

  public async add(req: any, res: any, next: any) {
    try {
      // create stack
      const { projectId } = req.body;
      req.body.id = projectId;
      req.body.pipelineId = uuidv4();
      let pipeline: Pipeline = req.body;

      // state machine
      const executionName = `main-${uuidv4()}`;
      const workflow = await stackManager.generateWorkflow(pipeline, executionName);
      pipeline.workflow = JSON.stringify(workflow);
      const executionArn = await stackManager.execute(JSON.stringify(workflow.Workflow), executionName);
      pipeline.executionArn = executionArn;

      const id = await store.addPipeline(pipeline);
      return res.status(201).json(new ApiSuccess({ id }, 'Pipeline added.'));
    } catch (error) {
      next(error);
    }
  };

  public async details(req: any, res: any, next: any) {
    try {
      const { id } = req.params;
      const { pid } = req.query;
      const result = await store.getPipeline(pid, id);
      if (!result) {
        return res.status(404).send(new ApiFail('Pipeline not found'));
      }
      result.status = await stackManager.getExecutionStatus(result.executionArn) ?? ExecutionStatus.FAILED;
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  };

  public async update(req: any, res: any, next: any) {
    try {
      const { projectId } = req.body;
      req.body.id = projectId;
      let pipeline: Pipeline = req.body;
      // Read current version from db
      const curPipeline = await store.getPipeline(pipeline.id, pipeline.pipelineId);
      if (!curPipeline) {
        return res.status(404).send(new ApiFail('Pipeline resource does not exist.'));
      }
      await store.updatePipeline(pipeline, curPipeline);
      return res.status(201).send(new ApiSuccess(null, 'Pipeline updated.'));
    } catch (error) {
      next(error);
    }
  };

  public async delete(req: any, res: any, next: any) {
    try {
      const { id } = req.params;
      const { pid } = req.query;
      await store.deletePipeline(pid, id);
      return res.status(200).send(new ApiSuccess(null, 'Pipeline deleted.'));
    } catch (error) {
      next(error);
    }
  };

}