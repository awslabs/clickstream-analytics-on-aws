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
  ScanCommandInput,
  QueryCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { analyticsMetadataTable, invertedGSIName, prefixTimeGSIName } from '../../common/constants';
import { docClient, query, scan } from '../../common/dynamodb-client';
import { MetadataParameterType, MetadataSource, MetadataValueType } from '../../common/explore-types';
import { KeyVal } from '../../common/types';
import { IMetadataEvent, IMetadataEventParameter, IMetadataUserAttribute } from '../../model/metadata';
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

  public async updateEvent(event: IMetadataEvent): Promise<void> {
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
        ':type': `EVENT#${event.projectId}#${event.appId}#${event.name}`,
        ':id_start': `${event.projectId}#${event.appId}#${event.name}`,
      },
    };
    const records = await query(input);
    console.log(records);
    for (let record of records) {
      if (record.prefix.startsWith('EVENT#')) {
        const { updateExpression, expressionAttributeValues, expressionAttributeNames }
      = this.getUpdateExpression('METADATA', event.displayName, event.description, event.operator);
        const params: UpdateCommand = new UpdateCommand({
          TableName: analyticsMetadataTable,
          Key: {
            id: record.id,
            type: record.type,
          },
          // Define expressions for the new or updated attributes
          UpdateExpression: updateExpression,
          ExpressionAttributeNames: expressionAttributeNames as KeyVal<string>,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW',
        });
        await docClient.send(params);
      } else if (record.prefix.startsWith('EVENT_PARAMETER#')) {
        const { updateExpression, expressionAttributeValues, expressionAttributeNames }
      = this.getUpdateExpression('EVENT', event.displayName, event.description, event.operator);
        const params: UpdateCommand = new UpdateCommand({
          TableName: analyticsMetadataTable,
          Key: {
            id: record.id,
            type: record.type,
          },
          // Define expressions for the new or updated attributes
          UpdateExpression: updateExpression,
          ExpressionAttributeNames: expressionAttributeNames as KeyVal<string>,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW',
        });
        await docClient.send(params);
      }
    }
  };

  private getUpdateExpression(type: string, displayName: string | undefined, description: string | undefined, operator: string | undefined) {
    let displayNameColumn = 'displayName';
    let descriptionColumn = 'description';
    if (type === 'EVENT') {
      displayNameColumn = 'eventDisplayName';
      descriptionColumn = 'eventDescription';
    } else if (type === 'PARAMETER') {
      displayNameColumn = 'parameterDisplayName';
      descriptionColumn = 'parameterDescription';
    }
    let updateExpression = 'SET #updateAt= :u, #operator= :operator';
    let expressionAttributeValues = new Map();
    let expressionAttributeNames = {} as KeyVal<string>;
    expressionAttributeValues.set(':u', Date.now());
    expressionAttributeValues.set(':operator', operator ?? '');
    expressionAttributeNames['#updateAt'] = 'updateAt';
    expressionAttributeNames['#operator'] = 'operator';
    if (displayName) {
      updateExpression = `${updateExpression}, #displayName= :disp`;
      expressionAttributeValues.set(':disp', displayName);
      expressionAttributeNames['#displayName'] = displayNameColumn;
    }
    if (description) {
      updateExpression = `${updateExpression}, #description= :desc`;
      expressionAttributeValues.set(':desc', description);
      expressionAttributeNames['#description'] = descriptionColumn;
    }
    return {
      updateExpression, expressionAttributeValues, expressionAttributeNames,
    };
  }

  public async deleteEvent(projectId: string, appId: string, eventName: string, operator: string): Promise<void> {
    const input: ScanCommandInput = {
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
    const events = await scan(input);
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
    return records && records.length > 0;
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
        eventDisplayName: eventParameter.eventDisplayName ?? '',
        eventDescription: eventParameter.eventDescription ?? '',
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
        createAt: Date.now(),
        updateAt: Date.now(),
        operator: eventParameter.operator?? '',
        deleted: false,
      },
    });
    await docClient.send(params);
    return parameterId;
  };

  public async getEventParameter(projectId: string, appId: string, parameterName: string): Promise<any> {
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
    return records;
  };

  public async updateEventParameter(eventParameter: IMetadataEventParameter): Promise<void> {
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
        ':prefix': `EVENT_PARAMETER#${eventParameter.projectId}#${eventParameter.appId}`,
        ':name': eventParameter.name,
      },
    };
    const records = await query(input);
    for (let record of records) {
      const { updateExpression, expressionAttributeValues, expressionAttributeNames }
        = this.getUpdateExpression('METADATA', eventParameter.displayName, eventParameter.description, eventParameter.operator);
      const params: UpdateCommand = new UpdateCommand({
        TableName: analyticsMetadataTable,
        Key: {
          id: record.id,
          type: record.type,
        },
        // Define expressions for the new or updated attributes
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames as KeyVal<string>,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      });
      await docClient.send(params);
    }
  };

  public async deleteEventParameter(projectId: string, appId: string, eventParameterName: string, operator: string): Promise<void> {
    // TODO: if attribute binded with any event, should not delete
    const input: ScanCommandInput = {
      TableName: analyticsMetadataTable,
      FilterExpression: 'id = :p AND deleted = :d',
      ExpressionAttributeValues: {
        ':p': `EVENT_PARAMETER#${projectId}#${appId}#${eventParameterName}`,
        ':d': false,
      },
    };
    const records = await scan(input);
    const eventParameters = records as IMetadataEventParameter[];
    for (let index in eventParameters) {
      const params: UpdateCommand = new UpdateCommand({
        TableName: analyticsMetadataTable,
        Key: {
          id: `EVENT_PARAMETER#${projectId}#${appId}#${eventParameterName}`,
          type: eventParameters[index].type,
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
    const params: GetCommand = new GetCommand({
      TableName: analyticsMetadataTable,
      Key: {
        id: `${projectId}#${appId}#${userAttributeName}`,
        type: `USER_ATTRIBUTE#${projectId}#${appId}#${userAttributeName}`,
      },
    });
    const result: GetCommandOutput = await docClient.send(params);
    if (!result.Item) {
      return false;
    }
    const userAttribute: IMetadataUserAttribute = result.Item as IMetadataUserAttribute;
    return userAttribute && !userAttribute.deleted;
  };

  public async createUserAttribute(userAttribute: IMetadataUserAttribute): Promise<string> {
    const userAttributeId =`${userAttribute.projectId}#${userAttribute.appId}#${userAttribute.name}`;
    const params: PutCommand = new PutCommand({
      TableName: analyticsMetadataTable,
      Item: {
        id: userAttributeId,
        type: `USER_ATTRIBUTE#${userAttribute.projectId}#${userAttribute.appId}#${userAttribute.name}`,
        prefix: `USER_ATTRIBUTE#${userAttribute.projectId}#${userAttribute.appId}`,
        projectId: userAttribute.projectId,
        appId: userAttribute.appId,
        attributeId: userAttributeId,
        name: userAttribute.name,
        displayName: userAttribute.displayName?? '',
        description: userAttribute.description?? '',
        metadataSource: userAttribute.metadataSource ?? MetadataSource.PRESET,
        hasData: userAttribute.hasData ?? false,
        valueType: userAttribute.valueType ?? MetadataValueType.STRING,
        valueEnum: userAttribute.valueEnum ?? [],
        createAt: Date.now(),
        updateAt: Date.now(),
        operator: userAttribute.operator?? '',
        deleted: false,
      },
    });
    await docClient.send(params);
    return userAttributeId;
  };

  public async getUserAttribute(projectId: string, appId: string, userAttributeName: string): Promise<IMetadataUserAttribute | undefined> {
    const params: GetCommand = new GetCommand({
      TableName: analyticsMetadataTable,
      Key: {
        id: `${projectId}#${appId}#${userAttributeName}`,
        type: `USER_ATTRIBUTE#${projectId}#${appId}#${userAttributeName}`,
      },
    });
    const result: GetCommandOutput = await docClient.send(params);
    if (!result.Item) {
      return undefined;
    }
    const userAttribute: IMetadataUserAttribute = result.Item as IMetadataUserAttribute;
    return !userAttribute.deleted ? userAttribute : undefined;
  };

  public async updateUserAttribute(userAttribute: IMetadataUserAttribute): Promise<void> {
    let updateExpression = 'SET #updateAt= :u, #operator= :operator';
    let expressionAttributeValues = new Map();
    let expressionAttributeNames = {} as KeyVal<string>;
    expressionAttributeValues.set(':u', Date.now());
    expressionAttributeValues.set(':operator', userAttribute.operator);
    expressionAttributeNames['#updateAt'] = 'updateAt';
    expressionAttributeNames['#operator'] = 'operator';
    if (userAttribute.displayName) {
      updateExpression = `${updateExpression}, #displayName= :n`;
      expressionAttributeValues.set(':n', userAttribute.displayName);
      expressionAttributeNames['#displayName'] = 'displayName';
    }
    if (userAttribute.description) {
      updateExpression = `${updateExpression}, description= :d`;
      expressionAttributeValues.set(':d', userAttribute.description);
    }
    const params: UpdateCommand = new UpdateCommand({
      TableName: analyticsMetadataTable,
      Key: {
        id: `${userAttribute.projectId}#${userAttribute.appId}#${userAttribute.name}`,
        type: `USER_ATTRIBUTE#${userAttribute.projectId}#${userAttribute.appId}#${userAttribute.name}`,
      },
      // Define expressions for the new or updated attributes
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });
    await docClient.send(params);
  };

  public async deleteUserAttribute(projectId: string, appId: string, userAttributeName: string, operator: string): Promise<void> {
    const input: ScanCommandInput = {
      TableName: analyticsMetadataTable,
      FilterExpression: 'id = :p AND deleted = :d',
      ExpressionAttributeValues: {
        ':p': `${projectId}#${appId}#${userAttributeName}`,
        ':d': false,
      },
    };
    const records = await scan(input);
    const userAttributes = records as IMetadataUserAttribute[];
    for (let attribute of userAttributes) {
      const params: UpdateCommand = new UpdateCommand({
        TableName: analyticsMetadataTable,
        Key: {
          id: attribute.id,
          type: attribute.type,
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
}