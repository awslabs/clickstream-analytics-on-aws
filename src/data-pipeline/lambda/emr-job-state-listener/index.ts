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

import { EventBridgeEvent } from 'aws-lambda';
import { logger } from '../../../common/powertools';
import { copyS3Object } from '../../../common/s3';
import { getJobInfoKey } from '../../utils/utils-common';

const emrApplicationId = process.env.EMR_SERVERLESS_APPLICATION_ID;
const stackId = process.env.STACK_ID!;
const projectId = process.env.PROJECT_ID!;
const pipelineS3BucketName = process.env.PIPELINE_S3_BUCKET_NAME!;
const pipelineS3Prefix = process.env.PIPELINE_S3_PREFIX!;

export const handler = async (event: EventBridgeEvent<string, { jobRunId: string; applicationId: string; state: string }>) => {
  logger.info('Triggered from  event', { event });
  const jobState = event.detail.state;
  if (event.detail.applicationId != emrApplicationId) {
    logger.info(`unkonwn applicationId ${event.detail.applicationId}, only process event from emrApplicationId: ${emrApplicationId}`);
    return;
  }

  const jobStartStateFile = getJobInfoKey({
    pipelineS3Prefix,
    stackId,
    projectId,
  }, event.detail.jobRunId);

  const latestStateFile = getJobInfoKey({
    pipelineS3Prefix,
    stackId,
    projectId,
  }, 'latest');

  const jobFinishStateFile = getJobInfoKey({
    pipelineS3Prefix,
    stackId,
    projectId,
  }, `${event.detail.jobRunId}-${jobState}`);

  const buildS3Uri = (key: string) => {
    return `s3://${pipelineS3BucketName}/${key}`;
  };

  if (jobState == 'SUCCESS') {
    // only SUCCESS update the job state
    await copyS3Object(buildS3Uri(jobStartStateFile), buildS3Uri(latestStateFile));
  }

  // Only record SUCCESS/FAILED/SUBMITTED jobs
  const recoredStates = [
    'SUCCESS',
    'FAILED',
    'SUBMITTED',
    // 'PENDING',
    // 'RUNNING',
    // 'SCHEDULED',
  ];
  if (recoredStates.includes(jobState)) {
    await copyS3Object(buildS3Uri(jobStartStateFile), buildS3Uri(jobFinishStateFile));
  }
};