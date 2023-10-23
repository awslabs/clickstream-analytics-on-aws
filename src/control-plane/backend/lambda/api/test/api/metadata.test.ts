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
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import request from 'supertest';
import { metadataEventExistedMock, MOCK_APP_ID, MOCK_EVENT_PARAMETER_NAME, MOCK_EVENT_NAME, MOCK_PROJECT_ID, MOCK_TOKEN, MOCK_USER_ATTRIBUTE_NAME, tokenMock } from './ddb-mock';
import { analyticsMetadataTable, dictionaryTableName, prefixMonthGSIName } from '../../common/constants';
import { MetadataParameterType, MetadataPlatform, MetadataSource, MetadataValueType } from '../../common/explore-types';
import { app, server } from '../../index';
import 'aws-sdk-client-mock-jest';

const ddbMock = mockClient(DynamoDBDocumentClient);

const MOCK_EVENT = {
  id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
  month: '#202301',
  prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
  projectId: MOCK_PROJECT_ID,
  appId: MOCK_APP_ID,
  name: MOCK_EVENT_NAME,
  day1: {
    count: 1,
    hasData: true,
    platform: [
      'iOS',
    ],
  },
  day31: {
    count: 2,
    hasData: true,
    platform: [
      'Android',
    ],
  },
  summary: {
    dataVolumeLastDay: 2048,
    hasData: true,
    platform: [
      'Android',
      'iOS',
    ],
  },
};

const MOCK_EVENT_PARAMETER = {
  id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}#${MOCK_EVENT_PARAMETER_NAME}#${MetadataValueType.STRING}`,
  month: '#202301',
  prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
  projectId: MOCK_PROJECT_ID,
  appId: MOCK_APP_ID,
  name: MOCK_EVENT_PARAMETER_NAME,
  eventName: MOCK_EVENT_NAME,
  category: 'event',
  valueType: MetadataValueType.STRING,
  day1: {
    hasData: true,
    platform: [
      'Android',
    ],
    valueEnum: [
      {
        count: 103,
        value: 'value-01',
      },
    ],
  },
  day31: {
    hasData: true,
    platform: [
      'iOS',
    ],
    valueEnum: [
      {
        count: 305,
        value: 'value-02',
      },
      {
        count: 505,
        value: 'value-03',
      },
    ],
  },
  summary: {
    hasData: true,
    platform: [
      'Android',
      'iOS',
    ],
    valueEnum: [
      {
        count: 103,
        value: 'value-01',
      },
      {
        count: 305,
        value: 'value-02',
      },
      {
        count: 505,
        value: 'value-03',
      },
    ],
  },
};

const MOCK_USER_ATTRIBUTE = {
  id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}#${MetadataValueType.STRING}`,
  month: '#202301',
  prefix: `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
  projectId: MOCK_PROJECT_ID,
  appId: MOCK_APP_ID,
  name: MOCK_USER_ATTRIBUTE_NAME,
  category: 'user',
  valueType: MetadataValueType.STRING,
  day1: {
    hasData: true,
    valueEnum: [
      {
        count: 103,
        value: 'value-01',
      },
    ],
  },
  day31: {
    hasData: true,
    valueEnum: [
      {
        count: 305,
        value: 'value-02',
      },
      {
        count: 505,
        value: 'value-03',
      },
    ],
  },
  summary: {
    hasData: true,
    valueEnum: [
      {
        count: 103,
        value: 'value-01',
      },
      {
        count: 305,
        value: 'value-02',
      },
      {
        count: 505,
        value: 'value-03',
      },
    ],
  },
};

function displayDataMock(m: any) {
  // display data
  m.on(QueryCommand, {
    TableName: analyticsMetadataTable,
    IndexName: prefixMonthGSIName,
    KeyConditionExpression: '#prefix= :prefix',
    FilterExpression: 'projectId = :projectId AND appId = :appId',
    ExpressionAttributeNames: {
      '#prefix': 'prefix',
    },
    ExpressionAttributeValues: {
      ':projectId': MOCK_PROJECT_ID,
      ':appId': MOCK_APP_ID,
      ':prefix': 'DISPLAY',
    },
  }).resolves({
    Items: [
      {
        id: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        displayName: `display name of event ${MOCK_EVENT_NAME}`,
        description: {
          'en-US': `Description of event ${MOCK_EVENT_NAME}`,
          'zh-CN': `${MOCK_EVENT_NAME}说明`,
        },
      },
      {
        id: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        displayName: `display name of event ${MOCK_EVENT_NAME}1`,
        description: {
          'en-US': `Description of event ${MOCK_EVENT_NAME}1`,
          'zh-CN': `${MOCK_EVENT_NAME}1说明`,
        },
      },
      {
        id: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}#${MOCK_EVENT_PARAMETER_NAME}#${MetadataValueType.STRING}`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        displayName: `display name of event parameter ${MOCK_EVENT_PARAMETER_NAME}(String)`,
        description: {
          'en-US': `Description of event parameter ${MOCK_EVENT_PARAMETER_NAME}(String)`,
          'zh-CN': `${MOCK_EVENT_PARAMETER_NAME}参数说明`,
        },
      },
      {
        id: `DICTIONARY#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_NAME}#${MetadataValueType.STRING}#value-02`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        displayName: `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME}(String) value-02`,
      },
      {
        id: `DICTIONARY#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_NAME}11#${MetadataValueType.INTEGER}#value-01`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        displayName: `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME}11(Integer) value-01`,
      },
      {
        id: `DICTIONARY#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_NAME}12#${MetadataValueType.DOUBLE}#value-03`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        displayName: `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME}12(Double) value-03`,
      },
      {
        id: `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}#${MetadataValueType.STRING}`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        displayName: `display name of user parameter ${MOCK_USER_ATTRIBUTE_NAME}`,
        description: {
          'en-US': `Description of user parameter ${MOCK_USER_ATTRIBUTE_NAME}`,
          'zh-CN': `${MOCK_USER_ATTRIBUTE_NAME}参数说明`,
        },
      },
      {
        id: `DICTIONARY#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}#${MetadataValueType.STRING}#value-02`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        displayName: `display name of dictionary ${MOCK_USER_ATTRIBUTE_NAME}(String) value-02`,
      },
    ],
  });
  // BuiltList
  m.on(GetCommand, {
    TableName: dictionaryTableName,
    Key: {
      name: 'MetadataBuiltInList',
    },
  }).resolves({
    Item: {
      name: 'MetadataBuiltInList',
      data: {
        PresetEvents: [
          {
            name: MOCK_EVENT_NAME,
            description: {
              'en-US': 'mock event description in built-in',
              'zh-CN': '内置事件的描述',
            },
          },
        ],
        PresetEventParameters: [
          {
            name: MOCK_EVENT_PARAMETER_NAME,
            dataType: MetadataValueType.STRING,
            description: {
              'en-US': 'mock preset event parameter description in built-in',
              'zh-CN': '内置事件参数的描述',
            },
          },
        ],
        PublicEventParameters: [
          {
            name: MOCK_EVENT_PARAMETER_NAME,
            dataType: MetadataValueType.STRING,
            description: {
              'en-US': 'mock public event parameter description in built-in',
              'zh-CN': '内置事件参数的描述',
            },
          },
          {
            name: `${MOCK_EVENT_PARAMETER_NAME}11`,
            dataType: MetadataValueType.INTEGER,
            description: {
              'en-US': 'mock public event parameter description in built-in',
              'zh-CN': '内置事件参数的描述',
            },
          },
        ],
        PresetUserAttributes: [
          {
            name: MOCK_USER_ATTRIBUTE_NAME,
            dataType: MetadataValueType.STRING,
            description: {
              'en-US': 'mock preset user attribute description in built-in',
              'zh-CN': '内置用户属性的描述',
            },
          },
        ],
      },
    },
  });
}

describe('Metadata Event test', () => {
  beforeEach(() => {
    ddbMock.reset();
    displayDataMock(ddbMock);
  });
  it('Get metadata event by name', async () => {
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2023-03-02'));
    ddbMock.on(QueryCommand, {
      TableName: analyticsMetadataTable,
      KeyConditionExpression: '#id= :id AND begins_with(#month, :month)',
      ExpressionAttributeNames: {
        '#id': 'id',
        '#month': 'month',
      },
      ExpressionAttributeValues: {
        ':id': `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
        ':month': '#',
      },
      ScanIndexForward: false,
    }).resolves({
      Items: [
        {
          ...MOCK_EVENT,
          month: '#202303',
        },
        {
          ...MOCK_EVENT,
          month: '#202302',
        },
        MOCK_EVENT,
      ],
    });
    ddbMock.on(QueryCommand, {
      TableName: analyticsMetadataTable,
      IndexName: prefixMonthGSIName,
      KeyConditionExpression: '#prefix= :prefix',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
      },
      ExpressionAttributeValues: {
        ':prefix': `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
      },
      ScanIndexForward: false,
    }).resolves({
      Items: [
        MOCK_EVENT_PARAMETER,
        {
          ...MOCK_EVENT_PARAMETER,
          month: '#202302',
        },
        {
          ...MOCK_EVENT_PARAMETER,
          month: '#202303',
        },
      ],
    });
    const res = await request(app)
      .get(`/api/metadata/event/${MOCK_EVENT_NAME}?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
        prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
        month: '#202303',
        associatedParameters: [
          {
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}#${MOCK_EVENT_PARAMETER_NAME}#${MetadataValueType.STRING}`,
            month: '#202303',
            prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            category: 'event',
            metadataSource: MetadataSource.PRESET,
            name: MOCK_EVENT_PARAMETER_NAME,
            eventName: MOCK_EVENT_NAME,
            displayName: MOCK_EVENT_PARAMETER_NAME,
            description: {
              'en-US': 'mock preset event parameter description in built-in',
              'zh-CN': '内置事件参数的描述',
            },
            parameterType: 'Public',
            hasData: true,
            platform: [MetadataPlatform.ANDROID, MetadataPlatform.IOS],
            valueType: MetadataValueType.STRING,
            values: [
              { value: 'value-01', displayValue: 'value-01' },
              { value: 'value-02', displayValue: `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME}(String) value-02` },
              { value: 'value-03', displayValue: 'value-03' },
            ],
          },
        ],
        hasData: true,
        platform: [MetadataPlatform.ANDROID, MetadataPlatform.IOS],
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        name: MOCK_EVENT_NAME,
        metadataSource: MetadataSource.PRESET,
        dataVolumeLastDay: 1,
        displayName: `display name of event ${MOCK_EVENT_NAME}`,
        description: {
          'en-US': 'mock event description in built-in',
          'zh-CN': '内置事件的描述',
        },
      },
    });
  });
  it('Get non-existent metadata event', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [],
    });
    const res = await request(app)
      .get(`/api/metadata/event/${MOCK_EVENT_NAME}?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'Event not found',
    });
  });
  it('Get metadata event list', async () => {
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2023-02-02'));
    ddbMock.on(QueryCommand, {
      TableName: analyticsMetadataTable,
      IndexName: prefixMonthGSIName,
      KeyConditionExpression: '#prefix= :prefix',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
      },
      ExpressionAttributeValues: {
        ':prefix': `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
      },
      ScanIndexForward: false,
    }).resolves({
      Items: [
        {
          ...MOCK_EVENT,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
          month: '#202302',
          name: `${MOCK_EVENT_NAME}1`,
          summary: {
            ...MOCK_EVENT.summary,
          },
        },
        {
          ...MOCK_EVENT,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
          month: '#202301',
          name: `${MOCK_EVENT_NAME}1`,
          summary: {
            ...MOCK_EVENT.summary,
          },
        },
        {
          ...MOCK_EVENT,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}2`,
          month: '#202301',
          name: `${MOCK_EVENT_NAME}2`,
          summary: {
            ...MOCK_EVENT.summary,
            platform: [MetadataPlatform.WEB],
            dataVolumeLastDay: 1445,
          },
        },
      ],
    });
    let res = await request(app)
      .get(`/api/metadata/events?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        items: [
          {
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
            month: '#202302',
            prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            name: `${MOCK_EVENT_NAME}1`,
            displayName: `display name of event ${MOCK_EVENT_NAME}1`,
            description: {
              'en-US': `Description of event ${MOCK_EVENT_NAME}1`,
              'zh-CN': `${MOCK_EVENT_NAME}1说明`,
            },
            metadataSource: MetadataSource.CUSTOM,
            hasData: true,
            dataVolumeLastDay: 1,
            associatedParameters: [],
            platform: [MetadataPlatform.ANDROID, MetadataPlatform.IOS],
          },
          {
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}2`,
            month: '#202301',
            prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            name: `${MOCK_EVENT_NAME}2`,
            displayName: `${MOCK_EVENT_NAME}2`,
            description: {
              'en-US': '',
              'zh-CN': '',
            },
            metadataSource: MetadataSource.CUSTOM,
            hasData: false,
            dataVolumeLastDay: 0,
            associatedParameters: [],
            platform: [MetadataPlatform.WEB],
          },
        ],
        totalCount: 2,
      },
    });

    // Mock DynamoDB error
    ddbMock.on(QueryCommand).rejects(new Error('Mock DynamoDB error'));
    res = await request(app)
      .get(`/api/metadata/events?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);

    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('Get metadata event list without last day data', async () => {
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2023-02-03'));
    ddbMock.on(QueryCommand, {
      TableName: analyticsMetadataTable,
      IndexName: prefixMonthGSIName,
      KeyConditionExpression: '#prefix= :prefix',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
      },
      ExpressionAttributeValues: {
        ':prefix': `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
      },
      ScanIndexForward: false,
    }).resolves({
      Items: [
        {
          ...MOCK_EVENT,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
          month: '#202302',
          name: `${MOCK_EVENT_NAME}1`,
          summary: {
            ...MOCK_EVENT.summary,
          },
        },
      ],
    });
    let res = await request(app)
      .get(`/api/metadata/events?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        items: [
          {
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
            month: '#202302',
            prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            name: `${MOCK_EVENT_NAME}1`,
            displayName: `display name of event ${MOCK_EVENT_NAME}1`,
            description: {
              'en-US': `Description of event ${MOCK_EVENT_NAME}1`,
              'zh-CN': `${MOCK_EVENT_NAME}1说明`,
            },
            metadataSource: MetadataSource.CUSTOM,
            hasData: false,
            dataVolumeLastDay: 0,
            associatedParameters: [],
            platform: [MetadataPlatform.ANDROID, MetadataPlatform.IOS],
          },
        ],
        totalCount: 1,
      },
    });
  });
  it('Get metadata event list with parameters', async () => {
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2023-02-02'));
    ddbMock.on(QueryCommand, {
      TableName: analyticsMetadataTable,
      IndexName: prefixMonthGSIName,
      KeyConditionExpression: '#prefix= :prefix',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
      },
      ExpressionAttributeValues: {
        ':prefix': `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
      },
      ScanIndexForward: false,
    }).resolves({
      Items: [
        {
          ...MOCK_EVENT,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
          month: '#202302',
          name: `${MOCK_EVENT_NAME}1`,
          summary: {
            ...MOCK_EVENT.summary,
          },
        },
        {
          ...MOCK_EVENT,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
          month: '#202301',
          name: `${MOCK_EVENT_NAME}1`,
          summary: {
            ...MOCK_EVENT.summary,
          },
        },
        {
          ...MOCK_EVENT,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}2`,
          month: '#202301',
          name: `${MOCK_EVENT_NAME}2`,
          summary: {
            ...MOCK_EVENT.summary,
            platform: [MetadataPlatform.ANDROID, MetadataPlatform.WEB, MetadataPlatform.IOS],
            dataVolumeLastDay: 1445,
          },
        },
      ],
    });
    ddbMock.on(QueryCommand, {
      TableName: analyticsMetadataTable,
      IndexName: prefixMonthGSIName,
      KeyConditionExpression: '#prefix= :prefix',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
      },
      ExpressionAttributeValues: {
        ':prefix': `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
      },
      ScanIndexForward: false,
    }).resolves({
      Items: [
        {
          ...MOCK_EVENT_PARAMETER,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1#${MOCK_EVENT_PARAMETER_NAME}11#${MetadataValueType.INTEGER}`,
          month: '#202302',
          name: `${MOCK_EVENT_PARAMETER_NAME}11`,
          eventName: `${MOCK_EVENT_NAME}1`,
          valueType: MetadataValueType.INTEGER,
          summary: {
            ...MOCK_EVENT_PARAMETER.summary,
            platform: [
              'Android',
            ],
            valueEnum: [
              {
                count: 103,
                value: 'value-01',
              },
            ],
          },
        },
        {
          ...MOCK_EVENT_PARAMETER,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1#${MOCK_EVENT_PARAMETER_NAME}11#${MetadataValueType.INTEGER}`,
          month: '#202301',
          name: `${MOCK_EVENT_PARAMETER_NAME}11`,
          eventName: `${MOCK_EVENT_NAME}1`,
          valueType: MetadataValueType.INTEGER,
          summary: {
            ...MOCK_EVENT_PARAMETER.summary,
            platform: [
              'Android',
            ],
            valueEnum: [
              {
                count: 1032,
                value: 'value-02',
              },
            ],
          },
        },
        {
          ...MOCK_EVENT_PARAMETER,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1#${MOCK_EVENT_PARAMETER_NAME}12#${MetadataValueType.DOUBLE}`,
          month: '#202301',
          name: `${MOCK_EVENT_PARAMETER_NAME}12`,
          eventName: `${MOCK_EVENT_NAME}1`,
          valueType: MetadataValueType.DOUBLE,
          summary: {
            ...MOCK_EVENT_PARAMETER.summary,
            platform: [
              'iOS',
            ],
            valueEnum: [
              {
                count: 1,
                value: 'value-03',
              },
            ],
          },
        },
      ],
    });
    const res = await request(app)
      .get(`/api/metadata/events?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}&attribute=true`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        items: [
          {
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
            prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            name: `${MOCK_EVENT_NAME}1`,
            displayName: `display name of event ${MOCK_EVENT_NAME}1`,
            description: {
              'en-US': `Description of event ${MOCK_EVENT_NAME}1`,
              'zh-CN': `${MOCK_EVENT_NAME}1说明`,
            },
            hasData: true,
            dataVolumeLastDay: 1,
            metadataSource: MetadataSource.CUSTOM,
            month: '#202302',
            associatedParameters: [
              {
                id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1#${MOCK_EVENT_PARAMETER_NAME}11#${MetadataValueType.INTEGER}`,
                month: '#202302',
                prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
                appId: MOCK_APP_ID,
                projectId: MOCK_PROJECT_ID,
                hasData: true,
                metadataSource: MetadataSource.CUSTOM,
                name: `${MOCK_EVENT_PARAMETER_NAME}11`,
                eventName: `${MOCK_EVENT_NAME}1`,
                displayName: `${MOCK_EVENT_PARAMETER_NAME}11`,
                description: {
                  'en-US': '',
                  'zh-CN': '',
                },
                parameterType: MetadataParameterType.PUBLIC,
                platform: [MetadataPlatform.ANDROID],
                valueType: MetadataValueType.INTEGER,
                category: 'event',
                values: [
                  { value: 'value-01', displayValue: `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME}11(Integer) value-01` },
                ],
              },
              {
                id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1#${MOCK_EVENT_PARAMETER_NAME}12#${MetadataValueType.DOUBLE}`,
                month: '#202301',
                prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
                appId: MOCK_APP_ID,
                projectId: MOCK_PROJECT_ID,
                hasData: false,
                metadataSource: MetadataSource.CUSTOM,
                name: `${MOCK_EVENT_PARAMETER_NAME}12`,
                eventName: `${MOCK_EVENT_NAME}1`,
                displayName: `${MOCK_EVENT_PARAMETER_NAME}12`,
                description: {
                  'en-US': '',
                  'zh-CN': '',
                },
                parameterType: MetadataParameterType.PRIVATE,
                platform: [MetadataPlatform.IOS],
                valueType: MetadataValueType.DOUBLE,
                category: 'event',
                values: [
                  { value: 'value-03', displayValue: `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME}12(Double) value-03` },
                ],
              },
            ],
            platform: [MetadataPlatform.ANDROID, MetadataPlatform.IOS],
          },
          {
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}2`,
            prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            name: `${MOCK_EVENT_NAME}2`,
            displayName: `${MOCK_EVENT_NAME}2`,
            description: {
              'en-US': '',
              'zh-CN': '',
            },
            hasData: false,
            dataVolumeLastDay: 0,
            metadataSource: MetadataSource.CUSTOM,
            month: '#202301',
            associatedParameters: [],
            platform: [MetadataPlatform.ANDROID, MetadataPlatform.WEB, MetadataPlatform.IOS],
          },
        ],
        totalCount: 2,
      },
    });
  });
  it('Update metadata display data', async () => {
    tokenMock(ddbMock, false);
    let res = await request(app)
      .put('/api/metadata/display')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        id: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        description: 'Description of event',
        displayName: 'display name of event 555',
      });
    ddbMock.on(UpdateCommand).resolves({});
    ddbMock.on(ScanCommand).resolvesOnce({});
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      data: null,
      success: true,
      message: 'Updated success.',
    });
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
  });
  it('Update metadata display data with not body', async () => {
    tokenMock(ddbMock, false);
    metadataEventExistedMock(ddbMock, MOCK_PROJECT_ID, MOCK_APP_ID, true);
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .put('/api/metadata/display')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'body',
          msg: 'Value is empty.',
          param: 'projectId',
        },
        {
          location: 'body',
          msg: 'Value is empty.',
          param: 'appId',
        },
        {
          location: 'body',
          msg: 'Value is empty.',
          param: 'id',
        },
        {
          location: 'body',
          msg: 'Value is empty.',
          param: '',
          value: {},
        },
      ],
    });
  });

  afterAll((done) => {
    server.close();
    done();
  });
});

describe('Metadata Event Attribute test', () => {
  beforeEach(() => {
    ddbMock.reset();
    displayDataMock(ddbMock);
  });
  it('Get metadata event attribute by name', async () => {
    ddbMock.on(QueryCommand, {
      TableName: analyticsMetadataTable,
      IndexName: prefixMonthGSIName,
      KeyConditionExpression: '#prefix= :prefix',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
      },
      ExpressionAttributeValues: {
        ':prefix': `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
      },
      ScanIndexForward: false,
    }).resolves({
      Items: [
        {
          ...MOCK_EVENT_PARAMETER,
          month: '#202302',
        },
        {
          ...MOCK_EVENT_PARAMETER,
          month: '#202301',
        },
        {
          ...MOCK_EVENT_PARAMETER,
          month: '#202302',
          eventName: `${MOCK_EVENT_NAME}1`,
          summary: {
            ...MOCK_EVENT_PARAMETER.summary,
            platform: [
              'Android',
            ],
            valueEnum: [
              {
                count: 1032,
                value: 'value-02',
              },
            ],
            valueType: MetadataValueType.STRING,
          },
        },
        {
          ...MOCK_EVENT_PARAMETER,
          month: '#202301',
          eventName: `${MOCK_EVENT_NAME}1`,
          summary: {
            ...MOCK_EVENT_PARAMETER.summary,
            platform: [
              'Android',
            ],
            valueEnum: [
              {
                count: 1032,
                value: 'value-02',
              },
            ],
            valueType: MetadataValueType.STRING,
          },
        },
      ],
    });
    const res = await request(app)
      .get(`/api/metadata/event_parameter?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}&name=${MOCK_EVENT_PARAMETER_NAME}&type=${MetadataValueType.STRING}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        associatedEvents: [
          {
            name: MOCK_EVENT_NAME,
            prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            metadataSource: MetadataSource.PRESET,
            displayName: `display name of event ${MOCK_EVENT_NAME}`,
            description: {
              'en-US': 'mock event description in built-in',
              'zh-CN': '内置事件的描述',
            },
          },
          {
            name: `${MOCK_EVENT_NAME}1`,
            prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            metadataSource: MetadataSource.CUSTOM,
            displayName: `display name of event ${MOCK_EVENT_NAME}1`,
            description: {
              'en-US': `Description of event ${MOCK_EVENT_NAME}1`,
              'zh-CN': `${MOCK_EVENT_NAME}1说明`,
            },
          },
        ],
        id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}#${MOCK_EVENT_PARAMETER_NAME}#${MetadataValueType.STRING}`,
        month: '#202302',
        prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        name: MOCK_EVENT_PARAMETER_NAME,
        description: {
          'en-US': 'mock preset event parameter description in built-in',
          'zh-CN': '内置事件参数的描述',
        },
        displayName: MOCK_EVENT_PARAMETER_NAME,
        eventName: '',
        category: 'event',
        metadataSource: MetadataSource.PRESET,
        parameterType: MetadataParameterType.PUBLIC,
        hasData: true,
        platform: [MetadataPlatform.ANDROID, MetadataPlatform.IOS],
        valueType: MetadataValueType.STRING,
        values: [
          { value: 'value-01', displayValue: 'value-01' },
          { value: 'value-02', displayValue: `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME}(String) value-02` },
          { value: 'value-03', displayValue: 'value-03' },
        ],
      },
    });
  });
  it('Get non-existent metadata event attribute', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [],
    });
    const res = await request(app)
      .get(`/api/metadata/event_parameter?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}&name=${MOCK_EVENT_PARAMETER_NAME}&type=String`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'Event attribute not found',
    });
  });
  it('Get metadata event attribute list', async () => {
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2023-02-02'));
    ddbMock.on(QueryCommand, {
      TableName: analyticsMetadataTable,
      IndexName: prefixMonthGSIName,
      KeyConditionExpression: '#prefix= :prefix',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
      },
      ExpressionAttributeValues: {
        ':prefix': `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
      },
      ScanIndexForward: false,
    }).resolves({
      Items: [
        {
          ...MOCK_EVENT_PARAMETER,
          month: '#202302',
        },
        {
          ...MOCK_EVENT_PARAMETER,
          month: '#202301',
        },
        {
          ...MOCK_EVENT_PARAMETER,
          month: '#202302',
          eventName: `${MOCK_EVENT_NAME}1`,
          valueType: MetadataValueType.STRING,
          summary: {
            ...MOCK_EVENT_PARAMETER.summary,
            platform: [
              'Android',
            ],
            valueEnum: [
              {
                count: 1032,
                value: 'value-02',
              },
            ],
          },
        },
        {
          ...MOCK_EVENT_PARAMETER,
          month: '#202301',
          eventName: `${MOCK_EVENT_NAME}1`,
          valueType: MetadataValueType.STRING,
          summary: {
            ...MOCK_EVENT_PARAMETER.summary,
            platform: [
              'Android',
            ],
            valueEnum: [
              {
                count: 1032,
                value: 'value-02',
              },
            ],
          },
        },
        {
          ...MOCK_EVENT_PARAMETER,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1#${MOCK_EVENT_PARAMETER_NAME}1#${MetadataValueType.FLOAT}`,
          month: '#202306',
          name: `${MOCK_EVENT_PARAMETER_NAME}1`,
          eventName: `${MOCK_EVENT_NAME}1`,
          valueType: MetadataValueType.FLOAT,
          summary: {
            ...MOCK_EVENT_PARAMETER.summary,
            platform: [
              'Android',
              'Web',
              'iOS',
            ],
            valueEnum: [
              {
                count: 555,
                value: 'value-02',
              },
            ],
          },
        },
      ],
    });
    let res = await request(app)
      .get(`/api/metadata/event_parameters?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        items: [
          {
            associatedEvents: [],
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}#${MOCK_EVENT_PARAMETER_NAME}#${MetadataValueType.STRING}`,
            month: '#202302',
            prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            name: MOCK_EVENT_PARAMETER_NAME,
            description: {
              'en-US': 'mock preset event parameter description in built-in',
              'zh-CN': '内置事件参数的描述',
            },
            displayName: MOCK_EVENT_PARAMETER_NAME,
            eventName: MOCK_EVENT_NAME,
            category: 'event',
            metadataSource: MetadataSource.PRESET,
            parameterType: MetadataParameterType.PUBLIC,
            hasData: true,
            platform: [MetadataPlatform.ANDROID, MetadataPlatform.IOS],
            valueType: MetadataValueType.STRING,
            values: [
              { value: 'value-01', displayValue: 'value-01' },
              { value: 'value-02', displayValue: `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME}(String) value-02` },
              { value: 'value-03', displayValue: 'value-03' },
            ],
          },
          {
            associatedEvents: [],
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1#${MOCK_EVENT_PARAMETER_NAME}1#${MetadataValueType.FLOAT}`,
            month: '#202306',
            prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            name: `${MOCK_EVENT_PARAMETER_NAME}1`,
            description: {
              'en-US': '',
              'zh-CN': '',
            },
            displayName: `${MOCK_EVENT_PARAMETER_NAME}1`,
            eventName: `${MOCK_EVENT_NAME}1`,
            category: 'event',
            metadataSource: MetadataSource.CUSTOM,
            parameterType: MetadataParameterType.PRIVATE,
            hasData: false,
            platform: [MetadataPlatform.ANDROID, MetadataPlatform.WEB, MetadataPlatform.IOS],
            valueType: MetadataValueType.FLOAT,
            values: [
              { value: 'value-02', displayValue: 'value-02' },
            ],
          },
        ],
        totalCount: 2,
      },
    });

    // Mock DynamoDB error
    ddbMock.on(QueryCommand).rejects(new Error('Mock DynamoDB error'));
    res = await request(app)
      .get(`/api/metadata/event_parameters?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);

    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });

  afterAll((done) => {
    server.close();
    done();
  });
});

describe('Metadata User Attribute test', () => {
  beforeEach(() => {
    ddbMock.reset();
    displayDataMock(ddbMock);
  });
  it('Get non-existent metadata user attribute', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [],
    });
    const res = await request(app)
      .get(`/api/metadata/user_attribute?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}&name=${MOCK_USER_ATTRIBUTE_NAME}&type=String`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'User attribute not found',
    });
  });
  it('Get metadata user attribute list', async () => {
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2023-02-02'));
    ddbMock.on(QueryCommand, {
      TableName: analyticsMetadataTable,
      IndexName: prefixMonthGSIName,
      KeyConditionExpression: '#prefix= :prefix',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
      },
      ExpressionAttributeValues: {
        ':prefix': `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
      },
      ScanIndexForward: false,
    }).resolves({
      Items: [
        {
          ...MOCK_USER_ATTRIBUTE,
          month: '#202302',
        },
        {
          ...MOCK_USER_ATTRIBUTE,
          month: '#202301',
        },
        {
          ...MOCK_USER_ATTRIBUTE,
          month: '#202302',
          valueType: MetadataValueType.STRING,
          summary: {
            ...MOCK_USER_ATTRIBUTE.summary,
            valueEnum: [
              {
                count: 1032,
                value: 'value-02',
              },
            ],
            hasData: true,
          },
        },
        {
          ...MOCK_USER_ATTRIBUTE,
          month: '#202301',
          valueType: MetadataValueType.STRING,
          summary: {
            ...MOCK_USER_ATTRIBUTE.summary,
            valueEnum: [
              {
                count: 1032,
                value: 'value-02',
              },
            ],
            hasData: true,
          },
        },
        {
          ...MOCK_USER_ATTRIBUTE,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}1#${MetadataValueType.FLOAT}`,
          month: '#202312',
          name: `${MOCK_USER_ATTRIBUTE_NAME}1`,
          valueType: MetadataValueType.FLOAT,
          summary: {
            ...MOCK_USER_ATTRIBUTE.summary,
            valueEnum: [
              {
                count: 555,
                value: 'value-02',
              },
            ],
            hasData: false,
          },
        },
      ],
    });
    let res = await request(app)
      .get(`/api/metadata/user_attributes?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        items: [
          {
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}#${MetadataValueType.STRING}`,
            month: '#202302',
            prefix: `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            name: MOCK_USER_ATTRIBUTE_NAME,
            description: {
              'en-US': 'mock preset user attribute description in built-in',
              'zh-CN': '内置用户属性的描述',
            },
            displayName: 'display name of user parameter user-attribute-mock',
            category: 'user',
            hasData: true,
            metadataSource: MetadataSource.PRESET,
            valueType: MetadataValueType.STRING,
            values: [
              { value: 'value-01', displayValue: 'value-01' },
              { value: 'value-02', displayValue: `display name of dictionary ${MOCK_USER_ATTRIBUTE_NAME}(String) value-02` },
              { value: 'value-03', displayValue: 'value-03' },
            ],
          },
          {
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}1#${MetadataValueType.FLOAT}`,
            month: '#202312',
            prefix: `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            name: `${MOCK_USER_ATTRIBUTE_NAME}1`,
            description: {
              'en-US': '',
              'zh-CN': '',
            },
            displayName: `${MOCK_USER_ATTRIBUTE_NAME}1`,
            category: 'user',
            metadataSource: MetadataSource.CUSTOM,
            valueType: MetadataValueType.FLOAT,
            hasData: false,
            values: [
              { value: 'value-02', displayValue: 'value-02' },
            ],
          },
        ],
        totalCount: 2,
      },
    });

    // Mock DynamoDB error
    ddbMock.on(QueryCommand).rejects(new Error('Mock DynamoDB error'));
    res = await request(app)
      .get(`/api/metadata/user_attributes?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);

    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });

  afterAll((done) => {
    server.close();
    done();
  });
});