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

import { StateMachineStatusOutput } from "./state-machine-status";
import { executeStatements, getRedshiftClient, getRedshiftProps } from "../redshift-data";
import { logger } from "../../../common/powertools";
import { parseDynamoDBTableARN } from "../../../common/utils";
import { aws_sdk_client_common_config } from "../../../common/sdk-client-config";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SegmentJobStatus } from "../../private/segments/segments-model";

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

const {
  REDSHIFT_MODE,
  REDSHIFT_SERVERLESS_WORKGROUP_NAME,
  REDSHIFT_CLUSTER_IDENTIFIER,
  REDSHIFT_DATABASE,
  REDSHIFT_DB_USER,
  REDSHIFT_DATA_API_ROLE
} = process.env;
const { serverlessRedshiftProps, provisionedRedshiftProps } = getRedshiftProps(
  REDSHIFT_MODE!,
  REDSHIFT_DATABASE!,
  REDSHIFT_DATA_API_ROLE!,
  REDSHIFT_DB_USER!,
  REDSHIFT_SERVERLESS_WORKGROUP_NAME!,
  REDSHIFT_CLUSTER_IDENTIFIER!,
);
const redshiftClient = getRedshiftClient(REDSHIFT_DATA_API_ROLE!);

export const handler = async (event: StateMachineStatusOutput) => {
  try {
    // Update segment job status to "In Progress"
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
    await ddbDocClient.send(command);

    // Construct and execute segment query
    const sql = await constructSqlStatement(event.appId, event.segmentId);
    const queryId = await executeStatements(redshiftClient, [sql], serverlessRedshiftProps, provisionedRedshiftProps);
    logger.info('Execute segment query: ', { queryId });
    const output: ExecuteSegmentQueryOutput = {
      ...event,
      queryId: queryId ?? '',
    };

    return output;
  } catch (err) {
    if (err instanceof Error) {
      logger.error('Error when executing segment query.', err);
    }
    throw err;
  }
};

const constructSqlStatement = async (appId: string, segmentId: string) => {
  const response = await ddbDocClient.send(new GetCommand({
    TableName: ddbTableName,
    Key: {
      id: appId,
      type: `SEGMENT_SETTING#${segmentId}`,
    },
  }));
  console.log(response);

  // TODO: construct sql
  return `SELECT 1, '${appId}', '${segmentId}';`;
};
