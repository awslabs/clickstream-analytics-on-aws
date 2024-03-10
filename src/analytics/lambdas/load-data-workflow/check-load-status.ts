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
import { DescribeStatementCommand, StatusString } from '@aws-sdk/client-redshift-data';
import {
  DeleteObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { Context } from 'aws-lambda';
import { logger } from '../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../common/sdk-client-config';
import { handleBackoffTimeInfo } from '../../../common/workflow';
import { ManifestBody } from '../../private/model';
import { getRedshiftClient } from '../redshift-data';

// Set the AWS Region.
const REGION = process.env.AWS_REGION; //e.g. "us-east-1"
const ddbClient = new DynamoDBClient({
  ...aws_sdk_client_common_config,
  region: REGION,
});
const s3Client = new S3Client({
  ...aws_sdk_client_common_config,
  region: REGION,
});

const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;
const REDSHIFT_DATA_API_ROLE_ARN = process.env.REDSHIFT_DATA_API_ROLE!;

const MAX_RETRY = 5;

type CheckLoadStatusEventDetail = ManifestBody & {
  id: string;
  status: string;
}

export interface CheckLoadStatusEvent {
  detail: CheckLoadStatusEventDetail;
}

const redshiftDataApiClient = getRedshiftClient(REDSHIFT_DATA_API_ROLE_ARN);

/**
 * The lambda function get load status in Redshift by query_id.
 * @param event ScheduleEvent.
 * @param context The context of lambda function.
 * @returns The load results of query_id.
 */
async function _handler(event: CheckLoadStatusEvent, context: Context) {
  logger.debug('request event:', { event });
  logger.debug(`context.awsRequestId:${context.awsRequestId}`);

  const queryId = event.detail.id;
  const retryCount = event.detail.retryCount;
  const appId = event.detail.appId;
  const dynamodbTableName = DYNAMODB_TABLE_NAME!;
  const manifestFileName = event.detail.manifestFileName;
  let jobList = event.detail.jobList;
  logger.debug(`query_id:${queryId}`);
  // There is a loading job need to check result.
  const response = await checkLoadStatus(queryId);
  let errMsg = '';
  try {
    if (response.Status == StatusString.FINISHED) {
      logger.info('Load success and delete the job in Dynamodb.');
      for (const entry of jobList.entries) {
        const url = entry.url;
        logger.debug(`delFinishedJobInDynamodb s3Uri:${url}`);
        try {
          const dynamodbResponse = await delFinishedJobInDynamodb(dynamodbTableName, url);
          logger.debug('delFinishedJobInDynamodb response:', { dynamodbResponse });
        } catch (err) {
          errMsg = 'Error when deleting loaded jobs in DDB.';
          throw err;
        };
      }
      logger.info('Load success and delete the manifest file on S3.');
      const key = manifestFileName.slice('s3://'.length);
      const s3Bucket = key.split('/')[0];
      const s3Object = key.slice(s3Bucket.length + '/'.length);
      logger.debug(`delFinishedJobInS3 s3Bucket:${s3Bucket}, s3Object:${s3Object}`);
      try {
        const s3Response = await delFinishedJobInS3(s3Bucket, s3Object);
        logger.debug('delFinishedJobInS3 response:', { s3Response });
      } catch (err) {
        logger.error(`Error when deleting manifest file ${s3Object} in S3 bucket ${s3Bucket}.`, (err as Error));
      }
      return {
        detail: {
          status: response.Status,
        },
      };
    } else if (response.Status == StatusString.FAILED || response.Status == StatusString.ABORTED) {
      logger.info(`Executing ${queryId} status of statement is ${response.Status}`);
      return {
        detail: {
          id: queryId,
          status: response.Status,
          message: response.Error,
          appId: appId,
          manifestFileName: manifestFileName,
          jobList: jobList,
          retry: retryCount < MAX_RETRY && (!!response.Error?.includes('could not complete because of conflict with concurrent transaction')),
          retryCount: retryCount + 1,
        },
      };
    }
    logger.info(`Executing ${queryId} status of statement is ${response.Status}`);
    return {
      detail: {
        id: queryId,
        status: response.Status,
        appId: appId,
        manifestFileName: manifestFileName,
        jobList: jobList,
        retryCount,
      },
    };
  } catch (err) {
    if (err instanceof Error) {
      logger.error(errMsg, err);
    }
    throw err;
  }
};

export const handler = handleBackoffTimeInfo(_handler);

/**
 * Check load status in Redshift.
 * @param queryId The ID of query.
 * @returns The load status response with a query ID.
 */
export const checkLoadStatus = async (queryId: string) => {
  logger.info(`checkLoadStatus by query_id:${queryId}`);
  const params = new DescribeStatementCommand({
    Id: queryId,
  });
  try {
    const response = await redshiftDataApiClient.send(params);
    if (response.Status == 'FAILED') {
      logger.error(`Get load status: ${response.Status}`, { response });
    } else {
      logger.info(`Get load status: ${response.Status}`, { response });
    }
    return response;
  } catch (err) {
    if (err instanceof Error) {
      logger.error('Error when checking status of loading job.', err);
    }
    throw err;
  }
};

/**
 * The function to delete manifest file on S3.
 * @param s3Bucket The name of S3 bucket.
 * @param s3Object The name of S3 object.
 * @returns The response of delete action.
 */
export const delFinishedJobInS3 = async (s3Bucket: string, s3Object: string) => {
  const params = {
    Bucket: s3Bucket,
    Key: s3Object,
  };
  const response = await s3Client.send(new DeleteObjectCommand(params));
  return response;
};

/**
 * The function to delete job list in Dynamodb.
 * @param tableName The name of table in Dynamodb.
 * @param s3Uri The URI of S3 object as partition key in Dynamodb.
 * @returns The response of delete action.
 */
export const delFinishedJobInDynamodb = async (tableName: string, s3Uri: string) => {
  const params = {
    TableName: tableName,
    Key: {
      s3_uri: s3Uri,
    },
  };
  logger.info(`delete ${s3Uri} from ${tableName}`);

  const response = await ddbClient.send(new DeleteCommand(params));
  return response;
};