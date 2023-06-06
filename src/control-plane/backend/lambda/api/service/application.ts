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

import { OUTPUT_INGESTION_SERVER_DNS_SUFFIX, OUTPUT_INGESTION_SERVER_URL_SUFFIX, MUTIL_APP_ID_PATTERN } from '../common/constants-ln';
import { logger } from '../common/powertools';
import { validatePattern } from '../common/stack-params-valid';
import { ApiFail, ApiSuccess, PipelineStackType, PipelineStatusType } from '../common/types';
import { isEmpty, paginateData } from '../common/utils';
import { IApplication } from '../model/application';
import { CPipeline } from '../model/pipeline';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const store: ClickStreamStore = new DynamoDbStore();

export class ApplicationServ {
  public async list(req: any, res: any, next: any) {
    try {
      const { order, pid, pageNumber, pageSize } = req.query;
      const result = await store.listApplication(pid, order);
      return res.json(new ApiSuccess({
        totalCount: result.length,
        items: paginateData(result, true, pageSize, pageNumber),
      }));
    } catch (error) {
      next(error);
    }
  };

  public async add(req: any, res: any, next: any) {
    try {
      const { projectId, appId } = req.body;
      req.body.id = projectId;
      req.body.operator = res.get('X-Click-Stream-Operator');
      let app: IApplication = req.body;
      // Check pipeline status
      const latestPipelines = await store.listPipeline(projectId, 'latest', 'asc');
      if (latestPipelines.length === 0) {
        return res.status(404).json(new ApiFail('The latest pipeline not found.'));
      }
      const latestPipeline = latestPipelines[0];
      if (latestPipeline.status?.status !== PipelineStatusType.ACTIVE) {
        return res.status(400).json(new ApiFail('The pipeline current status does not allow update.'));
      }

      const apps = await store.listApplication(latestPipeline.projectId, 'asc');
      const appIds: string[] = apps.map(a => a.appId);
      appIds.push(appId);
      validatePattern('AppId', MUTIL_APP_ID_PATTERN, appIds.join(','));

      const id = await store.addApplication(app);

      const pipeline = new CPipeline(latestPipeline);
      await pipeline.updateApp(appIds);
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
      const latestPipelines = await store.listPipeline(result.id, 'latest', 'asc');
      if (latestPipelines.length === 0) {
        return res.status(404).json(new ApiFail('Pipeline info no found'));
      }
      const pipeline = new CPipeline(latestPipelines[0]);
      const outputs = await pipeline.getStackOutputBySuffixs(
        PipelineStackType.INGESTION,
        [
          OUTPUT_INGESTION_SERVER_URL_SUFFIX,
          OUTPUT_INGESTION_SERVER_DNS_SUFFIX,
        ],
      );
      return res.json(new ApiSuccess({
        projectId: result.projectId,
        appId: result.appId,
        name: result.name,
        description: result.description,
        androidPackage: result.androidPackage,
        iosBundleId: result.iosBundleId,
        iosAppStoreId: result.iosAppStoreId,
        pipeline: {
          id: latestPipelines[0].pipelineId,
          status: latestPipelines[0].status,
          endpoint: outputs.get(OUTPUT_INGESTION_SERVER_URL_SUFFIX),
          dns: outputs.get(OUTPUT_INGESTION_SERVER_DNS_SUFFIX),
          customDomain: latestPipelines[0].ingestionServer.domain?.domainName ?? '',
        },
      }));
    } catch (error) {
      next(error);
    }
  };

  public async update(req: any, res: any, next: any) {
    try {
      req.body.operator = res.get('X-Click-Stream-Operator');
      let app: IApplication = req.body as IApplication;
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
      const latestPipelines = await store.listPipeline(pid, 'latest', 'asc');
      if (latestPipelines.length === 0) {
        return res.status(404).json(new ApiFail('The latest pipeline not found.'));
      }
      const latestPipeline = latestPipelines[0];
      if (latestPipeline.status?.status !== PipelineStatusType.ACTIVE) {
        return res.status(400).json(new ApiFail('The pipeline current status does not allow update.'));
      }

      const apps = await store.listApplication(latestPipeline.projectId, 'asc');
      const appIds: string[] = apps.map(a => a.appId);
      const index = appIds.indexOf(id);
      if (index > -1) {
        appIds.splice(index, 1);
      } else {
        return res.status(404).json(new ApiFail('The app not belonging to pipeline or it is deleted.'));
      }
      if (!isEmpty(appIds)) {
        validatePattern('AppId', MUTIL_APP_ID_PATTERN, appIds.join(','));
      }

      const operator = res.get('X-Click-Stream-Operator');
      await store.deleteApplication(pid, id, operator);

      const pipeline = new CPipeline(latestPipeline);
      await pipeline.updateApp(appIds);
      return res.status(200).json(new ApiSuccess(null, 'Application deleted.'));
    } catch (error) {
      next(error);
    }
  };
}