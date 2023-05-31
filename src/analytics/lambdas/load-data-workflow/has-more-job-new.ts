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


import { Context } from 'aws-lambda';
import { queryItems } from './create-load-manifest';
import { logger } from '../../../common/powertools';
import { JobStatus } from '../../private/constant';

const ODS_EVENT_BUCKET = process.env.ODS_EVENT_BUCKET!;
const ODS_EVENT_BUCKET_PREFIX = process.env.ODS_EVENT_BUCKET_PREFIX!;
const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;
const DYNAMODB_TABLE_INDEX_NAME = process.env.DYNAMODB_TABLE_INDEX_NAME!;

export const handler = async (_: any, context: Context) => {
  const requestId = context.awsRequestId;
  logger.debug(`context.awsRequestId:${requestId}`);

  const tableName = DYNAMODB_TABLE_NAME;
  const indexName = DYNAMODB_TABLE_INDEX_NAME;

  const odsEventBucketWithPrefix = `${ODS_EVENT_BUCKET}/${ODS_EVENT_BUCKET_PREFIX}`;
  let jobNewCount = 0;
  let newRecordResp;

  logger.info('queryItems by', {
    tableName,
    indexName,
    odsEventBucketWithPrefix,
    JobStatus: JobStatus.JOB_NEW,
  });
  let lastEvaluatedKey = undefined;

  while (true) {
    newRecordResp = await queryItems(tableName, indexName, odsEventBucketWithPrefix, JobStatus.JOB_NEW, lastEvaluatedKey);
    jobNewCount += newRecordResp.Count;
    if (newRecordResp.LastEvaluatedKey) {
      lastEvaluatedKey = newRecordResp.LastEvaluatedKey;
    } else {
      break;
    }
  }
  logger.info('jobNewCount=' + jobNewCount);
  return {
    jobNewCount: jobNewCount,
  };
};
