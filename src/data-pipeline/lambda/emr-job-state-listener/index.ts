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
import { MetricUnits, Metrics } from '@aws-lambda-powertools/metrics';
import { GetJobRunCommand, EMRServerlessClient } from '@aws-sdk/client-emr-serverless';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { EventBridgeEvent } from 'aws-lambda';
import { DataPipelineCustomMetricsName, MetricsNamespace, MetricsService } from '../../../common/model';
import { logger } from '../../../common/powertools';
import { copyS3Object, processS3GzipObjectLineByLine, readS3ObjectAsJson } from '../../../common/s3';
import { aws_sdk_client_common_config } from '../../../common/sdk-client-config';
import { getJobInfoKey } from '../../utils/utils-common';

const emrApplicationId = process.env.EMR_SERVERLESS_APPLICATION_ID!;
const projectId = process.env.PROJECT_ID!;
const pipelineS3BucketName = process.env.PIPELINE_S3_BUCKET_NAME!;
const pipelineS3Prefix = process.env.PIPELINE_S3_PREFIX!;
const dlQueueUrl = process.env.DL_QUEUE_URL!;

const emrClient = new EMRServerlessClient({
  ...aws_sdk_client_common_config,
});
const sqsClient = new SQSClient({
  ...aws_sdk_client_common_config,
});

const jobMetrics = new Metrics({ namespace: MetricsNamespace.DATAPIPELINE, serviceName: MetricsService.EMR_SERVERLESS });
jobMetrics.addDimensions({
  ApplicationId: emrApplicationId,
});

export const handler = async (event: EventBridgeEvent<string, { jobRunId: string; applicationId: string; state: string }>) => {
  logger.info('Triggered from  event', { event });
  const jobState = event.detail.state;
  if (event.detail.applicationId != emrApplicationId) {
    logger.info(`unknown applicationId ${event.detail.applicationId}, only process event from emrApplicationId: ${emrApplicationId}`);
    return;
  }

  const jobStartStateFile = getJobInfoKey({
    pipelineS3Prefix,
    projectId,
  }, event.detail.jobRunId);

  const jobFinishStateFile = getJobInfoKey({
    pipelineS3Prefix,
    projectId,
  }, `${event.detail.jobRunId}-${jobState}`);

  const buildS3Uri = (key: string) => {
    return `s3://${pipelineS3BucketName}/${key}`;
  };

  // Only record SUCCESS/FAILED jobs
  const recoredStates = [
    'SUCCESS',
    'FAILED',
  ];
  if (recoredStates.includes(jobState)) {
    await copyS3Object(buildS3Uri(jobStartStateFile), buildS3Uri(jobFinishStateFile));
  }

  if (jobState == 'SUCCESS') {
    await sendMetrics(event);
  }

  if (jobState == 'FAILED') {
    const jobSubmitInfo = await readS3ObjectAsJson(pipelineS3BucketName, jobStartStateFile);
    await putFailedJobInfoToDLQueue(JSON.stringify(jobSubmitInfo));
  }
};

async function putFailedJobInfoToDLQueue(jobSubmitInfoMessage: string) {
  await sqsClient.send(new SendMessageCommand({
    QueueUrl: dlQueueUrl,
    MessageBody: jobSubmitInfoMessage,
  }));
}

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
    const flattedSourceMatch = line.match(flattedSourceRegEx);
    const sinkMatch = line.match(sinkRegEx);
    const corruptedMatch = line.match(corruptedRegEx);
    if (sourceMatch) {
      metrics = {
        ...metrics,
        source: parseInt(sourceMatch[1]),
      };
    } else if (flattedSourceMatch) {
      metrics = {
        ...metrics,
        flattedSource: parseInt(flattedSourceMatch[1]),
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


  jobMetrics.addMetric(DataPipelineCustomMetricsName.SOURCE, MetricUnits.Count, metrics.source);
  jobMetrics.addMetric(DataPipelineCustomMetricsName.FLATTED_SOURCE, MetricUnits.Count, metrics.flattedSource);
  jobMetrics.addMetric(DataPipelineCustomMetricsName.SINK, MetricUnits.Count, metrics.sink);
  jobMetrics.addMetric(DataPipelineCustomMetricsName.CORRUPTED, MetricUnits.Count, metrics.corrupted);
  jobMetrics.addMetric(DataPipelineCustomMetricsName.RUN_TIME, MetricUnits.Seconds, jobTimeSeconds);
  jobMetrics.publishStoredMetrics();

}
