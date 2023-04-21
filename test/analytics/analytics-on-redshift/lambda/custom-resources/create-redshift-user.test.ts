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
import { DescribeStatementCommand, ExecuteStatementCommand, RedshiftDataClient, StatusString } from '@aws-sdk/client-redshift-data';
import { CdkCustomResourceEvent, CdkCustomResourceCallback, CdkCustomResourceResponse } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { handler } from '../../../../../src/analytics/lambdas/custom-resource/create-redshift-user';
import 'aws-sdk-client-mock-jest';
import { getMockContext } from '../../../../common/lambda-context';
import { basicCloudFormationEvent } from '../../../../common/lambda-events';

describe('Custom resource - Create redshift serverless namespace', () => {

  const context = getMockContext();
  const callback: CdkCustomResourceCallback = async (_response) => {};

  const redshiftDataMock = mockClient(RedshiftDataClient);

  const dataRoleName = 'RSDataRole';
  const basicEvent = {
    ...basicCloudFormationEvent,
    ResourceProperties: {
      ...basicCloudFormationEvent.ResourceProperties,
      dataRoleName,
      serverlessRedshiftProps: {
        workgroupName: 'workgroupName',
        databaseName: 'dev',
        dataAPIRoleArn: 'arn:aws:iam::1234567890:role/RedshiftDBUserRole',
      },
    },
  };

  const createUserEvent: CdkCustomResourceEvent = {
    ...basicEvent,
  };

  const newRoleName = 'NewRole';
  const existingPhysicalId = 'physical-id';
  const updateUserEvent: CdkCustomResourceEvent = {
    ...createUserEvent,
    OldResourceProperties: createUserEvent.ResourceProperties,
    ResourceProperties: {
      ...createUserEvent.ResourceProperties,
      dataRoleName: newRoleName,
    },
    PhysicalResourceId: existingPhysicalId,
    RequestType: 'Update',
  };

  const deleteUserEvent: CdkCustomResourceEvent = {
    ...createUserEvent,
    PhysicalResourceId: existingPhysicalId,
    RequestType: 'Delete',
  };

  beforeEach(() => {
    redshiftDataMock.reset();
  });

  test('Create a db user in Redshift serverless workgroup.', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({
      Id: 'id-1',
    });
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({
      Status: StatusString.FINISHED,
    });
    const resp = await handler(createUserEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, ExecuteStatementCommand, {
      Sql: `CREATE USER "IAMR:${dataRoleName}" PASSWORD DISABLE CREATEDB;`,
    });
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 1);
  });

  test('Update a db user with different name in Redshift serverless workgroup.', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({
      Id: 'id-1',
    });
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({
      Status: StatusString.STARTED,
    }).resolvesOnce({
      Status: StatusString.FINISHED,
    });
    const resp = await handler(updateUserEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedNthSpecificCommandWith(1, ExecuteStatementCommand, {
      Sql: `CREATE USER "IAMR:${newRoleName}" PASSWORD DISABLE CREATEDB;`,
    });
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 2);
  });

  test('Delete a db user in Redshift serverless workgroup.', async () => {
    redshiftDataMock.on(ExecuteStatementCommand).resolvesOnce({
      Id: 'id-1',
    });
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({
      Status: StatusString.STARTED,
    }).resolvesOnce({
      Status: StatusString.FINISHED,
    });
    const resp = await handler(deleteUserEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftDataMock).toHaveReceivedCommandTimes(ExecuteStatementCommand, 0);
    expect(redshiftDataMock).toHaveReceivedCommandTimes(DescribeStatementCommand, 0);
  });
});
