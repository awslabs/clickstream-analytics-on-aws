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
import { OUTPUT_INGESTION_SERVER_DNS_SUFFIX, OUTPUT_INGESTION_SERVER_URL_SUFFIX } from '../common/constants-ln';
import { ApiFail, ApiSuccess, PipelineStackType, PipelineStatusType } from '../common/types';
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
      req.body.operator = res.get('X-Click-Stream-Operator');
      req.body.pipelineId = uuidv4().replace(/-/g, '');
      const result = await store.listPipeline(projectId, 'latest', 'asc', false, 1, 1);
      if (result.totalCount && result.totalCount > 0) {
        return res.status(400).send(new ApiFail('Pipeline already exists.'));
      }
      const body: IPipeline = req.body;
      const pipeline = new CPipeline(body);
      await pipeline.create();
      const templateInfo = await pipeline.getTemplateInfo();
      body.templateVersion = templateInfo.solutionVersion;
      // save metadata
      const id = await store.addPipeline(body);
      return res.status(201).json(new ApiSuccess({ id }, 'Pipeline added.'));
    } catch (error) {
      next(error);
    }
  };

  public async details(req: any, res: any, next: any) {
    try {
      const { id } = req.params;
      const { pid, cache } = req.query;
      const latestPipeline = await store.getPipeline(pid, id);
      if (!latestPipeline) {
        return res.status(404).send(new ApiFail('Pipeline not found'));
      }
      if (!cache || cache === 'false') {
        const pipeline = new CPipeline(latestPipeline);
        const stackManager: StackManager = new StackManager(latestPipeline);
        latestPipeline.status = await stackManager.getPipelineStatus();
        await store.updatePipelineAtCurrentVersion(latestPipeline);
        const ingestionOutputs = await pipeline.getStackOutputBySuffixs(
          PipelineStackType.INGESTION,
          [
            OUTPUT_INGESTION_SERVER_URL_SUFFIX,
            OUTPUT_INGESTION_SERVER_DNS_SUFFIX,
          ],
        );
        const dashboards = await pipeline.getReportDashboardsUrl();
        const metricsDashboardName = await pipeline.getMetricsDashboardName();
        const pluginsInfo = await pipeline.getPluginsInfo();
        const templateInfo = await pipeline.getTemplateInfo();
        return res.json(new ApiSuccess({
          ...latestPipeline,
          etl: {
            ...latestPipeline.etl,
            transformPlugin: pluginsInfo.transformPlugin,
            enrichPlugin: pluginsInfo.enrichPlugin,
          },
          endpoint: ingestionOutputs.get(OUTPUT_INGESTION_SERVER_URL_SUFFIX),
          dns: ingestionOutputs.get(OUTPUT_INGESTION_SERVER_DNS_SUFFIX),
          dashboards,
          metricsDashboardName,
          templateInfo,
        }));
      }
      return res.json(new ApiSuccess({
        ...latestPipeline,
        endpoint: null,
        dns: null,
        dashboards: null,
        metricsDashboardName: null,
        templateInfo: null,
      }));
    } catch (error) {
      next(error);
    }
  };

  public async update(req: any, res: any, next: any) {
    try {
      const { projectId } = req.body;
      req.body.id = projectId;
      req.body.operator = res.get('X-Click-Stream-Operator');
      let body: IPipeline = req.body;
      // Read current version from db
      const curPipeline = await store.getPipeline(body.id, body.pipelineId);
      if (!curPipeline) {
        return res.status(404).send(new ApiFail('Pipeline resource does not exist.'));
      }
      const newPipeline = new CPipeline(body);
      await newPipeline.update(curPipeline);
      return res.status(201).send(new ApiSuccess({ id: body.pipelineId }, 'Pipeline updated.'));
    } catch (error) {
      next(error);
    }
  };

  public async upgrade(req: any, res: any, next: any) {
    try {
      const { id } = req.params;
      const { pid } = req.query;
      req.body.operator = res.get('X-Click-Stream-Operator');
      // Read current version from db
      const curPipeline = await store.getPipeline(pid, id);
      if (!curPipeline) {
        return res.status(404).send(new ApiFail('Pipeline resource does not exist.'));
      }
      // Check pipeline status
      if (curPipeline.status?.status !== PipelineStatusType.ACTIVE) {
        return res.status(400).json(new ApiFail('The pipeline current status does not allow upgrade.'));
      }
      const newPipeline = JSON.parse(JSON.stringify(curPipeline));
      const pipeline = new CPipeline(newPipeline);
      const templateInfo = await pipeline.getTemplateInfo();
      if (templateInfo.isLatest) {
        return res.status(400).send(new ApiFail('Pipeline is already the latest version.'));
      }
      newPipeline.templateVersion = templateInfo.solutionVersion;
      await pipeline.upgrade(curPipeline);
      return res.status(201).send(new ApiSuccess({ id }, 'Pipeline upgraded.'));
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
      const operator = res.get('X-Click-Stream-Operator');
      await store.deletePipeline(pid, id, operator);
      return res.status(200).send(new ApiSuccess(null, 'Pipeline deleted.'));
    } catch (error) {
      next(error);
    }
  };

  public async retry(req: any, res: any, next: any) {
    try {
      const { id } = req.params;
      const { pid } = req.query;
      const ddbPipeline = await store.getPipeline(pid, id);
      if (!ddbPipeline) {
        return res.status(404).send(new ApiFail('Pipeline not found'));
      }
      // Check pipeline status
      if (ddbPipeline.status?.status !== PipelineStatusType.FAILED) {
        return res.status(400).json(new ApiFail('The pipeline current status does not allow retry.'));
      }
      const pipeline = new CPipeline(ddbPipeline);
      await pipeline.retry();
      return res.status(201).send(new ApiSuccess(null, 'Pipeline retry.'));
    } catch (error) {
      next(error);
    }
  };

}