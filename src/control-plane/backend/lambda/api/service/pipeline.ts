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

import { v4 as uuidv4 } from 'uuid';
import { StackManager } from './stack';
import { ApiFail, ApiSuccess } from '../common/types';
import { IPipeline, CPipeline } from '../model/pipeline';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';


const store: ClickStreamStore = new DynamoDbStore();

export class PipelineServ {
  public async list(req: any, res: any, next: any) {
    try {
      const { pid, version, order, pageNumber, pageSize } = req.query;
      const result = await store.listPipeline(pid, version, order, true, pageSize, pageNumber);
      for (let item of result.items as IPipeline[] ) {
        const pipeline = new CPipeline(item);
        await pipeline.refreshStatus();
      }
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
      req.body.pipelineId = uuidv4().replace(/-/g, '');
      let pipeline: IPipeline = req.body;

      // state machine
      const stackManager: StackManager = new StackManager(pipeline);
      pipeline.executionName = `main-${uuidv4()}`;
      pipeline.workflow = await stackManager.generateWorkflow();
      pipeline.executionArn = await stackManager.execute(pipeline.workflow, pipeline.executionName);

      // save metadata
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
      const pipeline = await store.getPipeline(pid, id);
      if (!pipeline) {
        return res.status(404).send(new ApiFail('Pipeline not found'));
      }
      const stackManager: StackManager = new StackManager(pipeline);
      pipeline.status = await stackManager.getPipelineStatus();
      await store.updatePipelineAtCurrentVersion(pipeline);
      return res.json(new ApiSuccess(pipeline));
    } catch (error) {
      next(error);
    }
  };

  public async update(req: any, res: any, next: any) {
    try {
      const { projectId } = req.body;
      req.body.id = projectId;
      let pipeline: IPipeline = req.body;
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
      const ddbPipeline = await store.getPipeline(pid, id);
      if (!ddbPipeline) {
        return res.status(404).send(new ApiFail('Pipeline not found'));
      }
      const pipeline = new CPipeline(ddbPipeline);
      await pipeline.delete();
      // TODO: Asynchronize
      await store.deletePipeline(pid, id);
      return res.status(200).send(new ApiSuccess(null, 'Pipeline deleted.'));
    } catch (error) {
      next(error);
    }
  };

  public async retry(req: any, res: any, next: any) {
    try {
      const { id } = req.params;
      const { pid, type } = req.query;
      const ddbPipeline = await store.getPipeline(pid, id);
      if (!ddbPipeline) {
        return res.status(404).send(new ApiFail('Pipeline not found'));
      }
      const pipeline = new CPipeline(ddbPipeline);
      await pipeline.retry(type);
      return res.status(201).send(new ApiSuccess(null, 'Pipeline retry.'));
    } catch (error) {
      next(error);
    }
  };

}