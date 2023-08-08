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
import { metadataEventAttributeExistedMock, metadataEventExistedMock, metadataUserAttributeExistedMock, MOCK_APP_ID, MOCK_EVENT_PARAMETER_ID, MOCK_EVENT_PARAMETER_NAME, MOCK_EVENT_NAME, MOCK_PROJECT_ID, MOCK_TOKEN, MOCK_USER_ATTRIBUTE_ID, MOCK_USER_ATTRIBUTE_NAME, tokenMock } from './ddb-mock';
import { app, server } from '../../index';
import 'aws-sdk-client-mock-jest';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('Metadata Event test', () => {
  beforeEach(() => {
    ddbMock.reset();
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
        description: 'Description of event',
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
        description: 'Description of event',
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
            description: 'Description of event',
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
        description: 'Description of event',
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
        description: 'Description of event',
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
    ddbMock.on(QueryCommand).resolvesOnce({
      Items: [
        {
          deleted: false,
          updateAt: 1690788840458,
          createAt: 1690788840458,
          prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          operator: '',
          id: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
          description: 'description of event 1',
          name: `${MOCK_EVENT_NAME}`,
          type: `#METADATA#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
        },
        {
          id: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
          type: `#METADATA#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#5db475a818f54f2892ecf84244e2d0d4`,
          appId: `${MOCK_APP_ID}`,
          createAt: 1691387954066,
          deleted: false,
          eventDescription: 'description 5 des5',
          eventDisplayName: '测试事件5dis5',
          eventName: `${MOCK_EVENT_NAME}`,
          operator: '',
          parameterDescription: 'd2',
          parameterDisplayName: '事件参数2disp2',
          parameterId: '5db475a818f54f2892ecf84244e2d0d4',
          parameterMetadataSource: 'Custom',
          parameterName: 'eventAttri2',
          parameterValueType: 'String',
          prefix: `RELATION#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          projectId: `${MOCK_PROJECT_ID}`,
        },
      ],
    }).resolves({
      Items: [
        {
          id: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#ap${MOCK_APP_ID}p1#9e944f193e3d4521ae81427423d28daf`,
          type: `#METADATA#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#9e944f193e3d4521ae81427423d28daf`,
          appId: `${MOCK_APP_ID}`,
          createAt: 1691415932588,
          deleted: false,
          description: 'descriptionIII',
          displayName: '事件参数DVM',
          hasData: true,
          metadataSource: 'Preset',
          name: 'eventAttriII',
          operator: '',
          parameterId: '9e944f193e3d4521ae81427423d28daf',
          parameterType: 'Public',
          platform: 'Web',
          prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          projectId: `${MOCK_PROJECT_ID}`,
        },
      ],
    });
    let res = await request(app)
      .get(`/api/metadata/event/${MOCK_EVENT_NAME}?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 2);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        createAt: 1690788840458,
        deleted: false,
        description: 'description of event 1',
        id: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
        name: `${MOCK_EVENT_NAME}`,
        operator: '',
        prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
        type: `#METADATA#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
        updateAt: 1690788840458,
        associatedParameters: [
          {
            id: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
            type: `#METADATA#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#5db475a818f54f2892ecf84244e2d0d4`,
            appId: `${MOCK_APP_ID}`,
            createAt: 1691387954066,
            deleted: false,
            eventDescription: 'description 5 des5',
            eventDisplayName: '测试事件5dis5',
            eventName: `${MOCK_EVENT_NAME}`,
            operator: '',
            parameterDescription: 'd2',
            parameterDisplayName: '事件参数2disp2',
            parameterId: '5db475a818f54f2892ecf84244e2d0d4',
            parameterMetadataSource: 'Custom',
            parameterName: 'eventAttri2',
            parameterValueType: 'String',
            prefix: `RELATION#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            projectId: `${MOCK_PROJECT_ID}`,
          },
          {
            appId: `${MOCK_APP_ID}`,
            parameterDescription: 'descriptionIII',
            parameterDisplayName: '事件参数DVM',
            parameterMetadataSource: 'Preset',
            parameterName: 'eventAttriII',
            parameterId: '9e944f193e3d4521ae81427423d28daf',
            projectId: `${MOCK_PROJECT_ID}`,
          },
        ],
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
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { name: 'event-01' },
        { name: 'event-02' },
        { name: 'event-03' },
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
          { name: 'event-01' },
          { name: 'event-02' },
          { name: 'event-03' },
        ],
        totalCount: 3,
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
  it('Update metadata event', async () => {
    metadataEventExistedMock(ddbMock, MOCK_PROJECT_ID, MOCK_APP_ID, true);
    ddbMock.on(ScanCommand).resolves({
      Items: [
        {
          id: 'EVENT',
          type: 'EVENT',
          prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
        },
      ],
    });
    ddbMock.on(UpdateCommand).resolves({});
    let res = await request(app)
      .put('/api/metadata/event')
      .send({
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        name: MOCK_EVENT_NAME,
        description: 'Description of event',
        displayName: 'display name of event 555',
      });
    expect(ddbMock).toHaveReceivedCommandTimes(ScanCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      data: null,
      success: true,
      message: 'Event updated.',
    });
  });
  it('Update metadata event with not body', async () => {
    metadataEventExistedMock(ddbMock, MOCK_PROJECT_ID, MOCK_APP_ID, true);
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .put('/api/metadata/event');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'body',
          msg: 'Value is empty.',
          param: '',
          value: {},
        },
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
      ],
    });
  });
  it('Update metadata event with no existed', async () => {
    metadataEventExistedMock(ddbMock, MOCK_PROJECT_ID, MOCK_APP_ID, false);
    const res = await request(app)
      .put('/api/metadata/event')
      .send({
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        name: MOCK_EVENT_NAME,
        description: 'Description of event',
        displayName: 'display name of event 555',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'Event not found',
    });
  });
  it('Delete metadata event', async () => {
    metadataEventExistedMock(ddbMock, MOCK_PROJECT_ID, MOCK_APP_ID, true);
    ddbMock.on(ScanCommand).resolves({
      Items: [
        {
          id: 'EVENT#project1#app1#event2',
          type: 'EVENT',
          deleted: false,
          updateAt: 1690788840458,
        },
        {
          id: 'EVENT#project1#app1#event2',
          type: 'EVENT',
          deleted: false,
          updateAt: 1690788840458,
        },
      ],
    });
    ddbMock.on(UpdateCommand).resolves({});
    let res = await request(app)
      .delete(`/api/metadata/event/${MOCK_EVENT_NAME}?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      data: null,
      success: true,
      message: 'Event deleted.',
    });
    expect(ddbMock).toHaveReceivedCommandTimes(ScanCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 2);
  });
  it('Delete metadata event with no existed', async () => {
    metadataEventExistedMock(ddbMock, MOCK_PROJECT_ID, MOCK_APP_ID, false);
    ddbMock.on(UpdateCommand).resolves({});
    const res = await request(app)
      .delete(`/api/metadata/event/${MOCK_EVENT_NAME}?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'Event not found',
    });
    expect(ddbMock).toHaveReceivedCommandTimes(ScanCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 0);
  });

  afterAll((done) => {
    server.close();
    done();
  });
});

describe('Metadata Event Attribute test', () => {
  beforeEach(() => {
    ddbMock.reset();
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
        description: 'Description of event',
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
        description: 'Description of event',
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
            description: 'Description of event',
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
        description: 'Description of event',
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
        description: 'Description of event',
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
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          deleted: false,
          updateAt: 1690788840458,
          createAt: 1690788840458,
          prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          operator: '',
          id: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_ID}`,
          description: 'description of event 1',
          name: 'event1',
          type: `#METADATA#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_ID}`,
        },
        {
          deleted: false,
          updateAt: 1690788840458,
          createAt: 1690788840458,
          prefix: `RELATION#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          operator: '',
          id: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
          description: 'description of event 1',
          name: 'event1',
          type: `#METADATA#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
        },
      ],
    });
    let res = await request(app)
      .get(`/api/metadata/event_parameter/${MOCK_EVENT_PARAMETER_ID}?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        createAt: 1690788840458,
        deleted: false,
        description: 'description of event 1',
        id: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_ID}`,
        name: 'event1',
        operator: '',
        prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
        type: `#METADATA#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_ID}`,
        updateAt: 1690788840458,
        associatedEvents: [
          {
            createAt: 1690788840458,
            deleted: false,
            description: 'description of event 1',
            id: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
            name: 'event1',
            operator: '',
            prefix: `RELATION#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
            type: `#METADATA#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
            updateAt: 1690788840458,
          },
        ],
      },
    });
  });
  it('Get non-existent metadata event attribute', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [],
    });
    const res = await request(app)
      .get(`/api/metadata/event_parameter/${MOCK_EVENT_PARAMETER_ID}?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'Event attribute not found',
    });
  });
  it('Get metadata event attribute list', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { name: 'event-01' },
        { name: 'event-02' },
        { name: 'event-03' },
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
          { name: 'event-01' },
          { name: 'event-02' },
          { name: 'event-03' },
        ],
        totalCount: 3,
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
  it('Update metadata event attribute', async () => {
    metadataEventAttributeExistedMock(ddbMock, MOCK_PROJECT_ID, MOCK_APP_ID, true);
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          id: 'EVENT#project1#app1#event2',
          type: 'EVENT',
          prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
        },
      ],
    });
    ddbMock.on(UpdateCommand).resolves({});
    let res = await request(app)
      .put('/api/metadata/event_parameter')
      .send({
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        id: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_ID}`,
        parameterId: MOCK_EVENT_PARAMETER_ID,
        name: MOCK_EVENT_PARAMETER_NAME,
        description: 'Description of event',
        displayName: 'display name of event 555',
      });
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      data: null,
      success: true,
      message: 'Event attribute updated.',
    });
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
  });
  it('Update metadata event attribute with not body', async () => {
    metadataEventAttributeExistedMock(ddbMock, MOCK_PROJECT_ID, MOCK_APP_ID, true);
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .put('/api/metadata/event_parameter');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'body',
          msg: 'Value is empty.',
          param: '',
          value: {},
        },
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
      ],
    });
  });
  it('Update metadata event attribute with no existed', async () => {
    metadataEventAttributeExistedMock(ddbMock, MOCK_PROJECT_ID, MOCK_APP_ID, false);
    const res = await request(app)
      .put('/api/metadata/event_parameter')
      .send({
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        id: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_PARAMETER_ID}`,
        parameterId: MOCK_EVENT_PARAMETER_ID,
        name: MOCK_EVENT_PARAMETER_NAME,
        description: 'Description of event',
        displayName: 'display name of event 555',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'Event attribute not found',
    });
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
  });
  it('Delete metadata event attribute', async () => {
    metadataEventAttributeExistedMock(ddbMock, MOCK_PROJECT_ID, MOCK_APP_ID, true);
    ddbMock.on(ScanCommand).resolves({
      Items: [
        {
          id: 'EVENT#project1#app1#event2',
          type: 'EVENT',
          deleted: false,
          updateAt: 1690788840458,
        },
        {
          id: 'EVENT#project1#app1#event2',
          type: 'EVENT',
          deleted: false,
          updateAt: 1690788840458,
        },
      ],
    });
    ddbMock.on(UpdateCommand).resolves({});
    let res = await request(app)
      .delete(`/api/metadata/event_parameter/${MOCK_EVENT_PARAMETER_ID}?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      data: null,
      success: true,
      message: 'Event attribute deleted.',
    });
    expect(ddbMock).toHaveReceivedCommandTimes(ScanCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 2);
  });
  it('Delete metadata event attribute with no existed', async () => {
    metadataEventAttributeExistedMock(ddbMock, MOCK_PROJECT_ID, MOCK_APP_ID, false);
    ddbMock.on(UpdateCommand).resolves({});
    const res = await request(app)
      .delete(`/api/metadata/event_parameter/${MOCK_EVENT_PARAMETER_ID}?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'Event attribute not found',
    });
    expect(ddbMock).toHaveReceivedCommandTimes(ScanCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 0);
  });

  afterAll((done) => {
    server.close();
    done();
  });
});

describe('Metadata User Attribute test', () => {
  beforeEach(() => {
    ddbMock.reset();
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
        description: 'Description of event',
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
        description: 'Description of event',
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
            description: 'Description of event',
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
        description: 'Description of event',
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
        description: 'Description of event',
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
    ddbMock.on(GetCommand).resolves({
      Item:
        {
          deleted: false,
          updateAt: 1690788840458,
          createAt: 1690788840458,
          prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
          operator: '',
          id: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_ID}`,
          description: 'description of event 1',
          name: 'event1',
          type: `#METADATA#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_ID}`,
        },
    });
    let res = await request(app)
      .get(`/api/metadata/user_attribute/${MOCK_USER_ATTRIBUTE_ID}?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        createAt: 1690788840458,
        deleted: false,
        description: 'description of event 1',
        id: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_ID}`,
        name: 'event1',
        operator: '',
        prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
        type: `#METADATA#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_ID}`,
        updateAt: 1690788840458,
      },
    });
  });
  it('Get non-existent metadata user attribute', async () => {
    ddbMock.on(GetCommand).resolves({});
    const res = await request(app)
      .get(`/api/metadata/user_attribute/${MOCK_USER_ATTRIBUTE_ID}?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'User attribute not found',
    });
  });
  it('Get metadata user attribute list', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { name: 'event-01' },
        { name: 'event-02' },
        { name: 'event-03' },
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
          { name: 'event-01' },
          { name: 'event-02' },
          { name: 'event-03' },
        ],
        totalCount: 3,
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
  it('Update metadata user attribute', async () => {
    metadataUserAttributeExistedMock(ddbMock, MOCK_PROJECT_ID, MOCK_APP_ID, true);
    ddbMock.on(UpdateCommand).resolves({});
    let res = await request(app)
      .put('/api/metadata/user_attribute')
      .send({
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        id: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_ID}`,
        attributeId: MOCK_USER_ATTRIBUTE_ID,
        name: MOCK_USER_ATTRIBUTE_NAME,
        description: 'Description of event',
        displayName: 'display name of event 555',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      data: null,
      success: true,
      message: 'User attribute updated.',
    });
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
  });
  it('Update metadata user attribute with not body', async () => {
    metadataUserAttributeExistedMock(ddbMock, MOCK_PROJECT_ID, MOCK_APP_ID, true);
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .put('/api/metadata/user_attribute');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'body',
          msg: 'Value is empty.',
          param: '',
          value: {},
        },
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
      ],
    });
  });
  it('Update metadata user attribute with no existed', async () => {
    metadataUserAttributeExistedMock(ddbMock, MOCK_PROJECT_ID, MOCK_APP_ID, false);
    const res = await request(app)
      .put('/api/metadata/user_attribute')
      .send({
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        id: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_ID}`,
        attributeId: MOCK_USER_ATTRIBUTE_ID,
        name: MOCK_USER_ATTRIBUTE_NAME,
        description: 'Description of event',
        displayName: 'display name of event 555',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'User attribute not found',
    });
  });
  it('Delete metadata user attribute', async () => {
    metadataUserAttributeExistedMock(ddbMock, MOCK_PROJECT_ID, MOCK_APP_ID, true);
    ddbMock.on(ScanCommand).resolves({
      Items: [
        {
          id: 'EVENT#project1#app1#event2',
          type: 'EVENT',
          deleted: false,
          updateAt: 1690788840458,
        },
        {
          id: 'EVENT#project1#app1#event2',
          type: 'EVENT',
          deleted: false,
          updateAt: 1690788840458,
        },
      ],
    });
    ddbMock.on(UpdateCommand).resolves({});
    let res = await request(app)
      .delete(`/api/metadata/user_attribute/${MOCK_USER_ATTRIBUTE_ID}?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      data: null,
      success: true,
      message: 'User attribute deleted.',
    });
    expect(ddbMock).toHaveReceivedCommandTimes(ScanCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 2);
  });
  it('Delete metadata user attribute with no existed', async () => {
    metadataUserAttributeExistedMock(ddbMock, MOCK_PROJECT_ID, MOCK_APP_ID, false);
    ddbMock.on(UpdateCommand).resolves({});
    const res = await request(app)
      .delete(`/api/metadata/user_attribute/${MOCK_USER_ATTRIBUTE_ID}?projectId=${MOCK_PROJECT_ID}&appId=${MOCK_APP_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'User attribute not found',
    });
    expect(ddbMock).toHaveReceivedCommandTimes(ScanCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 0);
  });

  afterAll((done) => {
    server.close();
    done();
  });
});