/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/


import { Context, EventBridgeEvent } from 'aws-lambda';
import { GlueClientUtil } from './glue-client-util';
import { logger } from '../../../common/powertools';

interface PartitionDateEvent {
  year: number;
  month: number;
  day: number;
}

function isAnPartitionDate(obj: any): obj is PartitionDateEvent {
  return 'year' in obj && 'month' in obj && 'day' in obj;
}

interface EmptyEventDetail {
}


type ScheduledEvent = EventBridgeEvent<'Scheduled Event', EmptyEventDetail>;
export const handler = async (event: ScheduledEvent | PartitionDateEvent, context: Context) => {
  logger.info(JSON.stringify(event));

  const date = isAnPartitionDate(event) ? new Date(event.year, event.month - 1, event.day) : new Date();

  const response = {
    Reason: '',
    Status: 'SUCCESS',
  };

  try {
    await _handler(date, context);
    logger.info('=== Glue catalog add partition completed ===');
    return response;
  } catch (e: any) {
    logger.error(e);
    throw e;
  }
};

async function _handler(date: Date, context: Context) {
  logger.info(`functionName: ${context.functionName}`);

  const glueClientUtil = new GlueClientUtil();

  const sourceS3Bucket = process.env.SOURCE_S3_BUCKET_NAME!;
  const sourceS3Prefix = process.env.SOURCE_S3_PREFIX!;
  const databaseName = process.env.DATABASE_NAME!;
  const sourceTableName = process.env.SOURCE_TABLE_NAME!;
  await glueClientUtil.addHourlyPartitionsForSourceTable(sourceS3Bucket, sourceS3Prefix, databaseName, sourceTableName, date);
  logger.info(`Added hourly partitions in table: ${sourceTableName} of date:${date.toISOString()}`);

  const projectId = process.env.PROJECT_ID!;
  const appIds = process.env.APP_IDS || '';
  const sinkS3Bucket = process.env.SINK_S3_BUCKET_NAME!;
  const sinkS3Prefix = process.env.SINK_S3_PREFIX!;
  const sinkTableName = process.env.SINK_TABLE_NAME!;
  if (appIds.length > 0) {
    await glueClientUtil.addDailyPartitionsForSinkTable(sinkS3Bucket, sinkS3Prefix, databaseName, sinkTableName, projectId, appIds, date);
    logger.info(`Added daily partitions in table: ${sinkTableName} of date:${date.toISOString()}`);
  } else {
    logger.info(`No new daily partitions in table: ${sinkTableName} of date:${date.toISOString()} as there is no existing app`);
  }
}
