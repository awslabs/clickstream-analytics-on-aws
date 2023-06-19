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

import {
  ECSClient,
  DeleteClusterCommand,
  UpdateServiceCommand,
  ListContainerInstancesCommand,
  DeregisterContainerInstanceCommand,
  DescribeServicesCommand,
  ListTasksCommand,
  StopTaskCommand,
  DeleteServiceCommand,
} from '@aws-sdk/client-ecs';
import { CloudFormationCustomResourceEvent, Context } from 'aws-lambda';
import { logger } from '../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../common/sdk-client-config';

const region = process.env.AWS_REGION!;

const ecsClient = new ECSClient({
  ...aws_sdk_client_common_config,
  region,
});

interface ResourcePropertiesType {
  ServiceToken: string;
  ecsClusterName: string;
  ecsServiceName: string;
}

type ResourceEvent = CloudFormationCustomResourceEvent;

export const handler = async (event: ResourceEvent, context: Context) => {
  logger.info(JSON.stringify(event));
  try {
    await _handler(event, context);
    logger.info('=== complete ===');
    return;
  } catch (e: any) {
    logger.error(e);
    throw e;
  }
};

async function _handler(
  event: ResourceEvent,
  context: Context,
) {
  const props = event.ResourceProperties as ResourcePropertiesType;

  const requestType = event.RequestType;
  logger.info('functionName: ' + context.functionName);

  const ecsClusterName = props.ecsClusterName;
  const ecsServiceName = props.ecsServiceName;

  if (requestType == 'Delete') {
    logger.info('Delete ECS Cluster');
    try {
      const describeParams = {
        cluster: ecsClusterName,
        services: [ecsServiceName],
      };
      const serviceData = await ecsClient.send(new DescribeServicesCommand(describeParams));

      if (serviceData.services) {
        const status = serviceData.services[0].status;
        const isEcsServiceActive = status === 'ACTIVE';
        if (isEcsServiceActive) {
          await updateEcsService(ecsServiceName, ecsClusterName);
        }
        await deleteEcsService(ecsServiceName, ecsClusterName);

        await deleteContainInstance(ecsClusterName);

        await deleteCluster(ecsClusterName);
      }
    } catch (err) {
      logger.error(`Error deleting ecs cluster ${ecsClusterName}, error: ` + err);
      throw err;
    }

  }
};

async function updateEcsService(ecsServiceName: string, ecsClusterName: string) {
  logger.info(`updateEcsService ${ecsServiceName}, set desiredCount=0`);
  const updateParams = {
    cluster: ecsClusterName,
    service: ecsServiceName,
    desiredCount: 0,
  };
  await ecsClient.send(new UpdateServiceCommand(updateParams));

  // Check if the service's desiredCount has been set to 0
  let isDesiredCountZero = false;
  while (!isDesiredCountZero) {
    const describeParams = {
      cluster: ecsClusterName,
      services: [ecsServiceName],
    };
    const serviceData = await ecsClient.send(new DescribeServicesCommand(describeParams));
    if (!serviceData.services || serviceData.services[0].desiredCount === 0) {
      isDesiredCountZero = true;
    } else {
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  await stopTasks(ecsServiceName, ecsClusterName);

  while (true) {
    const describeParams = {
      cluster: ecsClusterName,
      services: [ecsServiceName],
    };
    const res = await ecsClient.send(new DescribeServicesCommand(describeParams));
    if (res.services) {
      const runningCount = res.services[0].runningCount;
      if (runningCount === 0) {
        break;
      } else {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Sleep for 10 seconds
      }
    } else {
      break;
    }
  }
}

async function stopTasks(ecsServiceName: string, ecsClusterName: string) {
  logger.info('stopTasks ...');

  const listParams = {
    cluster: ecsClusterName,
    serviceName: ecsServiceName,
  };

  const res = await ecsClient.send(new ListTasksCommand(listParams));
  const taskArns = res.taskArns;
  if (taskArns) {
    for (const taskArn of taskArns) {
      const stopParams = {
        cluster: ecsClusterName,
        task: taskArn,
        reason: 'stop by cloudformation custom resource',
      };
      await ecsClient.send(new StopTaskCommand(stopParams));
      logger.info(`Task ${taskArns} stopped successfully`);
    }
  }
}

async function deleteEcsService(ecsServiceName: string, ecsClusterName: string) {
  logger.info(`deleteEcsService ${ecsServiceName}`);
  const deleteParams = {
    cluster: ecsClusterName,
    service: ecsServiceName,
    force: true,
  };
  await ecsClient.send(new DeleteServiceCommand(deleteParams));
}

async function deleteContainInstance(ecsClusterName: string) {
  const listContainerInstancesCommand = new ListContainerInstancesCommand({ cluster: ecsClusterName });
  let containerInstances = await ecsClient.send(listContainerInstancesCommand);
  if (containerInstances.containerInstanceArns) {
    for (const containerInstanceArn of containerInstances.containerInstanceArns) {
      // Deregister each container instance
      const deregisterContainerInstanceCommand = new DeregisterContainerInstanceCommand({
        cluster: ecsClusterName,
        containerInstance: containerInstanceArn,
        force: true,
      });
      await ecsClient.send(deregisterContainerInstanceCommand);
    }
    // Check all instances have been deregistered
    let allDeregistered = false;
    while (!allDeregistered) {
      containerInstances = await ecsClient.send(listContainerInstancesCommand);
      if (!containerInstances.containerInstanceArns || containerInstances.containerInstanceArns.length === 0) {
        allDeregistered = true;
      } else {
        logger.info(`checking if all container instances are deregistered for cluster ${ecsClusterName} `);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
}

async function deleteCluster(ecsClusterName: string) {
  const deleteClusterCommand = new DeleteClusterCommand({ cluster: ecsClusterName });
  const data = await ecsClient.send(deleteClusterCommand);
  logger.info('Success' + data);
}