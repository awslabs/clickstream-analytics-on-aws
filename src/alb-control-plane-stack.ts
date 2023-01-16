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
  CfnParameter,
  Stack,
  StackProps,
  Fn,
  CfnOutput,
} from 'aws-cdk-lib';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { Vpc, IVpc, SubnetType, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { ApplicationProtocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';
import { LogBucket } from './common/log-bucket';
import { SolutionInfo } from './common/solution-info';
import { SolutionVpc } from './common/solution-vpc';
import { ApplicationLoadBalancerLambdaPortal } from './control-plane/alb-lambda-portal';


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

  constructor(scope: Construct, id: string, props: ApplicationLoadBalancerControlPlaneStackProps) {
    super(scope, id, props);

    this.templateOptions.description = SolutionInfo.DESCRIPTION + `- Control Plane within VPC (${props.internetFacing ? 'Public' : 'Private'})`;

    let vpc:IVpc|undefined = undefined;

    if (props.existingVpc) {
      const vpcId = new CfnParameter(this, 'vpcId', {
        description: 'The VPC id which will deploy rsource in. e.g. vpc-bef13dc7',
        type: 'AWS::EC2::VPC::Id',
      });

      const publicSubnets = new CfnParameter(this, 'publicSubnets', {
        description: 'Select public subnets',
        type: 'List<AWS::EC2::Subnet::Id>',
      });

      const privateSubnets = new CfnParameter(this, 'privateSubnets', {
        description:
          'Select private subnets',
        type: 'List<AWS::EC2::Subnet::Id>',
      });

      vpc = Vpc.fromVpcAttributes(this, 'PortalVPC', {
        vpcId: vpcId.valueAsString,
        availabilityZones: Fn.getAzs(),
        publicSubnetIds: publicSubnets.valueAsList,
        privateSubnetIds: privateSubnets.valueAsList,
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
      const hostZoneId = new CfnParameter(this, 'hostZoneId', {
        description: 'The route53 hostzone id.',
        type: 'AWS::Route53::HostedZone::Id',
      });
      const recordName = new CfnParameter(this, 'recordName', {
        description: 'Record name(the name of the domain or subdomain)',
        type: 'String',
        allowedPattern: '[a-zA-Z0-9]{1,63}',
      });
      const hostZoneName = new CfnParameter(this, 'hostZoneName', {
        description: 'Hosted zone name in Route 53',
        type: 'String',
        allowedPattern: '^(?:[a-zA-Z0-9!"#\\$%&\'\\(\\)\\*\\+,/:;<=>\\?@\\[\\]\\^_`{\\|}~\\\\]+(?:\-*[a-zA-Z0-9!"#\\$%&\'\\(\\)\\*\\+,/:;<=>\\?@\\[\\]\\^_`{\\|}~\\\\])*\\.)+[a-zA-Z0-9]{2,63}$',
      });

      const hostZone = HostedZone.fromHostedZoneAttributes(this, 'hostZone', {
        hostedZoneId: hostZoneId.valueAsString,
        zoneName: hostZoneName.valueAsString,
      });

      const certificate = new Certificate(this, 'Certificate', {
        domainName: Fn.join('.', [recordName.valueAsString, hostZoneName.valueAsString]),
        validation: CertificateValidation.fromDns(hostZone),
      });

      domainProsps = {
        recordName: recordName.valueAsString,
        hostZoneName: hostZoneName.valueAsString,
        hostZone: hostZone,
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


