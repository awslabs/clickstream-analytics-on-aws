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

import { SFNClient, ListExecutionsCommand } from '@aws-sdk/client-sfn';
import { mockClient } from 'aws-sdk-client-mock';
import { handler, CheckRefreshWorkflowEvent } from '../../../../../src/analytics/lambdas/refresh-materialized-views-workflow/check-refresh-workflow-start';
import 'aws-sdk-client-mock-jest';


describe('Lambda - check next refresh task', () => {
  const sfnClientMock = mockClient(SFNClient);

  let checkRefreshWorkflowEvent: CheckRefreshWorkflowEvent = {
    executionId: 'id-1',
  };

  beforeEach(() => {
    sfnClientMock.reset();
  });

  test('There is no existing running execution', async () => {
    sfnClientMock.on(ListExecutionsCommand).resolves({
      executions: [
        //@ts-ignore
        {
          executionArn: checkRefreshWorkflowEvent.executionId,
        },
      ],
    });
    const resp = await handler(checkRefreshWorkflowEvent);
    expect(resp).toEqual({
      status: 'CONTINUE',
    });
  });

  test('There is an existing running execution', async () => {
    sfnClientMock.on(ListExecutionsCommand).resolves({
      executions: [
        //@ts-ignore
        {
          executionArn: 'id-2',
        },
        //@ts-ignore
        {
          executionArn: checkRefreshWorkflowEvent.executionId,
        },
      ],
    });
    const resp = await handler(checkRefreshWorkflowEvent);
    expect(resp).toEqual({
      status: 'SKIP',
    });
  });
});