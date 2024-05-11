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

import { aws_sdk_client_common_config, logger } from '@aws/clickstream-base-lib';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { Context } from 'aws-lambda';
import { putStringToS3, readS3ObjectAsJson } from '../../../common/s3';
import { getLatestEmrJobEndTime } from '../../../data-pipeline/utils/utils-common';
import { WorkflowStatus } from '../../private/constant';

const REGION = process.env.AWS_REGION; //e.g. "us-east-1"

const sfnClient = new SFNClient({
  region: REGION,
  ...aws_sdk_client_common_config,
});

const pipelineS3BucketName = process.env.PIPELINE_S3_BUCKET_NAME!;
const pipelineS3BucketPrefix = process.env.PIPELINE_S3_BUCKET_PREFIX!;
const pipelineEmrStatusS3Prefix = process.env.PIPELINE_EMR_STATUS_S3_PREFIX!;
const stateMachineArn = process.env.REFRESH_STATE_MACHINE_ARN!;
const projectId = process.env.PROJECT_ID!;

export const handler = async (_e: any, _c: Context) => {

  const ENABLE_REFRESH = process.env.ENABLE_REFRESH ?? 'false';
  const REFRESH_INTERVAL_MINUTES = process.env.REFRESH_INTERVAL_MINUTES ?? '120';

  if (ENABLE_REFRESH === 'true') {
    const refreshInfo = await getMVRefreshInfoFromS3(pipelineS3BucketPrefix);

    if (refreshInfo === undefined
      || (refreshInfo !== undefined && Date.now() - refreshInfo.lastRefreshTime >= Number(REFRESH_INTERVAL_MINUTES) * 60 * 1000)) {
      const latestJobTimestamp = await getLatestEmrJobEndTime(pipelineS3BucketName, pipelineEmrStatusS3Prefix, projectId);

      const triggerDate = subtractDayFromTimestamp(latestJobTimestamp);

      const input = JSON.stringify({
        refreshEndTime: triggerDate,
        forceRefresh: 'false',
      });

      const startExecutionCommand = new StartExecutionCommand({
        stateMachineArn,
        input,
      });

      await sfnClient.send(startExecutionCommand);

      logger.info('Trigger to refresh mv and sp');

      await updateMVRefreshInfoToS3(Date.now(), pipelineS3BucketPrefix);
      return {
        status: WorkflowStatus.SUCCEED,
      };
    } else {
      logger.info(`Skip mv and sp refresh because the interval ${REFRESH_INTERVAL_MINUTES} minutes is not reached yet.`);
    }
  } else {
    logger.info('Skip mv and sp refresh because ENABLE_REFRESH is not true.');
  }
  return {
    status: WorkflowStatus.SKIP,
  };

};

async function getMVRefreshInfoFromS3(pipelineS3Prefix: string) {
  try {
    const s3Key = getMVRefreshInfoKey(pipelineS3Prefix);
    return await readS3ObjectAsJson(
      pipelineS3BucketName,
      s3Key,
    );
  } catch (error) {
    logger.error('Error when get mv refresh info data from s3:', { error });
    throw error;
  }
}

async function updateMVRefreshInfoToS3(lastRefreshTime: number, pipelineS3Prefix: string) {
  const info = {
    lastRefreshTime: lastRefreshTime,
  };
  try {
    const s3Key = getMVRefreshInfoKey(pipelineS3Prefix);
    await putStringToS3(JSON.stringify(info), pipelineS3BucketName, s3Key);
  } catch (error) {
    logger.error('Error when write mv refresh info data to s3:', { error });
    throw error;
  }
}

function subtractDayFromTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  date.setDate(date.getDate() - 1);
  return date.getTime();
}

export function getMVRefreshInfoKey(bucketPrefix: string) {
  return `${bucketPrefix}refresh-mv-info/${projectId}/refresh-time-info.json`;
}
