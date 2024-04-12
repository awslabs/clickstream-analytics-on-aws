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
  CLICKSTREAM_SEGMENTS_JOB_OUTPUT_FILENAME,
  CLICKSTREAM_SEGMENTS_JOB_OUTPUT_SUMMARY_FILENAME,
  SegmentJobStatus,
} from '@aws/clickstream-base-lib';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { StatusString } from '@aws-sdk/client-redshift-data';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { NodeJsClient } from '@smithy/types';
import csvParser from 'csv-parser';
import { ExecuteSegmentQueryOutput } from './execute-segment-query';
import { logger } from '../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../common/sdk-client-config';
import { parseDynamoDBTableARN } from '../../../common/utils';
import { handleBackoffTimeInfo } from '../../../common/workflow';
import { describeStatement, getRedshiftClient } from '../redshift-data';

export interface SegmentJobStatusEvent extends ExecuteSegmentQueryOutput {
  jobStatus?: SegmentJobStatus;
}

const { ddbRegion, ddbTableName } = parseDynamoDBTableARN(process.env.CLICKSTREAM_METADATA_DDB_ARN!);
const ddbClient = new DynamoDBClient({
  ...aws_sdk_client_common_config,
  region: ddbRegion,
});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const redshiftClient = getRedshiftClient(process.env.REDSHIFT_DATA_API_ROLE!);

const s3Client = new S3Client({
  ...aws_sdk_client_common_config,
  region: process.env.AWS_REGION,
}) as NodeJsClient<S3Client>;

const _handler = async (event: SegmentJobStatusEvent) => {
  const { appId, segmentId, jobRunId } = event;

  try {
    // Check segment job status
    const response = await describeStatement(redshiftClient, event.queryId);
    logger.info(`Segment job (queryId: ${event.queryId}) status: `, { result: response });
    const status = response.Status;
    let jobStatus = SegmentJobStatus.IN_PROGRESS;
    if (status === StatusString.ABORTED || status === StatusString.FAILED) {
      jobStatus = SegmentJobStatus.FAILED;
    } else if (status === StatusString.FINISHED) {
      jobStatus = SegmentJobStatus.COMPLETED;
    }

    // Update segment job status in DDB
    if (jobStatus === SegmentJobStatus.FAILED) {
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

      logger.info(`Update segment job status to ${jobStatus} in DDB metadata table`);
      await ddbDocClient.send(command);
    } else if (jobStatus === SegmentJobStatus.COMPLETED) {
      const s3Path = `${process.env.SEGMENTS_S3_PREFIX}app/${appId}/segment/${segmentId}/job/${jobRunId}/`;

      // Retrieve segment result including sample data from S3, update job status table
      const summaryData = await s3Client.send(new GetObjectCommand({
        Bucket: process.env.PIPELINE_S3_BUCKET,
        Key: `${s3Path}${CLICKSTREAM_SEGMENTS_JOB_OUTPUT_SUMMARY_FILENAME}`,
      }));
      if (summaryData.Body) {
        // Parse segment summary file
        const content = await summaryData.Body.transformToString();
        const lines = content.split('\n');
        const values = lines[1].split(',');
        const segmentUserNumber = values[0];
        const totalUserNumber = values[1];
        const endTime = values[2];

        // Get sample data from segment output
        const sampleData = await readSegmentSampleDataFromS3(process.env.PIPELINE_S3_BUCKET!, `${s3Path}${CLICKSTREAM_SEGMENTS_JOB_OUTPUT_FILENAME}`);

        // Update segment job status in DDB
        const command = new UpdateCommand({
          TableName: ddbTableName,
          Key: {
            id: event.segmentId,
            type: `SEGMENT_JOB#${event.jobRunId}`,
          },
          UpdateExpression: 'set jobStatus = :js, jobEndTime = :et, segmentUserNumber = :su, totalUserNumber = :tu, sampleData = :sd',
          ExpressionAttributeValues: {
            ':js': jobStatus,
            ':et': endTime,
            ':su': segmentUserNumber,
            ':tu': totalUserNumber,
            ':sd': sampleData,
          },
          ReturnValues: 'ALL_NEW',
        });

        logger.info(`Update segment job status to ${jobStatus} in DDB metadata table`);
        await ddbDocClient.send(command);
      }
    }

    return {
      ...event,
      jobStatus,
    };
  } catch (err) {
    logger.error('Error when checking segment job status.', err as Error);
    throw err;
  }
};

async function readSegmentSampleDataFromS3(bucketName: string, key: string): Promise<any[]> {
  const sampleData: any[] = [];

  return new Promise(async (resolve, reject) => {
    const fullData = await s3Client.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }));
    if (!fullData.Body) {
      logger.warn('GetObject response body is undefined or empty.');
      resolve([]);
    } else {
      const stream = fullData.Body;
      stream.pipe(csvParser())
        .on('data', (row: any) => {
          if (sampleData.length < 50) {
            sampleData.push(row);
            logger.info(`Get row of ${sampleData.length}: ${JSON.stringify(row)}`);
          } else {
            logger.info('Read up to 50 lines as sample data. Stop streaming.');
            stream.destroy();
            resolve(sampleData);
          }
        })
        .on('end', () => {
          logger.info(`Read ${sampleData.length} lines in total as sample data.`);
          resolve(sampleData);
        })
        .on('error', (error: any) => {
          logger.error('Read segment sample data failed.', error);
          reject(error);
        });
    }
  });
}

export const handler = handleBackoffTimeInfo(_handler);
