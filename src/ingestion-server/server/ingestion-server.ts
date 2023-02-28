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

import { Stack } from 'aws-cdk-lib';
import {
  ISecurityGroup,
  IVpc,
  SubnetSelection,
  Port,
  InstanceType,
} from 'aws-cdk-lib/aws-ec2';
import {
  ApplicationProtocol, IpAddressType,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { IStream } from 'aws-cdk-lib/aws-kinesis';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';
import { ITopic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { createCertificate } from './private/acm';
import { createApplicationLoadBalancer, PROXY_PORT } from './private/alb';
import { createECSClusterAndService } from './private/ecs-cluster';
import { grantMskReadWrite } from './private/iam';
import { createRecordInRoute53 } from './private/route53';
import { createALBSecurityGroup, createECSSecurityGroup } from './private/sg';
import { LogProps } from '../../common/alb';

export const RESOURCE_ID_PREFIX = 'clickstream-ingestion-service-';

export enum TierType {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
}

export const DefaultFleetProps = {
  workerCpu: 1792,
  proxyCpu: 256,
  instanceType: new InstanceType('c6i.large'),
  isArm: false,
  warmPoolSize: 0,
  proxyReservedMemory: 900,
  workerReservedMemory: 900,
  proxyMaxConnections: 1024,
  workerThreads: 6,
  workerStreamAckEnable: true,
};

export interface KafkaSinkConfig {
  readonly kafkaBrokers: string;
  readonly kafkaTopic: string;
  readonly mskSecurityGroup?: ISecurityGroup;
  readonly mskClusterName?: string;
}

export interface KinesisSinkConfig {
  readonly kinesisDataStream: IStream;
}

export interface FleetProps {
  readonly serverMin: number;
  readonly serverMax: number;
  readonly taskMin: number;
  readonly taskMax: number;
  readonly scaleOnCpuUtilizationPercent?: number;
  readonly instanceType?: InstanceType;
  readonly isArm?: boolean;
  readonly warmPoolSize?: number;
  readonly proxyReservedMemory?: number;
  readonly proxyCpu?: number;
  readonly proxyMaxConnections?: number;
  readonly workerReservedMemory?: number;
  readonly workerCpu?: number;
  readonly workerThreads?: number;
  readonly workerStreamAckEnable?: boolean;
}

export interface MskS3SinkConnectorSetting {
  readonly maxWorkerCount: number;
  readonly minWorkerCount: number;
  readonly workerMcuCount: number;
}

export interface IngestionServerProps {
  readonly vpc: IVpc;
  readonly vpcSubnets: SubnetSelection;
  readonly fleetProps: FleetProps;
  readonly serverEndpointPath: string;
  readonly serverCorsOrigin: string;
  readonly kafkaSinkConfig?: KafkaSinkConfig;
  readonly kinesisSinkConfig?: KinesisSinkConfig;
  readonly domainZone?: IHostedZone;
  readonly protocol?: ApplicationProtocol;
  readonly domainPrefix?: string;
  readonly notificationsTopic?: ITopic;
  readonly loadBalancerLogProps?: LogProps;
  readonly loadBalancerIpAddressType?: IpAddressType;
}

export class IngestionServer extends Construct {
  public serverUrl: string;
  constructor(scope: Construct, id: string, props: IngestionServerProps) {
    super(scope, id);

    const ecsSecurityGroup = createECSSecurityGroup(scope, props.vpc);

    if (props.kafkaSinkConfig?.mskSecurityGroup) {
      const mskSg = props.kafkaSinkConfig?.mskSecurityGroup;
      mskSg.addIngressRule(ecsSecurityGroup, Port.tcpRange(9092, 9198));
    }

    // ECS Cluster
    const { ecsService, httpContainerName, autoScalingGroup } =
      createECSClusterAndService(this, {
        ...props,
        ecsSecurityGroup,
      });


    const mskClusterName = props.kafkaSinkConfig?.mskClusterName;
    if (mskClusterName) {
      const autoScalingGroupRole = autoScalingGroup.role;
      grantMskReadWrite(
        this,
        autoScalingGroupRole,
        mskClusterName,
        'asg-to-msk-policy',
      );
    }

    // ALB
    const ports = {
      http: 80,
      https: 443,
    };
    const endpointPath = props.serverEndpointPath;
    const albSg = createALBSecurityGroup(this, props.vpc, ports);
    ecsSecurityGroup.addIngressRule(albSg, Port.tcp(PROXY_PORT));

    let domainPrefix = `${Stack.of(this).stackName}`;
    if (props.domainPrefix) {
      domainPrefix = props.domainPrefix;
    }

    let certificateArn = undefined;
    if (props.domainZone && props.protocol == ApplicationProtocol.HTTPS) {
      const certificate = createCertificate(
        this,
        props.domainZone,
        domainPrefix,
      );
      certificateArn = certificate.certificateArn;
    }

    const { alb, albUrl } = createApplicationLoadBalancer(this, {
      vpc: props.vpc,
      service: ecsService,
      sg: albSg,
      ports,
      endpointPath,
      httpContainerName,
      certificateArn,
      albLogProps: props.loadBalancerLogProps,
      ipAddressType: props.loadBalancerIpAddressType || IpAddressType.IPV4,
    });
    this.serverUrl = albUrl;

    // add route53 record
    if (props.domainZone) {
      const record = createRecordInRoute53(
        scope,
        domainPrefix,
        alb,
        props.domainZone,
      );
      let schema = 'http';
      if (certificateArn) {
        schema = 'https';
      }
      this.serverUrl = `${schema}://${record.domainName}${endpointPath}`;
    }
  }
}
