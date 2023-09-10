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

import { BatchCreatePartitionCommand, GlueClient, PartitionInput } from '@aws-sdk/client-glue';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import { SinkTableEnum } from '../../../src/data-pipeline/data-pipeline';
import { GlueClientUtil } from '../../../src/data-pipeline/lambda/partition-syncer/glue-client-util';

// @ts-ignore
const glueClientMock = mockClient(GlueClient);
const s3ClientMock = mockClient(S3Client);

const glueClientUtil = new GlueClientUtil();

describe('Glue catalog add partition test', () => {
  beforeEach(() => {
    glueClientMock.reset();
  });

  it('Should add hourly partitions for source table', async () => {
    const s3Bucket = 'bucket1';
    const s3Prefix = 'prefix1/';
    const databaseName = 'db1';
    const tableName = 'table1';

    const date = new Date(2022, 12, 1);

    await glueClientUtil.addHourlyPartitionsForSourceTable(s3Bucket, s3Prefix, databaseName, tableName, date);

    // @ts-ignore
    expect(glueClientMock).toHaveReceivedCommandTimes(BatchCreatePartitionCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommand(PutObjectCommand);
  });


  it('Should generate hourly partitions for one day', async () => {
    const s3Bucket = 'bucket1';
    const s3Prefix = 'prefix1/';

    const date = new Date(2022, 0, 1);

    const partitions: PartitionInput[] = glueClientUtil.generateHourlyPartitionsOfDay(s3Bucket, s3Prefix, date);

    expect(partitions.length).toBe(24);

    for (let i = 0; i < 24; i++) {
      let hourStr = i.toString().padStart(2, '0');
      expect(partitions.filter((partitionInput) => {
        return partitionInput.Values!.toString() == ['2022', '01', '01', hourStr].toString();
      }).length).toBe(1);
      expect(partitions.filter((partitionInput) => {
        return partitionInput.StorageDescriptor?.Location ==
          `s3://bucket1/prefix1/year=2022/month=01/day=01/hour=${hourStr}/`;
      }).length).toBe(1);
      expect(s3ClientMock).toHaveReceivedCommand(PutObjectCommand);
    }
  });

  it('Should add daily partitions for sink table', async () => {
    const s3Bucket = 'bucket1';
    const s3Prefix = 'prefix1/';
    const databaseName = 'db1';
    const tableName = SinkTableEnum.EVENT;

    const projectId = 'projectId1';
    const appIds = 'appId1,appId2';

    const date = new Date(2022, 12, 1);

    await glueClientUtil.addDailyPartitionsForSinkTable(s3Bucket, s3Prefix, databaseName, tableName, projectId, appIds, date);

    // @ts-ignore
    expect(glueClientMock).toHaveReceivedCommandTimes(BatchCreatePartitionCommand, 1);
  });

  it('Should generate daily partitions for one day', async () => {
    const s3Bucket = 'bucket1';
    const s3Prefix = 'prefix1/';

    const projectId = 'projectId1';
    const tableName = 'test_table';
    const appIds = 'appId1,appId2';

    const date = new Date(2022, 0, 1);

    const partitions: PartitionInput[] = glueClientUtil.generateDailyPartitionsOfDay(s3Bucket, s3Prefix, projectId, tableName, appIds, date);

    expect(partitions.length).toBe(2);

    appIds.split(',').forEach((appId) => {
      expect(partitions.filter((partitionInput) => {
        return partitionInput.Values!.toString() == [appId, '2022', '01', '01'].toString();
      }).length).toBe(1);
      expect(partitions.filter((partitionInput) => {
        return partitionInput.StorageDescriptor?.Location ==
          `s3://bucket1/prefix1/${projectId}/${tableName}/partition_app=${appId}/partition_year=2022/partition_month=01/partition_day=01/`;
      }).length).toBe(1);
    });
    expect(s3ClientMock).toHaveReceivedCommand(PutObjectCommand);
  });

});
