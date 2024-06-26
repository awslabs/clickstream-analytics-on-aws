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

import {
  OUTPUT_INGESTION_SERVER_DNS_SUFFIX,
  OUTPUT_INGESTION_SERVER_URL_SUFFIX,
} from '@aws/clickstream-base-lib';
import {
  CfnOutput,
  CfnCondition,
  Fn,
} from 'aws-cdk-lib';
import {
  ISecurityGroup,
  Port,
} from 'aws-cdk-lib/aws-ec2';
import {
  IpAddressType,
  ApplicationLoadBalancer,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { CfnAccelerator, CfnEndpointGroup, CfnListener } from 'aws-cdk-lib/aws-globalaccelerator';
import { Construct } from 'constructs';
import { getExistVpc, getALBSubnetsCondtion } from '../../common/vpc-utils';
import {
  S3BucketProps,
  IngestionAuthenticationProps,
  NetworkProps,
} from '../../ingestion-server-v2-stack';
import { updateAlbRulesCustomResource } from '../custom-resource/update-alb-rules';
import { createALBSecurityGroupV2, createECSSecurityGroup } from '../server/private/sg';
import { GlobalAcceleratorV2 } from '../server-v2/private/aga-v2';
import { ApplicationLoadBalancerV2, PROXY_PORT } from '../server-v2/private/alb-v2';

export interface IngestionCommonResourcesProps {
  readonly networkProps: NetworkProps;

  readonly serverEndpointPath: string;
  readonly protocol: string;
  readonly certificateArn: string;
  readonly domainName: string;
  readonly enableApplicationLoadBalancerAccessLog: string;
  readonly logBucket: S3BucketProps;
  readonly appIds: string;
  readonly clickStreamSDK: string;
  readonly enableGlobalAccelerator: string;
  readonly authenticationProps: IngestionAuthenticationProps;
  readonly loadBalancerIpAddressType?: IpAddressType;
}

interface UpdateAlbRulesInput {
  readonly appIds: string;
  readonly clickStreamSDK: string;
  readonly targetGroupArn: string;
  readonly loadBalancerArn: string;
  readonly listenerArn: string;
  readonly serverEndpointPath: string;
  readonly protocol: string;
  readonly authenticationProps: IngestionAuthenticationProps;
  readonly domainName: string;
  readonly certificateArn: string;
}

export class IngestionCommonResources extends Construct {
  public albTargetArn: string;
  public ecsSecurityGroupArn: string;
  public loadBalancerFullName: string;
  public acceleratorDNS: string;
  constructor(
    scope: Construct,
    id: string,
    props: IngestionCommonResourcesProps,
  ) {
    super(scope, id);

    // ALB
    const ports = {
      http: 80,
      https: 443,
    };

    const isHttps = new CfnCondition(this, 'IsHTTPS', {
      expression: Fn.conditionEquals(props.protocol, 'HTTPS'),
    });

    const { albConstructor, ecsSecurityGroup } = new CreateApplicationLoadBalancer(this, 'CreateApplicationLoadBalancer', props, ports, isHttps);
    this.albTargetArn = albConstructor.targetGroup.targetGroupArn;
    this.ecsSecurityGroupArn = ecsSecurityGroup.securityGroupId;
    this.loadBalancerFullName = albConstructor.alb.loadBalancerFullName;

    const acceleratorEnableCondition = new CfnCondition(
      this,
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

    const aga = createAccelerator(this, props, acceleratorEnableCondition, ports, isHttps, albConstructor.alb);
    this.acceleratorDNS = aga.accelerator.dnsName;

    const ingestionServerDNS = Fn.conditionIf(
      acceleratorEnableCondition.logicalId,
      aga.accelerator.dnsName,
      albConstructor.alb.loadBalancerDnsName).toString();

    new CfnOutput(this, id + OUTPUT_INGESTION_SERVER_DNS_SUFFIX, {
      value: ingestionServerDNS,
      description: 'Server DNS',
    });

    new CfnOutput(this, id + OUTPUT_INGESTION_SERVER_URL_SUFFIX, {
      value: Fn.conditionIf(isHttps.logicalId,
        `https://${props.domainName}${props.serverEndpointPath}`,
        `http://${ingestionServerDNS}${props.serverEndpointPath}`).toString(),
      description: 'Server Url',
    });
  }
}

export class CreateApplicationLoadBalancer extends Construct {
  public readonly albConstructor: ApplicationLoadBalancerV2;
  public readonly ecsSecurityGroup: ISecurityGroup;
  constructor(
    scope: Construct,
    id: string,
    props: IngestionCommonResourcesProps,
    ports: any,
    isHttps: CfnCondition,
  ) {
    super(scope, id);
    const { albConstructor, ecsSecurityGroup } = createApplicationLoadBalancer(this, props, ports, isHttps);
    this.albConstructor = albConstructor;
    this.ecsSecurityGroup = ecsSecurityGroup;
  }
}

function createApplicationLoadBalancer(
  scope: Construct,
  props: IngestionCommonResourcesProps,
  ports: any,
  isHttps: CfnCondition,
) {
  // Vpc
  const vpc = getExistVpc(scope, 'from-vpc-for-alb', {
    vpcId: props.networkProps.vpcId,
    availabilityZones: Fn.getAzs(),
    publicSubnetIds: Fn.split(',', props.networkProps.publicSubnetIds),
    privateSubnetIds: Fn.split(',', props.networkProps.privateSubnetIds),
  });

  const ecsSecurityGroup = createECSSecurityGroup(scope, vpc);
  const albSg = createALBSecurityGroupV2(scope, vpc, ecsSecurityGroup, ports, props.authenticationProps.enableAuthentication);
  ecsSecurityGroup.addIngressRule(albSg, Port.tcp(PROXY_PORT));

  const isPrivateSubnetsCondition = getALBSubnetsCondtion(scope, props.networkProps.publicSubnetIds, props.networkProps.privateSubnetIds);

  const albConstructor = new ApplicationLoadBalancerV2(scope, 'ALB', {
    vpc: vpc,
    publicSubnets: props.networkProps.publicSubnetIds,
    privateSubnets: props.networkProps.privateSubnetIds,
    isPrivateSubnetsCondition: isPrivateSubnetsCondition,
    sg: albSg,
    ports,
    endpointPath: props.serverEndpointPath,
    protocol: props.protocol,
    certificateArn: props.certificateArn || '',
    domainName: props.domainName || '',
    enableAccessLog: props.enableApplicationLoadBalancerAccessLog,
    albLogBucket: props.logBucket,
    ipAddressType: props.loadBalancerIpAddressType || IpAddressType.IPV4,
    isHttps,
  });

  updateAlbRules(scope, {
    appIds: props.appIds,
    clickStreamSDK: props.clickStreamSDK,
    targetGroupArn: albConstructor.targetGroup.targetGroupArn,
    loadBalancerArn: albConstructor.alb.loadBalancerArn,
    listenerArn: Fn.conditionIf(isHttps.logicalId, albConstructor.httpsListener.listenerArn, albConstructor.httpListener.listenerArn).toString(),
    serverEndpointPath: props.serverEndpointPath,
    protocol: props.protocol,
    authenticationProps: props.authenticationProps,
    domainName: props.domainName,
    certificateArn: props.certificateArn,
  });

  return { albConstructor, ecsSecurityGroup };
}

function createAccelerator(
  scope: Construct,
  props: IngestionCommonResourcesProps,
  acceleratorEnableCondition: CfnCondition,
  ports: any,
  isHttps: CfnCondition,
  alb: ApplicationLoadBalancer,
) {
  const aga = new GlobalAcceleratorV2(
    scope,
    'GlobalAccelerator',
    {
      ports,
      protocol: props.protocol,
      alb,
      endpointPath: props.serverEndpointPath,
      isHttps,
    },
  );

  (aga.accelerator.node.defaultChild as CfnAccelerator).cfnOptions.condition = acceleratorEnableCondition;
  (aga.agListener.node.defaultChild as CfnListener).cfnOptions.condition = acceleratorEnableCondition;
  (aga.endpointGroup.node.defaultChild as CfnEndpointGroup).cfnOptions.condition = acceleratorEnableCondition;
  return aga;
}

function updateAlbRules(
  scope: Construct,
  updateAlbRulesInput: UpdateAlbRulesInput,
) {
  const appIds = updateAlbRulesInput.appIds;
  const clickStreamSDK = updateAlbRulesInput.clickStreamSDK;
  const targetGroupArn = updateAlbRulesInput.targetGroupArn;
  const authenticationProps = updateAlbRulesInput.authenticationProps;
  const endpointPath = updateAlbRulesInput.serverEndpointPath;
  const domainName = updateAlbRulesInput.domainName;
  const protocol = updateAlbRulesInput.protocol;
  const listenerArn = updateAlbRulesInput.listenerArn;

  updateAlbRulesCustomResource(scope, {
    appIds,
    clickStreamSDK,
    targetGroupArn,
    listenerArn,
    enableAuthentication: authenticationProps.enableAuthentication,
    authenticationSecretArn: authenticationProps.authenticationSecretArn,
    endpointPath,
    domainName,
    protocol,
  });
}


