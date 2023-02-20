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

import { Stack, StackProps, CfnOutput, Fn, IAspect, CfnResource, Aspects, DockerImage } from 'aws-cdk-lib';
import { DnsValidatedCertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { CfnDistribution } from 'aws-cdk-lib/aws-cloudfront';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Construct, IConstruct } from 'constructs';
import { Parameters } from './common/parameters';
import { SolutionInfo } from './common/solution-info';
import { CloudFrontS3Portal, DomainProps, CNCloudFrontS3PortalProps } from './control-plane/cloudfront-s3-portal';
import { Constant } from './control-plane/private/constant';
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
      const iamCertificateId = Parameters.createIAMCertificateIdParameter(this);
      this.addToParamLabels('IAM Certificate Id', iamCertificateId.logicalId);

      const domainName = Parameters.createDomainNameParameter(this);
      this.addToParamLabels('Domain Name', domainName.logicalId);

      cnCloudFrontS3PortalProps = {
        domainName: domainName.valueAsString,
        iamCertificateId: iamCertificateId.valueAsString,
      };

      Aspects.of(this).add(new InjectCustomResourceConfig('true'));

      this.addToParamGroups(
        'Domain Information',
        iamCertificateId.logicalId,
        domainName.logicalId,
      );

      new CfnOutput(this, 'CustomDomainName', {
        description: 'Custom domain name',
        value: domainName.valueAsString,
      }).overrideLogicalId('CustomDomainName');

    } else {
      if (props?.useCustomDomainName) {

        const domainParameters = Parameters.createDomainParameters(this, this.paramGroups, this.paramLabels);

        const hostedzone = HostedZone.fromHostedZoneAttributes(this, 'hostZone', {
          hostedZoneId: domainParameters.hostedZoneId.valueAsString,
          zoneName: domainParameters.hostedZoneName.valueAsString,
        });

        const certificate = new DnsValidatedCertificate(this, 'certificate', {
          domainName: Fn.join('.', [domainParameters.recordName.valueAsString, domainParameters.hostedZoneName.valueAsString]),
          hostedZone: hostedzone,
          region: 'us-east-1',
        });

        domainProps = {
          hostZone: hostedzone,
          recordName: domainParameters.recordName.valueAsString,
          certificate: certificate,
        };
      }
    }

    const controlPlane = new CloudFrontS3Portal(this, 'cloudfront_control_plane', {
      frontendProps: {
        assetPath: '../../frontend',
        dockerImage: DockerImage.fromRegistry(Constant.NODE_IMAGE_V16),
        buildCommand: [
          'bash', '-c',
          'mkdir /app && cp -r `ls -A /asset-input | grep -v "node_modules" | grep -v "build"` /app && cd /app && npm install --loglevel error && npm run build --loglevel error && cp -r ./build/* /asset-output/',
        ],
        autoInvalidFilePaths: ['/index.html', '/asset-manifest.json', '/robots.txt', '/locales/*'],
      },
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


