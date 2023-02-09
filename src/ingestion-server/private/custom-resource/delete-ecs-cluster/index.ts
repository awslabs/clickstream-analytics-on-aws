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

import { Logger } from '@aws-lambda-powertools/logger';
import {
  AutoScalingClient,
  DeleteAutoScalingGroupCommand,
} from '@aws-sdk/client-auto-scaling';
import {
  DeleteClusterCommand,
  DeleteServiceCommand,
  DeregisterContainerInstanceCommand,
  DescribeServicesCommand,
  ECSClient,
  ListContainerInstancesCommand,
  ListTasksCommand,
  StopTaskCommand,
  UpdateServiceCommand,
} from '@aws-sdk/client-ecs';
import { LogLevel } from 'aws-cdk-lib/aws-lambda-nodejs';
import { CloudFormationCustomResourceEvent, Context } from 'aws-lambda';

const logger = new Logger({
  serviceName: 'ClickstreamAnalyticsOnAWS',
  logLevel: LogLevel.WARNING,
});

const region = process.env.AWS_REGION;
const ecsClient = new ECSClient({ region });
const asgClient = new AutoScalingClient({ region });
let max_n = 10;

export const handler = async function (
  event: CloudFormationCustomResourceEvent,
  context: Context,
) {
  if (process.env.MAX_RETRY) {
    max_n = parseInt(process.env.MAX_RETRY);
  }
  logger.info(JSON.stringify(event));
  const response = {
    PhysicalResourceId: 'delete-ecs-cluster-custom-resource',
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Reason: '',
    Status: 'SUCCESS',
  };

  try {
    await _handler(event, context);
    logger.info('=== complete ===');
    return response;
  } catch (e: any) {
    logger.error(e);
    response.Status = 'FAILED';
    response.Reason = e.message;
    return response;
  }
};

async function _handler(
  event: CloudFormationCustomResourceEvent,
  context: Context,
) {
  let requestType = event.RequestType;
  logger.info('functionName: ' + context.functionName);

  logger.info('RequestType: ' + requestType);
  if (requestType == 'Delete') {
    await onDelete();
  }
}

async function onDelete() {
  logger.info('onDelete()');
  const clusterName = process.env.ECS_CLUSTER_NAME as string;
  const serviceName = process.env.ECS_SERVICE as string;
  const asgName = process.env.ASG_NAME as string;

  logger.info('clusterName: ' + clusterName);
  logger.info('serviceName: ' + serviceName);
  logger.info('asgName: ' + asgName);

  if (!clusterName || !serviceName || !asgName) {
    throw new Error('clusterName, serviceName or asgName is empty');
  }
  await delEcsClusterAndService(clusterName, serviceName);
  await sleep(10000);
  await delAutoScalingGroup(asgName);
}

async function delEcsClusterAndService(
  clusterName: string,
  serviceName: string,
) {
  logger.info('delEcsClusterAndService()');
  await stopTasksAndDeleteService(clusterName, serviceName);
  await delEcsCluster(clusterName);
}

async function stopTasksAndDeleteService(
  clusterName: string,
  serviceName: string,
) {
  logger.info('stopTasksAndDeleteService()');
  const responseServices = await ecsClient.send(
    new DescribeServicesCommand({
      cluster: clusterName,
      services: [serviceName],
    }),
  );

  const services = responseServices.services?.filter(
    (service) => service.status != 'INACTIVE',
  );

  if (services) {
    for (const service of services) {
      logger.info(`service status: ${service.status}`);
      await stopEcsTasks(clusterName, serviceName);
      await deleteEcsService(clusterName, serviceName);
    }
  }
}

async function delEcsCluster(clusterName: string) {
  logger.info('delEcsCluster()');
  let containerInstances = await ecsClient.send(
    new ListContainerInstancesCommand({
      cluster: clusterName,
    }),
  );

  // 1. deregister container instances
  let n = 0;
  while (
    n < max_n &&
    containerInstances.containerInstanceArns &&
    containerInstances.containerInstanceArns.length > 0
  ) {
    n++;
    for (const arn of containerInstances.containerInstanceArns) {
      logger.info(`${n} DeregisterContainerInstance: ${arn}`);
      await ecsClient.send(
        new DeregisterContainerInstanceCommand({
          cluster: clusterName,
          containerInstance: arn,
          force: true,
        }),
      );
    }
    await sleep(10000);
    containerInstances = await ecsClient.send(
      new ListContainerInstancesCommand({
        cluster: clusterName,
      }),
    );
  }

  // 2. delete Cluster
  await ecsClient.send(
    new DeleteClusterCommand({
      cluster: clusterName,
    }),
  );
  await sleep(10000);
}

async function stopEcsTasks(clusterName: string, serviceName: string) {
  logger.info('stopEcsTasks()');

  await ecsClient.send(
    new UpdateServiceCommand({
      cluster: clusterName,
      service: serviceName,
      desiredCount: 0,
    }),
  );

  let taskArns = await listTasks(clusterName, serviceName);
  let n = 0;
  while (n < max_n && taskArns && taskArns.length > 0) {
    n++;
    const stopTask = async (taskArn: string) => {
      logger.info(`${n} stopEcsTask:${taskArn}`);
      await ecsClient.send(
        new StopTaskCommand({
          cluster: clusterName,
          task: taskArn,
          reason: 'stop by cloudformation custom resource',
        }),
      );
    };
    for (const t of taskArns) {
      await stopTask(t);
    }
    await sleep(10000);
    taskArns = await listTasks(clusterName, serviceName);
  }
}

async function listTasks(clusterName: string, serviceName: string) {
  logger.info('listTasks()');
  const listTasksResult = await ecsClient.send(
    new ListTasksCommand({
      cluster: clusterName,
      serviceName: serviceName,
    }),
  );
  const taskArns = listTasksResult.taskArns;
  return taskArns;
}

async function deleteEcsService(clusterName: string, serviceName: string) {
  logger.info('deleteEcsService()');
  await ecsClient.send(
    new DeleteServiceCommand({
      cluster: clusterName,
      service: serviceName,
      force: true,
    }),
  );
  await waitServiceToBeDeleted(clusterName, serviceName);
}

async function waitServiceToBeDeleted(
  clusterName: string,
  serviceName: string,
) {
  logger.info('waitServiceToBeDeleted()');
  const listServices = async (n: number) => {
    const servicesStatus = await ecsClient.send(
      new DescribeServicesCommand({
        cluster: clusterName,
        services: [serviceName],
      }),
    );
    const services = servicesStatus.services
      ?.filter((s) => {
        logger.info(`${n} service status: ${s.status}`);
        return s.status != 'INACTIVE';
      })
      .map((s) => {
        return { status: s.status, name: s.serviceName };
      });
    return services;
  };

  let n = 0;
  let services = await listServices(n);
  while (services && services.length > 0 && n < max_n) {
    n++;
    logger.info(`${n} Non-INACTIVE services: ${JSON.stringify(services)}`);
    await sleep(10000);
    services = await listServices(n);
  }
}

async function delAutoScalingGroup(asgName: string) {
  logger.info('delAutoScalingGroup()');
  await asgClient.send(
    new DeleteAutoScalingGroupCommand({
      AutoScalingGroupName: asgName,
      ForceDelete: true,
    }),
  );
}

async function sleep(millis: number) {
  return new Promise((resolve) => setTimeout(resolve, millis));
}
