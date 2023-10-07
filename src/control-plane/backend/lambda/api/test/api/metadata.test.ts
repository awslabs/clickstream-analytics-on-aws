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
import { analyticsMetadataTable, dictionaryTableName, prefixTimeGSIName } from '../../common/constants';
import { MetadataParameterType, MetadataPlatform, MetadataSource } from '../../common/explore-types';
import { app, server } from '../../index';
import 'aws-sdk-client-mock-jest';

const ddbMock = mockClient(DynamoDBDocumentClient);

const MOCK_EVENT = {
  id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
  month: '#202301',
  prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
  projectId: MOCK_PROJECT_ID,
  appId: MOCK_APP_ID,
  day1: {
    count: 1,
    hasData: true,
    name: MOCK_EVENT_NAME,
    platform: [
      'iOS',
    ],
  },
  day31: {
    count: 2,
    hasData: true,
    name: MOCK_EVENT_NAME,
    platform: [
      'Android',
    ],
  },
  summary: {
    dataVolumeLastDay: 2048,
    hasData: true,
    name: MOCK_EVENT_NAME,
    platform: [
      'Android',
      'iOS',
    ],
  },
};

const MOCK_EVENT_PARAMETER = {
  id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}#${MOCK_EVENT_PARAMETER_NAME}#String`,
  month: '#202301',
  prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
  projectId: MOCK_PROJECT_ID,
  appId: MOCK_APP_ID,
  day1: {
    category: 'event',
    eventName: MOCK_EVENT_NAME,
    hasData: true,
    name: MOCK_EVENT_PARAMETER_NAME,
    platform: [
      'Android',
    ],
    valueEnum: [
      {
        count: 103,
        value: '0',
      },
    ],
    valueType: 'String',
  },
  day31: {
    category: 'event',
    eventName: MOCK_EVENT_NAME,
    hasData: true,
    name: MOCK_EVENT_PARAMETER_NAME,
    platform: [
      'iOS',
    ],
    valueEnum: [
      {
        count: 305,
        value: '1',
      },
    ],
    valueType: 'String',
  },
  summary: {
    category: 'event',
    eventName: MOCK_EVENT_NAME,
    hasData: true,
    name: MOCK_EVENT_PARAMETER_NAME,
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
    valueType: 'String',
  },
};

const MOCK_USER_ATTRIBUTE = {
  id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}#String`,
  month: '#202301',
  prefix: `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
  projectId: MOCK_PROJECT_ID,
  appId: MOCK_APP_ID,
  day1: {
    category: 'user',
    hasData: true,
    name: MOCK_USER_ATTRIBUTE_NAME,
    valueEnum: [
      {
        count: 103,
        value: '0',
      },
    ],
    valueType: 'String',
  },
  day31: {
    category: 'user',
    hasData: true,
    name: MOCK_USER_ATTRIBUTE_NAME,
    valueEnum: [
      {
        count: 305,
        value: '1',
      },
    ],
    valueType: 'String',
  },
  summary: {
    category: 'user',
    hasData: true,
    name: MOCK_USER_ATTRIBUTE_NAME,
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
    valueType: 'String',
  },
};

function displayDataMock(m: any) {
  // display data
  m.on(QueryCommand, {
    TableName: analyticsMetadataTable,
    IndexName: prefixTimeGSIName,
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
        description: `Description of event ${MOCK_EVENT_NAME}`,
      },
      {
        id: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        displayName: `display name of event ${MOCK_EVENT_NAME}1`,
        description: `Description of event ${MOCK_EVENT_NAME}1`,
      },
      {
        id: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}#${MOCK_EVENT_PARAMETER_NAME}#String`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        displayName: `display name of event parameter ${MOCK_EVENT_PARAMETER_NAME}(String)`,
        description: `Description of event parameter ${MOCK_EVENT_PARAMETER_NAME}(String)`,
      },
      {
        id: `DICTIONARY#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_NAME}#String#value-02`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        displayName: `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME}(String) value-02`,
      },
      {
        id: `DICTIONARY#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_NAME}11#Integer#value-01`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        displayName: `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME}11(Integer) value-01`,
      },
      {
        id: `DICTIONARY#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_NAME}12#Double#value-03`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        displayName: `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME}12(Double) value-03`,
      },
      {
        id: `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}#String`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        displayName: `display name of user parameter ${MOCK_USER_ATTRIBUTE_NAME}`,
        description: `Description of user parameter ${MOCK_USER_ATTRIBUTE_NAME}`,
      },
      {
        id: `DICTIONARY#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}#String#value-02`,
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
            description: 'mock event description in built-in',
          },
        ],
        PresetEventParameters: [
          {
            name: MOCK_EVENT_PARAMETER_NAME,
            dataType: 'String',
            description: 'mock preset event parameter description in built-in',
          },
        ],
        PublicEventParameters: [
          {
            name: MOCK_EVENT_PARAMETER_NAME,
            dataType: 'String',
            description: 'mock public event parameter description in built-in',
          },
          {
            name: `${MOCK_EVENT_PARAMETER_NAME}11`,
            dataType: 'Integer',
            description: 'mock public event parameter description in built-in',
          },
        ],
        PresetUserAttributes: [
          {
            name: MOCK_USER_ATTRIBUTE_NAME,
            dataType: 'String',
            description: 'mock preset user attribute description in built-in',
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
      IndexName: prefixTimeGSIName,
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
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}#${MOCK_EVENT_PARAMETER_NAME}#String`,
            month: '#202303',
            prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            category: 'event',
            metadataSource: MetadataSource.PRESET,
            name: MOCK_EVENT_PARAMETER_NAME,
            eventName: MOCK_EVENT_NAME,
            displayName: MOCK_EVENT_PARAMETER_NAME,
            description: 'mock preset event parameter description in built-in',
            parameterType: 'Public',
            hasData: true,
            platform: [MetadataPlatform.ANDROID, MetadataPlatform.IOS],
            valueType: 'String',
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
        dataVolumeLastDay: 2048,
        displayName: `display name of event ${MOCK_EVENT_NAME}`,
        description: 'mock event description in built-in',
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
    ddbMock.on(QueryCommand, {
      TableName: analyticsMetadataTable,
      IndexName: prefixTimeGSIName,
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
          summary: {
            ...MOCK_EVENT.summary,
            name: `${MOCK_EVENT_NAME}1`,
          },
        },
        {
          ...MOCK_EVENT,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
          month: '#202301',
          summary: {
            ...MOCK_EVENT.summary,
            name: `${MOCK_EVENT_NAME}1`,
          },
        },
        {
          ...MOCK_EVENT,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}2`,
          month: '#202301',
          summary: {
            ...MOCK_EVENT.summary,
            name: `${MOCK_EVENT_NAME}2`,
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
            description: `Description of event ${MOCK_EVENT_NAME}1`,
            metadataSource: MetadataSource.CUSTOM,
            hasData: true,
            dataVolumeLastDay: 2048,
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
            description: '',
            metadataSource: MetadataSource.CUSTOM,
            hasData: true,
            dataVolumeLastDay: 1445,
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
  it('Get metadata event list with parameters', async () => {
    ddbMock.on(QueryCommand, {
      TableName: analyticsMetadataTable,
      IndexName: prefixTimeGSIName,
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
          summary: {
            ...MOCK_EVENT.summary,
            name: `${MOCK_EVENT_NAME}1`,
          },
        },
        {
          ...MOCK_EVENT,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
          month: '#202301',
          summary: {
            ...MOCK_EVENT.summary,
            name: `${MOCK_EVENT_NAME}1`,
          },
        },
        {
          ...MOCK_EVENT,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}2`,
          month: '#202301',
          summary: {
            ...MOCK_EVENT.summary,
            name: `${MOCK_EVENT_NAME}2`,
            platform: [MetadataPlatform.ANDROID, MetadataPlatform.WEB, MetadataPlatform.IOS],
            dataVolumeLastDay: 1445,
          },
        },
      ],
    });
    ddbMock.on(QueryCommand, {
      TableName: analyticsMetadataTable,
      IndexName: prefixTimeGSIName,
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
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1#${MOCK_EVENT_PARAMETER_NAME}11#Integer`,
          month: '#202302',
          summary: {
            ...MOCK_EVENT_PARAMETER.summary,
            eventName: `${MOCK_EVENT_NAME}1`,
            name: `${MOCK_EVENT_PARAMETER_NAME}11`,
            platform: [
              'Android',
            ],
            valueEnum: [
              {
                count: 103,
                value: 'value-01',
              },
            ],
            valueType: 'Integer',
          },
        },
        {
          ...MOCK_EVENT_PARAMETER,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1#${MOCK_EVENT_PARAMETER_NAME}11#Integer`,
          month: '#202301',
          summary: {
            ...MOCK_EVENT_PARAMETER.summary,
            eventName: `${MOCK_EVENT_NAME}1`,
            name: `${MOCK_EVENT_PARAMETER_NAME}11`,
            platform: [
              'Android',
            ],
            valueEnum: [
              {
                count: 1032,
                value: 'value-02',
              },
            ],
            valueType: 'Integer',
          },
        },
        {
          ...MOCK_EVENT_PARAMETER,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1#${MOCK_EVENT_PARAMETER_NAME}12#Double`,
          month: '#202301',
          summary: {
            ...MOCK_EVENT_PARAMETER.summary,
            eventName: `${MOCK_EVENT_NAME}1`,
            name: `${MOCK_EVENT_PARAMETER_NAME}12`,
            platform: [
              'iOS',
            ],
            valueEnum: [
              {
                count: 1,
                value: 'value-03',
              },
            ],
            valueType: 'Double',
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
            description: `Description of event ${MOCK_EVENT_NAME}1`,
            hasData: true,
            dataVolumeLastDay: 2048,
            metadataSource: MetadataSource.CUSTOM,
            month: '#202302',
            associatedParameters: [
              {
                id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1#${MOCK_EVENT_PARAMETER_NAME}11#Integer`,
                month: '#202302',
                prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
                appId: MOCK_APP_ID,
                projectId: MOCK_PROJECT_ID,
                hasData: true,
                metadataSource: MetadataSource.CUSTOM,
                name: `${MOCK_EVENT_PARAMETER_NAME}11`,
                eventName: `${MOCK_EVENT_NAME}1`,
                displayName: `${MOCK_EVENT_PARAMETER_NAME}11`,
                description: '',
                parameterType: MetadataParameterType.PUBLIC,
                platform: [MetadataPlatform.ANDROID],
                valueType: 'Integer',
                category: 'event',
                values: [
                  { value: 'value-01', displayValue: `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME}11(Integer) value-01` },
                ],
              },
              {
                id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1#${MOCK_EVENT_PARAMETER_NAME}12#Double`,
                month: '#202301',
                prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
                appId: MOCK_APP_ID,
                projectId: MOCK_PROJECT_ID,
                hasData: true,
                metadataSource: MetadataSource.CUSTOM,
                name: `${MOCK_EVENT_PARAMETER_NAME}12`,
                eventName: `${MOCK_EVENT_NAME}1`,
                displayName: `${MOCK_EVENT_PARAMETER_NAME}12`,
                description: '',
                parameterType: MetadataParameterType.PRIVATE,
                platform: [MetadataPlatform.IOS],
                valueType: 'Double',
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
            description: '',
            hasData: true,
            dataVolumeLastDay: 1445,
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
      IndexName: prefixTimeGSIName,
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
          summary: {
            ...MOCK_EVENT_PARAMETER.summary,
            eventName: `${MOCK_EVENT_NAME}1`,
            platform: [
              'Android',
            ],
            valueEnum: [
              {
                count: 1032,
                value: 'value-02',
              },
            ],
            valueType: 'String',
          },
        },
        {
          ...MOCK_EVENT_PARAMETER,
          month: '#202301',
          summary: {
            ...MOCK_EVENT_PARAMETER.summary,
            eventName: `${MOCK_EVENT_NAME}1`,
            platform: [
              'Android',
            ],
            valueEnum: [
              {
                count: 1032,
                value: 'value-02',
              },
            ],
            valueType: 'String',
          },
        },
      ],
    });
    const res = await request(app)
      .get(`/api/metadata/event_parameter?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}&name=${MOCK_EVENT_PARAMETER_NAME}&type=String`);
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
            description: 'mock event description in built-in',
          },
          {
            name: `${MOCK_EVENT_NAME}1`,
            prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            metadataSource: MetadataSource.CUSTOM,
            displayName: `display name of event ${MOCK_EVENT_NAME}1`,
            description: `Description of event ${MOCK_EVENT_NAME}1`,
          },
        ],
        id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}#${MOCK_EVENT_PARAMETER_NAME}#String`,
        month: '#202302',
        prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        name: MOCK_EVENT_PARAMETER_NAME,
        description: 'mock preset event parameter description in built-in',
        displayName: MOCK_EVENT_PARAMETER_NAME,
        eventName: '',
        category: 'event',
        metadataSource: MetadataSource.PRESET,
        parameterType: MetadataParameterType.PUBLIC,
        hasData: true,
        platform: [MetadataPlatform.ANDROID, MetadataPlatform.IOS],
        valueType: 'String',
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
    ddbMock.on(QueryCommand, {
      TableName: analyticsMetadataTable,
      IndexName: prefixTimeGSIName,
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
          summary: {
            ...MOCK_EVENT_PARAMETER.summary,
            eventName: `${MOCK_EVENT_NAME}1`,
            platform: [
              'Android',
            ],
            valueEnum: [
              {
                count: 1032,
                value: 'value-02',
              },
            ],
            valueType: 'String',
          },
        },
        {
          ...MOCK_EVENT_PARAMETER,
          month: '#202301',
          summary: {
            ...MOCK_EVENT_PARAMETER.summary,
            eventName: `${MOCK_EVENT_NAME}1`,
            platform: [
              'Android',
            ],
            valueEnum: [
              {
                count: 1032,
                value: 'value-02',
              },
            ],
            valueType: 'String',
          },
        },
        {
          ...MOCK_EVENT_PARAMETER,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1#${MOCK_EVENT_PARAMETER_NAME}1#Float`,
          month: '#202306',
          summary: {
            ...MOCK_EVENT_PARAMETER.summary,
            eventName: `${MOCK_EVENT_NAME}1`,
            name: `${MOCK_EVENT_PARAMETER_NAME}1`,
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
            valueType: 'Float',
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
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}#${MOCK_EVENT_PARAMETER_NAME}#String`,
            month: '#202302',
            prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            name: MOCK_EVENT_PARAMETER_NAME,
            description: 'mock preset event parameter description in built-in',
            displayName: MOCK_EVENT_PARAMETER_NAME,
            eventName: MOCK_EVENT_NAME,
            category: 'event',
            metadataSource: MetadataSource.PRESET,
            parameterType: MetadataParameterType.PUBLIC,
            hasData: true,
            platform: [MetadataPlatform.ANDROID, MetadataPlatform.IOS],
            valueType: 'String',
            values: [
              { value: 'value-01', displayValue: 'value-01' },
              { value: 'value-02', displayValue: `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME}(String) value-02` },
              { value: 'value-03', displayValue: 'value-03' },
            ],
          },
          {
            associatedEvents: [],
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1#${MOCK_EVENT_PARAMETER_NAME}1#Float`,
            month: '#202306',
            prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            name: `${MOCK_EVENT_PARAMETER_NAME}1`,
            description: '',
            displayName: `${MOCK_EVENT_PARAMETER_NAME}1`,
            eventName: `${MOCK_EVENT_NAME}1`,
            category: 'event',
            metadataSource: MetadataSource.CUSTOM,
            parameterType: MetadataParameterType.PRIVATE,
            hasData: true,
            platform: [MetadataPlatform.ANDROID, MetadataPlatform.WEB, MetadataPlatform.IOS],
            valueType: 'Float',
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
    ddbMock.on(QueryCommand, {
      TableName: analyticsMetadataTable,
      IndexName: prefixTimeGSIName,
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
          summary: {
            ...MOCK_USER_ATTRIBUTE.summary,
            valueEnum: [
              {
                count: 1032,
                value: 'value-02',
              },
            ],
            valueType: 'String',
          },
        },
        {
          ...MOCK_USER_ATTRIBUTE,
          month: '#202301',
          summary: {
            ...MOCK_USER_ATTRIBUTE.summary,
            valueEnum: [
              {
                count: 1032,
                value: 'value-02',
              },
            ],
            valueType: 'String',
          },
        },
        {
          ...MOCK_USER_ATTRIBUTE,
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}1#Float`,
          month: '#202312',
          summary: {
            ...MOCK_USER_ATTRIBUTE.summary,
            name: `${MOCK_USER_ATTRIBUTE_NAME}1`,
            valueEnum: [
              {
                count: 555,
                value: 'value-02',
              },
            ],
            valueType: 'Float',
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
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}#String`,
            month: '#202302',
            prefix: `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            name: MOCK_USER_ATTRIBUTE_NAME,
            description: 'mock preset user attribute description in built-in',
            displayName: 'display name of user parameter user-attribute-mock',
            category: 'user',
            hasData: true,
            metadataSource: MetadataSource.PRESET,
            valueType: 'String',
            values: [
              { value: 'value-01', displayValue: 'value-01' },
              { value: 'value-02', displayValue: `display name of dictionary ${MOCK_USER_ATTRIBUTE_NAME}(String) value-02` },
              { value: 'value-03', displayValue: 'value-03' },
            ],
          },
          {
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}1#Float`,
            month: '#202312',
            prefix: `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            name: `${MOCK_USER_ATTRIBUTE_NAME}1`,
            description: '',
            displayName: `${MOCK_USER_ATTRIBUTE_NAME}1`,
            category: 'user',
            metadataSource: MetadataSource.CUSTOM,
            valueType: 'Float',
            hasData: true,
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