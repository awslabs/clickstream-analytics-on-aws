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
import { OUTPUT_INGESTION_SERVER_DNS_SUFFIX, OUTPUT_INGESTION_SERVER_URL_SUFFIX, OUTPUT_METRICS_OBSERVABILITY_DASHBOARD_NAME, OUTPUT_REPORT_DASHBOARDS_SUFFIX } from '../common/constants-ln';
import { PipelineStackType, PipelineStatusType } from '../common/model-ln';
import { ApiFail, ApiSuccess } from '../common/types';
import { getStackOutputFromPipelineStatus, getReportingDashboardsUrl, paginateData, pipelineAnalysisStudioEnabled, getPipelineStatusType, isEmpty } from '../common/utils';
import { IPipeline, CPipeline } from '../model/pipeline';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';


const store: ClickStreamStore = new DynamoDbStore();

export class PipelineServ {
  public async list(req: any, res: any, next: any) {
    try {
      const { pid, version, order, pageNumber, pageSize } = req.query;
      const result = await store.listPipeline(pid, version, order);
      for (let item of result) {
        const pipeline = new CPipeline(item);
        item.statusType = getPipelineStatusType(item);
        await pipeline.refreshStatus();
      }
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
      // create stack
      const { projectId } = req.body;
      req.body.id = projectId;
      req.body.operator = res.get('X-Click-Stream-Operator');
      req.body.pipelineId = uuidv4().replace(/-/g, '');
      const result = await store.listPipeline(projectId, 'latest', 'asc');
      if (result.length && result.length > 0) {
        return res.status(400).send(new ApiFail('Pipeline already exists.'));
      }
      const body: IPipeline = req.body;
      const pipeline = new CPipeline(body);
      await pipeline.create();
      // save metadata
      const id = await store.addPipeline(body);
      return res.status(201).json(new ApiSuccess({ id }, 'Pipeline added.'));
    } catch (error) {
      next(error);
    }
  };

  public async details(req: any, res: any, next: any) {
    try {
      const { pid, refresh } = req.query;
      const latestPipelines = await store.listPipeline(pid, 'latest', 'asc');
      if (latestPipelines.length === 0) {
        return res.status(404).send(new ApiFail('Pipeline not found'));
      }
      const latestPipeline = latestPipelines[0];
      const pipeline = new CPipeline(latestPipeline);
      await pipeline.refreshStatus(refresh);
      const pluginsInfo = await pipeline.getPluginsInfo();
      const templateInfo = pipeline.getTemplateInfo();
      return res.json(new ApiSuccess({
        ...latestPipeline,
        statusType: getPipelineStatusType(latestPipeline),
        dataProcessing: !isEmpty(latestPipeline.dataProcessing) ? {
          ...latestPipeline.dataProcessing,
          transformPlugin: pluginsInfo.transformPlugin,
          enrichPlugin: pluginsInfo.enrichPlugin,
        } : {},
        endpoint: getStackOutputFromPipelineStatus(latestPipeline.stackDetails ?? latestPipeline.status?.stackDetails,
          PipelineStackType.INGESTION, OUTPUT_INGESTION_SERVER_URL_SUFFIX),
        dns: getStackOutputFromPipelineStatus(latestPipeline.stackDetails ?? latestPipeline.status?.stackDetails,
          PipelineStackType.INGESTION, OUTPUT_INGESTION_SERVER_DNS_SUFFIX),
        dashboards: getReportingDashboardsUrl(latestPipeline.stackDetails ?? latestPipeline.status?.stackDetails,
          PipelineStackType.REPORTING, OUTPUT_REPORT_DASHBOARDS_SUFFIX),
        metricsDashboardName: getStackOutputFromPipelineStatus(latestPipeline.stackDetails ?? latestPipeline.status?.stackDetails,
          PipelineStackType.METRICS, OUTPUT_METRICS_OBSERVABILITY_DASHBOARD_NAME),
        templateInfo,
        analysisStudioEnabled: pipelineAnalysisStudioEnabled(latestPipeline),
      }));
    } catch (error) {
      next(error);
    }
  };

  public async getPipelineByProjectId(projectId: string) {
    const latestPipelines = await store.listPipeline(projectId, 'latest', 'asc');
    if (latestPipelines.length === 0) {
      return;
    }
    return latestPipelines[0];
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
      // Check pipeline status
      const statusType = getPipelineStatusType(curPipeline);
      if (statusType === PipelineStatusType.CREATING ||
        statusType === PipelineStatusType.DELETING ||
        statusType === PipelineStatusType.UPDATING) {
        return res.status(400).json(new ApiFail('Pipeline status can not allow update.'));
      }
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
      const newPipeline = { ...curPipeline };
      newPipeline.statusType = getPipelineStatusType(newPipeline);
      // Check pipeline status
      if (newPipeline.statusType !== PipelineStatusType.ACTIVE) {
        return res.status(400).json(new ApiFail('The pipeline current status does not allow upgrade.'));
      }
      const pipeline = new CPipeline(newPipeline);
      const templateInfo = pipeline.getTemplateInfo();
      if (templateInfo.isLatest) {
        return res.status(400).send(new ApiFail('Pipeline is already the latest version.'));
      }
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
      const statusType = getPipelineStatusType(ddbPipeline);
      if (statusType !== PipelineStatusType.FAILED &&
        statusType !== PipelineStatusType.WARNING) {
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