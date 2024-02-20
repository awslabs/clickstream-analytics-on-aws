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

//@ts-nocheck

process.env.REDSHIFT_DATABASE = 'testdb';
process.env.REDSHIFT_CLUSTER_IDENTIFIER = 'testcluster';
process.env.REDSHIFT_DB_USER = 'testuser';
process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME = '';
process.env.REDSHIFT_DATA_API_ROLE = 'arn:aws:iam::123456789012:role/testrole';

import { ExecuteStatementCommand, RedshiftDataClient } from '@aws-sdk/client-redshift-data';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';

import {
  handler,
} from '../../../../../src/analytics/lambdas/sql-execution-sfn/sql-execution-step-fn';

const redshiftDataMock = mockClient(RedshiftDataClient);
const s3Mock = mockClient(S3Client);

beforeEach(async () => {
  redshiftDataMock.reset();
  s3Mock.reset();
});

test('handler submit sql - s3 file', async () => {
  const event = { sql: 's3://test/test.sql' };
  s3Mock.on(GetObjectCommand).resolves({
    Body: {
      transformToString: () => { return 'select * from test'; },
    } as any,
  });
  redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'id-1' });

  const response = await handler(event);

  expect(response).toEqual({ queryId: 'id-1' });
  expect(s3Mock).toHaveReceivedCommandTimes(GetObjectCommand, 1);
  expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 1);

  expect(redshiftDataMock).toReceiveNthSpecificCommandWith(1, ExecuteStatementCommand, {
    ClusterIdentifier: 'testcluster',
    Database: 'testdb',
    DbUser: 'testuser',
    Sql: 'select * from test',
    WithEvent: true,
    WorkgroupName: undefined,
  });
});


