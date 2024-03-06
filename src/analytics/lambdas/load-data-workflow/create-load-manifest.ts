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

import { PARTITION_APP } from '@aws/clickstream-base-lib';
import { Metrics, MetricUnits } from '@aws-lambda-powertools/metrics';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { NativeAttributeValue } from '@aws-sdk/util-dynamodb';
import { Context } from 'aws-lambda';
import { composeJobStatus } from './put-ods-source-to-store';
import { AnalyticsCustomMetricsName, MetricsNamespace, MetricsService } from '../../../common/model';
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
{
  "version": "0",
  "id": "b13537d9-b14a-6ef1-bd26-fb1090329744",
  "detail-type": "EMR Serverless Job Run State Change",
  "source": "aws.emr-serverless",
  "account": "xxxxxxxxx",
  "time": "2023-05-29T07:49:25Z",
  "region": "us-east-1",
  "resources": [],
  "odsTableName": "event",
  "detail": {
    "jobRunId": "00fag0b74fhau80a",
    "jobRunName": "1685345723122-ac3e0971-8c7c-444e-bc60-3388bee9afef",
    "applicationId": "00faddrcc3p0sf09",
    "arn": "arn:aws:emr-serverless:us-east-1:xxxxxxxxx:/applications/00faddrcc3p0sf09/jobruns/00fag0b74fhau80a",
    "releaseLabel": "emr-6.9.0",
    "state": "SUCCESS",
    "previousState": "RUNNING",
    "createdBy": "arn:aws:sts::xxxxxxxxx:assumed-role/dp-kinesis-DataPipelineWi-EmrSparkJobSubmitterLamb-5UVKIGJQO9FE/dp-kinesis-DataPipelineWi-EmrSparkJobSubmitterFunc-2QNLgF5pu4Z8",
    "updatedAt": "2023-05-29T07:49:25.283071Z",
    "createdAt": "2023-05-29T07:45:43.780900Z"
  }
}
 * @param context The context of lambda function.
 * @returns The list of manifest file.
 */
export const handler = async (_event: any, context: Context) => {
  const requestId = context.awsRequestId;
  const nowMillis = new Date().getTime(); //.getMilliseconds;


  logger.debug(`context.awsRequestId:${requestId}.`);
  logger.debug('triggered by job', _event.detail);
  logger.info('nowMilis: ' + nowMillis);

  const tableName = DYNAMODB_TABLE_NAME;
  const indexName = DYNAMODB_TABLE_INDEX_NAME;

  const odsTableName = _event.odsTableName;

  const queryResultLimit = parseInt(QUERY_RESULT_LIMIT);

  const odsEventBucketWithPrefix = `${ODS_EVENT_BUCKET}/${ODS_EVENT_BUCKET_PREFIX}${odsTableName}/`;

  let newMinFileTimestamp = nowMillis;

  // Get all items with status=NEW
  let candidateItems: Array<ODSEventItem> = [];
  let newRecordResp = await queryItems(odsTableName, tableName, indexName, odsEventBucketWithPrefix, JobStatus.JOB_NEW, undefined);
  // all JOB_NEW count for metrics
  let allJobNewCount = newRecordResp.Count;
  logger.info('queryItems response count=' + newRecordResp.Count);

  if (newRecordResp.Count > 0) {
    newMinFileTimestamp = newRecordResp.Items[0].timestamp;
  }

  logger.info(`checked JOB_NEW, oldestFileTimestamp: ${newMinFileTimestamp}`);

  while (newRecordResp.Count > 0) {
    if (candidateItems.length < queryResultLimit) {
      candidateItems = candidateItems.concat(newRecordResp.Items);
    }
    if (newRecordResp.LastEvaluatedKey) {
      newRecordResp = await queryItems(odsTableName, tableName, indexName, odsEventBucketWithPrefix, JobStatus.JOB_NEW, newRecordResp.LastEvaluatedKey);
      allJobNewCount += newRecordResp.Count;
    } else {
      break;
    }
  }

  logger.info(`allJobNewCount: ${allJobNewCount}, candidateItems.length: ${candidateItems.length}`);

  // reprocess files in JOB_PROCESSING
  let processingRecordResp = await queryItems(odsTableName, tableName, indexName, odsEventBucketWithPrefix, JobStatus.JOB_PROCESSING, undefined);
  if (processingRecordResp.Count > 0) {
    const processingAsCandidateItems = processingRecordResp.Items.slice(0, queryResultLimit);
    logger.info(`add ${processingAsCandidateItems.length} JOB_PROCESSING files to candidateItems`);
    candidateItems = candidateItems.concat(processingAsCandidateItems);
  }

  logger.info('candidateItems.length: ' + candidateItems.length);

  const response = await doManifestFiles(odsTableName, candidateItems, queryResultLimit, tableName, requestId);

  const processInfo = await queryJobCountAndMinTimestamp(odsTableName, tableName, indexName, odsEventBucketWithPrefix, JobStatus.JOB_PROCESSING, nowMillis);
  const enQueueInfo = await queryJobCountAndMinTimestamp(odsTableName, tableName, indexName, odsEventBucketWithPrefix, JobStatus.JOB_ENQUEUE, nowMillis);
  const minFileTimestamp = Math.min(newMinFileTimestamp, processInfo.minFileTimestamp, enQueueInfo.minFileTimestamp);
  const maxFileAgeSeconds = (nowMillis - minFileTimestamp) / 1000;

  logger.info('minFileTimestamp:' + minFileTimestamp + ', maxFileAgeSeconds:' + maxFileAgeSeconds);

  metrics.addMetric(AnalyticsCustomMetricsName.FILE_NEW, MetricUnits.Count, allJobNewCount);
  metrics.addMetric(AnalyticsCustomMetricsName.FILE_PROCESSING, MetricUnits.Count, processInfo.jobNum);
  metrics.addMetric(AnalyticsCustomMetricsName.FILE_ENQUEUE, MetricUnits.Count, enQueueInfo.jobNum);
  metrics.addMetric(AnalyticsCustomMetricsName.FILE_MAX_AGE, MetricUnits.Seconds, maxFileAgeSeconds);
  metrics.publishStoredMetrics();

  logger.info('FILE_NEW=' + allJobNewCount + ', FILE_PROCESSING=' + processInfo.jobNum
    + ', FILE_ENQUEUE=' + enQueueInfo.jobNum + ', FILE_MAX_AGE=' + maxFileAgeSeconds);

  return response;
};

const doManifestFiles = async (odsTableName: string, candidateItems: Array<ODSEventItem>,
  queryResultLimit: number, tableName: string, requestId: string) => {
  const groupedManifestItems: { [key: string]: ManifestItem[] } = {};
  const manifestFiles: ManifestBody[] = [];
  logger.info('queryResultLimit=' + queryResultLimit);
  logger.info('candidateItems length=' + candidateItems.length);
  if (candidateItems.length > 0) {
    const loadItemsLength = Math.min(queryResultLimit, candidateItems.length);
    const itemsToBeLoaded = candidateItems.slice(0, loadItemsLength);
    logger.info('Queried candidate to be loaded length=' + itemsToBeLoaded.length);

    const updateItemsPromise = itemsToBeLoaded.map(
      (item: Record<string, NativeAttributeValue>) => updateItem(tableName, item.s3_uri, requestId, JobStatus.JOB_ENQUEUE, odsTableName));
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
      const manifestFile = await uploadFileToS3(MANIFEST_BUCKET, `${MANIFEST_BUCKET_PREFIX}${odsTableName}/manifest/`, `${appId}-${requestId}.manifest`,
        JSON.stringify(entries));
      manifestFiles.push({
        appId: appId,
        manifestFileName: manifestFile,
        jobList: entries,
        retryCount: 0,
      });
    }
  }

  return {
    manifestList: manifestFiles,
    count: manifestFiles.length,
    odsTableName: odsTableName,
  };
};

/**
 * Get the appId from the object name on S3.
 * @param s3Object The name of S3 object.
 * project1/ods_external_events/partition_app=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy",
 * @returns The appId.
 */
function getAppIdFromS3Object(s3Object: string) {
  const pathArray = s3Object.split('/');
  for (const path of pathArray) {
    if (path.indexOf(`${PARTITION_APP}=`) != -1) {
      return path.split('=')[1];
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

export const queryItems = async (odsTableName: string, tableName: string, indexName: string, prefix: string, jobStatus: string, lastEvaluatedKey: any): Promise<{
  Count: number;
  Items: ODSEventItem[];
  LastEvaluatedKey?: Record<string, NativeAttributeValue>;
}> => {
  const s3UriPrefix = 's3://' + prefix;

  const qJobStatus = composeJobStatus(jobStatus, odsTableName);

  logger.info('queryItems() ', {
    tableName,
    qJobStatus,
    s3UriPrefix,
  });

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
      ':job_status': qJobStatus,
    },
    ScanIndexForward: true, // Set to false for descending order, true for ascending order
    ExclusiveStartKey: lastEvaluatedKey,
  };

  try {
    logger.debug('queryCommand: ', params);
    const data = await ddbClient.send(new QueryCommand(params));
    logger.info(`Success - items with status ${qJobStatus} query,  count: ${data.Count ?? 0}`);
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
const updateItem = async (tableName: string, s3Uri: string, requestId: string, jobStatus: string, odsTableName: string) => {
  const qJobStatus = composeJobStatus(jobStatus, odsTableName);

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
      ':p1': qJobStatus,
      ':p2': requestId,
    },
    ConditionExpression: 'attribute_exists(s3_uri)',
  };
  try {
    logger.debug('UpdateCommand: ', params);
    const data = await ddbClient.send(new UpdateCommand(params));
    logger.info(`Success - item ${s3Uri} update`);
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

export async function queryJobCountAndMinTimestamp(
  odsTableName: string,
  tableName: string,
  indexName: string,
  odsEventBucketWithPrefix: string,
  jobStatus: string,
  nowMillis: number) {

  let minFileTimestamp = nowMillis;
  let jobNum = 0;
  let jobResp = await queryItems(odsTableName, tableName, indexName, odsEventBucketWithPrefix, jobStatus, undefined);
  if (jobResp.Count > 0) {
    minFileTimestamp = jobResp.Items[0].timestamp;
  }

  while (jobResp.Count > 0) {
    jobNum += jobResp.Count;

    if (jobResp.LastEvaluatedKey) {
      jobResp = await queryItems(odsTableName, tableName, indexName, odsEventBucketWithPrefix, jobStatus, jobResp.LastEvaluatedKey);
    } else {
      break;
    }
  }
  logger.info(`queryJobCountAndMinTimestamp, checked ${jobStatus}`, { jobStatus, minFileTimestamp, jobNum });

  return {
    minFileTimestamp,
    jobNum,
  };

}