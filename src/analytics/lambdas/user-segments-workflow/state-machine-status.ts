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
  aws_sdk_client_common_config,
  logger,
  parseDynamoDBTableARN,
  SegmentJobStatus,
} from '@aws/clickstream-base-lib';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { SegmentJobInitOutput } from './segment-job-init';
import { handleBackoffTimeInfo } from '../../../common/workflow';

export type StateMachineStatusEvent = SegmentJobInitOutput;

export interface StateMachineStatusOutput {
  appId: string;
  segmentId: string;
  jobRunId: string;
  stateMachineStatus: StateMachineStatus;
}

export enum StateMachineStatus {
  IDLE = 'IDLE',
  BUSY = 'BUSY',
}

const { ddbRegion, ddbTableName } = parseDynamoDBTableARN(process.env.CLICKSTREAM_METADATA_DDB_ARN!);
const ddbClient = new DynamoDBClient({
  ...aws_sdk_client_common_config,
  region: ddbRegion,
});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const _handler = async (event: StateMachineStatusEvent) => {
  try {
    // Get running segment jobs
    const response = await ddbDocClient.send(new QueryCommand({
      TableName: ddbTableName,
      IndexName: 'prefix-time-index',
      KeyConditionExpression: 'prefix = :prefix',
      FilterExpression: 'jobStatus = :status',
      ExpressionAttributeValues: {
        ':prefix': `SEGMENT_JOB_FOR#${event.segmentId}`,
        ':status': SegmentJobStatus.IN_PROGRESS,
      },
    }));

    const output: StateMachineStatusOutput = {
      appId: event.appId,
      segmentId: event.segmentId,
      jobRunId: event.jobRunId,
      stateMachineStatus: (response.Items === undefined || response.Items.length === 0) ?
        StateMachineStatus.IDLE : StateMachineStatus.BUSY,
    };
    return output;
  } catch (err) {
    logger.error('Failed to get state machine status', err as Error);
    throw err;
  }
};

export const handler = handleBackoffTimeInfo(_handler);
