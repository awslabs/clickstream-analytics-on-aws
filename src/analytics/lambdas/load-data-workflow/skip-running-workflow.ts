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
import { JobStatus, REDSHIFT_TABLE_NAMES } from '../../private/constant';

const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;
const DYNAMODB_TABLE_INDEX_NAME = process.env.DYNAMODB_TABLE_INDEX_NAME!;

const REGION = process.env.AWS_REGION; //e.g. "us-east-1"

const sfnClient = new SFNClient({
  region: REGION,
  ...aws_sdk_client_common_config,
});

interface TableCountInfo { tableName: string; countNew: number; countEnQ: number; countProcessing: number }

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
  const odsTableNames = REDSHIFT_TABLE_NAMES;


  const filesCountInfo = [];
  let pendingCount = 0;
  for (const odsTableName of odsTableNames) {
    logger.info('mingtong ######### odsTableName', { odsTableName });
    const tableCountInfo = await getCountForOdsTable(odsTableName, eventBucketWithPrefix);
    filesCountInfo.push(tableCountInfo);
    pendingCount += tableCountInfo.countEnQ + tableCountInfo.countProcessing + tableCountInfo.countNew;
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
    PendingCount: pendingCount,
    FilesCountInfo: filesCountInfo,
    SkipRunningWorkflow: hasRunningWorkflow || pendingCount == 0,
  };
  logger.info('return data', { data });
  return data;
};

async function getCountForOdsTable(odsTableName: string, eventBucketWithPrefix: string): Promise<TableCountInfo> {
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

  logger.info('mingtong ######### countEnQ', { countEnQ });    

  const countProcessing = await queryAllCount(ddbTableName, ddbIndexName, tableBucketWithPrefix,
    composeJobStatus(JobStatus.JOB_PROCESSING, odsTableName));
  
  logger.info('mingtong ######### countProcessing', { countEnQ });    

  const countNew = await queryAllCount(ddbTableName, ddbIndexName, tableBucketWithPrefix,
    composeJobStatus(JobStatus.JOB_NEW, odsTableName));

  logger.info('mingtong ######### countNew', { countNew });    

  return {
    tableName: odsTableName,
    countNew,
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
    res = await queryItems('', tableName, indexName, odsEventBucketWithPrefix, jobStatus, nextKey);
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
