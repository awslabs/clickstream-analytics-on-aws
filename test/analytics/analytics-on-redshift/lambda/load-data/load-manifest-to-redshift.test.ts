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

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ExecuteStatementCommand, ExecuteStatementCommandInput, RedshiftDataClient } from '@aws-sdk/client-redshift-data';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';

const addMetricMock = jest.fn(() => {});
const publishStoredMetricsMock = jest.fn(() => {});
const MetricsMock = jest.fn(() => {
  return {
    addMetric: addMetricMock,
    addDimensions: jest.fn(()=>{}),
    publishStoredMetrics: publishStoredMetricsMock,
  };
});

jest.mock('@aws-lambda-powertools/metrics', () => {
  return {
    Metrics: MetricsMock,
    MetricUnits: {
      Count: 'Count',
      Seconds: 'Seconds',
    },
  };
});

import { handler, LoadManifestEvent } from '../../../../../src/analytics/lambdas/load-data-workflow/load-manifest-to-redshift';
import { AnalyticsCustomMetricsName, MetricsNamespace, MetricsService, REDSHIFT_MODE } from '../../../../../src/common/model';
import { getMockContext } from '../../../../common/lambda-context';
import 'aws-sdk-client-mock-jest';

//@ts-ignore
expect(MetricsMock.mock.calls[0][0]).toEqual(
  {
    namespace: MetricsNamespace.REDSHIFT_ANALYTICS,
    serviceName: MetricsService.WORKFLOW,
  });


const loadManifestEvent: LoadManifestEvent = {
  detail: {
    execution_id: 'arn:aws:states:us-east-2:xxxxxxxxxxxx:execution:LoadManifestStateMachineAE0969CA-v2ur6ASaxNOQ:12ec840c-6282-4d53-475d-6db473e539c3_70bfb836-c7d5-7cab-75b0-5222e78194ac',
    appId: 'app1',
    jobList: {
      entries:
      [{
        url: 's3://DOC-EXAMPLE-BUCKET/project1/ods_external_events/partition_app=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000.parquet.snappy',
        meta: {
          content_length: 10324001,
        },
      }],
    },
    manifestFileName: 's3://DOC-EXAMPLE-BUCKET/manifest/app150be34be-fdec-4b45-8b14-63c38f910a56.manifest',
    retryCount: 0,
  },
  odsTableName: 'test_me_table',
};

const loadManifestEvent2: LoadManifestEvent = {
  detail: {
    execution_id: 'arn:aws:states:us-east-2:xxxxxxxxxxxx:execution:LoadManifestStateMachineAE0969CA-v2ur6ASaxNOQ:12ec840c-6282-4d53-475d-6db473e539c3_70bfb836-c7d5-7cab-75b0-5222e78194ac',
    appId: 'app2',
    jobList: {
      entries:
      [{
        url: 's3://DOC-EXAMPLE-BUCKET/project1/ods_external_events/partition_app=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000-2.parquet.snappy',
        meta: {
          content_length: 10324001,
        },
      }],
    },
    manifestFileName: 's3://DOC-EXAMPLE-BUCKET/manifest/app150be34be-fdec-4b45-8b14-63c38f910a56-2.manifest',
    retryCount: 3,
  },
  odsTableName: 'test_me_table',
};
const context = getMockContext();

describe('Lambda - do loading manifest to Redshift Serverless via COPY command', () => {

  const redshiftDataMock = mockClient(RedshiftDataClient);
  const dynamoDBClientMock = mockClient(DynamoDBClient);

  const workGroupName = 'demo';

  beforeEach(() => {
    redshiftDataMock.reset();
    dynamoDBClientMock.reset();
    MetricsMock.mockReset();

    // set the env before loading the source
    process.env.REDSHIFT_MODE = REDSHIFT_MODE.SERVERLESS;
    process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME = workGroupName;
  });

  test('Executed Redshift copy command', async () => {
    const executeId = 'Id-1';
    dynamoDBClientMock.on(UpdateCommand).resolvesOnce({});
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: executeId });

    const resp = await handler(loadManifestEvent, context);
    expect(resp).toEqual({
      detail: expect.objectContaining({
        id: executeId,
        retryCount: 0,
      }),
      odsTableName: 'test_me_table',
    });
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
    expect(redshiftDataMock).toHaveReceivedCommandWith(ExecuteStatementCommand, {
      WorkgroupName: workGroupName,
    });
    expect(addMetricMock).toBeCalledTimes(1);
    expect(addMetricMock.mock.calls).toEqual([
      [AnalyticsCustomMetricsName.FILE_LOADED, 'Count', 1],
    ]);
    expect(publishStoredMetricsMock).toBeCalledTimes(1);
  });


  test('retryCount should be passed through', async () => {
    const executeId = 'Id-1';
    dynamoDBClientMock.on(UpdateCommand).resolvesOnce({});
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: executeId });

    const resp = await handler(loadManifestEvent2, context);
    expect(resp).toEqual({
      detail: expect.objectContaining({
        id: executeId,
        retryCount: 3,
        appId: 'app2',
        jobList: {
          entries:
          [{
            url: 's3://DOC-EXAMPLE-BUCKET/project1/ods_external_events/partition_app=app1/partition_year=2023/partition_month=01/partition_day=15/clickstream-1-job_part00000-2.parquet.snappy',
            meta: {
              content_length: 10324001,
            },
          }],
        },
        manifestFileName: 's3://DOC-EXAMPLE-BUCKET/manifest/app150be34be-fdec-4b45-8b14-63c38f910a56-2.manifest',
      }),
      odsTableName: 'test_me_table',
    });
  });

  test('Update DDB error when doing load Redshift', async () => {
    dynamoDBClientMock.on(UpdateCommand).rejectsOnce();
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: 'Id-1' });

    try {
      await handler(loadManifestEvent, context);
      fail('The error of DDB update was caught');
    } catch (error) {
      expect(dynamoDBClientMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
      expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 0);
      expect(addMetricMock).toBeCalledTimes(0);
    }
  });

  // TODO: redesign the error handling
  test('Execute command error in Redshift when doing load Redshift', async () => {
    dynamoDBClientMock.on(UpdateCommand).resolvesOnce({});
    redshiftDataMock.on(ExecuteStatementCommand).rejectsOnce();

    try {
      await handler(loadManifestEvent, context);
      fail('The error in executing statement of Redshift data was caught');
    } catch (error) {
      expect(dynamoDBClientMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
      expect(redshiftDataMock).toHaveReceivedCommandWith(ExecuteStatementCommand, {
        WorkgroupName: workGroupName,
      });
      expect(addMetricMock).toBeCalledTimes(0);
    }
  });

});

describe('Lambda - do loading manifest to Provisioned Redshift via COPY command', () => {
  const redshiftDataMock = mockClient(RedshiftDataClient);
  const dynamoDBClientMock = mockClient(DynamoDBClient);

  const clusterIdentifier = 'cluster-1';
  const dbUser = 'aUser';

  beforeEach(() => {
    redshiftDataMock.reset();
    dynamoDBClientMock.reset();
    addMetricMock.mockReset();

    // set the env before loading the source
    process.env.REDSHIFT_MODE = REDSHIFT_MODE.PROVISIONED;
    process.env.REDSHIFT_CLUSTER_IDENTIFIER = clusterIdentifier;
    process.env.REDSHIFT_DB_USER = dbUser;
  });

  test('Executed Redshift copy command', async () => {
    const executeId = 'Id-1';
    dynamoDBClientMock.on(UpdateCommand).resolvesOnce({});
    redshiftDataMock.on(ExecuteStatementCommand).callsFakeOnce(input => {
      if (input as ExecuteStatementCommandInput) {
        if (input.Sql.includes(`COPY app1.${loadManifestEvent.odsTableName} FROM `)) {return { Id: executeId };}
      }
      throw new Error(`Sql '${input.Sql}' is not expected.`);
    },
    );

    const resp = await handler(loadManifestEvent, context);
    expect(resp).toEqual({
      detail: expect.objectContaining({
        id: executeId,
        retryCount: 0,
      }),
      odsTableName: 'test_me_table',
    });
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
    expect(redshiftDataMock).toHaveReceivedCommandWith(ExecuteStatementCommand, {
      ClusterIdentifier: clusterIdentifier,
      DbUser: dbUser,
    });
    expect(addMetricMock).toBeCalledTimes(1);
  });
});