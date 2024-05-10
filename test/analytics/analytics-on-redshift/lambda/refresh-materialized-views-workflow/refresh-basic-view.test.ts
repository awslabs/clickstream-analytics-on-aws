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
import { handler, RefreshBasicViewEvent } from '../../../../../src/analytics/lambdas/refresh-materialized-views-workflow/refresh-basic-view';
import { REDSHIFT_MODE } from '../../../../../src/common/model';
import 'aws-sdk-client-mock-jest';


const refreshBasicViewEvent: RefreshBasicViewEvent = {
  view: {
    name: 'view1',
    type: 'basic',
    timezoneSensitive: 'true',
  },
  timezoneWithAppId: {
    appId: 'app1',
    timezone: 'America/Noronha',
  },
};

describe('Lambda - do refresh job in Redshift Serverless', () => {

  const redshiftDataMock = mockClient(RedshiftDataClient);

  const workGroupName = 'demo';

  beforeEach(() => {
    redshiftDataMock.reset();

    // set the env before loading the source
    process.env.REDSHIFT_MODE = REDSHIFT_MODE.SERVERLESS;
    process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME = workGroupName;
    process.env.TOP_FREQUENT_PROPERTIES_LIMIT = '20';
  });

  test('Executed Redshift refresh basic mv command', async () => {
    const exeuteId = 'Id-1';
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: exeuteId });
    const resp = await handler(refreshBasicViewEvent);
    expect(resp).toEqual({
      detail: {
        viewName: refreshBasicViewEvent.view.name,
        queryId: exeuteId,
      },
      timezoneWithAppId: refreshBasicViewEvent.timezoneWithAppId,
    });
    expect(redshiftDataMock).toHaveReceivedCommandWith(ExecuteStatementCommand, {
      WorkgroupName: workGroupName,
      Sql: `REFRESH MATERIALIZED VIEW ${refreshBasicViewEvent.timezoneWithAppId.appId}.${refreshBasicViewEvent.view.name};`,
    });
  });

  test('Execute command error in Redshift when doing refresh', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).rejectsOnce();
    try {
      await handler(refreshBasicViewEvent);
      fail('The error in executing statement of Redshift data was caught');
    } catch (error) {
      expect(redshiftDataMock).toHaveReceivedCommandWith(ExecuteStatementCommand, {
        WorkgroupName: workGroupName,
      });
    }
  });
});

describe('Lambda - refresh in Redshift Provisioned', () => {

  const redshiftDataMock = mockClient(RedshiftDataClient);

  const clusterIdentifier = 'cluster-1';
  const dbUser = 'aUser';

  beforeEach(() => {
    redshiftDataMock.reset();

    // set the env before loading the source
    process.env.REDSHIFT_MODE = REDSHIFT_MODE.PROVISIONED;
    process.env.REDSHIFT_CLUSTER_IDENTIFIER = clusterIdentifier;
    process.env.REDSHIFT_DB_USER = dbUser;
  });

  test('Executed Redshift refresh basic mv command', async () => {
    const exeuteId = 'Id-1';
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: exeuteId });
    const resp = await handler(refreshBasicViewEvent);
    expect(resp).toEqual({
      detail: {
        viewName: refreshBasicViewEvent.view.name,
        queryId: exeuteId,
      },
      timezoneWithAppId: refreshBasicViewEvent.timezoneWithAppId,
    });
    expect(redshiftDataMock).toHaveReceivedCommandWith(ExecuteStatementCommand, {
      ClusterIdentifier: clusterIdentifier,
      DbUser: dbUser,
      Sql: `REFRESH MATERIALIZED VIEW ${refreshBasicViewEvent.timezoneWithAppId.appId}.${refreshBasicViewEvent.view.name};`,
    });
  });

  test('Execute command error in Redshift when doing refresh', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).rejectsOnce();
    try {
      await handler(refreshBasicViewEvent);
      fail('The error in executing statement of Redshift data was caught');
    } catch (error) {
      expect(redshiftDataMock).toHaveReceivedCommandWith(ExecuteStatementCommand, {
        ClusterIdentifier: clusterIdentifier,
        DbUser: dbUser,
      });
    }
  });
});