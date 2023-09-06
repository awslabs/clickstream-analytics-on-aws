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
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import request from 'supertest';
import 'aws-sdk-client-mock-jest';
import { MOCK_USER_ID, userMock } from './ddb-mock';
import { amznRequestContextHeader } from '../../common/constants';
import { IUserRole } from '../../common/types';
import { app, server } from '../../index';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('Auth test', () => {
  process.env.WITH_AUTH_MIDDLEWARE = 'true';

  it('status 401 when no auth token provided.', async () => {
    const res = await request(app)
      .get('/api/user');
    expect(res.statusCode).toBe(401);
  });

  it('status 403 when error auth token.', async () => {
    const res = await request(app)
      .get('/api/user')
      .set('Authorization', 'Bearer xxx');
    expect(res.statusCode).toBe(403);
  });

  afterAll((done) => {
    process.env.WITH_AUTH_MIDDLEWARE = 'false';
    server.close();
    done();
  });
});

describe('Validate role test without OIDC auth', () => {
  process.env.WITH_VALIDATE_ROLE = 'true';

  beforeEach(() => {
    ddbMock.reset();
  });

  it('status 401 when no operator.', async () => {
    const res = await request(app)
      .get('/api/user');
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toEqual('Unauthorized.');
  });

  it('Validate with operator in request context.', async () => {
    userMock(ddbMock, MOCK_USER_ID, IUserRole.ADMIN);
    ddbMock.on(ScanCommand).resolvesOnce({
      Items: [{
        uid: MOCK_USER_ID,
        role: IUserRole.ADMIN,
      }],
    });
    const context = `{\"accountId\":\"555555555555\",\"resourceId\":\"0my3dw\",\"operationName\":null,\"stage\":\"api\",\"domainName\":\"xxx.execute-api.us-east-1.amazonaws.com\",\"domainPrefix\":\"4ui7xyvq73\",\"requestId\":\"b1633b83-991d-4ca1-a393-4cb18c1db184\",\"protocol\":\"HTTP/1.1\",\"identity\":{\"cognitoIdentityPoolId\":null,\"accountId\":null,\"cognitoIdentityId\":null,\"caller\":null,\"apiKey\":null,\"apiKeyId\":null,\"accessKey\":null,\"sourceIp\":\"0.0.0.0\",\"cognitoAuthenticationType\":null,\"cognitoAuthenticationProvider\":null,\"userArn\":null,\"userAgent\":\"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36\",\"user\":null},\"resourcePath\":\"/{proxy+}\",\"path\":\"/api/api/project\",\"authorizer\":{\"principalId\":\"4a05631e-cbe6-477c-915d-1704aec9f101\",\"integrationLatency\":253,\"email\":\"${MOCK_USER_ID}\"},\"httpMethod\":\"POST\",\"requestTime\":\"01/May/2023:11:38:14 +0000\",\"requestTimeEpoch\":1682941094910,\"apiId\":\"4ui7xyvq73\"}`;
    const res = await request(app)
      .get('/api/user')
      .set(amznRequestContextHeader, context);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(ScanCommand, 1);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toEqual(true);
    expect(res.body.message).toEqual('');
  });

  it('Validate with operator 403.', async () => {
    userMock(ddbMock, MOCK_USER_ID, IUserRole.OPERATOR);
    const context = `{\"accountId\":\"555555555555\",\"resourceId\":\"0my3dw\",\"operationName\":null,\"stage\":\"api\",\"domainName\":\"xxx.execute-api.us-east-1.amazonaws.com\",\"domainPrefix\":\"4ui7xyvq73\",\"requestId\":\"b1633b83-991d-4ca1-a393-4cb18c1db184\",\"protocol\":\"HTTP/1.1\",\"identity\":{\"cognitoIdentityPoolId\":null,\"accountId\":null,\"cognitoIdentityId\":null,\"caller\":null,\"apiKey\":null,\"apiKeyId\":null,\"accessKey\":null,\"sourceIp\":\"0.0.0.0\",\"cognitoAuthenticationType\":null,\"cognitoAuthenticationProvider\":null,\"userArn\":null,\"userAgent\":\"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36\",\"user\":null},\"resourcePath\":\"/{proxy+}\",\"path\":\"/api/api/project\",\"authorizer\":{\"principalId\":\"4a05631e-cbe6-477c-915d-1704aec9f101\",\"integrationLatency\":253,\"email\":\"${MOCK_USER_ID}\"},\"httpMethod\":\"POST\",\"requestTime\":\"01/May/2023:11:38:14 +0000\",\"requestTimeEpoch\":1682941094910,\"apiId\":\"4ui7xyvq73\"}`;
    const res = await request(app)
      .get('/api/user')
      .set(amznRequestContextHeader, context);
    expect(res.statusCode).toBe(403);
    expect(res.body.success).toEqual(false);
    expect(res.body.message).toEqual('Insufficient permissions to access the API.');
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(ScanCommand, 0);
  });

  afterAll((done) => {
    process.env.WITH_VALIDATE_ROLE = 'false';
    server.close();
    done();
  });
});
