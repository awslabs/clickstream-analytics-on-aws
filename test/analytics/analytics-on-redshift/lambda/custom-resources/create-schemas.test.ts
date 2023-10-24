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
import { RedshiftOdsTables } from '../../../../../src/analytics/analytics-on-redshift';
import { ResourcePropertiesType, handler, physicalIdPrefix } from '../../../../../src/analytics/lambdas/custom-resource/create-schemas';
import 'aws-sdk-client-mock-jest';
import { ProvisionedRedshiftProps, SQLDef } from '../../../../../src/analytics/private/model';
import { reportingViewsDef, schemaDefs } from '../../../../../src/analytics/private/sql-def';
import { TABLE_NAME_EVENT_PARAMETER, TABLE_NAME_ODS_EVENT } from '../../../../../src/common/constant';
import { getMockContext } from '../../../../common/lambda-context';
import { basicCloudFormationEvent } from '../../../../common/lambda-events';

describe('Custom resource - Create schemas for applications in Redshift database', () => {

  const context = getMockContext();
  const callback: CdkCustomResourceCallback = async (_response) => { /* test mock */ };

  const redshiftDataMock = mockClient(RedshiftDataClient);
  const smMock = mockClient(SecretsManagerClient);
  const lambdaMock = mockClient(LambdaClient);

  const projectDBName = 'clickstream_project1';
  const roleName = 'MyRedshiftDBUserRole';
  const biUserNamePrefix = 'clickstream_report_user_';
  const odsTableNames: RedshiftOdsTables = {
    odsEvents: 'ods_events',
    event: 'event',
    event_parameter: 'event_parameter',
    user: 'user',
    item: 'item',
  };
  const basicEvent = {
    ...basicCloudFormationEvent,
    ResourceProperties: {
      ...basicCloudFormationEvent.ResourceProperties,
      ServiceToken: 'token-1',
      projectId: 'project1',
      odsTableNames,
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

  const updateServerlessEvent3: CdkCustomResourceEvent = {
    ...createServerlessEvent,
    OldResourceProperties: {
      ...createServerlessEvent.ResourceProperties,
      appIds: 'app1',
    },
    ResourceProperties: {
      ...createServerlessEvent.ResourceProperties,
      appIds: 'app1,app2',
    },
    PhysicalResourceId: `${physicalIdPrefix}abcde`,
    RequestType: 'Update',
  };

  const testReportingViewsDef: SQLDef[] = [
    {
      updatable: 'true',
      sqlFile: 'clickstream_event_view.sql',
    },
    {
      updatable: 'false',
      sqlFile: 'clickstream_event_parameter_view.sql',
    },
    {
      updatable: 'false',
      sqlFile: 'clickstream_lifecycle_daily_view.sql',
    },
    {
      updatable: 'false',
      sqlFile: 'clickstream_lifecycle_weekly_view.sql',
    },
    {
      updatable: 'false',
      sqlFile: 'clickstream_user_dim_view.sql',
    },
    {
      updatable: 'false',
      sqlFile: 'clickstream_session_view.sql',
    },
    {
      updatable: 'false',
      sqlFile: 'clickstream_device_view.sql',
    },
    {
      updatable: 'false',
      sqlFile: 'clickstream_retention_view.sql',
    },
    {
      updatable: 'false',
      sqlFile: 'clickstream_user_attr_view.sql',
    },
  ];

  const testReportingViewsDef2: SQLDef[] = testReportingViewsDef.slice();
  testReportingViewsDef2.push({
    updatable: 'false',
    sqlFile: 'clickstream_event_parameter_test_view.sql',
  });

  const testSchemaDefs: SQLDef[] = [
    {
      updatable: 'true',
      sqlFile: 'clickstream-log.sql',
    },
    {
      updatable: 'false',
      sqlFile: 'ods-events.sql',
    },
    {
      updatable: 'false',
      sqlFile: 'event.sql',
    },
    {
      updatable: 'false',
      sqlFile: 'event-parameter.sql',
    },
    {
      updatable: 'false',
      sqlFile: 'item.sql',
    },

    {
      updatable: 'false',
      sqlFile: 'user.sql',
    },

    {
      updatable: 'false',
      sqlFile: 'user-m-view.sql',
    },
    {
      updatable: 'false',
      sqlFile: 'item-m-view.sql',
    },
    {
      updatable: 'true',
      sqlFile: 'sp-clickstream-log.sql',
    },
    {
      updatable: 'true',
      sqlFile: 'sp-clickstream-log-non-atomic.sql',
    },
    {
      updatable: 'true',
      sqlFile: 'grant-permissions-to-bi-user.sql',
      multipleLine: 'true',
    },
    {
      updatable: 'true',
      sqlFile: 'sp-upsert-users.sql',
    },
    {
      updatable: 'true',
      sqlFile: 'sp-scan-metadata.sql',
    },
    {
      updatable: 'true',
      sqlFile: 'sp-clear-expired-events.sql',
    },

    {
      updatable: 'true',
      sqlFile: 'sp-clear-item-and-user.sql',
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
    const rootPath = __dirname + '/../../../../../src/analytics/private/sqls/redshift/';
    mockfs({
      '/opt/dashboard/clickstream_device_view.sql': testSqlContent(rootPath + 'dashboard/clickstream_device_view.sql'),
      '/opt/dashboard/clickstream_lifecycle_daily_view.sql': testSqlContent(rootPath + 'dashboard/clickstream_lifecycle_daily_view.sql'),
      '/opt/dashboard/clickstream_lifecycle_weekly_view.sql': testSqlContent(rootPath + 'dashboard/clickstream_lifecycle_weekly_view.sql'),
      '/opt/dashboard/clickstream_event_parameter_view.sql': testSqlContent(rootPath + 'dashboard/clickstream_event_parameter_view.sql'),
      '/opt/dashboard/clickstream_event_view.sql': testSqlContent(rootPath + 'dashboard/clickstream_event_view.sql'),
      '/opt/dashboard/clickstream_retention_view.sql': testSqlContent(rootPath + 'dashboard/clickstream_retention_view.sql'),
      '/opt/dashboard/clickstream_session_view.sql': testSqlContent(rootPath + 'dashboard/clickstream_session_view.sql'),
      '/opt/dashboard/clickstream_user_dim_view.sql': testSqlContent(rootPath + 'dashboard/clickstream_user_dim_view.sql'),
      '/opt/dashboard/clickstream_user_attr_view.sql': testSqlContent(rootPath + 'dashboard/clickstream_user_attr_view.sql'),
      '/opt/dashboard/clickstream_user_dim_mv_1.sql': testSqlContent(rootPath + 'dashboard/clickstream_user_dim_mv_1.sql'),
      '/opt/dashboard/clickstream_user_dim_mv_2.sql': testSqlContent(rootPath + 'dashboard/clickstream_user_dim_mv_2.sql'),
      '/opt/clickstream_user_dim_view.sql': testSqlContent(rootPath + 'dashboard/clickstream_user_dim_view.sql'),
      '/opt/clickstream_session_view.sql': testSqlContent(rootPath + 'dashboard/clickstream_session_view.sql'),
      '/opt/clickstream_event_view.sql': testSqlContent(rootPath + 'dashboard/clickstream_event_view.sql'),
      '/opt/clickstream_event_parameter_test_view.sql': testSqlContent(rootPath + 'dashboard/clickstream_event_parameter_view.sql'),
      '/opt/dashboard/clickstream_event_parameter_test_view.sql': testSqlContent(rootPath + 'dashboard/clickstream_event_parameter_view.sql'),
      '/opt/grant-permissions-to-bi-user.sql': testSqlContent(rootPath + 'grant-permissions-to-bi-user.sql'),
      '/opt/ods-events.sql': testSqlContent(rootPath + 'ods-events.sql'),
      '/opt/sp-clear-expired-events.sql': testSqlContent(rootPath + 'sp-clear-expired-events.sql'),
      '/opt/sp-upsert-users.sql': testSqlContent(rootPath + 'sp-upsert-users.sql'),
      '/opt/sp-clickstream-log.sql': testSqlContent(rootPath + 'sp-clickstream-log.sql'),
      '/opt/sp-clickstream-log-non-atomic.sql': testSqlContent(rootPath + 'sp-clickstream-log-non-atomic.sql'),
      '/opt/sp-scan-metadata.sql': testSqlContent(rootPath + 'sp-scan-metadata.sql'),
      '/opt/event.sql': testSqlContent(rootPath + 'event.sql'),
      '/opt/event-parameter.sql': testSqlContent(rootPath + 'event-parameter.sql'),
      '/opt/user.sql': testSqlContent(rootPath + 'user.sql'),
      '/opt/item.sql': testSqlContent(rootPath + 'item.sql'),
      '/opt/item-m-view.sql': testSqlContent(rootPath + 'item-m-view.sql'),
      '/opt/user-m-view.sql': testSqlContent(rootPath + 'user-m-view.sql'),
      '/opt/sp-clear-item-and-user.sql': testSqlContent(rootPath + 'sp-clear-item-and-user.sql'),
      '/opt/clickstream-log.sql': testSqlContent(rootPath + 'clickstream-log.sql'),
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
        console.log(`Sql-1 is ${JSON.stringify(input.Sql)}`);
        if (input as ExecuteStatementCommandInput) {
          if (input.Sql.includes('CREATE USER')) {
            return { Id: 'id-2' };
          }
        }
        throw new Error('Sql-1 are not expected');
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
        console.log(`Sql-2 is ${JSON.stringify(input.Sql)}`);
        if (input as ExecuteStatementCommandInput) {
          if (input.Sql.includes('CREATE USER')) {
            return { Id: 'id-2' };
          }
        }
        throw new Error('Sql-2 are not expected');
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
    const regex = new RegExp(`^CREATE USER ${biUserNamePrefix}[a-z0-9A-Z$%]{8} PASSWORD '[a-zA-Z0-9!#$%^&-_=+|]{32}'$`);
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
      console.log(`Sql-6 is ${JSON.stringify(input.Sqls)}`);
      const sqlStr = input.Sqls.join(';\n');
      if (input as BatchExecuteStatementCommandInput) {
        if (sqlStr.includes('CREATE SCHEMA IF NOT EXISTS app1')
          && sqlStr.includes(`CREATE TABLE IF NOT EXISTS app1.${TABLE_NAME_ODS_EVENT}(`)) {
          return { Id: 'Id-1' };
        }
      }
      throw new Error('Sql-6 are not expected');
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
      console.log(`Sql-3 is ${JSON.stringify(input.Sqls)}`);
      const sqlStr = input.Sqls.join(';\n');
      if (input as BatchExecuteStatementCommandInput) {
        if (sqlStr.includes('CREATE SCHEMA IF NOT EXISTS app2')
          && sqlStr.includes(`CREATE TABLE IF NOT EXISTS app2.${TABLE_NAME_ODS_EVENT}(`)) {
          return { Id: 'Id-1' };
        }
      }
      throw new Error('Sql-3 are not expected');
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
        `ALTER DEFAULT PRIVILEGES IN SCHEMA app2 GRANT SELECT ON TABLES TO ${biUserNamePrefix}abcde`,
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


  const sql1 = 'CREATESCHEMAIFNOTEXISTSapp2CREATETABLEIFNOTEXISTSapp2.clickstream_log(idvarchar(256),log_namevarchar(50),log_levelvarchar(10),log_msgvarchar(256),log_dateTIMESTAMPdefaultgetdate());CREATETABLEIFNOTEXISTSapp2.ods_events(app_infoSUPER,deviceSUPER,ecommerceSUPER,event_bundle_sequence_idBIGINT,event_dateDATE,event_dimensionsSUPER,event_idVARCHAR(255)DEFAULTRANDOM(),event_nameVARCHAR(255),event_paramsSUPER,event_previous_timestampBIGINT,event_server_timestamp_offsetBIGINT,event_timestampBIGINT,event_value_in_usdFLOAT,geoSUPER,ingest_timestampBIGINT,itemsSUPER,platformVARCHAR(255),privacy_infoSUPER,project_idVARCHAR(255),traffic_sourceSUPER,user_first_touch_timestampBIGINT,user_idVARCHAR(255),user_ltvSUPER,user_propertiesSUPER,user_pseudo_idVARCHAR(255))DISTSTYLEEVENSORTKEY(event_date,event_name)CREATETABLEIFNOTEXISTSapp2.event(event_idVARCHAR(255),event_dateDATE,event_timestampBIGINT,event_previous_timestampBIGINT,event_nameVARCHAR(255),event_value_in_usdFLOAT,event_bundle_sequence_idBIGINT,ingest_timestampBIGINT,deviceSUPER,geoSUPER,traffic_sourceSUPER,app_infoSUPER,platformVARCHAR(255),project_idVARCHAR(255),itemsSUPER,user_pseudo_idVARCHAR(255),user_idVARCHAR(255))DISTSTYLEEVENSORTKEY(event_timestamp,event_name)CREATETABLEIFNOTEXISTSapp2.event_parameter(event_timestampBIGINT,event_idVARCHAR(255),event_nameVARCHAR(255),event_param_keyVARCHAR(255),event_param_double_valueDOUBLEPRECISION,event_param_float_valueDOUBLEPRECISION,event_param_int_valueBIGINT,event_param_string_valueVARCHAR(255))DISTSTYLEEVENSORTKEY(event_timestamp,event_name)CREATETABLEIFNOTEXISTSapp2.user(event_timestampBIGINT,user_idVARCHAR(255),user_pseudo_idVARCHAR(255),user_first_touch_timestampBIGINT,user_propertiesSUPER,user_ltvSUPER,_first_visit_dateDATE,_first_refererVARCHAR(255),_first_traffic_source_typeVARCHAR(255),_first_traffic_mediumVARCHAR(255),_first_traffic_sourceVARCHAR(255),device_id_listSUPER,_channelVARCHAR(255))DISTSTYLEEVENSORTKEY(user_pseudo_id,event_timestamp)CREATETABLEIFNOTEXISTSapp2.item(event_timestampBIGINT,idVARCHAR(255),propertiesSUPER)DISTSTYLEEVENSORTKEY(id,event_timestamp)CREATEMATERIALIZEDVIEWapp2.item_m_viewBACKUPNOSORTKEY(id)AUTOREFRESHYESASWITHitem_id_rankAS(SELECT*,ROW_NUMBER()over(partitionbyidORDERBYevent_timestampdesc)ASet_rankFROMapp2.item),item_newAS(SELECT*FROMitem_id_rankWHEREet_rank=1)SELECTid,properties,event_timestampFROMitem_newCREATEMATERIALIZEDVIEWapp2.user_m_viewBACKUPNOSORTKEY(user_pseudo_id)AUTOREFRESHYESASWITHuser_pseudo_id_rankAS(SELECT*,ROW_NUMBER()over(partitionbyuser_pseudo_idORDERBYevent_timestampdesc)ASet_rankFROMapp2.user),user_newAS(SELECT*FROMuser_pseudo_id_rankWHEREet_rank=1)SELECTuser_id,user_pseudo_id,user_first_touch_timestamp,user_properties,user_ltv,_first_visit_date,_first_referer,_first_traffic_source_type,_first_traffic_medium,_first_traffic_source,device_id_list,_channel,event_timestampFROMuser_newCREATEORREPLACEPROCEDUREapp2.sp_clickstream_log(nameinvarchar(50),levelinvarchar(10),msginvarchar(256))AS$$DECLARElog_idINT;BEGINEXECUTE\'SELECTCOUNT(1)FROMapp2.clickstream_log\'INTOlog_id;INSERTINTOapp2.clickstream_logVALUES(log_id,name,level,msg);EXCEPTIONWHENOTHERSTHENRAISEINFO\'errormessage:%\',SQLERRM;END;$$LANGUAGEplpgsql;CREATEORREPLACEPROCEDUREapp2.sp_clickstream_log_non_atomic(nameinvarchar(50),levelinvarchar(10),msginvarchar(256))NONATOMICAS$$DECLARElog_idINT;BEGINEXECUTE\'SELECTCOUNT(1)FROMapp2.clickstream_log\'INTOlog_id;INSERTINTOapp2.clickstream_logVALUES(log_id,name,level,msg);EXCEPTIONWHENOTHERSTHENRAISEINFO\'errormessage:%\',SQLERRM;END;$$LANGUAGEplpgsql;GRANTUSAGEONSCHEMAapp2TOclickstream_report_user_abcdeALTERDEFAULTPRIVILEGESINSCHEMAapp2GRANTSELECTONTABLESTOclickstream_report_user_abcdeCREATEORREPLACEPROCEDUREapp2.sp_upsert_users()AS$$DECLARErecord_numberINT;begin_update_timestamp_recordRECORD;begin_update_timestampTIMESTAMP;log_namevarchar(50):=\'sp_upsert_users\';BEGINCREATETEMPTABLEIFNOTEXISTSods_users(LIKEapp2.dim_users);EXECUTE\'SELECTevent_timestamp,event_dateFROMapp2.dim_usersORDERBYevent_timestampDESCLIMIT1\'INTObegin_update_timestamp_record;CALLapp2.sp_clickstream_log(log_name,\'info\',\'getevent_timestamp=\'||begin_update_timestamp_record.event_timestamp||\',event_date=\'||begin_update_timestamp_record.event_date||\'fromapp2.dim_users\');IFbegin_update_timestamp_record.event_timestampisnullTHENEXECUTE\'SELECTevent_timestamp,event_dateFROMapp2.ods_eventsORDERBYevent_timestampASCLIMIT1\'INTObegin_update_timestamp_record;CALLapp2.sp_clickstream_log(log_name,\'info\',\'getevent_timestamp=\'||begin_update_timestamp_record.event_timestamp||\',event_date=\'||begin_update_timestamp_record.event_date||\'fromapp2.ods_events\');INSERTINTOods_users(event_date,event_timestamp,user_id,user_properties,user_pseudo_id)(SELECTevent_date,event_timestamp,user_id,user_properties,user_pseudo_idFROM(SELECTe.event_date,e.event_timestamp,e.user_id,e.user_properties,e.user_pseudo_id,sum(1)OVER(PARTITIONBYe.user_pseudo_idORDERBYe.event_timestampDESCROWSUNBOUNDEDPRECEDING)ASrow_numberFROMapp2.ods_eventse,e.user_propertiesuWHEREe.event_date>=begin_update_timestamp_record.event_dateANDe.event_timestamp>=begin_update_timestamp_record.event_timestampANDu.keyISNOTNULL)WHERErow_number=1);GETDIAGNOSTICSrecord_number:=ROW_COUNT;CALLapp2.sp_clickstream_log(log_name,\'info\',\'rowsaddinods_users=\'||record_number);ELSEINSERTINTOods_users(event_date,event_timestamp,user_id,user_properties,user_pseudo_id)(SELECTevent_date,event_timestamp,user_id,user_properties,user_pseudo_idFROM(SELECTe.event_date,e.event_timestamp,e.user_id,e.user_properties,e.user_pseudo_id,sum(1)OVER(PARTITIONBYe.user_pseudo_idORDERBYe.event_timestampDESCROWSUNBOUNDEDPRECEDING)ASrow_numberFROMapp2.ods_eventse,e.user_propertiesuWHEREe.event_date>=begin_update_timestamp_record.event_dateANDe.event_timestamp>begin_update_timestamp_record.event_timestampANDu.keyISNOTNULL)WHERErow_number=1);GETDIAGNOSTICSrecord_number:=ROW_COUNT;CALLapp2.sp_clickstream_log(log_name,\'info\',\'rowsaddinods_users=\'||record_number);ENDIF;CALLapp2.sp_clickstream_log(log_name,\'info\',\'begin=\'||begin_update_timestamp_record.event_timestamp);IFbegin_update_timestamp_record.event_timestampisNULLTHENCALLapp2.sp_clickstream_log(log_name,\'info\',\'nothingtoupsertusersforevent_timestampisnull\');ELSEIFrecord_number=0THENCALLapp2.sp_clickstream_log(log_name,\'info\',\'nothingtoupsertusersforrecord_number=0inods_users\');ELSELOCKapp2.dim_users;DELETEFROMapp2.dim_usersWHEREuser_pseudo_idIN(SELECTe.user_pseudo_idFROMods_userse);GETDIAGNOSTICSrecord_number:=ROW_COUNT;CALLapp2.sp_clickstream_log(log_name,\'info\',\'rowsdeletedindim_users=\'||record_number);INSERTINTOapp2.dim_users(event_date,event_timestamp,user_id,user_pseudo_id,user_properties)(SELECTevent_date,event_timestamp,user_id,user_pseudo_id,user_propertiesFROMods_users);GETDIAGNOSTICSrecord_number:=ROW_COUNT;CALLapp2.sp_clickstream_log(log_name,\'info\',\'rowsinsertedintodim_users=\'||record_number);TRUNCATETABLEods_users;ENDIF;ENDIF;EXCEPTIONWHENOTHERSTHENCALLapp2.sp_clickstream_log(log_name,\'error\',\'errormessage:\'||SQLERRM);END;$$LANGUAGEplpgsql;CREATEORREPLACEPROCEDUREapp2.sp_scan_metadata(top_frequent_properties_limitNUMERIC,day_rangeNUMERIC)AS$$DECLARErecRECORD;querytext;log_namevarchar(50):=\'sp_scan_metadata\';BEGIN--Dropevent_properties_metadataandevent_metadatatable,thedatashouldbemovedintoDDBDROPTABLEIFEXISTSapp2.event_properties_metadata;DROPTABLEIFEXISTSapp2.event_metadata;DROPTABLEIFEXISTSapp2.user_attribute_metadata;CREATETABLEIFNOTEXISTSapp2.event_properties_metadata(idVARCHAR(255),monthVARCHAR(255),prefixVARCHAR(255),project_idVARCHAR(255),app_idVARCHAR(255),day_numberBIGINT,categoryVARCHAR(255),event_nameVARCHAR(255),property_nameVARCHAR(255),value_typeVARCHAR(255),value_enumVARCHAR(MAX),platformVARCHAR(255));CREATETABLEIFNOTEXISTSapp2.user_attribute_metadata(idVARCHAR(255),monthVARCHAR(255),prefixVARCHAR(255),project_idVARCHAR(255),app_idVARCHAR(255),day_numberBIGINT,categoryVARCHAR(255),property_nameVARCHAR(255),value_typeVARCHAR(255),value_enumVARCHAR(MAX));CREATETABLEIFNOTEXISTSapp2.event_metadata(idVARCHAR(255),monthVARCHAR(255),prefixVARCHAR(255),project_idVARCHAR(255),app_idVARCHAR(255),day_numberBIGINT,countBIGINT,event_nameVARCHAR(255),platformVARCHAR(255));CREATETEMPTABLEIFNOTEXISTSproperties_temp_table(event_nameVARCHAR(255),project_idVARCHAR(255),app_info_app_idVARCHAR(255),event_timestampBIGINT,property_categoryVARCHAR(20),property_nameVARCHAR(255),property_valueVARCHAR(255),value_typeVARCHAR(255),platformVARCHAR(255));CREATETEMPTABLEIFNOTEXISTSuser_attribute_temp_table(user_idVARCHAR(255),event_timestampBIGINT,property_categoryVARCHAR(20),property_nameVARCHAR(255),property_valueVARCHAR(255),value_typeVARCHAR(255));--TableisforsettingthecolumnnameofincludingpropertiesintometadataCREATETEMPORARYTABLEIFNOTEXISTSproperty_column_temp_table(column_nameVARCHAR);INSERTINTOproperty_column_temp_table(column_name)VALUES(\'platform\'),(\'project_id\');--TableisforsettingthecolumnandthepropertiesthatshouldbeincludedintometadataCREATETEMPORARYTABLEIFNOTEXISTSproperty_array_temp_table(column_nameVARCHAR,property_nameVARCHAR);INSERTINTOproperty_array_temp_table(column_name,property_name)VALUES(\'app_info\',\'app_id\'),(\'app_info\',\'install_source\'),(\'app_info\',\'id\'),(\'app_info\',\'version\'),(\'device\',\'mobile_brand_name\'),(\'device\',\'mobile_model_name\'),(\'device\',\'manufacturer\'),(\'device\',\'screen_width\'),(\'device\',\'screen_height\'),(\'device\',\'carrier\'),(\'device\',\'network_type\'),(\'device\',\'operating_system_version\'),(\'device\',\'operating_system\'),(\'device\',\'ua_browser\'),(\'device\',\'ua_browser_version\'),(\'device\',\'ua_os\'),(\'device\',\'ua_os_version\'),(\'device\',\'ua_device\'),(\'device\',\'ua_device_category\'),(\'device\',\'system_language\'),(\'device\',\'time_zone_offset_seconds\'),(\'device\',\'vendor_id\'),(\'device\',\'advertising_id\'),(\'device\',\'host_name\'),(\'device\',\'viewport_height\'),(\'device\',\'viewport_width\'),(\'geo\',\'city\'),(\'geo\',\'continent\'),(\'geo\',\'country\'),(\'geo\',\'metro\'),(\'geo\',\'region\'),(\'geo\',\'sub_continent\'),(\'geo\',\'locale\'),(\'traffic_source\',\'medium\'),(\'traffic_source\',\'name\'),(\'traffic_source\',\'source\');--TableisforsettingthecolumnofincludinguserattributesintometadataCREATETEMPORARYTABLEIFNOTEXISTSuser_column_temp_table(column_nameVARCHAR);INSERTINTOuser_column_temp_table(column_name)VALUES(\'_first_visit_date\'),(\'_first_referer\'),(\'_first_traffic_source_type\'),(\'_first_traffic_medium\'),(\'_first_traffic_source\'),(\'_channel\');CALLapp2.sp_clickstream_log(log_name,\'info\',\'createtemptablessuccessfully.\');query:=\'SELECTcolumn_nameFROMproperty_column_temp_table\';FORrecINEXECUTEqueryLOOPEXECUTE\'INSERTINTOproperties_temp_table(SELECTevent_name,project_id,app_info.app_id::varcharASapp_info_app_id,event_timestamp,\'\'other\'\'ASproperty_category,\'\'\'||quote_ident(rec.column_name)||\'\'\'ASproperty_name,\'||quote_ident(rec.column_name)||\'::varcharASproperty_value,\'\'string\'\'ASvalue_type,platformFROMapp2.eventWHEREevent_timestamp>=EXTRACT(epochFROMDATE_TRUNC(\'\'day\'\',GETDATE()-INTERVAL\'\'\'||quote_ident(day_range)||\'day\'\')::timestamp)*1000::bigintANDevent_timestamp<EXTRACT(epochFROMDATE_TRUNC(\'\'day\'\',GETDATE())::timestamp)*1000::bigint)\';ENDLOOP;query:=\'SELECTcolumn_name,property_nameFROMproperty_array_temp_table\';FORrecINEXECUTEqueryLOOPEXECUTE\'INSERTINTOproperties_temp_table(SELECTevent_name,project_id,app_info.app_id::varcharASapp_info_app_id,event_timestamp,\'\'\'||quote_ident(rec.column_name)||\'\'\'ASproperty_category,\'||quote_literal(rec.property_name)||\'ASproperty_name,\'||quote_ident(rec.column_name)||\'.\'||quote_ident(rec.property_name)||\'::varcharASproperty_value,CASEWHEN\'\'\'||quote_ident(rec.property_name)||\'\'\'::varcharIN(\'\'screen_height\'\',\'\'screen_width\'\',\'\'viewport_height\'\',\'\'viewport_width\'\',\'\'time_zone_offset_seconds\'\')THEN\'\'int\'\'ELSE\'\'string\'\'ENDASvalue_type,platformFROMapp2.eventWHEREevent_timestamp>=EXTRACT(epochFROMDATE_TRUNC(\'\'day\'\',GETDATE()-INTERVAL\'\'\'||quote_ident(day_range)||\'day\'\')::timestamp)*1000::bigintANDevent_timestamp<EXTRACT(epochFROMDATE_TRUNC(\'\'day\'\',GETDATE())::timestamp)*1000::bigint)\';ENDLOOP;INSERTINTOproperties_temp_table(SELECTparameter.event_name,\'project1\'ASproject_id,\'app2\'ASapp_info_app_id,parameter.event_timestampASevent_timestamp,\'event\'ASproperty_category,parameter.event_param_key::varcharASproperty_name,CASEWHENevent_param_double_valueISNOTNULLTHENCAST(event_param_double_valueASvarchar)WHENevent_param_float_valueISNOTNULLTHENCAST(event_param_float_valueASvarchar)WHENevent_param_int_valueISNOTNULLTHENCAST(event_param_int_valueASvarchar)WHENevent_param_string_valueISNOTNULLTHENevent_param_string_valueENDASproperty_value,CASEWHENevent_param_double_valueISNOTNULLTHEN\'double\'WHENevent_param_float_valueISNOTNULLTHEN\'float\'WHENevent_param_int_valueISNOTNULLTHEN\'int\'WHENevent_param_string_valueISNOTNULLTHEN\'string\'ENDASvalue_type,event.platformASplatformFROMapp2.event_parameterparameterJOINapp2.eventeventONparameter.event_timestamp=event.event_timestampANDparameter.event_id=event.event_idWHEREproperty_nameNOTLIKE\'%timestamp%\'ANDparameter.event_timestamp>=EXTRACT(epochFROMDATE_TRUNC(\'day\',GETDATE()-INTERVAL\'1day\'*day_range)::timestamp)*1000::bigintANDparameter.event_timestamp<EXTRACT(epochFROMDATE_TRUNC(\'day\',GETDATE())::timestamp)*1000::bigint);CALLapp2.sp_clickstream_log(log_name,\'info\',\'Insertdataintoproperties_temp_tabletablesuccessfully.\');INSERTINTOapp2.event_properties_metadata(id,month,prefix,project_id,app_id,day_number,category,event_name,property_name,value_type,value_enum,platform)SELECTproject_id||\'#\'||app_info_app_id||\'#\'||event_name||\'#\'||property_name||\'#\'||value_typeASid,month,\'EVENT_PARAMETER#\'||project_id||\'#\'||app_info_app_idASprefix,project_id,app_info_app_idASapp_id,day_number,property_categoryAScategory,event_name,property_name,value_type,property_valuesASvalue_enum,platformFROM(SELECTevent_name,project_id,app_info_app_id,property_category,month,day_number,property_name,value_type,LISTAGG(property_value||\'_\'||parameter_count,\'#\')WITHINGROUP(ORDERBYproperty_value)asproperty_values,platformFROM(SELECTevent_name,project_id,app_info_app_id,property_category,month,day_number,property_name,property_value,value_type,parameter_count,platformFROM(SELECTevent_name,project_id,app_info_app_id,property_category,month,day_number,property_name,property_value,value_type,parameter_count,platform,ROW_NUMBER()OVER(PARTITIONBYevent_name,project_id,app_info_app_id,property_category,month,day_number,property_name,value_type,platformORDERBYparameter_countDESC)ASrow_numFROM(SELECTevent_name,project_id,app_info_app_id,property_category,\'#\'||TO_CHAR(TIMESTAMP\'epoch\'+(event_timestamp/1000.0)*INTERVAL\'1second\',\'YYYYMM\')ASmonth,EXTRACT(DAYFROMTIMESTAMP\'epoch\'+(event_timestamp/1000.0)*INTERVAL\'1second\')ASday_number,property_name,property_value,value_type,LISTAGG(DISTINCTplatform,\'#\')WITHINGROUP(ORDERBYplatform)ASplatform,count(*)ASparameter_countFROMproperties_temp_tableWHEREproperty_valueISNOTNULLANDproperty_value!=\'\'GROUPBYevent_name,project_id,app_info_app_id,property_category,month,day_number,property_name,property_value,value_type))WHERErow_num<=top_frequent_properties_limitOR(event_name=\'_page_view\'ANDproperty_nameIN(\'_page_title\',\'_page_url\'))OR(event_name=\'_screen_view\'ANDproperty_nameIN(\'_screen_name\',\'_screen_id\')))GROUPBYevent_name,project_id,app_info_app_id,property_category,month,day_number,property_name,value_type,platform);CALLapp2.sp_clickstream_log(log_name,\'info\',\'Insertallparametersdataintoevent_properties_metadatatablesuccessfully.\');query:=\'SELECTcolumn_nameFROMuser_column_temp_table\';FORrecINEXECUTEqueryLOOPEXECUTE\'INSERTINTOuser_attribute_temp_table(SELECTuser_id,event_timestamp,\'\'user_outer\'\'ASproperty_category,\'\'\'||quote_ident(rec.column_name)||\'\'\'ASproperty_name,\'||quote_ident(rec.column_name)||\'::varcharASproperty_value,\'\'String\'\'ASvalue_typeFROMapp2.user)\';ENDLOOP;INSERTINTOuser_attribute_temp_table(SELECTuser_id,event_timestamp,\'user\'ASproperty_category,user_properties.key::varcharASproperty_name,coalesce(nullif(user_properties.value.string_value::varchar,\'\'),nullif(user_properties.value.int_value::varchar,\'\'),nullif(user_properties.value.float_value::varchar,\'\'),nullif(user_properties.value.double_value::varchar,\'\'))ASproperty_value,CASEWHENuser_properties.value.string_value::varcharISNOTNULLTHEN\'string\'WHENuser_properties.value.int_value::varcharISNOTNULLTHEN\'int\'WHENuser_properties.value.float_value::varcharISNOTNULLTHEN\'float\'WHENuser_properties.value.double_value::varcharISNOTNULLTHEN\'double\'ELSE\'None\'ENDASvalue_typeFROMapp2.useru,u.user_propertiesASuser_properties);--userattributeINSERTINTOapp2.user_attribute_metadata(id,month,prefix,project_id,app_id,day_number,category,property_name,value_type,value_enum)SELECTproject_id||\'#\'||app_info_app_id||\'#\'||property_name||\'#\'||value_typeASid,month,\'USER_ATTRIBUTE#\'||project_id||\'#\'||app_info_app_idASprefix,project_idASproject_id,app_info_app_idASapp_id,day_number,\'user\'AScategory,property_nameASproperty_name,value_typeASvalue_type,property_valuesASvalue_enumFROM(SELECT\'project1\'ASproject_id,\'app2\'ASapp_info_app_id,\'#\'||TO_CHAR(CURRENT_DATE,\'YYYYMM\')ASmonth,EXTRACT(DAYFROMCURRENT_DATE)ASday_number,property_category,property_name,value_type,LISTAGG(property_value||\'_\'||parameter_count,\'#\')WITHINGROUP(ORDERBYproperty_value)asproperty_valuesFROM(SELECTproperty_category,property_name,property_value,value_type,count(*)ASparameter_countFROM(SELECT*,ROW_NUMBER()OVER(PARTITIONBYuser_idORDERBYevent_timestampDESC)ASrankFROMuser_attribute_temp_table)WHEREproperty_nameNOTLIKE\'%timestamp%\'ANDrank=1ANDproperty_valueISNOTNULLANDproperty_value!=\'\'GROUPBYproperty_category,property_name,property_value,value_type)GROUPBYproject_id,app_info_app_id,month,day_number,property_category,property_name,value_type);CALLapp2.sp_clickstream_log(log_name,\'info\',\'Insertalluserattributedataintouser_attribute_metadatatablesuccessfully.\');INSERTINTOapp2.event_metadata(id,month,prefix,project_id,app_id,day_number,count,event_name,platform)SELECTproject_id||\'#\'||app_info_app_id||\'#\'||event_nameASid,month,\'EVENT#\'||project_id||\'#\'||app_info_app_idASprefix,project_idASproject_id,app_info_app_idASapp_id,day_number,count,event_nameASevent_name,platformASplatformFROM(SELECTevent_name,project_id,app_info.app_id::varcharASapp_info_app_id,\'#\'||TO_CHAR(TIMESTAMP\'epoch\'+(event_timestamp/1000.0)*INTERVAL\'1second\',\'YYYYMM\')ASmonth,EXTRACT(DAYFROMTIMESTAMP\'epoch\'+(event_timestamp/1000.0)*INTERVAL\'1second\')ASday_number,LISTAGG(DISTINCTplatform,\'#\')WITHINGROUP(ORDERBYplatform)ASplatform,count(*)ascountFROMapp2.eventWHEREevent_timestamp>=EXTRACT(epochFROMDATE_TRUNC(\'day\',GETDATE()-INTERVAL\'1day\'*day_range)::timestamp)*1000::bigintANDevent_timestamp<EXTRACT(epochFROMDATE_TRUNC(\'day\',GETDATE())::timestamp)*1000::bigintANDevent_name!=\'_\'GROUPBYevent_name,project_id,app_info_app_id,month,day_number);CALLapp2.sp_clickstream_log(log_name,\'info\',\'Insertalleventdataintoevent_metadatatablesuccessfully.\');EXCEPTIONWHENOTHERSTHENCALLapp2.sp_clickstream_log(log_name,\'error\',\'errormessage:\'||SQLERRM);END;$$LANGUAGEplpgsql;CREATEORREPLACEPROCEDUREapp2.sp_clear_expired_events(retention_range_daysinint)NONATOMICAS$$DECLARErecord_numberINT;ods_tbl_namevarchar(50):=\'app2.ods_events\';latest_timestamp_record1RECORD;latest_timestamp_record2RECORD;log_namevarchar(50):=\'sp_clear_expired_events\';BEGIN--cleantable_ods_eventsEXECUTE\'SELECTevent_timestampFROMapp2.ods_eventsORDERBYevent_timestampDESCLIMIT1\'INTOlatest_timestamp_record1;CALLapp2.sp_clickstream_log_non_atomic(log_name,\'info\',\'getevent_timestamp=\'||latest_timestamp_record1.event_timestamp||\'fromapp2.ods_events\');IFlatest_timestamp_record1.event_timestampisnullTHENCALLapp2.sp_clickstream_log_non_atomic(log_name,\'info\',\'noevent_timestampfoundinapp2.ods_events\');ELSEDELETEFROMapp2.ods_eventsWHEREevent_date<DATEADD(day,-retention_range_days,CAST(TIMESTAMP\'epoch\'+(latest_timestamp_record1.event_timestamp/1000)*INTERVAL\'1second\'asdate));GETDIAGNOSTICSrecord_number:=ROW_COUNT;CALLapp2.sp_clickstream_log_non_atomic(log_name,\'info\',\'delete\'||record_number||\'expiredrecordsfromapp2.eventforretention_range_days=\'||retention_range_days);ANALYZEapp2.ods_events;ENDIF;--cleantable_eventandtable_event_parameterEXECUTE\'SELECTevent_timestampFROMapp2.eventORDERBYevent_timestampDESCLIMIT1\'INTOlatest_timestamp_record2;CALLapp2.sp_clickstream_log_non_atomic(log_name,\'info\',\'getevent_timestamp=\'||latest_timestamp_record2.event_timestamp||\'fromapp2.ods_events\');IFlatest_timestamp_record2.event_timestampisnullTHENCALLapp2.sp_clickstream_log_non_atomic(log_name,\'info\',\'noevent_timestampfoundinapp2.event\');ELSEDELETEFROMapp2.eventWHEREevent_timestamp<(latest_timestamp_record2.event_timestamp-retention_range_days*24*3600*1000);GETDIAGNOSTICSrecord_number:=ROW_COUNT;CALLapp2.sp_clickstream_log_non_atomic(log_name,\'info\',\'delete\'||record_number||\'expiredrecordsfromapp2.eventforretention_range_days=\'||retention_range_days);ANALYZEapp2.event;deleteapp2.event_parameterfromapp2.event_parametereWHEREnotexists(SELECT1fromapp2.eventpwheree.event_id=p.event_idande.event_timestamp=p.event_timestamp);GETDIAGNOSTICSrecord_number:=ROW_COUNT;CALLapp2.sp_clickstream_log_non_atomic(log_name,\'info\',\'delete\'||record_number||\'expiredrecordsfromapp2.event_parameterforretention_range_days=\'||retention_range_days);ANALYZEapp2.event_parameter;ENDIF;CALLapp2.sp_clear_item_and_user();EXCEPTIONWHENOTHERSTHENCALLapp2.sp_clickstream_log_non_atomic(log_name,\'error\',\'errormessage:\'||SQLERRM);END;$$LANGUAGEplpgsql;CREATEORREPLACEPROCEDUREapp2.sp_clear_item_and_user()NONATOMICAS$$DECLARErecord_numberINT;log_namevarchar(50):=\'sp_clear_expired_events\';BEGIN--cleantable_itemWITHitem_id_rankAS(SELECTid,ROW_NUMBER()over(partitionbyidORDERBYevent_timestampdesc)ASet_rankFROMapp2.item)deletefromapp2.itemusingitem_id_rankwhereapp2.item.id=item_id_rank.idanditem_id_rank.et_rank!=1;GETDIAGNOSTICSrecord_number:=ROW_COUNT;CALLapp2.sp_clickstream_log_non_atomic(log_name,\'info\',\'delete\'||record_number||\'fromapp2.item\');ANALYZEapp2.item;--cleantable_userWITHuser_id_rankAS(SELECTuser_id,ROW_NUMBER()over(partitionbyuser_idORDERBYevent_timestampdesc)ASet_rankFROMapp2.user)deletefromapp2.userusinguser_id_rankwhereapp2.user.user_id=user_id_rank.user_idanduser_id_rank.et_rank!=1;GETDIAGNOSTICSrecord_number:=ROW_COUNT;CALLapp2.sp_clickstream_log_non_atomic(log_name,\'info\',\'delete\'||record_number||\'fromapp2.user\');ANALYZEapp2.user;EXCEPTIONWHENOTHERSTHENCALLapp2.sp_clickstream_log_non_atomic(log_name,\'error\',\'errormessage:\'||SQLERRM);END;$$LANGUAGEplpgsql;';
  const sql2 = 'CREATETABLEIFNOTEXISTSapp1.clickstream_log(idvarchar(256),log_namevarchar(50),log_levelvarchar(10),log_msgvarchar(256),log_dateTIMESTAMPdefaultgetdate());CREATETABLEIFNOTEXISTSapp1.ods_events(app_infoSUPER,deviceSUPER,ecommerceSUPER,event_bundle_sequence_idBIGINT,event_dateDATE,event_dimensionsSUPER,event_idVARCHAR(255)DEFAULTRANDOM(),event_nameVARCHAR(255),event_paramsSUPER,event_previous_timestampBIGINT,event_server_timestamp_offsetBIGINT,event_timestampBIGINT,event_value_in_usdFLOAT,geoSUPER,ingest_timestampBIGINT,itemsSUPER,platformVARCHAR(255),privacy_infoSUPER,project_idVARCHAR(255),traffic_sourceSUPER,user_first_touch_timestampBIGINT,user_idVARCHAR(255),user_ltvSUPER,user_propertiesSUPER,user_pseudo_idVARCHAR(255))DISTSTYLEEVENSORTKEY(event_date,event_name)CREATETABLEIFNOTEXISTSapp1.event(event_idVARCHAR(255),event_dateDATE,event_timestampBIGINT,event_previous_timestampBIGINT,event_nameVARCHAR(255),event_value_in_usdFLOAT,event_bundle_sequence_idBIGINT,ingest_timestampBIGINT,deviceSUPER,geoSUPER,traffic_sourceSUPER,app_infoSUPER,platformVARCHAR(255),project_idVARCHAR(255),itemsSUPER,user_pseudo_idVARCHAR(255),user_idVARCHAR(255))DISTSTYLEEVENSORTKEY(event_timestamp,event_name)CREATETABLEIFNOTEXISTSapp1.event_parameter(event_timestampBIGINT,event_idVARCHAR(255),event_nameVARCHAR(255),event_param_keyVARCHAR(255),event_param_double_valueDOUBLEPRECISION,event_param_float_valueDOUBLEPRECISION,event_param_int_valueBIGINT,event_param_string_valueVARCHAR(255))DISTSTYLEEVENSORTKEY(event_timestamp,event_name)CREATETABLEIFNOTEXISTSapp1.user(event_timestampBIGINT,user_idVARCHAR(255),user_pseudo_idVARCHAR(255),user_first_touch_timestampBIGINT,user_propertiesSUPER,user_ltvSUPER,_first_visit_dateDATE,_first_refererVARCHAR(255),_first_traffic_source_typeVARCHAR(255),_first_traffic_mediumVARCHAR(255),_first_traffic_sourceVARCHAR(255),device_id_listSUPER,_channelVARCHAR(255))DISTSTYLEEVENSORTKEY(user_pseudo_id,event_timestamp)CREATETABLEIFNOTEXISTSapp1.item(event_timestampBIGINT,idVARCHAR(255),propertiesSUPER)DISTSTYLEEVENSORTKEY(id,event_timestamp)CREATEORREPLACEPROCEDUREapp1.sp_clickstream_log(nameinvarchar(50),levelinvarchar(10),msginvarchar(256))AS$$DECLARElog_idINT;BEGINEXECUTE\'SELECTCOUNT(1)FROMapp1.clickstream_log\'INTOlog_id;INSERTINTOapp1.clickstream_logVALUES(log_id,name,level,msg);EXCEPTIONWHENOTHERSTHENRAISEINFO\'errormessage:%\',SQLERRM;END;$$LANGUAGEplpgsql;CREATEORREPLACEPROCEDUREapp1.sp_clickstream_log_non_atomic(nameinvarchar(50),levelinvarchar(10),msginvarchar(256))NONATOMICAS$$DECLARElog_idINT;BEGINEXECUTE\'SELECTCOUNT(1)FROMapp1.clickstream_log\'INTOlog_id;INSERTINTOapp1.clickstream_logVALUES(log_id,name,level,msg);EXCEPTIONWHENOTHERSTHENRAISEINFO\'errormessage:%\',SQLERRM;END;$$LANGUAGEplpgsql;GRANTUSAGEONSCHEMAapp1TOclickstream_report_user_abcde;ALTERDEFAULTPRIVILEGESINSCHEMAapp1GRANTSELECTONTABLESTOclickstream_report_user_abcde;CREATEORREPLACEPROCEDUREapp1.sp_upsert_users()AS$$DECLARErecord_numberINT;begin_update_timestamp_recordRECORD;begin_update_timestampTIMESTAMP;log_namevarchar(50):=\'sp_upsert_users\';BEGINCREATETEMPTABLEIFNOTEXISTSods_users(LIKEapp1.dim_users);EXECUTE\'SELECTevent_timestamp,event_dateFROMapp1.dim_usersORDERBYevent_timestampDESCLIMIT1\'INTObegin_update_timestamp_record;CALLapp1.sp_clickstream_log(log_name,\'info\',\'getevent_timestamp=\'||begin_update_timestamp_record.event_timestamp||\',event_date=\'||begin_update_timestamp_record.event_date||\'fromapp1.dim_users\');IFbegin_update_timestamp_record.event_timestampisnullTHENEXECUTE\'SELECTevent_timestamp,event_dateFROMapp1.ods_eventsORDERBYevent_timestampASCLIMIT1\'INTObegin_update_timestamp_record;CALLapp1.sp_clickstream_log(log_name,\'info\',\'getevent_timestamp=\'||begin_update_timestamp_record.event_timestamp||\',event_date=\'||begin_update_timestamp_record.event_date||\'fromapp1.ods_events\');INSERTINTOods_users(event_date,event_timestamp,user_id,user_properties,user_pseudo_id)(SELECTevent_date,event_timestamp,user_id,user_properties,user_pseudo_idFROM(SELECTe.event_date,e.event_timestamp,e.user_id,e.user_properties,e.user_pseudo_id,sum(1)OVER(PARTITIONBYe.user_pseudo_idORDERBYe.event_timestampDESCROWSUNBOUNDEDPRECEDING)ASrow_numberFROMapp1.ods_eventse,e.user_propertiesuWHEREe.event_date>=begin_update_timestamp_record.event_dateANDe.event_timestamp>=begin_update_timestamp_record.event_timestampANDu.keyISNOTNULL)WHERErow_number=1);GETDIAGNOSTICSrecord_number:=ROW_COUNT;CALLapp1.sp_clickstream_log(log_name,\'info\',\'rowsaddinods_users=\'||record_number);ELSEINSERTINTOods_users(event_date,event_timestamp,user_id,user_properties,user_pseudo_id)(SELECTevent_date,event_timestamp,user_id,user_properties,user_pseudo_idFROM(SELECTe.event_date,e.event_timestamp,e.user_id,e.user_properties,e.user_pseudo_id,sum(1)OVER(PARTITIONBYe.user_pseudo_idORDERBYe.event_timestampDESCROWSUNBOUNDEDPRECEDING)ASrow_numberFROMapp1.ods_eventse,e.user_propertiesuWHEREe.event_date>=begin_update_timestamp_record.event_dateANDe.event_timestamp>begin_update_timestamp_record.event_timestampANDu.keyISNOTNULL)WHERErow_number=1);GETDIAGNOSTICSrecord_number:=ROW_COUNT;CALLapp1.sp_clickstream_log(log_name,\'info\',\'rowsaddinods_users=\'||record_number);ENDIF;CALLapp1.sp_clickstream_log(log_name,\'info\',\'begin=\'||begin_update_timestamp_record.event_timestamp);IFbegin_update_timestamp_record.event_timestampisNULLTHENCALLapp1.sp_clickstream_log(log_name,\'info\',\'nothingtoupsertusersforevent_timestampisnull\');ELSEIFrecord_number=0THENCALLapp1.sp_clickstream_log(log_name,\'info\',\'nothingtoupsertusersforrecord_number=0inods_users\');ELSELOCKapp1.dim_users;DELETEFROMapp1.dim_usersWHEREuser_pseudo_idIN(SELECTe.user_pseudo_idFROMods_userse);GETDIAGNOSTICSrecord_number:=ROW_COUNT;CALLapp1.sp_clickstream_log(log_name,\'info\',\'rowsdeletedindim_users=\'||record_number);INSERTINTOapp1.dim_users(event_date,event_timestamp,user_id,user_pseudo_id,user_properties)(SELECTevent_date,event_timestamp,user_id,user_pseudo_id,user_propertiesFROMods_users);GETDIAGNOSTICSrecord_number:=ROW_COUNT;CALLapp1.sp_clickstream_log(log_name,\'info\',\'rowsinsertedintodim_users=\'||record_number);TRUNCATETABLEods_users;ENDIF;ENDIF;EXCEPTIONWHENOTHERSTHENCALLapp1.sp_clickstream_log(log_name,\'error\',\'errormessage:\'||SQLERRM);END;$$LANGUAGEplpgsql;CREATEORREPLACEPROCEDUREapp1.sp_scan_metadata(top_frequent_properties_limitNUMERIC,day_rangeNUMERIC)AS$$DECLARErecRECORD;querytext;log_namevarchar(50):=\'sp_scan_metadata\';BEGIN--Dropevent_properties_metadataandevent_metadatatable,thedatashouldbemovedintoDDBDROPTABLEIFEXISTSapp1.event_properties_metadata;DROPTABLEIFEXISTSapp1.event_metadata;DROPTABLEIFEXISTSapp1.user_attribute_metadata;CREATETABLEIFNOTEXISTSapp1.event_properties_metadata(idVARCHAR(255),monthVARCHAR(255),prefixVARCHAR(255),project_idVARCHAR(255),app_idVARCHAR(255),day_numberBIGINT,categoryVARCHAR(255),event_nameVARCHAR(255),property_nameVARCHAR(255),value_typeVARCHAR(255),value_enumVARCHAR(MAX),platformVARCHAR(255));CREATETABLEIFNOTEXISTSapp1.user_attribute_metadata(idVARCHAR(255),monthVARCHAR(255),prefixVARCHAR(255),project_idVARCHAR(255),app_idVARCHAR(255),day_numberBIGINT,categoryVARCHAR(255),property_nameVARCHAR(255),value_typeVARCHAR(255),value_enumVARCHAR(MAX));CREATETABLEIFNOTEXISTSapp1.event_metadata(idVARCHAR(255),monthVARCHAR(255),prefixVARCHAR(255),project_idVARCHAR(255),app_idVARCHAR(255),day_numberBIGINT,countBIGINT,event_nameVARCHAR(255),platformVARCHAR(255));CREATETEMPTABLEIFNOTEXISTSproperties_temp_table(event_nameVARCHAR(255),project_idVARCHAR(255),app_info_app_idVARCHAR(255),event_timestampBIGINT,property_categoryVARCHAR(20),property_nameVARCHAR(255),property_valueVARCHAR(255),value_typeVARCHAR(255),platformVARCHAR(255));CREATETEMPTABLEIFNOTEXISTSuser_attribute_temp_table(user_idVARCHAR(255),event_timestampBIGINT,property_categoryVARCHAR(20),property_nameVARCHAR(255),property_valueVARCHAR(255),value_typeVARCHAR(255));--TableisforsettingthecolumnnameofincludingpropertiesintometadataCREATETEMPORARYTABLEIFNOTEXISTSproperty_column_temp_table(column_nameVARCHAR);INSERTINTOproperty_column_temp_table(column_name)VALUES(\'platform\'),(\'project_id\');--TableisforsettingthecolumnandthepropertiesthatshouldbeincludedintometadataCREATETEMPORARYTABLEIFNOTEXISTSproperty_array_temp_table(column_nameVARCHAR,property_nameVARCHAR);INSERTINTOproperty_array_temp_table(column_name,property_name)VALUES(\'app_info\',\'app_id\'),(\'app_info\',\'install_source\'),(\'app_info\',\'id\'),(\'app_info\',\'version\'),(\'device\',\'mobile_brand_name\'),(\'device\',\'mobile_model_name\'),(\'device\',\'manufacturer\'),(\'device\',\'screen_width\'),(\'device\',\'screen_height\'),(\'device\',\'carrier\'),(\'device\',\'network_type\'),(\'device\',\'operating_system_version\'),(\'device\',\'operating_system\'),(\'device\',\'ua_browser\'),(\'device\',\'ua_browser_version\'),(\'device\',\'ua_os\'),(\'device\',\'ua_os_version\'),(\'device\',\'ua_device\'),(\'device\',\'ua_device_category\'),(\'device\',\'system_language\'),(\'device\',\'time_zone_offset_seconds\'),(\'device\',\'vendor_id\'),(\'device\',\'advertising_id\'),(\'device\',\'host_name\'),(\'device\',\'viewport_height\'),(\'device\',\'viewport_width\'),(\'geo\',\'city\'),(\'geo\',\'continent\'),(\'geo\',\'country\'),(\'geo\',\'metro\'),(\'geo\',\'region\'),(\'geo\',\'sub_continent\'),(\'geo\',\'locale\'),(\'traffic_source\',\'medium\'),(\'traffic_source\',\'name\'),(\'traffic_source\',\'source\');--TableisforsettingthecolumnofincludinguserattributesintometadataCREATETEMPORARYTABLEIFNOTEXISTSuser_column_temp_table(column_nameVARCHAR);INSERTINTOuser_column_temp_table(column_name)VALUES(\'_first_visit_date\'),(\'_first_referer\'),(\'_first_traffic_source_type\'),(\'_first_traffic_medium\'),(\'_first_traffic_source\'),(\'_channel\');CALLapp1.sp_clickstream_log(log_name,\'info\',\'createtemptablessuccessfully.\');query:=\'SELECTcolumn_nameFROMproperty_column_temp_table\';FORrecINEXECUTEqueryLOOPEXECUTE\'INSERTINTOproperties_temp_table(SELECTevent_name,project_id,app_info.app_id::varcharASapp_info_app_id,event_timestamp,\'\'other\'\'ASproperty_category,\'\'\'||quote_ident(rec.column_name)||\'\'\'ASproperty_name,\'||quote_ident(rec.column_name)||\'::varcharASproperty_value,\'\'string\'\'ASvalue_type,platformFROMapp1.eventWHEREevent_timestamp>=EXTRACT(epochFROMDATE_TRUNC(\'\'day\'\',GETDATE()-INTERVAL\'\'\'||quote_ident(day_range)||\'day\'\')::timestamp)*1000::bigintANDevent_timestamp<EXTRACT(epochFROMDATE_TRUNC(\'\'day\'\',GETDATE())::timestamp)*1000::bigint)\';ENDLOOP;query:=\'SELECTcolumn_name,property_nameFROMproperty_array_temp_table\';FORrecINEXECUTEqueryLOOPEXECUTE\'INSERTINTOproperties_temp_table(SELECTevent_name,project_id,app_info.app_id::varcharASapp_info_app_id,event_timestamp,\'\'\'||quote_ident(rec.column_name)||\'\'\'ASproperty_category,\'||quote_literal(rec.property_name)||\'ASproperty_name,\'||quote_ident(rec.column_name)||\'.\'||quote_ident(rec.property_name)||\'::varcharASproperty_value,CASEWHEN\'\'\'||quote_ident(rec.property_name)||\'\'\'::varcharIN(\'\'screen_height\'\',\'\'screen_width\'\',\'\'viewport_height\'\',\'\'viewport_width\'\',\'\'time_zone_offset_seconds\'\')THEN\'\'int\'\'ELSE\'\'string\'\'ENDASvalue_type,platformFROMapp1.eventWHEREevent_timestamp>=EXTRACT(epochFROMDATE_TRUNC(\'\'day\'\',GETDATE()-INTERVAL\'\'\'||quote_ident(day_range)||\'day\'\')::timestamp)*1000::bigintANDevent_timestamp<EXTRACT(epochFROMDATE_TRUNC(\'\'day\'\',GETDATE())::timestamp)*1000::bigint)\';ENDLOOP;INSERTINTOproperties_temp_table(SELECTparameter.event_name,\'project1\'ASproject_id,\'app1\'ASapp_info_app_id,parameter.event_timestampASevent_timestamp,\'event\'ASproperty_category,parameter.event_param_key::varcharASproperty_name,CASEWHENevent_param_double_valueISNOTNULLTHENCAST(event_param_double_valueASvarchar)WHENevent_param_float_valueISNOTNULLTHENCAST(event_param_float_valueASvarchar)WHENevent_param_int_valueISNOTNULLTHENCAST(event_param_int_valueASvarchar)WHENevent_param_string_valueISNOTNULLTHENevent_param_string_valueENDASproperty_value,CASEWHENevent_param_double_valueISNOTNULLTHEN\'double\'WHENevent_param_float_valueISNOTNULLTHEN\'float\'WHENevent_param_int_valueISNOTNULLTHEN\'int\'WHENevent_param_string_valueISNOTNULLTHEN\'string\'ENDASvalue_type,event.platformASplatformFROMapp1.event_parameterparameterJOINapp1.eventeventONparameter.event_timestamp=event.event_timestampANDparameter.event_id=event.event_idWHEREproperty_nameNOTLIKE\'%timestamp%\'ANDparameter.event_timestamp>=EXTRACT(epochFROMDATE_TRUNC(\'day\',GETDATE()-INTERVAL\'1day\'*day_range)::timestamp)*1000::bigintANDparameter.event_timestamp<EXTRACT(epochFROMDATE_TRUNC(\'day\',GETDATE())::timestamp)*1000::bigint);CALLapp1.sp_clickstream_log(log_name,\'info\',\'Insertdataintoproperties_temp_tabletablesuccessfully.\');INSERTINTOapp1.event_properties_metadata(id,month,prefix,project_id,app_id,day_number,category,event_name,property_name,value_type,value_enum,platform)SELECTproject_id||\'#\'||app_info_app_id||\'#\'||event_name||\'#\'||property_name||\'#\'||value_typeASid,month,\'EVENT_PARAMETER#\'||project_id||\'#\'||app_info_app_idASprefix,project_id,app_info_app_idASapp_id,day_number,property_categoryAScategory,event_name,property_name,value_type,property_valuesASvalue_enum,platformFROM(SELECTevent_name,project_id,app_info_app_id,property_category,month,day_number,property_name,value_type,LISTAGG(property_value||\'_\'||parameter_count,\'#\')WITHINGROUP(ORDERBYproperty_value)asproperty_values,platformFROM(SELECTevent_name,project_id,app_info_app_id,property_category,month,day_number,property_name,property_value,value_type,parameter_count,platformFROM(SELECTevent_name,project_id,app_info_app_id,property_category,month,day_number,property_name,property_value,value_type,parameter_count,platform,ROW_NUMBER()OVER(PARTITIONBYevent_name,project_id,app_info_app_id,property_category,month,day_number,property_name,value_type,platformORDERBYparameter_countDESC)ASrow_numFROM(SELECTevent_name,project_id,app_info_app_id,property_category,\'#\'||TO_CHAR(TIMESTAMP\'epoch\'+(event_timestamp/1000.0)*INTERVAL\'1second\',\'YYYYMM\')ASmonth,EXTRACT(DAYFROMTIMESTAMP\'epoch\'+(event_timestamp/1000.0)*INTERVAL\'1second\')ASday_number,property_name,property_value,value_type,LISTAGG(DISTINCTplatform,\'#\')WITHINGROUP(ORDERBYplatform)ASplatform,count(*)ASparameter_countFROMproperties_temp_tableWHEREproperty_valueISNOTNULLANDproperty_value!=\'\'GROUPBYevent_name,project_id,app_info_app_id,property_category,month,day_number,property_name,property_value,value_type))WHERErow_num<=top_frequent_properties_limitOR(event_name=\'_page_view\'ANDproperty_nameIN(\'_page_title\',\'_page_url\'))OR(event_name=\'_screen_view\'ANDproperty_nameIN(\'_screen_name\',\'_screen_id\')))GROUPBYevent_name,project_id,app_info_app_id,property_category,month,day_number,property_name,value_type,platform);CALLapp1.sp_clickstream_log(log_name,\'info\',\'Insertallparametersdataintoevent_properties_metadatatablesuccessfully.\');query:=\'SELECTcolumn_nameFROMuser_column_temp_table\';FORrecINEXECUTEqueryLOOPEXECUTE\'INSERTINTOuser_attribute_temp_table(SELECTuser_id,event_timestamp,\'\'user_outer\'\'ASproperty_category,\'\'\'||quote_ident(rec.column_name)||\'\'\'ASproperty_name,\'||quote_ident(rec.column_name)||\'::varcharASproperty_value,\'\'String\'\'ASvalue_typeFROMapp1.user)\';ENDLOOP;INSERTINTOuser_attribute_temp_table(SELECTuser_id,event_timestamp,\'user\'ASproperty_category,user_properties.key::varcharASproperty_name,coalesce(nullif(user_properties.value.string_value::varchar,\'\'),nullif(user_properties.value.int_value::varchar,\'\'),nullif(user_properties.value.float_value::varchar,\'\'),nullif(user_properties.value.double_value::varchar,\'\'))ASproperty_value,CASEWHENuser_properties.value.string_value::varcharISNOTNULLTHEN\'string\'WHENuser_properties.value.int_value::varcharISNOTNULLTHEN\'int\'WHENuser_properties.value.float_value::varcharISNOTNULLTHEN\'float\'WHENuser_properties.value.double_value::varcharISNOTNULLTHEN\'double\'ELSE\'None\'ENDASvalue_typeFROMapp1.useru,u.user_propertiesASuser_properties);--userattributeINSERTINTOapp1.user_attribute_metadata(id,month,prefix,project_id,app_id,day_number,category,property_name,value_type,value_enum)SELECTproject_id||\'#\'||app_info_app_id||\'#\'||property_name||\'#\'||value_typeASid,month,\'USER_ATTRIBUTE#\'||project_id||\'#\'||app_info_app_idASprefix,project_idASproject_id,app_info_app_idASapp_id,day_number,\'user\'AScategory,property_nameASproperty_name,value_typeASvalue_type,property_valuesASvalue_enumFROM(SELECT\'project1\'ASproject_id,\'app1\'ASapp_info_app_id,\'#\'||TO_CHAR(CURRENT_DATE,\'YYYYMM\')ASmonth,EXTRACT(DAYFROMCURRENT_DATE)ASday_number,property_category,property_name,value_type,LISTAGG(property_value||\'_\'||parameter_count,\'#\')WITHINGROUP(ORDERBYproperty_value)asproperty_valuesFROM(SELECTproperty_category,property_name,property_value,value_type,count(*)ASparameter_countFROM(SELECT*,ROW_NUMBER()OVER(PARTITIONBYuser_idORDERBYevent_timestampDESC)ASrankFROMuser_attribute_temp_table)WHEREproperty_nameNOTLIKE\'%timestamp%\'ANDrank=1ANDproperty_valueISNOTNULLANDproperty_value!=\'\'GROUPBYproperty_category,property_name,property_value,value_type)GROUPBYproject_id,app_info_app_id,month,day_number,property_category,property_name,value_type);CALLapp1.sp_clickstream_log(log_name,\'info\',\'Insertalluserattributedataintouser_attribute_metadatatablesuccessfully.\');INSERTINTOapp1.event_metadata(id,month,prefix,project_id,app_id,day_number,count,event_name,platform)SELECTproject_id||\'#\'||app_info_app_id||\'#\'||event_nameASid,month,\'EVENT#\'||project_id||\'#\'||app_info_app_idASprefix,project_idASproject_id,app_info_app_idASapp_id,day_number,count,event_nameASevent_name,platformASplatformFROM(SELECTevent_name,project_id,app_info.app_id::varcharASapp_info_app_id,\'#\'||TO_CHAR(TIMESTAMP\'epoch\'+(event_timestamp/1000.0)*INTERVAL\'1second\',\'YYYYMM\')ASmonth,EXTRACT(DAYFROMTIMESTAMP\'epoch\'+(event_timestamp/1000.0)*INTERVAL\'1second\')ASday_number,LISTAGG(DISTINCTplatform,\'#\')WITHINGROUP(ORDERBYplatform)ASplatform,count(*)ascountFROMapp1.eventWHEREevent_timestamp>=EXTRACT(epochFROMDATE_TRUNC(\'day\',GETDATE()-INTERVAL\'1day\'*day_range)::timestamp)*1000::bigintANDevent_timestamp<EXTRACT(epochFROMDATE_TRUNC(\'day\',GETDATE())::timestamp)*1000::bigintANDevent_name!=\'_\'GROUPBYevent_name,project_id,app_info_app_id,month,day_number);CALLapp1.sp_clickstream_log(log_name,\'info\',\'Insertalleventdataintoevent_metadatatablesuccessfully.\');EXCEPTIONWHENOTHERSTHENCALLapp1.sp_clickstream_log(log_name,\'error\',\'errormessage:\'||SQLERRM);END;$$LANGUAGEplpgsql;CREATEORREPLACEPROCEDUREapp1.sp_clear_expired_events(retention_range_daysinint)NONATOMICAS$$DECLARErecord_numberINT;ods_tbl_namevarchar(50):=\'app1.ods_events\';latest_timestamp_record1RECORD;latest_timestamp_record2RECORD;log_namevarchar(50):=\'sp_clear_expired_events\';BEGIN--cleantable_ods_eventsEXECUTE\'SELECTevent_timestampFROMapp1.ods_eventsORDERBYevent_timestampDESCLIMIT1\'INTOlatest_timestamp_record1;CALLapp1.sp_clickstream_log_non_atomic(log_name,\'info\',\'getevent_timestamp=\'||latest_timestamp_record1.event_timestamp||\'fromapp1.ods_events\');IFlatest_timestamp_record1.event_timestampisnullTHENCALLapp1.sp_clickstream_log_non_atomic(log_name,\'info\',\'noevent_timestampfoundinapp1.ods_events\');ELSEDELETEFROMapp1.ods_eventsWHEREevent_date<DATEADD(day,-retention_range_days,CAST(TIMESTAMP\'epoch\'+(latest_timestamp_record1.event_timestamp/1000)*INTERVAL\'1second\'asdate));GETDIAGNOSTICSrecord_number:=ROW_COUNT;CALLapp1.sp_clickstream_log_non_atomic(log_name,\'info\',\'delete\'||record_number||\'expiredrecordsfromapp1.eventforretention_range_days=\'||retention_range_days);ANALYZEapp1.ods_events;ENDIF;--cleantable_eventandtable_event_parameterEXECUTE\'SELECTevent_timestampFROMapp1.eventORDERBYevent_timestampDESCLIMIT1\'INTOlatest_timestamp_record2;CALLapp1.sp_clickstream_log_non_atomic(log_name,\'info\',\'getevent_timestamp=\'||latest_timestamp_record2.event_timestamp||\'fromapp1.ods_events\');IFlatest_timestamp_record2.event_timestampisnullTHENCALLapp1.sp_clickstream_log_non_atomic(log_name,\'info\',\'noevent_timestampfoundinapp1.event\');ELSEDELETEFROMapp1.eventWHEREevent_timestamp<(latest_timestamp_record2.event_timestamp-retention_range_days*24*3600*1000);GETDIAGNOSTICSrecord_number:=ROW_COUNT;CALLapp1.sp_clickstream_log_non_atomic(log_name,\'info\',\'delete\'||record_number||\'expiredrecordsfromapp1.eventforretention_range_days=\'||retention_range_days);ANALYZEapp1.event;deleteapp1.event_parameterfromapp1.event_parametereWHEREnotexists(SELECT1fromapp1.eventpwheree.event_id=p.event_idande.event_timestamp=p.event_timestamp);GETDIAGNOSTICSrecord_number:=ROW_COUNT;CALLapp1.sp_clickstream_log_non_atomic(log_name,\'info\',\'delete\'||record_number||\'expiredrecordsfromapp1.event_parameterforretention_range_days=\'||retention_range_days);ANALYZEapp1.event_parameter;ENDIF;CALLapp1.sp_clear_item_and_user();EXCEPTIONWHENOTHERSTHENCALLapp1.sp_clickstream_log_non_atomic(log_name,\'error\',\'errormessage:\'||SQLERRM);END;$$LANGUAGEplpgsql;CREATEORREPLACEPROCEDUREapp1.sp_clear_item_and_user()NONATOMICAS$$DECLARErecord_numberINT;log_namevarchar(50):=\'sp_clear_expired_events\';BEGIN--cleantable_itemWITHitem_id_rankAS(SELECTid,ROW_NUMBER()over(partitionbyidORDERBYevent_timestampdesc)ASet_rankFROMapp1.item)deletefromapp1.itemusingitem_id_rankwhereapp1.item.id=item_id_rank.idanditem_id_rank.et_rank!=1;GETDIAGNOSTICSrecord_number:=ROW_COUNT;CALLapp1.sp_clickstream_log_non_atomic(log_name,\'info\',\'delete\'||record_number||\'fromapp1.item\');ANALYZEapp1.item;--cleantable_userWITHuser_id_rankAS(SELECTuser_id,ROW_NUMBER()over(partitionbyuser_idORDERBYevent_timestampdesc)ASet_rankFROMapp1.user)deletefromapp1.userusinguser_id_rankwhereapp1.user.user_id=user_id_rank.user_idanduser_id_rank.et_rank!=1;GETDIAGNOSTICSrecord_number:=ROW_COUNT;CALLapp1.sp_clickstream_log_non_atomic(log_name,\'info\',\'delete\'||record_number||\'fromapp1.user\');ANALYZEapp1.user;EXCEPTIONWHENOTHERSTHENCALLapp1.sp_clickstream_log_non_atomic(log_name,\'error\',\'errormessage:\'||SQLERRM);END;$$LANGUAGEplpgsql;';
  const sql3 = 'CREATEMATERIALIZEDVIEWapp2.clickstream_event_viewBACKUPNOSORTKEY(event_date)AUTOREFRESHYESASselectevent_date,event_name,event_id,event_bundle_sequence_id::bigintasevent_bundle_sequence_id,event_previous_timestamp::bigintasevent_previous_timestamp,event_timestamp,event_value_in_usd,app_info.app_id::varcharasapp_info_app_id,app_info.id::varcharasapp_info_package_id,app_info.install_source::varcharasapp_info_install_source,app_info.version::varcharasapp_info_version,device.vendor_id::varcharasdevice_id,device.mobile_brand_name::varcharasdevice_mobile_brand_name,device.mobile_model_name::varcharasdevice_mobile_model_name,device.manufacturer::varcharasdevice_manufacturer,device.screen_width::bigintasdevice_screen_width,device.screen_height::bigintasdevice_screen_height,device.carrier::varcharasdevice_carrier,device.network_type::varcharasdevice_network_type,device.operating_system::varcharasdevice_operating_system,device.operating_system_version::varcharasdevice_operating_system_version,device.ua_browser::varchar,device.ua_browser_version::varchar,device.ua_os::varchar,device.ua_os_version::varchar,device.ua_device::varchar,device.ua_device_category::varchar,device.system_language::varcharasdevice_system_language,device.time_zone_offset_seconds::bigintasdevice_time_zone_offset_seconds,geo.continent::varcharasgeo_continent,geo.country::varcharasgeo_country,geo.city::varcharasgeo_city,geo.metro::varcharasgeo_metro,geo.region::varcharasgeo_region,geo.sub_continent::varcharasgeo_sub_continent,geo.locale::varcharasgeo_locale,platform,project_id,traffic_source.name::varcharastraffic_source_name,traffic_source.medium::varcharastraffic_source_medium,traffic_source.source::varcharastraffic_source_source,event.user_id,event.user_pseudo_id,u.user_first_touch_timestampfromapp2.eventleftjoin(select*from(selectuser_pseudo_id,user_first_touch_timestamp,ROW_NUMBER()over(partitionbyuser_pseudo_idORDERBYevent_timestampdesc)ASet_rankfromapp2.user)whereet_rank=1)asuonevent.user_pseudo_id=u.user_pseudo_id;CREATEMATERIALIZEDVIEWapp2.clickstream_event_parameter_viewBACKUPNOSORTKEY(event_date,event_name)AUTOREFRESHYESASselectevent.event_id,event.event_name,event.event_date,event.platform,event.user_id,event.user_pseudo_id,event.event_timestamp,event_parameter.event_param_key,event_parameter.event_param_double_value,event_parameter.event_param_float_value,event_parameter.event_param_int_value,event_parameter.event_param_string_valuefromapp2.eventjoinapp2.event_parameteronevent.event_timestamp=event_parameter.event_timestampandevent.event_id=event_parameter.event_id;CREATEMATERIALIZEDVIEWapp2.clickstream_lifecycle_daily_viewBACKUPNOAUTOREFRESHYESASwithdaily_usageas(selectuser_pseudo_id,DATE_TRUNC(\'day\',dateadd(ms,event_timestamp,\'1970-01-01\'))astime_periodfromapp2.eventwhereevent_name=\'_session_start\'groupby1,2orderby1,2),--detectiflagandleadexistslag_leadas(selectuser_pseudo_id,time_period,lag(time_period,1)over(partitionbyuser_pseudo_idorderbyuser_pseudo_id,time_period),lead(time_period,1)over(partitionbyuser_pseudo_idorderbyuser_pseudo_id,time_period)fromdaily_usage),--caculatelagandleadsizelag_lead_with_diffsas(selectuser_pseudo_id,time_period,lag,lead,datediff(day,lag,time_period)lag_size,datediff(day,time_period,lead)lead_sizefromlag_lead),--casetolifecyclestagecalculatedas(selecttime_period,casewhenlagisnullthen\'1-NEW\'whenlag_size=1then\'2-ACTIVE\'whenlag_size>1then\'3-RETURN\'endasthis_day_value,casewhen(lead_size>1ORlead_sizeISNULL)then\'0-CHURN\'elseNULLendasnext_day_churn,count(distinctuser_pseudo_id)fromlag_lead_with_diffsgroupby1,2,3)selecttime_period,this_day_value,sum(count)fromcalculatedgroupby1,2unionselecttime_period+1,\'0-CHURN\',-1*sum(count)fromcalculatedwherenext_day_churnisnotnullgroupby1,2;CREATEMATERIALIZEDVIEWapp2.clickstream_lifecycle_weekly_viewBACKUPNOAUTOREFRESHYESASwithweekly_usageas(selectuser_pseudo_id,DATE_TRUNC(\'week\',dateadd(ms,event_timestamp,\'1970-01-01\'))astime_periodfromapp2.eventwhereevent_name=\'_session_start\'groupby1,2orderby1,2),--detectiflagandleadexistslag_leadas(selectuser_pseudo_id,time_period,lag(time_period,1)over(partitionbyuser_pseudo_idorderbyuser_pseudo_id,time_period),lead(time_period,1)over(partitionbyuser_pseudo_idorderbyuser_pseudo_id,time_period)fromweekly_usage),--caculatelagandleadsizelag_lead_with_diffsas(selectuser_pseudo_id,time_period,lag,lead,datediff(week,lag,time_period)lag_size,datediff(week,time_period,lead)lead_sizefromlag_lead),--casetolifecyclestagecalculatedas(selecttime_period,casewhenlagisnullthen\'1-NEW\'whenlag_size=1then\'2-ACTIVE\'whenlag_size>1then\'3-RETURN\'endasthis_week_value,casewhen(lead_size>1ORlead_sizeISNULL)then\'0-CHURN\'elseNULLendasnext_week_churn,count(distinctuser_pseudo_id)fromlag_lead_with_diffsgroupby1,2,3)selecttime_period,this_week_value,sum(count)fromcalculatedgroupby1,2unionselecttime_period+7,\'0-CHURN\',-1*sum(count)fromcalculatedwherenext_week_churnisnotnullgroupby1,2;CREATEMATERIALIZEDVIEWapp2.clickstream_user_dim_mv_1BACKUPNOSORTKEY(first_visit_date)AUTOREFRESHYESASSELECTuser_pseudo_id,event_dateasfirst_visit_date,app_info.install_source::varcharasfirst_visit_install_source,device.system_language::varcharasfirst_visit_device_language,platformasfirst_platform,geo.country::varcharasfirst_visit_country,geo.city::varcharasfirst_visit_city,(casewhennullif(traffic_source.source::varchar,\'\')isnullthen\'(direct)\'elsetraffic_source.source::varcharend)asfirst_traffic_source_source,traffic_source.medium::varcharasfirst_traffic_source_medium,traffic_source.name::varcharasfirst_traffic_source_namefromapp2.eventwhereevent_namein(\'_first_open\',\'_first_visit\');--recomputerefreshCREATEMATERIALIZEDVIEWapp2.clickstream_user_dim_mv_2BACKUPNOSORTKEY(user_pseudo_id)AUTOREFRESHYESASselectuser_pseudo_id,count(distinctuser_id)asuser_id_countfromapp2.eventwhereevent_namenotin(\'_first_open\',\'_first_visit\')groupby1;CREATEORREPLACEVIEWapp2.clickstream_user_dim_viewASSELECTupid.*,(casewhenuid.user_id_count>0then\'Registered\'else\'Non-registered\'end)asis_registeredfromapp2.clickstream_user_dim_mv_1asupidleftouterjoinapp2.clickstream_user_dim_mv_2asuidonupid.user_pseudo_id=uid.user_pseudo_id;CREATEMATERIALIZEDVIEWapp2.clickstream_session_viewBACKUPNOSORTKEY(session_date)AUTOREFRESHYESASWITHbase_dataAS(SELECTevent.event_id,event.event_name,event.event_date,event.platform,event.user_id,event.user_pseudo_id,event.event_timestamp,event_parameter.event_param_key,event_parameter.event_param_double_value,event_parameter.event_param_float_value,event_parameter.event_param_int_value,event_parameter.event_param_string_valueFROMapp2.eventJOINapp2.event_parameterONevent.event_timestamp=event_parameter.event_timestampANDevent.event_id=event_parameter.event_id),session_part_1AS(SELECTes.session_id::VARCHAR,user_pseudo_id,platform,MAX(session_duration)ASsession_duration,(CASEWHEN(MAX(session_duration)>10000ORSUM(view)>1)THEN1ELSE0END)ASengaged_session,(CASEWHEN(MAX(session_duration)>10000ORSUM(view)>1)THEN0ELSE1END)ASbounced_session,MIN(session_st)ASsession_start_timestamp,SUM(view)ASsession_views,SUM(engagement_time)ASsession_engagement_timeFROM(SELECTuser_pseudo_id,event_id,platform,MAX(CASEWHENevent_param_key=\'_session_id\'THENevent_param_string_valueELSENULLEND)ASsession_id,MAX(CASEWHENevent_param_key=\'_session_duration\'THENevent_param_int_valueELSENULLEND)ASsession_duration,MAX(CASEWHENevent_param_key=\'_session_start_timestamp\'THENevent_param_int_valueELSENULLEND)ASsession_st,MAX(CASEWHENevent_param_key=\'_engagement_time_msec\'THENevent_param_int_valueELSENULLEND)ASengagement_time,(CASEWHENMAX(event_name)IN(\'_screen_view\',\'_page_view\')THEN1ELSE0END)ASviewFROMbase_dataGROUPBY1,2,3)ASesGROUPBY1,2,3),session_part_2AS(SELECTsession_id,first_sv_event_id,last_sv_event_id,COUNT(event_id)FROM(SELECTsession_id::VARCHAR,event_id,FIRST_VALUE(event_id)OVER(PARTITIONBYsession_idORDERBYevent_timestampASCROWSBETWEENUNBOUNDEDPRECEDINGANDUNBOUNDEDFOLLOWING)ASfirst_sv_event_id,LAST_VALUE(event_id)OVER(PARTITIONBYsession_idORDERBYevent_timestampASCROWSBETWEENUNBOUNDEDPRECEDINGANDUNBOUNDEDFOLLOWING)ASlast_sv_event_idFROM(SELECTevent_name,event_id,event_timestamp,MAX(CASEWHENevent_param_key=\'_session_id\'THENevent_param_string_valueELSENULLEND)ASsession_idFROMbase_dataWHEREevent_nameIN(\'_screen_view\',\'_page_view\')GROUPBY1,2,3))GROUPBY1,2,3),tmp_dataAS(SELECTevent_id,MAX(CASEWHEN(event_param_key=\'_screen_name\'ORevent_param_key=\'_page_title\')THENevent_param_string_valueELSENULLEND)ASviewFROMbase_dataGROUPBY1),session_f_sv_viewAS(SELECTsession_f_l_sv.*,t.viewASfirst_sv_viewFROMsession_part_2ASsession_f_l_svLEFTOUTERJOINtmp_datatONsession_f_l_sv.first_sv_event_id=t.event_id),session_f_l_sv_viewAS(SELECTsession_f_sv_view.*,t.viewASlast_sv_viewFROMsession_f_sv_viewLEFTOUTERJOINtmp_datatONsession_f_sv_view.last_sv_event_id=t.event_id)SELECTCASEWHENsession.session_idISNULLTHENCAST(\'#\'ASVARCHAR)WHENsession.session_id=\'\'THENCAST(\'#\'ASVARCHAR)ELSEsession.session_idENDASsession_id,user_pseudo_id,platform,session_duration::BIGINT,session_views::BIGINT,engaged_session::BIGINT,bounced_session,session_start_timestamp,CASEWHENsession.session_engagement_timeISNULLTHENCAST(0ASBIGINT)ELSEsession.session_engagement_timeEND::BIGINTASsession_engagement_time,DATE_TRUNC(\'day\',TIMESTAMP\'epoch\'+session_start_timestamp/1000*INTERVAL\'1second\')ASsession_date,DATE_TRUNC(\'hour\',TIMESTAMP\'epoch\'+session_start_timestamp/1000*INTERVAL\'1second\')ASsession_date_hour,first_sv_view::VARCHARASentry_view,last_sv_view::VARCHARASexit_viewFROMsession_part_1ASsessionLEFTOUTERJOINsession_f_l_sv_viewONsession.session_id=session_f_l_sv_view.session_id;CREATEMATERIALIZEDVIEWapp2.clickstream_device_viewBACKUPNOSORTKEY(event_date)AUTOREFRESHYESASselectdevice.vendor_id::varcharasdevice_id,event_date,device.mobile_brand_name::varchar,device.mobile_model_name::varchar,device.manufacturer::varchar,device.screen_width::int,device.screen_height::int,device.carrier::varchar,device.network_type::varchar,device.operating_system::varchar,device.operating_system_version::varchar,device.ua_browser::varchar,device.ua_browser_version::varchar,device.ua_os::varchar,device.ua_os_version::varchar,device.ua_device::varchar,device.ua_device_category::varchar,device.system_language::varchar,device.time_zone_offset_seconds::int,device.advertising_id::varchar,user_pseudo_id,user_id,count(event_id)asusage_num--pleaesupdatethefollowingschemanamewithyourschemanamefromapp2.eventgroupbydevice_id,event_date,device.mobile_brand_name,device.mobile_model_name,device.manufacturer,device.screen_width,device.screen_height,device.carrier,device.network_type,device.operating_system,device.operating_system_version,device.ua_browser,device.ua_browser_version,device.ua_os,device.ua_os_version,device.ua_device,device.ua_device_category,device.system_language,device.time_zone_offset_seconds,device.advertising_id,user_pseudo_id,user_id;CREATEMATERIALIZEDVIEWapp2.clickstream_retention_viewBACKUPNOSORTKEY(first_date)AUTOREFRESHYESASWITHuser_first_dateAS(SELECTuser_pseudo_id,min(event_date)asfirst_dateFROMapp2.eventGROUPBYuser_pseudo_id),retention_dataAS(SELECTuser_pseudo_id,first_date,DATE_DIFF(\'day\',first_date,event_date)ASday_diffFROMapp2.eventJOINuser_first_dateUSING(user_pseudo_id)),retention_countsAS(SELECTfirst_date,day_diff,COUNT(DISTINCTuser_pseudo_id)ASreturned_user_countFROMretention_dataWHEREday_diff<=42--Calculateretentionrateforthelast42daysGROUPBYfirst_date,day_diff),total_usersAS(SELECTfirst_date,COUNT(DISTINCTuser_pseudo_id)AStotal_usersFROMuser_first_dategroupby1),retention_rateAS(SELECTfirst_date,day_diff,returned_user_count,total_usersFROMretention_countsjointotal_usersusing(first_date))SELECT*FROMretention_rate;CREATEORREPLACEVIEWapp2.clickstream_user_attr_viewASselectuser_id,user_pseudo_id,user_first_touch_timestamp,_first_visit_date,_first_referer,_first_traffic_source_type,_first_traffic_medium,_first_traffic_source,device_id_list,_channel,eu.key::varcharascustom_attr_key,coalesce(nullif(eu.value.string_value::varchar,\'\'),nullif(eu.value.int_value::varchar,\'\'),nullif(eu.value.float_value::varchar,\'\'),nullif(eu.value.double_value::varchar,\'\'))ascustom_attr_valuefromapp2.user_m_viewu,u.user_propertieseu;GRANTSELECTONapp2.clickstream_event_viewTOclickstream_report_user_abcde;GRANTSELECTONapp2.clickstream_event_parameter_viewTOclickstream_report_user_abcde;GRANTSELECTONapp2.clickstream_lifecycle_daily_viewTOclickstream_report_user_abcde;GRANTSELECTONapp2.clickstream_lifecycle_weekly_viewTOclickstream_report_user_abcde;GRANTSELECTONapp2.clickstream_user_dim_mv_1TOclickstream_report_user_abcde;GRANTSELECTONapp2.clickstream_user_dim_mv_2TOclickstream_report_user_abcde;GRANTSELECTONapp2.clickstream_user_dim_viewTOclickstream_report_user_abcde;GRANTSELECTONapp2.clickstream_session_viewTOclickstream_report_user_abcde;GRANTSELECTONapp2.clickstream_device_viewTOclickstream_report_user_abcde;GRANTSELECTONapp2.clickstream_retention_viewTOclickstream_report_user_abcde;GRANTSELECTONapp2.clickstream_user_attr_viewTOclickstream_report_user_abcde;';
  const sql4 = 'CREATEORREPLACEVIEWapp1.clickstream_user_dim_viewASSELECTupid.*,(casewhenuid.user_id_count>0then\'Registered\'else\'Non-registered\'end)asis_registeredfromapp1.clickstream_user_dim_mv_1asupidleftouterjoinapp1.clickstream_user_dim_mv_2asuidonupid.user_pseudo_id=uid.user_pseudo_id;CREATEMATERIALIZEDVIEWapp1.clickstream_session_viewBACKUPNOSORTKEY(session_date)AUTOREFRESHYESASWITHbase_dataAS(SELECTevent.event_id,event.event_name,event.event_date,event.platform,event.user_id,event.user_pseudo_id,event.event_timestamp,event_parameter.event_param_key,event_parameter.event_param_double_value,event_parameter.event_param_float_value,event_parameter.event_param_int_value,event_parameter.event_param_string_valueFROMapp1.eventJOINapp1.event_parameterONevent.event_timestamp=event_parameter.event_timestampANDevent.event_id=event_parameter.event_id),session_part_1AS(SELECTes.session_id::VARCHAR,user_pseudo_id,platform,MAX(session_duration)ASsession_duration,(CASEWHEN(MAX(session_duration)>10000ORSUM(view)>1)THEN1ELSE0END)ASengaged_session,(CASEWHEN(MAX(session_duration)>10000ORSUM(view)>1)THEN0ELSE1END)ASbounced_session,MIN(session_st)ASsession_start_timestamp,SUM(view)ASsession_views,SUM(engagement_time)ASsession_engagement_timeFROM(SELECTuser_pseudo_id,event_id,platform,MAX(CASEWHENevent_param_key=\'_session_id\'THENevent_param_string_valueELSENULLEND)ASsession_id,MAX(CASEWHENevent_param_key=\'_session_duration\'THENevent_param_int_valueELSENULLEND)ASsession_duration,MAX(CASEWHENevent_param_key=\'_session_start_timestamp\'THENevent_param_int_valueELSENULLEND)ASsession_st,MAX(CASEWHENevent_param_key=\'_engagement_time_msec\'THENevent_param_int_valueELSENULLEND)ASengagement_time,(CASEWHENMAX(event_name)IN(\'_screen_view\',\'_page_view\')THEN1ELSE0END)ASviewFROMbase_dataGROUPBY1,2,3)ASesGROUPBY1,2,3),session_part_2AS(SELECTsession_id,first_sv_event_id,last_sv_event_id,COUNT(event_id)FROM(SELECTsession_id::VARCHAR,event_id,FIRST_VALUE(event_id)OVER(PARTITIONBYsession_idORDERBYevent_timestampASCROWSBETWEENUNBOUNDEDPRECEDINGANDUNBOUNDEDFOLLOWING)ASfirst_sv_event_id,LAST_VALUE(event_id)OVER(PARTITIONBYsession_idORDERBYevent_timestampASCROWSBETWEENUNBOUNDEDPRECEDINGANDUNBOUNDEDFOLLOWING)ASlast_sv_event_idFROM(SELECTevent_name,event_id,event_timestamp,MAX(CASEWHENevent_param_key=\'_session_id\'THENevent_param_string_valueELSENULLEND)ASsession_idFROMbase_dataWHEREevent_nameIN(\'_screen_view\',\'_page_view\')GROUPBY1,2,3))GROUPBY1,2,3),tmp_dataAS(SELECTevent_id,MAX(CASEWHEN(event_param_key=\'_screen_name\'ORevent_param_key=\'_page_title\')THENevent_param_string_valueELSENULLEND)ASviewFROMbase_dataGROUPBY1),session_f_sv_viewAS(SELECTsession_f_l_sv.*,t.viewASfirst_sv_viewFROMsession_part_2ASsession_f_l_svLEFTOUTERJOINtmp_datatONsession_f_l_sv.first_sv_event_id=t.event_id),session_f_l_sv_viewAS(SELECTsession_f_sv_view.*,t.viewASlast_sv_viewFROMsession_f_sv_viewLEFTOUTERJOINtmp_datatONsession_f_sv_view.last_sv_event_id=t.event_id)SELECTCASEWHENsession.session_idISNULLTHENCAST(\'#\'ASVARCHAR)WHENsession.session_id=\'\'THENCAST(\'#\'ASVARCHAR)ELSEsession.session_idENDASsession_id,user_pseudo_id,platform,session_duration::BIGINT,session_views::BIGINT,engaged_session::BIGINT,bounced_session,session_start_timestamp,CASEWHENsession.session_engagement_timeISNULLTHENCAST(0ASBIGINT)ELSEsession.session_engagement_timeEND::BIGINTASsession_engagement_time,DATE_TRUNC(\'day\',TIMESTAMP\'epoch\'+session_start_timestamp/1000*INTERVAL\'1second\')ASsession_date,DATE_TRUNC(\'hour\',TIMESTAMP\'epoch\'+session_start_timestamp/1000*INTERVAL\'1second\')ASsession_date_hour,first_sv_view::VARCHARASentry_view,last_sv_view::VARCHARASexit_viewFROMsession_part_1ASsessionLEFTOUTERJOINsession_f_l_sv_viewONsession.session_id=session_f_l_sv_view.session_id;GRANTSELECTONapp1.clickstream_event_viewTOclickstream_report_user_abcde;GRANTSELECTONapp1.clickstream_event_parameter_viewTOclickstream_report_user_abcde;GRANTSELECTONapp1.clickstream_lifecycle_daily_viewTOclickstream_report_user_abcde;GRANTSELECTONapp1.clickstream_lifecycle_weekly_viewTOclickstream_report_user_abcde;GRANTSELECTONapp1.clickstream_user_dim_mv_1TOclickstream_report_user_abcde;GRANTSELECTONapp1.clickstream_user_dim_mv_2TOclickstream_report_user_abcde;GRANTSELECTONapp1.clickstream_user_dim_viewTOclickstream_report_user_abcde;GRANTSELECTONapp1.clickstream_session_viewTOclickstream_report_user_abcde;GRANTSELECTONapp1.clickstream_device_viewTOclickstream_report_user_abcde;GRANTSELECTONapp1.clickstream_retention_viewTOclickstream_report_user_abcde;GRANTSELECTONapp1.clickstream_user_attr_viewTOclickstream_report_user_abcde;';

  test('Validate sqls when update schema', async () => {
    smMock.onAnyCommand().resolves({});
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });
    redshiftDataMock.on(BatchExecuteStatementCommand).callsFakeOnce(input => {
      let sqls = input.Sqls.join('').replace(/\n/g, '').replace(/\t/g, '').replace(/ /g, '');
      if (sql1 !== sqls) {
        throw new Error('create schema sqls are not expected');
      }

      return { Id: 'Id-1' };
    }).callsFakeOnce(input => {
      let sqls = input.Sqls.join('').replace(/\n/g, '').replace(/\t/g, '').replace(/ /g, '');
      if (sql2 !== sqls) {
        throw new Error('update schema sqls are not expected');
      }

      return { Id: 'Id-1' };
    }).callsFakeOnce(input => {
      let sqls = input.Sqls.join('').replace(/\n/g, '').replace(/\t/g, '').replace(/ /g, '');
      if (sql3 !== sqls) {
        throw new Error('create report view sqls are not expected');
      }

      return { Id: 'Id-1' };
    }).callsFakeOnce(input => {
      let sqls = input.Sqls.join('').replace(/\n/g, '').replace(/\t/g, '').replace(/ /g, '');
      if (sql4 !== sqls) {
        throw new Error('update report view sqls are not expected');
      }

      return { Id: 'Id-1' };
    }).resolves({ Id: 'Id-2' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(updateServerlessEvent3, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 4);

  });

  test('Updated schemas and views only in Redshift serverless in update stack from empty appIds', async () => {
    smMock.onAnyCommand().resolves({});
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });
    redshiftDataMock.on(BatchExecuteStatementCommand).callsFakeOnce(input => {
      console.log(`Sql-4 is ${JSON.stringify(input.Sqls)}`);
      const sqlStr = input.Sqls.join(';\n');
      if (input as BatchExecuteStatementCommandInput) {
        if (sqlStr.includes('CREATE SCHEMA IF NOT EXISTS app2')
          && sqlStr.includes(`CREATE TABLE IF NOT EXISTS app2.${TABLE_NAME_ODS_EVENT}(`)) {
          return { Id: 'Id-1' };
        }
      }
      throw new Error('Sql-4 are not expected');
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
        `ALTER DEFAULT PRIVILEGES IN SCHEMA app2 GRANT SELECT ON TABLES TO ${biUserNamePrefix}abcde`,
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
        console.log(`Sql-5-1 is ${JSON.stringify(input.Sqls)}`);
        const sqlStr = input.Sqls.join(';\n');

        if (input as BatchExecuteStatementCommandInput) {
          if (!sqlStr.includes('app1.')
            && sqlStr.includes('CREATE SCHEMA IF NOT EXISTS app2')
            && sqlStr.includes(`CREATE TABLE IF NOT EXISTS app2.${TABLE_NAME_EVENT_PARAMETER}(`)
            && sqlStr.includes('CREATE OR REPLACE PROCEDURE app2.sp_clickstream_log_non_atomic')

          ) {
            return { Id: 'Id-1-1' };
          }
        }
        throw new Error('Sql-5-1 are not expected');
      }).callsFakeOnce(input => {
        console.log(`Sql-5-2 is ${JSON.stringify(input.Sqls)}`);
        const sqlStr = input.Sqls.join(';\n');

        if (input as BatchExecuteStatementCommandInput) {
          if (!sqlStr.includes('app2.')
            && sqlStr.includes('CREATE SCHEMA IF NOT EXISTS app1')
            && sqlStr.includes(`CREATE TABLE IF NOT EXISTS app1.${TABLE_NAME_EVENT_PARAMETER}`)
            && sqlStr.includes('CREATE OR REPLACE PROCEDURE app1.sp_clickstream_log_non_atomic')
          ) {
            return { Id: 'Id-1-2' };
          }
        }
        throw new Error('Sql-5-2 are not expected');
      }).resolves({ Id: 'Id-2' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });

    const resp = await handler(updateAdditionalProvisionedEvent, context, callback) as CdkCustomResourceResponse;

    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 4);
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, BatchExecuteStatementCommand, {
      WorkgroupName: undefined,
      Database: projectDBName,
      ClusterIdentifier: clusterId,
      DbUser: dbUser,
    });
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 4);
  });

  console.log(updateServerlessEvent + '' + updateServerlessEvent2 + updateAdditionalProvisionedEvent);
  test('Updated schemas and views in Redshift provisioned cluster with updatable/new added view/schema table', async () => {
    redshiftDataMock
      .callsFakeOnce(input => {
        if (input as BatchExecuteStatementCommandInput) {
          console.log(`Sql-7 is ${JSON.stringify(input.Sqls)}`);
          const sqlStr = input.Sqls.join(';\n');
          if (sqlStr.includes('CREATE SCHEMA IF NOT EXISTS app2')
            && sqlStr.includes('CREATE TABLE IF NOT EXISTS app2.clickstream_log')
            && sqlStr.includes(`CREATE TABLE IF NOT EXISTS app2.${TABLE_NAME_EVENT_PARAMETER}`)
            && sqlStr.includes('CREATE OR REPLACE PROCEDURE app2.sp_clickstream_log_non_atomic')
            && !sqlStr.includes('app1.')

          ) {
            return { Id: 'Id-1-1' };
          }
        }
        throw new Error('Sql-7 are not expected');
      })
      .callsFakeOnce(input => {
        console.log(`Sql-8 is ${JSON.stringify(input.Sqls)}`);
        const sqlStr = input.Sqls.join(';\n');

        if (input as BatchExecuteStatementCommandInput) {
          if (sqlStr.includes('CREATE MATERIALIZED VIEW app2.user_m_view')
            && sqlStr.includes('CREATE MATERIALIZED VIEW app2.item_m_view')
            && !sqlStr.includes('app1.')
          ) {
            return { Id: 'Id-2-2' };
          }
        }
        throw new Error('Sql-8 are not expected');
      })
      .callsFakeOnce(input => {
        console.log(`Sql-9 is ${JSON.stringify(input.Sqls)}`);
        const sqlStr = input.Sqls.join(';\n');

        if (input as BatchExecuteStatementCommandInput) {
          if ( !sqlStr.includes('app2.')) {
            return { Id: 'Id-2-3' };
          }
        }
        throw new Error('Sql-9 are not expected');
      })
      .resolves({
        Id: 'Id-2-4',
      });

    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(updateAdditionalProvisionedEvent2, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 4);
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, BatchExecuteStatementCommand, {
      WorkgroupName: undefined,
      Database: projectDBName,
      ClusterIdentifier: clusterId,
      DbUser: dbUser,
    });
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 4);
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
