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
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeEvent, S3ObjectCreatedNotificationEventDetail } from 'aws-lambda';
import { logger } from '../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../common/sdk-client-config';
import { JobStatus } from '../../private/constant';

// Set the AWS Region.
const REGION = process.env.AWS_REGION; //e.g. "us-east-1"
// Create an Amazon DynamoDB service client object.
const ddbClient = new DynamoDBClient({
  ...aws_sdk_client_common_config,
  region: REGION,
});

const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;
const S3_FILE_SUFFIX = process.env.S3_FILE_SUFFIX;
const REDSHIFT_ODS_TABLE_NAME = process.env.REDSHIFT_ODS_TABLE_NAME;
const APP_IDS = process.env.APP_IDS;

/**
 * The lambda function try to put a item to Dynamodb table,
 * and it is invoked by EventBridge which trigged by S3 object create events.
 * @param event EventBridgeEvent, the JSON format is as following:
{
  "version": "0",
  "id": "e060e26a-21a1-0469-40ea-b96669a2c7f3",
  "detail-type": "Object Created",
  "source": "aws.s3",
  "account": "xxxxxxxxxxxx",
  "time": "2022-11-30T06:54:33Z",
  "region": "us-east-2",
  "resources": [
    "arn:aws:s3:::DOC-EXAMPLE-BUCKET"
  ],
  "detail": {
    "version": "0",
    "bucket": {
      "name": "DOC-EXAMPLE-BUCKET"
    },
    "object": {
      "key": "project1/ods_external_events/partition_app=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy",
      "size": 8912078,
      "etag": "36f8b9f9eec955fb49a05237d43114a6-2",
      "version-id": "a12fGHp9y0ec4Xwo6AIZnzvfPOr_mUmC",
      "sequencer": "006386FE29685D0356"
    },
    "request-id": "5J97ZG32D12H9QRX",
    "requester": "xxxxxxxxxxxx",
    "source-ip-address": "xx.xxx.xx.x",
    "reason": "CompleteMultipartUpload"
  }
}
 * @returns The result of putting item to dynamodb.
 */
export const handler = async (event: EventBridgeEvent<'Object Created', S3ObjectCreatedNotificationEventDetail>) => {
  // Create a Date object from the date string
  let date = new Date(event.time);
  // Get the timestamp as a number
  let timestamp = date.getTime();
  const s3Bucket = event.detail.bucket.name;
  const s3Object = event.detail.object.key;
  const s3ObjSize = JSON.stringify(event.detail.object.size);
  let tableName = DYNAMODB_TABLE_NAME!;
  const jobStatus = JobStatus.JOB_NEW;
  const appIdList = APP_IDS?.split(',') || [];
  if (checkS3FileValidity(s3Object, appIdList)) {
    logger.info(`${S3_FILE_SUFFIX}, put ${s3Object} with status ${jobStatus}.`);
    await putItem(tableName, s3Bucket, s3Object, s3ObjSize, jobStatus, timestamp);
  } else {
    logger.warn(`S3 file ${s3Object} is not matched with 
      ${/partition_app=([^/]+)\/partition_year=\d{4}\/partition_month=\d{2}\/partition_day=\d{2}\//} pattern
      or ${S3_FILE_SUFFIX} suffix`);
  }
};

/**
 * Function to put item to Dynamodb table.
 * @param tableName Table name in Dynamodb.
 * @param s3Bucket The partition key in the table.
 * @param s3Object The sort key in the table.
 * @param s3ObjSize The S3 object size needed by the Redshift copy command using manifest file.
 * @param jobStatus The status of loading data job, the value must be 'NEW'.
 * @param timestamp The S3 object create event notification timestamp.
 */
export const putItem = async (tableName: string, s3Bucket: string, s3Object: string, s3ObjSize: string, jobStatus: string, timestamp: number) => {
  const qJobStatus = composeJobStatus(jobStatus, REDSHIFT_ODS_TABLE_NAME);

  // Set the parameters.
  const s3Uri = 's3://' + s3Bucket + '/' + s3Object;
  const params = {
    TableName: tableName,
    Item: {
      s3_uri: s3Uri,
      timestamp: timestamp,
      s3_object: s3Object,
      s3_object_size: s3ObjSize,
      job_status: qJobStatus,
    },
  };

  logger.info(`put ${s3Uri} with status: ${jobStatus}.`);
  try {
    const data = await ddbClient.send(new PutCommand(params));
    logger.info('Success - item added or updated', data);
  } catch (err) {
    if (err instanceof Error) {
      logger.error('Error when putting item to DDB.', err);
    }
    throw err;
  }
};

function checkS3FileValidity(s3FileKey: string, appIdList: string[]) {
  const regex = /partition_app=([^/]+)\/partition_year=\d{4}\/partition_month=\d{2}\/partition_day=\d{2}\//;
  const match = s3FileKey.match(regex);
  if (!match) {
    return false;
  }

  const appId = match[1];
  if (!appIdList.includes(appId)) {
    return false;
  }
  if (S3_FILE_SUFFIX == undefined || S3_FILE_SUFFIX.length == 0 || s3FileKey.endsWith(S3_FILE_SUFFIX)) {
    return true;
  }
  return false;
}

export function composeJobStatus(status: string, odsTableName?: string) {
  if (! odsTableName) {
    return status;
  }
  if (status.includes('#')) {
    return status;
  }
  return `${odsTableName}#${status}`;
}