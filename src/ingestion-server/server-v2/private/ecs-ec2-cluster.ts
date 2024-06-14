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

import { Aspects, Duration, IAspect, Token } from 'aws-cdk-lib';
import {
  AutoScalingGroup,
  BlockDeviceVolume,
  CfnWarmPool,
  HealthCheck,
} from 'aws-cdk-lib/aws-autoscaling';
import { ISecurityGroup, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import {
  Cluster,
  Ec2Service,
  TaskDefinition,
  AsgCapacityProvider,
  EcsOptimizedImage,
  AmiHardwareType,
  CfnClusterCapacityProviderAssociations,
} from 'aws-cdk-lib/aws-ecs';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { Construct, IConstruct } from 'constructs';
import { ECSEc2Service } from './ecs-ec2-service';
import { createProxyAndWorkerECRImages } from '../../server/private/ecr';

import { addPoliciesToAsgRole } from '../../server/private/iam';
import { IngestionServerV2Props, RESOURCE_ID_PREFIX } from '../ingestion-server-v2';

export interface ECSClusterProps extends IngestionServerV2Props {
  ecsSecurityGroup: ISecurityGroup;
}

export interface EcsServiceResult {
  ecsService: Ec2Service;
  taskDefinition: TaskDefinition;
  httpContainerName: string;
}
export interface EcsClusterResult extends EcsServiceResult {
  ecsCluster: Cluster;
  autoScalingGroup: AutoScalingGroup;
}

export class ECSEc2Cluster extends Construct {
  public readonly ecsCluster: Cluster;
  public readonly ecsService: Ec2Service;
  public readonly httpContainerName: string;
  public readonly ecsInfraRole: IRole;
  public readonly autoScalingGroup: AutoScalingGroup;

  constructor(scope: Construct, id: string, props: ECSClusterProps) {
    super(scope, id);

    const { ecsService, httpContainerName, autoScalingGroup, ecsCluster } = createECSClusterAndService(this, props);

    this.ecsCluster = ecsCluster;
    this.ecsService = ecsService;
    this.httpContainerName = httpContainerName;
    this.autoScalingGroup = autoScalingGroup;
    this.ecsInfraRole = autoScalingGroup.role;
  }
}

function createECSClusterAndService(
  scope: Construct,
  props: ECSClusterProps,
): EcsClusterResult {
  const vpc = props.vpc;

  const ecsCluster = new Cluster(scope, `${RESOURCE_ID_PREFIX}ecs-cluster`, {
    vpc,
    containerInsights: true,
  });

  const ecsAsgSetting = props.ec2FleetProps;
  const arch = ecsAsgSetting.arch;

  const ecsConfig = {
    instanceType: ecsAsgSetting.instanceType,
    machineImage: EcsOptimizedImage.amazonLinux2(
      arch === Platform.LINUX_ARM64 ? AmiHardwareType.ARM : AmiHardwareType.STANDARD,
    ),
    platform: arch,
  };

  const autoScalingGroup = new AutoScalingGroup(scope, `${RESOURCE_ID_PREFIX}ecs-asg`, {
    vpc,
    vpcSubnets: props.vpcSubnets,
    associatePublicIpAddress: props.vpcSubnets.subnetType == SubnetType.PUBLIC,
    instanceType: ecsConfig.instanceType,
    machineImage: ecsConfig.machineImage,
    maxCapacity: ecsAsgSetting.serverMax,
    minCapacity: ecsAsgSetting.serverMin,
    healthCheck: HealthCheck.ec2({
      grace: Duration.seconds(60),
    }),
    securityGroup: props.ecsSecurityGroup,
    // ...notifications,
    blockDevices: [
      {
        deviceName: '/dev/xvda',
        volume: BlockDeviceVolume.ebs(30),
      },
    ],
    requireImdsv2: true,
  });


  if (Token.isUnresolved(ecsAsgSetting.warmPoolSize)) {
    // warmPoolSize is passed by CfnParameter
    new CfnWarmPool(scope, 'warmPool', {
      autoScalingGroupName: autoScalingGroup.autoScalingGroupName,
      minSize: ecsAsgSetting.warmPoolSize,
      maxGroupPreparedCapacity: ecsAsgSetting.warmPoolSize,
    });
  } else {
    // warmPoolSize is passed by normal variable
    if (ecsAsgSetting.warmPoolSize && ecsAsgSetting.warmPoolSize > 0) {
      autoScalingGroup.addWarmPool({
        minSize: ecsAsgSetting.warmPoolSize,
        maxGroupPreparedCapacity: ecsAsgSetting.warmPoolSize,
      });
    }
  }

  addPoliciesToAsgRole(autoScalingGroup.role);

  const capacityProvider = new AsgCapacityProvider(
    scope,
    `${RESOURCE_ID_PREFIX}ecs-capacity-provider`,
    {
      autoScalingGroup,
      enableManagedTerminationProtection: false,
    },
  );

  ecsCluster.addAsgCapacityProvider(capacityProvider);

  const { proxyImage, workerImage } = createProxyAndWorkerECRImages(
    scope,
    ecsConfig.platform,
  );

  const ec2Service = new ECSEc2Service(scope, `${RESOURCE_ID_PREFIX}ecs-service`, {
    ...props,
    ecsCluster,
    proxyImage,
    workerImage,
    capacityProvider,
    autoScalingGroup,
  });

  Aspects.of(scope).add(new AddDefaultCapacityProviderStrategyAspect(capacityProvider));
  return {
    ecsService: ec2Service.ecsService,
    httpContainerName: ec2Service.httpContainerName,
    taskDefinition: ec2Service.taskDefinition,
    autoScalingGroup,
    ecsCluster,
  };
}


class AddDefaultCapacityProviderStrategyAspect implements IAspect {
  capacityProvider: AsgCapacityProvider;

  constructor(capacityProvider: AsgCapacityProvider ) {
    this.capacityProvider = capacityProvider;
  }
  public visit(node: IConstruct): void {
    if (node instanceof CfnClusterCapacityProviderAssociations) {
      node.addPropertyOverride('DefaultCapacityProviderStrategy', [
        {
          Base: 0,
          Weight: 1,
          CapacityProvider: this.capacityProvider.capacityProviderName,
        },
      ]);
    }
  }
}