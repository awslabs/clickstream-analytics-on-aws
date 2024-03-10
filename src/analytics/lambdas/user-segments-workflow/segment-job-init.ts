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
import { DisableRuleCommand, EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../common/sdk-client-config';
import { formatDate, parseDynamoDBTableARN } from '../../../common/utils';
import {
  SegmentDdbItem,
  SegmentJobStatus,
  SegmentJobStatusItem,
  SegmentJobTriggerType,
} from '../../private/segments/segments-model';

interface SegmentJobInitEvent {
  appId: string;
  segmentId: string;
  trigger: SegmentJobTriggerType;
}

export interface SegmentJobInitOutput {
  appId: string;
  segmentId: string;
  jobRunId: string;
  scheduleIsExpired: boolean;
}

const { ddbRegion, ddbTableName } = parseDynamoDBTableARN(process.env.CLICKSTREAM_METADATA_DDB_ARN!);
const ddbClient = new DynamoDBClient({
  ...aws_sdk_client_common_config,
  region: ddbRegion,
});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const eventBridgeClient = new EventBridgeClient({
  ...aws_sdk_client_common_config,
  region: process.env.AWS_REGION,
});

export const handler = async (event: SegmentJobInitEvent) => {
  const { segmentId, appId, trigger } = event;

  try {
    // If the job is triggered by EventBridge, check if the refresh schedule is expired
    if (trigger === SegmentJobTriggerType.SCHEDULED) {
      const response = await ddbDocClient.send(new GetCommand({
        TableName: ddbTableName,
        Key: {
          id: appId,
          type: `SEGMENT_SETTING#${segmentId}`,
        },
      }));
      const item = response.Item as SegmentDdbItem;

      // If job schedule has expired, disable the EventBridge rule
      if (Date.now() > item.refreshSchedule.expireAfter && item.eventBridgeRuleArn) {
        const ruleName = item.eventBridgeRuleArn.split(':rule/')[1];
        await eventBridgeClient.send(new DisableRuleCommand({ Name: ruleName }));

        return {
          scheduleIsExpired: true,
        };
      }
    }

    // Create job run status record in DDB
    const jobRunId = uuidv4();
    const item: SegmentJobStatusItem = {
      id: segmentId,
      type: `SEGMENT_JOB#${jobRunId}`,
      jobRunId,
      segmentId,
      date: formatDate(new Date()),
      jobStartTime: Date.now(),
      jobEndTime: 0,
      jobStatus: SegmentJobStatus.PENDING,
      segmentUserNumber: 0,
      totalUserNumber: 0,
      segmentSessionNumber: 0,
      totalSessionNumber: 0,
      sampleData: [],
    };
    await ddbDocClient.send(new PutCommand({
      TableName: ddbTableName,
      Item: item,
    }));

    const output: SegmentJobInitOutput = {
      appId: event.appId,
      segmentId: event.segmentId,
      jobRunId,
      scheduleIsExpired: false,
    };
    return output;
  } catch (err) {
    logger.error('Error when get/put segment setting item for segment job init', err as Error);
    throw err;
  }
};
