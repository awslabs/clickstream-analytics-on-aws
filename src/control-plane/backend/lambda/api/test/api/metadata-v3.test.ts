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
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import request from 'supertest';
import { MOCK_APP_ID, MOCK_EVENT_NAME, MOCK_PROJECT_ID, MOCK_USER_ATTRIBUTE_NAME } from './ddb-mock';
import { displayDataMock, mockPipeline, MOCK_EVENT_PARAMETER_V2, MOCK_USER_ATTRIBUTE_V2 } from './metadata-mock';
import { analyticsMetadataTable, prefixMonthGSIName } from '../../common/constants';
import { ConditionCategory, MetadataParameterType, MetadataSource, MetadataValueType } from '../../common/explore-types';
import { app, server } from '../../index';
import 'aws-sdk-client-mock-jest';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('Metadata Event test V3', () => {
  beforeEach(() => {
    process.env.METADATA_CACHE = 'false';
    ddbMock.reset();
    displayDataMock(ddbMock);
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2023-03-02'));
    mockPipeline(ddbMock, 'v1.1.6');
  });
  it('Get preset event when no data in DDB v3', async () => {
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
    expect(res.body.data.associatedParameters.length).toEqual(79);
    expect(res.body.data.associatedParameters).toContainEqual({
      id: 'project_8888_8888#app_7777_7777#device#device_mobile_brand_name#string',
      month: 'latest',
      prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
      projectId: MOCK_PROJECT_ID,
      appId: MOCK_APP_ID,
      name: 'device_mobile_brand_name',
      category: ConditionCategory.DEVICE,
      valueType: MetadataValueType.STRING,
      platform: [],
      description: {
        'en-US': 'Device brand name',
        'zh-CN': '设备品牌名称',
      },
      displayName: {
        'en-US': 'Mobile brand name',
        'zh-CN': '设备品牌名称',
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
  it('Get metadata event list when no data in DDB v3', async () => {
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

describe('Metadata Event Attribute test V3', () => {
  beforeEach(() => {
    process.env.METADATA_CACHE = 'false';
    ddbMock.reset();
    displayDataMock(ddbMock);
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2023-03-02'));
    mockPipeline(ddbMock, 'v1.1.6');
  });
  it('Get metadata event attribute list when no data in DDB v3', async () => {
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
    expect(res.body.data.totalCount).toEqual(79);
  });
  it('Get metadata event attribute for path nodes v3', async () => {
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
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${ConditionCategory.EVENT}#_page_title#${MetadataValueType.STRING}`,
          name: '_page_title',
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
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${ConditionCategory.EVENT}#_page_url#${MetadataValueType.STRING}`,
          name: '_page_url',
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
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${ConditionCategory.EVENT}#_screen_name#${MetadataValueType.STRING}`,
          name: '_screen_name',
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
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${ConditionCategory.EVENT}#_screen_id#${MetadataValueType.STRING}`,
          name: '_screen_id',
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

describe('Metadata User Attribute test V3', () => {
  beforeEach(() => {
    process.env.METADATA_CACHE = 'false';
    ddbMock.reset();
    displayDataMock(ddbMock);
    mockPipeline(ddbMock, 'v1.1.6');
  });
  it('Get metadata user attribute list v3', async () => {
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
            metadataSource: MetadataSource.CUSTOM,
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
  it('Get metadata user attribute list when no data in DDB v3', async () => {
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
    expect(res.body.data.totalCount).toEqual(14);
  });

  afterAll((done) => {
    server.close();
    done();
  });
});