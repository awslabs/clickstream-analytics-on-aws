/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
import {
  GetCommand,
  GetCommandOutput,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { clickStreamTableName, dictionaryTableName } from '../../common/constants';
import { docClient } from '../../common/dynamodb-client';
import { Application, ApplicationList } from '../../model/application';
import { Dictionary } from '../../model/dictionary';
import { Pipeline, pipelineDeserializer, PipelineList, pipelineSerializer } from '../../model/pipeline';
import { Project, ProjectList } from '../../model/project';
import { ClickStreamStore } from '../click-stream-store';
import { getPaginatedResults } from './paginator';

interface KeyVal<T> {
  [key: string]: T;
}

export class DynamoDbStore implements ClickStreamStore {

  public async createProject(project: Project): Promise<string> {
    const id = uuidv4();
    const params: PutCommand = new PutCommand({
      TableName: clickStreamTableName,
      Item: {
        projectId: id,
        type: `METADATA#${id}`,
        name: project.name,
        tableName: project.tableName,
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
    return id;
  };

  public async getProject(id: string): Promise<Project | undefined> {
    const params: GetCommand = new GetCommand({
      TableName: clickStreamTableName,
      Key: {
        projectId: id,
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
        projectId: projectId,
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
    if (project.tableName) {
      updateExpression = `${updateExpression}, tableName= :tn`;
      expressionAttributeValues.set(':tn', project.tableName);
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
        projectId: project.projectId,
        type: `METADATA#${project.projectId}`,
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
        FilterExpression: 'projectId = :p AND deleted = :d',
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
          projectId: id,
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

  public async listProjects(pagination: boolean, pageSize: number, pageNumber: number): Promise<ProjectList> {
    const records = await getPaginatedResults(async (ExclusiveStartKey: any) => {
      const params: ScanCommand = new ScanCommand({
        TableName: clickStreamTableName,
        FilterExpression: 'begins_with(#type, :t) AND deleted = :d',
        ExpressionAttributeNames: {
          '#type': 'type',
        },
        ExpressionAttributeValues: {
          ':t': 'METADATA#',
          ':d': false,
        },
        ExclusiveStartKey,
      });
      const queryResponse = await docClient.send(params);
      return {
        marker: queryResponse.LastEvaluatedKey,
        results: queryResponse.Items,
      };
    });
    let projects: ProjectList = { totalCount: 0, items: [] };
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
    const id = uuidv4();
    const params: PutCommand = new PutCommand({
      TableName: clickStreamTableName,
      Item: {
        projectId: app.projectId,
        type: `APP#${id}`,
        appId: id,
        name: app.name,
        description: app.description,
        platform: app.platform,
        sdk: app.sdk,
        createAt: Date.now(),
        updateAt: Date.now(),
        operator: '',
        deleted: false,
      },
    });
    await docClient.send(params);
    return id;
  };


  public async getApplication(projectId: string, appId: string): Promise<Application | undefined> {
    const params: GetCommand = new GetCommand({
      TableName: clickStreamTableName,
      Key: {
        projectId: projectId,
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
    const params: UpdateCommand = new UpdateCommand({
      TableName: clickStreamTableName,
      Key: {
        projectId: app.projectId,
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
    projectId: string, pagination: boolean, pageSize: number, pageNumber: number): Promise<ApplicationList> {
    const records = await getPaginatedResults(async (ExclusiveStartKey: any) => {
      const params: ScanCommand = new ScanCommand({
        TableName: clickStreamTableName,
        FilterExpression: 'projectId = :p AND begins_with(#type, :t) AND deleted = :d',
        ExpressionAttributeNames: {
          '#type': 'type',
        },
        ExpressionAttributeValues: {
          ':p': projectId,
          ':t': 'APP#',
          ':d': false,
        },
        ExclusiveStartKey,
      });
      const queryResponse = await docClient.send(params);
      return {
        marker: queryResponse.LastEvaluatedKey,
        results: queryResponse.Items,
      };
    });

    let apps: ApplicationList = { totalCount: 0, items: [] };
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
        projectId: projectId,
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
        projectId: projectId,
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
    pipeline = pipelineSerializer(pipeline);
    const params: PutCommand = new PutCommand({
      TableName: clickStreamTableName,
      Item: {
        projectId: pipeline.projectId,
        type: `PIPELINE#${pipeline.pipelineId}#latest`,
        pipelineId: pipeline.pipelineId,
        name: pipeline.name,
        description: pipeline.description,
        base: pipeline.base,
        ingestion: pipeline.ingestion,
        etl: pipeline.etl,
        dataModel: pipeline.dataModel,
        runtime: pipeline.runtime,
        version: pipeline.version ? pipeline.version : Date.now().toString(),
        createAt: pipeline.createAt ? pipeline.createAt : Date.now(),
        updateAt: Date.now(),
        operator: pipeline.operator ? pipeline.operator : '',
        deleted: pipeline.deleted ? pipeline.deleted : false,
      },
    });
    await docClient.send(params);
    return pipeline.pipelineId;
  };

  public async getPipeline(projectId: string, pipelineId: string, version?: string | undefined): Promise<Pipeline | undefined> {
    let skVersion: string = version ? version : 'latest';
    const params: GetCommand = new GetCommand({
      TableName: clickStreamTableName,
      Key: {
        projectId: projectId,
        type: `PIPELINE#${pipelineId}#${skVersion}`,
      },
    });
    const result: GetCommandOutput = await docClient.send(params);
    if (!result.Item) {
      return undefined;
    }
    const pipeline: Pipeline = result.Item as Pipeline;
    return !pipeline.deleted ? pipelineDeserializer(pipeline) : undefined;
  };


  public async updatePipeline(pipeline: Pipeline, curPipeline: Pipeline): Promise<void> {
    pipeline = pipelineSerializer(pipeline);
    curPipeline = pipelineSerializer(curPipeline);
    // Update new pipeline && Backup the current pipeline
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
              projectId: { S: curPipeline.projectId },
              type: { S: `PIPELINE#${curPipeline.pipelineId}#${curPipeline.version}` },
              pipelineId: { S: curPipeline.pipelineId },
              name: { S: curPipeline.name },
              description: { S: curPipeline.description },
              base: { S: curPipeline.base },
              ingestion: { S: curPipeline.ingestion },
              etl: { S: curPipeline.etl },
              dataModel: { S: curPipeline.dataModel },
              runtime: { S: curPipeline.runtime },
              version: { S: curPipeline.version },
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
              projectId: { S: pipeline.projectId },
              type: { S: `PIPELINE#${pipeline.pipelineId}#latest` },
            },
            ConditionExpression: '#ConditionVersion = :ConditionVersionValue',
            // Define expressions for the new or updated attributes
            UpdateExpression: 'SET ' +
              '#pipelineName = :name, ' +
              'description = :description, ' +
              '#pipelineBase = :base, ' +
              'ingestion = :ingestion, ' +
              'etl = :etl, ' +
              'dataModel = :dataModel, ' +
              'runtime = :runtime, ' +
              'version = :version, ' +
              'updateAt = :updateAt, ' +
              '#pipelineOperator = :operator ',
            ExpressionAttributeNames: {
              '#pipelineName': 'name',
              '#pipelineBase': 'base',
              '#pipelineOperator': 'operator',
              '#ConditionVersion': 'version',
            },
            ExpressionAttributeValues: {
              ':name': { S: pipeline.name },
              ':description': { S: pipeline.description },
              ':base': { S: pipeline.base },
              ':ingestion': { S: pipeline.ingestion },
              ':etl': { S: pipeline.etl },
              ':dataModel': { S: pipeline.dataModel },
              ':runtime': { S: pipeline.runtime },
              ':ConditionVersionValue': { S: pipeline.version },
              ':version': { S: Date.now().toString() },
              ':updateAt': { N: Date.now().toString() },
              ':operator': { S: '' },
            },
          },
        },
      ],
    });
    await docClient.send(params);
  };


  public async deletePipeline(projectId: string, pipelineId: string): Promise<void> {
    // Scan all pipeline versions
    const records = await getPaginatedResults(async (ExclusiveStartKey: any) => {
      const scan_params: ScanCommand = new ScanCommand({
        TableName: clickStreamTableName,
        FilterExpression: 'projectId = :p AND begins_with(#type, :t) AND deleted = :d',
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
          projectId: projectId,
          type: pipelines[index].type,
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

  public async listPipeline(
    projectId: string, pagination: boolean, pageSize: number, pageNumber: number): Promise<PipelineList> {
    const records = await getPaginatedResults(async (ExclusiveStartKey: any) => {
      const params: ScanCommand = new ScanCommand({
        TableName: clickStreamTableName,
        FilterExpression: 'projectId = :p AND begins_with(#type, :t) AND deleted = :d',
        ExpressionAttributeNames: {
          '#type': 'type',
        },
        ExpressionAttributeValues: {
          ':p': projectId,
          ':t': 'PIPELINE#',
          ':d': false,
        },
        ExclusiveStartKey,
      });
      const queryResponse = await docClient.send(params);

      return {
        marker: queryResponse.LastEvaluatedKey,
        results: queryResponse.Items,
      };
    });

    let pipelines: PipelineList = { totalCount: 0, items: [] };
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
        projectId: projectId,
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
    try {
      const params: PutCommand = new PutCommand({
        TableName: clickStreamTableName,
        Item: {
          projectId: id,
          type: 'REQUESTID',
          ttl: Date.now() / 1000 + 600,
        },
        ConditionExpression: 'attribute_not_exists(projectId)',
      });
      await docClient.send(params);
      return false;
    } catch (error) {
      if ((error as Error).name === 'ConditionalCheckFailedException') {
        return true;
      }
      throw error;
    }
  };
}