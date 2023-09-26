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
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import request from 'supertest';
import { metadataEventExistedMock, MOCK_APP_ID, MOCK_EVENT_PARAMETER_NAME, MOCK_EVENT_NAME, MOCK_PROJECT_ID, MOCK_TOKEN, MOCK_USER_ATTRIBUTE_NAME, tokenMock } from './ddb-mock';
import { analyticsMetadataTable, invertedGSIName, prefixTimeGSIName } from '../../common/constants';
import { MetadataPlatform } from '../../common/explore-types';
import { app, server } from '../../index';
import 'aws-sdk-client-mock-jest';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('Metadata Event test', () => {
  beforeEach(() => {
    ddbMock.reset();
    // display data
    ddbMock.on(QueryCommand, {
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
          id: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}2`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          displayName: `display name of event ${MOCK_EVENT_NAME}2`,
          description: `Description of event ${MOCK_EVENT_NAME}2`,
        },
        {
          id: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_NAME}`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          displayName: `display name of event parameter ${MOCK_EVENT_PARAMETER_NAME}`,
          description: `Description of event parameter ${MOCK_EVENT_PARAMETER_NAME}`,
        },
        {
          id: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_NAME}11`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          displayName: `display name of event parameter ${MOCK_EVENT_PARAMETER_NAME}11`,
          description: `Description of event parameter ${MOCK_EVENT_PARAMETER_NAME}11`,
        },
        {
          id: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_NAME}12`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          displayName: `display name of event parameter ${MOCK_EVENT_PARAMETER_NAME}12`,
          description: `Description of event parameter ${MOCK_EVENT_PARAMETER_NAME}12`,
        },
        {
          id: `DICTIONARY#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_NAME}#value-02`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          displayName: `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME} value-02`,
        },
        {
          id: `DICTIONARY#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_NAME}11#value-02`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          displayName: `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME}11 value-02`,
        },
        {
          id: `DICTIONARY#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_NAME}12#value-012`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          displayName: `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME}12 value-012`,
        },
        {
          id: `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          displayName: `display name of user parameter ${MOCK_USER_ATTRIBUTE_NAME}`,
          description: `Description of user parameter ${MOCK_USER_ATTRIBUTE_NAME}`,
        },
        {
          id: `DICTIONARY#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}#value-02`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          displayName: `display name of dictionary ${MOCK_USER_ATTRIBUTE_NAME} value-02`,
        },
      ],
    });
  });
  it('Create metadata event', async () => {
    tokenMock(ddbMock, false);
    ddbMock.on(PutCommand).resolvesOnce({});
    const res = await request(app)
      .post('/api/metadata/event')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        name: MOCK_EVENT_NAME,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toEqual('Event created.');
    expect(res.body.success).toEqual(true);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 2);
  });
  it('Create metadata event with XSS', async () => {
    tokenMock(ddbMock, false);
    ddbMock.on(PutCommand).resolvesOnce({});
    const res = await request(app)
      .post('/api/metadata/event')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        name: '<IMG SRC=javascript:alert(\'XSS\')><script>alert(234)</script>',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'body',
          msg: 'Bad request. Please check and try again.',
          param: '',
          value: {
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            name: '<IMG SRC=javascript:alert(\'XSS\')><script>alert(234)</script>',
          },
        },
      ],
    });
  });
  it('Create metadata event with mock error', async () => {
    tokenMock(ddbMock, false);
    // Mock DynamoDB error
    ddbMock.on(PutCommand).rejects(new Error('Mock DynamoDB error'));;
    const res = await request(app)
      .post('/api/metadata/event')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        name: MOCK_EVENT_NAME,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);
  });
  it('Create metadata event 400', async () => {
    tokenMock(ddbMock, false);
    const res = await request(app)
      .post('/api/metadata/event');
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
          location: 'headers',
          msg: 'Value is empty.',
          param: 'x-click-stream-request-id',
        },
        {
          location: 'body',
          msg: 'Value is empty.',
          param: '',
          value: {},
        },
      ],
    });
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });
  it('Create metadata event Not Modified', async () => {
    tokenMock(ddbMock, true);
    const res = await request(app)
      .post('/api/metadata/event')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        name: MOCK_EVENT_NAME,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'headers',
          msg: 'Not Modified.',
          param: 'x-click-stream-request-id',
          value: '0000-0000',
        },
      ],
    });
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });
  it('Get metadata event by name', async () => {
    ddbMock.on(QueryCommand, {
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
        ':type': `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
        ':id_start': `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
      },
    }).resolves({
      Items: [
        {
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
          type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
          prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          deleted: false,
          updateAt: 1690788840458,
          createAt: 1690788840458,
          operator: '',
          name: MOCK_EVENT_NAME,
          hasData: false,
          platform: [MetadataPlatform.ANDROID],
        },
        {
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
          type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
          prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          deleted: false,
          updateAt: 1690788840451,
          createAt: 1690788840451,
          operator: '',
          name: MOCK_EVENT_NAME,
          hasData: true,
          platform: [MetadataPlatform.WEB],
        },
        {
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}#${MOCK_EVENT_PARAMETER_NAME}`,
          type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
          prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          appId: MOCK_APP_ID,
          projectId: MOCK_PROJECT_ID,
          createAt: 1691415932588,
          deleted: false,
          hasData: true,
          metadataSource: 'Preset',
          name: MOCK_EVENT_PARAMETER_NAME,
          eventName: MOCK_EVENT_NAME,
          operator: '',
          parameterId: '9e944f193e3d4521ae81427423d28daf',
          parameterType: 'Public',
          platform: [MetadataPlatform.ANDROID, MetadataPlatform.IOS],
          valueEnum: ['value-01', 'value-02'],
        },
        {
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}#${MOCK_EVENT_PARAMETER_NAME}`,
          type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
          prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          appId: MOCK_APP_ID,
          projectId: MOCK_PROJECT_ID,
          createAt: 1691415932581,
          deleted: false,
          hasData: false,
          metadataSource: 'Preset',
          name: MOCK_EVENT_PARAMETER_NAME,
          eventName: MOCK_EVENT_NAME,
          operator: '',
          parameterId: '9e944f193e3d4521ae81427423d28daf',
          parameterType: 'Public',
          platform: [MetadataPlatform.WEB],
          valueEnum: ['value-02', 'value-03'],
        },
      ],
    });
    let res = await request(app)
      .get(`/api/metadata/event/${MOCK_EVENT_NAME}?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
        type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
        prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
        associatedParameters: [
          {
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}#${MOCK_EVENT_PARAMETER_NAME}`,
            type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
            prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            appId: MOCK_APP_ID,
            createAt: 1691415932588,
            deleted: false,
            metadataSource: 'Preset',
            name: MOCK_EVENT_PARAMETER_NAME,
            eventName: MOCK_EVENT_NAME,
            displayName: `display name of event parameter ${MOCK_EVENT_PARAMETER_NAME}`,
            description: `Description of event parameter ${MOCK_EVENT_PARAMETER_NAME}`,
            operator: '',
            parameterId: '9e944f193e3d4521ae81427423d28daf',
            parameterType: 'Public',
            projectId: MOCK_PROJECT_ID,
            hasData: true,
            platform: [MetadataPlatform.ANDROID, MetadataPlatform.IOS, MetadataPlatform.WEB],
            values: [
              { value: 'value-01', displayValue: 'value-01' },
              { value: 'value-02', displayValue: `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME} value-02` },
              { value: 'value-03', displayValue: 'value-03' },
            ],
          },
        ],
        hasData: true,
        platform: [MetadataPlatform.ANDROID, MetadataPlatform.WEB],
        createAt: 1690788840458,
        deleted: false,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        name: MOCK_EVENT_NAME,
        displayName: `display name of event ${MOCK_EVENT_NAME}`,
        description: `Description of event ${MOCK_EVENT_NAME}`,
        operator: '',
        updateAt: 1690788840458,
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
    ddbMock.on(QueryCommand).resolvesOnce({
      Items: [
        {
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
          type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
          prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          deleted: false,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          updateAt: 1690788840458,
          createAt: 1690788840458,
          operator: '',
          name: `${MOCK_EVENT_NAME}1`,
          hasData: false,
          platform: [MetadataPlatform.ANDROID],
        },
        {
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
          type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
          prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          deleted: false,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          updateAt: 1690788840451,
          createAt: 1690788840451,
          operator: '',
          name: `${MOCK_EVENT_NAME}1`,
          hasData: true,
          platform: [MetadataPlatform.WEB],
        },
        {
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}2`,
          type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}2`,
          prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          deleted: false,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          updateAt: 1690788840458,
          createAt: 1690788840458,
          operator: '',
          name: `${MOCK_EVENT_NAME}2`,
          hasData: false,
          platform: [MetadataPlatform.ANDROID],
        },
        {
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}2`,
          type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}2`,
          prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          deleted: false,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          updateAt: 1690788840451,
          createAt: 1690788840451,
          operator: '',
          name: `${MOCK_EVENT_NAME}2`,
          hasData: true,
          platform: [MetadataPlatform.WEB, MetadataPlatform.IOS],
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
            type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
            prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            deleted: false,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            updateAt: 1690788840458,
            createAt: 1690788840458,
            operator: '',
            name: `${MOCK_EVENT_NAME}1`,
            displayName: `display name of event ${MOCK_EVENT_NAME}1`,
            description: `Description of event ${MOCK_EVENT_NAME}1`,
            hasData: true,
            associatedParameters: [],
            platform: [MetadataPlatform.ANDROID, MetadataPlatform.WEB],
          },
          {
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}2`,
            type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}2`,
            prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            deleted: false,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            updateAt: 1690788840458,
            createAt: 1690788840458,
            operator: '',
            name: `${MOCK_EVENT_NAME}2`,
            displayName: `display name of event ${MOCK_EVENT_NAME}2`,
            description: `Description of event ${MOCK_EVENT_NAME}2`,
            hasData: true,
            associatedParameters: [],
            platform: [MetadataPlatform.ANDROID, MetadataPlatform.WEB, MetadataPlatform.IOS],
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
    ddbMock.on(QueryCommand).resolvesOnce({
      Items: [
        {
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
          type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
          prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          deleted: false,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          updateAt: 1690788840458,
          createAt: 1690788840458,
          operator: '',
          name: `${MOCK_EVENT_NAME}1`,
          hasData: false,
          platform: [MetadataPlatform.ANDROID],
        },
        {
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
          type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
          prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          deleted: false,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          updateAt: 1690788840451,
          createAt: 1690788840451,
          operator: '',
          name: `${MOCK_EVENT_NAME}1`,
          hasData: true,
          platform: [MetadataPlatform.WEB],
        },
        {
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}2`,
          type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}2`,
          prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          deleted: false,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          updateAt: 1690788840458,
          createAt: 1690788840458,
          operator: '',
          name: `${MOCK_EVENT_NAME}2`,
          hasData: false,
          platform: [MetadataPlatform.ANDROID],
        },
        {
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}2`,
          type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}2`,
          prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          deleted: false,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          updateAt: 1690788840451,
          createAt: 1690788840451,
          operator: '',
          name: `${MOCK_EVENT_NAME}2`,
          hasData: true,
          platform: [MetadataPlatform.WEB, MetadataPlatform.IOS],
        },
      ],
    }).resolves({
      Items: [
        {
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1#${MOCK_EVENT_PARAMETER_NAME}11`,
          type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
          prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          appId: MOCK_APP_ID,
          projectId: MOCK_PROJECT_ID,
          createAt: 1691415932588,
          deleted: false,
          hasData: true,
          metadataSource: 'Preset',
          name: `${MOCK_EVENT_PARAMETER_NAME}11`,
          eventName: `${MOCK_EVENT_NAME}1`,
          operator: '',
          parameterId: '9e944f193e3d4521ae81427423d28daf',
          parameterType: 'Public',
          platform: [MetadataPlatform.ANDROID, MetadataPlatform.IOS],
          valueEnum: ['value-01', 'value-02'],
        },
        {
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1#${MOCK_EVENT_PARAMETER_NAME}11`,
          type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
          prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          appId: MOCK_APP_ID,
          projectId: MOCK_PROJECT_ID,
          createAt: 1691415932581,
          deleted: false,
          hasData: false,
          metadataSource: 'Preset',
          name: `${MOCK_EVENT_PARAMETER_NAME}11`,
          eventName: `${MOCK_EVENT_NAME}1`,
          operator: '',
          parameterId: '9e944f193e3d4521ae81427423d28daf',
          parameterType: 'Public',
          platform: [MetadataPlatform.WEB],
          valueEnum: ['value-02', 'value-03'],
        },
        {
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1#${MOCK_EVENT_PARAMETER_NAME}12`,
          type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
          prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          appId: MOCK_APP_ID,
          projectId: MOCK_PROJECT_ID,
          createAt: 1691415932588,
          deleted: false,
          hasData: true,
          metadataSource: 'Preset',
          name: `${MOCK_EVENT_PARAMETER_NAME}12`,
          eventName: `${MOCK_EVENT_NAME}1`,
          operator: '',
          parameterId: '9e944f193e3d4521ae81427423d28daf',
          parameterType: 'Public',
          platform: [MetadataPlatform.IOS],
          valueEnum: ['value-011', 'value-012'],
        },
        {
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1#${MOCK_EVENT_PARAMETER_NAME}12`,
          type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
          prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          appId: MOCK_APP_ID,
          projectId: MOCK_PROJECT_ID,
          createAt: 1691415932581,
          deleted: false,
          hasData: false,
          metadataSource: 'Preset',
          name: `${MOCK_EVENT_PARAMETER_NAME}12`,
          eventName: `${MOCK_EVENT_NAME}1`,
          operator: '',
          parameterId: '9e944f193e3d4521ae81427423d28daf',
          parameterType: 'Public',
          platform: [MetadataPlatform.WEB],
          valueEnum: ['value-012', 'value-013'],
        },
      ],
    });
    let res = await request(app)
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
            type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
            prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            deleted: false,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            updateAt: 1690788840458,
            createAt: 1690788840458,
            operator: '',
            name: `${MOCK_EVENT_NAME}1`,
            displayName: `display name of event ${MOCK_EVENT_NAME}1`,
            description: `Description of event ${MOCK_EVENT_NAME}1`,
            hasData: true,
            associatedParameters: [
              {
                id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1#${MOCK_EVENT_PARAMETER_NAME}11`,
                type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
                prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
                appId: MOCK_APP_ID,
                projectId: MOCK_PROJECT_ID,
                createAt: 1691415932588,
                deleted: false,
                hasData: true,
                metadataSource: 'Preset',
                name: `${MOCK_EVENT_PARAMETER_NAME}11`,
                eventName: `${MOCK_EVENT_NAME}1`,
                displayName: `display name of event parameter ${MOCK_EVENT_PARAMETER_NAME}11`,
                description: `Description of event parameter ${MOCK_EVENT_PARAMETER_NAME}11`,
                operator: '',
                parameterId: '9e944f193e3d4521ae81427423d28daf',
                parameterType: 'Public',
                platform: [MetadataPlatform.ANDROID, MetadataPlatform.IOS, MetadataPlatform.WEB],
                values: [
                  { value: 'value-01', displayValue: 'value-01' },
                  { value: 'value-02', displayValue: `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME}11 value-02` },
                  { value: 'value-03', displayValue: 'value-03' },
                ],
              },
              {
                id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1#${MOCK_EVENT_PARAMETER_NAME}12`,
                type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
                prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
                appId: MOCK_APP_ID,
                projectId: MOCK_PROJECT_ID,
                createAt: 1691415932588,
                deleted: false,
                hasData: true,
                metadataSource: 'Preset',
                name: `${MOCK_EVENT_PARAMETER_NAME}12`,
                eventName: `${MOCK_EVENT_NAME}1`,
                displayName: `display name of event parameter ${MOCK_EVENT_PARAMETER_NAME}12`,
                description: `Description of event parameter ${MOCK_EVENT_PARAMETER_NAME}12`,
                operator: '',
                parameterId: '9e944f193e3d4521ae81427423d28daf',
                parameterType: 'Public',
                platform: [MetadataPlatform.IOS, MetadataPlatform.WEB],
                values: [
                  { value: 'value-011', displayValue: 'value-011' },
                  { value: 'value-012', displayValue: `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME}12 value-012` },
                  { value: 'value-013', displayValue: 'value-013' },
                ],
              },
            ],
            platform: [MetadataPlatform.ANDROID, MetadataPlatform.WEB],
          },
          {
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}2`,
            type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}2`,
            prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            deleted: false,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            updateAt: 1690788840458,
            createAt: 1690788840458,
            operator: '',
            name: `${MOCK_EVENT_NAME}2`,
            displayName: `display name of event ${MOCK_EVENT_NAME}2`,
            description: `Description of event ${MOCK_EVENT_NAME}2`,
            hasData: true,
            associatedParameters: [],
            platform: [MetadataPlatform.ANDROID, MetadataPlatform.WEB, MetadataPlatform.IOS],
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
    // display data
    ddbMock.on(QueryCommand, {
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
          id: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}2`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          displayName: `display name of event ${MOCK_EVENT_NAME}2`,
          description: `Description of event ${MOCK_EVENT_NAME}2`,
        },
        {
          id: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_NAME}`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          displayName: `display name of event parameter ${MOCK_EVENT_PARAMETER_NAME}`,
          description: `Description of event parameter ${MOCK_EVENT_PARAMETER_NAME}`,
        },
        {
          id: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_NAME}11`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          displayName: `display name of event parameter ${MOCK_EVENT_PARAMETER_NAME}11`,
          description: `Description of event parameter ${MOCK_EVENT_PARAMETER_NAME}11`,
        },
        {
          id: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_NAME}12`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          displayName: `display name of event parameter ${MOCK_EVENT_PARAMETER_NAME}12`,
          description: `Description of event parameter ${MOCK_EVENT_PARAMETER_NAME}12`,
        },
        {
          id: `DICTIONARY#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_NAME}#value-02`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          displayName: `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME} value-02`,
        },
        {
          id: `DICTIONARY#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_NAME}11#value-02`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          displayName: `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME}11 value-02`,
        },
        {
          id: `DICTIONARY#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_NAME}12#value-012`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          displayName: `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME}12 value-012`,
        },
        {
          id: `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          displayName: `display name of user parameter ${MOCK_USER_ATTRIBUTE_NAME}`,
          description: `Description of user parameter ${MOCK_USER_ATTRIBUTE_NAME}`,
        },
        {
          id: `DICTIONARY#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}#value-02`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          displayName: `display name of dictionary ${MOCK_USER_ATTRIBUTE_NAME} value-02`,
        },
      ],
    });
  });
  it('Create metadata event attribute', async () => {
    tokenMock(ddbMock, false);
    ddbMock.on(PutCommand).resolvesOnce({});
    const res = await request(app)
      .post('/api/metadata/event_parameter')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        name: MOCK_EVENT_PARAMETER_NAME,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toEqual('Event attribute created.');
    expect(res.body.success).toEqual(true);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 2);
  });
  it('Create metadata event attribute with XSS', async () => {
    tokenMock(ddbMock, false);
    ddbMock.on(PutCommand).resolvesOnce({});
    const res = await request(app)
      .post('/api/metadata/event_parameter')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        name: '<IMG SRC=javascript:alert(\'XSS\')><script>alert(234)</script>',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'body',
          msg: 'Bad request. Please check and try again.',
          param: '',
          value: {
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            name: '<IMG SRC=javascript:alert(\'XSS\')><script>alert(234)</script>',
          },
        },
      ],
    });
  });
  it('Create metadata event attribute with mock error', async () => {
    tokenMock(ddbMock, false);
    // Mock DynamoDB error
    ddbMock.on(PutCommand).rejects(new Error('Mock DynamoDB error'));;
    const res = await request(app)
      .post('/api/metadata/event_parameter')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        name: MOCK_EVENT_PARAMETER_NAME,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);
  });
  it('Create metadata event attribute 400', async () => {
    tokenMock(ddbMock, false);
    const res = await request(app)
      .post('/api/metadata/event_parameter');
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
          location: 'headers',
          msg: 'Value is empty.',
          param: 'x-click-stream-request-id',
        },
        {
          location: 'body',
          msg: 'Value is empty.',
          param: '',
          value: {},
        },
      ],
    });
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });
  it('Create metadata event attribute Not Modified', async () => {
    tokenMock(ddbMock, true);
    const res = await request(app)
      .post('/api/metadata/event_parameter')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        name: MOCK_EVENT_PARAMETER_NAME,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'headers',
          msg: 'Not Modified.',
          param: 'x-click-stream-request-id',
          value: '0000-0000',
        },
      ],
    });
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });
  it('Get metadata event attribute by name', async () => {
    ddbMock.on(QueryCommand, {
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
        ':prefix': `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
        ':name': MOCK_EVENT_PARAMETER_NAME,
      },
    }).resolves({
      Items: [
        {
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}#${MOCK_EVENT_PARAMETER_NAME}`,
          type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
          prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          deleted: false,
          updateAt: 1690788840458,
          createAt: 1690788840458,
          operator: '',
          name: MOCK_EVENT_PARAMETER_NAME,
          eventName: MOCK_EVENT_NAME,
          hasData: false,
          platform: [MetadataPlatform.ANDROID],
          valueEnum: [],
        },
        {
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}#${MOCK_EVENT_PARAMETER_NAME}`,
          type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
          prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          deleted: false,
          updateAt: 1690788840451,
          createAt: 1690788840451,
          operator: '',
          name: MOCK_EVENT_PARAMETER_NAME,
          eventName: MOCK_EVENT_NAME,
          hasData: false,
          platform: [MetadataPlatform.WEB],
          valueEnum: ['value-01', 'value-02'],
        },
      ],
    });
    let res = await request(app)
      .get(`/api/metadata/event_parameter/${MOCK_EVENT_PARAMETER_NAME}?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
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
            displayName: `display name of event ${MOCK_EVENT_NAME}`,
            description: `Description of event ${MOCK_EVENT_NAME}`,
          },
        ],
        id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}#${MOCK_EVENT_PARAMETER_NAME}`,
        type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
        prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        deleted: false,
        updateAt: 1690788840458,
        createAt: 1690788840458,
        operator: '',
        name: MOCK_EVENT_PARAMETER_NAME,
        eventName: MOCK_EVENT_NAME,
        displayName: `display name of event parameter ${MOCK_EVENT_PARAMETER_NAME}`,
        description: `Description of event parameter ${MOCK_EVENT_PARAMETER_NAME}`,
        hasData: false,
        platform: [MetadataPlatform.ANDROID, MetadataPlatform.WEB],
        values: [
          { value: 'value-01', displayValue: 'value-01' },
          { value: 'value-02', displayValue: `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME} value-02` },
        ],
      },
    });
  });
  it('Get non-existent metadata event attribute', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [],
    });
    const res = await request(app)
      .get(`/api/metadata/event_parameter/${MOCK_EVENT_PARAMETER_NAME}?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
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
      FilterExpression: 'deleted = :d',
      ExpressionAttributeNames: { '#prefix': 'prefix' },
      ExpressionAttributeValues: new Map<string, any>([
        [':d', false],
        [':prefix', `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`],
      ]),
      ScanIndexForward: false,
    }).resolves({
      Items: [
        {
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}#${MOCK_EVENT_PARAMETER_NAME}`,
          type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
          prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          deleted: false,
          updateAt: 1690788840458,
          createAt: 1690788840458,
          operator: '',
          name: MOCK_EVENT_PARAMETER_NAME,
          eventName: MOCK_EVENT_NAME,
          hasData: false,
          platform: [MetadataPlatform.ANDROID],
          valueEnum: [],
        },
        {
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}#${MOCK_EVENT_PARAMETER_NAME}`,
          type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
          prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          deleted: false,
          updateAt: 1690788840451,
          createAt: 1690788840451,
          operator: '',
          name: MOCK_EVENT_PARAMETER_NAME,
          eventName: MOCK_EVENT_NAME,
          hasData: false,
          platform: [MetadataPlatform.WEB],
          valueEnum: ['value-01', 'value-02'],
        },
        {
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}#${MOCK_EVENT_PARAMETER_NAME}1`,
          type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
          prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          deleted: false,
          updateAt: 1690788840458,
          createAt: 1690788840458,
          operator: '',
          name: `${MOCK_EVENT_PARAMETER_NAME}1`,
          eventName: `${MOCK_EVENT_NAME}1`,
          hasData: false,
          platform: [MetadataPlatform.ANDROID],
          valueEnum: [],
        },
        {
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1#${MOCK_EVENT_PARAMETER_NAME}1`,
          type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
          prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          deleted: false,
          updateAt: 1690788840451,
          createAt: 1690788840451,
          operator: '',
          name: `${MOCK_EVENT_PARAMETER_NAME}1`,
          eventName: `${MOCK_EVENT_NAME}1`,
          hasData: false,
          platform: [MetadataPlatform.WEB],
          valueEnum: ['value-01', 'value-02', 'value-03', 'value-04'],
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
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}#${MOCK_EVENT_PARAMETER_NAME}`,
            type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
            prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            deleted: false,
            updateAt: 1690788840458,
            createAt: 1690788840458,
            operator: '',
            name: MOCK_EVENT_PARAMETER_NAME,
            eventName: MOCK_EVENT_NAME,
            displayName: `display name of event parameter ${MOCK_EVENT_PARAMETER_NAME}`,
            description: `Description of event parameter ${MOCK_EVENT_PARAMETER_NAME}`,
            hasData: false,
            platform: [MetadataPlatform.ANDROID, MetadataPlatform.WEB],
            values: [
              { value: 'value-01', displayValue: 'value-01' },
              { value: 'value-02', displayValue: `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME} value-02` },
            ],
          },
          {
            associatedEvents: [],
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}#${MOCK_EVENT_PARAMETER_NAME}1`,
            type: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
            prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            deleted: false,
            updateAt: 1690788840458,
            createAt: 1690788840458,
            operator: '',
            name: `${MOCK_EVENT_PARAMETER_NAME}1`,
            eventName: `${MOCK_EVENT_NAME}1`,
            displayName: `${MOCK_EVENT_PARAMETER_NAME}1`,
            description: '',
            hasData: false,
            platform: [MetadataPlatform.ANDROID, MetadataPlatform.WEB],
            values: [
              { value: 'value-01', displayValue: 'value-01' },
              { value: 'value-02', displayValue: 'value-02' },
              { value: 'value-03', displayValue: 'value-03' },
              { value: 'value-04', displayValue: 'value-04' },
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
    // display data
    ddbMock.on(QueryCommand, {
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
          id: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}2`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          displayName: `display name of event ${MOCK_EVENT_NAME}2`,
          description: `Description of event ${MOCK_EVENT_NAME}2`,
        },
        {
          id: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_NAME}`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          displayName: `display name of event parameter ${MOCK_EVENT_PARAMETER_NAME}`,
          description: `Description of event parameter ${MOCK_EVENT_PARAMETER_NAME}`,
        },
        {
          id: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_NAME}11`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          displayName: `display name of event parameter ${MOCK_EVENT_PARAMETER_NAME}11`,
          description: `Description of event parameter ${MOCK_EVENT_PARAMETER_NAME}11`,
        },
        {
          id: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_NAME}12`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          displayName: `display name of event parameter ${MOCK_EVENT_PARAMETER_NAME}12`,
          description: `Description of event parameter ${MOCK_EVENT_PARAMETER_NAME}12`,
        },
        {
          id: `DICTIONARY#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_NAME}#value-02`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          displayName: `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME} value-02`,
        },
        {
          id: `DICTIONARY#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_NAME}11#value-02`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          displayName: `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME}11 value-02`,
        },
        {
          id: `DICTIONARY#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_NAME}12#value-012`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          displayName: `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME}12 value-012`,
        },
        {
          id: `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          displayName: `display name of user parameter ${MOCK_USER_ATTRIBUTE_NAME}`,
          description: `Description of user parameter ${MOCK_USER_ATTRIBUTE_NAME}`,
        },
        {
          id: `DICTIONARY#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}#value-02`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          displayName: `display name of dictionary ${MOCK_USER_ATTRIBUTE_NAME} value-02`,
        },
      ],
    });
  });
  it('Create metadata user attribute', async () => {
    tokenMock(ddbMock, false);
    ddbMock.on(PutCommand).resolvesOnce({});
    const res = await request(app)
      .post('/api/metadata/user_attribute')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        name: MOCK_USER_ATTRIBUTE_NAME,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toEqual('User attribute created.');
    expect(res.body.success).toEqual(true);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 2);
  });
  it('Create metadata user attribute with XSS', async () => {
    tokenMock(ddbMock, false);
    ddbMock.on(PutCommand).resolvesOnce({});
    const res = await request(app)
      .post('/api/metadata/user_attribute')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        name: '<IMG SRC=javascript:alert(\'XSS\')><script>alert(234)</script>',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'body',
          msg: 'Bad request. Please check and try again.',
          param: '',
          value: {
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            name: '<IMG SRC=javascript:alert(\'XSS\')><script>alert(234)</script>',
          },
        },
      ],
    });
  });
  it('Create metadata user attribute with mock error', async () => {
    tokenMock(ddbMock, false);
    // Mock DynamoDB error
    ddbMock.on(PutCommand).rejects(new Error('Mock DynamoDB error'));;
    const res = await request(app)
      .post('/api/metadata/user_attribute')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        name: MOCK_USER_ATTRIBUTE_NAME,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);
  });
  it('Create metadata user attribute 400', async () => {
    tokenMock(ddbMock, false);
    const res = await request(app)
      .post('/api/metadata/user_attribute');
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
          location: 'headers',
          msg: 'Value is empty.',
          param: 'x-click-stream-request-id',
        },
        {
          location: 'body',
          msg: 'Value is empty.',
          param: '',
          value: {},
        },
      ],
    });
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });
  it('Create metadata user attribute Not Modified', async () => {
    tokenMock(ddbMock, true);
    const res = await request(app)
      .post('/api/metadata/user_attribute')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        name: MOCK_USER_ATTRIBUTE_NAME,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'headers',
          msg: 'Not Modified.',
          param: 'x-click-stream-request-id',
          value: '0000-0000',
        },
      ],
    });
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });
  it('Get metadata user attribute by name', async () => {
    ddbMock.on(QueryCommand, {
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
        ':prefix': `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
        ':name': MOCK_USER_ATTRIBUTE_NAME,
      },
    }).resolves({
      Items: [
        {
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}`,
          type: `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}`,
          prefix: `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          deleted: false,
          updateAt: 1690788840458,
          createAt: 1690788840458,
          operator: '',
          name: MOCK_USER_ATTRIBUTE_NAME,
          hasData: false,
          valueEnum: ['value-01', 'value-02'],
        },
      ],
    });
    let res = await request(app)
      .get(`/api/metadata/user_attribute/${MOCK_USER_ATTRIBUTE_NAME}?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}`,
        type: `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}`,
        prefix: `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        deleted: false,
        updateAt: 1690788840458,
        createAt: 1690788840458,
        operator: '',
        name: MOCK_USER_ATTRIBUTE_NAME,
        displayName: `display name of user parameter ${MOCK_USER_ATTRIBUTE_NAME}`,
        description: `Description of user parameter ${MOCK_USER_ATTRIBUTE_NAME}`,
        hasData: false,
        values: [
          { value: 'value-01', displayValue: 'value-01' },
          { value: 'value-02', displayValue: `display name of dictionary ${MOCK_USER_ATTRIBUTE_NAME} value-02` },
        ],
      },
    });
  });
  it('Get non-existent metadata user attribute', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [],
    });
    const res = await request(app)
      .get(`/api/metadata/user_attribute/${MOCK_USER_ATTRIBUTE_NAME}?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
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
      FilterExpression: 'deleted = :d',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
      },
      ExpressionAttributeValues: {
        ':d': false,
        ':prefix': `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
      },
      ScanIndexForward: false,
    }).resolves({
      Items: [
        {
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}`,
          type: `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}`,
          prefix: `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          deleted: false,
          updateAt: 1690788840451,
          createAt: 1690788840451,
          operator: '',
          name: MOCK_USER_ATTRIBUTE_NAME,
          eventName: MOCK_EVENT_NAME,
          hasData: false,
          valueEnum: ['value-01', 'value-02'],
        },
        {
          id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}1`,
          type: `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}1`,
          prefix: `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          projectId: MOCK_PROJECT_ID,
          appId: MOCK_APP_ID,
          deleted: false,
          updateAt: 1690788840451,
          createAt: 1690788840451,
          operator: '',
          name: `${MOCK_USER_ATTRIBUTE_NAME}1`,
          eventName: `${MOCK_EVENT_NAME}1`,
          hasData: false,
          valueEnum: ['value-01', 'value-02', 'value-03', 'value-04'],
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
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}`,
            type: `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}`,
            prefix: `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            deleted: false,
            updateAt: 1690788840451,
            createAt: 1690788840451,
            operator: '',
            name: MOCK_USER_ATTRIBUTE_NAME,
            eventName: MOCK_EVENT_NAME,
            displayName: `display name of user parameter ${MOCK_USER_ATTRIBUTE_NAME}`,
            description: `Description of user parameter ${MOCK_USER_ATTRIBUTE_NAME}`,
            hasData: false,
            values: [
              { value: 'value-01', displayValue: 'value-01' },
              { value: 'value-02', displayValue: `display name of dictionary ${MOCK_USER_ATTRIBUTE_NAME} value-02` },
            ],
          },
          {
            id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}1`,
            type: `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}1`,
            prefix: `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: MOCK_PROJECT_ID,
            appId: MOCK_APP_ID,
            deleted: false,
            updateAt: 1690788840451,
            createAt: 1690788840451,
            operator: '',
            name: `${MOCK_USER_ATTRIBUTE_NAME}1`,
            eventName: `${MOCK_EVENT_NAME}1`,
            displayName: `${MOCK_USER_ATTRIBUTE_NAME}1`,
            description: '',
            hasData: false,
            values: [
              { value: 'value-01', displayValue: 'value-01' },
              { value: 'value-02', displayValue: 'value-02' },
              { value: 'value-03', displayValue: 'value-03' },
              { value: 'value-04', displayValue: 'value-04' },
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