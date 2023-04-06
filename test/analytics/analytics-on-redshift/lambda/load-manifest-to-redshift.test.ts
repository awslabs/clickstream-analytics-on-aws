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

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ExecuteStatementCommand, RedshiftDataClient } from '@aws-sdk/client-redshift-data';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { getMockContext } from './context';
import { handler, LoadManifestEvent } from '../../../../src/analytics/lambdas/load-data-workflow/load-manifest-to-redshift';
import { RedshiftMode } from '../../../../src/analytics/private/constant';
import 'aws-sdk-client-mock-jest';

const loadManifestEvent: LoadManifestEvent = {
  detail: {
    execution_id: 'arn:aws:states:us-east-2:xxxxxxxxxxxx:execution:LoadManifestStateMachineAE0969CA-v2ur6ASaxNOQ:12ec840c-6282-4d53-475d-6db473e539c3_70bfb836-c7d5-7cab-75b0-5222e78194ac',
    appId: 'app1',
    jobList: {
      entries:
      [{
        url: 's3://DOC-EXAMPLE-BUCKET/project1/ods_external_events/partition_app=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy',
        meta: {
          content_length: 10324001,
        },
      }],
    },
    manifestFileName: 's3://DOC-EXAMPLE-BUCKET/manifest/app150be34be-fdec-4b45-8b14-63c38f910a56.manifest',
  },
};
const context = getMockContext();

describe('Lambda - do loading manifest to Redshift Serverless via COPY command', () => {

  const redshiftDataMock = mockClient(RedshiftDataClient);
  const dynamoDBClientMock = mockClient(DynamoDBClient);

  const workGroupName = 'demo';

  beforeEach(() => {
    redshiftDataMock.reset();
    dynamoDBClientMock.reset();

    // set the env before loading the source
    process.env.REDSHIFT_MODE = RedshiftMode.SERVERLESS;
    process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME = workGroupName;
  });

  test('Executed Redshift copy command', async () => {
    const exeuteId = 'Id-1';
    dynamoDBClientMock.on(UpdateCommand).resolvesOnce({});
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: exeuteId });
    const resp = await handler(loadManifestEvent, context);
    expect(resp).toEqual({
      detail: expect.objectContaining({
        id: exeuteId,
      }),
    });
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
    expect(redshiftDataMock).toHaveReceivedCommandWith(ExecuteStatementCommand, {
      WorkgroupName: workGroupName,
    });
  });

  test('Update DDB error when doing load Redshift', async () => {
    dynamoDBClientMock.on(UpdateCommand).rejectsOnce();
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: 'Id-1' });
    try {
      await handler(loadManifestEvent, context);
      fail('The error of DDB update was caught');
    } catch (error) {
      expect(dynamoDBClientMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
      expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 0);
    }
  });

  // TODO: redesign the error handling
  test('Execute command error in Redshift when doing load Redshift', async () => {
    dynamoDBClientMock.on(UpdateCommand).resolvesOnce({});
    redshiftDataMock.on(ExecuteStatementCommand).rejectsOnce();
    try {
      await handler(loadManifestEvent, context);
      fail('The error in executing statement of Redshift data was caught');
    } catch (error) {
      expect(dynamoDBClientMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
      expect(redshiftDataMock).toHaveReceivedCommandWith(ExecuteStatementCommand, {
        WorkgroupName: workGroupName,
      });
    }
  });

});

describe('Lambda - do loading manifest to Provisioned Redshift via COPY command', () => {
  const redshiftDataMock = mockClient(RedshiftDataClient);
  const dynamoDBClientMock = mockClient(DynamoDBClient);

  const clusterIdentifier = 'cluster-1';
  const dbUser = 'aUser';

  beforeEach(() => {
    redshiftDataMock.reset();
    dynamoDBClientMock.reset();

    // set the env before loading the source
    process.env.REDSHIFT_MODE = RedshiftMode.PROVISIONED;
    process.env.REDSHIFT_CLUSTER_IDENTIFIER = clusterIdentifier;
    process.env.REDSHIFT_DB_USER = dbUser;
  });

  test('Executed Redshift copy command', async () => {
    const exeuteId = 'Id-1';
    dynamoDBClientMock.on(UpdateCommand).resolvesOnce({});
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: exeuteId });
    const resp = await handler(loadManifestEvent, context);
    expect(resp).toEqual({
      detail: expect.objectContaining({
        id: exeuteId,
      }),
    });
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
    expect(redshiftDataMock).toHaveReceivedCommandWith(ExecuteStatementCommand, {
      ClusterIdentifier: clusterIdentifier,
      DbUser: dbUser,
    });
  });
});