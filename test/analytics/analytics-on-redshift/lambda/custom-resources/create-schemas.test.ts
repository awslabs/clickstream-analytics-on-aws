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
import { DescribeStatementCommand, BatchExecuteStatementCommand, BatchExecuteStatementCommandInput, ExecuteStatementCommand, RedshiftDataClient, ExecuteStatementCommandInput } from '@aws-sdk/client-redshift-data';
import { CreateSecretCommand, DescribeSecretCommand, ResourceNotFoundException, SecretsManagerClient, UpdateSecretCommand } from '@aws-sdk/client-secrets-manager';
import { CdkCustomResourceEvent, CdkCustomResourceCallback, CdkCustomResourceResponse } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import mockfs from 'mock-fs';
import { ResourcePropertiesType, handler, physicalIdPrefix } from '../../../../../src/analytics/lambdas/custom-resource/create-schemas';
import 'aws-sdk-client-mock-jest';
import { ProvisionedRedshiftProps, SQLDef } from '../../../../../src/analytics/private/model';
import { reportingViewsDef, schemaDefs } from '../../../../../src/analytics/private/sql-def';
import { TABLE_NAME_ODS_EVENT } from '../../../../../src/common/constant';
import { getMockContext } from '../../../../common/lambda-context';
import { basicCloudFormationEvent } from '../../../../common/lambda-events';

describe('Custom resource - Create schemas for applications in Redshift database', () => {

  const context = getMockContext();
  const callback: CdkCustomResourceCallback = async (_response) => {};

  const redshiftDataMock = mockClient(RedshiftDataClient);
  const smMock = mockClient(SecretsManagerClient);
  const lambdaMock = mockClient(LambdaClient);

  const projectDBName = 'clickstream_project1';
  const roleName = 'MyRedshiftDBUserRole';
  const biUserNamePrefix = 'clickstream_report_user_';
  const basicEvent = {
    ...basicCloudFormationEvent,
    ResourceProperties: {
      ...basicCloudFormationEvent.ResourceProperties,
      ServiceToken: 'token-1',
      projectId: 'project1',
      odsTableName: 'ods_events',
      databaseName: projectDBName,
      dataAPIRole: `arn:aws:iam::1234567890:role/${roleName}`,
      redshiftBIUserParameter: '/clickstream/report/user/1111',
      redshiftBIUsernamePrefix: biUserNamePrefix,
      reportingViewsDef,
      schemaDefs,
    },
  };

  const workgroupName = 'demo';
  const defaultDBName = 'defaultDB';
  const createSchemaPropsInServerless: ResourcePropertiesType = {
    ...basicEvent.ResourceProperties,
    appIds: 'app1',
    serverlessRedshiftProps: {
      workgroupName: workgroupName,
      databaseName: defaultDBName,
      dataAPIRoleArn: 'arn:aws:iam::1234567890:role/RedshiftDBUserRole',
    },
  };
  const createServerlessEvent = {
    ...basicEvent,
    ResourceProperties: createSchemaPropsInServerless,
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
    PhysicalResourceId: `${physicalIdPrefix}abcde`,
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
    PhysicalResourceId: `${physicalIdPrefix}abcde`,
    RequestType: 'Update',
  };


  const testReportingViewsDef: SQLDef[] = [
    {
      updatable: 'true',
      sqlFile: 'clickstream-ods-events-view.sql',
    },
    {
      updatable: 'false',
      sqlFile: 'clickstream-ods-events-parameter-view.sql',
    },
    {
      updatable: 'true',
      sqlFile: 'clickstream-ods-events-rt-view.sql',
    },
    {
      updatable: 'true',
      sqlFile: 'clickstream-ods-events-parameter-rt-view.sql',
    },
    {
      updatable: 'false',
      sqlFile: 'clickstream-lifecycle-daily-view.sql',
    },
    {
      updatable: 'false',
      sqlFile: 'clickstream-lifecycle-weekly-view.sql',
    },
    {
      updatable: 'false',
      sqlFile: 'clickstream-user-dim-view.sql',
    },
    {
      updatable: 'false',
      sqlFile: 'clickstream-session-view.sql',
    },
    {
      updatable: 'false',
      sqlFile: 'clickstream-path-view.sql',
    },
    {
      updatable: 'false',
      sqlFile: 'clickstream-device-view.sql',
    },
    {
      updatable: 'false',
      sqlFile: 'clickstream-retention-view.sql',
    },
    {
      updatable: 'false',
      sqlFile: 'clickstream-user-attr-view.sql',
    },

  ];

  const testReportingViewsDef2: SQLDef[] = testReportingViewsDef.slice();
  testReportingViewsDef2.push({
    updatable: 'false',
    sqlFile: 'clickstream-ods-events-parameter-test-view.sql',
  });

  const testSchemaDefs: SQLDef[] = [
    {
      updatable: 'false',
      sqlFile: 'ods-events.sql',
    },
    {
      updatable: 'true',
      sqlFile: 'sp-clickstream-log.sql',
    },
    {
      updatable: 'true',
      sqlFile: 'grant-permissions-to-bi-user.sql',
      multipleLine: 'true',
    },
    {
      updatable: 'true',
      sqlFile: 'dim-users.sql',
    },
    {
      updatable: 'true',
      sqlFile: 'sp-upsert-users.sql',
    },
    {
      updatable: 'true',
      sqlFile: 'sp-clear-expired-events.sql',
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
    },
    PhysicalResourceId: 'physical-resource-id',
    RequestType: 'Update',
  };

  beforeEach(async () => {
    redshiftDataMock.reset();
    smMock.reset();
    const rootPath = __dirname+'/../../../../../src/analytics/private/sqls/redshift/';
    mockfs({
      '/opt/clickstream-device-view.sql': testSqlContent(rootPath + 'clickstream-device-view.sql'),
      '/opt/clickstream-path-view.sql': testSqlContent(rootPath + 'clickstream-path-view.sql'),
      '/opt/clickstream-lifecycle-daily-view.sql': testSqlContent(rootPath + 'clickstream-lifecycle-daily-view.sql'),
      '/opt/clickstream-lifecycle-weekly-view.sql': testSqlContent(rootPath + 'clickstream-lifecycle-weekly-view.sql'),
      '/opt/clickstream-ods-events-parameter-view.sql': testSqlContent(rootPath + 'clickstream-ods-events-parameter-view.sql'),
      '/opt/clickstream-ods-events-view.sql': testSqlContent(rootPath + 'clickstream-ods-events-view.sql'),
      '/opt/clickstream-ods-events-parameter-rt-view.sql': testSqlContent(rootPath + 'clickstream-ods-events-parameter-rt-view.sql'),
      '/opt/clickstream-ods-events-rt-view.sql': testSqlContent(rootPath + 'clickstream-ods-events-rt-view.sql'),
      '/opt/clickstream-retention-view.sql': testSqlContent(rootPath + 'clickstream-retention-view.sql'),
      '/opt/clickstream-session-view.sql': testSqlContent(rootPath + 'clickstream-session-view.sql'),
      '/opt/clickstream-user-dim-view.sql': testSqlContent(rootPath + 'clickstream-user-dim-view.sql'),
      '/opt/clickstream-user-attr-view.sql': testSqlContent(rootPath + 'clickstream-user-attr-view.sql'),
      '/opt/clickstream-ods-events-parameter-test-view.sql': testSqlContent(rootPath + 'clickstream-ods-events-parameter-view.sql'),
      '/opt/dim-users.sql': testSqlContent(rootPath + 'dim-users.sql'),
      '/opt/grant-permissions-to-bi-user.sql': testSqlContent(rootPath + 'grant-permissions-to-bi-user.sql'),
      '/opt/ods-events.sql': testSqlContent(rootPath + 'ods-events.sql'),
      '/opt/sp-clear-expired-events.sql': testSqlContent(rootPath + 'sp-clear-expired-events.sql'),
      '/opt/sp-clickstream-log.sql': testSqlContent(rootPath + 'sp-clickstream-log.sql'),
      '/opt/sp-upsert-users.sql': testSqlContent(rootPath + 'sp-upsert-users.sql'),
    });
  });

  afterEach(mockfs.restore);

  test('Only creating database and bi user are invoked if no application is given', async () => {
    smMock.onAnyCommand().resolves({});
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
    redshiftDataMock.on(BatchExecuteStatementCommand).resolves({ Id: 'Id-2' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(eventWithoutApp, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 2);
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, ExecuteStatementCommand, {
      Sql: `CREATE DATABASE ${projectDBName};`,
      WorkgroupName: workgroupName,
      Database: defaultDBName,
      ClusterIdentifier: undefined,
      DbUser: undefined,
    });
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 2);
  });

  test('BI user is created in creation event', async () => {
    smMock.on(CreateSecretCommand).resolves({});
    smMock.on(DescribeSecretCommand).rejects(new ResourceNotFoundException({
      message: 'ResourceNotFoundException',
      $metadata: {},
    }));
    const eventWithoutApp = {
      ...createServerlessEvent,
      ResourceProperties: {
        ...createServerlessEvent.ResourceProperties,
        appIds: '',
      },
    };
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: 'id-1' })
      .callsFake(input => {
        if (input as ExecuteStatementCommandInput) {
          if (input.Sql.includes('CREATE USER')) {
            return { Id: 'id-2' };
          }
        }
        throw new Error('Sqls are not expected');
      }).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(BatchExecuteStatementCommand).resolves({ Id: 'Id-2' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(eventWithoutApp, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(smMock).toHaveReceivedCommandTimes(CreateSecretCommand, 1);
    expect(smMock).toHaveReceivedCommandTimes(DescribeSecretCommand, 1);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 2);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 2);
  });

  test('BI user is created in creation event - secret already exist', async () => {
    smMock.on(CreateSecretCommand).resolves({});
    smMock.on(DescribeSecretCommand).resolves({
      Name: 'test-secret',
    });
    smMock.on(UpdateSecretCommand).resolves({});
    const eventWithoutApp = {
      ...createServerlessEvent,
      ResourceProperties: {
        ...createServerlessEvent.ResourceProperties,
        appIds: '',
      },
    };
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: 'id-1' })
      .callsFake(input => {
        if (input as ExecuteStatementCommandInput) {
          if (input.Sql.includes('CREATE USER')) {
            return { Id: 'id-2' };
          }
        }
        throw new Error('Sqls are not expected');
      }).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(BatchExecuteStatementCommand).resolves({ Id: 'Id-2' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(eventWithoutApp, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(smMock).toHaveReceivedCommandTimes(CreateSecretCommand, 0);
    expect(smMock).toHaveReceivedCommandTimes(UpdateSecretCommand, 1);
    expect(smMock).toHaveReceivedCommandTimes(DescribeSecretCommand, 1);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 2);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 2);
  });

  test('Created bi user with lower case characters only', async () => {
    smMock.onAnyCommand().resolves({});
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });
    const regex = new RegExp(`^CREATE USER ${biUserNamePrefix}[a-z0-9]{8} PASSWORD 'sha256|[a-zA-Z0-9!#$%^&-_=+|]{32}'$`);
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: 'Id-1' })
      .callsFakeOnce(input => {
        if (input as ExecuteStatementCommandInput && regex.test(input.Sql)) {
          return 'Id-2';
        }
        throw new Error(`Sql '${input.Sql}' are not expected, the bi user does not meet the pattern.`);
      });
    redshiftDataMock.on(BatchExecuteStatementCommand).resolves({ Id: 'Id-2' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(createServerlessEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
  });

  test('Created database, bi user, schemas and views in Redshift serverless', async () => {
    smMock.onAnyCommand().resolves({});
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(BatchExecuteStatementCommand).callsFakeOnce(input => {
      if (input as BatchExecuteStatementCommandInput) {
        if (input.Sqls.length >= 2 && input.Sqls[0].includes('CREATE SCHEMA IF NOT EXISTS app1')
        && input.Sqls[1].includes(`CREATE TABLE IF NOT EXISTS app1.${TABLE_NAME_ODS_EVENT}(`)) {
          return { Id: 'Id-1' };
        }
      }
      throw new Error(`Sqls '${input.Sqls}' are not expected`);
    }).callsFakeOnce(input => {
      if (input as BatchExecuteStatementCommandInput) {
        for (const sql of input.Sqls) {
          if (sql.includes('{{')) {
            throw new Error(`The SQL '${sql}' contains the mustache variables!`);
          }
        }
      }
      return 'Id-22';
    });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(createServerlessEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 2);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 2);
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, BatchExecuteStatementCommand, {
      Sqls: expect.arrayContaining([
        expect.stringMatching(`GRANT USAGE ON SCHEMA app1 TO ${biUserNamePrefix}\\w{8}`),
      ]),
    });
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
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 4);
  });

  test('Created database, bi user, schemas and views in Redshift serverless - check status multiple times to wait success', async () => {
    smMock.onAnyCommand().resolves({});
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(BatchExecuteStatementCommand).resolves({ Id: 'Id-2' });
    redshiftDataMock.on(DescribeStatementCommand)
      .resolvesOnce({ Status: 'FINISHED' }) // create db
      .resolvesOnce({ Status: 'FINISHED' }) // create bi user
      .resolvesOnce({ Status: 'STARTED' }) // create schemas
      .resolvesOnce({ Status: 'FINISHED' })
      .resolves({ Status: 'FINISHED' }); // create views
    const resp = await handler(createServerlessEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 2);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 2);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 5);
  });

  test('Created database, bi user, schemas and views in Redshift serverless - check status multiple times to wait with failure', async () => {
    smMock.onAnyCommand().resolves({});
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(BatchExecuteStatementCommand).resolves({ Id: 'Id-2' });
    redshiftDataMock.on(DescribeStatementCommand)
      .resolvesOnce({ Status: 'FINISHED' }) // create db
      .resolvesOnce({ Status: 'FINISHED' }) // create bi user
      .resolvesOnce({ Status: 'STARTED' }) // create schemas
      .resolvesOnce({ Status: 'FAILED' }); // for second describe call while creating schema
    try {
      await handler(createServerlessEvent, context, callback);
    } catch (e) {
      expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 2);
      expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 1);
      expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 4);
      return;
    }
    fail('No exception happened when Redshift DescribeStatementCommand returns FAILED');
  });

  test('Updated schemas and views only in Redshift serverless in update stack', async () => {
    smMock.onAnyCommand().resolves({});
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });
    redshiftDataMock.on(BatchExecuteStatementCommand).callsFakeOnce(input => {
      if (input as BatchExecuteStatementCommandInput) {
        if (input.Sqls.length >= 2 && input.Sqls[0].includes('CREATE SCHEMA IF NOT EXISTS app2')
        && input.Sqls[1].includes(`CREATE TABLE IF NOT EXISTS app2.${TABLE_NAME_ODS_EVENT}(`)) {
          return { Id: 'Id-1' };
        }
      }
      throw new Error('Sqls are not expected');
    }).resolves({ Id: 'Id-2' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(updateServerlessEvent2, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(resp.Data?.RedshiftBIUsername).toEqual(`${biUserNamePrefix}abcde`);
    expect(smMock).toHaveReceivedCommandTimes(CreateSecretCommand, 0);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 2);
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, BatchExecuteStatementCommand, {
      Sqls: expect.arrayContaining([
        `GRANT USAGE ON SCHEMA app2 TO ${biUserNamePrefix}abcde`,
        `GRANT SELECT ON ALL TABLES IN SCHEMA app2 TO ${biUserNamePrefix}abcde`,
      ]),
    });
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, BatchExecuteStatementCommand, {
      WorkgroupName: workgroupName,
      Database: projectDBName,
      ClusterIdentifier: undefined,
      DbUser: undefined,
    });
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 2);
  });

  test('Updated schemas and views only in Redshift serverless in update stack from empty appIds', async () => {
    smMock.onAnyCommand().resolves({});
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });
    redshiftDataMock.on(BatchExecuteStatementCommand).callsFakeOnce(input => {
      if (input as BatchExecuteStatementCommandInput) {
        if (input.Sqls.length >= 2 && input.Sqls[0].includes('CREATE SCHEMA IF NOT EXISTS app2')
        && input.Sqls[1].includes(`CREATE TABLE IF NOT EXISTS app2.${TABLE_NAME_ODS_EVENT}(`)) {
          return { Id: 'Id-1' };
        }
      }
      throw new Error('Sqls are not expected');
    }).resolves({ Id: 'Id-2' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(updateServerlessEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(resp.Data?.RedshiftBIUsername).toEqual(`${biUserNamePrefix}abcde`);
    expect(smMock).toHaveReceivedCommandTimes(CreateSecretCommand, 0);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 2);
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, BatchExecuteStatementCommand, {
      Sqls: expect.arrayContaining([
        `GRANT USAGE ON SCHEMA app2 TO ${biUserNamePrefix}abcde`,
        `GRANT SELECT ON ALL TABLES IN SCHEMA app2 TO ${biUserNamePrefix}abcde`,
      ]),
    });
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, BatchExecuteStatementCommand, {
      WorkgroupName: workgroupName,
      Database: projectDBName,
      ClusterIdentifier: undefined,
      DbUser: undefined,
    });
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 2);
  });


  test('Do nothing when deleting the stack', async () => {
    const deleteEvent: CdkCustomResourceEvent = {
      ...createServerlessEvent,
      PhysicalResourceId: 'id',
      RequestType: 'Delete',
    };
    const resp = await handler(deleteEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(smMock).toHaveReceivedCommandTimes(CreateSecretCommand, 0);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 0);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 0);
  });

  test('Data api exception in Redshift serverless', async () => {
    smMock.onAnyCommand().resolves({});
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(BatchExecuteStatementCommand).rejects();
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    try {
      await handler(createServerlessEvent, context, callback);
    } catch (e) {
      expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 1);
      expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 2);
      expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 2);
      return;
    }
    fail('No exception happened when Redshift ExecuteStatementCommand failed');
  });

  test('Created database, bi user, schemas and views in Redshift provisioned cluster', async () => {
    smMock.onAnyCommand().resolves({});
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(BatchExecuteStatementCommand).resolves({ Id: 'Id-2' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(createProvisionedEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 2);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 2);
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
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 4);
  });

  test('Updated schemas and views in Redshift provisioned cluster', async () => {
    redshiftDataMock
      .callsFakeOnce(input => {
        console.log(`Sql is ${JSON.stringify(input.Sqls)}`);
        if (input as BatchExecuteStatementCommandInput) {
          if (input.Sqls.length >= 9 && input.Sqls[0].includes('CREATE SCHEMA IF NOT EXISTS app2')
          && input.Sqls[1].includes(`CREATE TABLE IF NOT EXISTS app2.${TABLE_NAME_ODS_EVENT}(`)
          && input.Sqls[9].includes(`CREATE TABLE IF NOT EXISTS app1.${TABLE_NAME_ODS_EVENT}`)) {
            return { Id: 'Id-1' };
          }
        }
        throw new Error('Sqls are not expected');
      }).resolves({ Id: 'Id-2' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(updateAdditionalProvisionedEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 2);
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, BatchExecuteStatementCommand, {
      WorkgroupName: undefined,
      Database: projectDBName,
      ClusterIdentifier: clusterId,
      DbUser: dbUser,
    });
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 2);
  });

  console.log(updateServerlessEvent +''+ updateServerlessEvent2 + updateAdditionalProvisionedEvent);
  test('Updated schemas and views in Redshift provisioned cluster with updatable/new added view/schema table', async () => {
    redshiftDataMock
      .callsFakeOnce(input => {
        // console.log(`##1##Sql is ${JSON.stringify(input.Sqls)}`);
        if (input as BatchExecuteStatementCommandInput) {
          if (input.Sqls.length >= 10 && input.Sqls[0].includes('CREATE SCHEMA IF NOT EXISTS app2')
            && input.Sqls[1].includes(`CREATE TABLE IF NOT EXISTS app2.${TABLE_NAME_ODS_EVENT}(`)
            && !input.Sqls[9].includes(`CREATE TABLE IF NOT EXISTS app1.${TABLE_NAME_ODS_EVENT}`)
            && input.Sqls[9].includes('CREATE OR REPLACE PROCEDURE app1.sp_clickstream_log')
          ) {
            return { Id: 'Id-1' };
          }
        }
        throw new Error('##1##Sql are not expected');
      })
      .callsFake(input => {
        console.log(`##2##Sql is ${JSON.stringify(input.Sqls)}`);
        if (input as BatchExecuteStatementCommandInput) {
          if (input.Sqls.length = 17 && input.Sqls[13].includes('CREATE MATERIALIZED VIEW app1.clickstream_ods_events_view')
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
    expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 2);
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, BatchExecuteStatementCommand, {
      WorkgroupName: undefined,
      Database: projectDBName,
      ClusterIdentifier: clusterId,
      DbUser: dbUser,
    });
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 2);
  });

  test('Data api exception in Redshift provisioned cluster', async () => {
    smMock.onAnyCommand().resolves({});
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(BatchExecuteStatementCommand).rejects();
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    try {
      await handler(createProvisionedEvent, context, callback);
    } catch (e) {
      expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 1);
      expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 2);
      expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 2);
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

const testSqlContent = (filePath: string) => {
  const sqlTemplate = readFileSync(filePath, 'utf8');
  return sqlTemplate;
};
