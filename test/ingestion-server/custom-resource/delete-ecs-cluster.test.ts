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

// @ts-nocheck
import {
  ECSClient,
  DescribeServicesCommand,
  ListTasksCommand,
  ListContainerInstancesCommand,
  UpdateServiceCommand,
  StopTaskCommand,
  DeleteServiceCommand,
  ListContainerInstancesCommand,
  DeregisterContainerInstanceCommand,
  DeleteClusterCommand,
} from '@aws-sdk/client-ecs';
import { CloudFormationCustomResourceEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import { handler } from '../../../src/ingestion-server/custom-resource/delete-ecs-cluster/index';
import { getMockContext } from '../../common/lambda-context';

const c = getMockContext();

//@ts-ignore
const ecsClientMock = mockClient(ECSClient);

beforeEach(() => {
  ecsClientMock.reset();
});

//@ts-ignore
const basicEvent: CloudFormationCustomResourceEvent = {
  ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
  RequestType: 'Delete',
  ResponseURL: 'https://cloudformation-custom-resource-response-useast1.s3.amazonaws.com/testUrl',
  StackId: 'arn:aws:cloudformation:us-east-1:111111111111:stack/test/54bce910-a6c8-11ed-8ff3-1212426f2299',
  RequestId: '6ffb9981-d1af-4177-aac1-34e11cdcccd8',
  LogicalResourceId: 'create-test-custom-resource',
  ResourceType: 'AWS::CloudFormation::CustomResource',
  ResourceProperties: {
    ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
    ecsClusterName: 'mockEcsClusterName',
    ecsServiceName: 'mockEcsServiceName',
  },
};

test('Delete ECS Cluster successfully', async () => {
  const describeResponse = {
    services: [
      {
        status: 'ACTIVE',
      },
    ],
  };
  const secondDescribeResponse = {
    services: [
      {
        desiredCount: 0,
      },
    ],
  };
  const thirdDescribeResponse = {
    services: [
      {
        runningCount: 0,
      },
    ],
  };


  ecsClientMock.on(DescribeServicesCommand)
    .resolvesOnce(describeResponse)
    .resolvesOnce(secondDescribeResponse)
    .resolvesOnce(thirdDescribeResponse);

  const listTasksResponse = {
    taskArns: ['taskArn'],
  };

  ecsClientMock.on(ListTasksCommand).resolves(listTasksResponse);

  const listContainerInstancesResponse = {
    containerInstanceArns: ['containerInstanceArn'],
  };
  const secondListContainerInstancesResponse = {
    containerInstanceArns: [],
  };
  ecsClientMock.on(ListContainerInstancesCommand)
    .resolvesOnce(listContainerInstancesResponse)
    .resolvesOnce(secondListContainerInstancesResponse);

  await handler(basicEvent, c);

  expect(ecsClientMock).toHaveReceivedNthCommandWith(1, DescribeServicesCommand, {
    cluster: 'mockEcsClusterName',
    services: ['mockEcsServiceName'],
  });
  expect(ecsClientMock).toHaveReceivedNthCommandWith(2, UpdateServiceCommand, {
    cluster: 'mockEcsClusterName',
    desiredCount: 0,
    service: 'mockEcsServiceName',
  });
  expect(ecsClientMock).toHaveReceivedNthCommandWith(3, DescribeServicesCommand, {
    cluster: 'mockEcsClusterName',
    services: ['mockEcsServiceName'],
  });
  expect(ecsClientMock).toHaveReceivedNthCommandWith(4, ListTasksCommand, {
    cluster: 'mockEcsClusterName',
    serviceName: 'mockEcsServiceName',
  });
  expect(ecsClientMock).toHaveReceivedNthCommandWith(5, StopTaskCommand, {
    cluster: 'mockEcsClusterName',
    reason: 'stop by cloudformation custom resource',
    task: 'taskArn',
  });
  expect(ecsClientMock).toHaveReceivedNthCommandWith(6, DescribeServicesCommand, {
    cluster: 'mockEcsClusterName',
    services: ['mockEcsServiceName'],
  });
  expect(ecsClientMock).toHaveReceivedNthCommandWith(7, DeleteServiceCommand, {
    cluster: 'mockEcsClusterName',
    force: true,
    service: 'mockEcsServiceName',
  });
  expect(ecsClientMock).toHaveReceivedNthCommandWith(8, ListContainerInstancesCommand, {
    cluster: 'mockEcsClusterName',
  });
  expect(ecsClientMock).toHaveReceivedNthCommandWith(9, DeregisterContainerInstanceCommand, {
    cluster: 'mockEcsClusterName',
    containerInstance: 'containerInstanceArn',
    force: true,
  });
  expect(ecsClientMock).toHaveReceivedNthCommandWith(10, ListContainerInstancesCommand, {
    cluster: 'mockEcsClusterName',
  });
  expect(ecsClientMock).toHaveReceivedNthCommandWith(11, DeleteClusterCommand, {
    cluster: 'mockEcsClusterName',
  });
}, 50000);

test('Throw exception when call DescribeServicesCommand', async () => {
  ecsClientMock.on(DescribeServicesCommand).rejects();
  try {
    await handler(basicEvent, c);
    fail('Describe Services error was caught in handler');
  } catch (error) {
    expect(ecsClientMock).toHaveReceivedCommandTimes(DeleteClusterCommand, 0);
    expect(ecsClientMock).toHaveReceivedCommandTimes(DeregisterContainerInstanceCommand, 0);
    expect(ecsClientMock).toHaveReceivedCommandTimes(DeleteServiceCommand, 0);
  }
});

test('UpdateServiceCommand has some delay', async () => {
  const describeResponse = {
    services: [
      {
        status: 'ACTIVE',
      },
    ],
  };
  const secondDescribeResponse = {
    services: [
      {
        desiredCount: 1,
      },
    ],
  };
  const thirdDescribeResponse = {
    services: [
      {
        desiredCount: 0,
      },
    ],
  };
  const fourthDescribeResponse = {
    services: [
      {
        runningCount: 0,
      },
    ],
  };


  ecsClientMock.on(DescribeServicesCommand)
    .resolvesOnce(describeResponse)
    .resolvesOnce(secondDescribeResponse)
    .resolvesOnce(thirdDescribeResponse)
    .resolvesOnce(fourthDescribeResponse);

  const listTasksResponse = {
    taskArns: ['taskArn'],
  };

  ecsClientMock.on(ListTasksCommand).resolves(listTasksResponse);

  const listContainerInstancesResponse = {
    containerInstanceArns: ['containerInstanceArn'],
  };
  const secondListContainerInstancesResponse = {
    containerInstanceArns: [],
  };
  ecsClientMock.on(ListContainerInstancesCommand)
    .resolvesOnce(listContainerInstancesResponse)
    .resolvesOnce(secondListContainerInstancesResponse);

  await handler(basicEvent, c);

  expect(ecsClientMock).toHaveReceivedNthCommandWith(4, DescribeServicesCommand, {
    cluster: 'mockEcsClusterName',
    services: ['mockEcsServiceName'],
  });
  expect(ecsClientMock).toHaveReceivedNthCommandWith(12, DeleteClusterCommand, {
    cluster: 'mockEcsClusterName',
  });
}, 50000);

test('DeregisterContainerInstanceCommand has some delay', async () => {
  const describeResponse = {
    services: [
      {
        status: 'ACTIVE',
      },
    ],
  };
  const secondDescribeResponse = {
    services: [
      {
        desiredCount: 0,
      },
    ],
  };
  const thirdDescribeResponse = {
    services: [
      {
        runningCount: 0,
      },
    ],
  };

  ecsClientMock.on(DescribeServicesCommand)
    .resolvesOnce(describeResponse)
    .resolvesOnce(secondDescribeResponse)
    .resolvesOnce(thirdDescribeResponse);

  const listTasksResponse = {
    taskArns: ['taskArn'],
  };

  ecsClientMock.on(ListTasksCommand).resolves(listTasksResponse);

  const listContainerInstancesResponse = {
    containerInstanceArns: ['containerInstanceArn'],
  };
  const secondListContainerInstancesResponse = {
    containerInstanceArns: ['containerInstanceArn'],
  };
  const thirdListContainerInstancesResponse = {
    containerInstanceArns: [],
  };
  ecsClientMock.on(ListContainerInstancesCommand)
    .resolvesOnce(listContainerInstancesResponse)
    .resolvesOnce(secondListContainerInstancesResponse)
    .resolvesOnce(thirdListContainerInstancesResponse);

  await handler(basicEvent, c);

  expect(ecsClientMock).toHaveReceivedNthCommandWith(10, ListContainerInstancesCommand, {
    cluster: 'mockEcsClusterName',
  });
  expect(ecsClientMock).toHaveReceivedNthCommandWith(11, ListContainerInstancesCommand, {
    cluster: 'mockEcsClusterName',
  });
  expect(ecsClientMock).toHaveReceivedNthCommandWith(12, DeleteClusterCommand, {
    cluster: 'mockEcsClusterName',
  });
}, 50000);