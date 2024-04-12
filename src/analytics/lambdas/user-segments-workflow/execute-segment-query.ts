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
    const { appId, segmentId, jobRunId } = event;

    // Update segment job status to 'In Progress'
    const command = new UpdateCommand({
      TableName: ddbTableName,
      Key: {
        id: segmentId,
        type: `SEGMENT_JOB#${jobRunId}`,
      },
      UpdateExpression: 'set jobStatus = :js',
      ExpressionAttributeValues: {
        ':js': SegmentJobStatus.IN_PROGRESS,
      },
      ReturnValues: 'ALL_NEW',
    });
    logger.info('Update segment job status to \'In Progress\'');
    await ddbDocClient.send(command);

    // Execute segment query by calling stored procedure
    const response = await ddbDocClient.send(new GetCommand({
      TableName: ddbTableName,
      Key: {
        id: appId,
        type: `SEGMENT_SETTING#${segmentId}`,
      },
    }));
    const segment = response.Item as SegmentDdbItem;
    const escapedSql = segment.sql!.replace(/'/g, '\'\'');
    const s3Path = `s3://${process.env.PIPELINE_S3_BUCKET}/${process.env.SEGMENTS_S3_PREFIX}app/${appId}/segment/${segmentId}/job/${jobRunId}/`;
    const sp = `CALL ${appId}.sp_user_segment('${segmentId}', '${escapedSql}', '${s3Path}', '${process.env.REDSHIFT_ASSOCIATED_ROLE}')`;
    const queryId = await executeStatements(redshiftClient, [sp], serverlessRedshiftProps, provisionedRedshiftProps);
    logger.info('Execute segment query', { queryId, query: sp });
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
