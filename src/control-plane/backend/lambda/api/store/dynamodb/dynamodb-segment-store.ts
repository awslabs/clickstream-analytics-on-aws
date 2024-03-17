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

import { Segment, SegmentDdbItem } from '@aws/clickstream-base-lib';
import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { clickStreamTableName } from '../../common/constants';
import { docClient } from '../../common/dynamodb-client';
import { logger } from '../../common/powertools';
import { SegmentStore } from '../segment-store';

export class DynamoDBSegmentStore implements SegmentStore {
  public async create(segment: Segment): Promise<string> {
    try {
      const item: SegmentDdbItem = {
        ...segment,
        id: segment.appId,
        type: `SEGMENT_SETTING#${segment.segmentId}`,
        deleted: false,
      };

      await docClient.send(new PutCommand({
        TableName: clickStreamTableName,
        Item: item,
      }));

      return segment.segmentId;
    } catch (err) {
      logger.error('Failed to create new segment.', err as Error);
      throw err;
    }
  }

  public async list(appId: string) {
    try {
      const response = await docClient.send(new QueryCommand({
        TableName: clickStreamTableName,
        KeyConditionExpression: 'id = :id AND begins_with(#type, :segmentPrefix)',
        ExpressionAttributeNames: {
          '#type': 'type',
        },
        ExpressionAttributeValues: {
          ':id': appId,
          ':segmentPrefix': 'SEGMENT_SETTING#',
        },
      }));

      return response.Items;
    } catch (err) {
      logger.error('Failed to get segments list.', err as Error);
      throw err;
    }
  }

  public async get(appId: string, segmentId: string) {
    try {
      const response = await docClient.send(new GetCommand({
        TableName: clickStreamTableName,
        Key: {
          id: appId,
          type: `SEGMENT_SETTING#${segmentId}`,
        },
      }));

      return response.Item;
    } catch (err) {
      logger.error(`Failed to get segment by id ${segmentId} for app ${appId}.`, err as Error);
      throw err;
    }
  }

  public async listJobs(segmentId: string) {
    try {
      const response = await docClient.send(new QueryCommand({
        TableName: clickStreamTableName,
        KeyConditionExpression: 'id = :id AND begins_with(#type, :segmentJobPrefix)',
        ExpressionAttributeNames: {
          '#type': 'type',
          '#date': 'date',
        },
        ExpressionAttributeValues: {
          ':id': segmentId,
          ':segmentJobPrefix': 'SEGMENT_JOB#',
        },
        ProjectionExpression: 'id, #type, jobRunId, segmentId, #date, jobStartTime, jobEndTime, jobStatus, segmentUserNumber, totalUserNumber, segmentSessionNumber, totalSessionNumber',
      }));

      return response.Items;
    } catch (err) {
      logger.error(`Failed to get segment jobs for segment ${segmentId}.`, err as Error);
      throw err;
    }
  }
}
