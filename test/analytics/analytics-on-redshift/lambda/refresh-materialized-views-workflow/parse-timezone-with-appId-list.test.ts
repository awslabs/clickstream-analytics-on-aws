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
import { handler } from '../../../../../src/analytics/lambdas/refresh-materialized-views-workflow/parse-timezone-with-appId-list';
import 'aws-sdk-client-mock-jest';

describe('Lambda - parse timezone with appId list', () => {

  test('Parse timezone with appId list succeed', async () => {
    const resp = await handler();
    expect(resp).toEqual({
      timeZoneWithAppIdList: [
        {
          appId: 'app1',
          timezone: 'America/Noronha',
        },
        {
          appId: 'app2',
          timezone: 'Asia/Shanghai',
        },
      ],
    });
  });
});
