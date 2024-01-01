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
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, PutCommandInput } from '@aws-sdk/lib-dynamodb';
import { getWorkflowInfoKey } from './check-metadata-workflow-start';
import { logger } from '../../../common/powertools';
import { putStringToS3 } from '../../../common/s3';
import { aws_sdk_client_common_config } from '../../../common/sdk-client-config';

const pipelineS3BucketName = process.env.PIPELINE_S3_BUCKET_NAME!;
const pipelineS3Prefix = process.env.PIPELINE_S3_PREFIX!;
const projectId = process.env.PROJECT_ID!;

const { ddbRegion, ddbTableName } = parseDynamoDBTableARN(process.env.METADATA_DDB_TABLE_ARN!);

const metaDataDDBClient = new DynamoDBClient({
  ...aws_sdk_client_common_config,
  region: ddbRegion,
});

const metaDataDDBDocClient = DynamoDBDocumentClient.from(metaDataDDBClient);

export interface UpdateWorkflowInfoEvent {
  readonly lastJobStartTimestamp: number;
  readonly lastScanEndDate: string;
  readonly eventSource: string;
}

/**
 * The lambda function submit a SQL statement to scan metadata.
 * @param event ScanMetadataEvent, the JSON format is as follows:
 {
    lastJobStartTimestamp: timestamp;
    lastScanEndDate: '2023-10-26';
  }
  @returns.
 */
export const handler = async (event: UpdateWorkflowInfoEvent) => {
  try {
    const lastJobStartTimestamp = event.lastJobStartTimestamp;
    const lastScanEndDate = event.lastScanEndDate;
    const eventSource = event.eventSource;

    if (eventSource === 'LoadDataFlow') {
      logger.info('The event source is not LoadDataFlow, skip update workflow info.');
      return;
    }

    await updateWorkflowInfoToS3(lastJobStartTimestamp, lastScanEndDate);

    await updateProjectSummaryToDDB(lastJobStartTimestamp, lastScanEndDate);

  } catch (err) {
    if (err instanceof Error) {
      logger.error('Error when scan metadata.', err);
    }
    throw err;
  }
};

async function updateWorkflowInfoToS3(lastJobStartTimestamp: number, lastScanEndDate: string) {
  const workflowJobInfo = {
    lastJobStartTimestamp: lastJobStartTimestamp,
    lastScanEndDate: lastScanEndDate,
  };

  const workflowJobKey = getWorkflowInfoKey(pipelineS3Prefix, projectId);
  await putStringToS3(JSON.stringify(workflowJobInfo), pipelineS3BucketName, workflowJobKey);
}

async function updateProjectSummaryToDDB(lastJobStartTimestamp: number, lastScanEndDate: string) {
  const request: PutCommandInput = {
    TableName: ddbTableName,
    Item: {
      id: `PROJECT_SUMMARY#${projectId}`,
      month: '#000000',
      latestScanDate: `${lastScanEndDate}T00:00:00.000Z`,
      lastJobStartTimestamp: lastJobStartTimestamp,
    },
  };
  await metaDataDDBDocClient.send(new PutCommand(request));
}

function parseDynamoDBTableARN(ddbArn: string) {
  const arnComponents = ddbArn.split(':');
  const region = arnComponents[3];
  const tableName = arnComponents[5].split('/')[1];

  return {
    ddbRegion: region,
    ddbTableName: tableName,
  };
}