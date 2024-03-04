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

import { CreateDashboardRequest, CreateDashboardResponse, DEFAULT_DASHBOARD_NAME, DeleteDashboardRequest, DescribeAnalyzesRequest, DescribeAnalyzesResponse, DescribeDashboardRequest, DescribeDashboardResponse, IDashboard, ListDashboardsRequest, ListDashboardsResponse, OUTPUT_REPORTING_QUICKSIGHT_DATA_SOURCE_ARN, OUTPUT_REPORT_DASHBOARDS_SUFFIX } from '@aws/clickstream-base-lib';
import { PipelineServ } from './pipeline';
import { PipelineStackType } from '../common/model-ln';
import { ApiFail, ApiSuccess } from '../common/types';
import { getReportingDashboardsUrl, getStackOutputFromPipelineStatus, isEmpty, paginateData } from '../common/utils';
import { IPipeline } from '../model/pipeline';
import { checkFolder, createPublishDashboard, deletePublishDashboard, generateEmbedUrlForRegisteredUser, getDashboardDetail, listDashboardsByApp } from '../store/aws/quicksight';

const pipelineServ: PipelineServ = new PipelineServ();

export class DashboardServ {

  private getPresetAppDashboard(pipeline: IPipeline, appId: string) {
    const stackDashboards = getReportingDashboardsUrl(
      pipeline.stackDetails ?? pipeline.status?.stackDetails, PipelineStackType.REPORTING, OUTPUT_REPORT_DASHBOARDS_SUFFIX);
    if (stackDashboards.length === 0) {
      return undefined;
    }
    const appDashboard = stackDashboards.find((item: any) => item.appId === appId);
    if (appDashboard) {
      const presetDashboard: IDashboard = {
        id: appDashboard.dashboardId,
        name: DEFAULT_DASHBOARD_NAME,
        description: 'Out-of-the-box user lifecycle analysis dashboard created by solution.',
        projectId: pipeline.projectId,
        appId: appId,
        region: pipeline.region,
        sheets: [],
        createAt: pipeline.createAt,
        updateAt: pipeline.updateAt,
      };
      return presetDashboard;
    }
    return undefined;
  }

  public async listDashboards(req: any, res: any, next: any) {
    try {
      const request: ListDashboardsRequest = {
        ...req.query,
        ...req.params,
      };
      const pipeline = await pipelineServ.getPipelineByProjectId(request.projectId);
      if (!pipeline) {
        return res.status(404).json(new ApiFail('The latest pipeline not found.'));
      }
      // check folder and move preset dashboard to folder
      const presetAppDashboard = this.getPresetAppDashboard(pipeline, request.appId);
      await checkFolder(pipeline.region, request.projectId, request.appId, presetAppDashboard?.id);
      const dashboards = await listDashboardsByApp(pipeline.region, request.projectId, request.appId);
      const response: ListDashboardsResponse = {
        totalCount: dashboards.length,
        items: paginateData(dashboards, true, request.pageSize, request.pageNumber),
      };
      return res.json(new ApiSuccess(response));
    } catch (error) {
      next(error);
    }
  };

  public async createDashboard(req: any, res: any, next: any) {
    try {
      const request: CreateDashboardRequest = {
        ...req.body,
        ...req.params,
      };
      if (request.sheets.length === 0) {
        return res.status(400).json(new ApiFail('Dashboard sheets is required.'));
      }
      const pipeline = await pipelineServ.getPipelineByProjectId(request.projectId);
      if (!pipeline) {
        return res.status(404).json(new ApiFail('The latest pipeline not found.'));
      }
      const defaultDataSourceArn = getStackOutputFromPipelineStatus(
        pipeline.stackDetails ?? pipeline.status?.stackDetails,
        PipelineStackType.REPORTING,
        OUTPUT_REPORTING_QUICKSIGHT_DATA_SOURCE_ARN);

      if (isEmpty(defaultDataSourceArn)) {
        return res.status(400).json(new ApiFail('Default data source ARN and owner principal is required.'));
      }
      const dashboardId = await createPublishDashboard(request, defaultDataSourceArn);
      const response: CreateDashboardResponse = { id: dashboardId };
      return res.status(201).json(new ApiSuccess(response, 'Dashboard created.'));
    } catch (error) {
      next(error);
    }
  };

  public async getDashboard(req: any, res: any, next: any) {
    try {
      const request: DescribeDashboardRequest = {
        ...req.params,
        ...req.query,
      };
      const pipeline = await pipelineServ.getPipelineByProjectId(request.projectId);
      if (!pipeline) {
        return res.status(404).json(new ApiFail('The latest pipeline not found.'));
      }
      const response: DescribeDashboardResponse | undefined =
      await getDashboardDetail(pipeline.region, request.projectId, request.appId, request.dashboardId);
      if (!response) {
        return res.status(404).json(new ApiFail('Dashboard not found.'));
      }
      const embed = await generateEmbedUrlForRegisteredUser(
        pipeline.region,
        request.allowedDomain,
        request.dashboardId,
      );
      if (embed && embed.EmbedUrl) {
        response.embedUrl = embed.EmbedUrl;
      }
      return res.json(new ApiSuccess(response));
    } catch (error) {
      next(error);
    }
  };

  public async deleteDashboard(req: any, res: any, next: any) {
    try {
      const request: DeleteDashboardRequest = req.params;
      const pipeline = await pipelineServ.getPipelineByProjectId(request.projectId);
      if (!pipeline) {
        return res.status(404).json(new ApiFail('The latest pipeline not found.'));
      }
      const presetAppDashboard = this.getPresetAppDashboard(pipeline, request.appId);
      if (presetAppDashboard?.id === request.dashboardId) {
        return res.status(400).json(new ApiFail('Preset Dashboard not allowed to delete.'));
      }
      await deletePublishDashboard(pipeline.region, request.dashboardId);
      return res.json(new ApiSuccess(null, 'Dashboard deleted.'));
    } catch (error) {
      next(error);
    }
  };

  public async getAnalyzes(req: any, res: any, next: any) {
    try {
      const request: DescribeAnalyzesRequest = {
        ...req.params,
        ...req.query,
      };
      const pipeline = await pipelineServ.getPipelineByProjectId(request.projectId);
      if (!pipeline) {
        return res.status(404).json(new ApiFail('The latest pipeline not found.'));
      }
      if (!pipeline.reporting?.quickSight?.accountName) {
        return res.status(400).json(new ApiFail('The latest pipeline not enable reporting.'));
      }
      const embed = await generateEmbedUrlForRegisteredUser(
        pipeline.region,
        request.allowedDomain,
      );
      const response: DescribeAnalyzesResponse = { embedUrl: embed.EmbedUrl ?? '' };
      return res.json(new ApiSuccess(response));
    } catch (error) {
      next(error);
    }
  };

}