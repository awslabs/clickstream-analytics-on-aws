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

process.env.STATE_MACHINE_ARN = 'arn:aws:states:us-east-1:1234567890:stateMachine:state-machine-name';
process.env.S3_BUCKET = 'test-bucket';
process.env.S3_PREFIX='test-prefix/';
process.env.PROJECT_ID='project1';

import { CLICKSTREAM_ACQUISITION_DAY_USER_VIEW_CNT_MV, CLICKSTREAM_DEPRECATED_MATERIALIZED_VIEW_LIST, CLICKSTREAM_DEPRECATED_VIEW_LIST } from '@aws/clickstream-base-lib';
import { LambdaClient, ListTagsCommand } from '@aws-sdk/client-lambda';
import { DescribeStatementCommand, ExecuteStatementCommand, RedshiftDataClient } from '@aws-sdk/client-redshift-data';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { CreateSecretCommand, DescribeSecretCommand, ResourceNotFoundException, SecretsManagerClient, UpdateSecretCommand } from '@aws-sdk/client-secrets-manager';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { CdkCustomResourceEvent, CdkCustomResourceCallback, CdkCustomResourceResponse } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import mockfs from 'mock-fs';
import { RedshiftOdsTables } from '../../../../../src/analytics/analytics-on-redshift';
import { ResourcePropertiesType, TABLES_VIEWS_FOR_REPORTING, handler, physicalIdPrefix } from '../../../../../src/analytics/lambdas/custom-resource/create-schemas';
import 'aws-sdk-client-mock-jest';
import { ProvisionedRedshiftProps } from '../../../../../src/analytics/private/model';
import { reportingViewsDef, schemaDefs } from '../../../../../src/analytics/private/sql-def';
import { getMockContext } from '../../../../common/lambda-context';
import { basicCloudFormationEvent } from '../../../../common/lambda-events';
import { loadSQLFromFS } from '../../../../fs-utils';
import { logger } from '../../../../../src/common/powertools';

describe('Custom resource - Create schemas for applications in Redshift database', () => {

  const context = getMockContext();
  const callback: CdkCustomResourceCallback = async (_response) => { /* test mock */ };

  const redshiftDataMock = mockClient(RedshiftDataClient);
  const smMock = mockClient(SecretsManagerClient);
  const lambdaMock = mockClient(LambdaClient);
  const sfnClientMock = mockClient(SFNClient);
  const s3ClientMock = mockClient(S3Client);


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
      schemaHash: '123456789',
    },
  };

  const basicEventOneReportingView = {
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
      reportingViewsDef: [
        {
          viewName: CLICKSTREAM_ACQUISITION_DAY_USER_VIEW_CNT_MV,
          type: 'mv',
          scheduleRefresh: 'true',
          timezoneSensitive: 'true',
        },
      ],
      schemaDefs: [],
      schemaHash: '123456789',
    },
  };

  const workgroupName = 'demo';
  const defaultDBName = 'defaultDB';
  const createSchemaPropsInServerless: ResourcePropertiesType = {
    ...basicEvent.ResourceProperties,
    appIds: 'app1',
    timezoneWithAppId: '[{"appId":"app1","timezone":"Asia/Shanghai"},{"appId":"app2","timezone":"Asia/Tokyo"}]',
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

  const createServerlessOneReportingView = {
    ...basicEventOneReportingView,
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
      timezoneWithAppId: '[{"appId":"app2","timezone":"Asia/Tokyo"}]',
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
      timezoneWithAppId: '[{"appId":"app1","timezone":"Asia/Shanghai"}]',
      provisionedRedshiftProps,
    },
  };

  const updateAdditionalProvisionedEvent: CdkCustomResourceEvent = {
    ...createProvisionedEvent,
    OldResourceProperties: createProvisionedEvent.ResourceProperties,
    ResourceProperties: {
      ...createProvisionedEvent.ResourceProperties,
      appIds: 'app1,app2',
      timezoneWithAppId: '[{"appId":"app1","timezone":"Asia/Shanghai"},{"appId":"app2","timezone":"Asia/Tokyo"}]',
    },
    PhysicalResourceId: 'physical-resource-id',
    RequestType: 'Update',
  };

  const databaseSQLCount = 1;
  const biUserSQLCount = 1;
  const appReportingCount = reportingViewsDef.length;
  const appSchemaCount = schemaDefs.length;
  const spCount = reportingViewsDef.filter(i => i.type === 'sp').length;

  const baseCount = databaseSQLCount + biUserSQLCount; // total: 2
  const appNewCount = appReportingCount * 2 + appSchemaCount
  + TABLES_VIEWS_FOR_REPORTING.length //grant sql for bi user to access on base tables and views
  - spCount // # of Sp. sp does't need to be granted
  + CLICKSTREAM_DEPRECATED_MATERIALIZED_VIEW_LIST.length // materialized views need to remove
  + CLICKSTREAM_DEPRECATED_VIEW_LIST.length // views need to remove
  + 1 // create schema for app
  ;

  const defs: { [key: string]: string } = {};

  beforeEach(async () => {
    redshiftDataMock.reset();
    smMock.reset();
    sfnClientMock.reset();
    s3ClientMock.reset();

    const rootPath = __dirname + '/../../../../../src/analytics/private/sqls/redshift/';
    mockfs({
      ...loadSQLFromFS(schemaDefs, rootPath),
      ...loadSQLFromFS(reportingViewsDef.map(i => {
        if (i.type === 'sp') {
          return { sqlFile: i.spName + '.sql' };
        } else {
          return { sqlFile: i.viewName + '.sql' };
        }
      }), rootPath, 'dashboard/'),
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

    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });

    const resp = await handler(createServerlessEvent, context, callback) as CdkCustomResourceResponse;

    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, baseCount);

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

    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, appNewCount);
    expect(sfnClientMock).toHaveReceivedCommandTimes(StartExecutionCommand, 1);

  });

  test('Created database, timezone check', async () => {

    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });

    s3ClientMock.on(PutObjectCommand).callsFake((params) => {
      const body = params.Body as string;
      if(body.includes(`CREATE MATERIALIZED VIEW project1.app1.${CLICKSTREAM_ACQUISITION_DAY_USER_VIEW_CNT_MV}`)) {
        expect(body).toContain(`CONVERT_TIMEZONE('Asia/Shanghai'`);
      }
      return {};
    });

    const resp = await handler(createServerlessEvent, context, callback) as CdkCustomResourceResponse;

    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, baseCount);

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

    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, appNewCount);
    expect(sfnClientMock).toHaveReceivedCommandTimes(StartExecutionCommand, 1);

  });


  test('Created database, bi user, schemas and views in Redshift serverless - check status multiple times to wait success', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(DescribeStatementCommand)
      .resolvesOnce({ Status: 'STARTED' })
      .resolvesOnce({ Status: 'STARTED' })
      .resolvesOnce({ Status: 'STARTED' })
      .resolvesOnce({ Status: 'FINISHED' })
      .resolves({ Status: 'FINISHED' });

    const resp = await handler(createServerlessEvent, context, callback) as CdkCustomResourceResponse;

    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, baseCount);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, baseCount + 3);
  });

  test('Created database, bi user, schemas and views in Redshift serverless - check status multiple times to wait with failure', async () => {

    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(DescribeStatementCommand)
      .resolvesOnce({ Status: 'FINISHED' })
      .resolvesOnce({ Status: 'STARTED' })
      .resolvesOnce({ Status: 'FAILED' });
    try {
      await handler(createServerlessEvent, context, callback);
    } catch (e) {
      expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 2);
      return;
    }
    fail('No exception happened when Redshift DescribeStatementCommand returns FAILED');
  });

  test('Update schemas and views in Redshift serverless should not create database and user', async () => {

    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });

    const resp = await handler(updateServerlessEvent, context, callback) as CdkCustomResourceResponse;

    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 0);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 0);

    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, appNewCount);
    expect(sfnClientMock).toHaveReceivedCommandTimes(StartExecutionCommand, 1);

    expect(sfnClientMock).toHaveReceivedNthSpecificCommandWith(1, StartExecutionCommand, {
      name: expect.stringContaining('app2'),
      stateMachineArn: process.env.STATE_MACHINE_ARN,
      input: expect.stringContaining('"sqls":['),
    });

    expect(sfnClientMock).toHaveReceivedNthSpecificCommandWith(1, StartExecutionCommand, {
      input: expect.stringContaining('"sqls":['),
    });
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
    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, 0);
    expect(sfnClientMock).toHaveReceivedCommandTimes(StartExecutionCommand, 0);
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

    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, baseCount);
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, ExecuteStatementCommand, {
      Sql: `CREATE DATABASE ${projectDBName};`,
      WorkgroupName: undefined,
      Database: defaultDBName,
      ClusterIdentifier: clusterId,
      DbUser: dbUser,
    });
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, baseCount);

    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, appNewCount);
    expect(sfnClientMock).toHaveReceivedCommandTimes(StartExecutionCommand, 1);

  });

  test('Updated schemas and views in Redshift provisioned cluster with same lastSchemaHash', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });

    const lastSchemaHash = 'this is a hash code';
    updateAdditionalProvisionedEvent.OldResourceProperties.schemaHash = lastSchemaHash;
    updateAdditionalProvisionedEvent.ResourceProperties.schemaHash = lastSchemaHash;

    const resp = await handler(updateAdditionalProvisionedEvent, context, callback) as CdkCustomResourceResponse;

    expect(resp.Status).toEqual('SUCCESS');

    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 0);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 0);

    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, appNewCount);
    expect(sfnClientMock).toHaveReceivedCommandTimes(StartExecutionCommand, 1);
  });


  test('Updated schemas and views in Redshift provisioned cluster with APPLY_ALL_APP_SQL=true', async () => {
    process.env.APPLY_ALL_APP_SQL = 'true';
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });

    const lastSchemaHash = 'this is a hash code';
    updateAdditionalProvisionedEvent.OldResourceProperties.schemaHash = lastSchemaHash;
    updateAdditionalProvisionedEvent.ResourceProperties.schemaHash = lastSchemaHash;

    const resp = await handler(updateAdditionalProvisionedEvent, context, callback) as CdkCustomResourceResponse;

    expect(resp.Status).toEqual('SUCCESS');

    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 0);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 0);

    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, appNewCount * 2);
    expect(sfnClientMock).toHaveReceivedCommandTimes(StartExecutionCommand, 2);
  });

  test('Updated schemas and views in Redshift provisioned cluster with last schema hash changed', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });

    const lastSchemaHash = 'this is a hash code';
    updateAdditionalProvisionedEvent.OldResourceProperties.schemaHash = lastSchemaHash;
    updateAdditionalProvisionedEvent.ResourceProperties.schemaHash = lastSchemaHash + '1';

    const resp = await handler(updateAdditionalProvisionedEvent, context, callback) as CdkCustomResourceResponse;

    expect(resp.Status).toEqual('SUCCESS');

    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 0);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 0);

    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, appNewCount * 2);
    expect(sfnClientMock).toHaveReceivedCommandTimes(StartExecutionCommand, 2);

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

      expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, 0);
      expect(sfnClientMock).toHaveReceivedCommandTimes(StartExecutionCommand, 0);
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


  test('Created database, all errors will be ignored when env.SUPPRESS_ALL_ERROR=true', async () => {
    process.env.SUPPRESS_ALL_ERROR = 'true';

    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: 'Id-1' });
    redshiftDataMock.on(DescribeStatementCommand)
      .resolves({ Status: 'FAILED', Error: 'got DB error1', QueryString: 'test SQL create' });

    const resp = await handler(createServerlessEvent, context, callback);
    expect(resp.Status).toEqual('SUCCESS');
  });


});