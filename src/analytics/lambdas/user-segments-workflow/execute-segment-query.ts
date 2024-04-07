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

import { SegmentDdbItem, SegmentJobStatus } from '@aws/clickstream-base-lib';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { StateMachineStatusOutput } from './state-machine-status';
import { logger } from '../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../common/sdk-client-config';
import { parseDynamoDBTableARN } from '../../../common/utils';
import { executeStatements, getRedshiftClient, getRedshiftProps } from '../redshift-data';

export type ExecuteSegmentQueryEvent = StateMachineStatusOutput;

export interface ExecuteSegmentQueryOutput {
  appId: string;
  segmentId: string;
  jobRunId: string;
  queryId: string;
}

const { ddbRegion, ddbTableName } = parseDynamoDBTableARN(process.env.CLICKSTREAM_METADATA_DDB_ARN!);
const ddbClient = new DynamoDBClient({
  ...aws_sdk_client_common_config,
  region: ddbRegion,
});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const { serverlessRedshiftProps, provisionedRedshiftProps } = getRedshiftProps(
  process.env.REDSHIFT_MODE!,
  process.env.REDSHIFT_DATABASE!,
  process.env.REDSHIFT_DATA_API_ROLE!,
  process.env.REDSHIFT_DB_USER!,
  process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME!,
  process.env.REDSHIFT_CLUSTER_IDENTIFIER!,
);
const redshiftClient = getRedshiftClient(process.env.REDSHIFT_DATA_API_ROLE!);

export const handler = async (event: ExecuteSegmentQueryEvent) => {
  try {
    // Update segment job status to 'In Progress'
    const command = new UpdateCommand({
      TableName: ddbTableName,
      Key: {
        id: event.segmentId,
        type: `SEGMENT_JOB#${event.jobRunId}`,
      },
      UpdateExpression: 'set jobStatus = :js',
      ExpressionAttributeValues: {
        ':js': SegmentJobStatus.IN_PROGRESS,
      },
      ReturnValues: 'ALL_NEW',
    });
    logger.info('Update segment job status to \'In Progress\'');
    await ddbDocClient.send(command);

    // Construct and execute segment query
    const segmentSP = await constructStorageProcedure(event.appId, event.segmentId, event.jobRunId);
    const queryId = await executeStatements(redshiftClient, [
      segmentSP,
      `CALL ${event.appId}.process_user_segment()`,
    ], serverlessRedshiftProps, provisionedRedshiftProps);
    logger.info('Execute segment query: ', { queryId });
    const output: ExecuteSegmentQueryOutput = {
      appId: event.appId,
      segmentId: event.segmentId,
      jobRunId: event.jobRunId,
      queryId: queryId ?? '',
    };

    return output;
  } catch (err) {
    logger.error('Error when executing segment query.', err as Error);
    throw err;
  }
};

/**
 * Build segment storage procedure.
 * The SP will execute sql query to get user segment, unload segment and summary to S3
 */
const constructStorageProcedure = async (appId: string, segmentId: string, jobRunId: string) => {
  const response = await ddbDocClient.send(new GetCommand({
    TableName: ddbTableName,
    Key: {
      id: appId,
      type: `SEGMENT_SETTING#${segmentId}`,
    },
  }));
  const segment = response.Item as SegmentDdbItem;

  return `
    CREATE OR REPLACE PROCEDURE ${appId}.process_user_segment AS
    $$
    BEGIN
      -- Step 1: Create temporary table and insert segment user IDs
      DROP TABLE IF EXISTS temp_segment_user;
      CREATE TEMP TABLE temp_segment_user (user_id VARCHAR(255));
      EXECUTE 'INSERT INTO temp_segment_user (user_id) ${segment.sql}';

      -- Step 2: Refresh segment in segment_user table
      EXECUTE 'DELETE FROM ${appId}.segment_user WHERE segment_id = ''${segmentId}''';
      EXECUTE 'INSERT INTO ${appId}.segment_user (segment_id, user_id) SELECT ''${segmentId}'', user_id FROM temp_segment_user';

      -- Step 3: UNLOAD full segment user info to S3
      EXECUTE '
        UNLOAD (''SELECT * FROM ${appId}.user_m_view_v2 WHERE user_pseudo_id IN (SELECT * FROM temp_segment_user)'')
        TO ''s3://${process.env.PIPELINE_S3_BUCKET}/${process.env.SEGMENTS_S3_PREFIX}app/${appId}/segment/${segmentId}/job/${jobRunId}/segment_''
        IAM_ROLE ''${process.env.REDSHIFT_DATA_API_ROLE}''
        PARALLEL OFF ALLOWOVERWRITE HEADER EXTENSION ''csv'' FORMAT AS CSV
      ';

      -- Step 4: UNLOAD segment summary to S3
      EXECUTE '
        UNLOAD (''
          WITH
          segment_user AS (
            SELECT
              COUNT(DISTINCT user_id) AS segment_user_number
            FROM
              temp_segment_user
          ),
          total_user AS (
            SELECT
              COUNT(DISTINCT user_pseudo_id) AS total_user_number
            FROM
              ${appId}.user_m_view_v2
          )
          SELECT
            segment_user_number,
            total_user_number,
            CAST(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000 AS BIGINT) AS job_end_time
          FROM
            segment_user,
            total_user
        '')
        TO ''s3://${process.env.PIPELINE_S3_BUCKET}/${process.env.SEGMENTS_S3_PREFIX}app/${appId}/segment/${segmentId}/job/${jobRunId}/segment-summary_''
        IAM_ROLE ''${process.env.REDSHIFT_DATA_API_ROLE}''
        PARALLEL OFF ALLOWOVERWRITE HEADER EXTENSION ''csv'' FORMAT AS CSV
      ';
    END;
    $$ LANGUAGE plpgsql;
  `;
};
