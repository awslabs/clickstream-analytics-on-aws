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
  NestedStack,
  NestedStackProps,
  CfnOutput,
} from 'aws-cdk-lib';
import { Construct, } from 'constructs';
import { SolutionInfo } from '../../common/solution-info';
import {
  IpAddressType,
  ApplicationLoadBalancer,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Port } from 'aws-cdk-lib/aws-ec2';
import { getALBSubnetsCondtion } from '../../common/vpc-utils';
import { createALBSecurityGroupV2, createECSSecurityGroup } from '../server/private/sg';
import { CfnCondition, Fn } from 'aws-cdk-lib';
import { getExistVpc } from '../../common/vpc-utils';
import { ApplicationLoadBalancerV2, PROXY_PORT } from '../server-v2/private/alb-v2';
import { updateAlbRulesCustomResourceV2 } from '../custom-resource/update-alb-rules-v2';
import { GlobalAcceleratorV2 } from '../server-v2/private/aga-v2';
import { CfnAccelerator, CfnEndpointGroup, CfnListener } from 'aws-cdk-lib/aws-globalaccelerator';

export interface IngestionCommonResourcesNestStackProps extends NestedStackProps {
  readonly vpcId: string;
  readonly publicSubnetIds: string,
  readonly privateSubnetIds: string;
  readonly serverEndpointPath: string,
  readonly protocol: string,
  readonly enableAuthentication: string,
  readonly certificateArn: string,
  readonly domainName: string,
  readonly enableApplicationLoadBalancerAccessLog: string,
  readonly logBucketName: string,
  readonly logPrefix: string,
  readonly appIds: string,
  readonly clickStreamSDK: string,
  readonly authenticationSecretArn: string,
  readonly enableGlobalAccelerator: string,
  readonly loadBalancerIpAddressType?: IpAddressType,
}

interface UpdateAlbRulesInput {
  readonly appIds: string;
  readonly clickStreamSDK: string;
  readonly targetGroupArn: string;
  readonly loadBalancerArn: string;
  readonly serverEndpointPath: string;
  readonly protocol: string;
  readonly enableAuthentication: string;
  readonly authenticationSecretArn: string;
  readonly domainName: string;
  readonly certificateArn: string;
}

export class IngestionCommonResourcesNestedStack extends NestedStack {
  public albTargetArn: string;
  public ecsSecurityGroupArn: string;
  public loadBalancerFullName: string;
  public acceleratorDNS: string;
  constructor(
    scope: Construct,
    id: string,
    props: IngestionCommonResourcesNestStackProps,
  ) {
    super(scope, id, props);

    const featureName = 'IngestionCommonResources';

    this.templateOptions.description = `(${SolutionInfo.SOLUTION_ID}-ics) ${SolutionInfo.SOLUTION_NAME} - ${featureName} ${SolutionInfo.SOLUTION_VERSION_DETAIL}`;

    // ALB
    const ports = {
      http: 80,
      https: 443,
    };

    const isHttps = new CfnCondition(this, 'IsHTTPS', {
      expression: Fn.conditionEquals(props.protocol, 'HTTPS'),
    });

    const {albConstructor, ecsSecurityGroup} = createApplicationLoadBalancer(this, props, ports, isHttps);
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

    new CfnOutput(this, 'ingestionServerDNS', {
      value: ingestionServerDNS,
      description: 'Server DNS',
    });

    new CfnOutput(this, 'ingestionServerUrl', {
      value: Fn.conditionIf(isHttps.logicalId,
        `https://${props.domainName}${props.serverEndpointPath}`,
        `http://${ingestionServerDNS}${props.serverEndpointPath}`).toString(),
      description: 'Server Url',
    });
  }
}

function createApplicationLoadBalancer(
  scope: Construct,
  props: IngestionCommonResourcesNestStackProps,
  ports: any,
  isHttps: CfnCondition,
) {
  const endpointPath = props.serverEndpointPath;

  // Vpc
  const vpc = getExistVpc(scope, 'from-vpc-for-alb', {
    vpcId: props.vpcId,
    availabilityZones: Fn.getAzs(),
    publicSubnetIds: Fn.split(',', props.publicSubnetIds),
    privateSubnetIds: Fn.split(',', props.privateSubnetIds),
  });

  const albSg = createALBSecurityGroupV2(scope, vpc, ports, props.enableAuthentication);

  const ecsSecurityGroup = createECSSecurityGroup(scope, vpc);

  ecsSecurityGroup.addIngressRule(albSg, Port.tcp(PROXY_PORT));

  const isPrivateSubnetsCondition = getALBSubnetsCondtion(scope, props.publicSubnetIds, props.privateSubnetIds);

  const albConstructor = new ApplicationLoadBalancerV2(scope, 'ALB', {
    vpc: vpc,
    publicSubnets: props.publicSubnetIds,
    privateSubnets: props.privateSubnetIds,
    isPrivateSubnetsCondition: isPrivateSubnetsCondition,
    sg: albSg,
    ports,
    endpointPath,
    protocol: props.protocol,
    certificateArn: props.certificateArn || '',
    domainName: props.domainName || '',
    enableAccessLog: props.enableApplicationLoadBalancerAccessLog || '',
    albLogBucketName: props.logBucketName,
    albLogPrefix: props.logPrefix,
    ipAddressType: props.loadBalancerIpAddressType || IpAddressType.IPV4,
    isHttps,
  }); 

  updateAlbRules(scope, {
    appIds: props.appIds,
    clickStreamSDK: props.clickStreamSDK,
    targetGroupArn: albConstructor.targetGroup.targetGroupArn,
    loadBalancerArn: albConstructor.alb.loadBalancerArn,
    serverEndpointPath: props.serverEndpointPath,
    protocol: props.protocol,
    enableAuthentication: props.enableAuthentication,
    authenticationSecretArn: props.authenticationSecretArn,
    domainName: props.domainName,
    certificateArn: props.certificateArn,
  });

  return { albConstructor, ecsSecurityGroup };
}

function createAccelerator(
  scope: Construct,
  props: IngestionCommonResourcesNestStackProps,
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
  const loadBalancerArn = updateAlbRulesInput.loadBalancerArn;
  const authenticationSecretArn = updateAlbRulesInput.authenticationSecretArn;
  const endpointPath = updateAlbRulesInput.serverEndpointPath;
  const domainName = updateAlbRulesInput.domainName;
  const protocol = updateAlbRulesInput.protocol;
  const certificateArn = updateAlbRulesInput.certificateArn;

  updateAlbRulesCustomResourceV2(scope, {
    appIds,
    clickStreamSDK,
    targetGroupArn,
    loadBalancerArn,
    authenticationSecretArn,
    endpointPath,
    domainName,
    protocol,
    certificateArn,
  });
}


