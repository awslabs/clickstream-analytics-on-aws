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

import { TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
import { ExecutionStatus } from '@aws-sdk/client-sfn';
import {
  GetCommand,
  GetCommandOutput,
  PutCommand,
  ScanCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { clickStreamTableName, dictionaryTableName, prefixTimeGSIName } from '../../common/constants';
import { docClient } from '../../common/dynamodb-client';
import { getPaginatedResults } from '../../common/paginator';
import { KeyVal, PipelineStatus } from '../../common/types';
import { isEmpty, tryToJson } from '../../common/utils';
import { Application, ApplicationList } from '../../model/application';
import { Dictionary } from '../../model/dictionary';
import {
  Pipeline,
  PipelineList,
} from '../../model/pipeline';
import { Plugin, PluginList } from '../../model/plugin';
import { Project, ProjectList } from '../../model/project';
import { ClickStreamStore } from '../click-stream-store';

export class DynamoDbStore implements ClickStreamStore {

  public async createProject(project: Project): Promise<string> {
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
        status: 'ACTIVED',
        createAt: Date.now(),
        updateAt: Date.now(),
        operator: '',
        deleted: false,
      },
    });
    await docClient.send(params);
    return project.id;
  };

  public async getProject(id: string): Promise<Project | undefined> {
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
    const project: Project = result.Item as Project;
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
    const project: Project = result.Item as Project;
    return project && !project.deleted;
  };

  public async updateProject(project: Project): Promise<void> {
    let updateExpression = 'SET #updateAt= :u';
    let expressionAttributeValues = new Map();
    let expressionAttributeNames = {} as KeyVal<string>;
    expressionAttributeValues.set(':u', Date.now());
    expressionAttributeNames['#updateAt'] = 'updateAt';
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
    const params: UpdateCommand = new UpdateCommand({
      TableName: clickStreamTableName,
      Key: {
        id: project.id,
        type: `METADATA#${project.id}`,
      },
      // Define expressions for the new or updated attributes
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames as KeyVal<string>,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });
    await docClient.send(params);
  };

  public async deleteProject(id: string): Promise<void> {
    // Scan all project versions
    const records = await getPaginatedResults(async (ExclusiveStartKey: any) => {
      const scan_params: ScanCommand = new ScanCommand({
        TableName: clickStreamTableName,
        FilterExpression: 'id = :p AND deleted = :d',
        ExpressionAttributeValues: {
          ':p': id,
          ':d': false,
        },
        ExclusiveStartKey,
      });
      const queryResponse = await docClient.send(scan_params);
      return {
        marker: queryResponse.LastEvaluatedKey,
        results: queryResponse.Items,
      };
    });
    const projects = records as Project[];
    for (let index in projects) {
      const params: UpdateCommand = new UpdateCommand({
        TableName: clickStreamTableName,
        Key: {
          id: id,
          type: projects[index].type,
        },
        // Define expressions for the new or updated attributes
        UpdateExpression: 'SET deleted= :d',
        ExpressionAttributeValues: {
          ':d': true,
        },
        ReturnValues: 'ALL_NEW',
      });
      await docClient.send(params);
    }
  };

  public async listProjects(order: string, pagination: boolean, pageSize: number, pageNumber: number): Promise<ProjectList> {
    const records = await getPaginatedResults(async (ExclusiveStartKey: any) => {
      const params: QueryCommand = new QueryCommand({
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
        ExclusiveStartKey,
      });
      const queryResponse = await docClient.send(params);
      return {
        marker: queryResponse.LastEvaluatedKey,
        results: queryResponse.Items,
      };
    });
    let projects: ProjectList = {
      totalCount: 0,
      items: [],
    };
    projects.totalCount = records?.length;
    if (pagination) {
      if (projects.totalCount) {
        pageNumber = Math.min(Math.ceil(projects.totalCount / pageSize), pageNumber);
        const startIndex = pageSize * (pageNumber - 1);
        const endIndex = Math.min(pageSize * pageNumber, projects.totalCount);
        projects.items = records?.slice(startIndex, endIndex) as Project[];
      }
    } else {
      projects.items = records as Project[];
    }
    return projects;
  };

  public async addApplication(app: Application): Promise<string> {
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
        operator: '',
        deleted: false,
      },
    });
    await docClient.send(params);
    return app.appId;
  };

  public async getApplication(projectId: string, appId: string): Promise<Application | undefined> {
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
    const app: Application = result.Item as Application;
    return !app.deleted ? app : undefined;
  };

  public async updateApplication(app: Application): Promise<void> {
    let updateExpression = 'SET #updateAt= :u';
    let expressionAttributeValues = new Map();
    let expressionAttributeNames = {} as KeyVal<string>;
    expressionAttributeValues.set(':u', Date.now());
    expressionAttributeNames['#updateAt'] = 'updateAt';
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
      ExpressionAttributeNames: expressionAttributeNames as KeyVal<string>,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });
    await docClient.send(params);
  };

  public async listApplication(
    projectId: string, order: string, pagination: boolean, pageSize: number, pageNumber: number): Promise<ApplicationList> {
    const records = await getPaginatedResults(async (ExclusiveStartKey: any) => {
      const params: QueryCommand = new QueryCommand({
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
        ExclusiveStartKey,
      });
      const queryResponse = await docClient.send(params);
      return {
        marker: queryResponse.LastEvaluatedKey,
        results: queryResponse.Items,
      };
    });

    let apps: ApplicationList = {
      totalCount: 0,
      items: [],
    };
    apps.totalCount = records?.length;
    if (pagination) {
      if (apps.totalCount) {
        pageNumber = Math.min(Math.ceil(apps.totalCount / pageSize), pageNumber);
        const startIndex = pageSize * (pageNumber - 1);
        const endIndex = Math.min(pageSize * pageNumber, apps.totalCount);
        apps.items = records?.slice(startIndex, endIndex) as Application[];
      }
    } else {
      apps.items = records as Application[];
    }
    return apps;
  };

  public async deleteApplication(projectId: string, appId: string): Promise<void> {
    const params: UpdateCommand = new UpdateCommand({
      TableName: clickStreamTableName,
      Key: {
        id: projectId,
        type: `APP#${appId}`,
      },
      // Define expressions for the new or updated attributes
      UpdateExpression: 'SET deleted= :d',
      ExpressionAttributeValues: {
        ':d': true,
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
    const app: Application = result.Item as Application;
    return app && !app.deleted;
  };

  public async addPipeline(pipeline: Pipeline): Promise<string> {
    const params: PutCommand = new PutCommand({
      TableName: clickStreamTableName,
      Item: {
        id: pipeline.id,
        type: `PIPELINE#${pipeline.pipelineId}#latest`,
        prefix: 'PIPELINE',
        pipelineId: pipeline.pipelineId,
        projectId: pipeline.projectId,
        name: pipeline.name,
        description: pipeline.description,
        region: pipeline.region,
        dataCollectionSDK: pipeline.dataCollectionSDK,
        status: pipeline.status ?? ExecutionStatus.RUNNING,
        tags: pipeline.tags ?? [],
        network: pipeline.network,
        bucket: pipeline.bucket,
        ingestionServer: pipeline.ingestionServer,
        etl: pipeline.etl,
        dataAnalytics: pipeline.dataAnalytics,
        workflow: pipeline.workflow ?? {},
        executionName: pipeline.executionName ?? '',
        executionArn: pipeline.executionArn ?? '',
        version: pipeline.version ?? Date.now().toString(),
        versionTag: 'latest',
        createAt: pipeline.createAt ?? Date.now(),
        updateAt: Date.now(),
        operator: pipeline.operator ?? '',
        deleted: pipeline.deleted ?? false,
      },
    });
    await docClient.send(params);
    return pipeline.pipelineId;
  };

  public async getPipeline(projectId: string, pipelineId: string, version?: string | undefined): Promise<Pipeline | undefined> {
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
    const pipeline: Pipeline = result.Item as Pipeline;
    return !pipeline.deleted ? pipeline : undefined;
  };

  public async updatePipeline(pipeline: Pipeline, curPipeline: Pipeline): Promise<void> {
    // Update new pipeline && Backup the current pipeline
    const marshallCurPipeline = marshall(curPipeline, {
      convertEmptyValues: true,
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
    });
    const marshallPipeline = marshall(pipeline, {
      convertEmptyValues: true,
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
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
              name: { S: curPipeline.name },
              description: { S: curPipeline.description },
              region: { S: curPipeline.region },
              dataCollectionSDK: { S: curPipeline.dataCollectionSDK },
              status: marshallCurPipeline.status,
              tags: marshallCurPipeline.tags,
              network: marshallCurPipeline.network,
              bucket: marshallCurPipeline.bucket,
              ingestionServer: marshallCurPipeline.ingestionServer,
              etl: marshallCurPipeline.etl,
              dataAnalytics: marshallCurPipeline.dataAnalytics,
              workflow: marshallCurPipeline.workflow ?? { M: {} },
              executionName: { S: curPipeline.executionName ?? '' },
              executionArn: { S: curPipeline.executionArn ?? '' },
              version: { S: curPipeline.version },
              versionTag: { S: curPipeline.version },
              createAt: { N: curPipeline.createAt.toString() },
              updateAt: { N: Date.now().toString() },
              operator: { S: pipeline.operator },
              deleted: { BOOL: pipeline.deleted },
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
              '#pipelineName = :name, ' +
              'description = :description, ' +
              '#region = :region, ' +
              'dataCollectionSDK = :dataCollectionSDK, ' +
              '#status = :status, ' +
              '#tags = :tags, ' +
              '#network = :network, ' +
              '#bucket = :bucket, ' +
              'ingestionServer = :ingestionServer, ' +
              'etl = :etl, ' +
              'dataAnalytics = :dataAnalytics, ' +
              'workflow = :workflow, ' +
              'executionName = :executionName, ' +
              'executionArn = :executionArn, ' +
              'version = :version, ' +
              'versionTag = :versionTag, ' +
              'updateAt = :updateAt, ' +
              '#pipelineOperator = :operator ',
            ExpressionAttributeNames: {
              '#prefix': 'prefix',
              '#pipelineName': 'name',
              '#region': 'region',
              '#status': 'status',
              '#tags': 'tags',
              '#network': 'network',
              '#bucket': 'bucket',
              '#pipelineOperator': 'operator',
              '#ConditionVersion': 'version',
            },
            ExpressionAttributeValues: {
              ':prefix': { S: pipeline.prefix },
              ':name': { S: pipeline.name },
              ':description': { S: pipeline.description },
              ':region': { S: pipeline.region },
              ':dataCollectionSDK': { S: pipeline.dataCollectionSDK },
              ':status': marshallPipeline.status,
              ':tags': marshallPipeline.tags,
              ':network': marshallPipeline.network,
              ':bucket': marshallPipeline.bucket,
              ':ingestionServer': marshallPipeline.ingestionServer,
              ':etl': marshallPipeline.etl,
              ':dataAnalytics': marshallPipeline.dataAnalytics,
              ':ConditionVersionValue': { S: pipeline.version },
              ':workflow': marshallPipeline.workflow ?? { M: {} },
              ':executionName': { S: curPipeline.executionName ?? '' },
              ':executionArn': { S: curPipeline.executionArn ?? '' },
              ':version': { S: Date.now().toString() },
              ':versionTag': { S: 'latest' },
              ':updateAt': { N: Date.now().toString() },
              ':operator': { S: '' },
            },
          },
        },
      ],
    });
    await docClient.send(params);
  };

  public async updatePipelineStatus(pipeline: Pipeline, status: PipelineStatus): Promise<void> {
    const params: UpdateCommand = new UpdateCommand({
      TableName: clickStreamTableName,
      Key: {
        id: pipeline.projectId,
        type: pipeline.type,
      },
      // Define expressions for the new or updated attributes
      UpdateExpression: 'SET #status =:status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': status,
      },
      ReturnValues: 'ALL_NEW',
    });
    await docClient.send(params);
  };

  public async deletePipeline(projectId: string, pipelineId: string): Promise<void> {
    // Scan all pipeline versions
    const records = await getPaginatedResults(async (ExclusiveStartKey: any) => {
      const scan_params: ScanCommand = new ScanCommand({
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
        ExclusiveStartKey,
      });
      const queryResponse = await docClient.send(scan_params);
      return {
        marker: queryResponse.LastEvaluatedKey,
        results: queryResponse.Items,
      };
    });
    const pipelines = records as Pipeline[];
    for (let index in pipelines) {
      const params: UpdateCommand = new UpdateCommand({
        TableName: clickStreamTableName,
        Key: {
          id: projectId,
          type: pipelines[index].type,
        },
        // Define expressions for the new or updated attributes
        UpdateExpression: 'SET deleted= :d, #status =:status',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':d': true,
          ':status': ExecutionStatus.RUNNING,
        },
        ReturnValues: 'ALL_NEW',
      });
      await docClient.send(params);
    }
  };

  public async listPipeline(
    projectId: string, version: string, order: string, pagination: boolean, pageSize: number, pageNumber: number): Promise<PipelineList> {
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
    const records = await getPaginatedResults(async (ExclusiveStartKey: any) => {
      const params: QueryCommand = new QueryCommand({
        TableName: clickStreamTableName,
        IndexName: prefixTimeGSIName,
        KeyConditionExpression: '#prefix= :prefix',
        FilterExpression: filterExpression,
        ExpressionAttributeNames: {
          '#prefix': 'prefix',
        },
        ExpressionAttributeValues: expressionAttributeValues,
        ScanIndexForward: order === 'asc',
        ExclusiveStartKey,
      });
      const queryResponse = await docClient.send(params);
      return {
        marker: queryResponse.LastEvaluatedKey,
        results: queryResponse.Items,
      };
    });

    let pipelines: PipelineList = {
      totalCount: 0,
      items: [],
    };
    pipelines.totalCount = records?.length;
    if (pagination) {
      if (pipelines.totalCount) {
        pageNumber = Math.min(Math.ceil(pipelines.totalCount / pageSize), pageNumber);
        const startIndex = pageSize * (pageNumber - 1);
        const endIndex = Math.min(pageSize * pageNumber, pipelines.totalCount);
        pipelines.items = records?.slice(startIndex, endIndex) as Pipeline[];
      }
    } else {
      pipelines.items = records as Pipeline[];
    }
    return pipelines;
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
    const pipeline: Pipeline = result.Item as Pipeline;
    return pipeline && !pipeline.deleted;
  };

  public async getDictionary(name: string): Promise<Dictionary | undefined> {
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
    return result.Item as Dictionary;
  };

  public async listDictionary(): Promise<Dictionary[]> {
    const records = await getPaginatedResults(async (ExclusiveStartKey: any) => {
      const params: ScanCommand = new ScanCommand({
        TableName: dictionaryTableName,
        ExclusiveStartKey,
      });
      const queryResponse = await docClient.send(params);

      return {
        marker: queryResponse.LastEvaluatedKey,
        results: queryResponse.Items,
      };
    });
    return records as Dictionary[];
  };

  public async isRequestIdExisted(id: string): Promise<boolean> {
    const params: GetCommand = new GetCommand({
      TableName: clickStreamTableName,
      Key: {
        id: id,
        type: 'REQUESTID',
      },
    });
    const result: GetCommandOutput = await docClient.send(params);
    if (!result.Item) {
      return false;
    }
    return true;
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

  public async addPlugin(plugin: Plugin): Promise<string> {
    const params: PutCommand = new PutCommand({
      TableName: clickStreamTableName,
      Item: {
        id: plugin.id,
        type: `PLUGIN#${plugin.id}`,
        prefix: 'PLUGIN',
        name: plugin.name,
        description: plugin.description,
        status: 'Disabled',
        jarFile: plugin.jarFile,
        dependencyFiles: plugin.dependencyFiles,
        mainFunction: plugin.mainFunction,
        pluginType: plugin.pluginType,
        builtIn: false,
        bindCount: 0,
        createAt: Date.now(),
        updateAt: Date.now(),
        operator: '',
        deleted: false,
      },
    });
    await docClient.send(params);
    return plugin.id;
  };

  public async getPlugin(pluginId: string): Promise<Plugin | undefined> {
    if (pluginId.startsWith('BUILDIN')) {
      const dic = await this.getDictionary('BuildInPlugins');
      if (dic) {
        let buildInPlugins = tryToJson(dic.data) as Plugin[];
        buildInPlugins = buildInPlugins.filter(p => p.id === pluginId);
        return !isEmpty(buildInPlugins) ? buildInPlugins[0] : undefined;
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
    const plugin: Plugin = result.Item as Plugin;
    return !plugin.deleted ? plugin : undefined;
  };

  public async updatePlugin(plugin: Plugin): Promise<void> {
    let updateExpression = 'SET #updateAt= :u';
    let expressionAttributeValues = new Map();
    let expressionAttributeNames = {} as KeyVal<string>;
    expressionAttributeValues.set(':u', Date.now());
    expressionAttributeValues.set(':bindCount', 0);
    expressionAttributeNames['#updateAt'] = 'updateAt';
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
      ExpressionAttributeNames: expressionAttributeNames as KeyVal<string>,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });
    await docClient.send(params);
  };

  public async listPlugin(
    pluginType: string, order: string, pagination: boolean, pageSize: number, pageNumber: number): Promise<PluginList> {
    let filterExpression = 'deleted = :d';
    let expressionAttributeValues = new Map();
    expressionAttributeValues.set(':d', false);
    expressionAttributeValues.set(':prefix', 'PLUGIN');
    if (!isEmpty(pluginType)) {
      filterExpression = `${filterExpression} AND pluginType=:pluginType`;
      expressionAttributeValues.set(':pluginType', pluginType);
    }

    let plugins: PluginList = {
      totalCount: 0,
      items: [],
    };
    const dic = await this.getDictionary('BuildInPlugins');
    if (dic) {
      let buildInPlugins = tryToJson(dic.data) as Plugin[];
      if (!isEmpty(pluginType)) {
        buildInPlugins = buildInPlugins.filter(p => p.pluginType === pluginType);
      }
      plugins.items = buildInPlugins;
      plugins.totalCount = buildInPlugins.length;
    }

    const records = await getPaginatedResults(async (ExclusiveStartKey: any) => {
      const params: QueryCommand = new QueryCommand({
        TableName: clickStreamTableName,
        IndexName: prefixTimeGSIName,
        KeyConditionExpression: '#prefix= :prefix',
        FilterExpression: filterExpression,
        ExpressionAttributeNames: {
          '#prefix': 'prefix',
        },
        ExpressionAttributeValues: expressionAttributeValues,
        ScanIndexForward: order === 'asc',
        ExclusiveStartKey,
      });
      const queryResponse = await docClient.send(params);
      return {
        marker: queryResponse.LastEvaluatedKey,
        results: queryResponse.Items,
      };
    });

    plugins.totalCount = plugins.totalCount + records?.length;
    if (pagination) {
      if (plugins.totalCount) {
        pageNumber = Math.min(Math.ceil(plugins.totalCount / pageSize), pageNumber);
        const startIndex = pageSize * (pageNumber - 1);
        const endIndex = Math.min(pageSize * pageNumber, plugins.totalCount);
        plugins.items = (plugins.items as Plugin[]).concat(records as Plugin[]).slice(startIndex, endIndex);
      }
    } else {
      plugins.items = (plugins.items as Plugin[]).concat(records as Plugin[]);
    }
    return plugins;
  };

  public async deletePlugin(pluginId: string): Promise<void> {
    const params: UpdateCommand = new UpdateCommand({
      TableName: clickStreamTableName,
      Key: {
        id: pluginId,
        type: `PLUGIN#${pluginId}`,
      },
      ConditionExpression: 'bindCount = :bindCount',
      // Define expressions for the new or updated attributes
      UpdateExpression: 'SET deleted= :d',
      ExpressionAttributeValues: {
        ':d': true,
        ':bindCount': 0,
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
    const plugin: Plugin = result.Item as Plugin;
    return plugin && !plugin.deleted;
  };
}