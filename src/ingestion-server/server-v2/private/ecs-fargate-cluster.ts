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
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import {
  Cluster,
  TaskDefinition,
  FargateService,
} from 'aws-cdk-lib/aws-ecs';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { ECSClusterProps } from './ecs-ec2-cluster';
import { ECSFargateService } from './ecs-fargate-service';
import { createProxyAndWorkerECRImages } from '../../server/private/ecr';
import { RESOURCE_ID_PREFIX } from '../ingestion-server-v2';


export interface ECSFargateServiceResult {
  ecsService: FargateService;
  taskDefinition: TaskDefinition;
  httpContainerName: string;
}
export interface ECSFargateClusterResult extends ECSFargateServiceResult {
  ecsInfraRole: IRole;
  ecsCluster: Cluster;
}

export class ECSFargateCluster extends Construct {
  public readonly ecsCluster: Cluster;
  public readonly ecsService: FargateService;
  public readonly taskDefinition: TaskDefinition;
  public readonly httpContainerName: string;
  public readonly ecsInfraRole: IRole;

  constructor(scope: Construct, id: string, props: ECSClusterProps) {
    super(scope, id);

    const ecsFargateClusterInfo = createECSFargateClusterAndService(this, props);

    this.ecsCluster = ecsFargateClusterInfo.ecsCluster;
    this.ecsService = ecsFargateClusterInfo.ecsService;
    this.taskDefinition = ecsFargateClusterInfo.taskDefinition;
    this.httpContainerName = ecsFargateClusterInfo.httpContainerName;
    this.ecsInfraRole = ecsFargateClusterInfo.ecsInfraRole;
  }
}

function createECSFargateClusterAndService(
  scope: Construct,
  props: ECSClusterProps,
): ECSFargateClusterResult {
  const vpc = props.vpc;

  const ecsCluster = new Cluster(scope, `${RESOURCE_ID_PREFIX}ecs-cluster`, {
    vpc,
    containerInsights: true,
  });

  const ecsSetting = props.fleetProps;

  const platform: Platform = ecsSetting.arch;

  const { proxyImage, workerImage } = createProxyAndWorkerECRImages(
    scope,
    platform,
  );

  const ecsFargateService = new ECSFargateService(scope, 'ecs-fargate-service', {
    ...props,
    ecsCluster,
    proxyImage,
    workerImage,
  });

  return {
    ecsService: ecsFargateService.ecsService,
    taskDefinition: ecsFargateService.taskDefinition,
    ecsInfraRole: ecsFargateService.taskDefinition.taskRole,
    httpContainerName: ecsFargateService.httpContainerName,
    ecsCluster,
  };
}