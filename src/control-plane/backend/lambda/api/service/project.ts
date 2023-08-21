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

import { CreateDashboardCommandInput, DataSetImportMode, QuickSight, SheetDefinition } from '@aws-sdk/client-quicksight';
import { v4 as uuidv4 } from 'uuid';
import { createDataSet } from './quicksight/reporting-utils';
import { logger } from '../common/powertools';
import { aws_sdk_client_common_config } from '../common/sdk-client-config-ln';
import { ApiFail, ApiSuccess } from '../common/types';
import { isEmpty, paginateData } from '../common/utils';
import { CPipeline } from '../model/pipeline';
import { IDashboard, IProject } from '../model/project';
import { createDashboard, getClickstreamUserArn } from '../store/aws/quicksight';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const store: ClickStreamStore = new DynamoDbStore();

export class ProjectServ {
  public async listDashboards(req: any, res: any, next: any) {
    try {
      const { order, pageNumber, pageSize } = req.query;
      const { id } = req.params;
      const result = await store.listDashboards(id, order);
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
      const dashboardId = uuidv4().replace(/-/g, '');
      req.body.id = dashboardId;
      req.body.operator = res.get('X-Click-Stream-Operator');
      const dashboard: IDashboard = req.body;
      if (isEmpty(dashboard.defaultDataSourceArn) || isEmpty(dashboard.ownerPrincipal)) {
        return res.status(400).json(new ApiFail('Default data source ARN and owner principal is required.'));
      }
      // Create dataset in QuickSight
      const quickSightClient = new QuickSight({
        region: dashboard.region,
        ...aws_sdk_client_common_config,
      });
      const dataset = await createDataSet(
        quickSightClient,
        process.env.AWS_ACCOUNT_ID!,
        dashboard.ownerPrincipal,
        dashboard.defaultDataSourceArn, {
          name: `${dashboard.name}-default-dataset`,
          tableName: 'ods_events',
          columns: [
            {
              Name: 'event_date',
              Type: 'DATETIME',
            },
            {
              Name: 'event_name',
              Type: 'STRING',
            },
            {
              Name: 'x_id',
              Type: 'STRING',
            },
          ],
          importMode: DataSetImportMode.DIRECT_QUERY,
          customSql: `select * from ${dashboard.appId}.ods_events`,
        });
      // Create dashboard in QuickSight
      const sheets: SheetDefinition[] = [];
      for (let sheetName of dashboard.sheetNames) {
        const sheetDefinition: SheetDefinition = {
          SheetId: uuidv4().replace(/-/g, ''),
          Name: sheetName,
        };
        sheets.push(sheetDefinition);
      }
      const principals = await getClickstreamUserArn();
      const dashboardInput: CreateDashboardCommandInput = {
        AwsAccountId: process.env.AWS_ACCOUNT_ID,
        DashboardId: dashboardId,
        Name: dashboard.name,
        Definition: {
          DataSetIdentifierDeclarations: [
            {
              Identifier: 'default',
              DataSetArn: dataset?.Arn,
            },
          ],
          Sheets: sheets,
        },
        Permissions: [{
          Principal: principals.dashboardOwner,
          Actions: [
            'quicksight:DescribeDashboard',
            'quicksight:ListDashboardVersions',
            'quicksight:QueryDashboard',
            'quicksight:UpdateDashboard',
            'quicksight:DeleteDashboard',
            'quicksight:UpdateDashboardPermissions',
            'quicksight:DescribeDashboardPermissions',
            'quicksight:UpdateDashboardPublishedVersion',
          ],
        },
        {
          Principal: principals.embedOwner,
          Actions: [
            'quicksight:DescribeDashboard', 'quicksight:QueryDashboard', 'quicksight:ListDashboardVersions',
          ],
        }],
      };
      await createDashboard(dashboard.region, dashboardInput);
      const id = await store.createDashboard(dashboard);
      return res.status(201).json(new ApiSuccess({ id }, 'Dashboard created.'));
    } catch (error) {
      next(error);
    }
  };

  public async getDashboard(req: any, res: any, next: any) {
    try {
      const { dashboardId } = req.params;
      const dashboard = await store.getDashboard(dashboardId);
      if (!dashboard) {
        return res.status(404).json(new ApiFail('Dashboard not found'));
      }
      return res.json(new ApiSuccess(dashboard));
    } catch (error) {
      next(error);
    }
  };

  public async deleteDashboard(req: any, res: any, next: any) {
    try {
      const { dashboardId } = req.params;
      const operator = res.get('X-Click-Stream-Operator');
      const dashboard = await store.getDashboard(dashboardId);
      if (!dashboard) {
        return res.status(404).json(new ApiFail('Dashboard not found'));
      }
      const quickSightClient = new QuickSight({
        region: dashboard.region,
        ...aws_sdk_client_common_config,
      });
      await quickSightClient.deleteDashboard({
        AwsAccountId: process.env.AWS_ACCOUNT_ID,
        DashboardId: dashboardId,
      });
      await store.deleteDashboard(dashboardId, operator);
      return res.json(new ApiSuccess(null, 'Dashboard deleted.'));
    } catch (error) {
      next(error);
    }
  };

  public async list(req: any, res: any, next: any) {
    try {
      const { order, pageNumber, pageSize } = req.query;
      const result = await store.listProjects(order);
      const items = paginateData(result, true, pageSize, pageNumber);
      for (let project of items) {
        if (isEmpty(project.pipelineId)) {
          const latestPipelines = await store.listPipeline(project.id, 'latest', 'asc');
          if (latestPipelines.length === 0) {
            project.pipelineId = '';
          } else {
            project.pipelineId = latestPipelines[0].pipelineId;
          }
          await store.updateProject(project);
        }
      }
      return res.json(new ApiSuccess({
        totalCount: result.length,
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
        await pipeline.delete();
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

}