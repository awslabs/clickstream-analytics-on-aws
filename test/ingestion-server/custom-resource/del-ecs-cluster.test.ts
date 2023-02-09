/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { CloudFormationCustomResourceEvent, Context } from 'aws-lambda';
jest.setTimeout(60 * 1000);

const ECSClientMock = {
  send: () => {
    return {
      services: [
        {
          status: 'RUNNING',
          serviceArn: 'arn:service:test',
        },
      ],

      taskArns: ['arn:task:test'],

      containerInstanceArns: ['arn:container:test'],
    };
  },
};

jest.mock('@aws-sdk/client-auto-scaling');
jest.mock('@aws-sdk/client-ecs', () => {
  return {
    ECSClient: jest.fn(() => ECSClientMock),
    DescribeServicesCommand: jest.fn(() => {}),
    DeleteClusterCommand: jest.fn(() => {}),
    DeleteServiceCommand: jest.fn(() => {}),
    DeregisterContainerInstanceCommand: jest.fn(() => {}),
    ListContainerInstancesCommand: jest.fn(() => {}),
    ListTasksCommand: jest.fn(() => {}),
    StopTaskCommand: jest.fn(() => {}),
    UpdateServiceCommand: jest.fn(() => {}),
  };
});

import { handler as del_ecs_handler } from '../../../src/ingestion-server/private/custom-resource/delete-ecs-cluster';

const event: CloudFormationCustomResourceEvent = {
  RequestType: 'Delete',
  ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
  ResponseURL:
    'https://cloudformation-custom-resource-response-useast1.s3.amazonaws.com/testUrl',
  StackId:
    'arn:aws:cloudformation:us-east-1:11111111111:stack/test/af30a5c0-9fa3-11ed-8aaa-0e0bf000f0ab',
  RequestId: '6ffb9981-d1af-4177-aac1-34e11cdcccd8',
  LogicalResourceId: 'IngestionServerDeleteECSClusterCustomResourceDD392784',
  PhysicalResourceId: 'delete-ecs-cluster-custom-resource',
  ResourceType: 'AWS::CloudFormation::CustomResource',
  ResourceProperties: {
    ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
  },
};
const c: Context = {
  callbackWaitsForEmptyEventLoop: true,
  functionVersion: '$LATEST',
  functionName: 'testFn',
  memoryLimitInMB: '512',
  logGroupName: '/aws/lambda/testFn',
  logStreamName: 'testFn',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
  awsRequestId: '0d93e702-57ad-40e6-a1c2-9f95a0087d44',
  getRemainingTimeInMillis: function (): number {
    return 1;
  },
  done: function (): void {},
  fail: function (): void {},
  succeed: function (): void {},
};

test('delete ECS cluster custom resource lambda - success', async () => {
  process.env.ECS_CLUSTER_NAME = 'testCluster';
  process.env.ECS_SERVICE = 'testService';
  process.env.ASG_NAME = 'testAsg';
  process.env.AWS_REGION = 'us-east-1';
  process.env.MAX_RETRY = '1';

  const response = await del_ecs_handler(event, c);
  expect(response.Status).toEqual('SUCCESS');
});


test('delete ECS cluster custom resource lambda - failed', async () => {
  process.env.ECS_CLUSTER_NAME = '';
  process.env.ECS_SERVICE = '';
  process.env.ASG_NAME = 'testAsg';
  process.env.AWS_REGION = 'us-east-1';
  process.env.MAX_RETRY = '1';

  const response = await del_ecs_handler(event, c);
  expect(response.Status).toEqual('FAILED');
});

