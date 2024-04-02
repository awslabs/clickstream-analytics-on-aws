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

import { ConditionCategory, ExplorePathNodeType, MetadataParameterType, MetadataPlatform, MetadataSource, MetadataValueType, ConditionCategoryFrontend } from '@aws/clickstream-base-lib';
import {
  SFNClient, StartExecutionCommand,
} from '@aws-sdk/client-sfn';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import request from 'supertest';
import { metadataEventExistedMock, MOCK_APP_ID, MOCK_EVENT_PARAMETER_NAME, MOCK_EVENT_NAME, MOCK_PROJECT_ID, MOCK_TOKEN, MOCK_USER_ATTRIBUTE_NAME, tokenMock } from './ddb-mock';
import { MOCK_EVENT, MOCK_EVENT_PARAMETER, MOCK_EVENT_PARAMETER_V2, MOCK_EVENT_V2, MOCK_USER_ATTRIBUTE, MOCK_USER_ATTRIBUTE_V2, displayDataMock, getAllEventParametersInput, mockPipeline } from './metadata-mock';
import { analyticsMetadataTable, prefixMonthGSIName } from '../../common/constants';
import { app, server } from '../../index';
import 'aws-sdk-client-mock-jest';

const ddbMock = mockClient(DynamoDBDocumentClient);
const SFNMock = mockClient(SFNClient);

describe('Metadata Event test', () => {
  beforeEach(() => {
    process.env.METADATA_CACHE = 'false';
    ddbMock.reset();
    displayDataMock(ddbMock);
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2023-03-02'));
    mockPipeline(ddbMock);
  });
  it('Get metadata event by name', async () => {
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
    ddbMock.on(QueryCommand, getAllEventParametersInput()).resolves({
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
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}#${ConditionCategory.EVENT}#${MOCK_EVENT_PARAMETER_NAME}#${MetadataValueType.STRING}`,
            month: '#202303',
            prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            category: ConditionCategory.EVENT,
            metadataSource: MetadataSource.PRESET,
            name: MOCK_EVENT_PARAMETER_NAME,
            eventName: MOCK_EVENT_NAME,
            description: {
              'en-US': 'Store where applications are installed',
              'zh-CN': '安装应用程序的商店',
            },
            displayName: {
              'en-US': 'App install source',
              'zh-CN': '应用程序安装商店',
            },
            parameterType: 'Public',
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
        sdkName: ['Clickstream SDK'],
        sdkVersion: ['v1.0.0', 'v1.0.1'],
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        name: MOCK_EVENT_NAME,
        metadataSource: MetadataSource.PRESET,
        dataVolumeLastDay: 1,
        displayName: {
          'en-US': `display name of event ${MOCK_EVENT_NAME}`,
          'zh-CN': `${MOCK_EVENT_NAME}显示名称`,
        },
        description: {
          'en-US': `Description of event ${MOCK_EVENT_NAME}`,
          'zh-CN': `${MOCK_EVENT_NAME}说明`,
        },
      },
    });
  });
  it('Get non-existent metadata event', async () => {
    ddbMock.on(QueryCommand, {
      TableName: analyticsMetadataTable,
      KeyConditionExpression: '#id= :id AND begins_with(#month, :month)',
      ExpressionAttributeNames: {
        '#id': 'id',
        '#month': 'month',
      },
      ExpressionAttributeValues: {
        ':id': `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}NoExist`,
        ':month': '#',
      },
      ScanIndexForward: false,
    }).resolves({
      Items: [],
    });
    const res = await request(app)
      .get(`/api/metadata/event/${MOCK_EVENT_NAME}NoExist?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'Event not found',
    });
  });
  it('Get preset event when no data in DDB', async () => {
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
      Items: [],
    });
    ddbMock.on(QueryCommand, getAllEventParametersInput()).resolves({
      Items: [],
    });
    const res = await request(app)
      .get(`/api/metadata/event/${MOCK_EVENT_NAME}?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.month).toEqual('#202303');
    expect(res.body.data.associatedParameters.length).toEqual(57);
    expect(res.body.data.associatedParameters).toContainEqual({
      appId: MOCK_APP_ID,
      category: ConditionCategoryFrontend.APP_INFO,
      description: {
        'en-US': 'Store where applications are installed',
        'zh-CN': '安装应用程序的商店',
      },
      displayName: {
        'en-US': 'App install source',
        'zh-CN': '应用程序安装商店',
      },
      eventName: '_first_open',
      id: `project_8888_8888#app_7777_7777#_first_open#${ConditionCategoryFrontend.APP_INFO}#install_source#string`,
      metadataSource: MetadataSource.PRESET,
      month: '#202303',
      name: MOCK_EVENT_PARAMETER_NAME,
      parameterType: MetadataParameterType.PUBLIC,
      platform: [],
      prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
      projectId: MOCK_PROJECT_ID,
      valueType: MetadataValueType.STRING,
      values: [],
    });
    expect(res.body.data.metadataSource).toEqual(MetadataSource.PRESET);
    expect(res.body.data.displayName).toEqual({
      'en-US': `display name of event ${MOCK_EVENT_NAME}`,
      'zh-CN': `${MOCK_EVENT_NAME}显示名称`,
    });
    expect(res.body.data.description).toEqual({
      'en-US': `Description of event ${MOCK_EVENT_NAME}`,
      'zh-CN': `${MOCK_EVENT_NAME}说明`,
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
            displayName: {
              'en-US': `display name of event ${MOCK_EVENT_NAME}1`,
              'zh-CN': `${MOCK_EVENT_NAME}1显示名称`,
            },
            description: {
              'en-US': `Description of event ${MOCK_EVENT_NAME}1`,
              'zh-CN': `${MOCK_EVENT_NAME}1说明`,
            },
            metadataSource: MetadataSource.CUSTOM,
            hasData: true,
            dataVolumeLastDay: 1,
            associatedParameters: [],
            platform: [MetadataPlatform.ANDROID, MetadataPlatform.IOS],
            sdkName: ['Clickstream SDK'],
            sdkVersion: ['v1.0.0', 'v1.0.1'],
          },
          {
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}2`,
            month: '#202301',
            prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            name: `${MOCK_EVENT_NAME}2`,
            displayName: {
              'en-US': `${MOCK_EVENT_NAME}2`,
              'zh-CN': `${MOCK_EVENT_NAME}2`,
            },
            description: {
              'en-US': '',
              'zh-CN': '',
            },
            metadataSource: MetadataSource.CUSTOM,
            hasData: false,
            dataVolumeLastDay: 0,
            associatedParameters: [],
            platform: [MetadataPlatform.WEB],
            sdkName: ['Clickstream SDK'],
            sdkVersion: ['v1.0.0', 'v1.0.1'],
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
            displayName: {
              'en-US': `display name of event ${MOCK_EVENT_NAME}1`,
              'zh-CN': `${MOCK_EVENT_NAME}1显示名称`,
            },
            description: {
              'en-US': `Description of event ${MOCK_EVENT_NAME}1`,
              'zh-CN': `${MOCK_EVENT_NAME}1说明`,
            },
            metadataSource: MetadataSource.CUSTOM,
            hasData: false,
            dataVolumeLastDay: 0,
            associatedParameters: [],
            platform: [MetadataPlatform.ANDROID, MetadataPlatform.IOS],
            sdkName: ['Clickstream SDK'],
            sdkVersion: ['v1.0.0', 'v1.0.1'],
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
    ddbMock.on(QueryCommand, getAllEventParametersInput()).resolves({
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
            displayName: {
              'en-US': `display name of event ${MOCK_EVENT_NAME}1`,
              'zh-CN': `${MOCK_EVENT_NAME}1显示名称`,
            },
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
                metadataSource: MetadataSource.CUSTOM,
                name: `${MOCK_EVENT_PARAMETER_NAME}11`,
                eventName: `${MOCK_EVENT_NAME}1`,
                description: {
                  'en-US': '',
                  'zh-CN': '',
                },
                displayName: {
                  'en-US': `[event] ${MOCK_EVENT_PARAMETER_NAME}11`,
                  'zh-CN': `[event] ${MOCK_EVENT_PARAMETER_NAME}11`,
                },
                parameterType: MetadataParameterType.PRIVATE,
                platform: [MetadataPlatform.ANDROID],
                valueType: MetadataValueType.INTEGER,
                category: ConditionCategory.EVENT,
                values: [
                  { value: 'value-02', displayValue: 'value-02' },
                  { value: 'value-01', displayValue: `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME}11(Integer) value-01` },
                ],
              },
              {
                id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1#${MOCK_EVENT_PARAMETER_NAME}12#${MetadataValueType.DOUBLE}`,
                month: '#202301',
                prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
                appId: MOCK_APP_ID,
                projectId: MOCK_PROJECT_ID,
                metadataSource: MetadataSource.CUSTOM,
                name: `${MOCK_EVENT_PARAMETER_NAME}12`,
                eventName: `${MOCK_EVENT_NAME}1`,
                displayName: {
                  'en-US': `[${ConditionCategory.EVENT}] ${MOCK_EVENT_PARAMETER_NAME}12`,
                  'zh-CN': `[${ConditionCategory.EVENT}] ${MOCK_EVENT_PARAMETER_NAME}12`,
                },
                description: {
                  'en-US': '',
                  'zh-CN': '',
                },
                parameterType: MetadataParameterType.PRIVATE,
                platform: [MetadataPlatform.IOS],
                valueType: MetadataValueType.DOUBLE,
                category: ConditionCategory.EVENT,
                values: [
                  { value: 'value-03', displayValue: `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME}12(Double) value-03` },
                ],
              },
            ],
            platform: [MetadataPlatform.ANDROID, MetadataPlatform.IOS],
            sdkName: ['Clickstream SDK'],
            sdkVersion: ['v1.0.0', 'v1.0.1'],
          },
          {
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}2`,
            prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            name: `${MOCK_EVENT_NAME}2`,
            displayName: {
              'en-US': `${MOCK_EVENT_NAME}2`,
              'zh-CN': `${MOCK_EVENT_NAME}2`,
            },
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
            sdkName: ['Clickstream SDK'],
            sdkVersion: ['v1.0.0', 'v1.0.1'],
          },
        ],
        totalCount: 2,
      },
    });
  });
  it('Get metadata event list when no data in DDB', async () => {
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
      Items: [],
    });
    const res = await request(app)
      .get(`/api/metadata/events?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.totalCount).toEqual(17);
  });

  afterAll((done) => {
    server.close();
    done();
  });
});

describe('Metadata Event test V2', () => {
  beforeEach(() => {
    process.env.METADATA_CACHE = 'false';
    ddbMock.reset();
    displayDataMock(ddbMock);
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2023-03-02'));
    mockPipeline(ddbMock, 'v1.1.5');
  });
  it('Get metadata event by name', async () => {
    ddbMock.on(GetCommand, {
      TableName: analyticsMetadataTable,
      Key: {
        id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
        month: 'latest',
      },
      ProjectionExpression: '#id, #month, #prefix, projectId, appId, #name, eventName, category, valueType, summary',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
        '#id': 'id',
        '#month': 'month',
        '#name': 'name',
      },
    }).resolves({
      Item: { ...MOCK_EVENT_V2 },
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
        month: 'latest',
        associatedParameters: [
          {
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${ConditionCategory.EVENT}#${MOCK_EVENT_PARAMETER_NAME}#${MetadataValueType.STRING}`,
            month: 'latest',
            prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            category: ConditionCategory.EVENT,
            metadataSource: MetadataSource.PRESET,
            name: MOCK_EVENT_PARAMETER_NAME,
            description: {
              'en-US': 'Store where applications are installed',
              'zh-CN': '安装应用程序的商店',
            },
            displayName: {
              'en-US': 'App install source',
              'zh-CN': '应用程序安装商店',
            },
            parameterType: 'Public',
            platform: [],
            valueType: MetadataValueType.STRING,
            values: [],
          },
        ],
        hasData: true,
        platform: [MetadataPlatform.ANDROID, MetadataPlatform.IOS],
        sdkName: ['Clickstream SDK'],
        sdkVersion: ['v1.0.0', 'v1.0.1'],
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        name: MOCK_EVENT_NAME,
        metadataSource: MetadataSource.PRESET,
        dataVolumeLastDay: 43465,
        displayName: {
          'en-US': `display name of event ${MOCK_EVENT_NAME}`,
          'zh-CN': `${MOCK_EVENT_NAME}显示名称`,
        },
        description: {
          'en-US': `Description of event ${MOCK_EVENT_NAME}`,
          'zh-CN': `${MOCK_EVENT_NAME}说明`,
        },
      },
    });
  });
  it('Get preset event when no data in DDB', async () => {
    ddbMock.on(GetCommand, {
      TableName: analyticsMetadataTable,
      Key: {
        id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
        month: 'latest',
      },
      ProjectionExpression: '#id, #month, #prefix, projectId, appId, #name, eventName, category, valueType, summary',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
        '#id': 'id',
        '#month': 'month',
        '#name': 'name',
      },
    }).resolves({
      Item: {},
    });
    const res = await request(app)
      .get(`/api/metadata/event/${MOCK_EVENT_NAME}?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.month).toEqual('latest');
    expect(res.body.data.associatedParameters.length).toEqual(57);
    expect(res.body.data.associatedParameters).toContainEqual({
      id: `project_8888_8888#app_7777_7777#${ConditionCategoryFrontend.APP_INFO}#install_source#string`,
      month: 'latest',
      prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
      projectId: MOCK_PROJECT_ID,
      appId: MOCK_APP_ID,
      name: MOCK_EVENT_PARAMETER_NAME,
      category: ConditionCategoryFrontend.APP_INFO,
      valueType: MetadataValueType.STRING,
      platform: [],
      displayName: {
        'en-US': 'App install source',
        'zh-CN': '应用程序安装商店',
      },
      description: {
        'en-US': 'Store where applications are installed',
        'zh-CN': '安装应用程序的商店',
      },
      metadataSource: MetadataSource.PRESET,
      parameterType: MetadataParameterType.PUBLIC,
      values: [],
    });
    expect(res.body.data.metadataSource).toEqual(MetadataSource.PRESET);
    expect(res.body.data.displayName).toEqual({
      'en-US': `display name of event ${MOCK_EVENT_NAME}`,
      'zh-CN': `${MOCK_EVENT_NAME}显示名称`,
    });
    expect(res.body.data.description).toEqual({
      'en-US': `Description of event ${MOCK_EVENT_NAME}`,
      'zh-CN': `${MOCK_EVENT_NAME}说明`,
    });
  });
  it('Get metadata event list', async () => {
    ddbMock.on(QueryCommand, {
      TableName: analyticsMetadataTable,
      IndexName: prefixMonthGSIName,
      KeyConditionExpression: '#prefix= :prefix AND begins_with(#month, :month)',
      ProjectionExpression: '#id, #month, #prefix, projectId, appId, #name, eventName, category, valueType, summary',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
        '#id': 'id',
        '#month': 'month',
        '#name': 'name',
      },
      ExpressionAttributeValues: {
        ':prefix': `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
        ':month': 'latest',
      },
      ScanIndexForward: false,
    }).resolves({
      Items: [
        {
          ...MOCK_EVENT_V2,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
          name: `${MOCK_EVENT_NAME}1`,
        },
        {
          ...MOCK_EVENT_V2,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}2`,
          name: `${MOCK_EVENT_NAME}2`,
          summary: {
            ...MOCK_EVENT_V2.summary,
            platform: [MetadataPlatform.WEB],
            latestCount: 0,
          },
        },
      ],
    });
    const res = await request(app)
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
            month: 'latest',
            prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            name: `${MOCK_EVENT_NAME}1`,
            displayName: {
              'en-US': `display name of event ${MOCK_EVENT_NAME}1`,
              'zh-CN': `${MOCK_EVENT_NAME}1显示名称`,
            },
            description: {
              'en-US': `Description of event ${MOCK_EVENT_NAME}1`,
              'zh-CN': `${MOCK_EVENT_NAME}1说明`,
            },
            metadataSource: MetadataSource.CUSTOM,
            hasData: true,
            dataVolumeLastDay: 43465,
            associatedParameters: [],
            platform: [MetadataPlatform.ANDROID, MetadataPlatform.IOS],
            sdkName: ['Clickstream SDK'],
            sdkVersion: ['v1.0.0', 'v1.0.1'],
          },
          {
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}2`,
            month: 'latest',
            prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            name: `${MOCK_EVENT_NAME}2`,
            displayName: {
              'en-US': `${MOCK_EVENT_NAME}2`,
              'zh-CN': `${MOCK_EVENT_NAME}2`,
            },
            description: {
              'en-US': '',
              'zh-CN': '',
            },
            metadataSource: MetadataSource.CUSTOM,
            hasData: true,
            dataVolumeLastDay: 0,
            associatedParameters: [],
            platform: [MetadataPlatform.WEB],
            sdkName: ['Clickstream SDK'],
            sdkVersion: ['v1.0.0', 'v1.0.1'],
          },
        ],
        totalCount: 2,
      },
    });
  });
  it('Get metadata event list when no data in DDB', async () => {
    ddbMock.on(QueryCommand, {
      TableName: analyticsMetadataTable,
      IndexName: prefixMonthGSIName,
      KeyConditionExpression: '#prefix= :prefix AND begins_with(#month, :month)',
      ProjectionExpression: '#id, #month, #prefix, projectId, appId, #name, eventName, category, valueType, summary',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
        '#id': 'id',
        '#month': 'month',
        '#name': 'name',
      },
      ExpressionAttributeValues: {
        ':prefix': `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
        ':month': 'latest',
      },
      ScanIndexForward: false,
    }).resolves({
      Items: [],
    });
    const res = await request(app)
      .get(`/api/metadata/events?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.totalCount).toEqual(17);
  });

  afterAll((done) => {
    server.close();
    done();
  });
});

describe('Metadata Event Attribute test', () => {
  beforeEach(() => {
    process.env.METADATA_CACHE = 'false';
    ddbMock.reset();
    displayDataMock(ddbMock);
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2023-03-02'));
    mockPipeline(ddbMock);
  });
  it('Get metadata event attribute by name', async () => {
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2023-02-02'));
    ddbMock.on(QueryCommand, getAllEventParametersInput()).resolves({
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
      .get(`/api/metadata/event_parameter?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}&name=${MOCK_EVENT_PARAMETER_NAME}&category=${ConditionCategory.EVENT}&type=${MetadataValueType.STRING}`);
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
            displayName: {
              'en-US': `display name of event ${MOCK_EVENT_NAME}`,
              'zh-CN': `${MOCK_EVENT_NAME}显示名称`,
            },
            description: {
              'en-US': `Description of event ${MOCK_EVENT_NAME}`,
              'zh-CN': `${MOCK_EVENT_NAME}说明`,
            },
          },
          {
            name: `${MOCK_EVENT_NAME}1`,
            prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            metadataSource: MetadataSource.CUSTOM,
            displayName: {
              'en-US': `display name of event ${MOCK_EVENT_NAME}1`,
              'zh-CN': `${MOCK_EVENT_NAME}1显示名称`,
            },
            description: {
              'en-US': `Description of event ${MOCK_EVENT_NAME}1`,
              'zh-CN': `${MOCK_EVENT_NAME}1说明`,
            },
          },
        ],
        id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}#${ConditionCategory.EVENT}#${MOCK_EVENT_PARAMETER_NAME}#${MetadataValueType.STRING}`,
        month: '#202302',
        prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        name: MOCK_EVENT_PARAMETER_NAME,
        description: {
          'en-US': 'Store where applications are installed',
          'zh-CN': '安装应用程序的商店',
        },
        displayName: {
          'en-US': 'App install source',
          'zh-CN': '应用程序安装商店',
        },
        eventName: '',
        category: ConditionCategory.EVENT,
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
    ddbMock.on(QueryCommand, getAllEventParametersInput()).resolves({
      Items: [],
    });
    const res = await request(app)
      .get(`/api/metadata/event_parameter?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}&name=${MOCK_EVENT_PARAMETER_NAME}NoExist&category=${ConditionCategory.EVENT}&type=String`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'Event attribute not found',
    });
  });
  it('Get metadata event attribute by name when no data in DDB', async () => {
    ddbMock.on(QueryCommand, getAllEventParametersInput()).resolves({
      Items: [],
    });
    const res = await request(app)
      .get(`/api/metadata/event_parameter?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}&name=${MOCK_EVENT_PARAMETER_NAME}&category=${ConditionCategoryFrontend.APP_INFO}&type=${MetadataValueType.STRING}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.id).toEqual(`${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}#${ConditionCategoryFrontend.APP_INFO}#${MOCK_EVENT_PARAMETER_NAME}#${MetadataValueType.STRING}`);
    expect(res.body.data.month).toEqual('#202303');
    expect(res.body.data.associatedEvents.length).toEqual(17);
    expect(res.body.data.associatedEvents).toContainEqual({
      description: {
        'en-US': 'A new session start when a user first open the App/Web or a user returns to the app after the `sessionTimeoutDuration` (default value is 30 minutes) of inactivity period',
        'zh-CN': '当用户首次打开App/Web或用户不活跃超过 `sessionTimeoutDuration` (默认为30分钟）后返回App时会新生成一个会话',
      },
      displayName: {
        'en-US': 'Session start',
        'zh-CN': '会话开始',
      },
      id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#_session_start`,
      metadataSource: MetadataSource.PRESET,
      name: '_session_start',
      appId: MOCK_APP_ID,
      prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
      projectId: MOCK_PROJECT_ID,
    });
    expect(res.body.data.metadataSource).toEqual(MetadataSource.PRESET);
    expect(res.body.data.parameterType).toEqual(MetadataParameterType.PUBLIC);
    expect(res.body.data.valueType).toEqual(MetadataValueType.STRING);
    expect(res.body.data.displayName).toEqual({
      'en-US': 'App install source',
      'zh-CN': '应用程序安装商店',
    });
    expect(res.body.data.description).toEqual({
      'en-US': 'Store where applications are installed',
      'zh-CN': '安装应用程序的商店',
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
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1#${ConditionCategory.EVENT}#${MOCK_EVENT_PARAMETER_NAME}1#${MetadataValueType.FLOAT}`,
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
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}#${ConditionCategory.EVENT}#${MOCK_EVENT_PARAMETER_NAME}#${MetadataValueType.STRING}`,
            month: '#202302',
            prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            name: MOCK_EVENT_PARAMETER_NAME,
            description: {
              'en-US': 'Store where applications are installed',
              'zh-CN': '安装应用程序的商店',
            },
            displayName: {
              'en-US': 'App install source',
              'zh-CN': '应用程序安装商店',
            },
            eventName: MOCK_EVENT_NAME,
            category: ConditionCategory.EVENT,
            metadataSource: MetadataSource.PRESET,
            parameterType: MetadataParameterType.PUBLIC,
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
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1#${ConditionCategory.EVENT}#${MOCK_EVENT_PARAMETER_NAME}1#${MetadataValueType.FLOAT}`,
            month: '#202306',
            prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            name: `${MOCK_EVENT_PARAMETER_NAME}1`,
            description: {
              'en-US': '',
              'zh-CN': '',
            },
            displayName: {
              'en-US': `[${ConditionCategory.EVENT}] ${MOCK_EVENT_PARAMETER_NAME}1`,
              'zh-CN': `[${ConditionCategory.EVENT}] ${MOCK_EVENT_PARAMETER_NAME}1`,
            },
            eventName: `${MOCK_EVENT_NAME}1`,
            category: ConditionCategory.EVENT,
            metadataSource: MetadataSource.CUSTOM,
            parameterType: MetadataParameterType.PRIVATE,
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
  it('Get metadata event attribute list when no data in DDB', async () => {
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
      Items: [],
    });
    const res = await request(app)
      .get(`/api/metadata/event_parameters?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.totalCount).toEqual(80);
  });
  it('Get metadata event attribute for path nodes', async () => {
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
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#_page_view#${ConditionCategory.EVENT}#${ExplorePathNodeType.PAGE_TITLE}#${MetadataValueType.STRING}`,
          month: '#202302',
          eventName: '_page_view',
          name: ExplorePathNodeType.PAGE_TITLE,
          summary: {
            ...MOCK_EVENT_PARAMETER.summary,
            valueEnum: [
              {
                count: 103,
                value: '_page_title-01',
              },
              {
                count: 305,
                value: '_page_title-02',
              },
              {
                count: 505,
                value: '_page_title-03',
              },
            ],
          },
        },
        {
          ...MOCK_EVENT_PARAMETER,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#_page_view#${ConditionCategory.EVENT}#${ExplorePathNodeType.PAGE_URL}#${MetadataValueType.STRING}`,
          month: '#202302',
          eventName: '_page_view',
          name: ExplorePathNodeType.PAGE_URL,
          summary: {
            ...MOCK_EVENT_PARAMETER.summary,
            valueEnum: [
              {
                count: 103,
                value: '_page_url-01',
              },
              {
                count: 305,
                value: '_page_url-02',
              },
            ],
          },
        },
        {
          ...MOCK_EVENT_PARAMETER,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#_screen_view#${ConditionCategory.EVENT}#${ExplorePathNodeType.SCREEN_NAME}#${MetadataValueType.STRING}`,
          month: '#202302',
          eventName: '_screen_view',
          name: ExplorePathNodeType.SCREEN_NAME,
          summary: {
            ...MOCK_EVENT_PARAMETER.summary,
            valueEnum: [
              {
                count: 103,
                value: '_screen_name-01',
              },
              {
                count: 305,
                value: '_screen_name-02',
              },
            ],
          },
        },
        {
          ...MOCK_EVENT_PARAMETER,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#_screen_view#${ConditionCategory.EVENT}#${ExplorePathNodeType.SCREEN_ID}#${MetadataValueType.STRING}`,
          month: '#202302',
          eventName: '_screen_view',
          name: ExplorePathNodeType.SCREEN_ID,
          summary: {
            ...MOCK_EVENT_PARAMETER.summary,
            valueEnum: [
              {
                count: 103,
                value: '_screen_id-01',
              },
              {
                count: 305,
                value: '_screen_id-02',
              },
            ],
          },
        },
      ],
    });
    const res = await request(app)
      .get(`/api/metadata/pathNodes?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        pageTitles: [
          {
            displayValue: '_page_title-01',
            value: '_page_title-01',
          },
          {
            displayValue: '_page_title-02',
            value: '_page_title-02',
          },
          {
            displayValue: '_page_title-03',
            value: '_page_title-03',
          },
        ],
        pageUrls: [
          {
            displayValue: '_page_url-01',
            value: '_page_url-01',
          },
          {
            displayValue: '_page_url-02',
            value: '_page_url-02',
          },
        ],
        screenIds: [
          {
            displayValue: '_screen_id-01',
            value: '_screen_id-01',
          },
          {
            displayValue: '_screen_id-02',
            value: '_screen_id-02',
          },
        ],
        screenNames: [
          {
            displayValue: '_screen_name-01',
            value: '_screen_name-01',
          },
          {
            displayValue: '_screen_name-02',
            value: '_screen_name-02',
          },
        ],
      },
    });
  });

  afterAll((done) => {
    server.close();
    done();
  });
});

describe('Metadata Event Attribute test V2', () => {
  beforeEach(() => {
    process.env.METADATA_CACHE = 'false';
    ddbMock.reset();
    displayDataMock(ddbMock);
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2023-03-02'));
    mockPipeline(ddbMock, 'v1.1.5');
  });
  it('Get metadata event attribute by name', async () => {
    ddbMock.on(GetCommand, {
      TableName: analyticsMetadataTable,
      Key: {
        id: `${MOCK_EVENT_PARAMETER_V2.id}`,
        month: 'latest',
      },
      ProjectionExpression: '#id, #month, #prefix, projectId, appId, #name, eventName, category, valueType, summary',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
        '#id': 'id',
        '#month': 'month',
        '#name': 'name',
      },
    }).resolves({
      Item: {
        ...MOCK_EVENT_PARAMETER_V2,
      },
    });
    const res = await request(app)
      .get(`/api/metadata/event_parameter?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}&name=${MOCK_EVENT_PARAMETER_NAME}&category=${ConditionCategory.EVENT}&type=${MetadataValueType.STRING}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        associatedEvents: [
          {
            name: MOCK_EVENT_NAME,
            month: 'latest',
            prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            metadataSource: MetadataSource.PRESET,
            displayName: {
              'en-US': `display name of event ${MOCK_EVENT_NAME}`,
              'zh-CN': `${MOCK_EVENT_NAME}显示名称`,
            },
            description: {
              'en-US': `Description of event ${MOCK_EVENT_NAME}`,
              'zh-CN': `${MOCK_EVENT_NAME}说明`,
            },
            dataVolumeLastDay: 0,
            hasData: false,
            platform: [],
            sdkName: [],
            sdkVersion: [],
          },
        ],
        id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${ConditionCategory.EVENT}#${MOCK_EVENT_PARAMETER_NAME}#${MetadataValueType.STRING}`,
        month: 'latest',
        prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        name: MOCK_EVENT_PARAMETER_NAME,
        description: {
          'en-US': 'Store where applications are installed',
          'zh-CN': '安装应用程序的商店',
        },
        displayName: {
          'en-US': 'App install source',
          'zh-CN': '应用程序安装商店',
        },
        eventName: '',
        eventNames: [MOCK_EVENT_NAME],
        category: ConditionCategory.EVENT,
        metadataSource: MetadataSource.PRESET,
        parameterType: MetadataParameterType.PUBLIC,
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
  it('Get metadata event attribute list', async () => {
    ddbMock.on(QueryCommand, {
      TableName: analyticsMetadataTable,
      IndexName: prefixMonthGSIName,
      KeyConditionExpression: '#prefix= :prefix AND begins_with(#month, :month)',
      ProjectionExpression: '#id, #month, #prefix, projectId, appId, #name, category, valueType, summary',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
        '#id': 'id',
        '#month': 'month',
        '#name': 'name',
      },
      ExpressionAttributeValues: {
        ':prefix': `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
        ':month': 'latest',
      },
      ScanIndexForward: false,
    }).resolves({
      Items: [
        {
          ...MOCK_EVENT_PARAMETER_V2,
        },
        {
          ...MOCK_EVENT_PARAMETER_V2,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${ConditionCategory.EVENT}#${MOCK_EVENT_PARAMETER_NAME}1#${MetadataValueType.FLOAT}`,
          name: `${MOCK_EVENT_PARAMETER_NAME}1`,
          valueType: MetadataValueType.FLOAT,
          summary: {
            ...MOCK_EVENT_PARAMETER_V2.summary,
            associatedEvents: [`${MOCK_EVENT_NAME}1`],
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
    const res = await request(app)
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
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${ConditionCategory.EVENT}#${MOCK_EVENT_PARAMETER_NAME}#${MetadataValueType.STRING}`,
            month: 'latest',
            prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            name: MOCK_EVENT_PARAMETER_NAME,
            description: {
              'en-US': 'Store where applications are installed',
              'zh-CN': '安装应用程序的商店',
            },
            displayName: {
              'en-US': 'App install source',
              'zh-CN': '应用程序安装商店',
            },
            eventName: '',
            eventNames: [MOCK_EVENT_NAME],
            category: ConditionCategory.EVENT,
            metadataSource: MetadataSource.PRESET,
            parameterType: MetadataParameterType.PUBLIC,
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
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${ConditionCategory.EVENT}#${MOCK_EVENT_PARAMETER_NAME}1#${MetadataValueType.FLOAT}`,
            month: 'latest',
            prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            name: `${MOCK_EVENT_PARAMETER_NAME}1`,
            description: {
              'en-US': '',
              'zh-CN': '',
            },
            displayName: {
              'en-US': `[${ConditionCategory.EVENT}] ${MOCK_EVENT_PARAMETER_NAME}1`,
              'zh-CN': `[${ConditionCategory.EVENT}] ${MOCK_EVENT_PARAMETER_NAME}1`,
            },
            eventName: '',
            eventNames: [`${MOCK_EVENT_NAME}1`],
            category: ConditionCategory.EVENT,
            metadataSource: MetadataSource.CUSTOM,
            parameterType: MetadataParameterType.PRIVATE,
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
  });
  it('Get metadata event attribute list when no data in DDB', async () => {
    ddbMock.on(QueryCommand, {
      TableName: analyticsMetadataTable,
      IndexName: prefixMonthGSIName,
      KeyConditionExpression: '#prefix= :prefix AND begins_with(#month, :month)',
      ProjectionExpression: '#id, #month, #prefix, projectId, appId, #name, category, valueType, summary',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
        '#id': 'id',
        '#month': 'month',
        '#name': 'name',
      },
      ExpressionAttributeValues: {
        ':prefix': `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
        ':month': 'latest',
      },
      ScanIndexForward: false,
    }).resolves({
      Items: [],
    });
    const res = await request(app)
      .get(`/api/metadata/event_parameters?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.totalCount).toEqual(80);
  });
  it('Get metadata event attribute for path nodes', async () => {
    ddbMock.on(QueryCommand, {
      TableName: analyticsMetadataTable,
      IndexName: prefixMonthGSIName,
      KeyConditionExpression: '#prefix= :prefix AND begins_with(#month, :month)',
      ProjectionExpression: '#id, #month, #prefix, projectId, appId, #name, category, valueType, summary',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
        '#id': 'id',
        '#month': 'month',
        '#name': 'name',
      },
      ExpressionAttributeValues: {
        ':prefix': `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
        ':month': 'latest',
      },
      ScanIndexForward: false,
    }).resolves({
      Items: [
        {
          ...MOCK_EVENT_PARAMETER_V2,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${ConditionCategory.EVENT}#${ExplorePathNodeType.PAGE_TITLE}#${MetadataValueType.STRING}`,
          name: ExplorePathNodeType.PAGE_TITLE,
          summary: {
            ...MOCK_EVENT_PARAMETER_V2.summary,
            associatedEvents: ['_page_view', '_page_view1'],
            valueEnum: [
              {
                count: 103,
                value: '_page_title-01',
              },
              {
                count: 305,
                value: '_page_title-02',
              },
              {
                count: 505,
                value: '_page_title-03',
              },
            ],
          },
        },
        {
          ...MOCK_EVENT_PARAMETER_V2,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${ConditionCategory.EVENT}#${ExplorePathNodeType.PAGE_URL}#${MetadataValueType.STRING}`,
          name: ExplorePathNodeType.PAGE_URL,
          summary: {
            ...MOCK_EVENT_PARAMETER_V2.summary,
            associatedEvents: ['_page_view', '_page_view1'],
            valueEnum: [
              {
                count: 103,
                value: '_page_url-01',
              },
              {
                count: 305,
                value: '_page_url-02',
              },
            ],
          },
        },
        {
          ...MOCK_EVENT_PARAMETER_V2,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${ConditionCategory.EVENT}#${ExplorePathNodeType.SCREEN_NAME}#${MetadataValueType.STRING}`,
          name: ExplorePathNodeType.SCREEN_NAME,
          summary: {
            ...MOCK_EVENT_PARAMETER_V2.summary,
            associatedEvents: ['_screen_view', '_screen_view1'],
            valueEnum: [
              {
                count: 103,
                value: '_screen_name-01',
              },
              {
                count: 305,
                value: '_screen_name-02',
              },
            ],
          },
        },
        {
          ...MOCK_EVENT_PARAMETER_V2,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${ConditionCategory.EVENT}#${ExplorePathNodeType.SCREEN_ID}#${MetadataValueType.STRING}`,
          name: ExplorePathNodeType.SCREEN_ID,
          summary: {
            ...MOCK_EVENT_PARAMETER_V2.summary,
            associatedEvents: ['_screen_view', '_screen_view1'],
            valueEnum: [
              {
                count: 103,
                value: '_screen_id-01',
              },
              {
                count: 305,
                value: '_screen_id-02',
              },
            ],
          },
        },
      ],
    });
    const res = await request(app)
      .get(`/api/metadata/pathNodes?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        pageTitles: [
          {
            displayValue: '_page_title-01',
            value: '_page_title-01',
          },
          {
            displayValue: '_page_title-02',
            value: '_page_title-02',
          },
          {
            displayValue: '_page_title-03',
            value: '_page_title-03',
          },
        ],
        pageUrls: [
          {
            displayValue: '_page_url-01',
            value: '_page_url-01',
          },
          {
            displayValue: '_page_url-02',
            value: '_page_url-02',
          },
        ],
        screenIds: [
          {
            displayValue: '_screen_id-01',
            value: '_screen_id-01',
          },
          {
            displayValue: '_screen_id-02',
            value: '_screen_id-02',
          },
        ],
        screenNames: [
          {
            displayValue: '_screen_name-01',
            value: '_screen_name-01',
          },
          {
            displayValue: '_screen_name-02',
            value: '_screen_name-02',
          },
        ],
      },
    });
  });

  afterAll((done) => {
    server.close();
    done();
  });
});

describe('Metadata User Attribute test', () => {
  beforeEach(() => {
    process.env.METADATA_CACHE = 'false';
    ddbMock.reset();
    displayDataMock(ddbMock);
    jest.useFakeTimers().setSystemTime(new Date('2023-02-02'));
    mockPipeline(ddbMock);
  });
  it('Get metadata user attribute list', async () => {
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
          },
        },
        {
          ...MOCK_USER_ATTRIBUTE,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${ConditionCategory.USER_OUTER}#${MOCK_USER_ATTRIBUTE_NAME}1#${MetadataValueType.FLOAT}`,
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
          },
        },
      ],
    });
    const res = await request(app)
      .get(`/api/metadata/user_attributes?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        items: [
          {
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${ConditionCategory.USER_OUTER}#${MOCK_USER_ATTRIBUTE_NAME}#${MetadataValueType.STRING}`,
            month: '#202302',
            prefix: `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            name: MOCK_USER_ATTRIBUTE_NAME,
            displayName: {
              'en-US': `display name of user parameter ${MOCK_USER_ATTRIBUTE_NAME}`,
              'zh-CN': `${MOCK_USER_ATTRIBUTE_NAME}用户属性显示名称`,
            },
            description: {
              'en-US': `Description of user parameter ${MOCK_USER_ATTRIBUTE_NAME}`,
              'zh-CN': `${MOCK_USER_ATTRIBUTE_NAME}参数说明`,
            },
            category: ConditionCategory.USER_OUTER,
            metadataSource: MetadataSource.PRESET,
            valueType: MetadataValueType.STRING,
            values: [
              { value: 'value-01', displayValue: 'value-01' },
              { value: 'value-02', displayValue: `display name of dictionary ${MOCK_USER_ATTRIBUTE_NAME}(String) value-02` },
              { value: 'value-03', displayValue: 'value-03' },
            ],
          },
          {
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${ConditionCategory.USER_OUTER}#${MOCK_USER_ATTRIBUTE_NAME}1#${MetadataValueType.FLOAT}`,
            month: '#202312',
            prefix: `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            name: `${MOCK_USER_ATTRIBUTE_NAME}1`,
            description: {
              'en-US': '',
              'zh-CN': '',
            },
            displayName: {
              'en-US': `[${ConditionCategory.USER_OUTER}] ${MOCK_USER_ATTRIBUTE_NAME}1`,
              'zh-CN': `[${ConditionCategory.USER_OUTER}] ${MOCK_USER_ATTRIBUTE_NAME}1`,
            },
            category: ConditionCategory.USER_OUTER,
            metadataSource: MetadataSource.CUSTOM,
            valueType: MetadataValueType.FLOAT,
            values: [
              { value: 'value-02', displayValue: 'value-02' },
            ],
          },
        ],
        totalCount: 2,
      },
    });
  });
  it('Get metadata user attribute list when no data in DDB', async () => {
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
      Items: [],
    });
    const res = await request(app)
      .get(`/api/metadata/user_attributes?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.totalCount).toEqual(8);
  });

  afterAll((done) => {
    server.close();
    done();
  });
});

describe('Metadata User Attribute test V2', () => {
  beforeEach(() => {
    process.env.METADATA_CACHE = 'false';
    ddbMock.reset();
    displayDataMock(ddbMock);
    mockPipeline(ddbMock, 'v1.1.5');
  });
  it('Get metadata user attribute list', async () => {
    ddbMock.on(QueryCommand, {
      TableName: analyticsMetadataTable,
      IndexName: prefixMonthGSIName,
      KeyConditionExpression: '#prefix= :prefix AND begins_with(#month, :month)',
      ProjectionExpression: '#id, #month, #prefix, projectId, appId, #name, category, valueType, summary',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
        '#id': 'id',
        '#month': 'month',
        '#name': 'name',
      },
      ExpressionAttributeValues: {
        ':prefix': `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
        ':month': 'latest',
      },
      ScanIndexForward: false,
    }).resolves({
      Items: [
        {
          ...MOCK_USER_ATTRIBUTE_V2,
        },
        {
          ...MOCK_USER_ATTRIBUTE_V2,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${ConditionCategory.USER_OUTER}#${MOCK_USER_ATTRIBUTE_NAME}1#${MetadataValueType.FLOAT}`,
          name: `${MOCK_USER_ATTRIBUTE_NAME}1`,
          valueType: MetadataValueType.FLOAT,
          summary: {
            ...MOCK_USER_ATTRIBUTE_V2.summary,
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
    const res = await request(app)
      .get(`/api/metadata/user_attributes?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        items: [
          {
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${ConditionCategory.USER_OUTER}#${MOCK_USER_ATTRIBUTE_NAME}#${MetadataValueType.STRING}`,
            month: 'latest',
            prefix: `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            name: MOCK_USER_ATTRIBUTE_NAME,
            displayName: {
              'en-US': `display name of user parameter ${MOCK_USER_ATTRIBUTE_NAME}`,
              'zh-CN': `${MOCK_USER_ATTRIBUTE_NAME}用户属性显示名称`,
            },
            description: {
              'en-US': `Description of user parameter ${MOCK_USER_ATTRIBUTE_NAME}`,
              'zh-CN': `${MOCK_USER_ATTRIBUTE_NAME}参数说明`,
            },
            category: ConditionCategory.USER_OUTER,
            metadataSource: MetadataSource.PRESET,
            valueType: MetadataValueType.STRING,
            values: [
              { value: 'value-01', displayValue: 'value-01' },
              { value: 'value-02', displayValue: `display name of dictionary ${MOCK_USER_ATTRIBUTE_NAME}(String) value-02` },
              { value: 'value-03', displayValue: 'value-03' },
            ],
          },
          {
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${ConditionCategory.USER_OUTER}#${MOCK_USER_ATTRIBUTE_NAME}1#${MetadataValueType.FLOAT}`,
            month: 'latest',
            prefix: `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            name: `${MOCK_USER_ATTRIBUTE_NAME}1`,
            description: {
              'en-US': '',
              'zh-CN': '',
            },
            displayName: {
              'en-US': `[${ConditionCategory.USER_OUTER}] ${MOCK_USER_ATTRIBUTE_NAME}1`,
              'zh-CN': `[${ConditionCategory.USER_OUTER}] ${MOCK_USER_ATTRIBUTE_NAME}1`,
            },
            category: ConditionCategory.USER_OUTER,
            metadataSource: MetadataSource.CUSTOM,
            valueType: MetadataValueType.FLOAT,
            values: [
              { value: 'value-02', displayValue: 'value-02' },
            ],
          },
        ],
        totalCount: 2,
      },
    });
  });
  it('Get metadata user attribute list when no data in DDB', async () => {
    ddbMock.on(QueryCommand, {
      TableName: analyticsMetadataTable,
      IndexName: prefixMonthGSIName,
      KeyConditionExpression: '#prefix= :prefix AND begins_with(#month, :month)',
      ProjectionExpression: '#id, #month, #prefix, projectId, appId, #name, category, valueType, summary',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
        '#id': 'id',
        '#month': 'month',
        '#name': 'name',
      },
      ExpressionAttributeValues: {
        ':prefix': `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
        ':month': 'latest',
      },
      ScanIndexForward: false,
    }).resolves({
      Items: [],
    });
    const res = await request(app)
      .get(`/api/metadata/user_attributes?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.totalCount).toEqual(8);
  });

  afterAll((done) => {
    server.close();
    done();
  });
});

describe('Metadata Cache test', () => {
  beforeEach(() => {
    ddbMock.reset();
    displayDataMock(ddbMock);
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2023-03-02'));
    mockPipeline(ddbMock);
  });

  it('Get metadata event attribute list no cache', async () => {
    process.env.METADATA_CACHE = 'false';
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
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1#${ConditionCategory.EVENT}#${MOCK_EVENT_PARAMETER_NAME}1#${MetadataValueType.FLOAT}`,
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
    const res1 = await request(app)
      .get(`/api/metadata/event_parameters?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res1.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res1.statusCode).toBe(200);
    const res2 = await request(app)
      .get(`/api/metadata/event_parameters?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res2.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res2.statusCode).toBe(200);
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 4);
    process.env.METADATA_CACHE = 'true';
  });

  it('Get metadata event attribute list with cache', async () => {
    process.env.METADATA_CACHE = 'true';
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
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1#${ConditionCategory.EVENT}#${MOCK_EVENT_PARAMETER_NAME}1#${MetadataValueType.FLOAT}`,
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
    const res1 = await request(app)
      .get(`/api/metadata/event_parameters?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res1.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res1.statusCode).toBe(200);
    const res2 = await request(app)
      .get(`/api/metadata/event_parameters?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res2.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res2.statusCode).toBe(200);
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 3);
    process.env.METADATA_CACHE = 'true';
  });

  afterAll((done) => {
    server.close();
    done();
  });
});

describe('Metadata Display test', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  it('Update metadata display data', async () => {
    tokenMock(ddbMock, false);
    metadataEventExistedMock(ddbMock, MOCK_PROJECT_ID, MOCK_APP_ID, true);
    ddbMock.on(UpdateCommand).resolves({});
    ddbMock.on(QueryCommand).resolves({ Items: [] });
    const res = await request(app)
      .put('/api/metadata/display')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        id: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        displayName: {
          'en-US': 'display name of event event-mock',
          'zh-CN': `${MOCK_EVENT_NAME}显示名称`,
        },
        description: {
          'en-US': `Description of event ${MOCK_EVENT_NAME}`,
          'zh-CN': `${MOCK_EVENT_NAME}说明`,
        },
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      data: null,
      success: true,
      message: 'Updated success.',
    });
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 1);
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
    expect(res.body.message).toEqual('Parameter verification failed.');
  });

  it('Update display name is too long', async () => {
    tokenMock(ddbMock, false);
    metadataEventExistedMock(ddbMock, MOCK_PROJECT_ID, MOCK_APP_ID, true);
    ddbMock.on(UpdateCommand).resolves({});
    ddbMock.on(QueryCommand).resolves({ Items: [] });
    const res = await request(app)
      .put('/api/metadata/display')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        id: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        displayName: {
          'en-US': `${'a'.repeat(1025)}`,
          'zh-CN': `${MOCK_EVENT_NAME}显示名称`,
        },
        description: {
          'en-US': `Description of event ${MOCK_EVENT_NAME}`,
          'zh-CN': `${MOCK_EVENT_NAME}说明`,
        },
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toEqual('Parameter verification failed.');
  });

  afterAll((done) => {
    server.close();
    done();
  });
});

describe('Metadata Scan test', () => {
  beforeEach(() => {
    ddbMock.reset();
    SFNMock.reset();
  });

  it('trigger scan metadata', async () => {
    mockPipeline(ddbMock, 'v1.1.5');
    tokenMock(ddbMock, false);
    jest.useFakeTimers().setSystemTime(new Date('2023-02-02'));
    ddbMock.on(GetCommand).resolves({});
    SFNMock.on(StartExecutionCommand).resolves({
      executionArn: 'arn:aws:states:us-east-1:123456789012:execution:scan-StateMachine:scan-StateMachine:00000000-0000-0000-0000-000000000000',
    });
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .post('/api/metadata/trigger')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      data: null,
      success: true,
      message: 'Trigger success',
    });
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);
    expect(SFNMock).toHaveReceivedCommandTimes(StartExecutionCommand, 1);
    expect(SFNMock).toHaveReceivedCommandWith(StartExecutionCommand, {
      stateMachineArn: 'arn:aws:states:us-east-1:123456789012:stateMachine:xxxxScanMetadataWorkflow',
      name: 'manual-trigger-1675296000000',
      input: JSON.stringify({
        scanStartDate: '2023-01-26',
        scanEndDate: '2023-02-02',
        appIdList: MOCK_APP_ID,
      }),
    });
  });

  it('trigger scan metadata when old version', async () => {
    mockPipeline(ddbMock);
    tokenMock(ddbMock, false);
    jest.useFakeTimers().setSystemTime(new Date('2023-02-02'));
    ddbMock.on(GetCommand).resolves({});
    SFNMock.on(StartExecutionCommand).resolves({
      executionArn: 'arn:aws:states:us-east-1:123456789012:execution:scan-StateMachine:scan-StateMachine:00000000-0000-0000-0000-000000000000',
    });
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .post('/api/metadata/trigger')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      data: null,
      success: true,
      message: 'Trigger success',
    });
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);
    expect(SFNMock).toHaveReceivedCommandTimes(StartExecutionCommand, 1);
    expect(SFNMock).toHaveReceivedCommandWith(StartExecutionCommand, {
      stateMachineArn: 'arn:aws:states:us-east-1:123456789012:stateMachine:xxxxScanMetadataWorkflow',
      name: 'manual-trigger-1675296000000',
      input: JSON.stringify({
        scanStartDate: '2023-01-26',
        scanEndDate: '2023-02-02',
        appIdList: MOCK_APP_ID,
      }),
    });
  });

  it('trigger scan metadata frequently', async () => {
    mockPipeline(ddbMock, 'v1.1.5');
    tokenMock(ddbMock, false);
    ddbMock.on(GetCommand).resolves({
      Item: {
        id: `MANUAL_TRIGGER_${MOCK_PROJECT_ID}`,
        type: 'MANUAL_TRIGGER',
        ttl: Date.now() / 1000 + 600,
      },
    });
    SFNMock.on(StartExecutionCommand).resolves({
      executionArn: 'arn:aws:states:us-east-1:123456789012:execution:scan-StateMachine:scan-StateMachine:00000000-0000-0000-0000-000000000000',
    });
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .post('/api/metadata/trigger')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(429);
    expect(res.body).toEqual({
      success: false,
      message: 'Do not trigger metadata scans frequently, please try again in 10 minutes.',
    });
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
    expect(SFNMock).toHaveReceivedCommandTimes(StartExecutionCommand, 0);
  });

  afterAll((done) => {
    server.close();
    done();
  });
});