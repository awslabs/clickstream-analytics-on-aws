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

import { CfnParameter, Stack, StackProps, CfnOutput, Fn, IAspect, CfnResource, Aspects } from 'aws-cdk-lib';
import { DnsValidatedCertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { CfnDistribution } from 'aws-cdk-lib/aws-cloudfront';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Construct, IConstruct } from 'constructs';
import { SolutionInfo } from './common/solution-info';
import { CloudFrontS3Portal, DomainProps, CNCloudFrontS3PortalProps } from './control-plane/cloudfront-s3-portal';
import {
  CfnNagWhitelistForBucketDeployment,
  CfnNagWhitelistForS3BucketDelete,
} from './control-plane/private/nag';

export interface CloudFrontControlPlaneStackProps extends StackProps {
  /**
   * Indicate whether to create stack in CN regions
   *
   * @default - false.
   */
  targetToCNRegions?: boolean;

  /**
   * Whether to use custom domain name
   */
  useCustomDomainName?: boolean;
}

export class CloudFrontControlPlaneStack extends Stack {

  private paramGroups: any[] = [];
  private paramLabels: any = {};

  constructor(scope: Construct, id: string, props?: CloudFrontControlPlaneStackProps) {
    super(scope, id, props);

    this.templateOptions.description = SolutionInfo.DESCRIPTION + '- Control Plane';

    let domainProps: DomainProps | undefined = undefined;
    let cnCloudFrontS3PortalProps: CNCloudFrontS3PortalProps | undefined;

    if (props?.targetToCNRegions) {

      const domainName = new CfnParameter(this, 'DomainName', {
        description: 'The custom control plane domain name of your solution.',
        type: 'String',
        allowedPattern: '^(?:[a-zA-Z0-9!"#\\$%&\'\\(\\)\\*\\+,/:;<=>\\?@\\[\\]\\^_`{\\|}~\\\\]+(?:\\-*[a-zA-Z0-9!"#\\$%&\'\\(\\)\\*\\+,/:;<=>\\?@\\[\\]\\^_`{\\|}~\\\\])*\\.)+[a-zA-Z0-9]{2,63}$',
        constraintDescription: "Valid characters: a-z, 0-9, ! \" # $ % & ' ( ) * + , - / : ; < = > ? @ [ \ ] ^ _ ` { | } . ~",
      });
      this.addToParamLabels('Domain Name', domainName.logicalId);

      const iamCertificateId = new CfnParameter(this, 'IAMCertificateId', {
        description: 'IAM certificate ID',
        type: 'String',
      });
      this.addToParamLabels('IAM Certificate ID', iamCertificateId.logicalId);

      cnCloudFrontS3PortalProps = {
        domainName: domainName.valueAsString,
        iamCertificateId: iamCertificateId.valueAsString,
      };

      Aspects.of(this).add(new InjectCustomResourceConfig('true'));

      this.addToParamGroups(
        'Domain Information',
        domainName.logicalId,
        iamCertificateId.logicalId,
      );

    } else {
      if (props?.useCustomDomainName) {

        const hostZoneId = new CfnParameter(this, 'HostZoneId', {
          description: 'The hosted zone ID in Route 53.',
          type: 'AWS::Route53::HostedZone::Id',
        });
        this.addToParamLabels('Host Zone ID', hostZoneId.logicalId);

        const hostZoneName = new CfnParameter(this, 'HostZoneName', {
          description: 'Hosted zone name in Route 53',
          type: 'String',
          allowedPattern: '^(?:[a-zA-Z0-9!"#\\$%&\'\\(\\)\\*\\+,/:;<=>\\?@\\[\\]\\^_`{\\|}~\\\\]+(?:\\-*[a-zA-Z0-9!"#\\$%&\'\\(\\)\\*\\+,/:;<=>\\?@\\[\\]\\^_`{\\|}~\\\\])*\\.)+[a-zA-Z0-9]{2,63}$',
          constraintDescription: "Valid characters: a-z, 0-9, ! \" # $ % & ' ( ) * + , - / : ; < = > ? @ [ \ ] ^ _ ` { | } . ~",
        });
        this.addToParamLabels('Host Zone Name', hostZoneName.logicalId);

        const recordName = new CfnParameter(this, 'RecordName', {
          description: 'The record name of you solution control plane.',
          type: 'String',
          allowedPattern: '[a-zA-Z0-9\\-_]{1,63}',
          constraintDescription: 'Valid characters: a-z, 0-9, -, _',
        });
        this.addToParamLabels('Record Name', recordName.logicalId);

        const hostzone = HostedZone.fromHostedZoneAttributes(this, 'hostZone', {
          hostedZoneId: hostZoneId.valueAsString,
          zoneName: hostZoneName.valueAsString,
        });

        const certificate = new DnsValidatedCertificate(this, 'certificate', {
          domainName: Fn.join('.', [recordName.valueAsString, hostZoneName.valueAsString]),
          hostedZone: hostzone,
          region: 'us-east-1',
        });

        this.addToParamGroups(
          'Domain Information',
          hostZoneId.logicalId,
          hostZoneName.logicalId,
          recordName.logicalId,
        );

        domainProps = {
          hostZone: hostzone,
          recordName: recordName.valueAsString,
          certificate: certificate,
        };
      }
    }

    const controlPlane = new CloudFrontS3Portal(this, 'cloudfront_control_plane', {
      assetPath: '../../frontend',
      cnCloudFrontS3PortalProps,
      domainProps,
      distributionProps: {
        logProps: {
          enableAccessLog: true,
        },
      },
    });

    const portalDist = controlPlane.distribution.node.defaultChild as CfnDistribution;

    //This is a tricky to avoid 403 error when aceess paths except /index.html
    //TODO issue #17
    portalDist.addPropertyOverride(
      'DistributionConfig.CustomErrorResponses',
      [
        {
          ErrorCode: 403,
          ResponseCode: 200,
          ResponsePagePath: '/index.html',
        },
      ],
    );

    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: this.paramGroups,
        ParameterLabels: this.paramLabels,
      },
    };

    Aspects.of(this).add(new CfnNagWhitelistForBucketDeployment());
    Aspects.of(this).add(new CfnNagWhitelistForS3BucketDelete());

    new CfnOutput(this, 'ControlPlaneUrl', {
      description: 'The CloudFront distribution domain name',
      value: controlPlane.controlPlaneUrl,
    }).overrideLogicalId('ControlPlaneUrl');

    new CfnOutput(this, 'PortalBucket', {
      description: 'Bucket to store the portal asset',
      value: controlPlane.bucket.bucketName,
    }).overrideLogicalId('PortalBucket');

    new CfnOutput(this, 'LogBucket', {
      description: 'Bucket to store access log',
      value: controlPlane.logBucket.bucketName,
    }).overrideLogicalId('LogBucket');
  }

  private addToParamGroups(label: string, ...param: string[]) {
    this.paramGroups.push({
      Label: { default: label },
      Parameters: param,
    });
  }

  private addToParamLabels(label: string, param: string) {
    this.paramLabels[param] = {
      default: label,
    };
  }
}

class InjectCustomResourceConfig implements IAspect {
  public constructor(private isInstallLatestAwsSdk: string) { }

  public visit(node: IConstruct): void {
    if (
      node instanceof CfnResource &&
      node.cfnResourceType === 'Custom::AWS'
    ) {
      node.addPropertyOverride('InstallLatestAwsSdk', this.isInstallLatestAwsSdk);
    }
  }
}


