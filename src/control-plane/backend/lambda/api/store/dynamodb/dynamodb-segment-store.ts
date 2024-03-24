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

import { Segment, SegmentDdbItem, SegmentJobStatus } from '@aws/clickstream-base-lib';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { clickStreamTableName } from '../../common/constants';
import { docClient } from '../../common/dynamodb-client';
import { logger } from '../../common/powertools';
import { SEGMENT_JOBS_LIST_LIMIT } from '../../service/segment';
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
          ':d': false,
        },
        FilterExpression: 'deleted = :d',
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

  public async update(segmentDdbItem: SegmentDdbItem): Promise<string> {
    try {
      await docClient.send(new PutCommand({
        TableName: clickStreamTableName,
        Item: segmentDdbItem,
      }));

      return segmentDdbItem.segmentId;
    } catch (err) {
      logger.error(`Failed to update segment ${segmentDdbItem.segmentId}.`, err as Error);
      throw err;
    }
  }

  public async delete(appId: string, segmentId: string) {
    try {
      await docClient.send(new UpdateCommand({
        TableName: clickStreamTableName,
        Key: {
          id: appId,
          type: `SEGMENT_SETTING#${segmentId}`,
        },
        UpdateExpression: 'SET deleted = :d',
        ExpressionAttributeValues: {
          ':d': true,
        },
      }));
    } catch (err) {
      logger.error(`Failed to delete segment ${segmentId}.`, err as Error);
      throw err;
    }
  }

  public async listJobs(segmentId: string, limit: number = SEGMENT_JOBS_LIST_LIMIT) {
    try {
      const response = await docClient.send(new QueryCommand({
        TableName: clickStreamTableName,
        IndexName: 'prefix-time-index',
        KeyConditionExpression: 'prefix = :prefix',
        ExpressionAttributeValues: {
          ':prefix': `SEGMENT_JOB_FOR#${segmentId}`,
        },
        ExpressionAttributeNames: {
          '#type': 'type',
          '#date': 'date',
        },
        ProjectionExpression: 'id, #type, jobRunId, segmentId, #date, jobStartTime, jobEndTime, jobStatus, segmentUserNumber, totalUserNumber, segmentSessionNumber, totalSessionNumber',
        ScanIndexForward: false,
        Limit: limit,
      }));

      return response.Items;
    } catch (err) {
      logger.error(`Failed to get segment jobs for segment ${segmentId}.`, err as Error);
      throw err;
    }
  }

  public async getSampleData(segmentId: string, jobRunId: string | undefined) {
    try {
      if (!!jobRunId) {
        const response = await docClient.send(new GetCommand({
          TableName: clickStreamTableName,
          Key: {
            id: segmentId,
            type: `SEGMENT_JOB#${jobRunId}`,
          },
        }));

        return response.Item;
      } else {
        // Get last succeeded job sample data
        const response = await docClient.send(new QueryCommand({
          TableName: clickStreamTableName,
          IndexName: 'prefix-time-index',
          KeyConditionExpression: 'prefix = :prefix',
          FilterExpression: 'jobStatus = :status',
          ExpressionAttributeValues: {
            ':prefix': `SEGMENT_JOB_FOR#${segmentId}`,
            ':status': SegmentJobStatus.COMPLETED,
          },
          ScanIndexForward: false,
        }));

        return response.Items?.[0];
      }
    } catch (err) {
      logger.error(`Failed to get segment sample data for segment ${segmentId}.`, err as Error);
      throw err;
    }
  }
}
