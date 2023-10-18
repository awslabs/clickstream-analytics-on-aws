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


import { CloudFormationCustomResourceEvent, Context, EventBridgeEvent } from 'aws-lambda';
import { GlueClientUtil } from './glue-client-util';
import { logger } from '../../../common/powertools';
import { SinkTableEnum } from '../../data-pipeline';
import { InitPartitionCustomResourceProps } from '../../utils/custom-resource';

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
type EventType = ScheduledEvent | PartitionDateEvent | CloudFormationCustomResourceEvent;

export const handler = async (event: EventType, context: Context) => {
  logger.info(JSON.stringify(event));

  const date = isAnPartitionDate(event) ? new Date(event.year, event.month - 1, event.day) : new Date();

  const response = {
    Reason: '',
    Status: 'SUCCESS',
  };

  if ('Delete' == (event as any).RequestType) {
    return response;
  }

  try {
    await _handler(event, date, context);
    logger.info('=== Glue catalog add partition completed ===');
    return response;
  } catch (e: any) {
    logger.error(e);
    throw e;
  }
};

async function _handler(event: EventType, date: Date, context: Context) {
  logger.info(`functionName: ${context.functionName}`);
  const glueClientUtil = new GlueClientUtil();

  let sourceS3Bucket = process.env.SOURCE_S3_BUCKET_NAME!;
  let sourceS3Prefix = process.env.SOURCE_S3_PREFIX!;
  let databaseName = process.env.DATABASE_NAME!;
  let sourceTableName = process.env.SOURCE_TABLE_NAME!;
  let projectId = process.env.PROJECT_ID!;
  let appIds = process.env.APP_IDS ?? '';
  let sinkS3Bucket = process.env.SINK_S3_BUCKET_NAME!;
  let sinkS3Prefix = process.env.SINK_S3_PREFIX!;

  if ((event as any).RequestType) {
    // update/create by custom resource
    const cfEvent = event as CloudFormationCustomResourceEvent;
    interface ResourcePropertiesType extends InitPartitionCustomResourceProps {
      ServiceToken: string;
    }

    const cfProps = cfEvent.ResourceProperties as ResourcePropertiesType;
    logger.info('triggered by custom resource', { cfProps });

    sourceS3Bucket = cfProps.sourceS3BucketName;
    sourceS3Prefix = cfProps.sourceS3Prefix;
    databaseName = cfProps.databaseName;
    sourceTableName = cfProps.sourceTableName;
    projectId = cfProps.projectId;
    appIds = cfProps.appIds;
    sinkS3Bucket = cfProps.sinkS3BucketName;
    sinkS3Prefix = cfProps.sinkS3Prefix;
  }


  await glueClientUtil.addHourlyPartitionsForSourceTable(sourceS3Bucket, sourceS3Prefix, databaseName, sourceTableName, date);
  logger.info(`Added hourly partitions in table: ${sourceTableName} of date:${date.toISOString()}`);

  if (appIds.length > 0) {
    for (let sinkTableName of [SinkTableEnum.EVENT,
      SinkTableEnum.EVENT_PARAMETER, SinkTableEnum.USER,
      SinkTableEnum.ITEM]) {
      await glueClientUtil.addDailyPartitionsForSinkTable(sinkS3Bucket, sinkS3Prefix, databaseName, sinkTableName, projectId, appIds, date);
      logger.info(`Added daily partitions in table: ${sinkTableName} of date:${date.toISOString()}`);
    }
  } else {
    logger.info('appId is empty, ignore addDailyPartitions for sink tables');
  }
}
