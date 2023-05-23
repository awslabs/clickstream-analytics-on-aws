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

import { Metrics, MetricUnits } from '@aws-lambda-powertools/metrics';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { NativeAttributeValue } from '@aws-sdk/util-dynamodb';
import { Context, ScheduledEvent } from 'aws-lambda';
import { AnalyticsCustomMetricsName, MetricsNamespace, MetricsService, PARTITION_APP } from '../../../common/constant';
import { logger } from '../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../common/sdk-client-config';
import { JobStatus } from '../../private/constant';
import { ManifestItem, ManifestBody } from '../../private/model';

// Set the AWS Region.
const REGION = process.env.AWS_REGION; //e.g. "us-east-1"
// Create an Amazon service client object.
const ddbClient = new DynamoDBClient({
  ...aws_sdk_client_common_config,
  region: REGION,
});
const s3Client = new S3Client({
  ...aws_sdk_client_common_config,
  region: REGION,
});

const MANIFEST_BUCKET = process.env.MANIFEST_BUCKET!;
const MANIFEST_BUCKET_PREFIX = process.env.MANIFEST_BUCKET_PREFIX!;
const ODS_EVENT_BUCKET = process.env.ODS_EVENT_BUCKET!;
const ODS_EVENT_BUCKET_PREFIX = process.env.ODS_EVENT_BUCKET_PREFIX!;
const QUERY_RESULT_LIMIT = process.env.QUERY_RESULT_LIMIT!;
const PROCESSING_LIMIT = process.env.PROCESSING_LIMIT!;
const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;
const DYNAMODB_TABLE_INDEX_NAME = process.env.DYNAMODB_TABLE_INDEX_NAME!;
const PROJECT_ID = process.env.PROJECT_ID!;

export interface ODSEventItem {
  readonly s3_uri: string;
  readonly job_status: string;
  readonly s3_object_size: string;
  readonly timestamp: number;
}

const metrics = new Metrics({ namespace: MetricsNamespace.REDSHIFT_ANALYTICS, serviceName: MetricsService.WORKFLOW });

metrics.addDimensions({
  ProjectId: PROJECT_ID,
});

/**
 * The lambda function get maximum 50 items with status NEW from Dynamodb table,
 * and it is invoked by EventBridge which trigged by S3 object create events.
 * @param event ScheduleEvent, the JSON format is as follows:
 {
  "version": "0",
  "id": "e073f888-c8d4-67ac-2b2c-f858903d4e7c",
  "detail-type": "Scheduled Event",
  "source": "aws.events",
  "account": "xxxxxxxxxxxx",
  "time": "2023-02-24T13:14:18Z",
  "region": "us-east-2",
  "resources": [
    "arn:aws:events:us-east-2:xxxxxxxxxxxx:rule/load-data-to-redshift-loaddatatoredshiftManifestOn-RQHE7PBBA2KD"
  ],
  "detail": {}
}
 * @param context The context of lambda function.
 * @returns The list of manifest file.
 */
export const handler = async (_event: ScheduledEvent, context: Context) => {
  const requestId = context.awsRequestId;

  logger.debug(`context.awsRequestId:${requestId}.`);


  const tableName = DYNAMODB_TABLE_NAME;
  const indexName = DYNAMODB_TABLE_INDEX_NAME;

  const queryResultLimit = parseInt(QUERY_RESULT_LIMIT);
  const processingLimit = parseInt(PROCESSING_LIMIT);

  const odsEventBucketWithPrefix = `${ODS_EVENT_BUCKET}/${ODS_EVENT_BUCKET_PREFIX}`;

  let oldestFileTimestamp = 0;

  // Get all items with status=NEW
  var candidateItems: Array<ODSEventItem> = [];
  var newRecordResp = await queryItems(tableName, indexName, odsEventBucketWithPrefix, JobStatus.JOB_NEW, undefined);
  // all JOB_NEW count for metrics
  var allJobNewCount = newRecordResp.Count;
  logger.info('queryItems response: ', newRecordResp);

  if (newRecordResp.Count! > 0) {
    oldestFileTimestamp = newRecordResp.Items[0].timestamp;
  }

  while (newRecordResp.Count! > 0) {
    candidateItems = candidateItems.concat(newRecordResp.Items!);

    if (candidateItems.length < queryResultLimit && newRecordResp.LastEvaluatedKey) {
      newRecordResp = await queryItems(tableName, indexName, odsEventBucketWithPrefix, JobStatus.JOB_NEW, newRecordResp.LastEvaluatedKey);
      allJobNewCount += newRecordResp.Count;
    } else if (newRecordResp.LastEvaluatedKey) {
      allJobNewCount += (await queryItems(tableName, indexName, odsEventBucketWithPrefix, JobStatus.JOB_NEW, newRecordResp.LastEvaluatedKey)).Count;
    } else {
      break;
    }
  }

  // Get items with status=PROCESSING
  let processJobNum = 0;
  let processingResp = await queryItems(tableName, indexName, odsEventBucketWithPrefix, JobStatus.JOB_PROCESSING, undefined);

  if (processingResp.Count > 0) {
    oldestFileTimestamp = Math.min(processingResp.Items[0].timestamp, oldestFileTimestamp);
  }

  while (processingResp.Count > 0) {
    processJobNum += processingResp.Count;

    if (processingResp.LastEvaluatedKey) {
      processingResp = await queryItems(tableName, indexName, odsEventBucketWithPrefix, JobStatus.JOB_PROCESSING, processingResp.LastEvaluatedKey);
    } else {
      break;
    }
  }

  let maxFileAgeSeconds = 0;
  if (oldestFileTimestamp > 0) {
    maxFileAgeSeconds = (new Date().getTime() - oldestFileTimestamp)/1000;
    logger.info('oldestFileTimestamp:' + oldestFileTimestamp + ', maxFileAgeSeconds:' + maxFileAgeSeconds);
  }

  metrics.addMetric(AnalyticsCustomMetricsName.FILE_NEW, MetricUnits.Count, allJobNewCount);
  metrics.addMetric(AnalyticsCustomMetricsName.FILE_PROCESSING, MetricUnits.Count, processJobNum);
  metrics.addMetric(AnalyticsCustomMetricsName.FILE_MAX_AGE, MetricUnits.Seconds, maxFileAgeSeconds);
  metrics.publishStoredMetrics();

  if (processJobNum >= processingLimit) {
    const msg = `Abort this loading data due to jobs with JobStatus=JOB_PROCESSING [${processJobNum}] exceeded the allowed quota [${processingLimit}]`;
    logger.warn(msg);
    return {
      message: msg,
      manifestList: [],
      count: 0,
    };
  }

  const groupedManifestItems: { [key: string]: ManifestItem[] } = {};
  const manifestFiles: ManifestBody[] = [];
  if (candidateItems.length > 0) {
    const loadItemsLength = candidateItems.length > (queryResultLimit - processJobNum) ? (queryResultLimit - processJobNum) : candidateItems.length;

    const itemsToBeLoaded = candidateItems.slice(0, loadItemsLength);
    logger.debug('Queried candidate to be loaded ', { itemsToBeLoaded });
    const updateItemsPromise = itemsToBeLoaded.map(
      (item: Record<string, NativeAttributeValue>) => updateItem(tableName, item.s3_uri, requestId, JobStatus.JOB_ENQUEUE));
    await Promise.all(updateItemsPromise);

    itemsToBeLoaded.forEach((item) => {
      const appId = getAppIdFromS3Object(item.s3_uri);
      if (appId == null || appId.length == 0) {
        logger.error(`App partition '${PARTITION_APP}' not found in object path ${item.s3_uri}`);
      } else {
        logger.debug(`Parsed appId '${appId}' from source file path ${item.s3_uri}`);
        if (!groupedManifestItems[appId]) {
          groupedManifestItems[appId] = [];
        }
        groupedManifestItems[appId].push({
          url: item.s3_uri,
          meta: {
            content_length: parseInt(item.s3_object_size),
          },
        });
      }
    });

    logger.debug('Dump to manifest from grouped manifest items', groupedManifestItems);
    for (const appId of Object.keys(groupedManifestItems)) {
      const entries = { entries: groupedManifestItems[appId] };
      const manifestFile = await uploadFileToS3(MANIFEST_BUCKET, `${MANIFEST_BUCKET_PREFIX}manifest/`, `${appId}-${requestId}.manifest`,
        JSON.stringify(entries));
      manifestFiles.push({
        appId: appId,
        manifestFileName: manifestFile,
        jobList: entries,
      });
    }
  }

  return {
    manifestList: manifestFiles,
    count: manifestFiles.length,
  };
};

/**
 * Get the appId from the object name on S3.
 * @param s3Object The name of S3 object.
 * project1/ods_external_events/partition_app=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy",
 * @returns The appId.
 */
function getAppIdFromS3Object(s3Object: string) {
  const dirArray = s3Object.split('/');
  for (let i = 0; i < dirArray.length; i++) {
    if (dirArray[i].indexOf(`${PARTITION_APP}=`) != -1) {
      return dirArray[i].split('=')[1];
    }
  }
  return null;
}

/**
 * Function to query items from Dynamodb table.
 * @param tableName Table name in Dynamodb.
 * @param s3Bucket The partition key in the table.
 * @param s3Object The sort key in the table.
 */
const queryItems = async (tableName: string, indexName: string, prefix: string, jobStatus: string, lastEvaluatedKey: any): Promise<{
  Count: number;
  Items: ODSEventItem[];
  LastEvaluatedKey?: Record<string, NativeAttributeValue>;
}> => {
  const s3UriPrefix = 's3://' + prefix;

  // Set the parameters.
  const params = {
    TableName: tableName,
    IndexName: indexName,
    KeyConditionExpression: '#job_status = :job_status',
    FilterExpression: 'begins_with(#s3_uri, :s3_uri)',
    ExpressionAttributeNames: {
      '#s3_uri': 's3_uri',
      '#job_status': 'job_status',
    },
    ExpressionAttributeValues: {
      ':s3_uri': s3UriPrefix,
      ':job_status': jobStatus,
    },
    ScanIndexForward: true, // Set to false for descending order, true for ascending order
    ExclusiveStartKey: lastEvaluatedKey,
  };

  try {
    logger.debug('queryCommand: ', params);
    const data = await ddbClient.send(new QueryCommand(params));
    logger.info(`Success - items with status ${jobStatus} query`, data);
    return {
      Count: data.Count ?? 0,
      Items: data.Items?.map((item) => (
        {
          s3_uri: item.s3_uri!,
          job_status: item.job_status!,
          s3_object_size: item.s3_object_size!,
          timestamp: item.timestamp!,
        }
      )) ?? [],
      LastEvaluatedKey: data.LastEvaluatedKey,
    };
  } catch (err) {
    if (err instanceof Error) {
      logger.error('Error when query jobs in DDB.', err);
    }
    throw err;
  }
};

/**
 * Function to update item to Dynamodb table.
 * @param tableName Table name in Dynamodb.
 * @param rquestId The request ID in event request body.
 * @param jobStatus The status of job.
 * @returns The response of update item.
 */
const updateItem = async (tableName: string, s3Uri: string, requestId: string, jobStatus: string) => {
  const params = {
    TableName: tableName,
    Key: {
      s3_uri: s3Uri,
    },
    // Define expressions for the new or updated attributes
    UpdateExpression: 'SET #job_status= :p1, #execution_id= :p2',
    ExpressionAttributeNames: {
      '#job_status': 'job_status',
      '#execution_id': 'execution_id',
    },
    ExpressionAttributeValues: {
      ':p1': jobStatus,
      ':p2': requestId,
    },
    ConditionExpression: 'attribute_exists(s3_uri)',
  };
  try {
    logger.debug('UpdateCommand: ', params);
    const data = await ddbClient.send(new UpdateCommand(params));
    logger.info(`Success - item ${s3Uri} update`, data);
    return data;
  } catch (err) {
    if (err instanceof Error) {
      logger.error('Error when updating status of jobs in DDB.', err);
    }
    throw err;
  }
};

/**
 * Upload manifest file to S3.
 * @param s3Bucket The bucket name of S3.
 * @param fileName The manifest file name.
 * @param jobList The content of the manifest file.
 * @returns The upload response.
 */
const uploadFileToS3 = async (s3Bucket: string, s3Prefix: string, filename: string, loadItemsStr: string) => {
  const keyPath = `${s3Prefix}${filename}`;
  const s3Obj = `s3://${s3Bucket}/${keyPath}`;
  logger.debug(`Uploading object: ${s3Obj} with content ${loadItemsStr}`);
  // Set the parameters.
  const bucketParams = {
    Bucket: s3Bucket,
    // Specify the name of the new object. For example, 'index.html'.
    // To create a directory for the object, use '/'. For example, 'myApp/package.json'.
    Key: keyPath,
    // Content of the new object.
    Body: loadItemsStr,
  };

  try {
    const data = await s3Client.send(new PutObjectCommand(bucketParams));
    logger.info(`Successfully uploaded object ${s3Obj} with response`, { data });
    return s3Obj;
  } catch (err) {
    if (err instanceof Error) {
      logger.error(`Error when putting manifest file ${keyPath} to S3 bucket ${s3Bucket}.`, err);
    }
    throw err;
  }
};