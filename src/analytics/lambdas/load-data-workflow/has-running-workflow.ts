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


import { SFNClient, ListExecutionsCommand, ListExecutionsCommandOutput } from '@aws-sdk/client-sfn';
import { Context } from 'aws-lambda';
import { queryItems } from './create-load-manifest';
import { composeJobStatus } from './put-ods-source-to-store';
import { logger } from '../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../common/sdk-client-config';
import {
  JobStatus, REDSHIFT_EVENT_PARAMETER_TABLE_NAME, REDSHIFT_EVENT_TABLE_NAME,
  REDSHIFT_ITEM_TABLE_NAME, REDSHIFT_ODS_EVENTS_TABLE_NAME, REDSHIFT_USER_TABLE_NAME,
} from '../../private/constant';

const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;
const DYNAMODB_TABLE_INDEX_NAME = process.env.DYNAMODB_TABLE_INDEX_NAME!;

const REGION = process.env.AWS_REGION; //e.g. "us-east-1"

const sfnClient = new SFNClient({
  region: REGION,
  ...aws_sdk_client_common_config,
});

export const handler = async (event: {
  execution_id: string;
  eventBucketName: string;
  eventPrefix: string;
}, context: Context) => {
  logger.info('event', { event });
  // arn:aws:states:us-east-1:xxxxxxxxx:execution:name1:a2k3jkj0-1112
  const executionArn = event.execution_id;
  const tempArr: string[] = executionArn.split(':');
  tempArr.pop();
  const stateMachineArn = tempArr.join(':').replace(':execution:', ':stateMachine:');

  logger.info(`execution_arn: ${executionArn}`);
  logger.info(`stateMachineArn: ${stateMachineArn}`);

  const requestId = context.awsRequestId;
  logger.debug(`context.awsRequestId: ${requestId}`);

  const eventBucketWithPrefix = `${event.eventBucketName}/${event.eventPrefix}`;
  const odsTableNames = [
    REDSHIFT_EVENT_TABLE_NAME, REDSHIFT_EVENT_PARAMETER_TABLE_NAME,
    REDSHIFT_ITEM_TABLE_NAME, REDSHIFT_USER_TABLE_NAME,
    REDSHIFT_ODS_EVENTS_TABLE_NAME,
  ];

  const filesCountInfo = [];
  for (const odsTableName of odsTableNames) {
    filesCountInfo.push(await getCountForOdsTable(odsTableName, eventBucketWithPrefix));
  }

  let hasRunningWorkflow = false;
  logger.info('ListExecutionsCommand, stateMachineArn=' + stateMachineArn);
  const res: ListExecutionsCommandOutput = await sfnClient.send(new ListExecutionsCommand({
    stateMachineArn,
    statusFilter: 'RUNNING',
  }));

  let otherRunningExecutionsCount = 0;

  if (res.executions) {
    logger.info('totalExecutionsCount=' + res.executions.length);
    otherRunningExecutionsCount = res.executions.filter(e => e.executionArn != executionArn).length;
  }

  logger.info('otherRunningExecutionsCount=' + otherRunningExecutionsCount);

  if (otherRunningExecutionsCount > 0) {
    hasRunningWorkflow = true;
  }

  const data = {
    HasRunningWorkflow: hasRunningWorkflow,
    FilesCountInfo: filesCountInfo,
  };
  logger.info('return data', { data });
  return data;
};

async function getCountForOdsTable(odsTableName: string, eventBucketWithPrefix: string) {
  const ddbTableName = DYNAMODB_TABLE_NAME;
  const ddbIndexName = DYNAMODB_TABLE_INDEX_NAME;

  const tableBucketWithPrefix = eventBucketWithPrefix.replace(/\/event\/?$/, `/${odsTableName}/`);
  logger.info('getCountForOdsTable()', {
    odsTableName,
    eventBucketWithPrefix,
    tableBucketWithPrefix,
  });

  const countEnQ = await queryAllCount(ddbTableName, ddbIndexName, tableBucketWithPrefix,
    composeJobStatus(JobStatus.JOB_ENQUEUE, odsTableName));

  const countProcessing = await queryAllCount(ddbTableName, ddbIndexName, tableBucketWithPrefix,
    composeJobStatus(JobStatus.JOB_PROCESSING, odsTableName));

  return {
    tableName: odsTableName,
    countEnQ,
    countProcessing,
  };

}

async function queryAllCount(tableName: string, indexName: string, odsEventBucketWithPrefix: string, jobStatus: string) {
  logger.info('queryAllCount() input', {
    tableName,
    indexName,
    odsEventBucketWithPrefix,
    JobStatus,
  });
  let nextKey = undefined;
  let count = 0;
  let res;
  while (true) {
    res = await queryItems(tableName, indexName, odsEventBucketWithPrefix, jobStatus, nextKey);
    count += res.Count;
    if (res.LastEvaluatedKey) {
      nextKey = res.LastEvaluatedKey;
    } else {
      break;
    }
  }
  logger.info('queryAllCount() return count=' + count + ', jobStatus=' + jobStatus);
  return count;
}
