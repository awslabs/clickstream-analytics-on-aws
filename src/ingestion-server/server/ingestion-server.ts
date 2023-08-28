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

import { CfnCondition, Fn } from 'aws-cdk-lib';
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
import { CfnAccelerator, CfnEndpointGroup, CfnListener } from 'aws-cdk-lib/aws-globalaccelerator';
import { IStream } from 'aws-cdk-lib/aws-kinesis';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { ITopic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { createGlobalAccelerator } from './private/aga';
import { createApplicationLoadBalancer, PROXY_PORT } from './private/alb';
import { createECSClusterAndService } from './private/ecs-cluster';
import { grantMskReadWrite } from './private/iam';
import { createMetricsWidgetForKafka } from './private/metircs-kafka';
import { createMetricsWidgetForServer } from './private/metircs-server';
import { createALBSecurityGroup, createECSSecurityGroup } from './private/sg';
import { LogProps } from '../../common/alb';
import { deleteECSClusterCustomResource } from '../custom-resource/delete-ecs-cluster';
import { updateAlbRulesCustomResource } from '../custom-resource/update-alb-rules';

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

export interface S3SinkConfig {
  readonly s3Bucket: IBucket;
  readonly s3Prefix: string;
  readonly batchMaxBytes: number;
  readonly batchTimeoutSecs: number;
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
  readonly s3SinkConfig?: S3SinkConfig;
  readonly kinesisSinkConfig?: KinesisSinkConfig;
  readonly protocol: ApplicationProtocol;
  readonly domainName?: string;
  readonly certificateArn?: string;
  readonly notificationsTopic?: ITopic;
  readonly loadBalancerLogProps?: LogProps;
  readonly loadBalancerIpAddressType?: IpAddressType;
  readonly enableGlobalAccelerator: string;
  readonly devMode: string;
  readonly authenticationSecretArn?: string;
  readonly projectId: string;
  readonly appIds: string;
  readonly clickStreamSDK: string;
  readonly workerStopTimeout: number;
}

interface UpdateAlbRulesInput {
  readonly appIds: string,
  readonly clickStreamSDK: string,
  readonly targetGroupArn: string,
  readonly listenerArn: string,
  readonly serverEndpointPath: string,
  readonly protocol: ApplicationProtocol,
  readonly domainName?: string,
  readonly authenticationSecretArn?: string
}


export class IngestionServer extends Construct {
  public albDNS: string;
  public acceleratorDNS: string;
  public acceleratorEnableCondition: CfnCondition;
  constructor(scope: Construct, id: string, props: IngestionServerProps) {
    super(scope, id);

    const ecsSecurityGroup = createECSSecurityGroup(scope, props.vpc);

    if (props.kafkaSinkConfig?.mskSecurityGroup) {
      const mskSg = props.kafkaSinkConfig?.mskSecurityGroup;
      mskSg.addIngressRule(ecsSecurityGroup, Port.tcpRange(9092, 9198));
      mskSg.addIngressRule(mskSg, Port.tcpRange(9092, 9198));
    }

    // ECS Cluster
    const { ecsService, httpContainerName, autoScalingGroup, ecsCluster } =
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
    const albSg = createALBSecurityGroup(this, props.vpc, ports, props.authenticationSecretArn);
    ecsSecurityGroup.addIngressRule(albSg, Port.tcp(PROXY_PORT));

    const { alb, targetGroup, listener }= createApplicationLoadBalancer(this, {
      vpc: props.vpc,
      service: ecsService,
      sg: albSg,
      ports,
      endpointPath,
      httpContainerName,
      certificateArn: props.certificateArn || '',
      domainName: props.domainName || '',
      protocol: props.protocol,
      albLogProps: props.loadBalancerLogProps,
      authenticationSecretArn: props.authenticationSecretArn,
      ipAddressType: props.loadBalancerIpAddressType || IpAddressType.IPV4,
    });
    this.albDNS = alb.loadBalancerDnsName;

    const { accelerator, agListener, endpointGroup } = createGlobalAccelerator(this, {
      ports,
      protocol: props.protocol,
      alb,
      endpointPath,
    });

    createMetricsWidgetForServer(this, {
      projectId: props.projectId,
      albFullName: alb.loadBalancerFullName,
      ecsServiceName: ecsService.serviceName,
      ecsClusterName: ecsService.cluster.clusterName,
      autoScalingGroupName: autoScalingGroup.autoScalingGroupName,
    });

    if (props.kafkaSinkConfig && mskClusterName) {
      createMetricsWidgetForKafka(this, {
        projectId: props.projectId,
        mskClusterName: mskClusterName,
        kafkaBrokers: props.kafkaSinkConfig.kafkaBrokers,
        kafkaTopic: props.kafkaSinkConfig.kafkaTopic,
      });
    }

    const appIds = props.appIds;
    const clickStreamSDK = props.clickStreamSDK;
    const targetGroupArn = targetGroup.targetGroupArn;
    const listenerArn = listener.listenerArn;
    const serverEndpointPath = props.serverEndpointPath;
    const protocol: ApplicationProtocol = props.protocol;
    const domainName = props.domainName;
    const authenticationSecretArn = props.authenticationSecretArn;

    updateAlbRules(this, {
      appIds,
      clickStreamSDK,
      targetGroupArn,
      listenerArn,
      serverEndpointPath,
      protocol,
      domainName,
      authenticationSecretArn
    });

    deleteECSCluster(this, ecsCluster.clusterArn, ecsCluster.clusterName, ecsService.serviceName);

    const acceleratorEnableCondition = new CfnCondition(
      scope,
      'acceleratorEnableCondition',
      {
        expression: Fn.conditionAnd(
          Fn.conditionEquals(props.enableGlobalAccelerator, 'Yes'),
          Fn.conditionNot(
            Fn.conditionOr(
              Fn.conditionEquals(Fn.ref('AWS::Region'), 'cn-north-1'),
              Fn.conditionEquals(Fn.ref('AWS::Region'), 'cn-northwest-1'),
            ),
          ),
        ),
      },
    );

    (accelerator.node.defaultChild as CfnAccelerator).cfnOptions.condition = acceleratorEnableCondition;
    (agListener.node.defaultChild as CfnListener).cfnOptions.condition = acceleratorEnableCondition;
    (endpointGroup.node.defaultChild as CfnEndpointGroup).cfnOptions.condition = acceleratorEnableCondition;

    this.acceleratorDNS = accelerator.dnsName;
    this.acceleratorEnableCondition = acceleratorEnableCondition;
  }
}

function updateAlbRules(
  scope: Construct,
  updateAlbRulesInput: UpdateAlbRulesInput
) {
  const appIds = updateAlbRulesInput.appIds;
  const clickStreamSDK = updateAlbRulesInput.clickStreamSDK;
  const targetGroupArn = updateAlbRulesInput.targetGroupArn;
  const listenerArn = updateAlbRulesInput.listenerArn;
  const authenticationSecretArn = updateAlbRulesInput.authenticationSecretArn;
  const endpointPath = updateAlbRulesInput.serverEndpointPath;
  const domainName = updateAlbRulesInput.domainName;
  const protocol = updateAlbRulesInput.protocol;

  updateAlbRulesCustomResource(scope, {
    appIds,
    clickStreamSDK,
    targetGroupArn,
    listenerArn,
    authenticationSecretArn,
    endpointPath,
    domainName,
    protocol,
  });
}

function deleteECSCluster(scope: Construct, ecsClusterArn: string, ecsClusterName: string, ecsServiceName: string) {
  deleteECSClusterCustomResource(scope, {
    ecsClusterArn,
    ecsClusterName,
    ecsServiceName,
  });
}