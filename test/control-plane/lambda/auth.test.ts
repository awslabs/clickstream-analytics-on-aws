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
  GetCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import jwt from 'jsonwebtoken';
import { JwksClient, RsaSigningKey } from 'jwks-rsa';
import fetch, { Response } from 'node-fetch';
import { JWTAuthorizer } from '../../../src/control-plane/auth/authorizer';
import 'aws-sdk-client-mock-jest';

jest.mock('jsonwebtoken');
jest.mock('node-fetch');

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('Auth test', () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    ddbMock.reset();
    mockFetch.mockClear();
  });

  it('auth success', async () => {
    ddbMock.on(PutCommand).resolves({});
    ddbMock.on(GetCommand).resolves({});

    const TOKEN = 'Bearer eyJraWQiOiJQWFh0eGxCaXlISTJSZ3ZQUFY1VGxnTERqNkc0bHkxT0hnSitRZ2xvbnBnPSIsImFsZyI6IlJTMjU2In0.eyJhdF9oYXNoIjoiamhRTFU4c1FRMXgyWGFkdWhIWE5xdyIsInN1YiI6IjcxNmJlNTMwLTkwYzEtNzBkMi03NzUyLWYyMzM2OWMxOTg5NSIsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC51cy1lYXN0LTIuYW1hem9uYXdzLmNvbVwvdXMtZWFzdC0yX3FNcmZIUlRhaCIsImNvZ25pdG86dXNlcm5hbWUiOiI3MTZiZTUzMC05MGMxLTcwZDItNzc1Mi1mMjMzNjljMTk4OTUiLCJvcmlnaW5fanRpIjoiZDA5NjU2ZTEtNzI1NC00ODNlLWI0ZGQtZGIzYmQ1YzJhOGIyIiwiYXVkIjoiMXNhZXRjcDhwbDlsdTlrNTVmN2NyNTF0OGYiLCJldmVudF9pZCI6IjAwNGVhNDQ1LWU0YjctNDY5ZS1hMDk4LTQwYTU4Mjc5MDRlMiIsInRva2VuX3VzZSI6ImlkIiwiYXV0aF90aW1lIjoxNjg5MTQ4MzI5LCJleHAiOjE2ODkxNTU0NzYsImlhdCI6MTY4OTE1MTg3NiwianRpIjoiNzQ3MGQyOGQtMTgzZC00ZjdjLTgzMTMtZTZiMTk1NTQzNjJkIiwiZW1haWwiOiJtaW5nZmVpcUBhbWF6b24uY29tIn0.JZiSa52FhVd_dAVucOWpwRSwBKV4NQp1UpxuGfaeJwoepYhLkv89g0Pnr5tZdizLUNsdZwUyULvnlsHditXhYWfcs7nPRvgAJfU3HsCJkITxc31kfZbj3CETXujdfU7eX0_HFlfxEwzc9AuYbj3qL5oNpasLUNdKsZRQzMNt8hlcn5gLCtnudFsoseHbtw1hRkviIwgdhDItHB3xh2UO26F3NIaTPfpiM98-1NThWDAHlsJL5hz3MXCbyvIz5qfQETwryTBVnTPXShJRA8hALO0aSDWMKqBbAFctflssEFG1Cp12NhElqZ5s16Ut8JUaF6AwGC1oQROAQidhFIx1VQ';
    const authorizer = new JWTAuthorizer({
      issuer: 'https://cognito-idp.us-east-2.amazonaws.com/us-east-2_xxx',
      dynamodbTableName: 'AUTHORIZER_TABLE',
    });

    // Mock fetch jwks uri
    const jwks_uri = jest.fn() as jest.MockedFunction<any>;
    jwks_uri.mockResolvedValue({
      issuer: 'https://cognito-idp.us-east-2.amazonaws.com/us-east-2_xxx',
      jwks_uri: 'https://cognito-idp.us-east-2.amazonaws.com/us-east-2_xxx/.well-known/jwks.json',
    });
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: jwks_uri } as Response);

    // Mock fetch SigningKey
    jest.spyOn(JwksClient.prototype, 'getSigningKey').mockImplementation(() => {
      return new MockRsaSigningKey('KID', 'RS256', 'rsaPublicKey');
    });

    // Mock jwt
    const decode = jest.spyOn(jwt, 'decode');
    decode.mockImplementation(() => ({
      header: { kid: 'PXXtxlBiyHI2RgvPPV5TlgLDj6G4ly1OHgJ+Qglonpg=', alg: 'RS256' },
      payload: {
        at_hash: 'jhQLU8sQQ1x2XaduhHXNqw',
        sub: '716be530-90c1-70d2-7752-f23369c19895',
        iss: 'https://cognito-idp.us-east-2.amazonaws.com/us-east-2_xxx',
        origin_jti: 'd09656e1-7254-483e-b4dd-db3bd5c2a8b2',
        aud: '1saetcp8pl9lu9k55f7cr51t8f',
        event_id: '004ea445-e4b7-469e-a098-40a5827904e2',
        token_use: 'id',
        auth_time: 1689148329,
        exp: 1689155476,
        iat: 1689151876,
        jti: '7470d28d-183d-4f7c-8313-e6b19554362d',
        email: 'test@fake.com',
      },
      signature: 'JZiSa52FhVd_dAVucOWpwRSwBKV4NQp1UpxuGfaeJwoepYhLkv89g0Pnr5tZdizLUNsdZwUyULvnlsHditXhYWfcs7nPRvgAJfU3HsCJkITxc31kfZbj3CETXujdfU7eX0_HFlfxEwzc9AuYbj3qL5oNpasLUNdKsZRQzMNt8hlcn5gLCtnudFsoseHbtw1hRkviIwgdhDItHB3xh2UO26F3NIaTPfpiM98-1NThWDAHlsJL5hz3MXCbyvIz5qfQETwryTBVnTPXShJRA8hALO0aSDWMKqBbAFctflssEFG1Cp12NhElqZ5s16Ut8JUaF6AwGC1oQROAQidhFIx1VQ',
    }));
    const verify = jest.spyOn(jwt, 'verify');
    verify.mockImplementation(() => ({
      iss: 'iss',
      sub: 'sub',
      aud: 'aud',
      exp: 0,
      nbf: 0,
      iat: 0,
      jti: 'jti',
    }));

    const authResult = await authorizer.auth(TOKEN);
    expect(mockFetch.mock.calls.length).toBe(1);
    expect(mockFetch.mock.calls[0]).toEqual(['https://cognito-idp.us-east-2.amazonaws.com/us-east-2_xxx/.well-known/openid-configuration', { method: 'GET' }]);
    expect(authResult).toEqual({
      jwtPayload: {
        aud: 'aud',
        exp: 0,
        iat: 0,
        iss: 'iss',
        jti: 'jti',
        nbf: 0,
        sub: 'sub',
      },
      success: true,
    });
  });

  class MockRsaSigningKey implements RsaSigningKey {
    kid: string;
    alg: string;
    rsaPublicKey: string;

    constructor(kid: string, alg: string, rsaPublicKey: string) {
      this.kid = kid;
      this.alg = alg;
      this.rsaPublicKey = rsaPublicKey;
    }
    getPublicKey() {
      return 'JZiSa52FhVd_dAVucOWpwRSwBKV4NQp1UpxuGfaeJwoepYhLkv89g0Pnr5tZdizLUNsdZwUyULvnlsHditXhYWfcs7nPRvgAJfU3HsCJkITxc31kfZbj3CETXujdfU7eX0_HFlfxEwzc9AuYbj3qL5oNpasLUNdKsZRQzMNt8hlcn5gLCtnudFsoseHbtw1hRkviIwgdhDItHB3xh2UO26F3NIaTPfpiM98-1NThWDAHlsJL5hz3MXCbyvIz5qfQETwryTBVnTPXShJRA8hALO0aSDWMKqBbAFctflssEFG1Cp12NhElqZ5s16Ut8JUaF6AwGC1oQROAQidhFIx1VQ';
    }
  }
});