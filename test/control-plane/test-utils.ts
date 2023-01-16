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

import { App, Stack } from 'aws-cdk-lib';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { Vpc, IVpc, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { ApplicationProtocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';
import { LogBucket } from '../../src/common/log-bucket';
import {
  ApplicationLoadBalancerLambdaPortal,
  ApplicationLoadBalancerProps,
  DomainProps,
  FrontendProps,
  NetworkProps,
} from '../../src/control-plane/alb-lambda-portal';

export interface VPCAttributes {
  vpcId: string;
  availabilityZones: string[];
  publicSubnetIds: string[];
  privateSubnetIds: string[];
}

export const vpcFromAttr = (
  scope: Construct,
  vpcAttributes: VPCAttributes,
) => {
  return Vpc.fromVpcAttributes(scope, 'testVpc', vpcAttributes);
};

export interface TestStackProps {
  existVpc: boolean;
}

export class TestStack extends Stack {
  public readonly vpc: IVpc;

  constructor(
    scope: Construct,
    id: string,
  ) {
    super(scope, id);

    this.vpc = vpcFromAttr(this, {
      vpcId: 'vpc-11111111111111111',
      availabilityZones: ['test-1a', 'test-1b'],
      publicSubnetIds: ['subnet-11111111111111111', 'subnet-22222222222222222'],
      privateSubnetIds: ['subnet-33333333333333333', 'subnet-44444444444444444'],
    });
  }
}

export interface ApplicationLoadBalancerLambdaPortalTestProps {
  readonly applicationLoadBalancerProps?: ApplicationLoadBalancerProps;
  readonly networkProps?: NetworkProps;
  readonly frontendProps?: FrontendProps;
  readonly domainProsps?: DomainProps;
  readonly hasCert?: boolean;
  readonly port?: number;
  readonly externalBucket?: boolean;
  readonly prefix?: string;
}

export interface StackElemetns {
  stack: TestStack;
  portal: ApplicationLoadBalancerLambdaPortal;
}

export class TestEnv {

  public static newStack() : TestStack {
    return new TestStack(new App(), 'testStack');
  }

  public static newStackWithDefaultPortal() : StackElemetns {

    const stack = new TestStack(new App(), 'testStack');

    const portal = new ApplicationLoadBalancerLambdaPortal(stack, 'test-portal', {
      applicationLoadBalancerProps: {
        internetFacing: true,
        protocol: ApplicationProtocol.HTTP,
        logProps: {
          enableAccessLog: true,
        },
      },
      networkProps: {
        vpc: stack.vpc,
        subnets: { subnetType: SubnetType.PUBLIC },
      },
      frontendProps: {
        directory: './',
        dockerfile: 'src/control-plane/frontend/Dockerfile',
      },
    });

    return { stack, portal };
  }

  public static newStackWithPortalProps( props?: ApplicationLoadBalancerLambdaPortalTestProps) : TestStack {

    const stack = new TestStack(new App(), 'testStack');

    const bucket = props?.externalBucket ? new LogBucket(stack, 'LogBucket').bucket : undefined;
    const prefix = props?.prefix ?? undefined;
    const enableAccessLog = props?.applicationLoadBalancerProps?.logProps.enableAccessLog ?? true;

    let applicationLoadBalancerProps: ApplicationLoadBalancerProps;
    if (props?.applicationLoadBalancerProps !== undefined) {
      applicationLoadBalancerProps = {
        internetFacing: props.applicationLoadBalancerProps.internetFacing,
        protocol: props.applicationLoadBalancerProps.protocol,
        idleTimeout: props.applicationLoadBalancerProps.idleTimeout,
        http2Enabled: props.applicationLoadBalancerProps.http2Enabled,
        ipAddressType: props.applicationLoadBalancerProps.ipAddressType,
        healthCheckInterval: props.applicationLoadBalancerProps.healthCheckInterval,
        logProps: {
          enableAccessLog: enableAccessLog,
          bucket: bucket,
          prefix: prefix,
        },
      };
    } else {
      applicationLoadBalancerProps = {
        internetFacing: true,
        protocol: ApplicationProtocol.HTTP,
        logProps: {
          enableAccessLog: enableAccessLog,
        },
      };
    }

    const networkProps = props?.networkProps ?? {
      vpc: stack.vpc,
      subnets: { subnetType: SubnetType.PUBLIC },
      port: props?.port,
    };
    const frontendProps = props?.frontendProps ?? {
      directory: './',
      dockerfile: 'src/control-plane/frontend/Dockerfile',
    };

    new ApplicationLoadBalancerLambdaPortal(stack, 'test-portal', {
      applicationLoadBalancerProps: applicationLoadBalancerProps,
      networkProps: networkProps,
      frontendProps: frontendProps,
    });

    return stack;
  }

  public static newStackWithPortalPropsAndCusdomain( props?: ApplicationLoadBalancerLambdaPortalTestProps) : TestStack {

    const stack = new TestStack(new App(), 'testStack');

    const applicationLoadBalancerProps = props?.applicationLoadBalancerProps ?? {
      internetFacing: true,
      protocol: ApplicationProtocol.HTTP,
      logProps: {
        enableAccessLog: true,
      },
    };

    const networkProps = props?.networkProps ?? {
      vpc: stack.vpc,
      subnets: { subnetType: SubnetType.PUBLIC },
      port: props?.port,
    };
    const frontendProps = props?.frontendProps ?? {
      directory: './',
      dockerfile: 'src/control-plane/frontend/Dockerfile',
    };

    const testHostedZone = new HostedZone(stack, 'HostedZone', {
      zoneName: 'example.com',
    });

    let domainProps: DomainProps;
    if (props?.hasCert) {
      const certificate = new Certificate(stack, 'Certificate', {
        domainName: 'test.example.com',
        validation: CertificateValidation.fromDns(testHostedZone),
      });

      domainProps = {
        hostZoneName: 'example.com',
        recordName: 'test011',
        hostZone: testHostedZone,
        certificate: certificate,
      };
    } else {
      domainProps = {
        hostZoneName: 'example.com',
        recordName: 'test011',
        hostZone: testHostedZone,
      };
    }

    new ApplicationLoadBalancerLambdaPortal(stack, 'test-portal', {
      applicationLoadBalancerProps: applicationLoadBalancerProps,
      networkProps: networkProps,
      frontendProps: frontendProps,
      domainProsps: domainProps,
    });

    return stack;
  }
}