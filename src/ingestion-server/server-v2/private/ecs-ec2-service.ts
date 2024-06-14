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

import { Aspects, CfnResource, Duration, IAspect, Stack } from 'aws-cdk-lib';
import { AutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';
import {
  Cluster,
  AsgCapacityProvider,
  ContainerImage,
  Ec2TaskDefinition,
  LogDriver,
  NetworkMode,
  Ec2Service,
  PropagatedTagSource,
  CfnClusterCapacityProviderAssociations,
} from 'aws-cdk-lib/aws-ecs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct, IConstruct } from 'constructs';
import { ECSClusterProps, EcsServiceResult } from './ecs-ec2-cluster';
import { addCfnNagSuppressRules, ruleToSuppressCloudWatchLogEncryption } from '../../../common/cfn-nag';
import { DefaultEc2FleetProps, RESOURCE_ID_PREFIX } from '../ingestion-server-v2';

export interface Ec2ServiceProps extends ECSClusterProps {
  ecsCluster: Cluster;
  capacityProvider: AsgCapacityProvider;
  autoScalingGroup: AutoScalingGroup;
  proxyImage: ContainerImage;
  workerImage: ContainerImage;
}

export class ECSEc2Service extends Construct {
  public readonly ecsService: Ec2Service;
  public readonly taskDefinition: Ec2TaskDefinition;
  public readonly httpContainerName: string;

  constructor(scope: Construct, id: string, props: Ec2ServiceProps) {
    super(scope, id);

    const ecsEc2ServiceInfo = createECSService(this, props);
    this.ecsService = ecsEc2ServiceInfo.ecsService;
    this.taskDefinition = ecsEc2ServiceInfo.taskDefinition;
    this.httpContainerName = ecsEc2ServiceInfo.httpContainerName;
  }
}

function createECSService(
  scope: Construct,
  props: Ec2ServiceProps,
): EcsServiceResult {
  const ecsAsgSetting = props.ec2FleetProps;
  const taskDefinition = new Ec2TaskDefinition(scope, `${RESOURCE_ID_PREFIX}ecs-task-def`, {
    networkMode: NetworkMode.AWS_VPC,
  });

  let workerConnections = DefaultEc2FleetProps.proxyMaxConnections;
  if (props.ec2FleetProps.proxyMaxConnections) {
    workerConnections = props.ec2FleetProps.proxyMaxConnections;
  }

  const proxyLogGroup = new LogGroup(scope, 'proxy-log', {
    retention: RetentionDays.ONE_MONTH,
  });

  const workerLogGroup = new LogGroup(scope, 'worker-log', {
    retention: RetentionDays.ONE_MONTH,
  });

  addCfnNagSuppressRules(proxyLogGroup.node.defaultChild as CfnResource, [ruleToSuppressCloudWatchLogEncryption()]);

  addCfnNagSuppressRules(workerLogGroup.node.defaultChild as CfnResource, [ruleToSuppressCloudWatchLogEncryption()]);

  const proxyContainer = taskDefinition.addContainer('proxy', {
    image: props.proxyImage,
    memoryReservationMiB:
      ecsAsgSetting.proxyReservedMemory,
    cpu: ecsAsgSetting.proxyCpu,
    portMappings: [
      {
        containerPort: 8088,
      },
    ],
    environment: {
      NGINX_WORKER_CONNECTIONS: `${workerConnections}`,
      SERVER_ENDPOINT_PATH: props.serverEndpointPath,
      SERVER_CORS_ORIGIN: props.serverCorsOrigin,
    },
    logging: LogDriver.awsLogs({
      streamPrefix: 'proxy',
      logGroup: proxyLogGroup,
    }),
  });

  taskDefinition.addContainer('worker', {
    image: props.workerImage,
    stopTimeout: Duration.seconds(props.workerStopTimeout),
    memoryReservationMiB:
      ecsAsgSetting.workerReservedMemory,
    cpu: ecsAsgSetting.workerCpu,
    portMappings: getVectorPortMappings(),
    environment: getVectorEnvs(scope, props),
    logging: LogDriver.awsLogs({
      streamPrefix: 'worker',
      logGroup: workerLogGroup,
    }),
  });

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
        capacityProvider: props.capacityProvider.capacityProviderName,
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

function getVectorEnvs(scope: Construct, props: ECSClusterProps) {
  let workerThreads = DefaultEc2FleetProps.workerThreads;
  let streamAckEnable = DefaultEc2FleetProps.workerStreamAckEnable;

  if (props.ec2FleetProps.workerThreads) {
    workerThreads = props.ec2FleetProps.workerThreads;
  }
  if (props.ec2FleetProps?.workerStreamAckEnable) {
    streamAckEnable = props.ec2FleetProps.workerStreamAckEnable;
  }

  return {
    AWS_REGION: Stack.of(scope).region,
    AWS_MSK_BROKERS: props.kafkaSinkConfig?.kafkaBrokers || '__NOT_SET__',
    AWS_MSK_TOPIC: props.kafkaSinkConfig?.kafkaTopic || '__NOT_SET__',
    AWS_S3_BUCKET: props.s3SinkConfig?.s3Bucket.bucketName || '__NOT_SET__',
    AWS_S3_PREFIX: props.s3SinkConfig?.s3Prefix || '__NOT_SET__',
    DEV_MODE: props.devMode || '__NOT_SET__',
    S3_BATCH_MAX_BYTES: props.s3SinkConfig?.batchMaxBytes? props.s3SinkConfig?.batchMaxBytes + '' : '__NOT_SET__',
    S3_BATCH_TIMEOUT_SECS: props.s3SinkConfig?.batchTimeoutSecs? props.s3SinkConfig?.batchTimeoutSecs + '' : '__NOT_SET__',
    AWS_KINESIS_STREAM_NAME: props.kinesisSinkConfig?.kinesisDataStream.streamName || '__NOT_SET__',
    STREAM_ACK_ENABLE: `${streamAckEnable}`,
    WORKER_THREADS_NUM: `${workerThreads}`,
  };
}

function getVectorPortMappings() {
  return [
    {
      containerPort: 8685,
    },
    {
      containerPort: 8686,
    },
  ];
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
