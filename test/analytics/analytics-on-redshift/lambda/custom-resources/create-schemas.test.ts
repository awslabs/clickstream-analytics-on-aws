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
import { ResourcePropertiesType, TABLES_VIEWS_FOR_REPORTING, handler, physicalIdPrefix } from '../../../../../src/analytics/lambdas/custom-resource/create-schemas';
import 'aws-sdk-client-mock-jest';
import { LEGACY_REDSHIFT_ODS_EVENTS_TABLE_NAME } from '../../../../../src/analytics/private/constant';
import { ProvisionedRedshiftProps, SQLViewDef } from '../../../../../src/analytics/private/model';
import { reportingViewsDef, schemaDefs } from '../../../../../src/analytics/private/sql-def';
import { CLICKSTREAM_EVENT_VIEW_NAME, CLICKSTREAM_USER_ATTR_VIEW_NAME, TABLE_NAME_EVENT, TABLE_NAME_EVENT_PARAMETER } from '../../../../../src/common/constant';
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
      lastModifiedTime: 1699345775001,
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


  //mock upgrade from 1.0.x
  const updateServerlessEvent4: CdkCustomResourceEvent = {
    ...createServerlessEvent,
    OldResourceProperties: {
      ...basicCloudFormationEvent.ResourceProperties,
      ServiceToken: 'token-1',
      projectId: 'project1',
      odsTableNames,
      databaseName: projectDBName,
      dataAPIRole: `arn:aws:iam::1234567890:role/${roleName}`,
      redshiftBIUserParameter: '/clickstream/report/user/1111',
      redshiftBIUsernamePrefix: biUserNamePrefix,
      reportingViewsDef: [
        {
          updatable: 'false',
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
          sqlFile: 'clickstream_lifecycle_weekly_view_v1.sql',
        },
        {
          updatable: 'true',
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
      ],
      schemaDefs,
      appIds: 'app1',
      serverlessRedshiftProps: {
        workgroupName: workgroupName,
        databaseName: defaultDBName,
        dataAPIRoleArn: 'arn:aws:iam::1234567890:role/RedshiftDBUserRole',
      },
    },
    ResourceProperties: {
      ...createServerlessEvent.ResourceProperties,
      appIds: 'app1',
    },
    PhysicalResourceId: `${physicalIdPrefix}abcde`,
    RequestType: 'Update',
  };

  const newReportingView = 'clickstream_new_reporting_view_v0';
  const testReportingViewsDef2: SQLViewDef[] = reportingViewsDef.slice();
  testReportingViewsDef2.push({
    updatable: 'false',
    viewName: newReportingView,
  });

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
      reportingViewsDef: reportingViewsDef,
      schemaDefs: schemaDefs,
      appIds: 'app1',
    },
    ResourceProperties: {
      ...createProvisionedEvent.ResourceProperties,
      appIds: 'app1,app2',
      reportingViewsDef: testReportingViewsDef2,
      schemaDefs: schemaDefs,
    },
    PhysicalResourceId: 'physical-resource-id',
    RequestType: 'Update',
  };

  const defs: { [key: string]: string } = {};
  defs[`/opt/dashboard/${newReportingView}.sql`] = '';
  beforeEach(async () => {
    redshiftDataMock.reset();
    smMock.reset();
    const rootPath = __dirname + '/../../../../../src/analytics/private/sqls/redshift/';
    mockfs({
      ...(schemaDefs.reduce((acc: { [key: string]: string}, item, _index) => {
        acc[`/opt/${item.sqlFile}`] = testSqlContent(rootPath + item.sqlFile);
        return acc;
      }, {} as { [key: string]: string })),
      ...(reportingViewsDef.reduce((acc, item, _index) => {
        acc[`/opt/dashboard/${item.viewName}.sql`] = testSqlContent(`${rootPath}dashboard/${item.viewName}.sql`);
        return acc;
      }, {} as { [key: string]: string })),
      ...defs,
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
      const sqlStr = input.Sqls.join(';\n');
      if (input as BatchExecuteStatementCommandInput) {
        if (sqlStr.includes('CREATE SCHEMA IF NOT EXISTS app1')
          && sqlStr.includes(`CREATE TABLE IF NOT EXISTS app1.${LEGACY_REDSHIFT_ODS_EVENTS_TABLE_NAME}(`)) {
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
      const sqlStr = input.Sqls.join(';\n');
      if (input as BatchExecuteStatementCommandInput) {
        if (sqlStr.includes('CREATE SCHEMA IF NOT EXISTS app2')
          && sqlStr.includes(`CREATE TABLE IF NOT EXISTS app2.${LEGACY_REDSHIFT_ODS_EVENTS_TABLE_NAME}(`)
          && sqlStr.includes(`GRANT USAGE ON SCHEMA app2 TO ${biUserNamePrefix}abcde`)
          && sqlStr.includes(`ALTER DEFAULT PRIVILEGES IN SCHEMA app2 GRANT SELECT ON TABLES TO ${biUserNamePrefix}abcde`)
        ) {
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
      WorkgroupName: workgroupName,
      Database: projectDBName,
      ClusterIdentifier: undefined,
      DbUser: undefined,
    });
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 2);
  });


  test('Validate sqls when update schema', async () => {
    smMock.onAnyCommand().resolves({});
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });
    const schemaSQLForApp2Count = 1 + // create schema for new app
      schemaDefs.length;

    const schemaSQLForApp1Count = schemaDefs.filter((def) => def.updatable === 'true').length;

    const reportingSQLForApp2Count = reportingViewsDef.length * 2 + // grant to bi user one by one
      TABLES_VIEWS_FOR_REPORTING.length;

    const reportingSQLForApp1Count = reportingViewsDef.filter((def) => def.updatable === 'true').length +
      reportingViewsDef.length + // grant to bi user one by one
      TABLES_VIEWS_FOR_REPORTING.length;

    redshiftDataMock.on(BatchExecuteStatementCommand).callsFakeOnce(input => {
      console.log('input.Sqls.length-1:' + input.Sqls.length);
      const expectedSql = 'CREATE SCHEMA IF NOT EXISTS app2';
      if (input.Sqls.length !== schemaSQLForApp2Count || input.Sqls[0] !== expectedSql) {
        throw new Error('create schema sqls for app2 are not expected');
      }
      return { Id: 'Id-1' };
    }).callsFakeOnce(input => {
      console.log('input.Sqls.length-2:' + input.Sqls.length);
      const expectedSql = 'CREATE TABLE IF NOT EXISTS app1.clickstream_log';
      if (input.Sqls.length !== schemaSQLForApp1Count || !(input.Sqls[0] as string).startsWith(expectedSql)) {
        throw new Error('update schema sqls for app1 are not expected');
      }
      return { Id: 'Id-1' };

    }).callsFakeOnce(input => {
      console.log('input.Sqls.length-3:' + input.Sqls.length);
      const expectedSql = `CREATE MATERIALIZED VIEW app2.${CLICKSTREAM_EVENT_VIEW_NAME}`;
      const expectedSql2 = `GRANT SELECT ON app2.${CLICKSTREAM_USER_ATTR_VIEW_NAME} TO clickstream_report_user_abcde;`;
      const expectedSql3 = `GRANT SELECT ON app2.${TABLE_NAME_EVENT} TO clickstream_report_user_abcde;`;
      const expectedSql4 = 'GRANT SELECT ON app2.item_m_view TO clickstream_report_user_abcde;';
      if (input.Sqls.length !== reportingSQLForApp2Count
        || !(input.Sqls[0] as string).startsWith(expectedSql)
        || !(input.Sqls[reportingViewsDef.length * 2 - 1] as string).startsWith(expectedSql2)
        || !(input.Sqls[reportingSQLForApp2Count - TABLES_VIEWS_FOR_REPORTING.length] as string).startsWith(expectedSql3)
        || !(input.Sqls[reportingSQLForApp2Count - 1] as string).startsWith(expectedSql4)
      ) {
        throw new Error('create report view sqls for app2 are not expected');
      }
      return { Id: 'Id-1' };
    }).callsFakeOnce(input => {
      console.log('input.Sqls.length-4:' + input.Sqls.length);
      const expectedSql1 = `GRANT SELECT ON app1.${CLICKSTREAM_USER_ATTR_VIEW_NAME} TO clickstream_report_user_abcde;`;
      const expectedSql2 = `GRANT SELECT ON app1.${TABLE_NAME_EVENT} TO clickstream_report_user_abcde;`;
      const expectedSql3 = 'GRANT SELECT ON app1.item_m_view TO clickstream_report_user_abcde;';
      if (input.Sqls.length !== reportingSQLForApp1Count
        || !(input.Sqls[reportingSQLForApp1Count - TABLES_VIEWS_FOR_REPORTING.length - 1] as string).startsWith(expectedSql1)
        || !(input.Sqls[reportingSQLForApp1Count - TABLES_VIEWS_FOR_REPORTING.length] as string).startsWith(expectedSql2)
        || !(input.Sqls[reportingSQLForApp1Count - 1] as string).startsWith(expectedSql3)
      ) {
        throw new Error('update report view sqls for app1 are not expected');
      }
      return { Id: 'Id-1' };
    }).resolves({ Id: 'Id-2' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(updateServerlessEvent3, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 4);

  });

  test('Validate sqls when upgrade from 1.0.x to 1.1.x', async () => {
    smMock.onAnyCommand().resolves({});
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });

    const schemaSQLForApp1Count = schemaDefs.filter((def) => def.updatable === 'true').length;
    const reportingSQLForApp1Count = reportingViewsDef.length * 2 + TABLES_VIEWS_FOR_REPORTING.length; // grant to bi user one by one

    redshiftDataMock.on(BatchExecuteStatementCommand).callsFakeOnce(input => {
      console.log('input.Sqls.length-2:' + input.Sqls.length);
      const expectedSql = 'CREATE TABLE IF NOT EXISTS app1.clickstream_log';
      if (input.Sqls.length !== schemaSQLForApp1Count || !(input.Sqls[0] as string).startsWith(expectedSql)) {
        throw new Error('update schema sqls for app1 are not expected');
      }
      return { Id: 'Id-1' };
    }).callsFakeOnce(input => {
      console.log('input.Sqls.length-4:' + input.Sqls.length);
      const expectedSql1 = `GRANT SELECT ON app1.${CLICKSTREAM_EVENT_VIEW_NAME} TO clickstream_report_user_abcde;`;
      const expectedSql2 = `GRANT SELECT ON app1.${TABLE_NAME_EVENT} TO clickstream_report_user_abcde;`;
      const expectedSql3 = 'GRANT SELECT ON app1.item_m_view TO clickstream_report_user_abcde;';
      if (input.Sqls.length !== reportingSQLForApp1Count
        || !(input.Sqls[(reportingSQLForApp1Count - TABLES_VIEWS_FOR_REPORTING.length)/2] as string).startsWith(expectedSql1)
        || !(input.Sqls[reportingSQLForApp1Count - TABLES_VIEWS_FOR_REPORTING.length] as string).startsWith(expectedSql2)
        || !(input.Sqls[reportingSQLForApp1Count - 1] as string).startsWith(expectedSql3)
      ) {
        throw new Error('update report view sqls for app1 are not expected');
      }

      return { Id: 'Id-1' };
    }).resolves({ Id: 'Id-2' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(updateServerlessEvent4, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 2);

  });

  test('Updated schemas and views only in Redshift serverless in update stack from empty appIds', async () => {
    smMock.onAnyCommand().resolves({});
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });
    redshiftDataMock.on(BatchExecuteStatementCommand).callsFakeOnce(input => {
      const sqlStr = input.Sqls.join(';\n');
      if (input as BatchExecuteStatementCommandInput) {
        if (sqlStr.includes('CREATE SCHEMA IF NOT EXISTS app2')
          && sqlStr.includes(`CREATE TABLE IF NOT EXISTS app2.${LEGACY_REDSHIFT_ODS_EVENTS_TABLE_NAME}(`)
          && sqlStr.includes(`GRANT USAGE ON SCHEMA app2 TO ${biUserNamePrefix}abcde`)
          && sqlStr.includes(`ALTER DEFAULT PRIVILEGES IN SCHEMA app2 GRANT SELECT ON TABLES TO ${biUserNamePrefix}abcde`)
        ) {
          return { Id: 'Id-1' };
        }
      }
      throw new Error('Updating sqls are not expected');
    }).resolves({ Id: 'Id-2' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(updateServerlessEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(resp.Data?.RedshiftBIUsername).toEqual(`${biUserNamePrefix}abcde`);
    expect(smMock).toHaveReceivedCommandTimes(CreateSecretCommand, 0);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(BatchExecuteStatementCommand, 2);
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

  test('Updated schemas and views in Redshift provisioned cluster with updatable/new added view/schema table', async () => {
    redshiftDataMock
      .callsFakeOnce(input => {
        if (input as BatchExecuteStatementCommandInput) {
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
