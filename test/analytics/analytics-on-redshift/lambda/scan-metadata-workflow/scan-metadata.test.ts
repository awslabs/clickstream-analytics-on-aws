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

import { BatchExecuteStatementCommand, RedshiftDataClient, ExecuteStatementCommand, DescribeStatementCommand, StatusString } from '@aws-sdk/client-redshift-data';
import { mockClient } from 'aws-sdk-client-mock';
import mockfs from 'mock-fs';
import { handler, ScanMetadataEvent } from '../../../../../src/analytics/lambdas/scan-metadata-workflow/scan-metadata';
import { REDSHIFT_MODE } from '../../../../../src/common/model';
import { loadSQLFromFS } from '../../../../fs-utils';
import 'aws-sdk-client-mock-jest';


const scanMetadataEvent: ScanMetadataEvent = {
  appId: 'app1',
  scanEndDate: '2023-10-26',
  scanStartDate: '2023-10-10',
};

const schemaDefs = [
  {
    sqlFile: 'event-v2.sql',
  },
  {
    sqlFile: 'user-v2.sql',
  },
];

describe('Lambda - do scan metadata in Redshift Serverless', () => {

  const redshiftDataMock = mockClient(RedshiftDataClient);

  const workGroupName = 'demo';

  beforeEach(() => {
    redshiftDataMock.reset();

    // set the env before loading the source
    process.env.REDSHIFT_MODE = REDSHIFT_MODE.SERVERLESS;
    process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME = workGroupName;
    process.env.TOP_FREQUENT_PROPERTIES_LIMIT = '20';

    const rootPath = __dirname + '/../../../../../src/analytics/private/sqls/redshift/';

    mockfs({
      ...loadSQLFromFS(schemaDefs, rootPath),
    });
  });

  afterEach(mockfs.restore);

  test('Executed Redshift scan metadata command', async () => {
    const exeuteId1 = 'Id-1';
    redshiftDataMock.on(BatchExecuteStatementCommand).resolvesOnce({ Id: exeuteId1 });
    const exeuteId2 = 'Id-2';
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: exeuteId2 });
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({
      Status: StatusString.FINISHED,
    });
    const resp = await handler(scanMetadataEvent);
    expect(resp).toEqual({
      detail: expect.objectContaining({
        id: exeuteId2,
      }),
    });
    expect(redshiftDataMock).toHaveReceivedCommandWith(BatchExecuteStatementCommand, {
      WorkgroupName: workGroupName,
      Sqls: expect.arrayContaining(
        [
          'DROP TABLE IF EXISTS app1.property_array_temp_table;',
          'CREATE TABLE IF NOT EXISTS app1.property_array_temp_table (category VARCHAR, property_name VARCHAR, value_type VARCHAR, property_type VARCHAR);',
          expect.stringMatching(/INSERT INTO app1\.property_array_temp_table \(category, property_name, value_type, property_type\) VALUES \((.*)\);/),
        ],
      ),
    });
    expect(redshiftDataMock).toHaveReceivedCommandWith(ExecuteStatementCommand, {
      WorkgroupName: workGroupName,
      Sql: "CALL app1.sp_scan_metadata(20, '2023-10-26T00:00:00.000Z', '2023-10-10T00:00:00.000Z')",
    });
  });

  test('Executed Redshift scan metadata command with empty scanStartDate', async () => {
    const exeuteId1 = 'Id-1';
    redshiftDataMock.on(BatchExecuteStatementCommand).resolvesOnce({ Id: exeuteId1 });
    const exeuteId2 = 'Id-2';
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: exeuteId2 });
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({
      Status: StatusString.FINISHED,
    });
    scanMetadataEvent.scanStartDate = '';
    const resp = await handler(scanMetadataEvent);
    expect(resp).toEqual({
      detail: expect.objectContaining({
        id: exeuteId2,
      }),
    });
    expect(redshiftDataMock).toHaveReceivedCommandWith(BatchExecuteStatementCommand, {
      WorkgroupName: workGroupName,
      Sqls: expect.arrayContaining(
        [
          'DROP TABLE IF EXISTS app1.property_array_temp_table;',
          'CREATE TABLE IF NOT EXISTS app1.property_array_temp_table (category VARCHAR, property_name VARCHAR, value_type VARCHAR, property_type VARCHAR);',
          expect.stringMatching(/INSERT INTO app1\.property_array_temp_table \(category, property_name, value_type, property_type\) VALUES \((.*)\);/),
        ],
      ),
    });
    expect(redshiftDataMock).toHaveReceivedCommandWith(ExecuteStatementCommand, {
      WorkgroupName: workGroupName,
      Sql: "CALL app1.sp_scan_metadata(20, '2023-10-26T00:00:00.000Z', NULL)",
    });
  });

  test('Execute command error in Redshift when doing scan metadata', async () => {
    redshiftDataMock.on(BatchExecuteStatementCommand).rejectsOnce();
    try {
      await handler(scanMetadataEvent);
      fail('The error in executing statement of Redshift data was caught');
    } catch (error) {
      expect(redshiftDataMock).toHaveReceivedCommandWith(BatchExecuteStatementCommand, {
        WorkgroupName: workGroupName,
      });
    }
  });
});

describe('Lambda - scan metadata in Redshift Provisioned', () => {

  const redshiftDataMock = mockClient(RedshiftDataClient);

  const clusterIdentifier = 'cluster-1';
  const dbUser = 'aUser';

  beforeEach(() => {
    redshiftDataMock.reset();

    // set the env before loading the source
    process.env.REDSHIFT_MODE = REDSHIFT_MODE.PROVISIONED;
    process.env.REDSHIFT_CLUSTER_IDENTIFIER = clusterIdentifier;
    process.env.REDSHIFT_DB_USER = dbUser;
    const rootPath = __dirname + '/../../../../../src/analytics/private/sqls/redshift/';

    mockfs({
      ...loadSQLFromFS(schemaDefs, rootPath),
    });
  });

  afterEach(mockfs.restore);

  test('Executed Redshift scan metadata command', async () => {
    const exeuteId1 = 'Id-1';
    redshiftDataMock.on(BatchExecuteStatementCommand).resolvesOnce({ Id: exeuteId1 });
    const exeuteId2 = 'Id-2';
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: exeuteId2 });
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({
      Status: StatusString.FINISHED,
    });
    const resp = await handler(scanMetadataEvent);
    expect(resp).toEqual({
      detail: expect.objectContaining({
        id: exeuteId2,
      }),
    });
    expect(redshiftDataMock).toHaveReceivedCommandWith(BatchExecuteStatementCommand, {
      ClusterIdentifier: clusterIdentifier,
      DbUser: dbUser,
    });
  });
});