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
import { Context } from 'aws-lambda';
import { v4 as uuid } from 'uuid';
import { getFunctionTags } from '../../../common/lambda/tags';
import { logger } from '../../../common/powertools';
import { listObjectsByPrefix, putStringToS3, readS3ObjectAsJson } from '../../../common/s3';
import { aws_sdk_client_common_config } from '../../../common/sdk-client-config';
import { getJobInfoKey, getSinkLocationPrefix } from '../../utils/utils-common';

const emrClient = new EMRServerlessClient({
  ...aws_sdk_client_common_config,
});

interface EMRJobInfo {
  jobId?: string;
  objectsInfo: ObjectsInfo;
}

interface ObjectsInfo {
  objectCount: number;
  sizeTotal: number;
}

export interface CustomSparkConfig {
  sparkConfig: string[];
  outputPartitions: number;
  inputRePartitions: number;
}

export class EMRServerlessUtil {
  public static async start(event: any, context: Context): Promise<EMRJobInfo | undefined> {
    try {
      logger.info('enter start');
      const config = this.getConfig();
      logger.info('config', { config });
      if (!config.appIds) {
        logger.warn('appIds is empty, please check env: APP_IDS');
        return;
      }
      const runJobInfo = await EMRServerlessUtil.startJobRun(
        event,
        config,
        context,
      );
      logger.info('started job:', { runJobInfo });

      return runJobInfo;

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
    context: Context,
  ) {

    let funcTags: Record<string, string> | undefined = undefined;

    try {
      funcTags = await getFunctionTags(context);
    } catch (e) {
      //@ts-ignore
      if (e.name === 'TimeoutError') {
        logger.warn('getFunctionTags TimeoutError');
      } else {
        logger.error('error:' + e);
        throw e;
      }
    }

    logger.info('funcTags', { funcTags });

    const { startTimestamp, endTimestamp } = await this.getJobTimestamps(
      event,
      config,
    );

    const objectsInfo = await calculateObjects(config.sourceBucketName, config.sourceS3Prefix, startTimestamp, endTimestamp);

    logger.info('objectsInfo', { objectsInfo });
    if (objectsInfo.objectCount == 0) {
      logger.info('No files to process');
      return { objectsInfo };
    }

    const { startJobRunCommandInput } = await this.getJobRunCommandInput(event, config, startTimestamp, endTimestamp, funcTags, objectsInfo);

    const startJobRunCommand = new StartJobRunCommand(startJobRunCommandInput);
    let jobInfo = await emrClient.send(startJobRunCommand);

    await this.recordJobInfo({
      event,
      config,
      jobRunId: jobInfo.jobRunId!,
      startTimestamp,
      endTimestamp,
      state: 'LAMBDA-SUBMITTED',
      startRunTime: new Date().toISOString(),
    });

    await this.recordJobInfo({
      event,
      config,
      jobRunId: 'latest',
      startTimestamp,
      endTimestamp,
      state: 'LAMBDA-SUBMITTED',
      startRunTime: new Date().toISOString(),
    });

    logger.info('jobInfo', { jobInfo });

    return {
      jobRunId: jobInfo.jobRunId!,
      objectsInfo,
    };
  }

  private static async getJobRunCommandInput(event: any, config: any, startTimestamp: number, endTimestamp: number,
    funcTags: Record<string, string> | undefined, objectsInfo: ObjectsInfo) {

    let sparkConfigEvent: string[] = event.sparkConfig || [];
    let sparkConfigS3: string[] = [];
    let s3OutputPartitions = undefined;
    let s3InputRePartitions = undefined;

    let sparkConfigS3Obj = await readS3ObjectAsJson(config.pipelineS3BucketName,
      `${config.pipelineS3Prefix}${config.projectId}/config/spark-config.json`,
    );

    if (sparkConfigS3Obj?.sparkConfig) {
      sparkConfigS3 = sparkConfigS3Obj.sparkConfig;
    }

    if (sparkConfigS3Obj) {
      s3OutputPartitions = sparkConfigS3Obj.outputPartitions;
      s3InputRePartitions = sparkConfigS3Obj.inputRePartitions;
    }

    const estimatedSparkConfig = getEstimatedSparkConfig(objectsInfo);

    const outputPartitions = (event.outputPartitions || s3OutputPartitions || estimatedSparkConfig.outputPartitions || config.outputPartitions) + '';
    const rePartitions = (event.inputRePartitions || s3InputRePartitions || estimatedSparkConfig.inputRePartitions || config.rePartitions) + '';

    const jobName = event.jobName || process.env.JOB_NAME || `${startTimestamp}-${uuid()}`;

    const sinkPrefix = getSinkLocationPrefix(config.sinkS3Prefix, config.projectId);

    const jobDataDir = `${config.projectId}/job-data/${jobName}`;

    const userKeepDays = config.userKeepDays;
    const itemKeepDays = config.itemKeepDays;

    const entryPointArguments = [
      config.saveInfoToWarehouse,
      config.databaseName, // [1] glue catalog database.
      config.sourceTableName, // [2] glue catalog source table name.
      `${startTimestamp}`, // [3] start timestamp of event.
      `${endTimestamp}`, // [4] end timestamp of event.
      `s3://${config.sourceBucketName}/${config.sourceS3Prefix}`, // [5] source path
      `s3://${config.pipelineS3BucketName}/${config.pipelineS3Prefix}${jobDataDir}`, // [6] job data path to save temp data
      config.transformerAndEnrichClassNames, // [7] transformer class names with comma-separated
      `s3://${config.sinkBucketName}/${sinkPrefix}`, // [8] output path.
      config.projectId, // [9] projectId
      config.appIds, // [10] app_ids
      `${config.dataFreshnessInHour}`, // [11] dataFreshnessInHour,
      config.outputFormat, // [12] outputFormat,
      outputPartitions, // [13] outputPartitions
      rePartitions, // [14] rePartitions.
      userKeepDays, // [15] userKeepDays
      itemKeepDays, // [16] itemKeepDays
    ];

    const jars = Array.from(
      new Set([
        config.entryPointJar,
        ...(config.s3PathPluginJars as string).split(',').filter(s => s.length > 0),
      ]),
    ).join(',');

    const sparkSubmitParameters = [
      '--class',
      'software.aws.solution.clickstream.DataProcessor',
      '--jars',
      jars,
    ];

    if (config.s3PathPluginFiles) {
      const filesSet = new Set((config.s3PathPluginFiles as string).split(',').filter(s => s.length > 0));
      sparkSubmitParameters.push('--files', Array.from(filesSet).join(','));
    }

    // https://docs.aws.amazon.com/emr/latest/EMR-Serverless-UserGuide/metastore-config.html
    // https://docs.aws.amazon.com/emr/latest/EMR-Serverless-UserGuide/jobs-spark.html
    const defaultConfig = [
      'spark.hadoop.hive.metastore.client.factory.class=com.amazonaws.glue.catalog.metastore.AWSGlueDataCatalogHiveClientFactory',
      'spark.driver.cores=4',
      'spark.driver.memory=14g',
      'spark.executor.cores=4',
      'spark.executor.memory=14g',
    ];

    const configMap = new Map<string, string>();
    for (let it of [...defaultConfig, ...estimatedSparkConfig.sparkConfig, ...sparkConfigS3, ...sparkConfigEvent]) {
      const configs = it.split('=', 2);
      if (configs.length == 2) {
        const key = configs[0];
        const value = configs[1];
        configMap.set(key, value);
      } else {
        logger.warn(`Unrecognized spark config '${it}'!`);
      }
    }

    for (let [confKey, confVal] of configMap.entries()) {
      sparkSubmitParameters.push('--conf', `${confKey}=${confVal}`);
    }

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
            logUri: `s3://${config.pipelineS3BucketName}/${config.pipelineS3Prefix}pipeline-logs/${config.projectId}/`,
          },
        },
      },
      tags: funcTags, // propagate the tags of function itself to EMR job runs
    };

    logger.info('getJobRunCommandInput return', { startJobRunCommandInput, startTimestamp, endTimestamp });
    return { startJobRunCommandInput, startTimestamp, endTimestamp };
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
    const jobKey = getJobInfoKey(jobInfoObj.config, jobInfoObj.jobRunId);
    await putStringToS3(JSON.stringify(jobInfoObj), bucketName, jobKey);
  }

  private static getConfig() {
    return {
      saveInfoToWarehouse: process.env.SAVE_INFO_TO_WAREHOUSE == '1' || process.env.SAVE_INFO_TO_WAREHOUSE?.toLocaleLowerCase() == 'true' ? 'true' : 'false',
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
      dataBufferedSeconds: process.env.DATA_BUFFERED_SECONDS!,
      scheduleExpression: process.env.SCHEDULE_EXPRESSION!,
      transformerAndEnrichClassNames:
        process.env.TRANSFORMER_AND_ENRICH_CLASS_NAMES!,
      s3PathPluginJars: process.env.S3_PATH_PLUGIN_JARS!,
      s3PathPluginFiles: process.env.S3_PATH_PLUGIN_FILES!,
      entryPointJar: process.env.S3_PATH_ENTRY_POINT_JAR!,
      outputFormat: process.env.OUTPUT_FORMAT!,
      outputPartitions: process.env.OUTPUT_PARTITIONS ?? '-1',
      rePartitions: process.env.RE_PARTITIONS ?? '200',
      userKeepDays: process.env.USER_KEEP_DAYS ?? '180',
      itemKeepDays: process.env.ITEM_KEEP_DAYS ?? '360',
    };
  }

  /**
   *
   * Get startTimestamp and endTimestamp to filter ingestion data.
   *
   * 1. try to get startTimestamp, endTimestamp from event.
   * 2. otherwise, get previous timestamps from s3://bucket/prefix/job-info/stackId/projectId/job-latest.json, and set this.startTimestamp = prev.endTimestamp.
   * 3. otherwise, set startTimestamp to start of today, and endTimestamp to now
   *
   * @param event
   * @param config
   * @returns { startTimestamp, endTimestamp }
   */
  private static async getJobTimestamps(event: any, config: any) {
    logger.info('getJobTimestamps enter', { event });
    const dataBufferedSeconds = parseInt(config.dataBufferedSeconds || 5);
    let now = new Date();
    let startTimestamp = (new Date(now.toDateString())).getTime();
    let endTimestamp = now.getTime() - dataBufferedSeconds * 1000;

    if (event.startTimestamp) {
      startTimestamp = getTimestampFromEvent(event.startTimestamp);
    } else {
      // get previous job info, set this.startTimestamp to previous.endTimestamp
      const key = getJobInfoKey(config, 'latest');
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

function getTimestampFromEvent(inputTimestamp: string | number): number {
  if (typeof inputTimestamp == 'number') {
    return inputTimestamp;
  }

  if (new RegExp(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z$/).exec(inputTimestamp)) {
    return new Date(inputTimestamp).getTime();
  }

  if (new RegExp(/^\d+$/).exec(inputTimestamp)) {
    return parseInt(inputTimestamp);
  }

  throw new Error('Invalid input timestamp:' + inputTimestamp);
}

async function calculateObjects(bucketName: string, prefix: string, startTimestamp: number, endTimestamp: number) {
  let objectCount = 0;
  let sizeTotal = 0;

  const datePrefixList = getDatePrefixList(prefix, startTimestamp, endTimestamp);

  for (const datePrefix of datePrefixList) {
    await listObjectsByPrefix(bucketName, datePrefix, (obj) => {
      if (obj.Key
        && !obj.Key.endsWith('/_.json')
        && obj.Size
        && obj.LastModified
        && obj.LastModified.getTime() >= startTimestamp
        && obj.LastModified.getTime() < endTimestamp) {
        objectCount++;
        if (obj.Key.endsWith('.gz')) {
          sizeTotal += obj.Size * 20;
        } else {
          sizeTotal += obj.Size;
        }
      }
    });
  }
  return {
    objectCount,
    sizeTotal,
  };
}

export function getDatePrefixList(prefix: string, startTimestamp: number, endTimestamp: number): string[] {
  if (!prefix.endsWith('/')) {
    prefix = prefix + '/';
  }
  let aTime = startTimestamp;
  const oneDay = 24 * 60 * 60 * 1000;

  const padTo2Digits = (num: number) => {
    return num.toString().padStart(2, '0');
  };
  const dataPrefixList: string[] = [];

  while (aTime <= endTimestamp) {
    const currentDate = new Date(aTime);
    const yyyy = currentDate.getUTCFullYear();
    const mm = currentDate.getUTCMonth() + 1;
    const dd = currentDate.getUTCDate();
    dataPrefixList.push(
      `${prefix}year=${yyyy}/month=${padTo2Digits(mm)}/days=${padTo2Digits(dd)}/`,
    );
    aTime += oneDay;
  }
  logger.info(`dataPrefixList for ${new Date(startTimestamp).toISOString()} to ${new Date(endTimestamp).toISOString()}`,
    {
      start: dataPrefixList[0],
      end: dataPrefixList[dataPrefixList.length -1],
      length: dataPrefixList.length,
    });
  return dataPrefixList;

}

export function getEstimatedSparkConfig(objectsInfo: ObjectsInfo): CustomSparkConfig {
  // https://docs.aws.amazon.com/emr/latest/EMR-Serverless-UserGuide/jobs-spark.html
  // https://docs.aws.amazon.com/emr/latest/EMR-Serverless-UserGuide/app-behavior.html
  const size_1G = 1024 * 1024 * 1024;
  logger.info('getEstimatedSparkConfig ', { objectsInfo });

  let driverCore = 4;
  let driverMem = 14;
  let driverDisk = 20;
  let executorCore = 4;
  let executorMem = 14;
  let executorDisk = 20;
  let initialExecutors = 3;
  let inputRePartitions = 10;

  if (objectsInfo.sizeTotal < 1 * size_1G) {
    logger.info('use default settings');
  } else if (objectsInfo.sizeTotal < 10 * size_1G) {
    executorCore = 8;
    executorMem = 50;
    executorDisk = 50;
    initialExecutors = 3;
    inputRePartitions = 10;
  } else if (objectsInfo.sizeTotal < 50 * size_1G) {
    driverCore = 8;
    driverMem = 50;
    driverDisk = 50;
    executorCore = 16;
    executorMem = 100;
    executorDisk = 200;
    initialExecutors = 6;
    inputRePartitions = 200;
  } else if (objectsInfo.sizeTotal < 100 * size_1G) {
    driverCore = 8;
    driverMem = 50;
    driverDisk = 50;
    executorCore = 16;
    executorMem = 100;
    executorDisk = 200;
    initialExecutors = 10;
    inputRePartitions = 200;
  } else if (objectsInfo.sizeTotal < 200 * size_1G) {
    driverCore = 8;
    driverMem = 50;
    driverDisk = 50;
    executorCore = 16;
    executorMem = 100;
    executorDisk = 200;
    initialExecutors = 10;
    inputRePartitions = 500;

  } else if (objectsInfo.sizeTotal < 500 * size_1G) {
    driverCore = 16;
    driverMem = 60;
    driverDisk = 60;
    executorCore = 16;
    executorMem = 100;
    executorDisk = 200;
    initialExecutors = 10;
    inputRePartitions = 1000;
  } else if (objectsInfo.sizeTotal < 1000 * size_1G) {
    driverCore = 16;
    driverMem = 60;
    driverDisk = 60;
    executorCore = 16;
    executorMem = 100;
    executorDisk = 200;
    initialExecutors = 15;
    inputRePartitions = 1000;
  } else {
    driverCore = 16;
    driverMem = 60;
    driverDisk = 60;
    executorCore = 16;
    executorMem = 100;
    executorDisk = 200;
    initialExecutors = 25;
    inputRePartitions = 2000;
  }

  return {
    outputPartitions: -1,
    inputRePartitions,
    sparkConfig: [
      `spark.driver.cores=${driverCore}`,
      `spark.driver.memory=${driverMem}g`,
      `spark.emr-serverless.driver.disk=${driverDisk}g`,
      `spark.executor.cores=${executorCore}`,
      `spark.executor.memory=${executorMem}g`,
      `spark.emr-serverless.executor.disk=${executorDisk}g`,
      'spark.dynamicAllocation.enabled=true',
      `spark.dynamicAllocation.initialExecutors=${initialExecutors}`,
      `spark.executor.instances=${initialExecutors}`,
    ],
  };

}
