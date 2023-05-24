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
  Duration,
  IgnoreMode,
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
  CfnSecurityGroup,
} from 'aws-cdk-lib/aws-ec2';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import {
  ApplicationLoadBalancer,
  IpAddressType,
  ApplicationProtocol,
  ApplicationListener,
  ListenerCondition,
  ListenerAction,
  IApplicationLoadBalancerTarget,
  HealthCheck,
  CfnListener,
  SslPolicy,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { LambdaTarget } from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import {
  ServicePrincipal,
  Role,
} from 'aws-cdk-lib/aws-iam';
import {
  DockerImageFunction,
  DockerImageCode,
  Architecture,
} from 'aws-cdk-lib/aws-lambda';
import { IHostedZone, ARecord, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { LoadBalancerTarget } from 'aws-cdk-lib/aws-route53-targets';
import { IBucket, Bucket, BucketEncryption, BlockPublicAccess } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { Constant } from './private/constant';
import { LogProps, setAccessLogForApplicationLoadBalancer } from '../common/alb';
import { addCfnNagSuppressRules } from '../common/cfn-nag';
import { cloudWatchSendLogs, createENI } from '../common/lambda';
import { POWERTOOLS_ENVS } from '../common/powertools';

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
  readonly buildArgs?: {
    [key: string]: string;
  };
  readonly plaform?: Platform;

  /**
   * The maximum of concurrent executations you want to reserve for the Frontend function
   *
   * @default - 5
   */
  readonly reservedConcurrentExecutions?: number;
}

export interface NetworkProps {
  readonly vpc: IVpc;
  readonly subnets: SubnetSelection;
  readonly port?:	number;
}

export interface DomainProps {
  readonly recordName: string;
  readonly hostedZoneName: string;
  readonly hostedZone: IHostedZone;
  readonly certificate?:	ICertificate;
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
  readonly domainProps?: DomainProps;
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

    const selectedVPCs = props.networkProps.vpc.selectSubnets(props.networkProps.subnets);
    if (props.applicationLoadBalancerProps.internetFacing != selectedVPCs.hasPublic) {
      throw new Error(`Make sure the given ${props.applicationLoadBalancerProps.internetFacing ? 'public' : 'private'} subnets for your load balancer.`);
    }

    this.node.addValidation({
      validate: () => {
        const messages: string[] = [];
        if (props.domainProps !== undefined && props.applicationLoadBalancerProps.protocol === ApplicationProtocol.HTTP) {
          messages.push(Constant.ERROR_CUSTOM_DOMAIN_REQUIRE_HTTPS);
        }
        return messages;
      },
    });

    const dockerFile = props.frontendProps.dockerfile ?? 'Dockerfile';
    const fnRole = new Role(this, 'portal_fn_role', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });

    const frontendLambdaSG = new SecurityGroup(this, 'frontend_function_sg', {
      vpc: props.networkProps.vpc,
      allowAllOutbound: false,
    });
    addCfnNagSuppressRules(
      frontendLambdaSG.node.defaultChild as CfnSecurityGroup,
      [
        {
          id: 'W29',
          reason:
              'Disallow all egress traffic',
        },
      ],
    );

    const lambdaFn = new DockerImageFunction(this, 'portal_fn', {
      description: 'Lambda function for console plane of solution Clickstream Analytics on AWS',
      code: DockerImageCode.fromImageAsset(props.frontendProps.directory, {
        file: dockerFile,
        ignoreMode: IgnoreMode.DOCKER,
        buildArgs: props.frontendProps.buildArgs,
        platform: props.frontendProps.plaform,
      }),
      role: fnRole,
      reservedConcurrentExecutions: props.frontendProps.reservedConcurrentExecutions ?? 5,
      vpc: props.networkProps.vpc,
      allowPublicSubnet: props.applicationLoadBalancerProps.internetFacing,
      vpcSubnets: props.networkProps.subnets,
      securityGroups: [frontendLambdaSG],
      architecture: Architecture.X86_64,
      environment: {
        ... POWERTOOLS_ENVS,
      },
    });

    createENI('frontend-func-eni', cloudWatchSendLogs('frontend-func-logs', lambdaFn));

    this.securityGroup = new SecurityGroup(this, 'portal_sg', {
      vpc: props.networkProps.vpc,
      allowAllOutbound: false,
    });
    addCfnNagSuppressRules(
      this.securityGroup.node.defaultChild as CfnSecurityGroup,
      [
        {
          id: 'W29',
          reason:
              'Disallow all egress traffic',
        },
        {
          id: 'W9',
          reason:
              'The open world ingress rule is by design',
        },
        {
          id: 'W2',
          reason:
              'The SG is used by ELB to receive internet traffic',
        },
        {
          id: 'W40',
          reason: 'Design intent: Security Groups egress with an IpProtocol of -1',
        },
      ],
    );

    let port = props.networkProps.port;
    if ( port === undefined) {
      if (props.domainProps?.certificate === undefined) {
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
        allowAllOutbound: false,
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
      {
        mutable: false,
        allowAllOutbound: false,
      },
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

    if (props.domainProps !== undefined) {
      const customDomainName = Fn.join('.', [props.domainProps.recordName, props.domainProps.hostedZoneName]);
      this.controlPlaneUrl = 'https://' + customDomainName + ':' + this.port;
    } else {
      this.controlPlaneUrl = 'http://' + this.applicationLoadBalancer.loadBalancerDnsName + ':' + this.port;
    }

    if (props.applicationLoadBalancerProps.logProps.enableAccessLog) {
      let albLogBucket: IBucket;
      if (props.applicationLoadBalancerProps.logProps.bucket === undefined) {
        albLogBucket = new Bucket(this, 'logbucket', {
          encryption: BucketEncryption.S3_MANAGED,
          enforceSSL: true,
          blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
          serverAccessLogsPrefix: props.applicationLoadBalancerProps.logProps.enableAccessLog ?
            (props.applicationLoadBalancerProps.logProps.prefix ?? 'bucket-access-logs') : undefined,
        });
      } else {
        albLogBucket = props.applicationLoadBalancerProps.logProps.bucket;
      }
      const albLogPrefix = props.applicationLoadBalancerProps.logProps?.prefix ?? 'console-alb-access-logs/';
      setAccessLogForApplicationLoadBalancer(scope, {
        alb: this.applicationLoadBalancer,
        albLogBucket: albLogBucket,
        albLogPrefix: albLogPrefix,
      });
    }

    if (props.domainProps !== undefined) {
      let certificate: ICertificate;
      if (props.domainProps?.certificate === undefined) {
        certificate = new Certificate(this, 'Certificate', {
          domainName: Fn.join('.', [props.domainProps.recordName, props.domainProps.hostedZoneName]),
          validation: CertificateValidation.fromDns(props.domainProps?.hostedZone),
        });
      } else {
        certificate = props.domainProps.certificate;
      }

      this.listener = this.applicationLoadBalancer.addListener('Listener', {
        protocol: ApplicationProtocol.HTTPS,
        port: this.port,
        certificates: [certificate],
        sslPolicy: SslPolicy.TLS12_EXT,
      });
    } else {
      this.listener = this.applicationLoadBalancer.addListener('Listener', {
        protocol: ApplicationProtocol.HTTP,
        port: this.port,
      });
      addCfnNagSuppressRules(
        this.listener.node.defaultChild as CfnListener,
        [
          {
            id: 'W56',
            reason:
              'Using HTTP listener is by design',
          },
        ],
      );
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

      //add ingress rule to allow 80 port
      this.securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80), 'rule of allow inbound traffic from 80 port ');
      if (props.applicationLoadBalancerProps.ipAddressType === IpAddressType.DUAL_STACK) {
        this.securityGroup.addIngressRule(Peer.anyIpv6(), Port.tcp(80), 'rule of allow IPv6 inbound traffic from 80 port ');
      }

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

    if (props.domainProps !== undefined) {
      new ARecord(this, 'aliasRecord', {
        recordName: props.domainProps.recordName,
        zone: props.domainProps.hostedZone,
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
