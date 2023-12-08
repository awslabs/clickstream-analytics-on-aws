
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

process.env.AWS_REGION = 'cn-northwest-1';
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

test('should create EMR-serverless application X86_64 architecture with java 17', async () => {
  const event: CloudFormationCustomResourceEvent = {
    ...basicCloudFormationEvent,
    RequestType: 'Create',
    ResourceProperties: {
      ServiceToken: 'ServiceToken1',
      projectId: 'test-stack-id',
      name: 'spark-test-app-name',
      version: 'emr-6.11.0',
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
    architecture: 'X86_64',
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
    releaseLabel: 'emr-6.11.0',
    type: 'SPARK',
    runtimeConfiguration: [
      {
        classification: 'spark-defaults',
        properties: {
          'spark.emr-serverless.driverEnv.JAVA_HOME': '/usr/lib/jvm/java-17-amazon-corretto.x86_64/',
          'spark.executorEnv.JAVA_HOME': '/usr/lib/jvm/java-17-amazon-corretto.x86_64/',
        },
      },
    ],
  });
});


test('should create EMR-serverless application with ARM64 architecture', async () => {
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
      architecture: 'ARM64',

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
});


test('should create EMR-serverless application with X86_64 architecture', async () => {
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
      architecture: 'X86_64',

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
    architecture: 'X86_64',
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
});
