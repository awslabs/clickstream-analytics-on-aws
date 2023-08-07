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
import { analyticsMetadataTable, prefixTimeGSIName } from '../../common/constants';
import { docClient, query, scan } from '../../common/dynamodb-client';
import { KeyVal, MetadataParameterType, MetadataPlatform, MetadataSource, MetadataValueType } from '../../common/types';
import { IMetadataEvent, IMetadataEventParameter, IMetadataUserAttribute } from '../../model/metadata';
import { MetadataStore } from '../metadata-store';

export class DynamoDbMetadataStore implements MetadataStore {

  public async isEventExisted(projectId: string, appId: string, eventName: string): Promise<boolean> {
    const params: GetCommand = new GetCommand({
      TableName: analyticsMetadataTable,
      Key: {
        id: `EVENT#${projectId}#${appId}#${eventName}`,
        type: `#METADATA#${projectId}#${appId}#${eventName}`,
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
        id: `EVENT#${event.projectId}#${event.appId}#${event.name}`,
        type: `#METADATA#${event.projectId}#${event.appId}#${event.name}`,
        prefix: `EVENT#${event.projectId}#${event.appId}`,
        projectId: event.projectId,
        appId: event.appId,
        name: event.name,
        displayName: event.displayName ?? '',
        description: event.description ?? '',
        metadataSource: event.metadataSource ?? MetadataSource.PRESET,
        hasData: event.hasData ?? false,
        platform: event.platform ?? MetadataPlatform.ANDROID,
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
      KeyConditionExpression: 'id = :id AND #type BETWEEN :metadata AND :attribute',
      FilterExpression: 'deleted = :d',
      ExpressionAttributeNames: {
        '#type': 'type',
      },
      ExpressionAttributeValues: {
        ':d': false,
        ':id': `EVENT#${projectId}#${appId}#${eventName}`,
        ':metadata': `#METADATA#${projectId}#${appId}#${eventName}`,
        ':attribute': 'EVENT_PARAMETER$',
      },
    };
    const records = await query(input);
    return records;
  };

  public async updateEvent(event: IMetadataEvent): Promise<void> {
    let updateExpression = 'SET #updateAt= :u, #operator= :operator';
    let expressionAttributeValues = new Map();
    let expressionAttributeNames = {} as KeyVal<string>;
    expressionAttributeValues.set(':u', Date.now());
    expressionAttributeValues.set(':operator', event.operator);
    expressionAttributeNames['#updateAt'] = 'updateAt';
    expressionAttributeNames['#operator'] = 'operator';
    if (event.displayName) {
      updateExpression = `${updateExpression}, #displayName= :n`;
      expressionAttributeValues.set(':n', event.displayName);
      expressionAttributeNames['#displayName'] = 'displayName';
    }
    if (event.description) {
      updateExpression = `${updateExpression}, description= :d`;
      expressionAttributeValues.set(':d', event.description);
    }
    const params: UpdateCommand = new UpdateCommand({
      TableName: analyticsMetadataTable,
      Key: {
        id: `EVENT#${event.projectId}#${event.appId}#${event.name}`,
        type: `#METADATA#${event.projectId}#${event.appId}#${event.name}`,
      },
      // Define expressions for the new or updated attributes
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });
    await docClient.send(params);
  };

  public async deleteEvent(projectId: string, appId: string, eventName: string, operator: string): Promise<void> {
    const input: ScanCommandInput = {
      TableName: analyticsMetadataTable,
      FilterExpression: 'id = :p AND deleted = :d',
      ExpressionAttributeValues: {
        ':p': `EVENT#${projectId}#${appId}#${eventName}`,
        ':d': false,
      },
    };
    const records = await scan(input);
    const events = records as IMetadataEvent[];
    for (let index in events) {
      const params: UpdateCommand = new UpdateCommand({
        TableName: analyticsMetadataTable,
        Key: {
          id: `EVENT#${projectId}#${appId}#${eventName}`,
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

  public async isEventParameterExisted(projectId: string, appId: string, eventParameterId: string): Promise<boolean> {
    const params: GetCommand = new GetCommand({
      TableName: analyticsMetadataTable,
      Key: {
        id: `EVENT_PARAMETER#${projectId}#${appId}#${eventParameterId}`,
        type: `#METADATA#${projectId}#${appId}#${eventParameterId}`,
      },
    });
    const result: GetCommandOutput = await docClient.send(params);
    if (!result.Item) {
      return false;
    }
    const eventParameter: IMetadataEventParameter = result.Item as IMetadataEventParameter;
    return eventParameter && !eventParameter.deleted;
  };

  public async createEventParameter(eventParameter: IMetadataEventParameter): Promise<string> {
    const params: PutCommand = new PutCommand({
      TableName: analyticsMetadataTable,
      Item: {
        id: `EVENT_PARAMETER#${eventParameter.projectId}#${eventParameter.appId}#${eventParameter.id}`,
        type: `#METADATA#${eventParameter.projectId}#${eventParameter.appId}#${eventParameter.id}`,
        prefix: `EVENT_PARAMETER#${eventParameter.projectId}#${eventParameter.appId}`,
        projectId: eventParameter.projectId,
        appId: eventParameter.appId,
        name: eventParameter.name,
        displayName: eventParameter.displayName ?? '',
        description: eventParameter.description ?? '',
        metadataSource: eventParameter.metadataSource ?? MetadataSource.PRESET,
        hasData: eventParameter.hasData ?? false,
        platform: eventParameter.platform ?? MetadataPlatform.ANDROID,
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
    return eventParameter.id;
  };

  public async getEventParameter(projectId: string, appId: string, eventParameterId: string): Promise<IMetadataEventParameter | undefined> {
    const params: GetCommand = new GetCommand({
      TableName: analyticsMetadataTable,
      Key: {
        id: `EVENT_PARAMETER#${projectId}#${appId}#${eventParameterId}`,
        type: `#METADATA#${projectId}#${appId}#${eventParameterId}`,
      },
    });
    const result: GetCommandOutput = await docClient.send(params);
    if (!result.Item) {
      return undefined;
    }
    const eventParameter: IMetadataEventParameter = result.Item as IMetadataEventParameter;
    return !eventParameter.deleted ? eventParameter : undefined;
  };

  public async updateEventParameter(eventParameter: IMetadataEventParameter): Promise<void> {
    let updateExpression = 'SET #updateAt= :u, #operator= :operator';
    let expressionAttributeValues = new Map();
    let expressionAttributeNames = {} as KeyVal<string>;
    expressionAttributeValues.set(':u', Date.now());
    expressionAttributeValues.set(':operator', eventParameter.operator);
    expressionAttributeNames['#updateAt'] = 'updateAt';
    expressionAttributeNames['#operator'] = 'operator';
    if (eventParameter.displayName) {
      updateExpression = `${updateExpression}, #displayName= :n`;
      expressionAttributeValues.set(':n', eventParameter.displayName);
      expressionAttributeNames['#displayName'] = 'displayName';
    }
    if (eventParameter.description) {
      updateExpression = `${updateExpression}, description= :d`;
      expressionAttributeValues.set(':d', eventParameter.description);
    }
    const params: UpdateCommand = new UpdateCommand({
      TableName: analyticsMetadataTable,
      Key: {
        id: `EVENT_PARAMETER#${eventParameter.projectId}#${eventParameter.appId}#${eventParameter.id}`,
        type: `#METADATA#${eventParameter.projectId}#${eventParameter.appId}#${eventParameter.id}`,
      },
      // Define expressions for the new or updated attributes
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });
    await docClient.send(params);
  };

  public async deleteEventParameter(projectId: string, appId: string, eventParameterId: string, operator: string): Promise<void> {
    // TODO: if attribute binded with any event, should not delete
    const input: ScanCommandInput = {
      TableName: analyticsMetadataTable,
      FilterExpression: 'id = :p AND deleted = :d',
      ExpressionAttributeValues: {
        ':p': `EVENT_PARAMETER#${projectId}#${appId}#${eventParameterId}`,
        ':d': false,
      },
    };
    const records = await scan(input);
    const eventParameters = records as IMetadataEventParameter[];
    for (let index in eventParameters) {
      const params: UpdateCommand = new UpdateCommand({
        TableName: analyticsMetadataTable,
        Key: {
          id: `EVENT_PARAMETER#${projectId}#${appId}#${eventParameterId}`,
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

  public async listEventParameters(projectId: string, appId: string, order: string): Promise<IMetadataEventParameter[]> {
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
        ':prefix': `EVENT_PARAMETER#${projectId}#${appId}`,
      },
      ScanIndexForward: order === 'asc',
    };
    const records = await query(input);
    return records as IMetadataEventParameter[];
  };

  public async isUserAttributeExisted(projectId: string, appId: string, userAttributeId: string): Promise<boolean> {
    const params: GetCommand = new GetCommand({
      TableName: analyticsMetadataTable,
      Key: {
        id: `USER_ATTRIBUTE#${projectId}#${appId}#${userAttributeId}`,
        type: `#METADATA#${projectId}#${appId}#${userAttributeId}`,
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
    const params: PutCommand = new PutCommand({
      TableName: analyticsMetadataTable,
      Item: {
        id: `USER_ATTRIBUTE#${userAttribute.projectId}#${userAttribute.appId}#${userAttribute.id}`,
        type: `#METADATA#${userAttribute.projectId}#${userAttribute.appId}#${userAttribute.id}`,
        prefix: `USER_ATTRIBUTE#${userAttribute.projectId}#${userAttribute.appId}`,
        projectId: userAttribute.projectId,
        appId: userAttribute.appId,
        name: userAttribute.name,
        displayName: userAttribute.displayName?? '',
        description: userAttribute.description?? '',
        metadataSource: userAttribute.metadataSource ?? MetadataSource.PRESET,
        createAt: Date.now(),
        updateAt: Date.now(),
        operator: userAttribute.operator?? '',
        deleted: false,
      },
    });
    await docClient.send(params);
    return userAttribute.id;
  };

  public async getUserAttribute(projectId: string, appId: string, userAttributeId: string): Promise<IMetadataUserAttribute | undefined> {
    const params: GetCommand = new GetCommand({
      TableName: analyticsMetadataTable,
      Key: {
        id: `USER_ATTRIBUTE#${projectId}#${appId}#${userAttributeId}`,
        type: `#METADATA#${projectId}#${appId}#${userAttributeId}`,
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
        id: `USER_ATTRIBUTE#${userAttribute.projectId}#${userAttribute.appId}#${userAttribute.id}`,
        type: `#METADATA#${userAttribute.projectId}#${userAttribute.appId}#${userAttribute.id}`,
      },
      // Define expressions for the new or updated attributes
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });
    await docClient.send(params);
  };

  public async deleteUserAttribute(projectId: string, appId: string, userAttributeId: string, operator: string): Promise<void> {
    const input: ScanCommandInput = {
      TableName: analyticsMetadataTable,
      FilterExpression: 'id = :p AND deleted = :d',
      ExpressionAttributeValues: {
        ':p': `USER_ATTRIBUTE#${projectId}#${appId}#${userAttributeId}`,
        ':d': false,
      },
    };
    const records = await scan(input);
    const userAttributes = records as IMetadataUserAttribute[];
    for (let index in userAttributes) {
      const params: UpdateCommand = new UpdateCommand({
        TableName: analyticsMetadataTable,
        Key: {
          id: `USER_ATTRIBUTE#${projectId}#${appId}#${userAttributeId}`,
          type: userAttributes[index].type,
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