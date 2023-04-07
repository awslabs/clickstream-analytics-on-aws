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

import path from 'path';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { GetJobRunCommand, EMRServerlessClient } from '@aws-sdk/client-emr-serverless';
import { EventBridgeEvent } from 'aws-lambda';
import { METRIC_NAMESAPCE_DATAPIPELINE } from '../../../common/constant';
import { logger } from '../../../common/powertools';
import { copyS3Object, processS3GzipObjectLineByLine } from '../../../common/s3';
import { getJobInfoKey } from '../../utils/utils-common';

const emrApplicationId = process.env.EMR_SERVERLESS_APPLICATION_ID!;
const stackId = process.env.STACK_ID!;
const projectId = process.env.PROJECT_ID!;
const pipelineS3BucketName = process.env.PIPELINE_S3_BUCKET_NAME!;
const pipelineS3Prefix = process.env.PIPELINE_S3_PREFIX!;

const cwClient = new CloudWatchClient({});
const emrClient = new EMRServerlessClient({});

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

  // Only record SUCCESS/FAILED jobs
  const recoredStates = [
    'SUCCESS',
    'FAILED',
    // 'SUBMITTED',
    // 'PENDING',
    // 'RUNNING',
    // 'SCHEDULED',
  ];
  if (recoredStates.includes(jobState)) {
    await copyS3Object(buildS3Uri(jobStartStateFile), buildS3Uri(jobFinishStateFile));
  }

  if (jobState == 'SUCCESS') {
    await sendMetrics(event);
  }
};

async function sendMetrics(event: any) {

  const jobRunInfo = await emrClient.send(new GetJobRunCommand({
    jobRunId: event.detail.jobRunId!,
    applicationId: emrApplicationId!,
  }));

  const createdAt = jobRunInfo.jobRun?.createdAt;
  const endAt = jobRunInfo.jobRun?.updatedAt;

  let jobTimeSeconds = 0;
  if (createdAt && endAt) {
    jobTimeSeconds = Math.round((endAt.getTime() - createdAt.getTime()) / 1000);
  }

  const logKey = path.join(
    pipelineS3Prefix, 'pipeline-logs',
    projectId, 'applications',
    emrApplicationId, 'jobs',
    event.detail.jobRunId,
    'SPARK_DRIVER', 'stderr.gz');

  let metrics: { source: number; flattedSource: number; sink: number; corrupted: number; jobTimeSeconds: number }
    = { source: 0, flattedSource: 0, sink: 0, corrupted: 0, jobTimeSeconds };

  const metricRegEx = new RegExp(/\[ETLMetric\]/);
  const sourceRegEx = new RegExp(/\[ETLMetric\]source dataset count:\s*(\d+)/);
  const flattedSourceRegEx = new RegExp(/\[ETLMetric\]flatted source dataset count:\s*(\d+)/);
  const sinkRegEx = new RegExp(/\[ETLMetric\]sink dataset count:\s*(\d+)/);
  const corruptedRegEx = new RegExp(/\[ETLMetric\]corrupted dataset count:\s*(\d+)/);
  let n = 0;
  const lineProcess = (line: string) => {
    n++;
    if (!line.match(metricRegEx)) {
      return;
    }

    const sourceMatch = line.match(sourceRegEx);
    const flattedSoruceMatch = line.match(flattedSourceRegEx);
    const sinkMatch = line.match(sinkRegEx);
    const corruptedMatch = line.match(corruptedRegEx);
    if (sourceMatch) {
      metrics = {
        ...metrics,
        source: parseInt(sourceMatch[1]),
      };
    } else if (flattedSoruceMatch) {
      metrics = {
        ...metrics,
        flattedSource: parseInt(flattedSoruceMatch[1]),
      };
    } else if (sinkMatch) {
      metrics = {
        ...metrics,
        sink: parseInt(sinkMatch[1]),
      };
    } else if (corruptedMatch) {
      metrics = {
        ...metrics,
        corrupted: parseInt(corruptedMatch[1]),
      };
    }
  };

  await processS3GzipObjectLineByLine(pipelineS3BucketName, logKey, lineProcess);

  logger.info('log file length: ' + n);
  logger.info('metrics', { metrics });

  const Timestamp = new Date();
  const Namespace = METRIC_NAMESAPCE_DATAPIPELINE;
  const Dimensions = [{
    Name: 'projectId',
    Value: `${projectId}`,
  },
  {
    Name: 'emrApplicationId',
    Value: `${emrApplicationId}`,
  }];

  const metricInput = {
    Namespace,
    MetricData: [
      {
        MetricName: 'ETL source count',
        Dimensions,
        Timestamp,
        Value: metrics.source,
        Unit: 'Count',
      },
      {

        MetricName: 'ETL flatted source count',
        Dimensions,
        Timestamp,
        Value: metrics.flattedSource,
        Unit: 'Count',
      },
      {
        MetricName: 'ETL sink count',
        Dimensions,
        Timestamp,
        Value: metrics.sink,
        Unit: 'Count',
      },
      {
        MetricName: 'ETL corrupted count',
        Dimensions,
        Timestamp,
        Value: metrics.corrupted,
        Unit: 'Count',
      },
      {
        MetricName: 'ETL job run time seconds',
        Dimensions,
        Timestamp,
        Value: jobTimeSeconds,
        Unit: 'Seconds',
      },
    ],
  };

  await cwClient.send(new PutMetricDataCommand(metricInput));
  logger.info('sent metrics:', { metricInput });

}
