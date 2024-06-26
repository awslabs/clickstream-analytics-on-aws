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
import { Duration, Stack } from 'aws-cdk-lib';
import {
  Cluster,
  AsgCapacityProvider,
  ContainerImage,
  LogDriver,
} from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';
import { ECSClusterProps } from './ecs-ec2-cluster';

export interface ECSServiceProps extends ECSClusterProps {
  ecsCluster: Cluster;
  proxyImage: ContainerImage;
  workerImage: ContainerImage;
  capacityProvider?: AsgCapacityProvider;
}
export abstract class AbstractECSService extends Construct {

  constructor(scope: Construct, id: string) {
    super(scope, id);
  }
  protected getVectorPortMappings() {
    return [
      {
        containerPort: 8685,
      },
      {
        containerPort: 8686,
      },
    ];
  }

  protected createProxyContainer(taskDefinition: any, props: ECSServiceProps, proxyLogGroup: any) {
    const proxyContainer = taskDefinition.addContainer('proxy', {
      image: props.proxyImage,
      memoryReservationMiB: props.fleetProps.proxyMemory,
      cpu: props.fleetProps.proxyCpu,
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
    return proxyContainer;
  }

  protected createWorkerContainer(taskDefinition: any, props: ECSServiceProps, workerLogGroup: any) {
    taskDefinition.addContainer('worker', {
      image: props.workerImage,
      stopTimeout: Duration.seconds(props.workerStopTimeout),
      memoryReservationMiB: props.fleetProps.workerMemory,
      cpu: props.fleetProps.workerCpu,
      portMappings: this.getVectorPortMappings(),
      environment: this.getVectorEnvs(this, props),
      logging: LogDriver.awsLogs({
        streamPrefix: 'worker',
        logGroup: workerLogGroup,
      }),
    });
  }

  protected getVectorEnvs(scope: Construct, props: ECSClusterProps) {
    const workerThreads = props.fleetProps.workerThreads;
    const streamAckEnable = props.fleetProps.workerStreamAckEnable;

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
}

