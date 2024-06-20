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

import { Aspects, CfnResource, Duration, IAspect } from 'aws-cdk-lib';
import {
  Ec2TaskDefinition,
  NetworkMode,
  Ec2Service,
  PropagatedTagSource,
  CfnClusterCapacityProviderAssociations,
} from 'aws-cdk-lib/aws-ecs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct, IConstruct } from 'constructs';
import { AbstractECSService, ECSServiceProps } from './ecs-abstract-service';
import { EcsServiceResult } from './ecs-ec2-cluster';
import { addCfnNagSuppressRules, ruleToSuppressCloudWatchLogEncryption } from '../../../common/cfn-nag';
import { RESOURCE_ID_PREFIX } from '../ingestion-server-v2';


export class ECSEc2Service extends AbstractECSService {
  public readonly ecsService: Ec2Service;
  public readonly taskDefinition: Ec2TaskDefinition;
  public readonly httpContainerName: string;

  constructor(scope: Construct, id: string, props: ECSServiceProps) {
    super(scope, id);

    const ecsEc2ServiceInfo = this.createECSService(this, props);
    this.ecsService = ecsEc2ServiceInfo.ecsService;
    this.taskDefinition = ecsEc2ServiceInfo.taskDefinition;
    this.httpContainerName = ecsEc2ServiceInfo.httpContainerName;
  }

  createECSService(
    scope: Construct,
    props: ECSServiceProps,
  ): EcsServiceResult {
    const ecsAsgSetting = props.fleetProps;
    const taskDefinition = new Ec2TaskDefinition(scope, `${RESOURCE_ID_PREFIX}ecs-task-def`, {
      networkMode: NetworkMode.AWS_VPC,
    });

    const proxyLogGroup = new LogGroup(scope, 'proxy-log', {
      retention: RetentionDays.ONE_MONTH,
    });

    const workerLogGroup = new LogGroup(scope, 'worker-log', {
      retention: RetentionDays.ONE_MONTH,
    });

    addCfnNagSuppressRules(proxyLogGroup.node.defaultChild as CfnResource, [ruleToSuppressCloudWatchLogEncryption()]);

    addCfnNagSuppressRules(workerLogGroup.node.defaultChild as CfnResource, [ruleToSuppressCloudWatchLogEncryption()]);

    const proxyContainer = this.createProxyContainer(taskDefinition, props, proxyLogGroup);

    this.createWorkerContainer(taskDefinition, props, workerLogGroup);

    const minHealthyPercent = ecsAsgSetting.taskMax == 1 ? 0 : 50;

    const ecsService = new Ec2Service(scope, `${RESOURCE_ID_PREFIX}ecs-service`, {
      cluster: props.ecsCluster,
      taskDefinition,
      securityGroups: [props.ecsSecurityGroup],
      assignPublicIp: false,
      healthCheckGracePeriod: Duration.seconds(60),
      minHealthyPercent,
      propagateTags: PropagatedTagSource.SERVICE,
      capacityProviderStrategies: [
        {
          capacityProvider: props.capacityProvider!.capacityProviderName,
          weight: 1,
        },
      ],
    });
    addScalingPolicy(ecsService, ecsAsgSetting);

    const loadBalancer: any[] = [
      {
        ContainerName: 'proxy',
        ContainerPort: 8088,
        TargetGroupArn: props.albTargetGroupArn,
      },
    ];

    const cfnEc2Service = ecsService.node.defaultChild as CfnResource;
    cfnEc2Service.addPropertyOverride('LoadBalancers', loadBalancer);

    Aspects.of(scope).add(new HotfixCapacityProviderDependencies());

    if (props.s3SinkConfig) {
      props.s3SinkConfig?.s3Bucket.grantReadWrite(taskDefinition.taskRole);
    }

    if (props.kinesisSinkConfig) {
      props.kinesisSinkConfig.kinesisDataStream.grantReadWrite(taskDefinition.taskRole);
    }

    return {
      ecsService,
      taskDefinition,
      httpContainerName: proxyContainer.containerName,
    };
  }
}

function addScalingPolicy(
  ecsService: Ec2Service,
  asgTaskConfig: {
    taskMax: number;
    taskMin: number;
    scaleOnCpuUtilizationPercent?: number;
  },
) {
  const scaling = ecsService.autoScaleTaskCount({
    maxCapacity: asgTaskConfig.taskMax,
    minCapacity: asgTaskConfig.taskMin,
  });
  scaling.scaleOnCpuUtilization('CpuScaling', {
    targetUtilizationPercent: asgTaskConfig.scaleOnCpuUtilizationPercent || 50,
    scaleInCooldown: Duration.minutes(45),
    scaleOutCooldown: Duration.minutes(1),
  });
}

class HotfixCapacityProviderDependencies implements IAspect {
  public visit(node: IConstruct): void {
    if (node instanceof Ec2Service) {
      const children = node.cluster.node.findAll();
      for (const child of children) {
        if (child instanceof CfnClusterCapacityProviderAssociations) {
          child.node.addDependency(node.cluster);
          node.node.addDependency(child);
        }
      }
    }
  }
}
