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
import { logger } from '../common/powertools';
import { ApiFail, ApiSuccess, PipelineStatusType } from '../common/types';
import { Application } from '../model/application';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const store: ClickStreamStore = new DynamoDbStore();
const stackManager: StackManager = new StackManager();

export class ApplicationServ {
  public async list(req: any, res: any, next: any) {
    try {
      const { order, pid, pageNumber, pageSize } = req.query;
      const result = await store.listApplication(pid, order, true, pageSize, pageNumber);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  };

  public async add(req: any, res: any, next: any) {
    try {
      const { projectId } = req.body;
      req.body.id = projectId;
      req.body.appId = uuidv4().replace(/-/g, '');
      let app: Application = req.body;
      // Check pipeline status
      const latestPipelines = await store.listPipeline(projectId, 'latest', 'asc', false, 1, 1);
      if (latestPipelines.totalCount === 0) {
        return res.status(404).json(new ApiFail('The latest pipeline not found.'));
      }
      const pipeline = latestPipelines.items[0];
      if (pipeline.status?.status !== PipelineStatusType.ACTIVE) {
        return res.status(400).json(new ApiFail('The pipeline current status does not allow update.'));
      }

      const id = await store.addApplication(app);
      await stackManager.updateETLWorkflow(pipeline);
      return res.status(201).json(new ApiSuccess({ id }, 'Application created.'));
    } catch (error) {
      next(error);
    }
  };

  public async details(req: any, res: any, next: any) {
    try {
      const { id } = req.params;
      const { pid } = req.query;
      const result = await store.getApplication(pid, id);
      if (!result) {
        logger.warn(`No Application with ID ${id} found in the databases while trying to retrieve a Application`);
        return res.status(404).json(new ApiFail('Application not found'));
      }
      const latestPipeline = await store.listPipeline(result.id, 'latest', 'asc', false, 1, 1);
      if (latestPipeline.totalCount === 0) {
        return res.status(404).json(new ApiFail('Pipeline info no found'));
      }
      const outputValue = await stackManager.getStackOutput(latestPipeline.items[0], 'ingestion', 'ingestionServerUrl');
      return res.json(new ApiSuccess({
        projectId: result.projectId,
        appId: result.appId,
        name: result.name,
        description: result.description,
        androidPackage: result.androidPackage,
        iosBundleId: result.iosBundleId,
        iosAppStoreId: result.iosAppStoreId,
        pipeline: {
          id: latestPipeline.items[0].pipelineId,
          name: latestPipeline.items[0].name,
          status: latestPipeline.items[0].status,
          endpoint: outputValue,
        },
      }));
    } catch (error) {
      next(error);
    }
  };

  public async update(req: any, res: any, next: any) {
    try {
      let app: Application = req.body as Application;
      await store.updateApplication(app);
      return res.status(201).json(new ApiSuccess(null, 'Application updated.'));
    } catch (error) {
      next(error);
    }
  }

  public async delete(req: any, res: any, next: any) {
    try {
      const { id } = req.params;
      const { pid } = req.query;
      // Check pipeline status
      const latestPipelines = await store.listPipeline(pid, 'latest', 'asc', false, 1, 1);
      if (latestPipelines.totalCount === 0) {
        return res.status(404).json(new ApiFail('The latest pipeline not found.'));
      }
      const pipeline = latestPipelines.items[0];
      if (pipeline.status?.status !== PipelineStatusType.ACTIVE) {
        return res.status(400).json(new ApiFail('The pipeline current status does not allow update.'));
      }

      await store.deleteApplication(pid, id);
      await stackManager.updateETLWorkflow(pipeline);
      return res.status(200).json(new ApiSuccess(null, 'Application deleted.'));
    } catch (error) {
      next(error);
    }
  };
}