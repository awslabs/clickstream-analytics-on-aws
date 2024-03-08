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
import { StatusString } from '@aws-sdk/client-redshift-data';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ExecuteSegmentQueryOutput } from './execute-segment-query';
import { logger } from '../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../common/sdk-client-config';
import { parseDynamoDBTableARN } from '../../../common/utils';
import { calculateWaitTime, WaitTimeInfo } from '../../../common/workflow';
import { SegmentJobStatus } from '../../private/segments/segments-model';
import { describeStatement, getRedshiftClient } from '../redshift-data';

export interface SegmentJobStatusEvent extends ExecuteSegmentQueryOutput {
  jobStatus?: SegmentJobStatus;
  waitTimeInfo?: WaitTimeInfo;
}

const { ddbRegion, ddbTableName } = parseDynamoDBTableARN(process.env.CLICKSTREAM_METADATA_DDB_ARN!);
const ddbClient = new DynamoDBClient({
  ...aws_sdk_client_common_config,
  region: ddbRegion,
});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const redshiftClient = getRedshiftClient(process.env.REDSHIFT_DATA_API_ROLE!);

export const handler = async (event: SegmentJobStatusEvent) => {
  try {
    // Update waitTimeInfo
    const waitTimeInfo = event.waitTimeInfo;
    const updatedWaitTimeInfo = !!waitTimeInfo ? calculateWaitTime(
      waitTimeInfo.waitTime,
      waitTimeInfo.loopCount,
    ) : {
      waitTime: 15,
      loopCount: 0,
    };

    // Check segment job status
    const response = await describeStatement(redshiftClient, event.queryId);
    const status = response.Status;
    let jobStatus = SegmentJobStatus.IN_PROGRESS;
    if (status === StatusString.ABORTED || status === StatusString.FAILED) {
      jobStatus = SegmentJobStatus.FAILED;
    } else if (status === StatusString.FINISHED) {
      jobStatus = SegmentJobStatus.COMPLETED;
    }

    // Update segment job status in DDB
    if (jobStatus !== SegmentJobStatus.IN_PROGRESS) {
      const command = new UpdateCommand({
        TableName: ddbTableName,
        Key: {
          id: event.segmentId,
          type: `SEGMENT_JOB#${event.jobRunId}`,
        },
        UpdateExpression: 'set jobStatus = :js, jobEndTime = :et',
        ExpressionAttributeValues: {
          ':js': jobStatus,
          ':et': Date.now(),
        },
        ReturnValues: 'ALL_NEW',
      });

      // TODO: retrieve segment result including sample data from S3, update result to job status table

      await ddbDocClient.send(command);
    }

    return {
      ...event,
      jobStatus,
      waitTimeInfo: updatedWaitTimeInfo,
    };
  } catch (err) {
    logger.error('Error when executing segment query.', err as Error);
    throw err;
  }
};
