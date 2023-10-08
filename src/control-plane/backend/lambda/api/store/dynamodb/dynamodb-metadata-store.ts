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
  UpdateCommand,
  QueryCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { analyticsMetadataTable, prefixMonthGSIName } from '../../common/constants';
import { docClient, query } from '../../common/dynamodb-client';
import { MetadataValueType } from '../../common/explore-types';
import { KeyVal } from '../../common/types';
import { getAttributeByNameAndType, getLatestAttributeByName, getLatestEventByName, getLatestParameterByName, getParameterByNameAndType } from '../../common/utils';
import { DDBMetadata, IMetadataDisplay, IMetadataEvent, IMetadataEventParameter, IMetadataUserAttribute } from '../../model/metadata';
import { MetadataStore } from '../metadata-store';

export class DynamoDbMetadataStore implements MetadataStore {

  public async getEvent(projectId: string, appId: string, eventName: string): Promise<IMetadataEvent | undefined> {
    const input: QueryCommandInput = {
      TableName: analyticsMetadataTable,
      KeyConditionExpression: '#id= :id AND begins_with(#month, :month)',
      ExpressionAttributeNames: {
        '#id': 'id',
        '#month': 'month',
      },
      ExpressionAttributeValues: {
        ':id': `${projectId}#${appId}#${eventName}`,
        ':month': '#',
      },
      ScanIndexForward: false,
    };
    const records = await query(input) as DDBMetadata[];
    if (!records || records.length === 0) {
      return;
    }
    const event: IMetadataEvent = {
      id: records[0].id,
      month: records[0].month,
      prefix: records[0].prefix,
      projectId: records[0].projectId,
      appId: records[0].appId,
      name: records[0].summary.name,
      dataVolumeLastDay: records[0].summary.dataVolumeLastDay ?? 0,
      hasData: records[0].summary.hasData ?? false,
      platform: records[0].summary.platform ?? [],
    };
    return event;
  };

  public async listEvents(projectId: string, appId: string): Promise<IMetadataEvent[]> {
    const input: QueryCommandInput = {
      TableName: analyticsMetadataTable,
      IndexName: prefixMonthGSIName,
      KeyConditionExpression: '#prefix= :prefix',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
      },
      ExpressionAttributeValues: {
        ':prefix': `EVENT#${projectId}#${appId}`,
      },
      ScanIndexForward: false,
    };
    const records = await query(input) as DDBMetadata[];
    const events = getLatestEventByName(records);
    return events;
  };

  public async getEventParameter(projectId: string, appId: string, parameterName: string, valueType: MetadataValueType):
  Promise<IMetadataEventParameter | undefined> {
    const input: QueryCommandInput = {
      TableName: analyticsMetadataTable,
      IndexName: prefixMonthGSIName,
      KeyConditionExpression: '#prefix= :prefix',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
      },
      ExpressionAttributeValues: {
        ':prefix': `EVENT_PARAMETER#${projectId}#${appId}`,
      },
      ScanIndexForward: false,
    };
    const records = await query(input) as DDBMetadata[];
    return getParameterByNameAndType(records, parameterName, valueType);
  };

  public async listEventParameters(projectId: string, appId: string): Promise<IMetadataEventParameter[]> {
    const input: QueryCommandInput = {
      TableName: analyticsMetadataTable,
      IndexName: prefixMonthGSIName,
      KeyConditionExpression: '#prefix= :prefix',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
      },
      ExpressionAttributeValues: {
        ':prefix': `EVENT_PARAMETER#${projectId}#${appId}`,
      },
      ScanIndexForward: false,
    };
    const records = await query(input) as DDBMetadata[];
    const parameters = getLatestParameterByName(records);
    return parameters;
  };

  public async getUserAttribute(projectId: string, appId: string, userAttributeName: string, valueType: MetadataValueType):
  Promise<IMetadataUserAttribute | undefined> {
    const input: QueryCommandInput = {
      TableName: analyticsMetadataTable,
      IndexName: prefixMonthGSIName,
      KeyConditionExpression: '#prefix= :prefix',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
      },
      ExpressionAttributeValues: {
        ':prefix': `USER_ATTRIBUTE#${projectId}#${appId}`,
      },
      ScanIndexForward: false,
    };
    const records = await query(input) as DDBMetadata[];
    return getAttributeByNameAndType(records, userAttributeName, valueType);
  };

  public async listUserAttributes(projectId: string, appId: string): Promise<IMetadataUserAttribute[]> {
    const input: QueryCommandInput = {
      TableName: analyticsMetadataTable,
      IndexName: prefixMonthGSIName,
      KeyConditionExpression: '#prefix= :prefix',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
      },
      ExpressionAttributeValues: {
        ':prefix': `USER_ATTRIBUTE#${projectId}#${appId}`,
      },
      ScanIndexForward: false,
    };
    const records = await query(input) as DDBMetadata[];
    const attributes = getLatestAttributeByName(records);
    return attributes;
  };

  public async getDisplay(projectId: string, appId: string): Promise<IMetadataDisplay[]> {
    const input: QueryCommandInput = {
      TableName: analyticsMetadataTable,
      IndexName: prefixMonthGSIName,
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
        month: '0',
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });
    await docClient.send(params);
  };
}