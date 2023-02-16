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

import { Stack, App } from 'aws-cdk-lib';
import {
  Match,
  Template,
} from 'aws-cdk-lib/assertions';
import { DnsValidatedCertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { CloudFrontS3Portal } from '../../src/control-plane/cloudfront-s3-portal';

describe('CloudFrontS3Portal', () => {

  test('default setting', () => {

    const testStack = new Stack(new App(), 'testStack');
    new CloudFrontS3Portal(testStack, 'test-portal', {
      assetPath: '../../frontend',
    });
    const template = Template.fromStack(testStack);

    //portal bucket
    template.hasResourceProperties('AWS::S3::Bucket', {
      AccessControl: 'LogDeliveryWrite',
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256',
            },
          },
        ],
      },
      LoggingConfiguration: {
        DestinationBucketName: Match.anyValue(),
        LogFilePrefix: Match.exact('portal-bucket-access-log/'),
      },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });

    //log bucket
    template.hasResourceProperties('AWS::S3::Bucket', {
      AccessControl: 'LogDeliveryWrite',
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256',
            },
          },
        ],
      },
      LoggingConfiguration: {
        DestinationBucketName: Match.absent(),
        LogFilePrefix: Match.exact('log-bucket-access-log/'),
      },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });

    //Distribution
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        Comment: Match.stringLikeRegexp('^CloudFront distribution for'),
        DefaultCacheBehavior: {
          AllowedMethods: [
            'GET',
            'HEAD',
          ],
          CachedMethods: [
            'GET',
            'HEAD',
          ],
          Compress: true,
          ViewerProtocolPolicy: 'redirect-to-https',
        },
        DefaultRootObject: 'index.html',
        Enabled: true,
        HttpVersion: 'http2',
        IPV6Enabled: false,
        Origins: [
          {
            S3OriginConfig: {
              OriginAccessIdentity: '',
            },
            OriginAccessControlId: {
              'Fn::GetAtt': [
                Match.anyValue(),
                'Id',
              ],
            },
          },
        ],
        PriceClass: 'PriceClass_All',
      },
    });

    //Distribution
    template.hasResourceProperties('AWS::Lambda::LayerVersion', {
      Description: '/opt/awscli/aws',
    });

    //Distribution
    template.resourceCountIs('Custom::CDKBucketDeployment', 1);

    //Lambda function
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'index.handler',
      Runtime: 'python3.9',
      Timeout: 900,
    });

  });

  test('Custom domain', () => {
    const testStack = new Stack(new App(), 'testStack');
    const testHostedZone = new HostedZone(testStack, 'HostedZone', {
      zoneName: 'clickstream.com',
    });

    const certificate = new DnsValidatedCertificate(testStack, 'certificate', {
      domainName: 'test.clickstream.com',
      hostedZone: testHostedZone,
      region: 'us-east-1',
    });

    new CloudFrontS3Portal(testStack, 'test-portal', {
      assetPath: '../../frontend',
      domainProps: {
        hostZone: testHostedZone,
        recordName: 'test',
        certificate: certificate,
      },
    });

    const template = Template.fromStack(testStack);

    template.resourceCountIs('AWS::Route53::RecordSet', 1);

  });

  test('China region parameter check', () => {
    const testStack = new Stack(new App(), 'testStack');
    const testHostedZone = new HostedZone(testStack, 'HostedZone', {
      zoneName: 'example.com',
    });

    new CloudFrontS3Portal(testStack, 'test-portal', {
      assetPath: '../../frontend',
      cnCloudFrontS3PortalProps: {
        domainName: 'test.example.com',
      },
      domainProps: {
        recordName: 'test',
        hostZone: testHostedZone,
      },
    });

    let errorMsg: string | undefined = undefined;
    try {
      Template.fromStack(testStack);
    } catch (error) {
      errorMsg = (error as Error).message;
    }

    expect(errorMsg).not.toEqual(undefined);
  });

  test('China region', () => {
    const testStack = new Stack(new App(), 'testStack');

    new CloudFrontS3Portal(testStack, 'test-portal', {
      assetPath: '../../frontend',
      cnCloudFrontS3PortalProps: {
        domainName: 'test.example.com',
      },
    });

    const template = Template.fromStack(testStack);

    template.resourceCountIs('AWS::Route53::RecordSet', 0);
  });

});
