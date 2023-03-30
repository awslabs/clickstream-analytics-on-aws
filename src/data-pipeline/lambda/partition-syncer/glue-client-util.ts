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
  BatchCreatePartitionCommand,
  BatchCreatePartitionCommandInput,
  GlueClient,
  PartitionInput,
} from '@aws-sdk/client-glue';
import { putStringToS3 } from '../../../common/s3';
import { getSinkTableLocationPrefix } from '../../utils/utils-common';

export class GlueClientUtil {

  private readonly client: GlueClient;

  public constructor() {
    this.client = new GlueClient({});
  }

  public async addHourlyPartitionsForSourceTable
  (s3Bucket: string, s3Prefix: string, databaseName: string, tableName: string, date: Date): Promise<void> {
    const partitions = this.generateHourlyPartitionsOfDay(s3Bucket, s3Prefix, date);
    await this.addNewPartitions(databaseName, tableName, partitions);
  }

  private async addNewPartitions(databaseName: string, tableName: string, partitions: PartitionInput[]) {
    const params: BatchCreatePartitionCommandInput = {
      DatabaseName: databaseName,
      TableName: tableName,
      PartitionInputList: partitions,
    };
    const batchCreatePartitionCommand = new BatchCreatePartitionCommand(params);
    await this.client.send(batchCreatePartitionCommand);

    for (const p of partitions) {
      await this.writeEmptyFileForPartition(p);
    }
  }

  private async writeEmptyFileForPartition(p: PartitionInput) {
    if (!p.StorageDescriptor) {
      throw new Error('empty StorageDescriptor');
    }
    const s3ObjUri = `${p.StorageDescriptor.Location}_.json`;
    const s3Url = new URL(s3ObjUri);
    const bucket = s3Url.hostname;
    const key = s3Url.pathname.substring(1);
    await putStringToS3('', bucket, key);
  }

  public generateHourlyPartitionsOfDay(s3Bucket: string, s3Prefix: string, date: Date): PartitionInput[] {
    const partitions: PartitionInput[] = [];

    const year = date.getFullYear().toString();
    const month = this.padTo2Digits(date.getMonth() + 1);
    const day = this.padTo2Digits(date.getDate());

    Array.from(Array(24).keys()).forEach((i) => {
      const hour = this.padTo2Digits(i);
      partitions.push({
        Values: [
          year,
          month,
          day,
          hour,
        ],
        StorageDescriptor: {
          Location: `s3://${s3Bucket}/${s3Prefix}year=${year}/month=${month}/day=${day}/hour=${hour}/`,
          InputFormat: 'org.apache.hadoop.mapred.TextInputFormat',
          OutputFormat: 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat',
          Compressed: false,
          NumberOfBuckets: -1,
          SerdeInfo: {
            SerializationLibrary: 'org.openx.data.jsonserde.JsonSerDe',
          },
          BucketColumns: [],
          SortColumns: [],
          Parameters: {
            compressionType: 'gzip',
            classification: 'json',
            typeOfData: 'file',
          },
        },
      });
    });
    return partitions;
  }

  private padTo2Digits(num: number) {
    return num.toString().padStart(2, '0');
  }

  public async addDailyPartitionsForSinkTable
  (s3Bucket: string, s3Prefix: string, databaseName: string, tableName: string, projectId: string, appIds: string, date: Date): Promise<void> {
    const partitions = this.generateDailyPartitionsOfDay(s3Bucket, s3Prefix, projectId, tableName, appIds, date);
    await this.addNewPartitions(databaseName, tableName, partitions);
  }

  public generateDailyPartitionsOfDay(s3Bucket: string, s3Prefix: string, projectId: string, tableName: string,
    appIds: string, date: Date): PartitionInput[] {
    const partitions: PartitionInput[] = [];

    const year = date.getFullYear().toString();
    const month = this.padTo2Digits(date.getMonth() + 1);
    const day = this.padTo2Digits(date.getDate());

    const locationPrefix = getSinkTableLocationPrefix(s3Prefix, projectId, tableName);

    appIds.split(',').forEach((appId) => {
      partitions.push({
        Values: [
          appId,
          year,
          month,
          day,
        ],
        StorageDescriptor: {
          Location: `s3://${s3Bucket}/${locationPrefix}` +
          `partition_app=${appId}/partition_year=${year}/partition_month=${month}/partition_day=${day}/`,

          InputFormat: 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat',
          OutputFormat: 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat',
          Compressed: false,
          NumberOfBuckets: -1,
          SerdeInfo: {
            SerializationLibrary: 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe',
            Parameters: {
              'serialization.format': '1',
            },
          },
          BucketColumns: [],
          SortColumns: [],
          Parameters: {
            compressionType: 'none',
            classification: 'parquet',
            typeOfData: 'file',
          },
        },
      });
    });
    return partitions;
  }
}