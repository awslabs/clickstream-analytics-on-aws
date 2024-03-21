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

import { Context } from 'aws-lambda';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { checkLoadStatus } from './check-load-status';
import { logger } from '../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../common/sdk-client-config';
import { putStringToS3, readS3ObjectAsJson } from '../../../common/s3';
import { sleep } from '../../../common/utils';

const REGION = process.env.AWS_REGION; //e.g. "us-east-1"

const sfnClient = new SFNClient({
  region: REGION,
  ...aws_sdk_client_common_config,
});

const REDSHIFT_DATABASE = process.env.REDSHIFT_DATABASE!;
const APP_IDS = process.env.APP_IDS!;
const SLEEP_SEC = process.env.SLEEP_SEC?? '30';
const pipelineS3BucketName = process.env.PIPELINE_S3_BUCKET_NAME!;
const pipelineS3BucketPrefix = process.env.PIPELINE_S3_BUCKET_PREFIX!;
const stateMachineArn = process.env.REFRESH_STATE_MACHINE_ARN!;

export const handler = async (_e: any, _c: Context) => {

  const appIds = APP_IDS.split(',');
  const queryIds: string[] = [];

  const ENABLE_REFRESH = process.env.ENABLE_REFRESH ?? 'false';
  const REFRESH_INTERVAL_MINUTES = process.env.REFRESH_INTERVAL_MINUTES ?? '120';

  if (ENABLE_REFRESH === 'true') {
    for (let rawAppId of appIds) {
      const schema = rawAppId.replace(/\./g, '_').replace(/-/g, '_');
      const refreshInfo = await getMVRefreshInfoFromS3(pipelineS3BucketPrefix, REDSHIFT_DATABASE, schema);

      if (refreshInfo === undefined || Date.now() - refreshInfo.lastRefreshTime >= Number(REFRESH_INTERVAL_MINUTES) * 60 * 1000) {

        const input = JSON.stringify({
          refreshDate: getCurrentDateString(),
        });
    
        // 创建 StartExecutionCommand
        const startExecutionCommand = new StartExecutionCommand({
          stateMachineArn,
          input,
        });
        
        await sfnClient.send(startExecutionCommand);

        logger.info(`Refresh mv for app: ${schema} finished`);

        await updateMVRefreshInfoToS3(Date.now(), pipelineS3BucketPrefix, REDSHIFT_DATABASE, schema);
      } else {
        logger.info(`Skip mv refresh for app: ${schema}`);
      }
    }
  }

  const execInfo = [];
  await sleep(1000 * parseInt(SLEEP_SEC));

  for (const queryId of queryIds) {
    const statusRes = await checkLoadStatus(queryId);
    logger.info(`queryId: ${queryId} ${statusRes.Status}`);
    execInfo.push({
      queryId,
      status: statusRes.Status,
    });
  }
  return {
    execInfo,
  };

};

async function getMVRefreshInfoFromS3(pipelineS3Prefix: string, projectId: string, appId: string) {
  try {
    const s3Key = getMVRefreshInfoKey(pipelineS3Prefix, projectId, appId);
    return await readS3ObjectAsJson(
      pipelineS3BucketName,
      s3Key,
    );
  } catch (error) {
    logger.error('Error when get mv refresh info data from s3:', { error });
    throw error;
  }
}

async function updateMVRefreshInfoToS3(lastRefreshTime: number, pipelineS3Prefix: string, projectId: string, appId: string) {
  const info = {
    lastRefreshTime: lastRefreshTime,
  };
  try {
    const s3Key = getMVRefreshInfoKey(pipelineS3Prefix, projectId, appId);
    await putStringToS3(JSON.stringify(info), pipelineS3BucketName, s3Key);
  } catch (error) {
    logger.error('Error when write mv refresh info data to s3:', { error });
    throw error;
  }
}

export function getMVRefreshInfoKey(bucketPrefix: string, projectId: string, appId: string) {
  return `${bucketPrefix}refresh-mv-info/${projectId}/${appId}/refresh-time-info.json`;
}

function getCurrentDateString() {
  return new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-').replace('T', '-').replace('Z', '');
}
