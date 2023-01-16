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

import {
  Duration,
  IgnoreMode,
  Arn,
  Aws,
  ArnFormat,
  CfnMapping,
  Fn,
} from 'aws-cdk-lib';
import { Certificate, ICertificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import {
  IVpc,
  ISecurityGroup,
  SecurityGroup,
  Peer,
  Port,
  SubnetSelection,
  Connections,
} from 'aws-cdk-lib/aws-ec2';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import {
  ApplicationLoadBalancer,
  IpAddressType,
  ApplicationProtocol,
  ApplicationListener,
  ListenerCondition,
  ListenerAction,
  IApplicationLoadBalancerTarget,
  HealthCheck,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { LambdaTarget } from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import {
  PolicyStatement,
  ServicePrincipal,
  Role,
  Effect,
  Policy,
  AccountPrincipal,
} from 'aws-cdk-lib/aws-iam';
import { DockerImageFunction, DockerImageCode } from 'aws-cdk-lib/aws-lambda';
import { IHostedZone, ARecord, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { LoadBalancerTarget } from 'aws-cdk-lib/aws-route53-targets';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { Constants } from '../common/constants';
import { LogBucket } from '../common/log-bucket';

export interface RouteProps {
  readonly routePath: string;
  readonly priority: number;
  readonly target: IApplicationLoadBalancerTarget[];
  readonly healthCheck: HealthCheck;
  readonly methods?: string[];
}

export interface FixedResponseProps {
  readonly routePath: string;
  readonly priority: number;
  readonly content: string;
  readonly contentType: string;
}

export interface FrontendProps {
  readonly directory: string;
  readonly dockerfile: string;
}

export interface NetworkProps {
  readonly vpc: IVpc;
  readonly subnets: SubnetSelection;
  readonly port?:	number;
}

export interface DomainProps {
  readonly recordName: string;
  readonly hostZoneName: string;
  readonly hostZone: IHostedZone;
  readonly certificate?:	ICertificate;
}

export interface LogProps {
  readonly enableAccessLog: boolean;
  readonly bucket?: IBucket;
  readonly prefix?: string;
}

export interface ApplicationLoadBalancerProps {
  readonly internetFacing: boolean;
  readonly protocol: ApplicationProtocol;
  readonly idleTimeout?: Duration;
  readonly http2Enabled?: boolean;
  readonly ipAddressType?: IpAddressType;
  readonly healthCheckInterval?: Duration;
  readonly logProps: LogProps;
}

export interface ApplicationLoadBalancerLambdaPortalProps {
  readonly applicationLoadBalancerProps: ApplicationLoadBalancerProps;
  readonly networkProps: NetworkProps;
  readonly frontendProps: FrontendProps;
  readonly domainProsps?: DomainProps;
}

export class ApplicationLoadBalancerLambdaPortal extends Construct {

  public readonly applicationLoadBalancer: ApplicationLoadBalancer;
  public readonly port: number;
  public readonly listener: ApplicationListener;
  public readonly rootPathPriority = 50;
  public readonly securityGroup: ISecurityGroup;
  public readonly sourceSecurityGroupId?: string;
  public readonly controlPlaneUrl: string;

  constructor(scope: Construct, id: string, props: ApplicationLoadBalancerLambdaPortalProps) {
    super(scope, id);

    this.node.addValidation({
      validate: () => {
        const messages: string[] = [];
        if (props.domainProsps !== undefined && props.applicationLoadBalancerProps.protocol === ApplicationProtocol.HTTP) {
          messages.push('Please use the HTTPS protocol when using custom domain name');
        }
        return messages;
      },
    });

    const dockerFile = props.frontendProps.dockerfile ?? 'Dockerfile';
    const image = new DockerImageAsset(this, 'dockerimage', {
      directory: props.frontendProps.directory,
      file: dockerFile,
      ignoreMode: IgnoreMode.DOCKER,
    });

    const fnRole = new Role(this, 'portal_fn_role', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });

    const lambdaFn = new DockerImageFunction(this, 'portal_fn', {
      description: 'Lambda function for console plane of solution Clickstream Analytics on AWS',
      code: DockerImageCode.fromEcr(image.repository, {
        tagOrDigest: image.imageTag,
      }),
      role: fnRole,
    });

    const logGroupArn = Arn.format({
      region: Aws.REGION,
      account: Aws.ACCOUNT_ID,
      partition: Aws.PARTITION,
      resource: 'log-group',
      service: 'logs',
      resourceName: 'aws/lambda/${lambdaFn.functionName}:*',
      arnFormat: ArnFormat.COLON_RESOURCE_NAME,
    });

    const statement = new PolicyStatement({
      actions: [
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'logs:CreateLogGroup',
      ],
      resources: [logGroupArn],
      effect: Effect.ALLOW,
    });

    if (lambdaFn.role !== undefined) {
      const lambdaPolicy = new Policy(this, 'lambda_policy', {
        statements: [statement],
      });
      lambdaPolicy.attachToRole(fnRole);
    }

    this.securityGroup = new SecurityGroup(this, 'portal_sg', {
      vpc: props.networkProps.vpc,
    });

    let port = props.networkProps.port;
    if ( port === undefined) {
      if (props.domainProsps?.certificate === undefined) {
        port = 80;
      } else {
        port = 443;
      }
    }
    this.port = port;

    if (props.applicationLoadBalancerProps.internetFacing) {
      this.securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(port), 'rule of allow inbound traffic from servier port ');
      if (props.applicationLoadBalancerProps.ipAddressType === IpAddressType.DUAL_STACK) {
        this.securityGroup.addIngressRule(Peer.anyIpv6(), Port.tcp(port), 'rule of allow IPv6 inbound traffic from servier port ');
      }
    } else {
      const sourceSg = new SecurityGroup(this, 'portal_source_sg', {
        vpc: props.networkProps.vpc,
      });
      this.sourceSecurityGroupId = sourceSg.securityGroupId;

      this.securityGroup.connections.allowFrom(
        new Connections({
          securityGroups: [sourceSg],
        }),
        Port.tcp(port),
        'application load balancer allow traffic from this security group under internal deploy mode',
      );
    }

    // Need to get immutable version because otherwise the ApplicationLoadBalance
    // would create 0.0.0.0/0 rule for inbound traffic
    const albSgImmutable = SecurityGroup.fromSecurityGroupId(
      this,
      'LoadBalancerSecurityGroupImmutable',
      this.securityGroup.securityGroupId,
      { mutable: false },
    );

    this.applicationLoadBalancer = new ApplicationLoadBalancer(this, 'ALB', {
      vpc: props.networkProps.vpc,
      vpcSubnets: props.networkProps.subnets,
      internetFacing: props.applicationLoadBalancerProps.internetFacing,
      securityGroup: albSgImmutable,
      ipAddressType: props.applicationLoadBalancerProps.ipAddressType ?? IpAddressType.IPV4,
      idleTimeout: props.applicationLoadBalancerProps.idleTimeout ?? Duration.seconds(300),
      http2Enabled: props.applicationLoadBalancerProps.http2Enabled ?? true,
    });

    if (props.domainProsps !== undefined) {
      const customDomainName = Fn.join('.', [props.domainProsps.recordName, props.domainProsps.hostZoneName]);
      this.controlPlaneUrl = 'https://' + customDomainName + ':' + this.port;
    } else {
      this.controlPlaneUrl = 'http://' + this.applicationLoadBalancer.loadBalancerDnsName + ':' + this.port;
    }

    if (props.applicationLoadBalancerProps.logProps.enableAccessLog) {
      let albLogBucket: IBucket;
      if (props.applicationLoadBalancerProps.logProps.bucket === undefined) {
        albLogBucket = new LogBucket(this, 'logbucket', {}).bucket;
      } else {
        albLogBucket = props.applicationLoadBalancerProps.logProps.bucket;
      }

      const albLogServiceAccountMapping = new CfnMapping(this, 'ALBServiceAccountMapping', Constants.ALBLogServiceAccountMapping);

      const albLogPrefix = props.applicationLoadBalancerProps.logProps?.prefix ?? 'console-alb-access-logs';
      albLogBucket.grantPut(new AccountPrincipal(albLogServiceAccountMapping.findInMap(Aws.REGION, 'account')),
        `${albLogPrefix}/AWSLogs/${Aws.ACCOUNT_ID}/*`);

      albLogBucket.grantPut(new ServicePrincipal('logdelivery.elasticloadbalancing.amazonaws.com'),
        `${albLogPrefix}/AWSLogs/${Aws.ACCOUNT_ID}/*`);

      this.applicationLoadBalancer.setAttribute('access_logs.s3.enabled', 'true');
      this.applicationLoadBalancer.setAttribute('access_logs.s3.bucket', albLogBucket.bucketName);
      this.applicationLoadBalancer.setAttribute('access_logs.s3.prefix', albLogPrefix);
    }

    if (props.domainProsps !== undefined) {
      let certificate: ICertificate;
      if (props.domainProsps?.certificate === undefined) {
        certificate = new Certificate(this, 'Certificate', {
          domainName: Fn.join('.', [props.domainProsps.recordName, props.domainProsps.hostZoneName]),
          validation: CertificateValidation.fromDns(props.domainProsps?.hostZone),
        });
      } else {
        certificate = props.domainProsps.certificate;
      }

      this.listener = this.applicationLoadBalancer.addListener('Listener', {
        protocol: ApplicationProtocol.HTTPS,
        port: this.port,
        certificates: [certificate],
      });
    } else {
      this.listener = this.applicationLoadBalancer.addListener('Listener', {
        protocol: ApplicationProtocol.HTTP,
        port: this.port,
      });
    }

    this.listener.addAction('DefaultAction', {
      action: ListenerAction.fixedResponse(404, {
        messageBody: 'Cannot route your request; no matching project found.',
      }),
    });

    //if the protocol is HTTPS, creating a default 80 listener to redirect to HTTPS port
    if (props.applicationLoadBalancerProps.protocol === ApplicationProtocol.HTTPS) {
      const httpListener = this.applicationLoadBalancer.addListener('HttpListener', {
        protocol: ApplicationProtocol.HTTP,
        port: 80,
      });

      httpListener.addAction('RedirectAction', {
        action: ListenerAction.redirect({
          protocol: ApplicationProtocol.HTTPS,
          port: this.port.toString(),
        }),
      });
    }

    const targets = [new LambdaTarget(lambdaFn)];
    const interval = props.applicationLoadBalancerProps.healthCheckInterval ?? Duration.seconds(60);
    const healthCheck = {
      enabled: true,
      interval: interval,
    };

    this.addRoute('control-plane-targets', {
      routePath: '/*',
      priority: this.rootPathPriority,
      target: targets,
      healthCheck: healthCheck,
      methods: ['POST', 'GET'],
    });

    if (props.domainProsps !== undefined) {
      new ARecord(this, 'aliasRecord', {
        recordName: props.domainProsps.recordName,
        zone: props.domainProsps.hostZone,
        target: RecordTarget.fromAlias(new LoadBalancerTarget(this.applicationLoadBalancer)),
      });
    }

  };

  /**
   * Add a route matching and target group to the ALB
   * @param id id of this target
   * @param props RouteProps
   */
  public addRoute(id: string, props: RouteProps) {
    const listenerCondition = [ListenerCondition.pathPatterns([props.routePath])];
    if (props.methods !== undefined) {
      listenerCondition.concat([ListenerCondition.httpRequestMethods(props.methods)]);
    }

    this.listener.addTargets(id, {
      priority: props.priority,
      targets: props.target,
      conditions: listenerCondition,
      healthCheck: props.healthCheck,
    });
  }

  /**
   * Add fixed response to the ALB
   * @param id id of this listener action
   * @param path path match pattern, ex: '/config'
   * @param content the fixed response content
   * @param contentType text/plain | text/css | text/html | application/javascript | application/json
   */
  public addFixedResponse(id: string, props: FixedResponseProps) {
    this.listener.addAction(id, {
      priority: props.priority,
      conditions: [
        ListenerCondition.pathPatterns([props.routePath]),
      ],
      action: ListenerAction.fixedResponse(200, {
        contentType: props.contentType,
        messageBody: props.content,
      }),
    });
  }

}
