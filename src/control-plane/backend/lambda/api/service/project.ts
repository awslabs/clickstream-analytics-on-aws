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

import { QuickSight, ResourceNotFoundException } from '@aws-sdk/client-quicksight';
import { v4 as uuidv4 } from 'uuid';
import { StackManager } from './stack';
import { DEFAULT_DASHBOARD_NAME, DEFAULT_SOLUTION_OPERATOR, OUTPUT_REPORTING_QUICKSIGHT_DATA_SOURCE_ARN, OUTPUT_REPORT_DASHBOARDS_SUFFIX, QUICKSIGHT_ANALYSIS_INFIX, QUICKSIGHT_DASHBOARD_INFIX, QUICKSIGHT_RESOURCE_NAME_PREFIX } from '../common/constants-ln';
import { logger } from '../common/powertools';
import { aws_sdk_client_common_config } from '../common/sdk-client-config-ln';
import { ApiFail, ApiSuccess, PipelineStackType, PipelineStatusType } from '../common/types';
import { getReportingDashboardsUrl, getStackOutputFromPipelineStatus, isEmpty, paginateData } from '../common/utils';
import { IApplication } from '../model/application';
import { CPipeline, IPipeline } from '../model/pipeline';
import { IDashboard, IProject } from '../model/project';
import { createPublishDashboard, deleteClickstreamUser, deleteDatasetOfPublishDashboard, generateEmbedUrlForRegisteredUser } from '../store/aws/quicksight';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const store: ClickStreamStore = new DynamoDbStore();

export class ProjectServ {
  private async getPresetAppDashboard(projectId: string, appId: string) {
    const pipelines = await store.listPipeline(projectId, 'latest', 'asc');
    if (pipelines.length === 0) {
      return undefined;
    }
    const pipeline = pipelines[0];
    const stackDashboards = getReportingDashboardsUrl(pipeline?.status!, PipelineStackType.REPORTING, OUTPUT_REPORT_DASHBOARDS_SUFFIX);
    if (stackDashboards.length === 0) {
      return undefined;
    }
    const appDashboard = stackDashboards.find((item: any) => item.appId === appId);
    if (appDashboard) {
      const presetDashboard: IDashboard = {
        id: appDashboard.dashboardId,
        name: DEFAULT_DASHBOARD_NAME,
        description: 'Out-of-the-box user lifecycle analysis dashboard created by solution.',
        region: pipeline.region,
        sheets: [],
        createAt: pipeline.createAt,
        updateAt: pipeline.updateAt,
        operator: DEFAULT_SOLUTION_OPERATOR,
        type: '',
        prefix: '',
        projectId: projectId,
        appId: appId,
        dashboardId: appDashboard.dashboardId,
        deleted: false,
      };
      return presetDashboard;
    }
    return undefined;
  }

  public async listDashboards(req: any, res: any, next: any) {
    try {
      const { order, pageNumber, pageSize } = req.query;
      const { projectId, appId } = req.params;
      let result = await store.listDashboards(projectId, appId, order);
      const presetAppDashboard = await this.getPresetAppDashboard(projectId, appId);
      if (presetAppDashboard) {
        result = [presetAppDashboard, ...result];
      }
      const items = paginateData(result, true, pageSize, pageNumber);
      return res.json(new ApiSuccess({
        totalCount: result.length,
        items: items,
      }));
    } catch (error) {
      next(error);
    }
  };

  public async createDashboard(req: any, res: any, next: any) {
    try {
      const dashboardId = `${QUICKSIGHT_RESOURCE_NAME_PREFIX}${QUICKSIGHT_DASHBOARD_INFIX}${uuidv4().replace(/-/g, '')}`;
      req.body.id = dashboardId;
      req.body.operator = res.get('X-Click-Stream-Operator');

      const latestPipelines = await store.listPipeline(req.body.projectId, 'latest', 'asc');
      if (latestPipelines.length === 0) {
        return res.status(404).send(new ApiFail('Pipeline not found'));
      }
      const latestPipeline = latestPipelines[0];
      if (latestPipeline.status === undefined) {
        return res.status(404).send(new ApiFail('Pipeline status not found'));
      }
      const stackManager: StackManager = new StackManager(latestPipeline);
      const status = await stackManager.getPipelineStatus();

      const defaultDataSourceArn = getStackOutputFromPipelineStatus(
        status,
        PipelineStackType.REPORTING,
        OUTPUT_REPORTING_QUICKSIGHT_DATA_SOURCE_ARN);

      if (isEmpty(defaultDataSourceArn)) {
        return res.status(400).json(new ApiFail('Default data source ARN and owner principal is required.'));
      }
      req.body.region = latestPipeline.region;
      const dashboard: IDashboard = req.body;
      if (dashboard.sheets.length === 0) {
        return res.status(400).json(new ApiFail('Dashboard sheets is required.'));
      }
      await createPublishDashboard(dashboard, defaultDataSourceArn);
      const id = await store.createDashboard(dashboard);
      return res.status(201).json(new ApiSuccess({ id }, 'Dashboard created.'));
    } catch (error) {
      next(error);
    }
  };

  public async getDashboard(req: any, res: any, next: any) {
    try {
      const { dashboardId, projectId, appId } = req.params;
      const { allowedDomain } = req.query;
      let dashboard = await this.getPresetAppDashboard(projectId, appId);
      if (dashboard?.dashboardId !== dashboardId) {
        dashboard = await store.getDashboard(dashboardId);
      }
      if (!dashboard) {
        return res.status(404).json(new ApiFail('Dashboard not found'));
      }
      const embed = await generateEmbedUrlForRegisteredUser(
        dashboard.region,
        allowedDomain,
        true,
        dashboardId,
      );
      if (embed && embed.EmbedUrl) {
        dashboard.embedUrl = embed.EmbedUrl;
      }
      return res.json(new ApiSuccess(dashboard));
    } catch (error) {
      next(error);
    }
  };

  public async deleteDashboard(req: any, res: any, next: any) {
    try {
      const { dashboardId, projectId, appId } = req.params;
      const operator = res.get('X-Click-Stream-Operator');
      const presetAppDashboard = await this.getPresetAppDashboard(projectId, appId);
      if (presetAppDashboard?.dashboardId === dashboardId) {
        return res.status(400).json(new ApiFail('Preset Dashboard not allowed to delete.'));
      }
      const dashboard = await store.getDashboard(dashboardId);
      if (!dashboard) {
        return res.status(404).json(new ApiFail('Dashboard not found'));
      }
      const quickSightClient = new QuickSight({
        region: dashboard.region,
        ...aws_sdk_client_common_config,
      });
      try {
        await deleteDatasetOfPublishDashboard(dashboard.region, dashboardId);
        await quickSightClient.deleteDashboard({
          AwsAccountId: process.env.AWS_ACCOUNT_ID,
          DashboardId: dashboardId,
        });
        await quickSightClient.deleteAnalysis({
          AwsAccountId: process.env.AWS_ACCOUNT_ID,
          AnalysisId: dashboardId.replace(QUICKSIGHT_DASHBOARD_INFIX, QUICKSIGHT_ANALYSIS_INFIX),
        });
      } catch (err) {
        //dashboard can be delete by other interface/op, catch this exception to allow clear data in ddb.
        if (err instanceof ResourceNotFoundException) {
          logger.warn(`Dashboard ${dashboardId} not exist.`);
        } else {
          throw err;
        }
      }

      await store.deleteDashboard(dashboardId, operator);
      return res.json(new ApiSuccess(null, 'Dashboard deleted.'));
    } catch (error) {
      next(error);
    }
  };

  public async getAnalyzes(req: any, res: any, next: any) {
    try {
      const { projectId } = req.params;
      const { allowedDomain } = req.query;
      const latestPipelines = await store.listPipeline(projectId, 'latest', 'asc');
      if (latestPipelines.length === 0) {
        return res.status(404).json(new ApiFail('The latest pipeline not found.'));
      }
      const latestPipeline = latestPipelines[0];
      if (!latestPipeline.reporting?.quickSight?.accountName) {
        return res.status(400).json(new ApiFail('The latest pipeline not enable reporting.'));
      }
      const embed = await generateEmbedUrlForRegisteredUser(
        latestPipeline.region,
        allowedDomain,
        true,
      );
      return res.json(new ApiSuccess(embed));
    } catch (error) {
      next(error);
    }
  };

  public async list(req: any, res: any, next: any) {
    try {
      const { order, pageNumber, pageSize } = req.query;
      const projects = await store.listProjects(order);
      const pipelines = await store.listPipeline('', 'latest', 'asc');
      const apps = await store.listAllApplication();
      for (let project of projects) {
        const pipeline = pipelines.find((item: IPipeline) => item.projectId === project.id);
        if (pipeline) {
          project.pipelineId = pipeline.pipelineId;
          project.pipelineVersion = pipeline.templateVersion ?? '';
          project.reportingEnabled = !isEmpty(pipeline.reporting?.quickSight?.accountName);
        } else {
          project.pipelineId = '';
          project.pipelineVersion = '';
          project.reportingEnabled = false;
        }
        const projectApps = apps.filter((item: IApplication) => item.projectId === project.id);
        project.applications = projectApps;
      }
      const items = paginateData(projects, true, pageSize, pageNumber);
      return res.json(new ApiSuccess({
        totalCount: projects.length,
        items: items,
      }));
    } catch (error) {
      next(error);
    }
  };

  public async create(req: any, res: any, next: any) {
    try {
      req.body.operator = res.get('X-Click-Stream-Operator');
      let project: IProject = req.body;
      const id = await store.createProject(project);
      return res.status(201).json(new ApiSuccess({ id }, 'Project created.'));
    } catch (error) {
      next(error);
    }
  };

  public async details(req: any, res: any, next: any) {
    try {
      const { id } = req.params;
      const result = await store.getProject(id);
      if (!result) {
        logger.warn(`No Project with ID ${id} found in the databases while trying to retrieve a Project`);
        return res.status(404).json(new ApiFail('Project not found'));
      }
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  };

  public async update(req: any, res: any, next: any) {
    try {
      req.body.operator = res.get('X-Click-Stream-Operator');
      const project: IProject = req.body as IProject;
      await store.updateProject(project);
      return res.status(201).json(new ApiSuccess(null, 'Project updated.'));
    } catch (error) {
      next(error);
    }
  };

  public async delete(req: any, res: any, next: any) {
    try {
      const { id } = req.params;
      // Delete pipeline stacks
      const latestPipelines = await store.listPipeline(id, 'latest', 'asc');
      if (latestPipelines.length === 1) {
        const latestPipeline = latestPipelines[0];
        const pipeline = new CPipeline(latestPipeline);
        const stackManager: StackManager = new StackManager(latestPipeline);
        const latestPipelineStatus = await stackManager.getPipelineStatus();
        if (latestPipelineStatus.status !== PipelineStatusType.ACTIVE && latestPipelineStatus.status !== PipelineStatusType.FAILED) {
          return res.status(400).json(new ApiFail('The pipeline current status does not allow delete.'));
        }
        await pipeline.delete();
      }
      const existProjects = await store.listProjects('asc');
      if (existProjects.length === 1) {
        await deleteClickstreamUser();
      }
      const operator = res.get('X-Click-Stream-Operator');
      await store.deleteProject(id, operator);
      return res.json(new ApiSuccess(null, 'Project deleted.'));
    } catch (error) {
      next(error);
    }
  };

  public async verification(req: any, res: any, next: any) {
    try {
      const { id } = req.params;
      const exist = await store.isProjectExisted(id);
      return res.json(new ApiSuccess({ exist }));
    } catch (error) {
      next(error);
    }
  };

  public async saveRequestId(id: string) {
    await store.saveRequestId(id);
  };

  public async deleteRequestId(id: string) {
    await store.deleteRequestId(id);
  };

}