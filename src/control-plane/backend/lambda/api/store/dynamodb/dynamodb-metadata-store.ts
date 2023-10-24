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
import { DynamoDbStore } from './dynamodb-store';
import { analyticsMetadataTable, prefixMonthGSIName } from '../../common/constants';
import { docClient, query } from '../../common/dynamodb-client';
import { ConditionCategory, MetadataValueType } from '../../common/explore-types';
import { KeyVal } from '../../common/types';
import { getAttributeByNameAndType, getCurMonthStr, getDataFromLastDay, getLatestAttributeByName, getLatestEventByName, getLatestParameterById, getParameterByNameAndType } from '../../common/utils';
import { IMetadataRaw, IMetadataDisplay, IMetadataEvent, IMetadataEventParameter, IMetadataUserAttribute, IMetadataDescription, IMetadataBuiltInList } from '../../model/metadata';
import { ClickStreamStore } from '../click-stream-store';
import { MetadataStore } from '../metadata-store';

const store: ClickStreamStore = new DynamoDbStore();

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
    let records = await query(input) as IMetadataRaw[];
    if (!records || records.length === 0) {
      records = await this.queryEventFromBuiltInList(projectId, appId, eventName);
    }
    if (!records || records.length === 0) {
      return;
    }
    const lastDayData = getDataFromLastDay(records[0]);
    const event: IMetadataEvent = {
      id: records[0].id,
      month: records[0].month,
      prefix: records[0].prefix,
      projectId: records[0].projectId,
      appId: records[0].appId,
      name: records[0].name,
      dataVolumeLastDay: lastDayData.dataVolumeLastDay,
      hasData: lastDayData.hasData,
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
    let records = await query(input) as IMetadataRaw[];
    if (records.length === 0) {
      records = await this.queryMetadataRawsFromBuiltInList(projectId, appId, 'EVENT');
    }
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
    let records = await query(input) as IMetadataRaw[];
    if (!records || records.length === 0) {
      records = await this.queryEventParameterFromBuiltInList(projectId, appId, parameterName, valueType);
    }
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
    let records = await query(input) as IMetadataRaw[];
    if (records.length === 0) {
      records = await this.queryMetadataRawsFromBuiltInList(projectId, appId, 'EVENT_PARAMETER');
    }
    const parameters = getLatestParameterById(records);
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
    const records = await query(input) as IMetadataRaw[];
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
    let records = await query(input) as IMetadataRaw[];
    if (records.length === 0) {
      records = await this.queryMetadataRawsFromBuiltInList(projectId, appId, 'USER_ATTRIBUTE');
    }
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

  public async updateDisplay(id: string, projectId: string, appId: string, description: IMetadataDescription, displayName: string): Promise<void> {
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

  private async queryMetadataRawsFromBuiltInList(projectId: string, appId: string, type: string): Promise<IMetadataRaw[]> {
    const dic = await store.getDictionary('MetadataBuiltInList');
    if (!dic) {
      return [];
    }
    const builtInList = dic.data as IMetadataBuiltInList;
    switch (type) {
      case 'EVENT':
        return this.buildMetadataEventRaws(builtInList, projectId, appId);
      case 'EVENT_PARAMETER':
        return this.buildMetadataEventParameterRaws(builtInList, projectId, appId);
      case 'USER_ATTRIBUTE':
        return this.buildMetadataUserAttributeRaws(builtInList, projectId, appId);
      default:
        break;
    }

    return [];
  };

  private async queryEventFromBuiltInList(projectId: string, appId: string, eventName: string): Promise<IMetadataRaw[]> {
    const metadataRaws: IMetadataRaw[] = [];
    const dic = await store.getDictionary('MetadataBuiltInList');
    if (!dic) {
      return metadataRaws;
    }
    const builtInList = dic.data as IMetadataBuiltInList;
    const presetEvents = builtInList.PresetEvents.filter(p => p.name === eventName);
    if (presetEvents.length > 0) {
      const raw: IMetadataRaw = {
        id: `${projectId}#${appId}#${eventName}`,
        month: getCurMonthStr(),
        prefix: `EVENT#${projectId}#${appId}`,
        projectId: projectId,
        appId: appId,
        name: eventName,
        summary: {
          platform: [],
          hasData: false,
        },
      };
      metadataRaws.push(raw);
    }
    return metadataRaws;
  };

  private async queryEventParameterFromBuiltInList(
    projectId: string, appId: string, parameterName: string, valueType: MetadataValueType): Promise<IMetadataRaw[]> {
    const metadataRaws: IMetadataRaw[] = [];
    const dic = await store.getDictionary('MetadataBuiltInList');
    if (!dic) {
      return metadataRaws;
    }
    const builtInList = dic.data as IMetadataBuiltInList;
    const presetEventParameters = builtInList.PresetEventParameters.filter(p => p.name === parameterName && p.dataType === valueType);
    for (let preset of presetEventParameters) {
      if (!preset.eventName) {
        for (let e of builtInList.PresetEvents) {
          const raw: IMetadataRaw = {
            id: `${projectId}#${appId}#${e.name}#${preset.name}#${preset.dataType}`,
            month: getCurMonthStr(),
            prefix: `EVENT_PARAMETER#${projectId}#${appId}`,
            projectId: projectId,
            appId: appId,
            name: preset.name,
            eventName: e.name,
            category: ConditionCategory.EVENT,
            valueType: preset.dataType,
            summary: {
              platform: [],
              hasData: false,
            },
          };
          metadataRaws.push(raw);
        }
      } else {
        const raw: IMetadataRaw = {
          id: `${projectId}#${appId}#${preset.eventName}#${preset.name}#${preset.dataType}`,
          month: getCurMonthStr(),
          prefix: `EVENT_PARAMETER#${projectId}#${appId}`,
          projectId: projectId,
          appId: appId,
          name: preset.name,
          eventName: preset.eventName,
          category: ConditionCategory.EVENT,
          valueType: preset.dataType,
          summary: {
            platform: [],
            hasData: false,
          },
        };
        metadataRaws.push(raw);
      }
    }
    const publicEventParameters = builtInList.PublicEventParameters.filter(p => p.name === parameterName && p.dataType === valueType);
    for (let pub of publicEventParameters) {
      for (let e of builtInList.PresetEvents) {
        const raw: IMetadataRaw = {
          id: `${projectId}#${appId}#${e.name}#${pub.name}#${pub.dataType}`,
          month: getCurMonthStr(),
          prefix: `EVENT_PARAMETER#${projectId}#${appId}`,
          projectId: projectId,
          appId: appId,
          name: pub.name,
          eventName: e.name,
          category: ConditionCategory.EVENT,
          valueType: pub.dataType,
          summary: {
            platform: [],
            hasData: false,
          },
        };
        metadataRaws.push(raw);
      }
    }
    return metadataRaws;
  };

  private buildMetadataEventRaws(builtInList: IMetadataBuiltInList, projectId: string, appId: string): IMetadataRaw[] {
    const metadataRaws: IMetadataRaw[] = [];
    for (let e of builtInList.PresetEvents) {
      const raw: IMetadataRaw = {
        id: `${projectId}#${appId}#${e.name}`,
        month: getCurMonthStr(),
        prefix: `EVENT#${projectId}#${appId}`,
        projectId: projectId,
        appId: appId,
        name: e.name,
        summary: {
          platform: [],
          hasData: false,
        },
      };
      metadataRaws.push(raw);
    }
    return metadataRaws;
  }

  private buildMetadataEventParameterRaws(builtInList: IMetadataBuiltInList, projectId: string, appId: string): IMetadataRaw[] {
    const metadataRaws: IMetadataRaw[] = [];
    for (let preset of builtInList.PresetEventParameters) {
      if (!preset.eventName) {
        for (let e of builtInList.PresetEvents) {
          const raw: IMetadataRaw = {
            id: `${projectId}#${appId}#${e.name}#${preset.name}#${preset.dataType}`,
            month: getCurMonthStr(),
            prefix: `EVENT_PARAMETER#${projectId}#${appId}`,
            projectId: projectId,
            appId: appId,
            name: preset.name,
            eventName: e.name,
            category: ConditionCategory.EVENT,
            valueType: preset.dataType,
            summary: {
              platform: [],
              hasData: false,
            },
          };
          metadataRaws.push(raw);
        }
      } else {
        const raw: IMetadataRaw = {
          id: `${projectId}#${appId}#${preset.eventName}#${preset.name}#${preset.dataType}`,
          month: getCurMonthStr(),
          prefix: `EVENT_PARAMETER#${projectId}#${appId}`,
          projectId: projectId,
          appId: appId,
          name: preset.name,
          eventName: preset.eventName,
          category: ConditionCategory.EVENT,
          valueType: preset.dataType,
          summary: {
            platform: [],
            hasData: false,
          },
        };
        metadataRaws.push(raw);
      }
    }

    for (let pub of builtInList.PublicEventParameters) {
      for (let e of builtInList.PresetEvents) {
        const raw: IMetadataRaw = {
          id: `${projectId}#${appId}#${e.name}#${pub.name}#${pub.dataType}`,
          month: getCurMonthStr(),
          prefix: `EVENT_PARAMETER#${projectId}#${appId}`,
          projectId: projectId,
          appId: appId,
          name: pub.name,
          eventName: e.name,
          category: ConditionCategory.EVENT,
          valueType: pub.dataType,
          summary: {
            platform: [],
            hasData: false,
          },
        };
        metadataRaws.push(raw);
      }
    }
    return metadataRaws;
  }

  private buildMetadataUserAttributeRaws(builtInList: IMetadataBuiltInList, projectId: string, appId: string): IMetadataRaw[] {
    const metadataRaws: IMetadataRaw[] = [];
    for (let attr of builtInList.PresetUserAttributes) {
      const raw: IMetadataRaw = {
        id: `${projectId}#${appId}#${attr.name}#${attr.dataType}`,
        month: getCurMonthStr(),
        prefix: `USER_ATTRIBUTE#${projectId}#${appId}`,
        projectId: projectId,
        appId: appId,
        name: attr.name,
        category: ConditionCategory.USER,
        valueType: attr.dataType,
        summary: {
          hasData: false,
        },
      };
      metadataRaws.push(raw);
    }
    return metadataRaws;
  }
}