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

//@ts-nocheck
class TimeoutError extends Error {
  constructor() {
    super();
    this.name = 'TimeoutError';
  }
}


const startTimestamp = '2023-03-12T09:33:26.572Z';
const endTimestamp = '2023-03-13T09:33:26.572Z';

const emrMock = {
  EMRServerlessClient: jest.fn(() => {
    return {
      send: jest.fn(() => {
        return {
          jobRunId: 'jobId007',
          applicationId: 'testApplicationId',
          tags: {
            project_id: 'project_007',
            tag_key1: 'tag_value1',
          },
          application: {
            runtimeConfiguration: [
              {
                classification: 'spark-defaults',
                properties: {
                  'spark.emr-serverless.driverEnv.JAVA_HOME': '/usr/lib/jvm/java-17-amazon-corretto.aarch64/',
                  'spark.executorEnv.JAVA_HOME': '/usr/lib/jvm/java-17-amazon-corretto.aarch64/',
                },
              },
            ],
          },
        };
      }),
    };
  }),
  StartJobRunCommand: jest.fn(() => { return { name: 'StartJobRunCommand' }; }),
  StartJobRunCommandInput: jest.fn(() => { return { name: 'StartJobRunCommandInput' }; }),
  GetApplicationCommand: jest.fn(() => { return { name: 'GetApplicationCommand' }; }),

};

jest.mock('@aws-sdk/client-emr-serverless', () => {
  return emrMock;
});


const putStringToS3Mock = jest.fn(() => { });
const isObjectExistMock = jest.fn(() => true);

const mockS3Functions = {
  readS3ObjectAsJson: jest.fn(() => undefined),
  putStringToS3: putStringToS3Mock,
  isObjectExist: isObjectExistMock,
  listObjectsByPrefix: jest.fn((_b, _k, f) => {
    [
      {
        Key: 'test/file2.json',
        Size: 1024,
        LastModified: new Date(startTimestamp),
      },
      {
        Key: 'test/file3.gz',
        Size: 1024,
        LastModified: new Date(startTimestamp),
      },
      {
        Key: 'test/_.json',
        Size: 0,
        LastModified: new Date(startTimestamp),
      },
    ].forEach(o => f(o));
  }),
};

jest.mock('../../src/common/s3', () => {
  return mockS3Functions;
});


import { LambdaClient, ListTagsCommand } from '@aws-sdk/client-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { CustomSparkConfig, EMRServerlessUtil, getDatePrefixList, getEstimatedSparkConfig } from '../../src/data-pipeline/lambda/emr-job-submitter/emr-client-util';
import { getMockContext } from '../common/lambda-context';
import 'aws-sdk-client-mock-jest';

process.env.EMR_SERVERLESS_APPLICATION_ID = 'testApplicationId';
process.env.PROJECT_ID = 'test_proj_001';
process.env.APP_IDS = 'app1,app2';
process.env.ROLE_ARN = 'arn:aws::role:role1';
process.env.GLUE_CATALOG_ID = 'cid_001';
process.env.GLUE_DB = 'test_db';
process.env.SOURCE_TABLE_NAME = 'source_table';
process.env.SOURCE_S3_BUCKET_NAME = 'test-bucket-src';
process.env.SOURCE_S3_PREFIX = 'src-prefix/';
process.env.SINK_S3_BUCKET_NAME = 'test-bucket-sink';
process.env.SINK_S3_PREFIX = 'sink-prefix/';
process.env.PIPELINE_S3_BUCKET_NAME = 'test-pipe-line-bucket';
process.env.PIPELINE_S3_PREFIX = 'pipeline-prefix/';
process.env.DATA_FRESHNESS_IN_HOUR = '24';
process.env.SCHEDULE_EXPRESSION = 'rate(1 day)';
process.env.TRANSFORMER_AND_ENRICH_CLASS_NAMES = 'com.test.ClassMain,com.test.ClassMainTest';
process.env.S3_PATH_PLUGIN_JARS = 's3://test/test1.jar,s3://test/test2.jar';
process.env.S3_PATH_PLUGIN_FILES = 's3://test/test1.txt,s3://test/test2.txt';
process.env.S3_PATH_ENTRY_POINT_JAR = 's3://test/main.jar';
process.env.OUTPUT_FORMAT = 'json';
process.env.OUTPUT_PARTITIONS = '128';
process.env.RE_PARTITIONS = '96';
process.env.JOB_NAME = 'test-job-name-123456';
process.env.SAVE_INFO_TO_WAREHOUSE = '1';
process.env.USER_KEEP_DAYS = '10';
process.env.ITEM_KEEP_DAYS = '12';
// RULE_CONFIG_DIR
process.env.RULE_CONFIG_DIR = 's3://test_config_bucket/test_proj_001/rules/';


describe('Data Process -- EMR Serverless job submitter function', () => {

  const context = getMockContext();
  const lambdaMock = mockClient(LambdaClient);

  const functionTags = {
    project_id: 'project_007',
    tag_key1: 'tag_value1',
  };

  beforeEach(() => {
    lambdaMock.reset();
  });

  test('start data processing job', async () => {
    lambdaMock.on(ListTagsCommand).resolves({ Tags: {} });
    const jobInfo = await EMRServerlessUtil.start({
      startTimestamp,
      endTimestamp,
    }, context);
    expect(emrMock.StartJobRunCommand.mock.calls.length).toEqual(1);
    expect(jobInfo).toEqual({
      jobRunId: 'jobId007',
      objectsInfo: {
        objectCount: 4,
        sizeTotal: 43008,
      },
    });
    expect(isObjectExistMock.mock.calls.length).toEqual(4);
  });

  test('ignore starting data processing job when no files found', async () => {
    lambdaMock.on(ListTagsCommand).resolves({ Tags: {} });
    const jobInfo = await EMRServerlessUtil.start({
      startTimestamp: new Date(startTimestamp).getTime() + 1000,
    }, context);
    expect(emrMock.StartJobRunCommand.mock.calls.length).toEqual(0);
    expect(jobInfo).toEqual({
      jobRunId: undefined,
      objectsInfo: {
        objectCount: 0,
        sizeTotal: 0,
      },
    });
  });

  test('start data processing job with timestamp - string', async () => {
    lambdaMock.on(ListTagsCommand).resolves({ Tags: functionTags });

    await EMRServerlessUtil.start({
      startTimestamp,
      endTimestamp,
    }, context);
    expect(emrMock.StartJobRunCommand.mock.calls.length).toEqual(1);

    const expectedStartParam = {
      applicationId: 'testApplicationId',
      executionRoleArn: 'arn:aws::role:role1',
      // "name": "282407d2-3847-479d-8bae-c64e3badc6c5",
      jobDriver: {
        sparkSubmit: {
          entryPoint: 's3://test/main.jar',
          entryPointArguments: [
            'true',
            'test_db',
            'source_table',
            '1678613606572',
            '1678700006572',
            's3://test-bucket-src/src-prefix/',
            's3://test-pipe-line-bucket/pipeline-prefix/test_proj_001/job-data/test-job-name-123456', // pipeline data path
            'com.test.ClassMain,com.test.ClassMainTest',
            's3://test-bucket-sink/sink-prefix/test_proj_001/', // output path
            'test_proj_001',
            'app1,app2',
            '24',
            'json',
            '-1',
            '10',
            '10',
            '12',
            's3://test_config_bucket/test_proj_001/rules/',
          ],
          sparkSubmitParameters: '--class software.aws.solution.clickstream.DataProcessor \
--jars s3://test/main.jar,s3://test/test1.jar,s3://test/test2.jar \
--files s3://test/test1.txt,s3://test/test2.txt \
--conf spark.hadoop.hive.metastore.client.factory.class=com.amazonaws.glue.catalog.metastore.AWSGlueDataCatalogHiveClientFactory \
--conf spark.driver.cores=4 \
--conf spark.driver.memory=14g \
--conf spark.executor.cores=4 \
--conf spark.executor.memory=14g \
--conf spark.emr-serverless.driver.disk=20g \
--conf spark.emr-serverless.executor.disk=20g \
--conf spark.dynamicAllocation.enabled=true \
--conf spark.dynamicAllocation.initialExecutors=3 --conf spark.executor.instances=3',
        },
      },
      tags: functionTags,
      configurationOverrides: {
        monitoringConfiguration:
        {
          s3MonitoringConfiguration:
          {
            logUri: 's3://test-pipe-line-bucket/pipeline-prefix/pipeline-logs/test_proj_001/',
          },
        },
        applicationConfiguration: [{
          classification: 'spark-defaults',
          properties: {
            'spark.emr-serverless.driverEnv.JAVA_HOME': '/usr/lib/jvm/java-17-amazon-corretto.aarch64/',
            'spark.executorEnv.JAVA_HOME': '/usr/lib/jvm/java-17-amazon-corretto.aarch64/',
          },
        }],

      },
    };
    //@ts-ignore
    const actParam = emrMock.StartJobRunCommand.mock.calls[0][0] as any;
    delete actParam.name;
    expect(actParam).toEqual(expectedStartParam);
  });

  test('start data processing job with event input jobName, sparkConfig and partitions', async () => {
    lambdaMock.on(ListTagsCommand).resolves({ Tags: functionTags });
    await EMRServerlessUtil.start({
      jobName: 'test-sparkConfig-job',
      startTimestamp,
      endTimestamp,
      sparkConfig: [
        'spark.executor.memory=50g',
        'spark.executor.cores=8',
        'spark.executor.test=test001',
      ],
      inputRePartitions: 90,
      outputPartitions: 120,
    }, context);
    expect(emrMock.StartJobRunCommand.mock.calls.length).toEqual(1);

    const expectedStartParam = {
      applicationId: 'testApplicationId',
      executionRoleArn: 'arn:aws::role:role1',
      name: 'test-sparkConfig-job',
      jobDriver: {
        sparkSubmit: {
          entryPoint: 's3://test/main.jar',
          entryPointArguments: [
            'true',
            'test_db',
            'source_table',
            '1678613606572',
            '1678700006572',
            's3://test-bucket-src/src-prefix/',
            's3://test-pipe-line-bucket/pipeline-prefix/test_proj_001/job-data/test-sparkConfig-job', // pipeline data path
            'com.test.ClassMain,com.test.ClassMainTest',
            's3://test-bucket-sink/sink-prefix/test_proj_001/', // output path
            'test_proj_001',
            'app1,app2',
            '24',
            'json',
            '120',
            '90',
            '10',
            '12',
            's3://test_config_bucket/test_proj_001/rules/',
          ],
          sparkSubmitParameters: '--class software.aws.solution.clickstream.DataProcessor \
--jars s3://test/main.jar,s3://test/test1.jar,s3://test/test2.jar \
--files s3://test/test1.txt,s3://test/test2.txt \
--conf spark.hadoop.hive.metastore.client.factory.class=com.amazonaws.glue.catalog.metastore.AWSGlueDataCatalogHiveClientFactory \
--conf spark.driver.cores=4 \
--conf spark.driver.memory=14g \
--conf spark.executor.cores=8 \
--conf spark.executor.memory=50g \
--conf spark.emr-serverless.driver.disk=20g \
--conf spark.emr-serverless.executor.disk=20g \
--conf spark.dynamicAllocation.enabled=true \
--conf spark.dynamicAllocation.initialExecutors=3 \
--conf spark.executor.instances=3 \
--conf spark.executor.test=test001',
        },
      },
      tags: functionTags,
      configurationOverrides: {
        monitoringConfiguration:
        {
          s3MonitoringConfiguration:
          {
            logUri: 's3://test-pipe-line-bucket/pipeline-prefix/pipeline-logs/test_proj_001/',
          },
        },
        applicationConfiguration: [{
          classification: 'spark-defaults',
          properties: {
            'spark.emr-serverless.driverEnv.JAVA_HOME': '/usr/lib/jvm/java-17-amazon-corretto.aarch64/',
            'spark.executorEnv.JAVA_HOME': '/usr/lib/jvm/java-17-amazon-corretto.aarch64/',
          },
        }],
      },
    }
      ;
    //@ts-ignore
    const actParam = emrMock.StartJobRunCommand.mock.calls[0][0] as any;
    expect(actParam).toEqual(expectedStartParam);
  });

  test('start data processing job with timestamp - number', async () => {
    lambdaMock.on(ListTagsCommand).resolves({ Tags: {} });
    await EMRServerlessUtil.start({
      startTimestamp: new Date(startTimestamp).getTime(),
    }, context);
    expect(emrMock.StartJobRunCommand.mock.calls.length).toEqual(1);
    //@ts-ignore
    const actParam = emrMock.StartJobRunCommand.mock.calls[0][0] as any;
    expect(actParam.tags).toEqual({});
  });

  test('start data processing job with timestamp - error', async () => {
    lambdaMock.on(ListTagsCommand).resolves({});
    let errMsg = '';
    try {
      await EMRServerlessUtil.start({
        startTimestamp,
        endTimestamp: new Date(startTimestamp).getTime() - 1,
      }, context);
    } catch (e: any) {
      errMsg = e.message;
    }
    expect(errMsg).toEqual('endTimestamp less than startTimestamp');
  });


  test('start ETL job get function tags timeout', async () => {
    lambdaMock.on(ListTagsCommand).rejects(new TimeoutError());

    await EMRServerlessUtil.start({
      startTimestamp,
    }, context);

    //@ts-ignore
    const actParam = emrMock.StartJobRunCommand.mock.calls[0][0] as any;
    expect(actParam.tags).toEqual(undefined);
  });

  test('start ETL job get function tags error', async () => {
    lambdaMock.on(ListTagsCommand).rejects(new Error('ListTagsCommand error'));
    let errMsg = '';
    try {
      await EMRServerlessUtil.start({
        startTimestamp,
      }, context);
    } catch (e: any) {
      errMsg = e.message;
    }
    expect(errMsg).toEqual('ListTagsCommand error');

  });

  test('test getEstimatedSparkConfig()', () => {
    const size_1G = 1024 * 1024 * 1024;

    [1, 11, 31, 51, 101, 201, 501, 1001, 2001].forEach(n => {
      let config: CustomSparkConfig = getEstimatedSparkConfig({
        sizeTotal: size_1G * n,
        objectCount: 10 * n,
      });
      expect(config.sparkConfig as string[]).toHaveLength(9);
      expect(config.inputRePartitions).toBeGreaterThan(9);
      expect(config.outputPartitions).toEqual(-1);
    });
  });

  test('test getDatePrefixList()', () => {

    const prefixList1 = getDatePrefixList('abc/test_prefix', new Date('2023-11-20T01:00:00.000Z').getTime(), new Date('2023-11-22T01:00:00.000Z').getTime());

    expect(prefixList1).toEqual([
      'abc/test_prefix/year=2023/month=11/day=20/',
      'abc/test_prefix/year=2023/month=11/day=21/',
      'abc/test_prefix/year=2023/month=11/day=22/',
    ]);

    const prefixList2 = getDatePrefixList('abc/test_prefix', new Date(startTimestamp).getTime(), new Date(endTimestamp).getTime());

    expect(prefixList2).toEqual([
      'abc/test_prefix/year=2023/month=03/day=12/',
      'abc/test_prefix/year=2023/month=03/day=13/',
    ]);

    const prefixList3 = getDatePrefixList('abc/test_prefix/', new Date('2023-11-20T01:00:00.000Z').getTime(), new Date('2023-11-20T02:00:00.000Z').getTime());
    expect(prefixList3).toEqual([
      'abc/test_prefix/year=2023/month=11/day=20/',
    ]);

    const prefixList4 = getDatePrefixList('abc/test_prefix/', new Date('2023-11-21T09:13:14.893Z').getTime(), new Date('2023-11-22T02:23:14.860Z').getTime());
    expect(prefixList4).toEqual([
      'abc/test_prefix/year=2023/month=11/day=21/',
      'abc/test_prefix/year=2023/month=11/day=22/',
    ]);
  });

  test('Write 2 state files in S3', async () => {
    lambdaMock.on(ListTagsCommand).resolves({ Tags: {} });
    await EMRServerlessUtil.start({
      startTimestamp: new Date(startTimestamp).getTime(),
    }, context);
    expect(putStringToS3Mock.mock.calls.length).toEqual(2);
    expect(putStringToS3Mock.mock.calls[0][2]).toEqual('pipeline-prefix/job-info/test_proj_001/job-jobId007.json');
    expect(putStringToS3Mock.mock.calls[1][2]).toEqual('pipeline-prefix/job-info/test_proj_001/job-latest.json');
  });

  test('Write 1 state file in S3 when event.reRunJob=true', async () => {
    lambdaMock.on(ListTagsCommand).resolves({ Tags: {} });
    await EMRServerlessUtil.start({
      startTimestamp: new Date(startTimestamp).getTime(),
      reRunJob: true,
    }, context);
    expect(putStringToS3Mock.mock.calls.length).toEqual(1);
    expect(putStringToS3Mock.mock.calls[0][2]).toEqual('pipeline-prefix/job-info/test_proj_001/job-jobId007.json');
  });

});


describe('Data Process -- EMR Serverless job submitter function rule files do not exist', () => {

  const context = getMockContext();
  const lambdaMock = mockClient(LambdaClient);
  const isObjectExistFalseMock = jest.fn(() => false);
  beforeEach(() => {
    lambdaMock.reset();
    mockS3Functions.isObjectExist = isObjectExistFalseMock;
  });

  test('start data processing job1', async () => {
    lambdaMock.on(ListTagsCommand).resolves({ Tags: {} });
    const jobInfo = await EMRServerlessUtil.start({
      startTimestamp,
      endTimestamp,
    }, context);
    expect(emrMock.StartJobRunCommand.mock.calls.length).toEqual(1);
    expect(jobInfo).toEqual({
      jobRunId: 'jobId007',
      objectsInfo: {
        objectCount: 4,
        sizeTotal: 43008,
      },
    });
    expect(isObjectExistFalseMock.mock.calls.length).toEqual(4);
    expect(putStringToS3Mock.mock.calls[0][0]).toContain('b.hatena.ne.jp');
    expect(putStringToS3Mock.mock.calls[0][1]).toEqual('test_config_bucket');
    expect(putStringToS3Mock.mock.calls[0][2]).toEqual('test_proj_001/rules/app1/traffic_source_category_rule_v1.json');

    expect(putStringToS3Mock.mock.calls[1][0]).toContain('__empty__');
    expect(putStringToS3Mock.mock.calls[1][2]).toEqual('test_proj_001/rules/app1/traffic_source_channel_rule_v1.json');

    expect(putStringToS3Mock.mock.calls[2][2]).toEqual('test_proj_001/rules/app2/traffic_source_category_rule_v1.json');
    expect(putStringToS3Mock.mock.calls[3][2]).toEqual('test_proj_001/rules/app2/traffic_source_channel_rule_v1.json');

  });
});

