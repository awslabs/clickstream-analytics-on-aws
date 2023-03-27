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
  EMRServerlessClient,
  StartJobRunCommand,
  StartJobRunCommandInput,
} from '@aws-sdk/client-emr-serverless';
import { v4 as uuid } from 'uuid';
import { logger } from '../../../common/powertools';
import { putStringToS3, readS3ObjectAsJson } from '../../../common/s3';

const emrClient = new EMRServerlessClient({});

interface EMRJobInfo {
  jobId: string;
}

export class EMRServerlessUtil {
  public static async start(event: any): Promise<EMRJobInfo> {
    try {
      logger.info('enter start');
      const config = this.getConfig();
      logger.info('config', { config });
      if (!config.appIds) {
        logger.warn('appIds is empty, please check env: APP_IDS');
        return {
          jobId: '',
        };
      }
      const jobId = await EMRServerlessUtil.startJobRun(
        event,
        config,
      );
      logger.info('started job:', { jobId });

      return {
        jobId,
      };
    } catch (error) {
      logger.error(
        'Unexpected error occurred while trying to start EMR Serverless Application',
        error as Error,
      );
      throw error;
    }
  }

  private static async startJobRun(
    event: any,
    config: any,
  ) {
    const jobName = uuid();
    const { startTimestamp, endTimestamp } = await this.getJobTimestamps(
      event,
      config,
    );

    const entryPointArguments = [
      config.databaseName, // [0] glue catalog database.
      config.sourceTableName, // [1] glue catalog source table name.
      `${startTimestamp}`, // [2] start timestamp of event.
      `${endTimestamp}`, // [3] end timestamp of event.
      `s3://${config.pipelineS3BucketName}/${config.pipelineS3Prefix}`, // [4] job data path
      config.transformerAndEnrichClassNames, // [5] transformer class names with comma-separated
      `s3://${config.sinkBucketName}/${config.sinkS3Prefix}`, // [6] output path.
      config.projectId, // [7] projectId
      config.appIds, // [8] app_ids
      `${config.dataFreshnessInHour}`, // [9] dataFreshnessInHour
    ];

    const jars = Array.from(
      new Set([
        config.entryPointJar,
        ...(config.s3PathPluginJars as string).split(','),
      ]),
    ).join(',');

    const sparkSubmitParameters = [
      '--class',
      'com.amazonaws.solution.clickstream.App',
      '--jars',
      jars,
    ];

    if (config.s3PathPluginFiles) {
      sparkSubmitParameters.push('--files', config.s3PathPluginFiles);
    }

    // https://docs.aws.amazon.com/emr/latest/EMR-Serverless-UserGuide/metastore-config.html
    // https://docs.aws.amazon.com/emr/latest/EMR-Serverless-UserGuide/jobs-spark.html
    sparkSubmitParameters.push('--conf', 'spark.hadoop.hive.metastore.client.factory.class=com.amazonaws.glue.catalog.metastore.AWSGlueDataCatalogHiveClientFactory');
    sparkSubmitParameters.push('--conf', 'spark.driver.cores=4');
    sparkSubmitParameters.push('--conf', 'spark.driver.memory=14g');
    sparkSubmitParameters.push('--conf', 'spark.executor.cores=4');
    sparkSubmitParameters.push('--conf', 'spark.executor.memory=14g');

    const startJobRunCommandInput: StartJobRunCommandInput = {
      applicationId: config.emrServerlessApplicationId,
      executionRoleArn: config.roleArn,
      name: jobName,
      jobDriver: {
        sparkSubmit: {
          entryPoint: config.entryPointJar,
          entryPointArguments,
          sparkSubmitParameters: sparkSubmitParameters.join(' '),
        },
      },
      configurationOverrides: {
        monitoringConfiguration: {
          s3MonitoringConfiguration: {
            logUri: `s3://${config.pipelineS3BucketName}/${config.pipelineS3Prefix}/pipeline-logs/${config.projectId}/`,
          },
        },
      },
    };

    logger.info('startJobRunCommandInput', { startJobRunCommandInput });

    const startJobRunCommand = new StartJobRunCommand(startJobRunCommandInput);
    let jobInfo = await emrClient.send(startJobRunCommand);

    await this.recordJobInfo({
      event,
      config,
      jobRunId: jobInfo.jobRunId!,
      startTimestamp,
      endTimestamp,
      state: 'RUNNING',
      startRunTime: new Date().toISOString(),
    });

    logger.info('jobInfo', { jobInfo } );

    return jobInfo.jobRunId!;
  }

  private static async recordJobInfo(jobInfoObj: {
    event: any;
    config: any;
    jobRunId: string;
    startTimestamp: number;
    endTimestamp: number;
    state: string;
    startRunTime: string;
  }) {
    const bucketName = jobInfoObj.config.pipelineS3BucketName;
    const jobKey = this.getJobInfoKey(jobInfoObj.config, jobInfoObj.jobRunId);
    await putStringToS3(JSON.stringify(jobInfoObj), bucketName, jobKey);

    //TODO: change to write latest file when job successfully completed.
    const latestKey = this.getJobInfoKey(jobInfoObj.config, 'latest');
    await putStringToS3(JSON.stringify(jobInfoObj), bucketName, latestKey);
  }

  private static getConfig() {
    return {
      emrServerlessApplicationId: process.env.EMR_SERVERLESS_APPLICATION_ID!,
      stackId: process.env.STACK_ID!,
      projectId: process.env.PROJECT_ID!,
      appIds: process.env.APP_IDS,
      roleArn: process.env.ROLE_ARN!,
      catalogId: process.env.GLUE_CATALOG_ID!,
      databaseName: process.env.GLUE_DB!,
      sourceTableName: process.env.SOURCE_TABLE_NAME!,
      sourceBucketName: process.env.SOURCE_S3_BUCKET_NAME!,
      sourceS3Prefix: process.env.SOURCE_S3_PREFIX!,
      sinkBucketName: process.env.SINK_S3_BUCKET_NAME!,
      sinkS3Prefix: process.env.SINK_S3_PREFIX!,
      pipelineS3BucketName: process.env.PIPELINE_S3_BUCKET_NAME!,
      pipelineS3Prefix: process.env.PIPELINE_S3_PREFIX!,
      dataFreshnessInHour: process.env.DATA_FRESHNESS_IN_HOUR!,
      scheduleExpression: process.env.SCHEDULE_EXPRESSION!,
      transformerAndEnrichClassNames:
        process.env.TRANSFORMER_AND_ENRICH_CLASS_NAMES!,
      s3PathPluginJars: process.env.S3_PATH_PLUGIN_JARS!,
      s3PathPluginFiles: process.env.S3_PATH_PLUGIN_FILES!,
      entryPointJar: process.env.S3_PATH_ENTRY_POINT_JAR!,
    };
  }

  private static getJobInfoKey(config: any, jobId: string) {
    return `${config.pipelineS3Prefix}/job-info/${config.stackId}/${config.projectId}/job-${jobId}.json`;
  }

  /**
   *
   * Get startTimestamp and endTimestamp to filter ingestion data.
   *
   * 1. try to get startTimestamp, endTimestamp from event.
   * 2. otherwise, get previous timestamps from s3://bucket/prefix/job-info/stackId/projectId/job-latest.json, and set this.startTimestamp = prev.endTimestamp.
   * 3. otherwise, set startTimestamp to 5 days ago, and endTimestamp to now
   *
   * @param event
   * @param config
   * @returns { startTimestamp, endTimestamp }
   */
  private static async getJobTimestamps(event: any, config: any) {
    logger.info('getJobTimestamps enter');
    let startTimestamp = (new Date().getTime() - 5 * 24 * 3600) * 1000; // 5 day before
    let endTimestamp = new Date().getTime() * 1000;
    if (event.startTimestamp) {
      startTimestamp = getTimestampFromEvent(event.startTimestamp);
    } else {
      // get previous job info, set this.startTimestamp to previous.endTimestamp
      const key = this.getJobInfoKey(config, 'latest');
      const previousTimestamp = await readS3ObjectAsJson(
        config.pipelineS3BucketName,
        key,
      );
      if (previousTimestamp) {
        logger.info(
          'found previous job, set startTimestamp to previousTimestamp.endTimestamp',
        );
        startTimestamp = previousTimestamp.endTimestamp;
      }
    }

    if (event.endTimestamp) {
      endTimestamp = getTimestampFromEvent(event.endTimestamp);
    }

    if (startTimestamp > endTimestamp) {
      throw new Error('endTimestamp less than startTimestamp');
    }

    logger.info(`getJobTimestamps return startTimestamp: ${startTimestamp}, endTimestamp: ${endTimestamp}`);
    return {
      startTimestamp,
      endTimestamp,
    };
  }
}

function getTimestampFromEvent(inputTimestamp: string|number): number {
  if (typeof inputTimestamp == 'number') {
    return inputTimestamp;
  }

  if ((inputTimestamp as string).match(/^\d\d\d\d\-\d\d\-\d\dT\d\d:\d\d:\d\d\.\d+Z$/)) {
    return new Date(inputTimestamp).getTime() * 1000;
  }

  if ((inputTimestamp as string).match(/^\d+$/)) {
    return parseInt(inputTimestamp);
  }

  throw new Error('Invalid input timestamp:' + inputTimestamp);
}
