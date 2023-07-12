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

import fetch, { Response } from 'node-fetch';
import request from 'supertest';
import { app, server } from '../../index';
import { JWTAuthorizer } from '../../middle-ware/authorizer';


jest.mock('node-fetch');

process.env.ISSUER = 'https://mock-server';
process.env.AUTHORIZER_TABLE = 'AUTHORIZER_TABLE';
process.env.WITH_AUTH_MIDDLEWARE = 'true';

describe('Auth test', () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeAll(() => {
    jest.spyOn(JWTAuthorizer.prototype, 'getOpenidConfigurationFromDDB')
      .mockImplementation(() => Promise.resolve(undefined));
    jest.spyOn(JWTAuthorizer.prototype, 'setOpenidConfigurationToDDB')
      .mockImplementation(() => Promise.resolve());
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('status 401 when no auth token provided.', async () => {
    const res = await request(app)
      .get('/api/dictionary');
    expect(res.statusCode).toBe(401);
  });

  it('status 403 when error auth token.', async () => {
    const res = await request(app)
      .get('/api/dictionary')
      .set('Authorization', 'Bearer xxx');
    expect(res.statusCode).toBe(403);
  });

  it('auth success', async () => {
    const TOKEN = 'eyJraWQiOiJQWFh0eGxCaXlISTJSZ3ZQUFY1VGxnTERqNkc0bHkxT0hnSitRZ2xvbnBnPSIsImFsZyI6IlJTMjU2In0.eyJhdF9oYXNoIjoiamhRTFU4c1FRMXgyWGFkdWhIWE5xdyIsInN1YiI6IjcxNmJlNTMwLTkwYzEtNzBkMi03NzUyLWYyMzM2OWMxOTg5NSIsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC51cy1lYXN0LTIuYW1hem9uYXdzLmNvbVwvdXMtZWFzdC0yX3FNcmZIUlRhaCIsImNvZ25pdG86dXNlcm5hbWUiOiI3MTZiZTUzMC05MGMxLTcwZDItNzc1Mi1mMjMzNjljMTk4OTUiLCJvcmlnaW5fanRpIjoiZDA5NjU2ZTEtNzI1NC00ODNlLWI0ZGQtZGIzYmQ1YzJhOGIyIiwiYXVkIjoiMXNhZXRjcDhwbDlsdTlrNTVmN2NyNTF0OGYiLCJldmVudF9pZCI6IjAwNGVhNDQ1LWU0YjctNDY5ZS1hMDk4LTQwYTU4Mjc5MDRlMiIsInRva2VuX3VzZSI6ImlkIiwiYXV0aF90aW1lIjoxNjg5MTQ4MzI5LCJleHAiOjE2ODkxNTU0NzYsImlhdCI6MTY4OTE1MTg3NiwianRpIjoiNzQ3MGQyOGQtMTgzZC00ZjdjLTgzMTMtZTZiMTk1NTQzNjJkIiwiZW1haWwiOiJtaW5nZmVpcUBhbWF6b24uY29tIn0.JZiSa52FhVd_dAVucOWpwRSwBKV4NQp1UpxuGfaeJwoepYhLkv89g0Pnr5tZdizLUNsdZwUyULvnlsHditXhYWfcs7nPRvgAJfU3HsCJkITxc31kfZbj3CETXujdfU7eX0_HFlfxEwzc9AuYbj3qL5oNpasLUNdKsZRQzMNt8hlcn5gLCtnudFsoseHbtw1hRkviIwgdhDItHB3xh2UO26F3NIaTPfpiM98-1NThWDAHlsJL5hz3MXCbyvIz5qfQETwryTBVnTPXShJRA8hALO0aSDWMKqBbAFctflssEFG1Cp12NhElqZ5s16Ut8JUaF6AwGC1oQROAQidhFIx1VQ';
    const authorizer = new JWTAuthorizer({
      issuer: 'https://mock-server',
      dynamodbTableName: 'AUTHORIZER_TABLE',
    });
    mockFetch.mockReturnValue(
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            jwks_uri: 'https://mock-server/.well-known/jwks.json',
          }),
      } as Response),
    );
    const authResult = await authorizer.auth(TOKEN);
    expect(mockFetch.mock.calls.length).toBe(1);
    expect(mockFetch.mock.calls[0]).toEqual(['http://xxx/xxx', { method: 'GET' }]);
    expect(authResult).toEqual(1);
  });

  afterAll((done) => {
    server.close();
    done();
  });
});