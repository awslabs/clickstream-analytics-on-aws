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
import { app, server } from '../../index';

describe('Auth test', () => {
  process.env.WITH_AUTH_MIDDLEWARE = 'true';

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

  afterAll((done) => {
    server.close();
    done();
  });
});