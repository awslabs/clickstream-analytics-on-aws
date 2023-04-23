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

import { CfnResource, Duration, Stack, SecretValue } from 'aws-cdk-lib';
import { IVpc, SecurityGroup, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { Ec2Service } from 'aws-cdk-lib/aws-ecs';
import {
  ApplicationListener,
  ApplicationProtocol,
  Protocol,
  ListenerCertificate,
  ApplicationTargetGroup,
  ApplicationLoadBalancer,
  ListenerCondition,
  ListenerAction,
  IpAddressType,
  SslPolicy,
  CfnListener,
  UnauthenticatedAction,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
import { LogProps, setAccessLogForApplicationLoadBalancer, createAuthenticationPropsFromSecretArn } from '../../../common/alb';
import { addCfnNagSuppressRules } from '../../../common/cfn-nag';
import { RESOURCE_ID_PREFIX } from '../../server/ingestion-server';

export const PROXY_PORT = 8088;

function addECSTargetsToListener(
  scope: Construct,
  service: Ec2Service,
  listener: ApplicationListener,
  endpointPath: string,
  proxyContainerName: string,
  protocol: ApplicationProtocol,
  domainName: string,
  authenticationSecretArn?: string,
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

  addActionRules(scope, listener, endpointPath, targetGroup, 'forwardToECS', protocol, domainName, authenticationSecretArn);
}

function addActionRules(
  scope: Construct,
  listener: ApplicationListener,
  endpointPath: string,
  targetGroup: ApplicationTargetGroup,
  forwardRuleName: string,
  protocol: ApplicationProtocol,
  domainName: string,
  authenticationSecretArn?: string,
) {
  if (authenticationSecretArn) {
    if (protocol === ApplicationProtocol.HTTPS) {
      const authenticationProps = createAuthenticationPropsFromSecretArn(scope, authenticationSecretArn);
      listener.addAction(`${forwardRuleName}-auth`, {
        priority: 2,
        conditions: [
          ListenerCondition.httpRequestMethods(['GET']),
          ListenerCondition.pathPatterns(['/login']),
        ],
        action: ListenerAction.authenticateOidc({
          authorizationEndpoint: authenticationProps.authorizationEndpoint,
          clientId: authenticationProps.appClientId,
          clientSecret: SecretValue.unsafePlainText(authenticationProps.appClientSecret),
          issuer: authenticationProps.issuer,
          tokenEndpoint: authenticationProps.tokenEndpoint,
          userInfoEndpoint: authenticationProps.userEndpoint,
          onUnauthenticatedRequest: UnauthenticatedAction.AUTHENTICATE,
          next: ListenerAction.fixedResponse(200, {
            contentType: 'text/plain',
            messageBody: 'Authenticated',
          }),
        }),
      });

      listener.addAction(forwardRuleName, {
        priority: 1,
        conditions: [
          ListenerCondition.pathPatterns([`${endpointPath}*`]),
          ...(protocol === ApplicationProtocol.HTTPS ? [ListenerCondition.hostHeaders([domainName])] : []),
        ],
        action: ListenerAction.authenticateOidc({
          authorizationEndpoint: authenticationProps.authorizationEndpoint,
          clientId: authenticationProps.appClientId,
          clientSecret: SecretValue.unsafePlainText(authenticationProps.appClientSecret),
          issuer: authenticationProps.issuer,
          tokenEndpoint: authenticationProps.tokenEndpoint,
          userInfoEndpoint: authenticationProps.userEndpoint,
          onUnauthenticatedRequest: UnauthenticatedAction.DENY,
          next: ListenerAction.forward([targetGroup]),
        }),
      });
    } else {
      throw Error('Cannot enable ALB authentication feature when protocol is HTTP');
    }
  } else {
    listener.addAction(forwardRuleName, {
      priority: 1,
      conditions: [
        ListenerCondition.pathPatterns([`${endpointPath}*`]),
        ...(protocol === ApplicationProtocol.HTTPS ? [ListenerCondition.hostHeaders([domainName])] : []),
      ],
      action: ListenerAction.forward([targetGroup]),
    });
  }

  listener.addAction('DefaultAction', {
    action: ListenerAction.fixedResponse(403, {
      contentType: 'text/plain',
      messageBody: 'DefaultAction: Invalid request',
    }),
  });
  listener.connections.allowDefaultPortFromAnyIpv4('Open to the world');
}

export interface ApplicationLoadBalancerProps {
  vpc: IVpc;
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
  const endpointPath = props.endpointPath;
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

  let albUrl = '';

  if (props.protocol === ApplicationProtocol.HTTPS) {
    const httpsListener = alb.addListener('HTTPSListener', {
      protocol: ApplicationProtocol.HTTPS,
      port: httpsPort,
      sslPolicy: SslPolicy.TLS12,
    });
    httpsListener.addCertificates('Certificate', [
      ListenerCertificate.fromArn(props.certificateArn),
    ]);
    addECSTargetsToListener(
      scope,
      props.service,
      httpsListener,
      endpointPath,
      httpContainerName,
      props.protocol,
      props.domainName,
      props.authenticationSecretArn,
    );

    albUrl = getAlbUrl(alb, 'https', httpsPort, endpointPath);

    const HttpRedirectListener = alb.addListener('HttpRedirectListener', {
      protocol: ApplicationProtocol.HTTP,
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
    const httpListener = alb.addListener('Listener', {
      protocol: ApplicationProtocol.HTTP,
      port: httpPort,
    });
    addECSTargetsToListener(
      scope,
      props.service,
      httpListener,
      endpointPath,
      httpContainerName,
      props.protocol,
      props.domainName,
      props.authenticationSecretArn,
    );

    addCfnNagSuppressRules(
      httpListener.node.defaultChild as CfnListener,
      [
        {
          id: 'W56',
          reason:
            'Using HTTP listener is by design',
        },
      ],
    );

    albUrl = getAlbUrl(alb, 'http', httpPort, endpointPath);
  }
  return { alb, albUrl };
}


function getAlbUrl(
  alb: ApplicationLoadBalancer,
  schema: string,
  httpPort: number,
  endpointPath: string,
): string {
  let albUrl = '';

  if (schema == 'http') {
    if (httpPort != 80) {
      albUrl = `http://${alb.loadBalancerDnsName}:${httpPort}${endpointPath}`;
    } else {
      albUrl = `http://${alb.loadBalancerDnsName}${endpointPath}`;
    }
  } else {
    // https
    if (httpPort != 443) {
      albUrl = `https://${alb.loadBalancerDnsName}:${httpPort}${endpointPath}`;
    } else {
      albUrl = `https://${alb.loadBalancerDnsName}${endpointPath}`;
    }
  }
  return albUrl;
}
