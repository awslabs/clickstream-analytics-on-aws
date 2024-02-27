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

import { describeStatement, getRedshiftClient } from "../redshift-data";
import { logger } from "../../../common/powertools";
import { parseDynamoDBTableARN } from "../../../common/utils";
import { aws_sdk_client_common_config } from "../../../common/sdk-client-config";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SegmentJobStatus } from "../../private/segments/segments-model";
import { ExecuteSegmentQueryOutput } from "./execute-segment-query";
import { StatusString } from "@aws-sdk/client-redshift-data";

const { ddbRegion, ddbTableName } = parseDynamoDBTableARN(process.env.CLICKSTREAM_METADATA_DDB_ARN!);
const ddbClient = new DynamoDBClient({
  ...aws_sdk_client_common_config,
  region: ddbRegion,
});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const redshiftClient = getRedshiftClient(process.env.REDSHIFT_DATA_API_ROLE!);

export const handler = async (event: ExecuteSegmentQueryOutput) => {
  try {
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
        UpdateExpression: 'set jobStatus = :js',
        ExpressionAttributeValues: {
          ':js': jobStatus,
        },
        ReturnValues: 'ALL_NEW',
      });
      await ddbDocClient.send(command);
    }

    return { jobStatus };
  } catch (err) {
    if (err instanceof Error) {
      logger.error('Error when executing segment query.', err);
    }
    throw err;
  }
};
