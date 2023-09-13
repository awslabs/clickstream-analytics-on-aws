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

import { readFileSync } from 'fs';
import { LambdaClient, ListTagsCommand } from '@aws-sdk/client-lambda';
import { DescribeStatementCommand, BatchExecuteStatementCommand, ExecuteStatementCommand, RedshiftDataClient, BatchExecuteStatementCommandInput, ExecuteStatementCommandInput } from '@aws-sdk/client-redshift-data';
import { CdkCustomResourceCallback, CdkCustomResourceEvent, CdkCustomResourceResponse } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import mockfs from 'mock-fs';
import { ProvisionedRedshiftProps, SQLDef } from '../../../../src/analytics/private/model';
import { ResourcePropertiesType, handler } from '../../../../src/streaming-ingestion/lambdas/custom-resource/create-schemas';
import { reportingViewsDef, schemaDefs } from '../../../../src/streaming-ingestion/redshift/sql-def';
import 'aws-sdk-client-mock-jest';
import { getMockContext } from '../../../common/lambda-context';
import { basicCloudFormationEvent } from '../../../common/lambda-events';

describe('Custom resource - Create schemas for applications in Redshift database', () => {

  const context = getMockContext();
  const callback: CdkCustomResourceCallback = async (_response) => {};

  const redshiftDataMock = mockClient(RedshiftDataClient);
  const lambdaMock = mockClient(LambdaClient);

  const projectDBName = 'clickstream_project1';
  const roleName = 'MyRedshiftDBUserRole';
  const basicEvent = {
    ...basicCloudFormationEvent,
    ResourceProperties: {
      ...basicCloudFormationEvent.ResourceProperties,
      ServiceToken: 'token-1',
      projectId: 'project1',
      stackShortId: 'abcde',
      databaseName: projectDBName,
      dataAPIRole: `arn:aws:iam::1234567890:role/${roleName}`,
      reportingViewsDef,
      schemaDefs,
    },
  };

  const workgroupName = 'demo';
  const defaultDBName = 'defaultDB';
  const createKdsSchemaPropsInServerless: ResourcePropertiesType = {
    ...basicEvent.ResourceProperties,
    appIds: 'app1',
    dataAPIRole: 'arn:aws:iam::1234567890:role/RedshiftDBUserRole',
    serverlessRedshiftProps: {
      workgroupName: workgroupName,
      databaseName: defaultDBName,
      dataAPIRoleArn: 'arn:aws:iam::1234567890:role/RedshiftDBUserRole',
    },
    streamingIngestionProps: {
      streamingIngestionRoleArn: 'arn:aws:iam::1234567890:role/StreamingIngestionRole',
    },
  };

  const createServerlessEvent = {
    ...basicEvent,
    ResourceProperties: createKdsSchemaPropsInServerless,
  };

  const updateServerlessEvent: CdkCustomResourceEvent = {
    ...createServerlessEvent,
    OldResourceProperties: {
      ...createServerlessEvent.ResourceProperties,
      appIds: '',
    },
    ResourceProperties: {
      ...createServerlessEvent.ResourceProperties,
      appIds: 'app2',
    },
    PhysicalResourceId: '',
    RequestType: 'Update',
  };

  const updateServerlessEvent2: CdkCustomResourceEvent = {
    ...createServerlessEvent,
    OldResourceProperties: {
      ...createServerlessEvent.ResourceProperties,
      appIds: 'app1',
    },
    ResourceProperties: {
      ...createServerlessEvent.ResourceProperties,
      appIds: 'app2',
    },
    PhysicalResourceId: '',
    RequestType: 'Update',
  };


  const testReportingViewsDef: SQLDef[] = [

  ];

  const testReportingViewsDef2: SQLDef[] = testReportingViewsDef.slice();

  const testSchemaDefs: SQLDef[] = [
    {
      sqlFile: 'ods-events-streaming-mv.sql',
    },
    {
      sqlFile: 'ods-events-streaming-view.sql',
    },

  ];

  const testSchemaDefs2: SQLDef[] = [
    {
      sqlFile: 'ods-events-streaming-mv.sql',
    },
    {
      multipleLine: 'true',
      sqlFile: 'ods-events-streaming-view.sql',
    },
  ];

  const clusterId = 'redshift-cluster-1';
  const dbUser = 'aDBUser';
  const provisionedRedshiftProps: ProvisionedRedshiftProps = {
    clusterIdentifier: clusterId,
    dbUser: dbUser,
    databaseName: defaultDBName,
  };
  const createProvisionedEvent = {
    ...basicEvent,
    ResourceProperties: {
      ...basicEvent.ResourceProperties,
      appIds: 'app1',
      provisionedRedshiftProps,
      streamingIngestionProps: {
        streamingIngestionRoleArn: 'arn:aws:iam::1234567890:role/StreamingIngestionRole',
      },
    },
  };

  const updateAdditionalProvisionedEvent: CdkCustomResourceEvent = {
    ...createProvisionedEvent,
    OldResourceProperties: createProvisionedEvent.ResourceProperties,
    ResourceProperties: {
      ...basicEvent.ResourceProperties,
      provisionedRedshiftProps,
      streamingIngestionProps: {
        streamingIngestionRoleArn: 'arn:aws:iam::1234567890:role/StreamingIngestionRole',
        kinesisDataStreamProps: {
          kinesisDataStreamNames: 'stream1,stream2',
        },
      },
      appIds: 'app1,app2',
    },
    PhysicalResourceId: 'physical-resource-id',
    RequestType: 'Update',
  };

  const updateAdditionalProvisionedEvent2: CdkCustomResourceEvent = {
    ...createProvisionedEvent,
    OldResourceProperties: {
      ...createProvisionedEvent.ResourceProperties,
      reportingViewsDef: testReportingViewsDef,
      schemaDefs: testSchemaDefs,
      appIds: 'app1',
    },
    ResourceProperties: {
      ...createProvisionedEvent.ResourceProperties,
      appIds: 'app1,app2',
      reportingViewsDef: testReportingViewsDef2,
      schemaDefs: testSchemaDefs,
      streamingIngestionProps: {
        streamingIngestionRoleArn: 'arn:aws:iam::1234567890:role/StreamingIngestionRole',
        kinesisDataStreamProps: {
          kinesisDataStreamNames: 'stream1,stream2',
        },
      },
    },
    PhysicalResourceId: 'physical-resource-id',
    RequestType: 'Update',
  };

  const updateAdditionalProvisionedEvent3: CdkCustomResourceEvent = {
    ...createProvisionedEvent,
    OldResourceProperties: {
      ...createProvisionedEvent.ResourceProperties,
      reportingViewsDef: testReportingViewsDef,
      schemaDefs: testSchemaDefs2,
      appIds: 'app1',
    },
    ResourceProperties: {
      ...createProvisionedEvent.ResourceProperties,
      appIds: 'app1,app2',
      reportingViewsDef: testReportingViewsDef2,
      schemaDefs: testSchemaDefs2,
      streamingIngestionProps: {
        streamingIngestionRoleArn: 'arn:aws:iam::1234567890:role/StreamingIngestionRole',
        kinesisDataStreamProps: {
          kinesisDataStreamNames: 'stream1,stream2',
        },
      },
    },
    PhysicalResourceId: 'physical-resource-id',
    RequestType: 'Update',
  };

  beforeEach(async () => {
    redshiftDataMock.reset();
    const rootPath = __dirname+'/../../../../src/streaming-ingestion/redshift/sqls/';
    mockfs({
      '/opt/ods-events-streaming-mv.sql': testSqlContent(rootPath + 'ods-events-streaming-mv.sql'),
      '/opt/ods-events-streaming-view.sql': testSqlContent(rootPath + 'ods-events-streaming-view.sql'),
    });
  });

  afterEach(mockfs.restore);

  test('Only invoked if no application is given', async () => {
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });
    const eventWithoutApp = {
      ...createServerlessEvent,
      ResourceProperties: {
        ...createServerlessEvent.ResourceProperties,
        appIds: '',
      },
    };
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(eventWithoutApp, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 1);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 1);
  });

  test('Created kds schemas and views in Redshift serverless', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).callsFake(input => {
      if (input as ExecuteStatementCommandInput) {
        if (input.Sql.includes('CREATE EXTERNAL SCHEMA IF NOT EXISTS kds FROM KINESIS IAM_ROLE')) {
          return { Id: 'Id-1' };
        } else if (input.Sql.includes('CREATE MATERIALIZED VIEW app1.clickstream_ods_events_streaming_mv')) {
          return { Id: 'Id-2' };
        } else if (input.Sql.includes('CREATE OR REPLACE VIEW app1.clickstream_ods_events_streaming_view')) {
          return { Id: 'Id-3' };
        }
      }
      throw new Error(`Sqls '${input}' are not expected`);
    });
    // redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(createServerlessEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 3);
  });

  test('Created schemas and views in Redshift serverless - check status multiple times to wait with failure', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(BatchExecuteStatementCommand).resolves({ Id: 'Id-2' });
    redshiftDataMock.on(DescribeStatementCommand)
      .resolvesOnce({ Status: 'STARTED' }) // create schemas
      .resolvesOnce({ Status: 'FAILED' }); // for second describe call while creating schema
    try {
      await handler(createServerlessEvent, context, callback);
    } catch (e) {
      expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 1);
      return;
    }
    fail('No exception happened when Redshift DescribeStatementCommand returns FAILED');
  });

  test('Data api exception in Redshift serverless', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).callsFakeOnce(input => {
      throw new Error('Data api exception for '+input);
    }).resolves({ Id: 'Id-2' });
    try {
      await handler(createServerlessEvent, context, callback);
    } catch (e) {
      expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 1);
      return;
    }
    fail('No exception happened when Redshift ExecuteStatementCommand failed');
  });

  test('Created schemas and views in Redshift provisioned cluster', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-2' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(createProvisionedEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 3);
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, ExecuteStatementCommand, {
      WorkgroupName: undefined,
      Database: projectDBName,
      ClusterIdentifier: clusterId,
      DbUser: dbUser,
    });
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 3);
  });

  test('Data api exception in Redshift provisioned cluster', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).rejects();
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    try {
      await handler(createProvisionedEvent, context, callback);
    } catch (e) {
      expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 1);
      expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 0);
      return;
    }
    fail('No exception happened when Redshift ExecuteStatementCommand failed');
  });

  test('Updated schemas and views only in Redshift serverless in update stack', async () => {
    redshiftDataMock.on(BatchExecuteStatementCommand).callsFakeOnce(input => {
      if (input as BatchExecuteStatementCommandInput) {
        if (input.Sqls.length >= 2 && input.Sqls[0].includes('CREATE EXTERNAL SCHEMA IF NOT EXISTS kds FROM KINESIS IAM_ROLE')
        && input.Sqls[1].includes('CREATE MATERIALIZED VIEW app2.clickstream_ods_events_streaming_mv')) {
          return { Id: 'Id-1' };
        }
      }
      throw new Error('Sqls are not expected');
    }).resolves({ Id: 'Id-2' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(updateServerlessEvent2, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 1);
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, BatchExecuteStatementCommand, {
      WorkgroupName: workgroupName,
      Database: projectDBName,
      ClusterIdentifier: undefined,
      DbUser: undefined,
    });
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 1);
  });

  test('Updated schemas and views only in Redshift serverless in update stack from empty appIds', async () => {
    redshiftDataMock.on(BatchExecuteStatementCommand).callsFakeOnce(input => {
      if (input as BatchExecuteStatementCommandInput) {
        console.log('empty appIds:'+input.Sqls);
        if (input.Sqls.length >= 3 && input.Sqls[0].includes('CREATE EXTERNAL SCHEMA IF NOT EXISTS kds FROM KINESIS IAM_ROLE')
        && input.Sqls[1].includes('CREATE MATERIALIZED VIEW app2.clickstream_ods_events_streaming_mv')
        && input.Sqls[2].includes('CREATE OR REPLACE VIEW app2.clickstream_ods_events_streaming_view')) {
          return { Id: 'Id-1' };
        }
      }
      throw new Error('Sqls are not expected');
    }).resolves({ Id: 'Id-2' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(updateServerlessEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 1);
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, BatchExecuteStatementCommand, {
      WorkgroupName: workgroupName,
      Database: projectDBName,
      ClusterIdentifier: undefined,
      DbUser: undefined,
    });
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 1);
  });

  test('Updated schemas and views in Redshift provisioned cluster', async () => {
    redshiftDataMock
      .callsFakeOnce(input => {
        console.log(`Sql is ${JSON.stringify(input.Sqls)}`);
        if (input as BatchExecuteStatementCommandInput) {
          if (input.Sqls.length >= 2 && input.Sqls[0].includes('CREATE EXTERNAL SCHEMA IF NOT EXISTS kds FROM KINESIS IAM_ROLE')
          && input.Sqls[1].includes('CREATE MATERIALIZED VIEW app2.clickstream_ods_events_streaming_mv')) {
            return { Id: 'Id-1' };
          }
        }
        throw new Error('Sqls are not expected');
      }).resolves({ Id: 'Id-2' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(updateAdditionalProvisionedEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 1);
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, BatchExecuteStatementCommand, {
      WorkgroupName: undefined,
      Database: projectDBName,
      ClusterIdentifier: clusterId,
      DbUser: dbUser,
    });
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 1);
  });

  console.log(updateServerlessEvent +''+ updateServerlessEvent2 + updateAdditionalProvisionedEvent);
  test('Updated schemas and views in Redshift provisioned cluster with updatable/new added view/schema table', async () => {
    redshiftDataMock
      .callsFakeOnce(input => {
        // console.log(`##1##Sql is ${JSON.stringify(input.Sqls)}`);
        if (input as BatchExecuteStatementCommandInput) {
          if (input.Sqls.length >= 2 && input.Sqls[0].includes('CREATE EXTERNAL SCHEMA IF NOT EXISTS kds FROM KINESIS IAM_ROLE')
            && input.Sqls[1].includes('CREATE MATERIALIZED VIEW app2.clickstream_ods_events_streaming_mv')
            && input.Sqls[2].includes('CREATE OR REPLACE VIEW app2.clickstream_ods_events_streaming_view')
          ) {
            return { Id: 'Id-1' };
          }
        }
        throw new Error('##1##Sql are not expected');
      })
      .callsFake(input => {
        console.log(`##2##Sql is ${JSON.stringify(input.Sqls)}`);
        if (input as BatchExecuteStatementCommandInput) {
          if (input.Sqls.length >= 2 && input.Sqls[13].includes('CREATE MATERIALIZED VIEW app1.clickstream_ods_events_view')
            && input.Sqls[14].includes('CREATE OR REPLACE VIEW app1.clickstream_ods_events_rt_view')
          ) {
            return { Id: 'Id-2' };
          }
        }
        throw new Error('##2##Sql are not expected');
      });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(updateAdditionalProvisionedEvent2, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 1);
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, BatchExecuteStatementCommand, {
      WorkgroupName: undefined,
      Database: projectDBName,
      ClusterIdentifier: clusterId,
      DbUser: dbUser,
    });
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 1);
  });

  test('Updated schemas mutipleline=true and views in Redshift provisioned cluster with updatable/new added view/schema table', async () => {
    redshiftDataMock
      .callsFakeOnce(input => {
        // console.log(`##1##Sql is ${JSON.stringify(input.Sqls)}`);
        if (input as BatchExecuteStatementCommandInput) {
          if (input.Sqls.length >= 2 && input.Sqls[0].includes('CREATE EXTERNAL SCHEMA IF NOT EXISTS kds FROM KINESIS IAM_ROLE')
            && input.Sqls[1].includes('CREATE MATERIALIZED VIEW app2.clickstream_ods_events_streaming_mv')
            && input.Sqls[2].includes('CREATE OR REPLACE VIEW app2.clickstream_ods_events_streaming_view')
          ) {
            return { Id: 'Id-1' };
          }
        }
        throw new Error('##1##Sql are not expected');
      })
      .callsFake(input => {
        console.log(`##2##Sql is ${JSON.stringify(input.Sqls)}`);
        if (input as BatchExecuteStatementCommandInput) {
          if (input.Sqls.length >= 2 && input.Sqls[13].includes('CREATE MATERIALIZED VIEW app1.clickstream_ods_events_view')
            && input.Sqls[14].includes('CREATE OR REPLACE VIEW app1.clickstream_ods_events_rt_view')
          ) {
            return { Id: 'Id-2' };
          }
        }
        throw new Error('##2##Sql are not expected');
      });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(updateAdditionalProvisionedEvent3, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 1);
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, BatchExecuteStatementCommand, {
      WorkgroupName: undefined,
      Database: projectDBName,
      ClusterIdentifier: clusterId,
      DbUser: dbUser,
    });
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 1);
  });

  test('No valid Redshift cluster is specified', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });

    const invalidEvent = {
      ...basicEvent,
      ResourceProperties: {
        ...basicEvent.ResourceProperties,
        appIds: 'app1',
      },
    };
    try {
      await handler(invalidEvent, context, callback);
    } catch (e) {
      expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 0);
      expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 0);
      return;
    }
    fail('No exception happened when Redshift ExecuteStatementCommand failed');
  });

  test('Do nothing when deleting the stack', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    const deleteEvent: CdkCustomResourceEvent = {
      ...createServerlessEvent,
      PhysicalResourceId: 'id',
      RequestType: 'Delete',
    };
    const resp = await handler(deleteEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 1);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 1);
  });


});

const testSqlContent = (filePath: string) => {
  const sqlTemplate = readFileSync(filePath, 'utf8');
  return sqlTemplate;
};
