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
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import request from 'supertest';
import { MOCK_TOKEN, MOCK_USER_ID, tokenMock } from './ddb-mock';
import { amznRequestContextHeader } from '../../common/constants';
import { DEFAULT_SOLUTION_OPERATOR } from '../../common/constants-ln';
import { IUserRole } from '../../common/types';
import { getRoleFromToken } from '../../common/utils';
import { app, server } from '../../index';
import 'aws-sdk-client-mock-jest';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('User test', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  it('List user', async () => {
    tokenMock(ddbMock, false);
    ddbMock.on(ScanCommand).resolvesOnce({
      Items: [
        {
          uid: 'uid-01',
          role: IUserRole.ADMIN,
          operator: 'operator-01',
          deleted: false,
        },
        {
          uid: 'uid-02',
          role: IUserRole.OPERATOR,
          operator: 'operator-02',
          deleted: false,
        },
      ],
    });
    const res = await request(app)
      .get('/api/user');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ data: { items: [{ deleted: false, operator: 'operator-01', role: 'Admin', uid: 'uid-01' }, { deleted: false, operator: 'operator-02', role: 'Operator', uid: 'uid-02' }], totalCount: 2 }, message: '', success: true });
    expect(ddbMock).toHaveReceivedCommandTimes(ScanCommand, 1);
  });

  it('Add user', async () => {
    tokenMock(ddbMock, false);
    ddbMock.on(PutCommand).resolvesOnce({});
    const res = await request(app)
      .post('/api/user')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        uid: 'uid-02',
        role: IUserRole.OPERATOR,
        operator: 'operator-02',
        deleted: false,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toEqual('User created.');
    expect(res.body.success).toEqual(true);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 2);
  });

  it('Update user', async () => {
    tokenMock(ddbMock, false);
    ddbMock.on(GetCommand).resolvesOnce({
      Item: {
        uid: MOCK_USER_ID,
        deleted: false,
      },
    });
    ddbMock.on(PutCommand).resolvesOnce({});
    const res = await request(app)
      .put(`/api/user/${MOCK_USER_ID}`)
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        uid: MOCK_USER_ID,
        name: 'name-02',
        role: IUserRole.OPERATOR,
        operator: 'operator-02',
        deleted: false,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toEqual('User updated.');
    expect(res.body.success).toEqual(true);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);
  });

  it('Update user no allow', async () => {
    tokenMock(ddbMock, false);
    ddbMock.on(GetCommand).resolvesOnce({
      Item: {
        uid: MOCK_USER_ID,
        deleted: false,
      },
    });
    ddbMock.on(PutCommand).resolvesOnce({});
    const res = await request(app)
      .put(`/api/user/${MOCK_USER_ID}`)
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        uid: MOCK_USER_ID,
        name: 'name-02',
        role: IUserRole.OPERATOR,
        operator: DEFAULT_SOLUTION_OPERATOR,
        deleted: false,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toEqual('This user not allow to be modified.');
    expect(res.body.success).toEqual(false);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });

  it('Delete user', async () => {
    tokenMock(ddbMock, false);
    ddbMock.on(GetCommand).resolvesOnce({
      Item: {
        uid: MOCK_USER_ID,
        deleted: false,
      },
    });
    ddbMock.on(UpdateCommand).resolvesOnce({});
    const res = await request(app)
      .delete(`/api/user/${MOCK_USER_ID}`)
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toEqual('User deleted.');
    expect(res.body.success).toEqual(true);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);
  });

  it('Get details of user that is exist', async () => {
    tokenMock(ddbMock, false);
    ddbMock.on(GetCommand).resolves({
      Item: {
        uid: MOCK_USER_ID,
        role: IUserRole.OPERATOR,
        deleted: false,
      },
    });
    const res = await request(app)
      .get(`/api/user/details?uid=${MOCK_USER_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ data: { deleted: false, role: 'Operator', uid: 'user-0000' }, message: '', success: true });
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
  });

  it('Get details of user that is not exist', async () => {
    tokenMock(ddbMock, false);
    ddbMock.on(GetCommand).resolves({});
    const res = await request(app)
      .get(`/api/user/details?uid=${MOCK_USER_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.role).toEqual(IUserRole.NO_IDENTITY);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
  });

  it('Get details of user that is not exist and token in context', async () => {
    tokenMock(ddbMock, false);
    ddbMock.on(GetCommand).resolves({});
    ddbMock.on(PutCommand).resolves({});
    const TOKEN = 'Bearer eyJraWQiOiJkVE5hTUhKTWw2d094c2ZhdHRONXBUQmJFZ2dOQTkzUDRYNVVtam1yMG1rPSIsImFsZyI6IlJTMjU2In0.eyJhdF9oYXNoIjoiNEJyUTZGRndLVUdWcE1jSkI1RGl3USIsInN1YiI6ImY0NjhiNDQ4LWYwNDEtNzA3OS01Y2VhLTk5ODIyYjMyMzAzNiIsImNvZ25pdG86Z3JvdXBzIjpbIkNsaWNrc3RyZWFtT3BlcmF0b3IiXSwiZW1haWxfdmVyaWZpZWQiOnRydWUsImlzcyI6Imh0dHBzOi8vY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb20vdXMtZWFzdC0xX25vZUVSeDZBVyIsImNvZ25pdG86dXNlcm5hbWUiOiJmNDY4YjQ0OC1mMDQxLTcwNzktNWNlYS05OTgyMmIzMjMwMzYiLCJvcmlnaW5fanRpIjoiNzk3Y2FlOTktN2U4OC00YzVkLWEzMDEtNWZlNDc5NjhkMDU5IiwiYXVkIjoiNzVvajdjaDRsczNsbmhoaWdsdDBidTI3azgiLCJ0b2tlbl91c2UiOiJpZCIsImF1dGhfdGltZSI6MTY5NDE0MDU0MywiZXhwIjoxNjk0MTQ0MTQzLCJpYXQiOjE2OTQxNDA1NDMsImp0aSI6IjM1NjFlNWI1LTQwOGYtNGRkNS04ZWQ5LTcxN2ExYmU0NWNmZCIsImVtYWlsIjoiZmFrZUBleGFtcGxlLmNvbSJ9.H-XTyDrwSGZyhP0C99zZYhEUy4FxhRaNnTW4vrlgw0DBFdjH-HuZIthgw_uVo74bYXQ4NVPDU2W4vtPS5mWPMXFdgrwsQfeV1MP8cDZZFRWG_zcy9AJaXvN2wUnncW5pJA-Bq69_wTxf0m4sFQiKVABJsMUuRPMJ1G1ceEgeEmHE5fLITvhYFF5L2aaKeirrG8ENCeIN7B-eKGZCWvoymObX2e6DDQYEt_yVFdRP3ef9nkOdgM0JdZwmmXsyAFjlRv20rPxZVUGFUl4eyuatHQSFSpaPcPU91aDiOZ3XZQehtkNtOcMYRWs7kNnFQiykbe3KnIW22xfaISxiGS_9OQ';
    const context = `{\"accountId\":\"555555555555\",\"resourceId\":\"0my3dw\",\"operationName\":null,\"stage\":\"api\",\"domainName\":\"xxx.execute-api.us-east-1.amazonaws.com\",\"domainPrefix\":\"4ui7xyvq73\",\"requestId\":\"b1633b83-991d-4ca1-a393-4cb18c1db184\",\"protocol\":\"HTTP/1.1\",\"identity\":{\"cognitoIdentityPoolId\":null,\"accountId\":null,\"cognitoIdentityId\":null,\"caller\":null,\"apiKey\":null,\"apiKeyId\":null,\"accessKey\":null,\"sourceIp\":\"0.0.0.0\",\"cognitoAuthenticationType\":null,\"cognitoAuthenticationProvider\":null,\"userArn\":null,\"userAgent\":\"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36\",\"user\":null},\"resourcePath\":\"/{proxy+}\",\"path\":\"/api/api/project\",\"authorizer\":{\"principalId\":\"4a05631e-cbe6-477c-915d-1704aec9f101\",\"integrationLatency\":253,\"email\":\"${MOCK_USER_ID}\",\"authorizationToken\":\"${TOKEN}\"},\"httpMethod\":\"POST\",\"requestTime\":\"01/May/2023:11:38:14 +0000\",\"requestTimeEpoch\":1682941094910,\"apiId\":\"4ui7xyvq73\"}`;
    const res = await request(app)
      .get(`/api/user/details?uid=${MOCK_USER_ID}`)
      .set(amznRequestContextHeader, context);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.role).toEqual(IUserRole.OPERATOR);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);
  });

  it('Get role from cognito decoded token', async () => {
    const operator = ['ClickstreamOperator'];
    const analyst = ['ClickstreamAnalyst'];
    const admin = ['ClickstreamOperator', 'ClickstreamAnalyst'];
    const cognitoDecodedToken = {
      header: { kid: 'dTNaMHJMl6wOxsfattN5pTBbEggNA93P4X5Umjmr0mk=', alg: 'RS256' },
      payload: {
        'at_hash': '4BrQ6FFwKUGVpMcJB5DiwQ',
        'sub': 'f468b448-f041-7079-5cea-99822b323036',
        'cognito:groups': [],
        'email_verified': true,
        'cognito:username': 'f468b448-f041-7079-5cea-99822b323036',
        'origin_jti': '797cae99-7e88-4c5d-a301-5fe47968d059',
        'aud': '75oj7ch4ls3lnhhiglt0bu27k8',
        'token_use': 'id',
        'auth_time': 1694140543,
        'exp': 1694144143,
        'iat': 1694140543,
        'jti': '3561e5b5-408f-4dd5-8ed9-717a1be45cfd',
        'email': 'fake@example.com',
      },
      signature: 'uatHQSFSpaPcPU91aDiOZ3XZQehtkNtOcMYRWs7kNnFQiykbe3',
    };
    const cognitoDecodedTokenOperator = {
      ...cognitoDecodedToken,
      payload: {
        ...cognitoDecodedToken.payload,
        'cognito:groups': operator,
      },
    };
    const cognitoDecodedTokenAnalyst = {
      ...cognitoDecodedToken,
      payload: {
        ...cognitoDecodedToken.payload,
        'cognito:groups': analyst,
      },
    };
    const cognitoDecodedTokenAdmin = {
      ...cognitoDecodedToken,
      payload: {
        ...cognitoDecodedToken.payload,
        'cognito:groups': admin,
      },
    };
    expect(getRoleFromToken(cognitoDecodedToken)).toEqual(IUserRole.NO_IDENTITY);
    expect(getRoleFromToken(cognitoDecodedTokenOperator)).toEqual(IUserRole.OPERATOR);
    expect(getRoleFromToken(cognitoDecodedTokenAnalyst)).toEqual(IUserRole.ANALYST);
    expect(getRoleFromToken(cognitoDecodedTokenAdmin)).toEqual(IUserRole.ADMIN);
  });

  it('Get role from others decoded token', async () => {
    const operator = ['ClickstreamOperator'];
    const decodedToken = {
      header: { kid: 'dTNaMHJMl6wOxsfattN5pTBbEggNA93P4X5Umjmr0mk=', alg: 'RS256' },
      payload: {
        'at_hash': '4BrQ6FFwKUGVpMcJB5DiwQ',
        'sub': 'f468b448-f041-7079-5cea-99822b323036',
        'any_keys': {
          roles: [],
        },
        'email_verified': true,
        'cognito:username': 'f468b448-f041-7079-5cea-99822b323036',
        'origin_jti': '797cae99-7e88-4c5d-a301-5fe47968d059',
        'aud': '75oj7ch4ls3lnhhiglt0bu27k8',
        'token_use': 'id',
        'auth_time': 1694140543,
        'exp': 1694144143,
        'iat': 1694140543,
        'jti': '3561e5b5-408f-4dd5-8ed9-717a1be45cfd',
        'email': 'fake@example.com',
      },
      signature: 'uatHQSFSpaPcPU91aDiOZ3XZQehtkNtOcMYRWs7kNnFQiykbe3',
    };
    const decodedTokenOperator = {
      ...decodedToken,
      payload: {
        ...decodedToken.payload,
        any_keys: {
          roles: operator,
        },
      },
    };
    process.env.OIDC_ROLE_PATH = '$.payload.any_keys.roles';
    expect(getRoleFromToken(decodedTokenOperator)).toEqual(IUserRole.OPERATOR);
  });

  afterAll((done) => {
    server.close();
    done();
  });
});