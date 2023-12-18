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

import { join } from 'path';
import { Stack, App, DockerImage, Aws } from 'aws-cdk-lib';
import {
  Match,
  Template,
} from 'aws-cdk-lib/assertions';
import { DnsValidatedCertificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
  Function, FunctionCode, FunctionEventType,
  OriginProtocolPolicy,
  OriginRequestCookieBehavior,
  OriginRequestPolicy,
  OriginRequestQueryStringBehavior,
} from 'aws-cdk-lib/aws-cloudfront';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { getShortIdOfStack } from '../../src/common/stack';
import { CloudFrontS3Portal } from '../../src/control-plane/cloudfront-s3-portal';
import { Constant } from '../../src/control-plane/private/constant';
import { TestApp, removeFolder } from '../common/jest';

const cdkOut = '/tmp/cloudfront-s3-portal-test';
const commonApp = new TestApp(cdkOut);
const frontendProps = {
  assetPath: 'frontend',
  dockerImage: DockerImage.fromRegistry(Constant.NODE_IMAGE_V18),
  buildCommands: [
    'echo test > /asset-output/test',
  ],
  autoInvalidFilePaths: ['/index.html'],
};

const commonTestStack = new Stack(commonApp, 'comTestStack');
new CloudFrontS3Portal(commonTestStack, 'common-test-portal', {
  frontendProps,
  distributionProps: {
    functionAssociations: [{
      function: new Function(commonTestStack, 'FrontRewriteFunction', {
        functionName: `FrontRewriteFunction-${Aws.REGION}-${getShortIdOfStack(commonTestStack)}`,
        code: FunctionCode.fromInline('function handler(event) { return event; }'),
      }),
      eventType: FunctionEventType.VIEWER_REQUEST,
    }],
  },
});
const commonTemplate = Template.fromStack(commonTestStack);

describe('CloudFrontS3Portal', () => {

  afterAll(() => {
    removeFolder(cdkOut);
  });

  test('default setting', () => {
    //portal bucket
    commonTemplate.hasResourceProperties('AWS::S3::Bucket', {
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
    commonTemplate.hasResourceProperties('AWS::S3::Bucket', {
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
    commonTemplate.hasResourceProperties('AWS::CloudFront::Distribution', {
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
        HttpVersion: 'http2and3',
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
        PriceClass: 'PriceClass_200',
      },
    });

    //Distribution
    commonTemplate.hasResourceProperties('AWS::Lambda::LayerVersion', {
      Description: '/opt/awscli/aws',
    });

    //Distribution
    commonTemplate.resourceCountIs('Custom::CDKBucketDeployment', 2);

    //Lambda function
    commonTemplate.hasResourceProperties('AWS::Lambda::Function', {
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
      frontendProps: {
        ...frontendProps,
        assetPath: join(__dirname, '../../frontend'),
      },
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
      frontendProps: {
        ...frontendProps,
        assetPath: join(__dirname, '../../frontend'),
      },
      cnCloudFrontS3PortalProps: {
        domainName: 'test.example.com',
        iamCertificateId: 'ASCAU7UKQJBEYXRJCWVFR',
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
      frontendProps: {
        ...frontendProps,
        assetPath: join(__dirname, '../../frontend'),
      },
      cnCloudFrontS3PortalProps: {
        domainName: 'test.example.com',
        iamCertificateId: 'ASCAU7UKQJBEYXRJCWVFR',
      },
    });

    const template = Template.fromStack(testStack);

    template.resourceCountIs('AWS::Route53::RecordSet', 0);
  });

  test('Test OAC for global regions', () => {
    commonTemplate.hasResourceProperties('AWS::CloudFront::OriginAccessControl', {
      OriginAccessControlConfig: {
        Name: {
          'Fn::Join': [
            '',
            [
              'clickstream-controlplane-oac-',
              {
                'Fn::Select': [
                  0,
                  {
                    'Fn::Split': [
                      '-',
                      {
                        'Fn::Select': [
                          2,
                          {
                            'Fn::Split': [
                              '/',
                              {
                                Ref: 'AWS::StackId',
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          ],
        },
        OriginAccessControlOriginType: 's3',
        SigningBehavior: 'always',
        SigningProtocol: 'sigv4',
      },

    });
  });

  test('Control Plane add origin - default', () => {

    const testStack = new Stack(new App(), 'testStack');
    const apiGatewayOriginRequestPolicy = new OriginRequestPolicy(testStack, 'ApiGatewayOriginRequestPolicy', {
      comment: 'Policy to forward all parameters in viewer requests except for the Host header',
      cookieBehavior: OriginRequestCookieBehavior.all(),
      headerBehavior: {
        behavior: 'allExcept',
        headers: ['host'],
      },
      queryStringBehavior: OriginRequestQueryStringBehavior.all(),
    });
    const controlPlane = new CloudFrontS3Portal(testStack, 'test-portal', {
      frontendProps: {
        ...frontendProps,
        assetPath: join(__dirname, '../../frontend'),
      },
    });
    controlPlane.addHttpOrigin(
      '/test/*',
      'test.com.cn',
      {
        protocolPolicy: OriginProtocolPolicy.HTTPS_ONLY,
        originPath: '/prod',
      },
      {
        originRequestPolicy: apiGatewayOriginRequestPolicy,
      },
    );
    const template = Template.fromStack(testStack);
    //Distribution
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        Comment: Match.stringLikeRegexp('^CloudFront distribution for'),
        CacheBehaviors: [
          {
            AllowedMethods: [
              'GET',
              'HEAD',
              'OPTIONS',
              'PUT',
              'PATCH',
              'POST',
              'DELETE',
            ],
            CachePolicyId: '4135ea2d-6df8-44a3-9df3-4b5a84be39ad',
            Compress: true,
            OriginRequestPolicyId: {
              Ref: 'ApiGatewayOriginRequestPolicy339DF282',
            },
            PathPattern: '/test/*',
            TargetOriginId: 'testStacktestportalPortalDistributionOrigin2B11D5A7C',
            ViewerProtocolPolicy: 'redirect-to-https',
          },
        ],
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
        HttpVersion: 'http2and3',
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
          {
            CustomOriginConfig: {
              OriginProtocolPolicy: 'https-only',
              OriginSSLProtocols: [
                'TLSv1.2',
              ],
            },
            DomainName: 'test.com.cn',
            Id: 'testStacktestportalPortalDistributionOrigin2B11D5A7C',
            OriginPath: '/prod',
          },
        ],
        PriceClass: 'PriceClass_200',
      },
    });
    template.hasResourceProperties('AWS::CloudFront::OriginRequestPolicy', {
      OriginRequestPolicyConfig: {
        Comment: 'Policy to forward all parameters in viewer requests except for the Host header',
        CookiesConfig: {
          CookieBehavior: 'all',
        },
        HeadersConfig: {
          HeaderBehavior: 'allExcept',
          Headers: [
            'host',
          ],
        },
        Name: 'testStackApiGatewayOriginRequestPolicy0618DD4C',
        QueryStringsConfig: {
          QueryStringBehavior: 'all',
        },
      },
    });
  });

  test('Control Plane add origin - China region', () => {

    const testStack = new Stack(new App(), 'testStack');
    const controlPlane = new CloudFrontS3Portal(testStack, 'test-portal', {
      frontendProps: {
        ...frontendProps,
        assetPath: join(__dirname, '../../frontend'),
      },
      cnCloudFrontS3PortalProps: {
        domainName: 'test.example.com',
        iamCertificateId: 'ASCAU7UKQJBEYXRJCWVFR',
      },
    });
    controlPlane.addHttpOrigin(
      '/test/*',
      'test.com.cn',
      {
        protocolPolicy: OriginProtocolPolicy.HTTPS_ONLY,
        originPath: '/prod',
      },
    );
    const template = Template.fromStack(testStack);
    //Distribution
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        Aliases: [
          'test.example.com',
        ],
        CacheBehaviors: [
          {
            PathPattern: '/test/*',
            TargetOriginId: 'origin2',
            AllowedMethods: [
              'GET',
              'HEAD',
              'OPTIONS',
              'PUT',
              'PATCH',
              'POST',
              'DELETE',
            ],
            CachedMethods: [
              'GET',
              'HEAD',
            ],
            Compress: true,
            ViewerProtocolPolicy: 'redirect-to-https',
            ForwardedValues: {
              QueryString: true,
              Cookies: {
                Forward: 'none',
              },
            },
          },
        ],
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
          DefaultTTL: 604800,
          ForwardedValues: {
            QueryString: false,
          },
          MaxTTL: 2592000,
          TargetOriginId: 'origin1',
          ViewerProtocolPolicy: 'https-only',
        },
        DefaultRootObject: 'index.html',
        Enabled: true,
        HttpVersion: 'http2',
        IPV6Enabled: false,
        Origins: [
          {
            Id: 'origin1',
            DomainName: {
              'Fn::GetAtt': [
                'testportalportalbucket29E0AA0E',
                'RegionalDomainName',
              ],
            },
            S3OriginConfig: {
              OriginAccessIdentity: {
                'Fn::Join': [
                  '',
                  [
                    'origin-access-identity/cloudfront/',
                    {
                      Ref: 'testportaloriginaccessidentity3D34530E',
                    },
                  ],
                ],
              },
            },
            ConnectionAttempts: 3,
            ConnectionTimeout: 10,
          },
          {
            ConnectionAttempts: 3,
            ConnectionTimeout: 10,
            CustomOriginConfig: {
              HTTPPort: 80,
              HTTPSPort: 443,
              OriginKeepaliveTimeout: 5,
              OriginProtocolPolicy: 'https-only',
              OriginReadTimeout: 30,
              OriginSSLProtocols: [
                'TLSv1.2',
              ],
            },
            DomainName: 'test.com.cn',
            Id: 'origin2',
            OriginPath: '/prod',
          },
        ],
      },
    });
  });

  test('Check cloudfront function', () => {
    commonTemplate.hasResourceProperties('AWS::CloudFront::Function', {
      FunctionCode: 'function handler(event) { return event; }',
      FunctionConfig: {
        Comment: {
          'Fn::Join': [
            '',
            [
              'FrontRewriteFunction-',
              {
                Ref: 'AWS::Region',
              },
              '-',
              {
                'Fn::Select': [
                  0,
                  {
                    'Fn::Split': [
                      '-',
                      {
                        'Fn::Select': [
                          2,
                          {
                            'Fn::Split': [
                              '/',
                              {
                                Ref: 'AWS::StackId',
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          ],
        },
        Runtime: 'cloudfront-js-1.0',
      },
      Name: {
        'Fn::Join': [
          '',
          [
            'FrontRewriteFunction-',
            {
              Ref: 'AWS::Region',
            },
            '-',
            {
              'Fn::Select': [
                0,
                {
                  'Fn::Split': [
                    '-',
                    {
                      'Fn::Select': [
                        2,
                        {
                          'Fn::Split': [
                            '/',
                            {
                              Ref: 'AWS::StackId',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        ],
      },
      AutoPublish: true,
    });
    commonTemplate.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        DefaultCacheBehavior: {
          FunctionAssociations: [
            {
              EventType: 'viewer-request',
              FunctionARN: {
                'Fn::GetAtt': [
                  'FrontRewriteFunction560E1714',
                  'FunctionARN',
                ],
              },
            },
          ],
        },
      },
    });
  });
});

test('test cache policy name uniqueness', () => {

  commonTemplate.hasResourceProperties('AWS::CloudFront::CachePolicy', {
    CachePolicyConfig: {
      Name: {
        'Fn::Join': [
          '',
          [
            'cachepolicy-',
            {
              'Fn::Select': [
                0,
                {
                  'Fn::Split': [
                    '-',
                    {
                      'Fn::Select': [
                        2,
                        {
                          'Fn::Split': [
                            '/',
                            {
                              Ref: 'AWS::StackId',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        ],
      },
    },
  });

});
