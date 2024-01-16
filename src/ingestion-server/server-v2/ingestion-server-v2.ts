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
} from 'aws-cdk-lib/aws-ec2';
import { IpAddressType } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { CfnAccelerator, CfnEndpointGroup, CfnListener } from 'aws-cdk-lib/aws-globalaccelerator';
import { IStream } from 'aws-cdk-lib/aws-kinesis';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { createGlobalAcceleratorV2 } from './private/aga-v2';
import { createApplicationLoadBalancerV2, PROXY_PORT } from './private/alb-v2';
import { createECSFargateClusterAndService } from './private/ecs-fargate-cluster';
import { deleteECSClusterCustomResource } from '../custom-resource/delete-ecs-cluster';
import { updateAlbRulesCustomResource } from '../custom-resource/update-alb-rules-v2';
import { grantMskReadWrite } from '../server/private/iam';
import { createMetricsWidgetForKafka } from '../server/private/metircs-kafka';
import { createMetricsWidgetForServerV2 } from '../server/private/metircs-server';
import { createALBSecurityGroupV2, createECSSecurityGroup } from '../server/private/sg';

export const RESOURCE_ID_PREFIX = 'clickstream-ingestion-service-';

export const DefaultFleetProps = {
  taskCpu: 256,
  taskMemory: 512,
  workerCpu: 128,
  workerMemory: 256,
  proxyCpu: 128,
  proxyMemory: 256,
  isArm: false,
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

export interface FleetV2Props {
  readonly workerCpu: number;
  readonly workerMemory: number;
  readonly proxyCpu: number;
  readonly proxyMemory: number;
  readonly taskCpu: number;
  readonly taskMemory: number;
  readonly isArm: boolean;
  readonly proxyMaxConnections: number;
  readonly workerThreads: number;
  readonly workerStreamAckEnable: boolean;
  readonly taskMin: number;
  readonly taskMax: number;
  readonly scaleOnCpuUtilizationPercent: number;
}

export interface MskS3SinkConnectorSetting {
  readonly maxWorkerCount: number;
  readonly minWorkerCount: number;
  readonly workerMcuCount: number;
}

export interface IngestionServerV2Props {
  readonly vpc: IVpc;
  readonly vpcSubnets: SubnetSelection;
  readonly fleetProps: FleetV2Props;
  readonly serverEndpointPath: string;
  readonly serverCorsOrigin: string;
  readonly kafkaSinkConfig?: KafkaSinkConfig;
  readonly s3SinkConfig?: S3SinkConfig;
  readonly kinesisSinkConfig?: KinesisSinkConfig;
  readonly protocol: string;
  readonly domainName: string;
  readonly certificateArn: string;
  readonly notificationsTopicArn: string;
  readonly enableApplicationLoadBalancerAccessLog?: string;
  readonly logBucketName: string;
  readonly logPrefix: string;
  readonly loadBalancerIpAddressType?: IpAddressType;
  readonly enableGlobalAccelerator: string;
  readonly devMode: string;
  readonly authenticationSecretArn: string;
  readonly projectId: string;
  readonly appIds: string;
  readonly clickStreamSDK: string;
  readonly workerStopTimeout: number;

  readonly enableAuthentication: string;
}

interface UpdateAlbRulesInput {
  readonly appIds: string;
  readonly clickStreamSDK: string;
  readonly targetGroupArn: string;
  readonly listenerArn: string;
  readonly serverEndpointPath: string;
  readonly protocol: string;
  readonly enableAuthentication: string;
  readonly authenticationSecretArn: string;
  readonly domainName?: string;
}

export class IngestionServerV2 extends Construct {
  public albDNS: string;
  public acceleratorDNS: string;
  public acceleratorEnableCondition: CfnCondition;
  public isHttps: CfnCondition;
  constructor(scope: Construct, id: string, props: IngestionServerV2Props) {
    super(scope, id);

    const ecsSecurityGroup = createECSSecurityGroup(scope, props.vpc);

    if (props.kafkaSinkConfig?.mskSecurityGroup) {
      const mskSg = props.kafkaSinkConfig?.mskSecurityGroup;
      mskSg.addIngressRule(ecsSecurityGroup, Port.tcpRange(9092, 9198));
      mskSg.addIngressRule(mskSg, Port.tcpRange(9092, 9198));
    }

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
    this.acceleratorEnableCondition = acceleratorEnableCondition;

    const ecsResults = createECSFargateClusterAndService(this, {
      ...props,
      ecsSecurityGroup,
    });

    const mskClusterName = props.kafkaSinkConfig?.mskClusterName;
    if (mskClusterName) {
      const autoScalingGroupRole = ecsResults.ecsInfraRole;
      grantMskReadWrite(
        this,
        autoScalingGroupRole,
        mskClusterName,
        'fargate-to-msk-policy',
      );
    }

    // ALB
    const ports = {
      http: 80,
      https: 443,
    };
    const endpointPath = props.serverEndpointPath;

    const isHttps = new CfnCondition(scope, 'IsHTTPS', {
      expression: Fn.conditionEquals(props.protocol, 'HTTPS'),
    });

    this.isHttps = isHttps;

    const albSg = createALBSecurityGroupV2(this, props.vpc, ports, props.enableAuthentication);

    ecsSecurityGroup.addIngressRule(albSg, Port.tcp(PROXY_PORT));

    const { alb, targetGroup, listener }= createApplicationLoadBalancerV2(this, {
      vpc: props.vpc,
      service: ecsResults.ecsService,
      sg: albSg,
      ports,
      endpointPath,
      protocol: props.protocol,
      httpContainerName: ecsResults.httpContainerName,
      certificateArn: props.certificateArn || '',
      domainName: props.domainName || '',
      enableAccessLog: props.enableApplicationLoadBalancerAccessLog || '',
      albLogBucketName: props.logBucketName,
      albLogPrefix: props.logPrefix,

      ipAddressType: props.loadBalancerIpAddressType || IpAddressType.IPV4,
      isHttps,
    });
    this.albDNS = alb.loadBalancerDnsName;

    const { accelerator, agListener, endpointGroup } = createGlobalAcceleratorV2(this, {
      ports,
      protocol: props.protocol,
      alb,
      endpointPath,
      isHttps,
    });

    createMetricsWidgetForServerV2(this, {
      projectId: props.projectId,
      albFullName: alb.loadBalancerFullName,
      ecsServiceName: ecsResults.ecsService.serviceName,
      ecsClusterName: ecsResults.ecsService.cluster.clusterName,
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
    const protocol = props.protocol;
    const domainName = props.domainName;
    const authenticationSecretArn = props.authenticationSecretArn;
    const enableAuthentication = props.enableAuthentication;

    updateAlbRules(this, {
      appIds,
      clickStreamSDK,
      targetGroupArn,
      listenerArn,
      enableAuthentication,
      authenticationSecretArn,
      serverEndpointPath,
      protocol,
      domainName,
    });

    deleteECSCluster(this, ecsResults.ecsCluster.clusterArn, ecsResults.ecsCluster.clusterName, ecsResults.ecsService.serviceName);

    (accelerator.node.defaultChild as CfnAccelerator).cfnOptions.condition = acceleratorEnableCondition;
    (agListener.node.defaultChild as CfnListener).cfnOptions.condition = acceleratorEnableCondition;
    (endpointGroup.node.defaultChild as CfnEndpointGroup).cfnOptions.condition = acceleratorEnableCondition;

    this.acceleratorDNS = accelerator.dnsName;
    this.acceleratorEnableCondition = acceleratorEnableCondition;
  }
}

function updateAlbRules(
  scope: Construct,
  updateAlbRulesInput: UpdateAlbRulesInput,
) {
  const appIds = updateAlbRulesInput.appIds;
  const clickStreamSDK = updateAlbRulesInput.clickStreamSDK;
  const targetGroupArn = updateAlbRulesInput.targetGroupArn;
  const listenerArn = updateAlbRulesInput.listenerArn;
  const authenticationSecretArn = updateAlbRulesInput.authenticationSecretArn;
  const endpointPath = updateAlbRulesInput.serverEndpointPath;
  const domainName = updateAlbRulesInput.domainName;
  const protocol = updateAlbRulesInput.protocol;
  const enableAuthentication = updateAlbRulesInput.enableAuthentication;

  updateAlbRulesCustomResource(scope, {
    appIds,
    clickStreamSDK,
    targetGroupArn,
    listenerArn,
    enableAuthentication,
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