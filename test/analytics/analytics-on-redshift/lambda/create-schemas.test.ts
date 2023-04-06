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
import { DescribeStatementCommand, ExecuteStatementCommand, RedshiftDataClient } from '@aws-sdk/client-redshift-data';
import { CdkCustomResourceEvent, CdkCustomResourceCallback, CdkCustomResourceResponse } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { getMockContext } from './context';
import { basicCloudFormationEvent } from './event';
import { handler } from '../../../../src/analytics/lambdas/custom-resource/create-schemas';
import 'aws-sdk-client-mock-jest';

describe('Custom resource - Create schemas for applications in Redshift database', () => {

  const context = getMockContext();
  const callback: CdkCustomResourceCallback = async (_response) => {};

  const redshiftDataMock = mockClient(RedshiftDataClient);

  const basicEvent = {
    ...basicCloudFormationEvent,
    ResourceProperties: {
      ...basicCloudFormationEvent.ResourceProperties,
      projectId: 'project1',
      appIds: 'app1',
      odsTableName: 'ods_events',
      databaseName: 'clickstream_project1',
      userRoleArn: 'arn:aws:iam::1234567890:role/MyRedshiftUserRole',
    },
  };
  const createServerlessEvent = {
    ...basicEvent,
    ResourceProperties: {
      ...basicEvent.ResourceProperties,
      serverlessRedshiftProps: {
        workgroupName: 'demo',
        defaultDatabaseName: 'dev',
        superUserIAMRoleArn: 'arn:aws:iam::1234567890:role/MyRedshiftSuperUserRole',
      },
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

  const createProvisionedEvent = {
    ...basicEvent,
    ResourceProperties: {
      ...basicEvent.ResourceProperties,
      provisionedRedshiftProps: {
        clusterIdentifier: 'redshift-cluster-1',
        dbUser: 'awsuser',
      },
    },
  };

  beforeEach(() => {
    redshiftDataMock.reset();
  });

  test('Only create user and database statements are invoked if no application is given', async () => {
    const eventWithoutApp = {
      ...createServerlessEvent,
      ResourceProperties: {
        ...createServerlessEvent.ResourceProperties,
        appIds: '',
      },
    };
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: 'Id-1' })
      .resolvesOnce({ Id: 'Id-2' }).resolvesOnce({ Id: 'Id-3' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(eventWithoutApp, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 2);
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(2, ExecuteStatementCommand, {
      WorkgroupName: 'demo',
      Database: 'dev',
    });
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(2, ExecuteStatementCommand, {
      WorkgroupName: 'demo',
      Database: 'dev',
    });
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 2);
  });

  test('Check create schemas status in serverless mode - Cloudformation create success', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: 'Id-1' })
      .resolvesOnce({ Id: 'Id-2' }).resolvesOnce({ Id: 'Id-3' });
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    const resp = await handler(createServerlessEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 3);
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(3, ExecuteStatementCommand, {
      WorkgroupName: 'demo',
      Database: 'clickstream_project1',
    });
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 3);
  });

  test('Check create schemas status in serverless mode - Cloudformation create and wait success', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: 'Id-1' })
      .resolvesOnce({ Id: 'Id-2' }).resolvesOnce({ Id: 'Id-3' });
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({ Status: 'FINISHED' })
      .resolvesOnce({ Status: 'FINISHED' }).resolvesOnce({ Status: 'STARTED' })
      .resolvesOnce({ Status: 'FINISHED' }); // for second describe call while creating schema
    const resp = await handler(createServerlessEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 3);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 4);
  });

  test('Check create schemas status in serverless mode - Cloudformation create and wait fail', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: 'Id-1' })
      .resolvesOnce({ Id: 'Id-2' }).resolvesOnce({ Id: 'Id-3' });
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({ Status: 'FINISHED' })
      .resolvesOnce({ Status: 'FINISHED' }).resolvesOnce({ Status: 'STARTED' })
      .resolvesOnce({ Status: 'FAILED' }); // for second describe call while creating schema
    try {
      await handler(createServerlessEvent, context, callback);
    } catch (e) {
      expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 3);
      expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 4);
      return;
    }
    fail('No exception happened when Redshift DescribeStatementCommand returns FAILED');
  });

  test('Check create schemas status in serverless mode - Cloudformation update success', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: 'Id-1' });
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({ Status: 'FINISHED' });
    const resp = await handler(updateServerlessEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 1);
    expect(redshiftDataMock).toHaveReceivedCommandWith(ExecuteStatementCommand, {
      WorkgroupName: 'demo',
      Database: 'clickstream_project1',
    });
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 1);
  });

  test('Check create schemas status in serverless mode - Cloudformation delete success', async () => {
    const deleteEvent: CdkCustomResourceEvent = {
      ...createServerlessEvent,
      PhysicalResourceId: 'id',
      RequestType: 'Delete',
    };
    const resp = await handler(deleteEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 0);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 0);
  });

  test('Check create schemas status in serverless mode - Redshift Data API error', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: 'Id-1' })
      .resolvesOnce({ Id: 'Id-2' }).rejects();
    redshiftDataMock.on(DescribeStatementCommand).resolves({ Status: 'FINISHED' });
    try {
      await handler(createProvisionedEvent, context, callback);
    } catch (e) {
      expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 3);
      expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 2);
      return;
    }
    fail('No exception happened when Redshift ExecuteStatementCommand failed');
  });

  test.skip('Check create schemas status in provisioned mode - Cloudformation create success', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: '70bfb836-c7d5-7cab-75b0-5222e78194ac' });
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({ Status: 'FINISHED' });
    const resp = await handler(createProvisionedEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 1);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 1);
  });

  test.skip('Check create schemas status in provisioned mode - Redshift Data API error', async () => {
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

  test.skip('Check create schemas status in provisioned mode - Cloudformation create and wait fail', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({ Id: '70bfb836-c7d5-7cab-75b0-5222e78194ac' });
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({ Status: 'STARTED' })
      .resolvesOnce({ Status: 'FAILED' }); // for second call
    try {
      await handler(createProvisionedEvent, context, callback);
    } catch (e) {
      expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 1);
      expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 2);
      return;
    }
    fail('No exception happened when Redshift DescribeStatementCommand returned failed');
  });
});
