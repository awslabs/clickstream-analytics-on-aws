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
import { ISecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import {
  Cluster,
  TaskDefinition,
  FargateService,
} from 'aws-cdk-lib/aws-ecs';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { createECSFargateService } from './ecs-fargate-service';
import { createProxyAndWorkerECRImages } from '../../server/private/ecr';
import { IngestionServerV2Props, RESOURCE_ID_PREFIX } from '../ingestion-server-v2';

export interface ECSFargateClusterProps extends IngestionServerV2Props {
  ecsSecurityGroup: ISecurityGroup;
}

export interface ECSFargateServiceResult {
  ecsService: FargateService;
  taskDefinition: TaskDefinition;
  httpContainerName: string;
}
export interface ECSFargateClusterResult extends ECSFargateServiceResult {
  ecsInfraRole: IRole;
  ecsCluster: Cluster;
}

export function createECSFargateClusterAndService(
  scope: Construct,
  props: ECSFargateClusterProps,
): ECSFargateClusterResult {
  const vpc = props.vpc;

  const ecsCluster = new Cluster(scope, `${RESOURCE_ID_PREFIX}ecs-cluster`, {
    vpc,
    containerInsights: true,
  });

  const ecsSetting = props.fleetProps;

  const platform: Platform = ecsSetting.isArm ? Platform.LINUX_ARM64 : Platform.LINUX_AMD64;

  const { proxyImage, workerImage } = createProxyAndWorkerECRImages(
    scope,
    platform,
  );

  const ecsServiceInfo = createECSFargateService(scope, {
    ...props,
    ecsCluster,
    proxyImage,
    workerImage,
  });

  return { ...ecsServiceInfo, ecsInfraRole: ecsServiceInfo.taskDefinition.taskRole, ecsCluster };

}