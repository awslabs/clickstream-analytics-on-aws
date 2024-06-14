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

import { CfnResource, Duration, Stack, CfnCondition, Fn } from 'aws-cdk-lib';
import { IVpc, SecurityGroup, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { Ec2Service } from 'aws-cdk-lib/aws-ecs';
import {
  ApplicationListener,
  ApplicationProtocol,
  Protocol,
  ListenerCertificate,
  ApplicationLoadBalancer,
  ListenerAction,
  IpAddressType,
  SslPolicy,
  CfnListener,
  CfnLoadBalancer,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
import { LogProps, setAccessLogForApplicationLoadBalancer } from '../../../common/alb';
import { addCfnNagSuppressRules } from '../../../common/cfn-nag';
import { RESOURCE_ID_PREFIX } from '../../server/ingestion-server';

export const PROXY_PORT = 8088;

export function addECSTargetsToListener(
  service: Ec2Service,
  listener: ApplicationListener,
  proxyContainerName: string,
) {
  const targetGroup = listener.addTargets('ECS', {
    protocol: ApplicationProtocol.HTTP,
    port: PROXY_PORT,
    targets: [
      service.loadBalancerTarget({
        containerName: proxyContainerName,
        containerPort: PROXY_PORT,
      }),
    ],
    healthCheck: {
      enabled: true,
      protocol: Protocol.HTTP,
      port: PROXY_PORT.toString(),
      path: '/health',
      interval: Duration.seconds(10),
      timeout: Duration.seconds(6),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 5,
    },
  });

  listener.connections.allowDefaultPortFromAnyIpv4('Open to the world');
  return targetGroup;
}

export interface ApplicationLoadBalancerProps {
  vpc: IVpc;
  publicSubnets: string;
  privateSubnets: string;
  isPrivateSubnetsCondition: CfnCondition;
  certificateArn: string;
  domainName: string;
  protocol: ApplicationProtocol;
  sg: SecurityGroup;
  service: Ec2Service;
  endpointPath: string;
  httpContainerName: string;
  ipAddressType: IpAddressType;
  ports: {
    http: number;
    https: number;
  };
  albLogProps?: LogProps;
  authenticationSecretArn?: string;
}

export function createApplicationLoadBalancer(
  scope: Construct,
  props: ApplicationLoadBalancerProps,
) {
  const httpPort = props.ports.http;
  const httpsPort = props.ports.https;
  const httpContainerName = props.httpContainerName;

  const alb = new ApplicationLoadBalancer(scope, `${RESOURCE_ID_PREFIX}alb`, {
    vpc: props.vpc,
    internetFacing: true,
    ipAddressType: props.ipAddressType,
    securityGroup: props.sg,
    idleTimeout: Duration.minutes(3),
    vpcSubnets: {
      subnetType: SubnetType.PUBLIC,
    },
    dropInvalidHeaderFields: true,
  });

  if (props.albLogProps?.enableAccessLog) {
    if (!props.albLogProps.bucket) {
      throw Error('albLogProps.bucket is not set when enableAccessLog=true');
    }
    setAccessLogForApplicationLoadBalancer(scope, {
      albLogBucket: props.albLogProps.bucket,
      alb,
      albLogPrefix: props.albLogProps.prefix || Stack.of(scope).stackName,
    });
  } else {
    addCfnNagSuppressRules(
      alb.node.defaultChild as CfnResource,
      [
        {
          id: 'W52',
          reason:
            'The product design enables the access log to be enabled or disabled by customer input',
        },
      ],
    );
  }

  let targetGroup;
  let listener;
  if (props.protocol === ApplicationProtocol.HTTPS) {
    listener = alb.addListener('HTTPSListener', {
      protocol: ApplicationProtocol.HTTPS,
      port: httpsPort,
      sslPolicy: SslPolicy.TLS12,
    });
    listener.addCertificates('Certificate', [
      ListenerCertificate.fromArn(props.certificateArn),
    ]);
    targetGroup = addECSTargetsToListener(
      props.service,
      listener,
      httpContainerName,
    );

    const HttpRedirectListener = alb.addListener('HttpRedirectListener', {
      protocol: ApplicationProtocol.HTTP, //NOSONAR it's intended
      port: httpPort,
    });

    HttpRedirectListener.addAction('RedirectToHTTPS', {
      action: ListenerAction.redirect({
        protocol: ApplicationProtocol.HTTPS,
        port: `${httpsPort}`,
      }),
    });

    addCfnNagSuppressRules(
      HttpRedirectListener.node.defaultChild as CfnListener,
      [
        {
          id: 'W56',
          reason:
            'Using HTTP listener is by design',
        },
      ],
    );
  } else {
    listener = alb.addListener('Listener', {
      protocol: ApplicationProtocol.HTTP, //NOSONAR it's intended
      port: httpPort,
    });
    targetGroup = addECSTargetsToListener(
      props.service,
      listener,
      httpContainerName,
    );

    addCfnNagSuppressRules(
      listener.node.defaultChild as CfnListener,
      [
        {
          id: 'W56',
          reason:
            'Using HTTP listener is by design',
        },
      ],
    );
  }

  const cfnAlb = alb.node.defaultChild as CfnLoadBalancer;
  cfnAlb.addPropertyOverride('Scheme',
    Fn.conditionIf(props.isPrivateSubnetsCondition.logicalId, 'internal', 'internet-facing').toString());

  cfnAlb.addPropertyOverride('Subnets',
    Fn.conditionIf(props.isPrivateSubnetsCondition.logicalId, Fn.split(',', props.privateSubnets), Fn.split(',', props.publicSubnets)));

  return { alb, targetGroup, listener };
}