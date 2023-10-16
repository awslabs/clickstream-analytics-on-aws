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

import { DescribeRegionsCommand, EC2Client } from '@aws-sdk/client-ec2';
import { GenerateEmbedUrlForRegisteredUserCommand, ListUsersCommand, QuickSightClient } from '@aws-sdk/client-quicksight';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import request from 'supertest';
import 'aws-sdk-client-mock-jest';
import { MOCK_USER_ID, userMock } from './ddb-mock';
import { amznRequestContextHeader } from '../../common/constants';
import { IUserRole } from '../../common/types';
import { app, server } from '../../index';

const ddbMock = mockClient(DynamoDBDocumentClient);
const ec2ClientMock = mockClient(EC2Client);
const quickSightClient = mockClient(QuickSightClient);

const TOKEN = 'Bearer eyJraWQiOiJkVE5hTUhKTWw2d094c2ZhdHRONXBUQmJFZ2dOQTkzUDRYNVVtam1yMG1rPSIsImFsZyI6IlJTMjU2In0.eyJhdF9oYXNoIjoiNEJyUTZGRndLVUdWcE1jSkI1RGl3USIsInN1YiI6ImY0NjhiNDQ4LWYwNDEtNzA3OS01Y2VhLTk5ODIyYjMyMzAzNiIsImNvZ25pdG86Z3JvdXBzIjpbIkNsaWNrc3RyZWFtT3BlcmF0b3IiXSwiZW1haWxfdmVyaWZpZWQiOnRydWUsImlzcyI6Imh0dHBzOi8vY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb20vdXMtZWFzdC0xX25vZUVSeDZBVyIsImNvZ25pdG86dXNlcm5hbWUiOiJmNDY4YjQ0OC1mMDQxLTcwNzktNWNlYS05OTgyMmIzMjMwMzYiLCJvcmlnaW5fanRpIjoiNzk3Y2FlOTktN2U4OC00YzVkLWEzMDEtNWZlNDc5NjhkMDU5IiwiYXVkIjoiNzVvajdjaDRsczNsbmhoaWdsdDBidTI3azgiLCJ0b2tlbl91c2UiOiJpZCIsImF1dGhfdGltZSI6MTY5NDE0MDU0MywiZXhwIjoxNjk0MTQ0MTQzLCJpYXQiOjE2OTQxNDA1NDMsImp0aSI6IjM1NjFlNWI1LTQwOGYtNGRkNS04ZWQ5LTcxN2ExYmU0NWNmZCIsImVtYWlsIjoiZmFrZUBleGFtcGxlLmNvbSJ9.H-XTyDrwSGZyhP0C99zZYhEUy4FxhRaNnTW4vrlgw0DBFdjH-HuZIthgw_uVo74bYXQ4NVPDU2W4vtPS5mWPMXFdgrwsQfeV1MP8cDZZFRWG_zcy9AJaXvN2wUnncW5pJA-Bq69_wTxf0m4sFQiKVABJsMUuRPMJ1G1ceEgeEmHE5fLITvhYFF5L2aaKeirrG8ENCeIN7B-eKGZCWvoymObX2e6DDQYEt_yVFdRP3ef9nkOdgM0JdZwmmXsyAFjlRv20rPxZVUGFUl4eyuatHQSFSpaPcPU91aDiOZ3XZQehtkNtOcMYRWs7kNnFQiykbe3KnIW22xfaISxiGS_9OQ';
const NO_GROUP_TOKEN = 'Bearer eyJraWQiOiJkVE5hTUhKTWw2d094c2ZhdHRONXBUQmJFZ2dOQTkzUDRYNVVtam1yMG1rPSIsImFsZyI6IlJTMjU2In0.eyJhdF9oYXNoIjoiNEJyUTZGRndLVUdWcE1jSkI1RGl3USIsInN1YiI6ImY0NjhiNDQ4LWYwNDEtNzA3OS01Y2VhLTk5ODIyYjMyMzAzNiIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJpc3MiOiJodHRwczovL2NvZ25pdG8taWRwLnVzLWVhc3QtMS5hbWF6b25hd3MuY29tL3VzLWVhc3QtMV9ub2VFUng2QVciLCJjb2duaXRvOnVzZXJuYW1lIjoiZjQ2OGI0NDgtZjA0MS03MDc5LTVjZWEtOTk4MjJiMzIzMDM2Iiwib3JpZ2luX2p0aSI6Ijc5N2NhZTk5LTdlODgtNGM1ZC1hMzAxLTVmZTQ3OTY4ZDA1OSIsImF1ZCI6Ijc1b2o3Y2g0bHMzbG5oaGlnbHQwYnUyN2s4IiwidG9rZW5fdXNlIjoiaWQiLCJhdXRoX3RpbWUiOjE2OTQxNDA1NDMsImV4cCI6MTY5NDE0NDE0MywiaWF0IjoxNjk0MTQwNTQzLCJqdGkiOiIzNTYxZTViNS00MDhmLTRkZDUtOGVkOS03MTdhMWJlNDVjZmQiLCJlbWFpbCI6ImZha2VAZXhhbXBsZS5jb20ifQ.4DXq5u5ZAcRzFdo45zvrcaCUpwriiEjBwG9iGNOFCkCSmh7eVaXg87e3nL9an5FVPcq0vfQzJ9iIcP9LEAK35mj0jvhblG8J2OrEuvKZ6tmyfKFGODQNn81NqG_NEMcHGZZLfrudhepFYfaFI69nR6ZMD6-pfEUnV_v6eoJivIHBHgZsfVyrg5wsjXWjchVKQ3GSi9maRHknMjMFmKOUk9P__WalTDNYNzV31lgoYrxDpbpS7V3URUdF0LLMdP3dItVvHAYHcCcb7Zwwn9n3wDdva3oKp4Lblm4O66nXJ8ah1EEnM-sadmKrexf2cQpbkICGLHFn3ODyBd_UtZ3cKA';
const ERROR_GROUP_TOKEN = 'Bearer eyJraWQiOiJkVE5hTUhKTWw2d094c2ZhdHRONXBUQmJFZ2dOQTkzUDRYNVVtam1yMG1rPSIsImFsZyI6IlJTMjU2In0.eyJhdF9oYXNoIjoiNEJyUTZGRndLVUdWcE1jSkI1RGl3USIsInN1YiI6ImY0NjhiNDQ4LWYwNDEtNzA3OS01Y2VhLTk5ODIyYjMyMzAzNiIsImNvZ25pdG86Z3JvdXBzIjpbIkVycm9yIl0sImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJpc3MiOiJodHRwczovL2NvZ25pdG8taWRwLnVzLWVhc3QtMS5hbWF6b25hd3MuY29tL3VzLWVhc3QtMV9ub2VFUng2QVciLCJjb2duaXRvOnVzZXJuYW1lIjoiZjQ2OGI0NDgtZjA0MS03MDc5LTVjZWEtOTk4MjJiMzIzMDM2Iiwib3JpZ2luX2p0aSI6Ijc5N2NhZTk5LTdlODgtNGM1ZC1hMzAxLTVmZTQ3OTY4ZDA1OSIsImF1ZCI6Ijc1b2o3Y2g0bHMzbG5oaGlnbHQwYnUyN2s4IiwidG9rZW5fdXNlIjoiaWQiLCJhdXRoX3RpbWUiOjE2OTQxNDA1NDMsImV4cCI6MTY5NDE0NDE0MywiaWF0IjoxNjk0MTQwNTQzLCJqdGkiOiIzNTYxZTViNS00MDhmLTRkZDUtOGVkOS03MTdhMWJlNDVjZmQiLCJlbWFpbCI6ImZha2VAZXhhbXBsZS5jb20ifQ.ZPOqczL24lCKu-8wG0EwxEmfqmKH8lh2mefD57jo4yWS278W6deegTddfbWDB7hFNqvEZdQLXa9rfBGJk_KkqrxRfyxidZ8rbS0BTg5R5UTkZMMRLX4jNqp084oTWpThD0oW0emS8YGE4TuvKcdLacmK5PCf49CHd0rd-1X8L7zPyHtSFLT5V8jhyvBA9iyQGCx07vBTcR9KYU1pD76T5exZbE3WSkNvT-plxqrT5Qcnm3XOa4Wr4OMnilN3dlsWqADJ8EygZBg7rKB7ARseIUmMLLXzZ_1Yb_fBLeyfINbR9SY6ZhaNNrhXRvD1m5xb1eUWNPkB_4u3fNmxBRTWSg';
const context = `{\"accountId\":\"555555555555\",\"resourceId\":\"0my3dw\",\"operationName\":null,\"stage\":\"api\",\"domainName\":\"xxx.execute-api.us-east-1.amazonaws.com\",\"domainPrefix\":\"4ui7xyvq73\",\"requestId\":\"b1633b83-991d-4ca1-a393-4cb18c1db184\",\"protocol\":\"HTTP/1.1\",\"identity\":{\"cognitoIdentityPoolId\":null,\"accountId\":null,\"cognitoIdentityId\":null,\"caller\":null,\"apiKey\":null,\"apiKeyId\":null,\"accessKey\":null,\"sourceIp\":\"0.0.0.0\",\"cognitoAuthenticationType\":null,\"cognitoAuthenticationProvider\":null,\"userArn\":null,\"userAgent\":\"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36\",\"user\":null},\"resourcePath\":\"/{proxy+}\",\"path\":\"/api/api/project\",\"authorizer\":{\"principalId\":\"4a05631e-cbe6-477c-915d-1704aec9f101\",\"integrationLatency\":253,\"email\":\"${MOCK_USER_ID}\",\"authorizationToken\":\"${TOKEN}\"},\"httpMethod\":\"POST\",\"requestTime\":\"01/May/2023:11:38:14 +0000\",\"requestTimeEpoch\":1682941094910,\"apiId\":\"4ui7xyvq73\"}`;
const context_no_group = `{\"accountId\":\"555555555555\",\"resourceId\":\"0my3dw\",\"operationName\":null,\"stage\":\"api\",\"domainName\":\"xxx.execute-api.us-east-1.amazonaws.com\",\"domainPrefix\":\"4ui7xyvq73\",\"requestId\":\"b1633b83-991d-4ca1-a393-4cb18c1db184\",\"protocol\":\"HTTP/1.1\",\"identity\":{\"cognitoIdentityPoolId\":null,\"accountId\":null,\"cognitoIdentityId\":null,\"caller\":null,\"apiKey\":null,\"apiKeyId\":null,\"accessKey\":null,\"sourceIp\":\"0.0.0.0\",\"cognitoAuthenticationType\":null,\"cognitoAuthenticationProvider\":null,\"userArn\":null,\"userAgent\":\"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36\",\"user\":null},\"resourcePath\":\"/{proxy+}\",\"path\":\"/api/api/project\",\"authorizer\":{\"principalId\":\"4a05631e-cbe6-477c-915d-1704aec9f101\",\"integrationLatency\":253,\"email\":\"${MOCK_USER_ID}\",\"authorizationToken\":\"${NO_GROUP_TOKEN}\"},\"httpMethod\":\"POST\",\"requestTime\":\"01/May/2023:11:38:14 +0000\",\"requestTimeEpoch\":1682941094910,\"apiId\":\"4ui7xyvq73\"}`;
const context_error_group = `{\"accountId\":\"555555555555\",\"resourceId\":\"0my3dw\",\"operationName\":null,\"stage\":\"api\",\"domainName\":\"xxx.execute-api.us-east-1.amazonaws.com\",\"domainPrefix\":\"4ui7xyvq73\",\"requestId\":\"b1633b83-991d-4ca1-a393-4cb18c1db184\",\"protocol\":\"HTTP/1.1\",\"identity\":{\"cognitoIdentityPoolId\":null,\"accountId\":null,\"cognitoIdentityId\":null,\"caller\":null,\"apiKey\":null,\"apiKeyId\":null,\"accessKey\":null,\"sourceIp\":\"0.0.0.0\",\"cognitoAuthenticationType\":null,\"cognitoAuthenticationProvider\":null,\"userArn\":null,\"userAgent\":\"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36\",\"user\":null},\"resourcePath\":\"/{proxy+}\",\"path\":\"/api/api/project\",\"authorizer\":{\"principalId\":\"4a05631e-cbe6-477c-915d-1704aec9f101\",\"integrationLatency\":253,\"email\":\"${MOCK_USER_ID}\",\"authorizationToken\":\"${ERROR_GROUP_TOKEN}\"},\"httpMethod\":\"POST\",\"requestTime\":\"01/May/2023:11:38:14 +0000\",\"requestTimeEpoch\":1682941094910,\"apiId\":\"4ui7xyvq73\"}`;


describe('OIDC Auth test', () => {

  beforeEach(() => {
    process.env.WITH_AUTH_MIDDLEWARE = 'true';
    process.env.WITH_VALIDATE_ROLE = 'false';
  });

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
    process.env.WITH_VALIDATE_ROLE = 'false';
    server.close();
    done();
  });
});

describe('Validate role middleware test', () => {
  beforeEach(() => {
    process.env.WITH_AUTH_MIDDLEWARE = 'false';
    process.env.WITH_VALIDATE_ROLE = 'true';
    ddbMock.reset();
  });

  it('status 401 when no token in request.', async () => {
    const res = await request(app)
      .get('/api/user');
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toEqual('No token found.');
  });

  it('Validate right role with operator in request context.', async () => {
    userMock(ddbMock, 'fake@example.com', IUserRole.ADMIN, true);
    ddbMock.on(QueryCommand).resolvesOnce({
      Items: [{
        id: 'fake@example.com',
        role: IUserRole.ADMIN,
      }],
    });
    const res = await request(app)
      .get('/api/user')
      .set(amznRequestContextHeader, context);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 1);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toEqual(true);
    expect(res.body.message).toEqual('');
  });

  it('Validate with operator 403.', async () => {
    userMock(ddbMock, 'fake@example.com', IUserRole.OPERATOR, true);
    const res = await request(app)
      .get('/api/user')
      .set(amznRequestContextHeader, context);
    expect(res.statusCode).toBe(403);
    expect(res.body.success).toEqual(false);
    expect(res.body.message).toEqual('Insufficient permissions to access the API.');
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(QueryCommand, 0);
  });

  it('User not in DDB and no group in token.', async () => {
    ddbMock.on(GetCommand).resolves({});
    userMock(ddbMock, 'fake@example.com', IUserRole.ADMIN, false);
    const res = await request(app)
      .get('/api/user/details?id=fake@example.com')
      .set(amznRequestContextHeader, context_no_group);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.role).toEqual(IUserRole.NO_IDENTITY);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 4);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 0);
  });

  it('User not in DDB but group in token.', async () => {
    ddbMock.on(GetCommand).resolves({});
    userMock(ddbMock, 'fake@example.com', IUserRole.ADMIN, false);
    const res = await request(app)
      .get('/api/user/details?id=fake@example.com')
      .set(amznRequestContextHeader, context);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.role).toEqual(IUserRole.OPERATOR);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 4);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 0);
  });

  it('User not in DDB and error group in token.', async () => {
    ddbMock.on(GetCommand).resolves({});
    userMock(ddbMock, 'fake@example.com', IUserRole.ADMIN, false);
    const res = await request(app)
      .get('/api/user/details?id=fake@example.com')
      .set(amznRequestContextHeader, context_error_group);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.role).toEqual(IUserRole.NO_IDENTITY);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 4);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 0);
  });

  it('Get User settings with current user not in DDB and error group in token.', async () => {
    ddbMock.on(GetCommand).resolves({});
    userMock(ddbMock, 'fake@example.com', IUserRole.ADMIN, false);
    const res = await request(app)
      .get('/api/user/settings')
      .set(amznRequestContextHeader, context_error_group);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ message: 'Insufficient permissions to access the API.', success: false });
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 2);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 0);
  });

  it('Get User settings with current user in DDB and error group in token.', async () => {
    ddbMock.on(GetCommand).resolves({});
    userMock(ddbMock, 'fake@example.com', IUserRole.ADMIN, true);
    const res = await request(app)
      .get('/api/user/settings')
      .set(amznRequestContextHeader, context_error_group);
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual({
      analystRoleNames: 'ClickstreamAnalyst',
      operatorRoleNames: 'ClickstreamOperator',
      roleJsonPath: '$.payload.cognito:groups',
    });
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 2);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 0);
  });

  it('User in DDB and no group in token.', async () => {
    userMock(ddbMock, 'fake@example.com', IUserRole.ADMIN, true);
    const res = await request(app)
      .get('/api/user/details?id=fake@example.com')
      .set(amznRequestContextHeader, context_no_group);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.role).toEqual(IUserRole.ADMIN);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 2);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 0);
  });

  it('User role is analyst in DDB and operator role map from token.', async () => {
    userMock(ddbMock, 'fake@example.com', IUserRole.ANALYST, true);
    const res = await request(app)
      .get('/api/user/details?id=fake@example.com')
      .set(amznRequestContextHeader, context);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.role).toEqual(IUserRole.ANALYST);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 2);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 0);
  });

  it('User in DDB and group in token.', async () => {
    userMock(ddbMock, 'fake@example.com', IUserRole.ADMIN, true);
    const res = await request(app)
      .get('/api/user/details?id=fake@example.com')
      .set(amznRequestContextHeader, context);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.role).toEqual(IUserRole.ADMIN);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 2);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 0);
  });

  afterAll((done) => {
    process.env.WITH_AUTH_MIDDLEWARE = 'false';
    process.env.WITH_VALIDATE_ROLE = 'false';
    server.close();
    done();
  });
});

describe('Route role test', () => {
  beforeEach(() => {
    process.env.WITH_AUTH_MIDDLEWARE = 'false';
    process.env.WITH_VALIDATE_ROLE = 'true';
    ddbMock.reset();
    ec2ClientMock.reset();
    quickSightClient.reset();
  });

  it('Validate all routers for Admin.', async () => {
    userMock(ddbMock, 'fake@example.com', IUserRole.ADMIN, true);
    ec2ClientMock.on(DescribeRegionsCommand).resolves({
      Regions: [
        { RegionName: 'us-east-1' },
        { RegionName: 'ap-northeast-4' },
      ],
    });
    quickSightClient.on(ListUsersCommand).resolves({
      UserList: [
        { Arn: 'arn:aws:quicksight:us-east-1:555555555555:user/default/4a05631e-cbe6-477c-915d-1704aec9f101' },
      ],
    });
    quickSightClient.on(GenerateEmbedUrlForRegisteredUserCommand).resolves({
      EmbedUrl: 'https://quicksight.aws.amazon.com/embed/4ui7xyvq73/studies/4a05631e-cbe6-477c-915d-1704aec9f101?isauthcode=true&identityprovider=quicksight&code=4a05631e-cbe6-477c-915d-1704aec9f101',
    });
    expect((await request(app).get('/api/project').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).post('/api/project').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).put('/api/project/1').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).get('/api/project/1').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).delete('/api/project/1').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).get('/api/project/1/2/dashboard').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).get('/api/project/1/2/dashboard/3').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).post('/api/project/1/2/dashboard').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).delete('/api/project/1/2/dashboard/3').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).get('/api/pipeline').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).post('/api/pipeline').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).put('/api/pipeline/1').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).get('/api/pipeline/1').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).delete('/api/pipeline/1').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).get('/api/project/1/analyzes').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).get('/api/env/regions').set(amznRequestContextHeader, context)).statusCode).toBe(200);
    expect((await request(app).get('/api/metadata/events').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).get('/api/metadata/event/1').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).get('/api/user').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).post('/api/user').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).get('/api/user/details').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).put('/api/user/1').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).delete('/api/user/1').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).post('/api/reporting/funnel').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).post('/api/reporting/event').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).post('/api/reporting/path').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).post('/api/reporting/retention').set(amznRequestContextHeader, context)).statusCode).toBe(400);
  });

  it('Validate all routers for Operator.', async () => {
    userMock(ddbMock, 'fake@example.com', IUserRole.OPERATOR, true);
    ec2ClientMock.on(DescribeRegionsCommand).resolves({
      Regions: [
        { RegionName: 'us-east-1' },
        { RegionName: 'ap-northeast-4' },
      ],
    });
    quickSightClient.on(ListUsersCommand).resolves({
      UserList: [
        { Arn: 'arn:aws:quicksight:us-east-1:555555555555:user/default/4a05631e-cbe6-477c-915d-1704aec9f101' },
      ],
    });
    quickSightClient.on(GenerateEmbedUrlForRegisteredUserCommand).resolves({
      EmbedUrl: 'https://quicksight.aws.amazon.com/embed/4ui7xyvq73/studies/4a05631e-cbe6-477c-915d-1704aec9f101?isauthcode=true&identityprovider=quicksight&code=4a05631e-cbe6-477c-915d-1704aec9f101',
    });
    expect((await request(app).get('/api/project').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).post('/api/project').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).put('/api/project/1').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).get('/api/project/1').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).delete('/api/project/1').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).get('/api/project/1/2/dashboard').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).get('/api/project/1/2/dashboard/3').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).post('/api/project/1/2/dashboard').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).delete('/api/project/1/2/dashboard/3').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).get('/api/pipeline').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).post('/api/pipeline').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).put('/api/pipeline/1').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).get('/api/pipeline/1').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).delete('/api/pipeline/1').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).get('/api/project/1/analyzes').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).get('/api/env/regions').set(amznRequestContextHeader, context)).statusCode).toBe(200);
    expect((await request(app).get('/api/metadata/events').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).get('/api/metadata/event/1').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).get('/api/user').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).post('/api/user').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).get('/api/user/details').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).put('/api/user/1').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).delete('/api/user/1').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).post('/api/reporting/funnel').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).post('/api/reporting/event').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).post('/api/reporting/path').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).post('/api/reporting/retention').set(amznRequestContextHeader, context)).statusCode).toBe(403);
  });

  it('Validate all routers for Analyst.', async () => {
    userMock(ddbMock, 'fake@example.com', IUserRole.ANALYST, true);
    ec2ClientMock.on(DescribeRegionsCommand).resolves({
      Regions: [
        { RegionName: 'us-east-1' },
        { RegionName: 'ap-northeast-4' },
      ],
    });
    quickSightClient.on(ListUsersCommand).resolves({
      UserList: [
        { Arn: 'arn:aws:quicksight:us-east-1:555555555555:user/default/4a05631e-cbe6-477c-915d-1704aec9f101' },
      ],
    });
    quickSightClient.on(GenerateEmbedUrlForRegisteredUserCommand).resolves({
      EmbedUrl: 'https://quicksight.aws.amazon.com/embed/4ui7xyvq73/studies/4a05631e-cbe6-477c-915d-1704aec9f101?isauthcode=true&identityprovider=quicksight&code=4a05631e-cbe6-477c-915d-1704aec9f101',
    });
    expect((await request(app).get('/api/project').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).post('/api/project').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).put('/api/project/1').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).get('/api/project/1').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).delete('/api/project/1').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).get('/api/project/1/2/dashboard').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).get('/api/project/1/2/dashboard/3').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).post('/api/project/1/2/dashboard').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).delete('/api/project/1/2/dashboard/3').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).get('/api/pipeline').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).post('/api/pipeline').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).put('/api/pipeline/1').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).get('/api/pipeline/1').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).delete('/api/pipeline/1').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).get('/api/project/1/analyzes').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).get('/api/env/regions').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).get('/api/metadata/events').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).get('/api/metadata/event/1').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).get('/api/user').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).post('/api/user').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).get('/api/user/details').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).put('/api/user/1').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).delete('/api/user/1').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).post('/api/reporting/funnel').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).post('/api/reporting/event').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).post('/api/reporting/path').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).post('/api/reporting/retention').set(amznRequestContextHeader, context)).statusCode).toBe(400);
  });

  it('Validate all routers for NoIdentity.', async () => {
    userMock(ddbMock, 'fake@example.com', IUserRole.NO_IDENTITY, true);
    ec2ClientMock.on(DescribeRegionsCommand).resolves({
      Regions: [
        { RegionName: 'us-east-1' },
        { RegionName: 'ap-northeast-4' },
      ],
    });
    quickSightClient.on(ListUsersCommand).resolves({
      UserList: [
        { Arn: 'arn:aws:quicksight:us-east-1:555555555555:user/default/4a05631e-cbe6-477c-915d-1704aec9f101' },
      ],
    });
    quickSightClient.on(GenerateEmbedUrlForRegisteredUserCommand).resolves({
      EmbedUrl: 'https://quicksight.aws.amazon.com/embed/4ui7xyvq73/studies/4a05631e-cbe6-477c-915d-1704aec9f101?isauthcode=true&identityprovider=quicksight&code=4a05631e-cbe6-477c-915d-1704aec9f101',
    });
    expect((await request(app).get('/api/project').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).post('/api/project').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).put('/api/project/1').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).get('/api/project/1').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).delete('/api/project/1').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).get('/api/project/1/dashboard').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).get('/api/project/1/dashboard/1').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).post('/api/project/1/dashboard').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).delete('/api/project/1/dashboard/1').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).get('/api/pipeline').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).post('/api/pipeline').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).put('/api/pipeline/1').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).get('/api/pipeline/1').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).delete('/api/pipeline/1').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).get('/api/env/quicksight/embedUrl').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).get('/api/env/regions').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).get('/api/metadata/events').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).get('/api/metadata/event/1').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).get('/api/user').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).post('/api/user').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).get('/api/user/details').set(amznRequestContextHeader, context)).statusCode).toBe(400);
    expect((await request(app).put('/api/user/1').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).delete('/api/user/1').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).post('/api/reporting/funnel').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).post('/api/reporting/event').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).post('/api/reporting/path').set(amznRequestContextHeader, context)).statusCode).toBe(403);
    expect((await request(app).post('/api/reporting/retention').set(amznRequestContextHeader, context)).statusCode).toBe(403);
  });

  afterAll((done) => {
    process.env.WITH_AUTH_MIDDLEWARE = 'false';
    process.env.WITH_VALIDATE_ROLE = 'false';
    server.close();
    done();
  });
});
