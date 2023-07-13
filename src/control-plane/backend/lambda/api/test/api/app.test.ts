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

import request from 'supertest';
import { getEmailFromRequestContext } from '../../common/utils';
import { app, server } from '../../index';
import 'aws-sdk-client-mock-jest';

describe('App test', () => {

  process.env.HEALTH_CHECK_PATH='/';
  it('healthcheck', async () => {
    const res = await request(app)
      .get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toEqual('OK!');
  });
  it('response headers contain X-Click-Stream-Response-Time', async () => {
    const res = await request(app)
      .get('/');
    expect(res.headers['x-click-stream-response-time']).toBeDefined();
  });
  it('get email from request context', async () => {
    const context = '{\"accountId\":\"555555555555\",\"resourceId\":\"0my3dw\",\"operationName\":null,\"stage\":\"api\",\"domainName\":\"xxx.execute-api.us-east-1.amazonaws.com\",\"domainPrefix\":\"4ui7xyvq73\",\"requestId\":\"b1633b83-991d-4ca1-a393-4cb18c1db184\",\"protocol\":\"HTTP/1.1\",\"identity\":{\"cognitoIdentityPoolId\":null,\"accountId\":null,\"cognitoIdentityId\":null,\"caller\":null,\"apiKey\":null,\"apiKeyId\":null,\"accessKey\":null,\"sourceIp\":\"0.0.0.0\",\"cognitoAuthenticationType\":null,\"cognitoAuthenticationProvider\":null,\"userArn\":null,\"userAgent\":\"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36\",\"user\":null},\"resourcePath\":\"/{proxy+}\",\"path\":\"/api/api/project\",\"authorizer\":{\"principalId\":\"4a05631e-cbe6-477c-915d-1704aec9f101\",\"integrationLatency\":253,\"email\":\"abc@example.com\"},\"httpMethod\":\"POST\",\"requestTime\":\"01/May/2023:11:38:14 +0000\",\"requestTimeEpoch\":1682941094910,\"apiId\":\"4ui7xyvq73\"}';
    const context_unknown = '{\"accountId\":\"555555555555\",\"resourceId\":\"0my3dw\",\"operationName\":null,\"stage\":\"api\",\"domainName\":\"xxx.execute-api.us-east-1.amazonaws.com\",\"domainPrefix\":\"4ui7xyvq73\",\"requestId\":\"b1633b83-991d-4ca1-a393-4cb18c1db184\",\"protocol\":\"HTTP/1.1\",\"identity\":{\"cognitoIdentityPoolId\":null,\"accountId\":null,\"cognitoIdentityId\":null,\"caller\":null,\"apiKey\":null,\"apiKeyId\":null,\"accessKey\":null,\"sourceIp\":\"0.0.0.0\",\"cognitoAuthenticationType\":null,\"cognitoAuthenticationProvider\":null,\"userArn\":null,\"userAgent\":\"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36\",\"user\":null},\"resourcePath\":\"/{proxy+}\",\"path\":\"/api/api/project\",\"authorizer\":{\"principalId\":\"4a05631e-cbe6-477c-915d-1704aec9f101\",\"integrationLatency\":253},\"httpMethod\":\"POST\",\"requestTime\":\"01/May/2023:11:38:14 +0000\",\"requestTimeEpoch\":1682941094910,\"apiId\":\"4ui7xyvq73\"}';

    expect(getEmailFromRequestContext(context)).toEqual('abc@example.com');
    expect(getEmailFromRequestContext(context_unknown)).toEqual('');
  });
  it('content length check', async () => {
    process.env.WITH_AUTH_MIDDLEWARE = 'true';
    const res1 = await request(app)
      .post('/api/plugin')
      .send({ name: Array(1024 * 300).join('a') });
    expect(res1.status).toBe(401);
    expect(res1.body).toEqual({
      auth: false,
      message: 'No token provided.',
    });
    const res2 = await request(app)
      .post('/api/plugin')
      .send({ name: Array(1024 * 400).join('a') });
    expect(res2.status).toBe(413);
    expect(res2.body).toEqual({
      success: false,
      message: 'The request entity is larger than limits defined by server.',
    });
  });

  afterAll((done) => {
    server.close();
    done();
  });
});