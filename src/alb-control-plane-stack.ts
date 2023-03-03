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

import path from 'path';
import {
  Duration,
  Stack,
  StackProps,
  Fn,
  CfnOutput,
} from 'aws-cdk-lib';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { Vpc, IVpc, SubnetType, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { ApplicationProtocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { LambdaTarget } from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';
import { LogBucket } from './common/log-bucket';
import { Parameters, SubnetParameterType } from './common/parameters';
import { SolutionInfo } from './common/solution-info';
import { SolutionVpc } from './common/solution-vpc';
import { ApplicationLoadBalancerLambdaPortal } from './control-plane/alb-lambda-portal';
import { ClickStreamApiConstruct } from './control-plane/backend/click-stream-api';

export interface ApplicationLoadBalancerControlPlaneStackProps extends StackProps {
  /**
   * Indicate whether to create a new VPC or use existing VPC for this Solution.
   *
   * @default - false.
   */
  existingVpc?: boolean;

  /**
   * whether the application load balancer is internet facing or intranet.
   *
   */
  internetFacing: boolean;

  /**
   * whether to use customer owned domain name.
   *
   * @default - false.
   */
  useCustomDomain?: boolean;
}

export class ApplicationLoadBalancerControlPlaneStack extends Stack {

  private paramGroups: any[] = [];
  private paramLabels: any = {};

  constructor(scope: Construct, id: string, props: ApplicationLoadBalancerControlPlaneStackProps) {
    super(scope, id, props);

    this.templateOptions.description = SolutionInfo.DESCRIPTION + `- Control Plane within VPC (${props.internetFacing ? 'Public' : 'Private'})`;
    // this.addTransform('AWS::LanguageExtensions');

    let vpc:IVpc|undefined = undefined;

    if (props.existingVpc) {
      const networkParameters = Parameters.createNetworkParameters(this, props.internetFacing,
        SubnetParameterType.List, this.paramGroups, this.paramLabels);

      vpc = Vpc.fromVpcAttributes(this, 'PortalVPC', {
        vpcId: networkParameters.vpcId.valueAsString,
        availabilityZones: Fn.getAzs(),
        publicSubnetIds: networkParameters.publicSubnets?.valueAsList,
        privateSubnetIds: networkParameters.privateSubnets.valueAsList,
      });
    }

    let port = 80;
    const vpcStack = new SolutionVpc(this, `${SolutionInfo.SOLUTION_NAME}Vpc`, {
      vpc: vpc,
    });

    let subnets: SubnetSelection;
    if (props.internetFacing) {
      subnets = { subnetType: SubnetType.PUBLIC };
    } else {
      subnets = { subnetType: SubnetType.PRIVATE_WITH_EGRESS };
    }

    const logBucket = new LogBucket(this, 'logBucket');
    let domainProsps = undefined;
    let protocol = ApplicationProtocol.HTTP;

    if (props.useCustomDomain) {
      port = 443;
      protocol = ApplicationProtocol.HTTPS;

      const domainParameters = Parameters.createDomainParameters(this, this.paramGroups, this.paramLabels);

      const hostedZone = HostedZone.fromHostedZoneAttributes(this, 'hostedZoneId', {
        hostedZoneId: domainParameters.hostedZoneId.valueAsString,
        zoneName: domainParameters.hostedZoneName.valueAsString,
      });

      const certificate = new Certificate(this, 'certificate', {
        domainName: Fn.join('.', [domainParameters.recordName.valueAsString, domainParameters.hostedZoneName.valueAsString]),
        validation: CertificateValidation.fromDns(hostedZone),
      });

      domainProsps = {
        recordName: domainParameters.recordName.valueAsString,
        hostedZoneName: domainParameters.hostedZoneName.valueAsString,
        hostedZone: hostedZone,
        certificate: certificate,
      };
    }

    const controlPlane = new ApplicationLoadBalancerLambdaPortal(this, 'alb_control_plane', {
      applicationLoadBalancerProps: {
        internetFacing: props.internetFacing,
        protocol: protocol,
        logProps: {
          enableAccessLog: true,
          bucket: logBucket.bucket,
        },
      },
      networkProps: {
        vpc: vpcStack.vpc,
        subnets: subnets,
        port: port,
      },
      domainProsps: domainProsps,
      frontendProps: {
        directory: path.join(__dirname, '../'),
        dockerfile: 'src/control-plane/frontend/Dockerfile',
      },
    });

    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: this.paramGroups,
        ParameterLabels: this.paramLabels,
      },
    };

    if (!controlPlane.applicationLoadBalancer.vpc) {
      throw new Error('Application Load Balancer VPC create error.');
    }
    const clickStreamApi = new ClickStreamApiConstruct(this, 'ClickStreamApi', {
      fronting: 'alb',
      dictionaryItems: [],
      applicationLoadBalancer: {
        vpc: controlPlane.applicationLoadBalancer.vpc,
        subnets,
        securityGroup: controlPlane.securityGroup,
      },
    });

    controlPlane.addRoute('api-targets', {
      routePath: '/api/*',
      priority: controlPlane.rootPathPriority - 1,
      target: [new LambdaTarget(clickStreamApi.clickStreamApiFunction)],
      healthCheck: {
        enabled: true,
        interval: Duration.seconds(60),
      },
      methods: ['POST', 'GET', 'PUT', 'DELETE'],
    });


    new CfnOutput(this, 'ControlPlaneUrl', {
      description: 'The url of the controlPlane UI',
      value: controlPlane.controlPlaneUrl,
    }).overrideLogicalId('ControlPlaneUrl');

    if (!props.internetFacing && controlPlane.sourceSecurityGroupId != undefined) {
      new CfnOutput(this, 'SourceSecurityGroup', {
        description: 'Application load balancer allow traffic from this security by default',
        value: controlPlane.sourceSecurityGroupId,
      }).overrideLogicalId('SourceSecurityGroup');
    }

  }
}