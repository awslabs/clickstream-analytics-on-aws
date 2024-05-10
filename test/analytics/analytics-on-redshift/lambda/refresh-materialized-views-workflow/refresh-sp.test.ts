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

import { ExecuteStatementCommand, RedshiftDataClient } from '@aws-sdk/client-redshift-data';
import { mockClient } from 'aws-sdk-client-mock';
import { handler, RefreshSpEvent } from '../../../../../src/analytics/lambdas/refresh-materialized-views-workflow/refresh-sp';
import { REDSHIFT_MODE } from '../../../../../src/common/model';
import 'aws-sdk-client-mock-jest';

const refreshSpEvent: RefreshSpEvent = {
  sp: {
    name: 'sp1',
    type: 'sp',
    timezoneSensitive: 'true',
  },
  timezoneWithAppId: {
    appId: 'app1',
    timezone: 'America/Noronha',
  },
  refreshDate: '2021-10-01',
  refreshSpDays: '3',
};

describe('Lambda - do refresh in Redshift Serverless', () => {

  const redshiftDataMock = mockClient(RedshiftDataClient);

  const workGroupName = 'demo';

  beforeEach(() => {
    redshiftDataMock.reset();

    // set the env before loading the source
    process.env.REDSHIFT_MODE = REDSHIFT_MODE.SERVERLESS;
    process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME = workGroupName;
    process.env.TOP_FREQUENT_PROPERTIES_LIMIT = '20';
  });

  test('Executed Redshift refresh sp command', async () => {
    const exeuteId = 'Id-1';
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: exeuteId });
    const resp = await handler(refreshSpEvent);
    expect(resp).toEqual({
      detail: {
        spName: refreshSpEvent.sp.name,
        queryId: exeuteId,
        refreshDate: refreshSpEvent.refreshDate,
      },
    });
    expect(redshiftDataMock).toHaveReceivedCommandWith(ExecuteStatementCommand, {
      WorkgroupName: workGroupName,
      Sql: `CALL ${refreshSpEvent.timezoneWithAppId.appId}.${refreshSpEvent.sp.name}('${refreshSpEvent.refreshDate}', '${refreshSpEvent.timezoneWithAppId.timezone}', ${refreshSpEvent.refreshSpDays});`,
    });
  });

  test('Executed Redshift refresh sp command without timezoneSensitive', async () => {
    refreshSpEvent.sp.timezoneSensitive = 'false';
    const exeuteId = 'Id-1';
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: exeuteId });
    const resp = await handler(refreshSpEvent);
    expect(resp).toEqual({
      detail: {
        spName: refreshSpEvent.sp.name,
        queryId: exeuteId,
        refreshDate: refreshSpEvent.refreshDate,
      },
    });
    expect(redshiftDataMock).toHaveReceivedCommandWith(ExecuteStatementCommand, {
      WorkgroupName: workGroupName,
      Sql: `CALL ${refreshSpEvent.timezoneWithAppId.appId}.${refreshSpEvent.sp.name}('${refreshSpEvent.refreshDate}', ${refreshSpEvent.refreshSpDays});`,
    });
  });

  test('Execute command error in Redshift when doing refresh', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).rejectsOnce();
    try {
      await handler(refreshSpEvent);
      fail('The error in executing statement of Redshift data was caught');
    } catch (error) {
      expect(redshiftDataMock).toHaveReceivedCommandWith(ExecuteStatementCommand, {
        WorkgroupName: workGroupName,
      });
    }
  });
});