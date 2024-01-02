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

import { readFileSync } from 'fs';
import { LambdaClient, ListTagsCommand } from '@aws-sdk/client-lambda';
import { DescribeStatementCommand, ExecuteStatementCommand, RedshiftDataClient } from '@aws-sdk/client-redshift-data';
import { CreateSecretCommand, DescribeSecretCommand, ResourceNotFoundException, SecretsManagerClient, UpdateSecretCommand } from '@aws-sdk/client-secrets-manager';
import { CdkCustomResourceEvent, CdkCustomResourceCallback, CdkCustomResourceResponse } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import mockfs from 'mock-fs';
import { RedshiftOdsTables } from '../../../../../src/analytics/analytics-on-redshift';
import { ResourcePropertiesType, handler, physicalIdPrefix } from '../../../../../src/analytics/lambdas/custom-resource/create-schemas';
import 'aws-sdk-client-mock-jest';
import { ProvisionedRedshiftProps } from '../../../../../src/analytics/private/model';
import { reportingViewsDef, schemaDefs } from '../../../../../src/analytics/private/sql-def';
import { sleep } from '../../../../../src/common/utils';
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

  const databaseSQLCount = 1;
  const biUserSQLCount = 1;
  const appReportingCount = reportingViewsDef.length;
  const appSchemaCount = schemaDefs.length;

  const baseCount = databaseSQLCount + biUserSQLCount; // total: 2
  const appNewCount = appReportingCount * 2 + appSchemaCount + 7; // total: 42

  const defs: { [key: string]: string } = {};

  beforeEach(async () => {
    redshiftDataMock.reset();
    smMock.reset();
    const rootPath = __dirname + '/../../../../../src/analytics/private/sqls/redshift/';
    mockfs({
      ...(schemaDefs.reduce((acc: { [key: string]: string }, item, _index) => {
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
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(eventWithoutApp, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, baseCount);
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, ExecuteStatementCommand, {
      Sql: `CREATE DATABASE ${projectDBName};`,
      WorkgroupName: workgroupName,
      Database: defaultDBName,
      ClusterIdentifier: undefined,
      DbUser: undefined,
    });
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, baseCount);
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
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(eventWithoutApp, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(smMock).toHaveReceivedCommandTimes(CreateSecretCommand, 1);
    expect(smMock).toHaveReceivedCommandTimes(DescribeSecretCommand, 1);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, baseCount);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, baseCount);
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
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(eventWithoutApp, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(smMock).toHaveReceivedCommandTimes(CreateSecretCommand, 0);
    expect(smMock).toHaveReceivedCommandTimes(UpdateSecretCommand, 1);
    expect(smMock).toHaveReceivedCommandTimes(DescribeSecretCommand, 1);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, baseCount);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, baseCount);
  });

  test('Created database, bi user, schemas and views in Redshift serverless', async () => {
    smMock.onAnyCommand().resolves({});
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });

    const resp = await handler(createServerlessEvent, context, callback) as CdkCustomResourceResponse;

    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, baseCount + appNewCount);

    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, ExecuteStatementCommand, {
      Sql: `CREATE DATABASE ${projectDBName};`,
      WorkgroupName: workgroupName,
      Database: defaultDBName,
      ClusterIdentifier: undefined,
      DbUser: undefined,
    });

    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(2, ExecuteStatementCommand, {
      Sql: expect.stringMatching(`CREATE USER ${biUserNamePrefix}[a-z0-9]{8} PASSWORD .*`),
    });

    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(3, ExecuteStatementCommand, {
      Sql: expect.stringContaining('CREATE SCHEMA IF NOT EXISTS app1'),
    });

    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, baseCount + appNewCount);
  });


  test('Created database, bi user, schemas and views in Redshift serverless - check status multiple times to wait success', async () => {
    smMock.onAnyCommand().resolves({});
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(DescribeStatementCommand)
      .resolvesOnce({ Status: 'FINISHED' })
      .resolvesOnce({ Status: 'FINISHED' })
      .resolvesOnce({ Status: 'STARTED' })
      .resolvesOnce({ Status: 'FINISHED' })
      .resolves({ Status: 'FINISHED' });
    const resp = await handler(createServerlessEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, baseCount + appNewCount);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, baseCount + appNewCount + 1);
  });

  test('Created database, bi user, schemas and views in Redshift serverless - check status multiple times to wait with failure', async () => {
    smMock.onAnyCommand().resolves({});
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(DescribeStatementCommand)
      .resolvesOnce({ Status: 'FINISHED' })
      .resolvesOnce({ Status: 'FINISHED' })
      .resolvesOnce({ Status: 'STARTED' })
      .resolvesOnce({ Status: 'FAILED' });
    try {
      await handler(createServerlessEvent, context, callback);
    } catch (e) {
      expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 3);
      return;
    }
    fail('No exception happened when Redshift DescribeStatementCommand returns FAILED');
  });

  test('Update schemas and views in Redshift serverless should not create database and user', async () => {
    smMock.onAnyCommand().resolves({});
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });

    const resp = await handler(updateServerlessEvent, context, callback) as CdkCustomResourceResponse;

    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, appNewCount);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, appNewCount);

    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, ExecuteStatementCommand, {
      Sql: expect.stringContaining('CREATE SCHEMA IF NOT EXISTS app2'),
    });

  });


  test('Updated schemas and views only in Redshift serverless in update stack from empty appIds', async () => {
    smMock.onAnyCommand().resolves({});
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-2' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(updateServerlessEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(resp.Data?.RedshiftBIUsername).toEqual(`${biUserNamePrefix}abcde`);
    expect(smMock).toHaveReceivedCommandTimes(CreateSecretCommand, 0);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, appNewCount);
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, ExecuteStatementCommand, {
      WorkgroupName: workgroupName,
      Database: projectDBName,
      ClusterIdentifier: undefined,
      DbUser: undefined,
    });
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, appNewCount);
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
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 0);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 0);
  });

  test('Data api exception in Redshift serverless', async () => {
    smMock.onAnyCommand().resolves({});
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });
    redshiftDataMock.on(ExecuteStatementCommand).rejects();
    try {
      await handler(createServerlessEvent, context, callback);
    } catch (e) {
      expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 1);
      expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 0);
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
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(createProvisionedEvent, context, callback) as CdkCustomResourceResponse;

    expect(resp.Status).toEqual('SUCCESS');

    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, baseCount + appNewCount);
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, ExecuteStatementCommand, {
      Sql: `CREATE DATABASE ${projectDBName};`,
      WorkgroupName: undefined,
      Database: defaultDBName,
      ClusterIdentifier: clusterId,
      DbUser: dbUser,
    });
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, baseCount + appNewCount);
  });

  test('Updated schemas and views in Redshift provisioned cluster', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });

    const resp = await handler(updateAdditionalProvisionedEvent, context, callback) as CdkCustomResourceResponse;

    expect(resp.Status).toEqual('SUCCESS');

    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, appNewCount * 2);
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, ExecuteStatementCommand, {
      WorkgroupName: undefined,
      Database: projectDBName,
      ClusterIdentifier: clusterId,
      DbUser: dbUser,
    });
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, appNewCount * 2);
  });

  test('Data api exception in Redshift provisioned cluster', async () => {
    smMock.onAnyCommand().resolves({});
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });
    redshiftDataMock.on(ExecuteStatementCommand).rejects();
    try {
      await handler(createProvisionedEvent, context, callback);
    } catch (e) {
      expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 1);
      expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 0);
      return;
    }
    fail('No exception happened when Redshift ExecuteStatementCommand failed');
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


  test('Created database, error with object already exists will be ignored', async () => {
    smMock.onAnyCommand().resolves({});
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(DescribeStatementCommand)
      .resolvesOnce({ Status: 'FINISHED' })
      .resolvesOnce({ Status: 'FINISHED' })
      .resolvesOnce({ Status: 'SUBMITTED' })
      .resolves({ Status: 'FAILED', Error: 'Object xxxx already exists', QueryString: 'test SQL create' });

    const resp = await handler(createServerlessEvent, context, callback);
    expect(resp.Status).toEqual('SUCCESS');

  });


  test('Update database, error with object already exists will be ignored', async () => {
    smMock.onAnyCommand().resolves({});
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(DescribeStatementCommand)
      .resolvesOnce({ Status: 'FINISHED' })
      .resolvesOnce({ Status: 'FINISHED' })
      .resolvesOnce({ Status: 'SUBMITTED' })
      .resolves({ Status: 'FAILED', Error: 'Object xxxx already exists', QueryString: 'test SQL update' });

    const resp = await handler(updateServerlessEvent, context, callback);
    expect(resp.Status).toEqual('SUCCESS');

  });

  test('Created database, DB error will be ignored when env.SUPPRESS_DB_ERROR=true', async () => {
    process.env.SUPPRESS_DB_ERROR = 'true';
    smMock.onAnyCommand().resolves({});
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(DescribeStatementCommand)
      .resolvesOnce({ Status: 'FINISHED' })
      .resolvesOnce({ Status: 'FINISHED' })
      .resolvesOnce({ Status: 'SUBMITTED' })
      .resolves({ Status: 'FAILED', Error: 'got DB error1', QueryString: 'test SQL create' });

    const resp = await handler(createServerlessEvent, context, callback);
    expect(resp.Status).toEqual('SUCCESS');
  });

  test('Created database, all errors will be ignored when env.SUPPRESS_ALL_ERROR=true', async () => {
    process.env.SUPPRESS_ALL_ERROR = 'true';
    smMock.onAnyCommand().rejects({});
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(DescribeStatementCommand)
      .resolvesOnce({ Status: 'FINISHED' })
      .resolvesOnce({ Status: 'FINISHED' })
      .resolvesOnce({ Status: 'SUBMITTED' })
      .resolves({ Status: 'FAILED', Error: 'got DB error1', QueryString: 'test SQL create' });

    const resp = await handler(createServerlessEvent, context, callback);
    expect(resp.Status).toEqual('SUCCESS');
  });


  test('Created tables in Redshift serverless - timeout error should be raised', async () => {
    process.env.SUPPRESS_DB_ERROR = 'false';
    process.env.SUPPRESS_ALL_ERROR = 'false';

    process.env.CREATE_TABLE_MAX_CHECK_COUNT = '1';

    smMock.onAnyCommand().resolves({});
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });
    redshiftDataMock.on(ExecuteStatementCommand).callsFake((r) => {
      return { Id: r.Sql?.includes('CREATE TABLE') ? 'CreateId' : 'Id-2' };
    },
    );
    redshiftDataMock.on(DescribeStatementCommand)
      .callsFake(async (r) => {
        if (r.Id === 'CreateId') {
          await sleep(1000);
          return {
            Status: 'SUBMITTED',
          };
        }
        return {
          Status: 'FINISHED',
        };
      });

    let errorMsg = '';
    try {
      await handler(createServerlessEvent, context, callback) as CdkCustomResourceResponse;
    } catch (e) {
      errorMsg = e.message;
    }
    expect(errorMsg).toEqual('Timeout error, timeout seconds: 1, queryString: undefined');

  });


  test('Apply sql in Redshift serverless - timeout error should not be raised', async () => {
    process.env.SUPPRESS_DB_ERROR = 'false';
    process.env.SUPPRESS_ALL_ERROR = 'false';

    process.env.APPLAY_SQL_MAX_CHECK_COUNT = '1';
    process.env.SQL_STATUS_CHECK_INTERVAL_MILLI_SECS = '1';

    smMock.onAnyCommand().resolves({});
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });

    redshiftDataMock.on(ExecuteStatementCommand).callsFake((r) => {
      return { Id: r.Sql?.includes('CREATE MATERIALIZED VIEW') ? 'viewSQL' : 'Other' };
    },
    );
    redshiftDataMock.on(DescribeStatementCommand)
      .callsFake(async (r) => {
        if (r.Id === 'viewSQL') {
          await sleep(2);
          return {
            Status: 'SUBMITTED',
          };
        }
        return {
          Status: 'FINISHED',
        };
      });

    const res = await handler(createServerlessEvent, context, callback) as CdkCustomResourceResponse;
    expect(res.Status).toEqual('SUCCESS');
  });


  test('Created tables in Redshift serverless - timeout error can be suppressed by SUPPRESS_DB_ERROR=true', async () => {
    process.env.SUPPRESS_DB_ERROR = 'true';
    process.env.SUPPRESS_ALL_ERROR = 'false';

    process.env.CREATE_TABLE_MAX_CHECK_COUNT = '1';

    smMock.onAnyCommand().resolves({});
    lambdaMock.on(ListTagsCommand).resolves({
      Tags: { tag_key: 'tag_value' },
    });
    redshiftDataMock.on(ExecuteStatementCommand).callsFake((r) => {
      return { Id: r.Sql?.includes('CREATE TABLE') ? 'CreateId' : 'Id-2' };
    },
    );
    redshiftDataMock.on(DescribeStatementCommand)
      .callsFake(async (r) => {
        if (r.Id === 'CreateId') {
          await sleep(1);
          return {
            Status: 'SUBMITTED',
          };
        }
        return {
          Status: 'FINISHED',
        };
      });

    const res = await handler(createServerlessEvent, context, callback) as CdkCustomResourceResponse;
    expect(res.Status).toEqual('SUCCESS');

  });

});


const testSqlContent = (filePath: string) => {
  const sqlTemplate = readFileSync(filePath, 'utf8');
  return sqlTemplate;
};
