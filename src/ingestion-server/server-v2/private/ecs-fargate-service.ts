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

import { INGESTION_SERVER_PING_PATH } from '@aws/clickstream-base-lib';
import { CfnResource, Duration, Stack } from 'aws-cdk-lib';
import {
  Cluster,
  FargateTaskDefinition,
  FargateService,
  ContainerImage,
  LogDriver,
} from 'aws-cdk-lib/aws-ecs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { ECSFargateClusterProps, ECSFargateServiceResult } from './ecs-fargate-cluster';
import { addCfnNagSuppressRules, ruleToSuppressCloudWatchLogEncryption } from '../../../common/cfn-nag';
import { RESOURCE_ID_PREFIX, DefaultFleetProps } from '../../server/ingestion-server';

export interface FargateServiceProps extends ECSFargateClusterProps {
  ecsCluster: Cluster;
  proxyImage: ContainerImage;
  workerImage: ContainerImage;
}

export class ECSFargateService extends Construct {
  public readonly ecsService: FargateService;
  public readonly taskDefinition: FargateTaskDefinition;
  public readonly httpContainerName: string;

  constructor(scope: Construct, id: string, props: FargateServiceProps) {
    super(scope, id);

    const ecsFargateServiceInfo = createECSFargateService(this, props);

    this.ecsService = ecsFargateServiceInfo.ecsService;
    this.taskDefinition = ecsFargateServiceInfo.taskDefinition;
    this.httpContainerName = ecsFargateServiceInfo.httpContainerName;
  }
}

function createECSFargateService(
  scope: Construct,
  props: FargateServiceProps,
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

  const proxyContainer = taskDefinition.addContainer('proxy', {
    image: props.proxyImage,
    memoryReservationMiB:
      256,
    cpu: 128,
    portMappings: [
      {
        containerPort: 8088,
      },
    ],
    environment: {
      NGINX_WORKER_CONNECTIONS: `${props.fleetProps.proxyMaxConnections}`,
      SERVER_ENDPOINT_PATH: props.serverEndpointPath,
      PING_ENDPOINT_PATH: INGESTION_SERVER_PING_PATH,
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
      256,
    cpu: 128,
    portMappings: getVectorPortMappings(),
    environment: getVectorEnvs(scope, props),
    logging: LogDriver.awsLogs({
      streamPrefix: 'worker',
      logGroup: workerLogGroup,
    }),
  });

  const fargateService = new FargateService(scope, `${RESOURCE_ID_PREFIX}ecs-fargate-service`, {
    cluster: props.ecsCluster,
    taskDefinition: taskDefinition,
    securityGroups: [props.ecsSecurityGroup],
    desiredCount: props.fleetProps.taskMin,
  });

  const scalableTarget = fargateService.autoScaleTaskCount({
    minCapacity: props.fleetProps.taskMin,
    maxCapacity: props.fleetProps.taskMax,
  });

  scalableTarget.scaleOnCpuUtilization('CpuScaling', {
    targetUtilizationPercent: props.fleetProps.scaleOnCpuUtilizationPercent || 50,
    scaleInCooldown: Duration.seconds(45),
    scaleOutCooldown: Duration.seconds(1),
  });

  const ecsServiceInfo: ECSFargateServiceResult = {
    ecsService: fargateService,
    taskDefinition,
    httpContainerName: proxyContainer.containerName,
  };

  return ecsServiceInfo;
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

function getVectorEnvs(scope: Construct, props: ECSFargateClusterProps) {
  let workerThreads = DefaultFleetProps.workerThreads;
  let streamAckEnable = DefaultFleetProps.workerStreamAckEnable;

  if (props.fleetProps.workerThreads) {
    workerThreads = props.fleetProps.workerThreads;
  }
  if (props.fleetProps?.workerStreamAckEnable) {
    streamAckEnable = props.fleetProps.workerStreamAckEnable;
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