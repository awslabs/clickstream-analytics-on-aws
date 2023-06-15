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
  App,
} from 'aws-cdk-lib';
import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import { findResourcesName } from './test-utils';
import { CloudFrontControlPlaneStack } from '../../src/cloudfront-control-plane-stack';
import { OUTPUT_CONTROL_PLANE_URL, OUTPUT_CONTROL_PLANE_BUCKET } from '../../src/common/constant';
import { CFN_FN } from '../constants';

describe('CloudFrontS3PotalStack', () => {

  const commonApp = new App();
  const commonPortalStack = new CloudFrontControlPlaneStack(commonApp, 'CloudFrontS3PotalStack');
  const commonTemplate = Template.fromStack(commonPortalStack);

  test('Global region', () => {
    commonTemplate.resourceCountIs('AWS::CloudFront::CloudFrontOriginAccessIdentity', 1);
    commonTemplate.resourceCountIs('AWS::CloudFront::Distribution', 1);
    commonTemplate.resourceCountIs('AWS::Lambda::LayerVersion', 1);
    commonTemplate.resourceCountIs('Custom::CDKBucketDeployment', 1);

    commonTemplate.hasOutput(OUTPUT_CONTROL_PLANE_URL, {});
    commonTemplate.hasOutput(OUTPUT_CONTROL_PLANE_BUCKET, {});

    // Check Origin Request Policy
    commonTemplate.hasResourceProperties('AWS::CloudFront::OriginRequestPolicy', {
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
        Name: {
          'Fn::Join': [
            '',
            [
              'ApiGatewayOriginRequestPolicy-',
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
        QueryStringsConfig: {
          QueryStringBehavior: 'all',
        },
      },
    });

    // Check Cloudfront Function
    commonTemplate.hasResourceProperties('AWS::CloudFront::Function', {
      FunctionCode: "function handler(event) {\n  var request = event.request;\n  var uri = request.uri;\n  if (uri.startsWith('/signin') || \n    uri.startsWith('/projects') || \n    uri.startsWith('/project') || \n    uri.startsWith('/pipelines') || \n    uri.startsWith('/plugins') || \n    uri.startsWith('/alarms') || \n    uri.startsWith('/quicksight')) {\n      request.uri = '/index.html'; \n  }\n  return request; \n}",
      AutoPublish: true,
    });
  });

  test('Log bucket', () => {
    commonTemplate.hasResourceProperties('AWS::S3::Bucket', {
      AccessControl: 'LogDeliveryWrite',
      OwnershipControls: {
        Rules: [
          {
            ObjectOwnership: 'ObjectWriter',
          },
        ],
      },
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
        LogFilePrefix: 'data-bucket-access-logs',
      },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  test('Portal bucket', () => {
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
        DestinationBucketName: {
          Ref: Match.anyValue(),
        },
        LogFilePrefix: 'portal-bucket-access-log/',
      },
      OwnershipControls: {
        Rules: [
          {
            ObjectOwnership: 'ObjectWriter',
          },
        ],
      },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      Tags: [
        {
          Key: 'aws-cdk:auto-delete-objects',
          Value: 'true',
        },
        {
          Key: Match.stringLikeRegexp('aws-cdk:cr-owned:[a-zA-Z0-9]'),
          Value: 'true',
        },
      ],
    });
  });

  test('S3 bucket auto delete function', () => {
    commonTemplate.hasResourceProperties('AWS::Lambda::Function', {
      Code: {
        S3Bucket: {
          'Fn::Sub': Match.anyValue(),
        },
        S3Key: Match.anyValue(),
      },
      Timeout: 900,
      MemorySize: 128,
      Handler: '__entrypoint__.handler',
      Role: {
        'Fn::GetAtt': [
          Match.anyValue(),
          'Arn',
        ],
      },
      Description: {
        'Fn::Join': [
          '',
          [
            'Lambda function for auto-deleting objects in ',
            {
              Ref: Match.anyValue(),
            },
            ' S3 bucket.',
          ],
        ],
      },
    });
  });

  test('CustomCDKBucketDeployment function', () => {
    commonTemplate.hasResourceProperties('AWS::Lambda::Function', {
      Code: {
        S3Bucket: {
          'Fn::Sub': Match.anyValue(),
        },
        S3Key: Match.anyValue(),
      },
      Role: {
        'Fn::GetAtt': [
          Match.anyValue(),
          'Arn',
        ],
      },
      Handler: 'index.handler',
      Layers: [
        {
          Ref: Match.anyValue(),
        },
      ],
      Runtime: 'python3.9',
      Timeout: 900,
    },
    );
  });

  test('at least two BucketDeployment sources', () => {

    const capture = new Capture();
    commonTemplate.hasResourceProperties('Custom::CDKBucketDeployment', {
      SourceObjectKeys: capture,
    });
    expect(capture.asArray().length).toBeGreaterThanOrEqual(2);

  });

  test('Function for user authentication', () => {
    commonTemplate.hasResourceProperties('AWS::Lambda::Function', {
      Code: {
        S3Bucket: {
          'Fn::Sub': Match.anyValue(),
        },
        S3Key: Match.anyValue(),
      },
      Role: {
        'Fn::GetAtt': [
          Match.stringLikeRegexp('AuthorizerFunctionServiceRole[a-zA-Z0-9]+'),
          'Arn',
        ],
      },
      Architectures: [
        'arm64',
      ],
      Environment: {
        Variables: {
          ISSUER: {
            'Fn::Join': [
              '',
              [
                'https://cognito-idp.',
                {
                  Ref: 'AWS::Region',
                },
                '.amazonaws.com/',
                {
                  Ref: Match.stringLikeRegexp('userPool[a-zA-Z0-9]+'),
                },
              ],
            ],
          },
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        },
      },
      Timeout: 15,
      Handler: 'index.handler',
      Runtime: 'nodejs18.x',
    },
    );
  });

  test('Lambda has POWERTOOLS settings', ()=> {
    commonTemplate.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          LOG_LEVEL: 'WARN',
          POWERTOOLS_SERVICE_NAME: 'ClickStreamAnalyticsOnAWS',
        },
      },
    });
  });

  test('Cognito in Global region', () => {

    commonTemplate.hasResourceProperties('AWS::Cognito::UserPoolClient', {
      AllowedOAuthFlows: [
        'implicit',
        'code',
      ],
      AllowedOAuthFlowsUserPoolClient: true,
      AllowedOAuthScopes: [
        'openid',
        'email',
        'profile',
      ],
      SupportedIdentityProviders: [
        'COGNITO',
      ],
      CallbackURLs: [
        {
          'Fn::Join': [
            '',
            [
              'https://',
              {
                'Fn::GetAtt': [
                  'cloudfrontcontrolplanePortalDistributionCAE911E8',
                  'DomainName',
                ],
              },
              '/signin',
            ],
          ],
        },
      ],
      LogoutURLs: [
        {
          'Fn::Join': [
            '',
            [
              'https://',
              {
                'Fn::GetAtt': [
                  'cloudfrontcontrolplanePortalDistributionCAE911E8',
                  'DomainName',
                ],
              },
            ],
          ],
        },
      ],
    });

    commonTemplate.hasResourceProperties('AWS::Cognito::UserPool', {
      AccountRecoverySetting: {
        RecoveryMechanisms: [
          {
            Name: 'verified_phone_number',
            Priority: 1,
          },
          {
            Name: 'verified_email',
            Priority: 2,
          },
        ],
      },
      AdminCreateUserConfig: {
        AllowAdminCreateUserOnly: true,
      },
      AutoVerifiedAttributes: [
        'email',
      ],
      Policies: {
        PasswordPolicy: {
          MinimumLength: 8,
          RequireLowercase: true,
          RequireNumbers: true,
          RequireSymbols: true,
          RequireUppercase: true,
        },
      },
      UsernameConfiguration: {
        CaseSensitive: false,
      },
      UserPoolAddOns: {
        AdvancedSecurityMode: 'ENFORCED',
      },
    });

    commonTemplate.hasResourceProperties('AWS::Cognito::UserPoolDomain', {});
    commonTemplate.hasResourceProperties('AWS::Cognito::UserPoolUser', {
      UserPoolId: {
        Ref: Match.stringLikeRegexp('userPool[a-zA-Z0-9]+'),
      },
      UserAttributes: [
        {
          Name: 'email',
          Value: {
            Ref: 'Email',
          },
        },
      ],
      Username: {
        Ref: 'Email',
      },
    });

    commonTemplate.resourceCountIs('AWS::S3::Bucket', 2);
    commonTemplate.resourceCountIs('AWS::CloudFront::CloudFrontOriginAccessIdentity', 1);
    commonTemplate.resourceCountIs('AWS::CloudFront::Distribution', 1);
    commonTemplate.resourceCountIs('AWS::Lambda::LayerVersion', 1);
    commonTemplate.resourceCountIs('Custom::CDKBucketDeployment', 1);
    expect(findResourcesName(commonTemplate, 'AWS::Lambda::Function').sort())
      .toEqual([
        'AuthorizerFunctionB4DBAA43',
        'ClickStreamApiBatchInsertDDBCustomResourceDicInitCustomResourceFunction50F646E7',
        'ClickStreamApiBatchInsertDDBCustomResourceDicInitCustomResourceProviderframeworkonEventCEE52DB5',
        'ClickStreamApiClickStreamApiFunction8C843168',
        'ClickStreamApiStackActionStateMachineActionFunction8314F7B4',
        'ClickStreamApiStackWorkflowStateMachineWorkflowFunctionD5F091A8',
        'CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C81C01536',
        'CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F',
        'LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8aFD4BFC8A',
      ]);

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

    expect(findResourcesName(template, 'AWS::Lambda::Function').sort())
      .toEqual([
        'AuthorizerFunctionB4DBAA43',
        'ClickStreamApiBatchInsertDDBCustomResourceDicInitCustomResourceFunction50F646E7',
        'ClickStreamApiBatchInsertDDBCustomResourceDicInitCustomResourceProviderframeworkonEventCEE52DB5',
        'ClickStreamApiClickStreamApiFunction8C843168',
        'ClickStreamApiStackActionStateMachineActionFunction8314F7B4',
        'ClickStreamApiStackWorkflowStateMachineWorkflowFunctionD5F091A8',
        'CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C81C01536',
        'CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F',
        'LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8aFD4BFC8A',
        'certificateCertificateRequestorFunction5D4BA95F',
      ]);
    expect(findResourcesName(template, 'AWS::CloudFormation::CustomResource'))
      .toEqual([
        'certificateCertificateRequestorResourceFD86DD58',
        'ClickStreamApiBatchInsertDDBCustomResourceDicInitCustomResourceB9A4ABDE',
      ]);
    template.resourceCountIs('AWS::S3::Bucket', 2);
    template.resourceCountIs('AWS::CloudFront::CloudFrontOriginAccessIdentity', 1);
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    template.resourceCountIs('AWS::Route53::RecordSet', 1);
    template.resourceCountIs('AWS::Lambda::LayerVersion', 1);
    template.resourceCountIs('Custom::CDKBucketDeployment', 1);

    template.hasOutput(OUTPUT_CONTROL_PLANE_URL, {});
    template.hasOutput(OUTPUT_CONTROL_PLANE_BUCKET, {});

    //lambda function to request certificate
    template.hasResourceProperties('AWS::Lambda::Function', {
      Code: {
        S3Bucket: {
          'Fn::Sub': Match.anyValue(),
        },
        S3Key: Match.anyValue(),
      },
      Role: {
        'Fn::GetAtt': [
          Match.stringLikeRegexp('certificateCertificateRequestorFunctionServiceRole[a-zA-Z0-9]+'),
          'Arn',
        ],
      },
      Handler: 'index.certificateRequestHandler',
      Timeout: 900,
    });

    // TLS version check for custom domain
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        ViewerCertificate: {
          MinimumProtocolVersion: 'TLSv1.2_2019',
        },
      },
    });

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
    template.hasParameter('OIDCProvider', {});
    template.hasParameter('OIDCClientId', {});

    expect(findResourcesName(template, 'AWS::Lambda::Function').sort())
      .toEqual([
        'AuthorizerFunctionB4DBAA43',
        'ClickStreamApiBatchInsertDDBCustomResourceDicInitCustomResourceFunction50F646E7',
        'ClickStreamApiBatchInsertDDBCustomResourceDicInitCustomResourceProviderframeworkonEventCEE52DB5',
        'ClickStreamApiClickStreamApiFunction8C843168',
        'ClickStreamApiStackActionStateMachineActionFunction8314F7B4',
        'ClickStreamApiStackWorkflowStateMachineWorkflowFunctionD5F091A8',
        'CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C81C01536',
        'CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F',
        'LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8aFD4BFC8A',
      ]);
    template.resourceCountIs('AWS::S3::Bucket', 2);

    template.resourceCountIs('AWS::CloudFront::CloudFrontOriginAccessIdentity', 1);
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    template.resourceCountIs('AWS::Route53::RecordSet', 0);
    template.resourceCountIs('AWS::Lambda::LayerVersion', 1);
    template.resourceCountIs('Custom::CDKBucketDeployment', 1);

    // Check Origin Request Policy
    template.resourceCountIs('AWS::CloudFront::OriginRequestPolicy', 0);

    template.hasOutput(OUTPUT_CONTROL_PLANE_URL, {});
    template.hasOutput(OUTPUT_CONTROL_PLANE_BUCKET, {});
    template.hasOutput('CloudFrontDomainName', {});

    // TLS version check for custom domain
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        ViewerCertificate: {
          MinimumProtocolVersion: 'TLSv1.2_2019',
        },
      },
    });
  });

  test('OIDC authorizer', () => {

    commonTemplate.hasParameter('Email', {});

    commonTemplate.hasResourceProperties('AWS::Lambda::Function', {
      Code: {
        S3Bucket: {
          'Fn::Sub': Match.anyValue(),
        },
        S3Key: Match.anyValue(),
      },
      Role: {
        'Fn::GetAtt': [
          Match.stringLikeRegexp('AuthorizerFunctionServiceRole[a-zA-Z0-9]+'),
          'Arn',
        ],
      },
      Architectures: [
        'arm64',
      ],
      Environment: {
        Variables: {
          ISSUER: {
            'Fn::Join': [
              '',
              [
                'https://cognito-idp.',
                {
                  Ref: 'AWS::Region',
                },
                '.amazonaws.com/',
                {
                  Ref: Match.stringLikeRegexp('userPool[a-zA-Z0-9]+'),
                },
              ],
            ],
          },
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        },
      },
      Handler: 'index.handler',
      Runtime: 'nodejs18.x',
    },
    );
  });

  test('Authorizer function should kepp logs for at least 10 years', () => {

    const capture = new Capture();
    commonTemplate.hasResourceProperties('Custom::LogRetention', {
      ServiceToken: {
        'Fn::GetAtt': [
          Match.stringLikeRegexp('LogRetention[a-fA-F0-9]+'),
          'Arn',
        ],
      },
      LogGroupName: {
        'Fn::Join': [
          '',
          [
            '/aws/lambda/',
            {
              Ref: Match.stringLikeRegexp('AuthorizerFunction[A-F0-9]+'),
            },
          ],
        ],
      },
      RetentionInDays: capture,
    },
    );

    expect(capture.asNumber()).toBeGreaterThanOrEqual(3653);

  });

  test('exist OIDC', () => {
    const app = new App();

    //WHEN
    const portalStack = new CloudFrontControlPlaneStack(app, 'CloudFrontS3PotalStack', {
      useExistingOIDCProvider: true,
    });
    const template = Template.fromStack(portalStack);

    template.hasParameter('OIDCProvider', {});
    template.hasParameter('OIDCClientId', {});

    template.hasResourceProperties('AWS::Lambda::Function', {
      Architectures: [
        'arm64',
      ],
      Environment: {
        Variables: {
          ISSUER: Match.anyValue(),
        },
      },
      Handler: 'index.handler',
    });
  });

  test('exist api authorizer', () => {
    commonTemplate.hasResourceProperties('AWS::ApiGateway::Authorizer', {
      Type: 'TOKEN',
      AuthorizerResultTtlInSeconds: 0,
      AuthorizerUri: {
        'Fn::Join': [
          '',
          [
            'arn:',
            {
              'Fn::Select': [
                1,
                {
                  'Fn::Split': [
                    ':',
                    {
                      'Fn::GetAtt': [
                        Match.anyValue(),
                        'Arn',
                      ],
                    },
                  ],
                },
              ],
            },
            ':apigateway:',
            {
              'Fn::Select': [
                3,
                {
                  'Fn::Split': [
                    ':',
                    {
                      'Fn::GetAtt': [
                        Match.anyValue(),
                        'Arn',
                      ],
                    },
                  ],
                },
              ],
            },
            ':lambda:path/2015-03-31/functions/',
            {
              'Fn::GetAtt': [
                Match.anyValue(),
                'Arn',
              ],
            },
            '/invocations',
          ],
        ],
      },
      IdentitySource: 'method.request.header.Authorization',
      IdentityValidationExpression: '^(Bearer )[a-zA-Z0-9-_]+?.[a-zA-Z0-9-_]+?.([a-zA-Z0-9-_]+)$',
    });
  });

  test('OIDC callback url', () => {
    commonTemplate.hasResourceProperties('AWS::Cognito::UserPoolClient', {
      AllowedOAuthFlows: [
        'implicit',
        'code',
      ],
      AllowedOAuthFlowsUserPoolClient: true,
      AllowedOAuthScopes: [
        'openid',
        'email',
        'profile',
      ],
      SupportedIdentityProviders: [
        'COGNITO',
      ],
      CallbackURLs: [
        {
          'Fn::Join': [
            '',
            [
              'https://',
              {
                'Fn::GetAtt': [
                  Match.anyValue(),
                  'DomainName',
                ],
              },
              '/signin',
            ],
          ],
        },
      ],
    });
  });

  test('Function for user authentication in CN region', () => {
    const app = new App();

    //WHEN
    const portalStack = new CloudFrontControlPlaneStack(app, 'CloudFrontS3PotalStack', {
      targetToCNRegions: true,
    });

    const template = Template.fromStack(portalStack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      Code: {
        S3Bucket: {
          'Fn::Sub': Match.anyValue(),
        },
        S3Key: Match.anyValue(),
      },
      Role: {
        'Fn::GetAtt': [
          Match.stringLikeRegexp('AuthorizerFunctionServiceRole[a-zA-Z0-9]+'),
          'Arn',
        ],
      },
      Architectures: Match.absent(),
      Handler: 'index.handler',
      Runtime: 'nodejs16.x',
    },
    );

  });

  test('CustomError Responses in CN region', () => {
    const app = new App();

    //WHEN
    const portalStack = new CloudFrontControlPlaneStack(app, 'CloudFrontS3PotalStack', {
      targetToCNRegions: true,
    });

    const template = Template.fromStack(portalStack);

    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        CustomErrorResponses: [
          {
            ErrorCode: 403,
            ResponseCode: 200,
            ResponsePagePath: '/index.html',
          },
        ],
      },
    },
    );

  });

  test('Test CloudFront disabled API call cache in China regions', () => {
    const app = new App();

    //WHEN
    const portalStack = new CloudFrontControlPlaneStack(app, 'CloudFrontS3PotalStack', {
      targetToCNRegions: true,
    });

    const template = Template.fromStack(portalStack);

    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    template.resourcePropertiesCountIs('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        CacheBehaviors: [
          {
            PathPattern: {
              'Fn::Join': [
                '',
                [
                  '/',
                  {
                    Ref: Match.stringLikeRegexp('ClickStreamApiDeploymentStageapi[0-9A-Za-z]+'),
                  },
                  '/*',
                ],
              ],
            },
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
              Headers: [
                'Origin',
                'Authorization',
                'Accept',
                'Cache-Control',
                'Access-Control-Request-Mehod',
                'Access-Control-Request-Headers',
                'Referer',
              ],
            },
            MaxTTL: 0,
            MinTTL: 0,
            DefaultTTL: 0,
          },
        ],
      },
    }, 1);


  });

  test('Test security responose headers ', () => {
    const app = new App();

    //WHEN
    const portalStack = new CloudFrontControlPlaneStack(app, 'CloudFrontS3PotalStack', {
      targetToCNRegions: false,
    });
    const template = Template.fromStack(portalStack);

    template.resourcePropertiesCountIs('AWS::CloudFront::ResponseHeadersPolicy', {
      ResponseHeadersPolicyConfig: {
        Name: {
          'Fn::Join': [
            '',
            [
              'clickstream-response_header-policy-',
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
        SecurityHeadersConfig: {
          ContentSecurityPolicy: {
            ContentSecurityPolicy: {
              'Fn::Join': [
                '',
                [
                  "default-src 'self' data:; upgrade-insecure-requests; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self' https://cognito-idp.",
                  {
                    Ref: 'AWS::Region',
                  },
                  '.amazonaws.com *.auth.',
                  {
                    Ref: 'AWS::Region',
                  },
                  '.amazoncognito.com ',
                  {
                    'Fn::GetAtt': [
                      'ClickstreamSolutionDataBucket200465FE',
                      'DomainName',
                    ],
                  },
                  ' ',
                  {
                    'Fn::GetAtt': [
                      'ClickstreamSolutionDataBucket200465FE',
                      'RegionalDomainName',
                    ],
                  },
                ],
              ],
            },
            Override: true,
          },
          ContentTypeOptions: {
            Override: true,
          },
          FrameOptions: {
            FrameOption: 'DENY',
            Override: true,
          },
          ReferrerPolicy: {
            Override: true,
            ReferrerPolicy: 'no-referrer',
          },
          StrictTransportSecurity: {
            AccessControlMaxAgeSec: 600,
            IncludeSubdomains: true,
            Override: true,
          },
          XSSProtection: {
            ModeBlock: true,
            Override: true,
            Protection: true,
          },
        },
      },
    }, 1);
  });

  test('Test CloudFront loging function ', () => {
    const app = new App();

    //WHEN
    const portalStack = new CloudFrontControlPlaneStack(app, 'CloudFrontS3PotalStack', {
      targetToCNRegions: false,
    });
    const template = Template.fromStack(portalStack);

    template.resourcePropertiesCountIs('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        Logging: {
          'Fn::If': [
            'cloudfrontcontrolplanenotOpsInRegionFA8E79C7',
            {
              Bucket: {
                'Fn::GetAtt': [
                  'ClickstreamSolutionDataBucket200465FE',
                  'RegionalDomainName',
                ],
              },
              Prefix: 'cloudfront-access-log',
            },
            {
              Ref: 'AWS::NoValue',
            },
          ],
        },
      },
    }
    , 1);
  });

  test('Should has Rules CognitoUnsupportRegionRule', () => {
    const rule = commonTemplate.toJSON().Rules.CognitoUnsupportRegionRule;
    expect(rule.Assertions[0].Assert['Fn::Or'].length).toEqual(2);

    const paramList = [
      'us-east-1',
      'us-east-2',
      'us-west-1',
      'us-west-2',
      'ca-central-1',
      'sa-east-1',
      'eu-west-1',
      'eu-west-2',
      'eu-west-3',
      'eu-central-1',
      'ap-northeast-1',
      'ap-northeast-2',
      'ap-southeast-1',
      'ap-southeast-2',
      'ap-south-1',
      'eu-north-1',
      'me-south-1',
    ];

    let paramCount = 0;
    for (const element of rule.Assertions[0].Assert['Fn::Or']) {
      paramList.forEach(p => {
        for (const e of element['Fn::Or'] ) {
          if (p === e[CFN_FN.EQUALS][1]) {
            paramCount++;
          }
        }
      });

    }
    expect(paramCount).toEqual(paramList.length);
  });

});