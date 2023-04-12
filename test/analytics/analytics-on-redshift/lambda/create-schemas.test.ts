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
import { DescribeStatementCommand, BatchExecuteStatementCommand, BatchExecuteStatementCommandInput, ExecuteStatementCommand, RedshiftDataClient } from '@aws-sdk/client-redshift-data';
import { CdkCustomResourceEvent, CdkCustomResourceCallback, CdkCustomResourceResponse } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { getMockContext } from './context';
import { basicCloudFormationEvent } from './event';
import { handler } from '../../../../src/analytics/lambdas/custom-resource/create-schemas';
import 'aws-sdk-client-mock-jest';
import { ServerlessRedshiftProps, ProvisionedRedshiftProps } from '../../../../src/analytics/private/model';
import { TABLE_NAME_ODS_EVENT } from '../../../../src/common/constant';

describe('Custom resource - Create schemas for applications in Redshift database', () => {

  const context = getMockContext();
  const callback: CdkCustomResourceCallback = async (_response) => {};

  const redshiftDataMock = mockClient(RedshiftDataClient);

  const projectDBName = 'clickstream_project1';
  const roleName = 'MyRedshiftDBUserRole';
  const basicEvent = {
    ...basicCloudFormationEvent,
    ResourceProperties: {
      ...basicCloudFormationEvent.ResourceProperties,
      projectId: 'project1',
      odsTableName: 'ods_events',
      databaseName: projectDBName,
      dataAPIRole: `arn:aws:iam::1234567890:role/${roleName}`,
    },
  };

  const workgroupName = 'demo';
  const defaultDBName = 'defaultDB';
  const serverlessRedshiftProps: ServerlessRedshiftProps = {
    workgroupName: workgroupName,
    databaseName: defaultDBName,
    dataAPIRoleArn: 'arn:aws:iam::1234567890:role/RedshiftDBUserRole',
  };
  const createServerlessEvent = {
    ...basicEvent,
    ResourceProperties: {
      ...basicEvent.ResourceProperties,
      appIds: 'app1',
      serverlessRedshiftProps,
    },
  };

  const updateServerlessEvent: CdkCustomResourceEvent = {
    ...createServerlessEvent,
    OldResourceProperties: createServerlessEvent.ResourceProperties,
    ResourceProperties: {
      ...createServerlessEvent.ResourceProperties,
      appIds: 'app2',
    },
    PhysicalResourceId: 'physical-resource-id',
    RequestType: 'Update',
  };

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
    },
  };

  const updateAdditionalProvisionedEvent: CdkCustomResourceEvent = {
    ...createProvisionedEvent,
    OldResourceProperties: createProvisionedEvent.ResourceProperties,
    ResourceProperties: {
      ...createProvisionedEvent.ResourceProperties,
      appIds: 'app1,app2',
    },
    PhysicalResourceId: 'physical-resource-id',
    RequestType: 'Update',
  };

  beforeEach(() => {
    redshiftDataMock.reset();
  });

  test('Only creating database statement is invoked if no application is given', async () => {
    const eventWithoutApp = {
      ...createServerlessEvent,
      ResourceProperties: {
        ...createServerlessEvent.ResourceProperties,
        appIds: '',
      },
    };
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: 'Id-1' });
    redshiftDataMock.on(BatchExecuteStatementCommand).resolvesOnce({ Id: 'Id-2' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(eventWithoutApp, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 1);
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, ExecuteStatementCommand, {
      Sql: `CREATE DATABASE ${projectDBName};`,
      WorkgroupName: workgroupName,
      Database: defaultDBName,
      ClusterIdentifier: undefined,
      DbUser: undefined,
    });
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 1);
  });

  test('Created database and schemas in Redshift serverless', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: 'Id-1' });
    redshiftDataMock.on(BatchExecuteStatementCommand).callsFakeOnce(input => {
      if (input as BatchExecuteStatementCommandInput) {
        if (input.Sqls.length == 2 && input.Sqls[0].includes('CREATE SCHEMA IF NOT EXISTS app1')
        && input.Sqls[1].includes(`CREATE TABLE IF NOT EXISTS app1.${TABLE_NAME_ODS_EVENT}(`)) {
          return { Id: 'Id-1' };
        }
      }
      throw new Error(`Sqls '${input.Sqls}' are not expected`);
    });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(createServerlessEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 1);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 1);
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, ExecuteStatementCommand, {
      Sql: `CREATE DATABASE ${projectDBName};`,
      WorkgroupName: workgroupName,
      Database: defaultDBName,
      ClusterIdentifier: undefined,
      DbUser: undefined,
    });
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, BatchExecuteStatementCommand, {
      WorkgroupName: workgroupName,
      Database: projectDBName,
      ClusterIdentifier: undefined,
      DbUser: undefined,
    });
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 2);
  });

  test('Created database and schemas in Redshift serverless - check status multiple times to wait success', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: 'Id-1' });
    redshiftDataMock.on(BatchExecuteStatementCommand).resolvesOnce({ Id: 'Id-2' });
    redshiftDataMock.on(DescribeStatementCommand)
      .resolvesOnce({ Status: 'FINISHED' }).resolvesOnce({ Status: 'STARTED' })
      .resolvesOnce({ Status: 'FINISHED' }); // for second describe call while creating schema
    const resp = await handler(createServerlessEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 1);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 1);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 3);
  });

  test('Created database and schemas in Redshift serverless - check status multiple times to wait with failure', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: 'Id-1' });
    redshiftDataMock.on(BatchExecuteStatementCommand).resolvesOnce({ Id: 'Id-2' });
    redshiftDataMock.on(DescribeStatementCommand)
      .resolvesOnce({ Status: 'FINISHED' }).resolvesOnce({ Status: 'STARTED' })
      .resolvesOnce({ Status: 'FAILED' }); // for second describe call while creating schema
    try {
      await handler(createServerlessEvent, context, callback);
    } catch (e) {
      expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 1);
      expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 1);
      expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 3);
      return;
    }
    fail('No exception happened when Redshift DescribeStatementCommand returns FAILED');
  });

  test('Created schemas only in Redshift serverless in update stack', async () => {
    redshiftDataMock.on(BatchExecuteStatementCommand).callsFakeOnce(input => {
      if (input as BatchExecuteStatementCommandInput) {
        if (input.Sqls.length == 2 && input.Sqls[0].includes('CREATE SCHEMA IF NOT EXISTS app2')
        && input.Sqls[1].includes(`CREATE TABLE IF NOT EXISTS app2.${TABLE_NAME_ODS_EVENT}(`)) {
          return { Id: 'Id-1' };
        }
      }
      throw new Error('Sqls are not expected');
    });
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({ Status: 'FINISHED' });
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

  test('Do nothing when deleting the stack', async () => {
    const deleteEvent: CdkCustomResourceEvent = {
      ...createServerlessEvent,
      PhysicalResourceId: 'id',
      RequestType: 'Delete',
    };
    const resp = await handler(deleteEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 0);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 0);
  });

  test('Data api exception in Redshift serverless', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: 'Id-1' });
    redshiftDataMock.on(BatchExecuteStatementCommand).rejects();
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    try {
      await handler(createServerlessEvent, context, callback);
    } catch (e) {
      expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 1);
      expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 1);
      expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 1);
      return;
    }
    fail('No exception happened when Redshift ExecuteStatementCommand failed');
  });

  test('Created database and schemas in Redshift provisioned cluster', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: 'Id-1' });
    redshiftDataMock.on(BatchExecuteStatementCommand).resolvesOnce({ Id: 'Id-2' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(createProvisionedEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 1);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 1);
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, ExecuteStatementCommand, {
      Sql: `CREATE DATABASE ${projectDBName};`,
      WorkgroupName: undefined,
      Database: defaultDBName,
      ClusterIdentifier: clusterId,
      DbUser: dbUser,
    });
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, BatchExecuteStatementCommand, {
      WorkgroupName: undefined,
      Database: projectDBName,
      ClusterIdentifier: clusterId,
      DbUser: dbUser,
    });
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 2);
  });

  test('Updated schemas in Redshift provisioned cluster', async () => {
    redshiftDataMock
      .callsFake(input => {
        if (input as BatchExecuteStatementCommandInput) {
          if (input.Sqls.length == 4 && input.Sqls[0].includes('CREATE SCHEMA IF NOT EXISTS app1')
          && input.Sqls[1].includes(`CREATE TABLE IF NOT EXISTS app1.${TABLE_NAME_ODS_EVENT}(`)
          && input.Sqls[2].includes('CREATE SCHEMA IF NOT EXISTS app2')) {
            return { Id: 'Id-1' };
          }
        }
        throw new Error('Sqls are not expected');
      });
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

  test('Data api exception in Redshift provisioned cluster', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: 'Id-1' });
    redshiftDataMock.on(BatchExecuteStatementCommand).rejects();
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    try {
      await handler(createProvisionedEvent, context, callback);
    } catch (e) {
      expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 1);
      expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 1);
      expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 1);
      return;
    }
    fail('No exception happened when Redshift ExecuteStatementCommand failed');
  });

  test('No valid Redshift cluster is specified', async () => {
    redshiftDataMock.on(BatchExecuteStatementCommand).resolves({ Id: 'Id-1' });
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
      expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 0);
      expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 0);
      return;
    }
    fail('No exception happened when Redshift ExecuteStatementCommand failed');
  });
});
