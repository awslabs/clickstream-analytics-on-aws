
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

import { CreateApplicationCommand, DeleteApplicationCommand, EMRServerlessClient } from '@aws-sdk/client-emr-serverless';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';


import { CloudFormationCustomResourceEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';

const s3ClientMock = mockClient(S3Client);
const emrClientMock = mockClient(EMRServerlessClient);

process.env.AWS_REGION = 'us-east-1';
process.env.STACK_ID = 'test-stack-001';
process.env.PIPELINE_S3_BUCKET_NAME = 'bucket1';
process.env.PIPELINE_S3_PREFIX = 'prefix1';

process.env.TEST_TIME_NOW_STR = new Date().toISOString();

import { handler } from '../../src/data-pipeline/lambda/emr-serverless-app';
import { getMockContext } from '../common/lambda-context';
import { basicCloudFormationEvent } from '../common/lambda-events';

beforeEach(() => {
  s3ClientMock.reset();
  emrClientMock.reset();
});

test('should create EMR-serverless application when RequestType is Create', async () => {
  const event: CloudFormationCustomResourceEvent = {
    ...basicCloudFormationEvent,
    RequestType: 'Create',
    ResourceProperties: {
      ServiceToken: 'ServiceToken1',
      projectId: 'test-stack-id',
      name: 'spark-test-app-name',
      version: 'emr-6.10.0',
      securityGroupId: 'sg-102392x23df',
      subnetIds: 'subnet-0001,subnet-0002',
      idleTimeoutMinutes: '3',
      architecture: 'Auto',

    },
  };
  const context = getMockContext();

  emrClientMock.on(CreateApplicationCommand).resolvesOnce({
    applicationId: 'applicationId-001',
  });

  s3ClientMock.on(GetObjectCommand).resolves({
    Body: undefined,
  } as any);

  const res = await handler(event, context);
  expect(res).toEqual({
    Data: {
      ApplicationId: 'applicationId-001',
    },
  });
  expect(emrClientMock).toHaveReceivedCommandTimes(CreateApplicationCommand, 1);
  expect(emrClientMock).toHaveReceivedCommandTimes(DeleteApplicationCommand, 0);
  expect(s3ClientMock).toHaveReceivedCommandTimes(GetObjectCommand, 1);
  expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, 1);

  expect(emrClientMock).toHaveReceivedNthCommandWith(1, CreateApplicationCommand, {
    architecture: 'ARM64',
    autoStartConfiguration: {
      enabled: true,
    },
    autoStopConfiguration: {
      enabled: true,
      idleTimeoutMinutes: 3,
    },
    name: 'spark-test-app-name',
    networkConfiguration: {
      securityGroupIds: [
        'sg-102392x23df',
      ],
      subnetIds: [
        'subnet-0001',
        'subnet-0002',
      ],
    },
    releaseLabel: 'emr-6.10.0',
    type: 'SPARK',
  });

  expect(s3ClientMock).toHaveReceivedNthCommandWith(2, PutObjectCommand,
    {
      Body: JSON.stringify(
        {
          applicationIds: [
            {
              applicationId: 'applicationId-001',
              createAt: process.env.TEST_TIME_NOW_STR,
            },
          ],
        },
      ),
      Bucket: 'bucket1',
      Key: 'prefix1/test-stack-001/config/emr-serverless-applicationId.json',
    } );

});

test('should delete EMR-serverless application when RequestType is Delete', async () => {
  const event: CloudFormationCustomResourceEvent = {
    ...basicCloudFormationEvent,
    RequestType: 'Delete',
    ResourceProperties: {
      ServiceToken: 'ServiceToken1',
      projectId: 'test-stack-id',
      name: 'spark-test-app-name',
      version: 'emr-6.10.0',
      securityGroupId: 'sg-102392x23df',
      subnetIds: 'subnet-0001,subnet-0002',
      idleTimeoutMinutes: '6',
      architecture: 'Auto',
    },
  };
  const context = getMockContext();

  const applicationIdsConfig = JSON.stringify({
    applicationIds: [
      {
        applicationId: 'appId-00001',
        createAt: '2023-08-04T07:32:27.490Z',
      },
      {
        applicationId: 'appId-00002',
        createAt: '2023-08-04T09:32:27.490Z',
      },
    ],
  });

  s3ClientMock.on(GetObjectCommand).resolves({
    Body: {
      transformToString: async () => {
        return applicationIdsConfig;
      },
    },
  } as any);

  const res = await handler(event, context);
  expect(res);
  expect(emrClientMock).toHaveReceivedCommandTimes(CreateApplicationCommand, 0);
  expect(emrClientMock).toHaveReceivedCommandTimes(DeleteApplicationCommand, 2);
  expect(s3ClientMock).toHaveReceivedCommandTimes(GetObjectCommand, 1);
  expect(emrClientMock).toHaveReceivedNthCommandWith(1, DeleteApplicationCommand, {
    applicationId: 'appId-00001',
  });
  expect(emrClientMock).toHaveReceivedNthCommandWith(2, DeleteApplicationCommand, {
    applicationId: 'appId-00002',
  });

});


test('should create EMR-serverless application when RequestType is Update ', async () => {
  const event: CloudFormationCustomResourceEvent = {
    ...basicCloudFormationEvent,
    RequestType: 'Update',
    ResourceProperties: {
      ServiceToken: 'ServiceToken1',
      projectId: 'test-stack-id',
      name: 'spark-test-app-name',
      version: 'emr-6.10.0',
      securityGroupId: 'sg-102392x23df',
      subnetIds: 'subnet-0001,subnet-0002',
      idleTimeoutMinutes: '6',
      architecture: 'Auto',
    },
  };
  const context = getMockContext();

  emrClientMock.on(CreateApplicationCommand).resolvesOnce({
    applicationId: 'applicationId-002',
  });

  const applicationIdsConfig = JSON.stringify({
    applicationIds: [
      {
        applicationId: 'appId-0000',
        createAt: '2023-08-04T07:32:27.490Z',
      },
    ],
  });

  s3ClientMock.on(GetObjectCommand).resolves({
    Body: {
      transformToString: async () => {
        return applicationIdsConfig;
      },
    },
  } as any);

  const res = await handler(event, context);
  expect(res).toEqual({
    Data: {
      ApplicationId: 'applicationId-002',
    },
  });
  expect(emrClientMock).toHaveReceivedCommandTimes(CreateApplicationCommand, 1);
  expect(emrClientMock).toHaveReceivedCommandTimes(DeleteApplicationCommand, 1);
  expect(s3ClientMock).toHaveReceivedCommandTimes(GetObjectCommand, 1);
  expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, 1);
  expect(s3ClientMock).toHaveReceivedNthCommandWith(2, PutObjectCommand,
    {
      Body: JSON.stringify(
        {
          applicationIds: [
            {
              applicationId: 'appId-0000',
              createAt: '2023-08-04T07:32:27.490Z',
            },
            {
              applicationId: 'applicationId-002',
              createAt: process.env.TEST_TIME_NOW_STR,
            },
          ],
        },
      ),
      Bucket: 'bucket1',
      Key: 'prefix1/test-stack-001/config/emr-serverless-applicationId.json',
    } );

  expect(emrClientMock).toHaveReceivedNthCommandWith(2, DeleteApplicationCommand, {
    applicationId: 'appId-0000',
  });
});


test('should handle delete error', async () => {
  const event: CloudFormationCustomResourceEvent = {
    ...basicCloudFormationEvent,
    RequestType: 'Delete',
    ResourceProperties: {
      ServiceToken: 'ServiceToken1',
      projectId: 'test-stack-id',
      name: 'spark-test-app-name',
      version: 'emr-6.10.0',
      securityGroupId: 'sg-102392x23df',
      subnetIds: 'subnet-0001,subnet-0002',
      idleTimeoutMinutes: '6',
      architecture: 'Auto',
    },
  };
  const context = getMockContext();

  const applicationIdsConfig = JSON.stringify({
    applicationIds: [
      {
        applicationId: 'appId-00001',
        createAt: '2023-08-04T07:32:27.490Z',
      },
      {
        applicationId: 'appId-00002',
        createAt: '2023-08-04T09:32:27.490Z',
      },
    ],
  });

  s3ClientMock.on(GetObjectCommand).resolves({
    Body: {
      transformToString: async () => {
        return applicationIdsConfig;
      },
    },
  } as any);

  emrClientMock.on(DeleteApplicationCommand).resolvesOnce({}).rejectsOnce({ errorMessage: 'delete error' });

  const res = await handler(event, context);
  expect(res).toEqual({
    Data: {},
  });

  expect(emrClientMock).toHaveReceivedCommandTimes(DeleteApplicationCommand, 2);

  expect(emrClientMock).toHaveReceivedNthCommandWith(1, DeleteApplicationCommand, {
    applicationId: 'appId-00001',
  });
  expect(emrClientMock).toHaveReceivedNthCommandWith(2, DeleteApplicationCommand, {
    applicationId: 'appId-00002',
  });

});


test('should handle create error', async () => {
  const event: CloudFormationCustomResourceEvent = {
    ...basicCloudFormationEvent,
    RequestType: 'Create',
    ResourceProperties: {
      ServiceToken: 'ServiceToken1',
      projectId: 'test-stack-id',
      name: 'spark-test-app-name',
      version: 'emr-6.10.0',
      securityGroupId: 'sg-102392x23df',
      subnetIds: 'subnet-0001,subnet-0002',
      idleTimeoutMinutes: '6',
      architecture: 'Auto',
    },
  };
  const context = getMockContext();

  const applicationIdsConfig = JSON.stringify({
    applicationIds: [
      {
        applicationId: 'appId-00001',
        createAt: '2023-08-04T07:32:27.490Z',
      },
      {
        applicationId: 'appId-00002',
        createAt: '2023-08-04T09:32:27.490Z',
      },
    ],
  });

  s3ClientMock.on(GetObjectCommand).resolves({
    Body: {
      transformToString: async () => {
        return applicationIdsConfig;
      },
    },
  } as any);

  emrClientMock.on(CreateApplicationCommand).rejectsOnce({ errorMessage: 'create error' });

  try {
    await handler(event, context);
  } catch (err) {
    expect(err.errorMessage).toEqual('create error');
  }
});

test('EMR-serverless application name should not more than 64', async () => {
  const event: CloudFormationCustomResourceEvent = {
    ...basicCloudFormationEvent,
    RequestType: 'Create',
    ResourceProperties: {
      ServiceToken: 'ServiceToken1',
      projectId: 'test-stack-id',
      name: 'spark-test-app-name-12345678901234567890123456789012345678901234567890123456789012345678901234567890',
      version: 'emr-6.10.0',
      securityGroupId: 'sg-102392x23df',
      subnetIds: 'subnet-0001,subnet-0002',
      idleTimeoutMinutes: '3',
      architecture: 'Auto',
    },
  };
  const context = getMockContext();

  emrClientMock.on(CreateApplicationCommand).resolvesOnce({
    applicationId: 'applicationId-001',
  });

  s3ClientMock.on(GetObjectCommand).resolves({
    Body: undefined,
  } as any);

  await handler(event, context);

  expect(emrClientMock).toHaveReceivedNthCommandWith(1, CreateApplicationCommand, {
    architecture: 'ARM64',
    autoStartConfiguration: {
      enabled: true,
    },
    autoStopConfiguration: {
      enabled: true,
      idleTimeoutMinutes: 3,
    },
    name: 'spark-test-app-name-12345678901234567890123456789012345678901234',
    networkConfiguration: {
      securityGroupIds: [
        'sg-102392x23df',
      ],
      subnetIds: [
        'subnet-0001',
        'subnet-0002',
      ],
    },
    releaseLabel: 'emr-6.10.0',
    type: 'SPARK',
  });

});
