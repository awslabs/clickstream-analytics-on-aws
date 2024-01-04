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

import { ConditionalCheckFailedException, TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
import {
  GetCommand,
  GetCommandOutput,
  PutCommand,
  UpdateCommand,
  ScanCommandInput,
  QueryCommandInput,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { clickStreamTableName, dictionaryTableName, prefixTimeGSIName } from '../../common/constants';
import { docClient, marshallOptions, query, scan } from '../../common/dynamodb-client';
import { PipelineStatusType } from '../../common/model-ln';
import { logger } from '../../common/powertools';
import { KeyVal } from '../../common/types';
import { isEmpty } from '../../common/utils';
import { IApplication } from '../../model/application';
import { IDictionary } from '../../model/dictionary';
import { IPipeline } from '../../model/pipeline';
import { IPlugin } from '../../model/plugin';
import { IDashboard, IProject } from '../../model/project';
import { IUser, IUserSettings } from '../../model/user';
import { ClickStreamStore } from '../click-stream-store';

export class DynamoDbStore implements ClickStreamStore {
  public async createDashboard(dashboard: IDashboard): Promise<string> {
    const params: PutCommand = new PutCommand({
      TableName: clickStreamTableName,
      Item: {
        id: dashboard.id,
        type: `DASHBOARD#${dashboard.id}`,
        prefix: 'DASHBOARD',
        projectId: dashboard.projectId,
        appId: dashboard.appId,
        name: dashboard.name ?? '',
        description: dashboard.description ?? '',
        region: dashboard.region ?? '',
        sheets: dashboard.sheets ?? [],
        createAt: Date.now(),
        updateAt: Date.now(),
        operator: dashboard.operator?? '',
        deleted: false,
      },
    });
    await docClient.send(params);
    return dashboard.id;
  };

  public async getDashboard(dashboardId: string): Promise<IDashboard | undefined> {
    const params: GetCommand = new GetCommand({
      TableName: clickStreamTableName,
      Key: {
        id: dashboardId,
        type: `DASHBOARD#${dashboardId}`,
      },
    });
    const result: GetCommandOutput = await docClient.send(params);
    if (!result.Item) {
      return undefined;
    }
    const dashboard: IDashboard = result.Item as IDashboard;
    return !dashboard.deleted ? dashboard : undefined;
  };

  public async listDashboards(projectId: string, appId: string, order: string): Promise<IDashboard[]> {
    const input: QueryCommandInput = {
      TableName: clickStreamTableName,
      IndexName: prefixTimeGSIName,
      KeyConditionExpression: '#prefix= :prefix',
      FilterExpression: 'deleted = :d AND projectId = :projectId AND appId = :appId',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
      },
      ExpressionAttributeValues: {
        ':d': false,
        ':prefix': 'DASHBOARD',
        ':projectId': projectId,
        ':appId': appId,
      },
      ScanIndexForward: order === 'asc',
    };
    return await query(input) as IDashboard[];
  };

  public async deleteDashboard(dashboardId: string, operator: string): Promise<void> {
    const params: UpdateCommand = new UpdateCommand({
      TableName: clickStreamTableName,
      Key: {
        id: dashboardId,
        type: `DASHBOARD#${dashboardId}`,
      },
      // Define expressions for the new or updated attributes
      UpdateExpression: 'SET deleted= :d, #operator= :operator',
      ExpressionAttributeNames: {
        '#operator': 'operator',
      },
      ExpressionAttributeValues: {
        ':d': true,
        ':operator': operator,
      },
      ReturnValues: 'ALL_NEW',
    });
    await docClient.send(params);
  };

  public async createProject(project: IProject): Promise<string> {
    const params: PutCommand = new PutCommand({
      TableName: clickStreamTableName,
      Item: {
        id: project.id,
        type: `METADATA#${project.id}`,
        prefix: 'METADATA',
        name: project.name,
        description: project.description,
        emails: project.emails,
        platform: project.platform,
        region: project.region,
        environment: project.environment,
        pipelineId: '',
        status: 'ACTIVATED',
        createAt: Date.now(),
        updateAt: Date.now(),
        operator: project.operator?? '',
        deleted: false,
      },
    });
    await docClient.send(params);
    return project.id;
  };

  public async getProject(id: string): Promise<IProject | undefined> {
    const params: GetCommand = new GetCommand({
      TableName: clickStreamTableName,
      Key: {
        id: id,
        type: `METADATA#${id}`,
      },
    });
    const result: GetCommandOutput = await docClient.send(params);
    if (!result.Item) {
      return undefined;
    }
    const project: IProject = result.Item as IProject;
    return !project.deleted ? project : undefined;
  };

  public async isProjectExisted(projectId: string): Promise<boolean> {
    const params: GetCommand = new GetCommand({
      TableName: clickStreamTableName,
      Key: {
        id: projectId,
        type: `METADATA#${projectId}`,
      },
    });
    const result: GetCommandOutput = await docClient.send(params);
    if (!result.Item) {
      return false;
    }
    const project: IProject = result.Item as IProject;
    return project && !project.deleted;
  };

  public async updateProject(project: IProject): Promise<void> {
    let updateExpression = 'SET #updateAt= :u, #operator= :operator';
    let expressionAttributeValues = new Map();
    let expressionAttributeNames = {} as KeyVal<string>;
    expressionAttributeValues.set(':u', Date.now());
    expressionAttributeValues.set(':operator', project.operator);
    expressionAttributeNames['#updateAt'] = 'updateAt';
    expressionAttributeNames['#operator'] = 'operator';
    if (project.name) {
      updateExpression = `${updateExpression}, #name= :n`;
      expressionAttributeValues.set(':n', project.name);
      expressionAttributeNames['#name'] = 'name';
    }
    if (project.description) {
      updateExpression = `${updateExpression}, description= :d`;
      expressionAttributeValues.set(':d', project.description);
    }
    if (project.emails) {
      updateExpression = `${updateExpression}, emails= :e`;
      expressionAttributeValues.set(':e', project.emails);
    }
    if (project.platform) {
      updateExpression = `${updateExpression}, platform= :p`;
      expressionAttributeValues.set(':p', project.platform);
    }
    if (project.environment) {
      updateExpression = `${updateExpression}, #environment= :env`;
      expressionAttributeValues.set(':env', project.environment);
      expressionAttributeNames['#environment'] = 'environment';
    }
    if (project.region) {
      updateExpression = `${updateExpression}, #region= :r`;
      expressionAttributeValues.set(':r', project.region);
      expressionAttributeNames['#region'] = 'region';
    }
    if (project.status) {
      updateExpression = `${updateExpression}, #status= :s`;
      expressionAttributeValues.set(':s', project.status);
      expressionAttributeNames['#status'] = 'status';
    }
    if (project.pipelineId) {
      updateExpression = `${updateExpression}, #pipelineId= :pipelineId`;
      expressionAttributeValues.set(':pipelineId', project.pipelineId);
      expressionAttributeNames['#pipelineId'] = 'pipelineId';
    }
    const params: UpdateCommand = new UpdateCommand({
      TableName: clickStreamTableName,
      Key: {
        id: project.id,
        type: `METADATA#${project.id}`,
      },
      // Define expressions for the new or updated attributes
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: Object.fromEntries(expressionAttributeValues),
      ReturnValues: 'ALL_NEW',
    });
    await docClient.send(params);
  };

  public async deleteProject(id: string, operator: string): Promise<void> {
    // Scan all project versions
    const input: ScanCommandInput = {
      TableName: clickStreamTableName,
      FilterExpression: 'id = :p AND deleted = :d',
      ExpressionAttributeValues: {
        ':p': id,
        ':d': false,
      },
    };
    const records = await scan(input);
    const projects = records as IProject[];
    for (let index in projects) {
      const params: UpdateCommand = new UpdateCommand({
        TableName: clickStreamTableName,
        Key: {
          id: id,
          type: projects[index].type,
        },
        // Define expressions for the new or updated attributes
        UpdateExpression: 'SET deleted= :d, #operator= :operator',
        ExpressionAttributeNames: {
          '#operator': 'operator',
        },
        ExpressionAttributeValues: {
          ':d': false,
          ':operator': operator,
        },
        ReturnValues: 'ALL_NEW',
      });
      await docClient.send(params);
    }
  };

  public async listProjects(order: string): Promise<IProject[]> {
    const input: QueryCommandInput = {
      TableName: clickStreamTableName,
      IndexName: prefixTimeGSIName,
      KeyConditionExpression: '#prefix= :prefix',
      FilterExpression: 'deleted = :d',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
      },
      ExpressionAttributeValues: {
        ':d': false,
        ':prefix': 'METADATA',
      },
      ScanIndexForward: order === 'asc',
    };
    const records = await query(input);
    return records as IProject[];
  };

  public async addApplication(app: IApplication): Promise<string> {
    const params: PutCommand = new PutCommand({
      TableName: clickStreamTableName,
      Item: {
        id: app.id,
        type: `APP#${app.appId}`,
        prefix: 'APP',
        projectId: app.projectId,
        appId: app.appId,
        name: app.name,
        description: app.description,
        androidPackage: app.androidPackage ?? '',
        iosBundleId: app.iosBundleId ?? '',
        iosAppStoreId: app.iosAppStoreId ?? '',
        createAt: Date.now(),
        updateAt: Date.now(),
        operator: app.operator?? '',
        deleted: false,
      },
    });
    await docClient.send(params);
    return app.appId;
  };

  public async getApplication(projectId: string, appId: string): Promise<IApplication | undefined> {
    const params: GetCommand = new GetCommand({
      TableName: clickStreamTableName,
      Key: {
        id: projectId,
        type: `APP#${appId}`,
      },
    });
    const result: GetCommandOutput = await docClient.send(params);
    if (!result.Item) {
      return undefined;
    }
    const app: IApplication = result.Item as IApplication;
    return !app.deleted ? app : undefined;
  };

  public async updateApplication(app: IApplication): Promise<void> {
    let updateExpression = 'SET #updateAt= :u, #operator= :operator';
    let expressionAttributeValues = new Map();
    let expressionAttributeNames = {} as KeyVal<string>;
    expressionAttributeValues.set(':u', Date.now());
    expressionAttributeValues.set(':operator', app.operator);
    expressionAttributeNames['#updateAt'] = 'updateAt';
    expressionAttributeNames['#operator'] = 'operator';
    if (app.description) {
      updateExpression = `${updateExpression}, description= :d`;
      expressionAttributeValues.set(':d', app.description);
    }
    if (app.androidPackage) {
      updateExpression = `${updateExpression}, androidPackage= :androidPackage`;
      expressionAttributeValues.set(':androidPackage', app.androidPackage);
    }
    if (app.iosBundleId) {
      updateExpression = `${updateExpression}, iosBundleId= :iosBundleId`;
      expressionAttributeValues.set(':iosBundleId', app.iosBundleId);
    }
    if (app.iosAppStoreId) {
      updateExpression = `${updateExpression}, iosAppStoreId= :iosAppStoreId`;
      expressionAttributeValues.set(':iosAppStoreId', app.iosAppStoreId);
    }
    const params: UpdateCommand = new UpdateCommand({
      TableName: clickStreamTableName,
      Key: {
        id: app.projectId,
        type: `APP#${app.appId}`,
      },
      // Define expressions for the new or updated attributes
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: Object.fromEntries(expressionAttributeValues),
      ReturnValues: 'ALL_NEW',
    });
    await docClient.send(params);
  };

  public async listApplication(projectId: string, order: string): Promise<IApplication[]> {
    const input: QueryCommandInput = {
      TableName: clickStreamTableName,
      IndexName: prefixTimeGSIName,
      KeyConditionExpression: '#prefix= :prefix',
      FilterExpression: 'projectId = :p AND deleted = :d',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
      },
      ExpressionAttributeValues: {
        ':p': projectId,
        ':d': false,
        ':prefix': 'APP',
      },
      ScanIndexForward: order === 'asc',
    };
    const records = await query(input);
    return records as IApplication[];
  };

  public async listAllApplication(): Promise<IApplication[]> {
    const input: QueryCommandInput = {
      TableName: clickStreamTableName,
      IndexName: prefixTimeGSIName,
      KeyConditionExpression: '#prefix= :prefix',
      FilterExpression: 'deleted = :d',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
      },
      ExpressionAttributeValues: {
        ':d': false,
        ':prefix': 'APP',
      },
    };
    const records = await query(input);
    return records as IApplication[];
  };

  public async deleteApplication(projectId: string, appId: string, operator: string): Promise<void> {
    const params: UpdateCommand = new UpdateCommand({
      TableName: clickStreamTableName,
      Key: {
        id: projectId,
        type: `APP#${appId}`,
      },
      // Define expressions for the new or updated attributes
      UpdateExpression: 'SET deleted= :d, #operator= :operator',
      ExpressionAttributeNames: {
        '#operator': 'operator',
      },
      ExpressionAttributeValues: {
        ':d': true,
        ':operator': operator,
      },
      ReturnValues: 'ALL_NEW',
    });
    await docClient.send(params);
  };

  public async isApplicationExisted(projectId: string, appId: string): Promise<boolean> {
    const params: GetCommand = new GetCommand({
      TableName: clickStreamTableName,
      Key: {
        id: projectId,
        type: `APP#${appId}`,
      },
    });
    const result: GetCommandOutput = await docClient.send(params);
    if (!result.Item) {
      return false;
    }
    const app: IApplication = result.Item as IApplication;
    return app && !app.deleted;
  };

  public async addPipeline(pipeline: IPipeline): Promise<string> {
    const marshallPipeline = marshall(pipeline, {
      ...marshallOptions,
      convertTopLevelContainer: false,
    });
    const input = {
      TransactItems: [
        {
          Update: {
            TableName: clickStreamTableName,
            Key: {
              id: { S: pipeline.projectId },
              type: { S: `METADATA#${pipeline.projectId}` },
            },
            // Define expressions for the new or updated attributes
            UpdateExpression: 'SET pipelineId= :pipelineId',
            ExpressionAttributeValues: {
              ':pipelineId': { S: pipeline.pipelineId },
            },
          },
        },
        {
          Put: {
            TableName: clickStreamTableName,
            ConditionExpression: 'attribute_not_exists(#ConditionType)',
            ExpressionAttributeNames: {
              '#ConditionType': 'type',
            },
            Item: {
              id: { S: pipeline.id },
              type: { S: `PIPELINE#${pipeline.pipelineId}#latest` },
              prefix: { S: 'PIPELINE' },
              pipelineId: { S: pipeline.pipelineId },
              projectId: { S: pipeline.projectId },
              region: { S: pipeline.region },
              dataCollectionSDK: { S: pipeline.dataCollectionSDK },
              statusType: { S: pipeline.statusType ?? PipelineStatusType.UPDATING },
              tags: marshallPipeline.tags,
              network: marshallPipeline.network,
              bucket: marshallPipeline.bucket,
              ingestionServer: marshallPipeline.ingestionServer ?? { M: {} },
              dataProcessing: marshallPipeline.dataProcessing ?? { M: {} },
              dataModeling: marshallPipeline.dataModeling ?? { M: {} },
              reporting: marshallPipeline.reporting ?? { M: {} },
              workflow: marshallPipeline.workflow ?? { M: {} },
              executionDetail: marshallPipeline.executionDetail ?? { M: {} },
              stackDetails: marshallPipeline.stackDetails ?? { L: [] },
              templateVersion: { S: pipeline.templateVersion ?? '' },
              lastAction: { S: pipeline.lastAction ?? 'Create' },
              version: { S: Date.now().toString() },
              versionTag: { S: 'latest' },
              createAt: { N: Date.now().toString() },
              updateAt: { N: Date.now().toString() },
              operator: { S: pipeline.operator ?? '' },
              deleted: { BOOL: false },
            },
          },
        },
      ],
    };
    const params: TransactWriteItemsCommand = new TransactWriteItemsCommand(input);
    await docClient.send(params);
    return pipeline.pipelineId;
  };

  public async getPipeline(projectId: string, pipelineId: string, version?: string | undefined): Promise<IPipeline | undefined> {
    let skVersion: string = version ?? 'latest';
    const params: GetCommand = new GetCommand({
      TableName: clickStreamTableName,
      Key: {
        id: projectId,
        type: `PIPELINE#${pipelineId}#${skVersion}`,
      },
    });
    const result: GetCommandOutput = await docClient.send(params);
    if (!result.Item) {
      return undefined;
    }
    const pipeline: IPipeline = result.Item as IPipeline;
    return !pipeline.deleted ? pipeline : undefined;
  };

  public async updatePipeline(pipeline: IPipeline, curPipeline: IPipeline): Promise<void> {
    // Update new pipeline && Backup the current pipeline
    const marshallCurPipeline = marshall(curPipeline, {
      ...marshallOptions,
      convertTopLevelContainer: false,
    });
    const marshallPipeline = marshall(pipeline, {
      ...marshallOptions,
      convertTopLevelContainer: false,
    });
    const params: TransactWriteItemsCommand = new TransactWriteItemsCommand({
      TransactItems: [
        {
          Put: {
            TableName: clickStreamTableName,
            ConditionExpression: 'attribute_not_exists(#ConditionType)',
            ExpressionAttributeNames: {
              '#ConditionType': 'type',
            },
            Item: {
              id: { S: curPipeline.id },
              type: { S: `PIPELINE#${curPipeline.pipelineId}#${curPipeline.version}` },
              prefix: { S: curPipeline.prefix },
              pipelineId: { S: curPipeline.pipelineId },
              projectId: { S: curPipeline.projectId },
              region: { S: curPipeline.region },
              dataCollectionSDK: { S: curPipeline.dataCollectionSDK },
              statusType: { S: curPipeline.statusType ?? PipelineStatusType.UPDATING },
              tags: marshallCurPipeline.tags,
              network: marshallCurPipeline.network,
              bucket: marshallCurPipeline.bucket,
              ingestionServer: marshallCurPipeline.ingestionServer,
              dataProcessing: marshallCurPipeline.dataProcessing,
              dataModeling: marshallCurPipeline.dataModeling,
              reporting: marshallCurPipeline.reporting,
              workflow: marshallCurPipeline.workflow ?? { M: {} },
              executionDetail: marshallPipeline.executionDetail ?? { M: {} },
              stackDetails: marshallPipeline.stackDetails ?? { L: [] },
              templateVersion: { S: curPipeline.templateVersion ?? '' },
              lastAction: { S: curPipeline.lastAction ?? '' },
              version: { S: curPipeline.version },
              versionTag: { S: curPipeline.version },
              createAt: { N: curPipeline.createAt.toString() },
              updateAt: { N: Date.now().toString() },
              operator: { S: pipeline.operator ?? '' },
              deleted: { BOOL: true },
            },
          },
        },
        {
          Update: {
            TableName: clickStreamTableName,
            Key: {
              id: { S: pipeline.id },
              type: { S: `PIPELINE#${pipeline.pipelineId}#latest` },
            },
            ConditionExpression: '#ConditionVersion = :ConditionVersionValue',
            // Define expressions for the new or updated attributes
            UpdateExpression: 'SET ' +
              '#prefix = :prefix, ' +
              '#region = :region, ' +
              'dataCollectionSDK = :dataCollectionSDK, ' +
              '#statusType = :statusType, ' +
              '#tags = :tags, ' +
              '#network = :network, ' +
              '#bucket = :bucket, ' +
              'ingestionServer = :ingestionServer, ' +
              'dataProcessing = :dataProcessing, ' +
              'dataModeling = :dataModeling, ' +
              'reporting = :reporting, ' +
              'workflow = :workflow, ' +
              'executionDetail = :executionDetail, ' +
              'stackDetails = :stackDetails, ' +
              'templateVersion = :templateVersion, ' +
              'lastAction = :lastAction, ' +
              'version = :version, ' +
              'versionTag = :versionTag, ' +
              'updateAt = :updateAt, ' +
              '#pipelineOperator = :operator ',
            ExpressionAttributeNames: {
              '#prefix': 'prefix',
              '#region': 'region',
              '#statusType': 'statusType',
              '#tags': 'tags',
              '#network': 'network',
              '#bucket': 'bucket',
              '#pipelineOperator': 'operator',
              '#ConditionVersion': 'version',
            },
            ExpressionAttributeValues: {
              ':prefix': { S: pipeline.prefix },
              ':region': { S: pipeline.region },
              ':dataCollectionSDK': { S: pipeline.dataCollectionSDK },
              ':statusType': { S: pipeline.statusType ?? PipelineStatusType.UPDATING },
              ':tags': marshallPipeline.tags,
              ':network': marshallPipeline.network,
              ':bucket': marshallPipeline.bucket,
              ':ingestionServer': marshallPipeline.ingestionServer,
              ':dataProcessing': marshallPipeline.dataProcessing,
              ':dataModeling': marshallPipeline.dataModeling,
              ':reporting': marshallPipeline.reporting,
              ':ConditionVersionValue': { S: pipeline.version },
              ':workflow': marshallPipeline.workflow ?? { M: {} },
              ':executionDetail': marshallPipeline.executionDetail ?? { M: {} },
              ':stackDetails': marshallPipeline.stackDetails ?? { L: [] },
              ':templateVersion': { S: pipeline.templateVersion ?? '' },
              ':lastAction': { S: pipeline.lastAction ?? '' },
              ':version': { S: Date.now().toString() },
              ':versionTag': { S: 'latest' },
              ':updateAt': { N: Date.now().toString() },
              ':operator': { S: pipeline.operator ?? '' },
            },
          },
        },
      ],
    });
    await docClient.send(params);
  };

  public async updatePipelineAtCurrentVersion(pipeline: IPipeline): Promise<void> {
    try {
      const params: UpdateCommand = new UpdateCommand({
        TableName: clickStreamTableName,
        Key: {
          id: pipeline.projectId,
          type: pipeline.type,
        },
        ConditionExpression: '#ConditionVersion = :ConditionVersionValue',
        // Define expressions for the new or updated attributes
        UpdateExpression: 'SET ' +
          'dataCollectionSDK = :dataCollectionSDK, ' +
          '#statusType = :statusType, ' +
          '#tags = :tags, ' +
          '#network = :network, ' +
          '#bucket = :bucket, ' +
          'ingestionServer = :ingestionServer, ' +
          'dataProcessing = :dataProcessing, ' +
          'dataModeling = :dataModeling, ' +
          'reporting = :reporting, ' +
          'workflow = :workflow, ' +
          'executionDetail = :executionDetail, ' +
          'stackDetails = :stackDetails, ' +
          'templateVersion = :templateVersion, ' +
          'lastAction = :lastAction, ' +
          'updateAt = :updateAt, ' +
          '#pipelineOperator = :operator ',
        ExpressionAttributeNames: {
          '#statusType': 'statusType',
          '#tags': 'tags',
          '#network': 'network',
          '#bucket': 'bucket',
          '#pipelineOperator': 'operator',
          '#ConditionVersion': 'version',
        },
        ExpressionAttributeValues: {
          ':dataCollectionSDK': pipeline.dataCollectionSDK,
          ':statusType': pipeline.statusType,
          ':tags': pipeline.tags,
          ':network': pipeline.network,
          ':bucket': pipeline.bucket,
          ':ingestionServer': pipeline.ingestionServer,
          ':dataProcessing': pipeline.dataProcessing ?? {},
          ':dataModeling': pipeline.dataModeling ?? {},
          ':reporting': pipeline.reporting ?? {},
          ':ConditionVersionValue': pipeline.version,
          ':workflow': pipeline.workflow ?? {},
          ':executionDetail': pipeline.executionDetail ?? {},
          ':stackDetails': pipeline.stackDetails ?? [],
          ':templateVersion': pipeline.templateVersion ?? '',
          ':lastAction': pipeline.lastAction ?? '',
          ':updateAt': pipeline.updateAt,
          ':operator': pipeline.operator,
        },
        ReturnValues: 'ALL_NEW',
      });
      await docClient.send(params);
    } catch (err) {
      logger.error('Failed to update pipeline: ', { err });
      throw err;
    }
  };

  public async deletePipeline(projectId: string, pipelineId: string, operator: string): Promise<void> {
    // Scan all pipeline versions
    const input: ScanCommandInput = {
      TableName: clickStreamTableName,
      FilterExpression: 'id = :p AND begins_with(#type, :t) AND deleted = :d',
      ExpressionAttributeNames: {
        '#type': 'type',
      },
      ExpressionAttributeValues: {
        ':p': projectId,
        ':t': `PIPELINE#${pipelineId}`,
        ':d': false,
      },
    };
    const records = await scan(input);
    const pipelines = records as IPipeline[];
    for (let index in pipelines) {
      const params: UpdateCommand = new UpdateCommand({
        TableName: clickStreamTableName,
        Key: {
          id: projectId,
          type: pipelines[index].type,
        },
        // Define expressions for the new or updated attributes
        UpdateExpression: 'SET #statusType =:statusType, #operator= :operator',
        ExpressionAttributeNames: {
          '#statusType': 'statusType',
          '#operator': 'operator',
        },
        ExpressionAttributeValues: {
          ':operator': operator,
          ':statusType': PipelineStatusType.DELETING,
        },
        ReturnValues: 'ALL_NEW',
      });
      await docClient.send(params);
    }
  };

  public async listPipeline(projectId: string, version: string, order: string): Promise<IPipeline[]> {
    let filterExpression = 'deleted = :d';
    let expressionAttributeValues = new Map();
    expressionAttributeValues.set(':d', false);
    expressionAttributeValues.set(':prefix', 'PIPELINE');
    if (!isEmpty(version)) {
      filterExpression = `${filterExpression} AND versionTag=:vt`;
      expressionAttributeValues.set(':vt', version);
    }
    if (!isEmpty(projectId)) {
      filterExpression = `${filterExpression} AND id = :p`;
      expressionAttributeValues.set(':p', projectId);
    }
    const input: QueryCommandInput = {
      TableName: clickStreamTableName,
      IndexName: prefixTimeGSIName,
      KeyConditionExpression: '#prefix= :prefix',
      FilterExpression: filterExpression,
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
      },
      ExpressionAttributeValues: Object.fromEntries(expressionAttributeValues),
      ScanIndexForward: order === 'asc',
    };
    const records = await query(input);
    return records as IPipeline[];
  };

  public async isPipelineExisted(projectId: string, pipelineId: string): Promise<boolean> {
    const params: GetCommand = new GetCommand({
      TableName: clickStreamTableName,
      Key: {
        id: projectId,
        type: `PIPELINE#${pipelineId}#latest`,
      },
    });
    const result: GetCommandOutput = await docClient.send(params);
    if (!result.Item) {
      return false;
    }
    const pipeline: IPipeline = result.Item as IPipeline;
    return pipeline && !pipeline.deleted;
  };

  public async getDictionary(name: string): Promise<IDictionary | undefined> {
    const params: GetCommand = new GetCommand({
      TableName: dictionaryTableName,
      Key: {
        name: name,
      },
    });
    const result: GetCommandOutput = await docClient.send(params);
    if (!result.Item) {
      return undefined;
    }
    return result.Item as IDictionary;
  };

  public async updateDictionary(dictionary: IDictionary): Promise<void> {
    const params: UpdateCommand = new UpdateCommand({
      TableName: dictionaryTableName,
      Key: {
        name: dictionary.name,
      },
      UpdateExpression: 'SET #data =:data',
      ExpressionAttributeNames: {
        '#data': 'data',
      },
      ExpressionAttributeValues: {
        ':data': dictionary.data,
      },
      ReturnValues: 'ALL_NEW',
    });
    await docClient.send(params);
  };

  public async listDictionary(): Promise<IDictionary[]> {
    const input: ScanCommandInput = {
      TableName: dictionaryTableName,
    };
    const records = await scan(input);
    return records as IDictionary[];
  };

  public async isRequestIdExisted(id: string): Promise<boolean> {
    try {
      const params: PutCommand = new PutCommand({
        TableName: clickStreamTableName,
        Item: {
          id: id,
          type: 'REQUESTID',
          ttl: Date.now() / 1000 + 600,
        },
        ConditionExpression: 'attribute_not_exists(#id)',
        ExpressionAttributeNames: {
          '#id': 'id',
        },
      });
      await docClient.send(params);
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) {
        return true;
      }
      throw err;
    }
    return false;
  };

  public async saveRequestId(id: string): Promise<void> {
    const params: PutCommand = new PutCommand({
      TableName: clickStreamTableName,
      Item: {
        id: id,
        type: 'REQUESTID',
        ttl: Date.now() / 1000 + 600,
      },
    });
    await docClient.send(params);
  };

  public async deleteRequestId(id: string): Promise<void> {
    const params: DeleteCommand = new DeleteCommand({
      TableName: clickStreamTableName,
      Key: {
        id: id,
        type: 'REQUESTID',
      },
    });
    await docClient.send(params);
  };

  public async addPlugin(plugin: IPlugin): Promise<string> {
    const params: PutCommand = new PutCommand({
      TableName: clickStreamTableName,
      Item: {
        id: plugin.id,
        type: `PLUGIN#${plugin.id}`,
        prefix: 'PLUGIN',
        name: plugin.name,
        description: plugin.description,
        jarFile: plugin.jarFile,
        dependencyFiles: plugin.dependencyFiles,
        mainFunction: plugin.mainFunction,
        pluginType: plugin.pluginType,
        builtIn: false,
        bindCount: 0,
        createAt: Date.now(),
        updateAt: Date.now(),
        operator: plugin.operator?? '',
        deleted: false,
      },
    });
    await docClient.send(params);
    return plugin.id;
  };

  public async getPlugin(pluginId: string): Promise<IPlugin | undefined> {
    if (pluginId.startsWith('BUILT-IN')) {
      const dic = await this.getDictionary('BuiltInPlugins');
      if (dic) {
        const builtInPlugins: IPlugin[] = dic.data;
        const plugins = builtInPlugins.filter(p => p.id === pluginId);
        return !isEmpty(plugins) ? plugins[0] : undefined;
      }
    }
    const params: GetCommand = new GetCommand({
      TableName: clickStreamTableName,
      Key: {
        id: pluginId,
        type: `PLUGIN#${pluginId}`,
      },
    });
    const result: GetCommandOutput = await docClient.send(params);
    if (!result.Item) {
      return undefined;
    }
    const plugin: IPlugin = result.Item as IPlugin;
    return !plugin.deleted ? plugin : undefined;
  };

  public async updatePlugin(plugin: IPlugin): Promise<void> {
    let updateExpression = 'SET #updateAt= :u, #operator= :operator';
    let expressionAttributeValues = new Map();
    let expressionAttributeNames = {} as KeyVal<string>;
    expressionAttributeValues.set(':u', Date.now());
    expressionAttributeValues.set(':operator', plugin.operator);
    expressionAttributeValues.set(':bindCount', 0);
    expressionAttributeNames['#updateAt'] = 'updateAt';
    expressionAttributeNames['#operator'] = 'operator';
    if (plugin.description) {
      updateExpression = `${updateExpression}, description= :d`;
      expressionAttributeValues.set(':d', plugin.description);
    }
    if (plugin.jarFile) {
      updateExpression = `${updateExpression}, jarFile= :jarFile`;
      expressionAttributeValues.set(':jarFile', plugin.jarFile);
    }
    if (plugin.dependencyFiles) {
      updateExpression = `${updateExpression}, dependencyFiles= :dependencyFiles`;
      expressionAttributeValues.set(':dependencyFiles', plugin.dependencyFiles);
    }
    if (plugin.mainFunction) {
      updateExpression = `${updateExpression}, mainFunction= :mainFunction`;
      expressionAttributeValues.set(':mainFunction', plugin.mainFunction);
    }
    const params: UpdateCommand = new UpdateCommand({
      TableName: clickStreamTableName,
      Key: {
        id: plugin.id,
        type: `PLUGIN#${plugin.id}`,
      },
      ConditionExpression: 'bindCount = :bindCount',
      // Define expressions for the new or updated attributes
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: Object.fromEntries(expressionAttributeValues),
      ReturnValues: 'ALL_NEW',
    });
    await docClient.send(params);
  };

  public async bindPlugins(pluginIds: string[], count: number): Promise<void> {
    for (let pluginId of pluginIds) {
      const params: UpdateCommand = new UpdateCommand({
        TableName: clickStreamTableName,
        Key: {
          id: pluginId,
          type: `PLUGIN#${pluginId}`,
        },
        // Define expressions for the new or updated attributes
        UpdateExpression: 'SET bindCount = bindCount + :b, #updateAt= :u',
        ExpressionAttributeNames: {
          '#updateAt': 'updateAt',
        },
        ExpressionAttributeValues: {
          ':b': count,
          ':u': Date.now(),
        },
        ReturnValues: 'ALL_NEW',
      });
      await docClient.send(params);
    }
  };

  public async listPlugin(pluginType: string, order: string): Promise<IPlugin[]> {
    let filterExpression = 'deleted = :d';
    let expressionAttributeValues = new Map();
    expressionAttributeValues.set(':d', false);
    expressionAttributeValues.set(':prefix', 'PLUGIN');
    if (!isEmpty(pluginType)) {
      filterExpression = `${filterExpression} AND pluginType=:pluginType`;
      expressionAttributeValues.set(':pluginType', pluginType);
    }

    let plugins: IPlugin[] = [];
    const dic = await this.getDictionary('BuiltInPlugins');
    if (dic) {
      const builtInPlugins: IPlugin[] = dic.data;
      if (!isEmpty(pluginType)) {
        plugins = builtInPlugins.filter(p => p.pluginType === pluginType);
      } else {
        plugins = builtInPlugins;
      }
    }

    const input: QueryCommandInput = {
      TableName: clickStreamTableName,
      IndexName: prefixTimeGSIName,
      KeyConditionExpression: '#prefix= :prefix',
      FilterExpression: filterExpression,
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
      },
      ExpressionAttributeValues: Object.fromEntries(expressionAttributeValues),
      ScanIndexForward: order === 'asc',
    };
    const records = await query(input);
    return (plugins).concat(records as IPlugin[]);
  };

  public async deletePlugin(pluginId: string, operator: string): Promise<void> {
    const params: UpdateCommand = new UpdateCommand({
      TableName: clickStreamTableName,
      Key: {
        id: pluginId,
        type: `PLUGIN#${pluginId}`,
      },
      ConditionExpression: 'bindCount = :bindCount',
      // Define expressions for the new or updated attributes
      UpdateExpression: 'SET deleted= :d, #operator= :operator',
      ExpressionAttributeNames: {
        '#operator': 'operator',
      },
      ExpressionAttributeValues: {
        ':d': true,
        ':bindCount': 0,
        ':operator': operator,
      },
      ReturnValues: 'ALL_NEW',
    });
    await docClient.send(params);
  };

  public async isPluginExisted(pluginId: string): Promise<boolean> {
    const params: GetCommand = new GetCommand({
      TableName: clickStreamTableName,
      Key: {
        id: pluginId,
        type: `PLUGIN#${pluginId}`,
      },
    });
    const result: GetCommandOutput = await docClient.send(params);
    if (!result.Item) {
      return false;
    }
    const plugin: IPlugin = result.Item as IPlugin;
    return plugin && !plugin.deleted;
  };

  public async addUser(user: IUser): Promise<string> {
    const params: PutCommand = new PutCommand({
      TableName: clickStreamTableName,
      Item: {
        id: user.id,
        type: 'USER',
        prefix: 'USER',
        name: user.name ?? '',
        roles: user.roles ?? [],
        createAt: Date.now(),
        updateAt: Date.now(),
        operator: user.operator?? '',
        deleted: false,
      },
    });
    await docClient.send(params);
    return user.id;
  };

  public async getUser(id: string): Promise<IUser | undefined> {
    const params: GetCommand = new GetCommand({
      TableName: clickStreamTableName,
      Key: {
        id: id,
        type: 'USER',
      },
    });
    const result: GetCommandOutput = await docClient.send(params);
    if (!result.Item) {
      return undefined;
    }
    const user: IUser = result.Item as IUser;
    return !user.deleted ? user : undefined;
  };

  public async updateUser(user: IUser): Promise<void> {
    let updateExpression = 'SET #updateAt= :u, #operator= :operator';
    let expressionAttributeValues = new Map();
    let expressionAttributeNames = {} as KeyVal<string>;
    expressionAttributeValues.set(':u', Date.now());
    expressionAttributeValues.set(':operator', user.operator);
    expressionAttributeNames['#updateAt'] = 'updateAt';
    expressionAttributeNames['#operator'] = 'operator';
    if (user.name) {
      updateExpression = `${updateExpression}, #name= :n`;
      expressionAttributeValues.set(':n', user.name);
      expressionAttributeNames['#name'] = 'name';
    }
    if (user.roles) {
      updateExpression = `${updateExpression}, #roles= :roles`;
      expressionAttributeValues.set(':roles', user.roles);
      expressionAttributeNames['#roles'] = 'roles';
    }
    const params: UpdateCommand = new UpdateCommand({
      TableName: clickStreamTableName,
      Key: {
        id: user.id,
        type: 'USER',
      },
      // Define expressions for the new or updated attributes
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: Object.fromEntries(expressionAttributeValues),
      ReturnValues: 'ALL_NEW',
    });
    await docClient.send(params);
  };

  public async listUser(): Promise<IUser[]> {
    const input: QueryCommandInput = {
      TableName: clickStreamTableName,
      IndexName: prefixTimeGSIName,
      KeyConditionExpression: '#prefix= :prefix',
      FilterExpression: 'deleted = :d',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
      },
      ExpressionAttributeValues: {
        ':d': false,
        ':prefix': 'USER',
      },
    };
    const records = await query(input);
    return records as IUser[];
  };

  public async deleteUser(id: string, operator: string): Promise<void> {
    const params: UpdateCommand = new UpdateCommand({
      TableName: clickStreamTableName,
      Key: {
        id: id,
        type: 'USER',
      },
      // Define expressions for the new or updated attributes
      UpdateExpression: 'SET deleted= :d, #operator= :operator',
      ExpressionAttributeNames: {
        '#operator': 'operator',
      },
      ExpressionAttributeValues: {
        ':d': true,
        ':operator': operator,
      },
      ReturnValues: 'ALL_NEW',
    });
    await docClient.send(params);
  };

  public async getUserSettings(): Promise<IUserSettings | undefined> {
    const params: GetCommand = new GetCommand({
      TableName: clickStreamTableName,
      Key: {
        id: 'USER_SETTINGS',
        type: 'USER_SETTINGS',
      },
    });
    const result: GetCommandOutput = await docClient.send(params);
    return result.Item ? result.Item as IUserSettings : undefined;
  };

  public async updateUserSettings(userSettings: IUserSettings): Promise<void> {
    const params: UpdateCommand = new UpdateCommand({
      TableName: clickStreamTableName,
      Key: {
        id: 'USER_SETTINGS',
        type: 'USER_SETTINGS',
      },
      // Define expressions for the new or updated attributes
      UpdateExpression: 'SET roleJsonPath= :roleJsonPath, adminRoleNames= :adminRoleNames, operatorRoleNames= :operatorRoleNames, analystRoleNames= :analystRoleNames, analystReaderRoleNames= :analystReaderRoleNames',
      ExpressionAttributeValues: {
        ':roleJsonPath': userSettings.roleJsonPath,
        ':adminRoleNames': userSettings.adminRoleNames,
        ':operatorRoleNames': userSettings.operatorRoleNames,
        ':analystRoleNames': userSettings.analystRoleNames,
        ':analystReaderRoleNames': userSettings.analystReaderRoleNames,
      },
      ReturnValues: 'ALL_NEW',
    });
    await docClient.send(params);
  };
}