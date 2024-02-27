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

import { v4 as uuidv4 } from 'uuid';
import { aws_sdk_client_common_config } from "../../../common/sdk-client-config";
import { formatDate, parseDynamoDBTableARN } from "../../../common/utils";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, PutCommandInput } from "@aws-sdk/lib-dynamodb";
import { SegmentJobStatus, SegmentJobStatusItem } from "../../private/segments/segments-model";
import { logger } from "../../../common/powertools";

interface SegmentJobInitEvent {
  segmentId: string;
  appId: string;
}

export interface SegmentJobInitOutput {
  segmentId: string;
  appId: string;
  jobRunId: string;
}

const { ddbRegion, ddbTableName } = parseDynamoDBTableARN(process.env.CLICKSTREAM_METADATA_DDB_ARN!);
const ddbClient = new DynamoDBClient({
  ...aws_sdk_client_common_config,
  region: ddbRegion,
});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const handler = async (event: SegmentJobInitEvent) => {
  const { segmentId } = event;
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
    sampleData: []
  };

  const request: PutCommandInput = {
    TableName: ddbTableName,
    Item: item
  };

  try {
    await ddbDocClient.send(new PutCommand(request));
  } catch (err) {
    if (err instanceof Error) {
      logger.error('Error when put item to DDB for segment job init', err);
    }
    throw err;
  }

  const output: SegmentJobInitOutput = {
    ...event,
    jobRunId,
  };
  return output;
};
