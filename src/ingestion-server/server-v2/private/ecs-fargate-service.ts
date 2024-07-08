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

import { CfnResource, Duration } from 'aws-cdk-lib';
import {
  FargateTaskDefinition,
  FargateService,
} from 'aws-cdk-lib/aws-ecs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { AbstractECSService, ECSServiceProps } from './ecs-abstract-service';
import { ECSFargateServiceResult } from './ecs-fargate-cluster';
import { addCfnNagSuppressRules, ruleToSuppressCloudWatchLogEncryption } from '../../../common/cfn-nag';
import { RESOURCE_ID_PREFIX } from '../../server/ingestion-server';


export class ECSFargateService extends AbstractECSService {
  public readonly ecsService: FargateService;
  public readonly taskDefinition: FargateTaskDefinition;
  public readonly httpContainerName: string;

  constructor(scope: Construct, id: string, props: ECSServiceProps) {
    super(scope, id);

    const ecsFargateServiceInfo = this.createECSFargateService(this, props);

    this.ecsService = ecsFargateServiceInfo.ecsService;
    this.taskDefinition = ecsFargateServiceInfo.taskDefinition;
    this.httpContainerName = ecsFargateServiceInfo.httpContainerName;
  }

  createECSFargateService(
    scope: Construct,
    props: ECSServiceProps,
  ): ECSFargateServiceResult {

    const taskDefinition = new FargateTaskDefinition(scope, `${RESOURCE_ID_PREFIX}ecs-fargate-task-def`, {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    if (props.s3SinkConfig) {
      props.s3SinkConfig?.s3Bucket.grantReadWrite(taskDefinition.taskRole);
    }

    if (props.kinesisSinkConfig) {
      props.kinesisSinkConfig.kinesisDataStream.grantReadWrite(taskDefinition.taskRole);
    }

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

    const fargateService = new FargateService(scope, `${RESOURCE_ID_PREFIX}ecs-fargate-service`, {
      cluster: props.ecsCluster,
      taskDefinition: taskDefinition,
      securityGroups: [props.ecsSecurityGroup],
      healthCheckGracePeriod: Duration.seconds(60),
      desiredCount: props.fleetProps.taskMin,
    });

    const scalableTarget = fargateService.autoScaleTaskCount({
      minCapacity: props.fleetProps.taskMin,
      maxCapacity: props.fleetProps.taskMax,
    });

    const loadBalancer: any[] = [
      {
        ContainerName: 'proxy',
        ContainerPort: 8088,
        TargetGroupArn: props.albTargetGroupArn,
      },
    ];

    const cfnFargateService = fargateService.node.defaultChild as CfnResource;
    cfnFargateService.addPropertyOverride('LoadBalancers', loadBalancer);

    scalableTarget.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: props.fleetProps.scaleOnCpuUtilizationPercent || 50,
      scaleInCooldown: Duration.minutes(45),
      scaleOutCooldown: Duration.minutes(1),
    });

    const ecsServiceInfo: ECSFargateServiceResult = {
      ecsService: fargateService,
      taskDefinition,
      httpContainerName: proxyContainer.containerName,
    };

    return ecsServiceInfo;
  }
}
