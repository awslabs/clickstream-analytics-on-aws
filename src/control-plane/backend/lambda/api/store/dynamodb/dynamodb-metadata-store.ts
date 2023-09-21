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

import {
  GetCommand,
  GetCommandOutput,
  PutCommand,
  UpdateCommand,
  QueryCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { analyticsMetadataTable, invertedGSIName, prefixTimeGSIName } from '../../common/constants';
import { docClient, query } from '../../common/dynamodb-client';
import { MetadataParameterType, MetadataSource, MetadataValueType } from '../../common/explore-types';
import { KeyVal } from '../../common/types';
import { IMetadataDisplay, IMetadataEvent, IMetadataEventParameter, IMetadataUserAttribute } from '../../model/metadata';
import { MetadataStore } from '../metadata-store';

export class DynamoDbMetadataStore implements MetadataStore {

  public async isEventExisted(projectId: string, appId: string, eventName: string): Promise<boolean> {
    const params: GetCommand = new GetCommand({
      TableName: analyticsMetadataTable,
      Key: {
        id: `${projectId}#${appId}#${eventName}`,
        type: `EVENT#${projectId}#${appId}#${eventName}`,
      },
    });
    const result: GetCommandOutput = await docClient.send(params);
    if (!result.Item) {
      return false;
    }
    const event: IMetadataEvent = result.Item as IMetadataEvent;
    return event && !event.deleted;
  };

  public async createEvent(event: IMetadataEvent): Promise<string> {
    const params: PutCommand = new PutCommand({
      TableName: analyticsMetadataTable,
      Item: {
        id: `${event.projectId}#${event.appId}#${event.name}`,
        type: `EVENT#${event.projectId}#${event.appId}#${event.name}`,
        prefix: `EVENT#${event.projectId}#${event.appId}`,
        projectId: event.projectId,
        appId: event.appId,
        name: event.name,
        displayName: event.displayName ?? '',
        description: event.description ?? '',
        metadataSource: event.metadataSource ?? MetadataSource.PRESET,
        hasData: event.hasData ?? false,
        platform: event.platform ?? [],
        dataVolumeLastDay: event.dataVolumeLastDay ?? 0,
        createAt: Date.now(),
        updateAt: Date.now(),
        operator: event.operator?? '',
        deleted: false,
      },
    });
    await docClient.send(params);
    return event.name;
  };

  public async getEvent(projectId: string, appId: string, eventName: string): Promise<any> {
    const input: QueryCommandInput = {
      TableName: analyticsMetadataTable,
      IndexName: invertedGSIName,
      KeyConditionExpression: '#type = :type AND begins_with(#id, :id_start)',
      FilterExpression: 'deleted = :d',
      ExpressionAttributeNames: {
        '#id': 'id',
        '#type': 'type',
      },
      ExpressionAttributeValues: {
        ':d': false,
        ':type': `EVENT#${projectId}#${appId}#${eventName}`,
        ':id_start': `${projectId}#${appId}#${eventName}`,
      },
    };
    const records = await query(input);
    return records;
  };

  public async deleteEvent(projectId: string, appId: string, eventName: string, operator: string): Promise<void> {
    const input: QueryCommandInput = {
      TableName: analyticsMetadataTable,
      IndexName: invertedGSIName,
      FilterExpression: '#type = :type AND deleted = :d',
      ExpressionAttributeNames: {
        '#type': 'type',
      },
      ExpressionAttributeValues: {
        ':type': `EVENT#${projectId}#${appId}#${eventName}`,
        ':d': false,
      },
    };
    const events = await query(input);
    for (let index in events) {
      const params: UpdateCommand = new UpdateCommand({
        TableName: analyticsMetadataTable,
        Key: {
          id: `${projectId}#${appId}#${eventName}`,
          type: events[index].type,
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
    }
  };

  public async listEvents(projectId: string, appId: string, order: string): Promise<IMetadataEvent[]> {
    const input: QueryCommandInput = {
      TableName: analyticsMetadataTable,
      IndexName: prefixTimeGSIName,
      KeyConditionExpression: '#prefix= :prefix',
      FilterExpression: 'deleted = :d',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
      },
      ExpressionAttributeValues: {
        ':d': false,
        ':prefix': `EVENT#${projectId}#${appId}`,
      },
      ScanIndexForward: order === 'asc',
    };
    const records = await query(input);
    return records as IMetadataEvent[];
  };

  public async isEventParameterExisted(projectId: string, appId: string, eventParameterName: string): Promise<boolean> {
    const input: QueryCommandInput = {
      TableName: analyticsMetadataTable,
      IndexName: prefixTimeGSIName,
      KeyConditionExpression: '#prefix = :prefix',
      FilterExpression: 'deleted = :d AND #name = :name',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
        '#name': 'name',
      },
      ExpressionAttributeValues: {
        ':d': false,
        ':prefix': `EVENT_PARAMETER#${projectId}#${appId}`,
        ':name': eventParameterName,
      },
    };
    const records = await query(input);
    return records && records.length > 0 && !records[0].deleted;
  };

  public async createEventParameter(eventParameter: IMetadataEventParameter): Promise<string> {
    const parameterId = `${eventParameter.eventName}#${eventParameter.name}`;
    const params: PutCommand = new PutCommand({
      TableName: analyticsMetadataTable,
      Item: {
        id: `${eventParameter.projectId}#${eventParameter.appId}#${parameterId}`,
        type: `EVENT#${eventParameter.projectId}#${eventParameter.appId}#${eventParameter.eventName}`,
        prefix: `EVENT_PARAMETER#${eventParameter.projectId}#${eventParameter.appId}`,
        projectId: eventParameter.projectId,
        appId: eventParameter.appId,
        eventName: eventParameter.eventName,
        parameterId: parameterId,
        name: eventParameter.name,
        displayName: eventParameter.displayName ?? '',
        description: eventParameter.description ?? '',
        metadataSource: eventParameter.metadataSource ?? MetadataSource.PRESET,
        hasData: eventParameter.hasData ?? false,
        platform: eventParameter.platform ?? [],
        parameterType: eventParameter.parameterType ?? MetadataParameterType.PUBLIC,
        valueType: eventParameter.valueType ?? MetadataValueType.STRING,
        valueEnum: eventParameter.valueEnum ?? [],
        values: eventParameter.values ?? [],
        createAt: Date.now(),
        updateAt: Date.now(),
        operator: eventParameter.operator?? '',
        deleted: false,
      },
    });
    await docClient.send(params);
    return parameterId;
  };

  public async getEventParameter(projectId: string, appId: string, parameterName: string): Promise<IMetadataEventParameter[]> {
    const input: QueryCommandInput = {
      TableName: analyticsMetadataTable,
      IndexName: prefixTimeGSIName,
      KeyConditionExpression: '#prefix = :prefix',
      FilterExpression: 'deleted = :d AND #name = :name',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
        '#name': 'name',
      },
      ExpressionAttributeValues: {
        ':d': false,
        ':prefix': `EVENT_PARAMETER#${projectId}#${appId}`,
        ':name': parameterName,
      },
    };
    const records = await query(input);
    return records as IMetadataEventParameter[];
  };

  public async deleteEventParameter(projectId: string, appId: string, eventParameterName: string, operator: string): Promise<void> {
    const input: QueryCommandInput = {
      TableName: analyticsMetadataTable,
      IndexName: prefixTimeGSIName,
      KeyConditionExpression: '#prefix = :prefix',
      FilterExpression: 'deleted = :d AND #name = :name',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
        '#name': 'name',
      },
      ExpressionAttributeValues: {
        ':d': false,
        ':prefix': `EVENT_PARAMETER#${projectId}#${appId}`,
        ':name': eventParameterName,
      },
    };
    const records = await query(input);
    for (let record of records) {
      const params: UpdateCommand = new UpdateCommand({
        TableName: analyticsMetadataTable,
        Key: {
          id: record.id,
          type: record.type,
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
    }
  };

  public async listEventParameters(projectId: string, appId: string, order: string, source?: string): Promise<IMetadataEventParameter[]> {
    let filterExpression = 'deleted = :d';
    let expressionAttributeValues = new Map();
    let expressionAttributeNames = {} as KeyVal<string>;
    expressionAttributeValues.set(':d', false);
    expressionAttributeValues.set(':prefix', `EVENT_PARAMETER#${projectId}#${appId}`);
    expressionAttributeNames['#prefix'] = 'prefix';
    if (source) {
      filterExpression = `${filterExpression} AND #metadataSource= :metadataSource`;
      expressionAttributeValues.set(':metadataSource', source);
      expressionAttributeNames['#metadataSource'] = 'metadataSource';
    }
    const input: QueryCommandInput = {
      TableName: analyticsMetadataTable,
      IndexName: prefixTimeGSIName,
      KeyConditionExpression: '#prefix= :prefix',
      FilterExpression: filterExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ScanIndexForward: order === 'asc',
    };
    const records = await query(input);
    return records as IMetadataEventParameter[];
  };

  public async isUserAttributeExisted(projectId: string, appId: string, userAttributeName: string): Promise<boolean> {
    const input: QueryCommandInput = {
      TableName: analyticsMetadataTable,
      IndexName: prefixTimeGSIName,
      KeyConditionExpression: '#prefix = :prefix',
      FilterExpression: 'deleted = :d AND #name = :name',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
        '#name': 'name',
      },
      ExpressionAttributeValues: {
        ':d': false,
        ':prefix': `USER_ATTRIBUTE#${projectId}#${appId}`,
        ':name': userAttributeName,
      },
    };
    const records = await query(input);
    return records && records.length > 0 && !records[0].deleted;
  };

  public async createUserAttribute(userAttribute: IMetadataUserAttribute): Promise<string> {
    const userAttributeId =`${userAttribute.projectId}#${userAttribute.appId}#${userAttribute.eventName}#${userAttribute.name}`;
    const params: PutCommand = new PutCommand({
      TableName: analyticsMetadataTable,
      Item: {
        id: userAttributeId,
        type: `EVENT#${userAttribute.projectId}#${userAttribute.appId}#${userAttribute.eventName}`,
        prefix: `USER_ATTRIBUTE#${userAttribute.projectId}#${userAttribute.appId}`,
        projectId: userAttribute.projectId,
        appId: userAttribute.appId,
        eventName: userAttribute.eventName,
        attributeId: userAttributeId,
        name: userAttribute.name,
        displayName: userAttribute.displayName?? '',
        description: userAttribute.description?? '',
        metadataSource: userAttribute.metadataSource ?? MetadataSource.PRESET,
        hasData: userAttribute.hasData ?? false,
        valueType: userAttribute.valueType ?? MetadataValueType.STRING,
        valueEnum: userAttribute.valueEnum ?? [],
        values: userAttribute.values ?? [],
        createAt: Date.now(),
        updateAt: Date.now(),
        operator: userAttribute.operator?? '',
        deleted: false,
      },
    });
    await docClient.send(params);
    return userAttributeId;
  };

  public async getUserAttribute(projectId: string, appId: string, userAttributeName: string): Promise<IMetadataUserAttribute[]> {
    const input: QueryCommandInput = {
      TableName: analyticsMetadataTable,
      IndexName: prefixTimeGSIName,
      KeyConditionExpression: '#prefix = :prefix',
      FilterExpression: 'deleted = :d AND #name = :name',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
        '#name': 'name',
      },
      ExpressionAttributeValues: {
        ':d': false,
        ':prefix': `USER_ATTRIBUTE#${projectId}#${appId}`,
        ':name': userAttributeName,
      },
    };
    const records = await query(input);
    return records as IMetadataUserAttribute[];
  };

  public async deleteUserAttribute(projectId: string, appId: string, userAttributeName: string, operator: string): Promise<void> {
    const input: QueryCommandInput = {
      TableName: analyticsMetadataTable,
      IndexName: prefixTimeGSIName,
      KeyConditionExpression: '#prefix = :prefix',
      FilterExpression: 'deleted = :d AND #name = :name',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
        '#name': 'name',
      },
      ExpressionAttributeValues: {
        ':d': false,
        ':prefix': `USER_ATTRIBUTE#${projectId}#${appId}`,
        ':name': userAttributeName,
      },
    };
    const records = await query(input);
    for (let record of records) {
      const params: UpdateCommand = new UpdateCommand({
        TableName: analyticsMetadataTable,
        Key: {
          id: record.id,
          type: record.type,
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
    }
  };

  public async listUserAttributes(projectId: string, appId: string, order: string): Promise<IMetadataUserAttribute[]> {
    const input: QueryCommandInput = {
      TableName: analyticsMetadataTable,
      IndexName: prefixTimeGSIName,
      KeyConditionExpression: '#prefix= :prefix',
      FilterExpression: 'deleted = :d',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
      },
      ExpressionAttributeValues: {
        ':d': false,
        ':prefix': `USER_ATTRIBUTE#${projectId}#${appId}`,
      },
      ScanIndexForward: order === 'asc',
    };
    const records = await query(input);
    return records as IMetadataUserAttribute[];
  };

  public async getDisplay(projectId: string, appId: string): Promise<IMetadataDisplay[]> {
    const input: QueryCommandInput = {
      TableName: analyticsMetadataTable,
      IndexName: prefixTimeGSIName,
      KeyConditionExpression: '#prefix= :prefix',
      FilterExpression: 'projectId = :projectId AND appId = :appId',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
      },
      ExpressionAttributeValues: {
        ':projectId': projectId,
        ':appId': appId,
        ':prefix': 'DISPLAY',
      },
    };
    const records = await query(input);
    return records as IMetadataDisplay[];
  };

  public async updateDisplay(id: string, projectId: string, appId: string, description: string, displayName: string): Promise<void> {
    let updateExpression = 'SET #updateAt= :u, projectId= :projectId, appId= :appId, #prefix= :prefix';
    let expressionAttributeValues = new Map();
    let expressionAttributeNames = {} as KeyVal<string>;
    expressionAttributeValues.set(':u', Date.now());
    expressionAttributeValues.set(':projectId', projectId);
    expressionAttributeValues.set(':appId', appId);
    expressionAttributeValues.set(':prefix', 'DISPLAY');
    expressionAttributeNames['#updateAt'] = 'updateAt';
    expressionAttributeNames['#prefix'] = 'prefix';
    if (displayName) {
      updateExpression = `${updateExpression}, #displayName= :n`;
      expressionAttributeValues.set(':n', displayName);
      expressionAttributeNames['#displayName'] = 'displayName';
    }
    if (description) {
      updateExpression = `${updateExpression}, description= :d`;
      expressionAttributeValues.set(':d', description);
    }
    const params: UpdateCommand = new UpdateCommand({
      TableName: analyticsMetadataTable,
      Key: {
        id: id,
        createAt: 0,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });
    await docClient.send(params);
  };
}