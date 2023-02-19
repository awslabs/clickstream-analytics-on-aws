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
  App,
} from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CloudFrontControlPlaneStack } from '../../src/cloudfront-control-plane-stack';

describe('CloudFrontS3PotalStack', () => {

  test('Global region', () => {
    const app = new App();

    //WHEN
    const portalStack = new CloudFrontControlPlaneStack(app, 'CloudFrontS3PotalStack');
    const template = Template.fromStack(portalStack);

    template.resourceCountIs('AWS::S3::Bucket', 2);
    template.resourceCountIs('AWS::CloudFront::CloudFrontOriginAccessIdentity', 1);
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    template.resourceCountIs('AWS::Lambda::LayerVersion', 1);
    template.resourceCountIs('Custom::CDKBucketDeployment', 1);
    template.resourceCountIs('AWS::Lambda::Function', 2);

    template.hasOutput('ControlPlaneUrl', {});
    template.hasOutput('PortalBucket', {});
    template.hasOutput('LogBucket', {});
  });

  test('Custom domain', () => {
    const app = new App();

    //WHEN
    const portalStack = new CloudFrontControlPlaneStack(app, 'CloudFrontS3PotalStack', {
      useCustomDomainName: true,
    });

    const template = Template.fromStack(portalStack);

    template.hasParameter('HostedZoneId', {});
    template.hasParameter('HostedZoneName', {});
    template.hasParameter('RecordName', {});

    template.resourceCountIs('AWS::Lambda::Function', 3);
    template.resourceCountIs('AWS::CloudFormation::CustomResource', 1);
    template.resourceCountIs('AWS::S3::Bucket', 2);
    template.resourceCountIs('AWS::CloudFront::CloudFrontOriginAccessIdentity', 1);
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    template.resourceCountIs('AWS::Route53::RecordSet', 1);
    template.resourceCountIs('AWS::Lambda::LayerVersion', 1);
    template.resourceCountIs('Custom::CDKBucketDeployment', 1);

    template.hasOutput('ControlPlaneUrl', {});
    template.hasOutput('PortalBucket', {});
    template.hasOutput('LogBucket', {});
  });

  test('China regions', () => {
    const app = new App();

    //WHEN
    const portalStack = new CloudFrontControlPlaneStack(app, 'CloudFrontS3PotalStack', {
      targetToCNRegions: true,
    });

    const template = Template.fromStack(portalStack);

    template.hasParameter('DomainName', {});
    template.hasParameter('IAMCertificateId', {});

    template.resourceCountIs('AWS::Lambda::Function', 2);
    template.resourceCountIs('AWS::S3::Bucket', 2);
    template.resourceCountIs('AWS::CloudFront::CloudFrontOriginAccessIdentity', 1);
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    template.resourceCountIs('AWS::Route53::RecordSet', 0);
    template.resourceCountIs('AWS::Lambda::LayerVersion', 1);
    template.resourceCountIs('Custom::CDKBucketDeployment', 1);

    template.hasOutput('ControlPlaneUrl', {});
    template.hasOutput('PortalBucket', {});
    template.hasOutput('LogBucket', {});
  });

});