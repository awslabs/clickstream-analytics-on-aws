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
import { Match, Template } from 'aws-cdk-lib/assertions';
import { findResourcesName } from './test-utils';
import { CloudFrontControlPlaneStack } from '../../src/cloudfront-control-plane-stack';

describe('CloudFrontS3PotalStack', () => {

  const commonApp = new App();
  const commonPortalStack = new CloudFrontControlPlaneStack(commonApp, 'CloudFrontS3PotalStack');
  const commonTemplate = Template.fromStack(commonPortalStack);

  test('Global region', () => {
    commonTemplate.resourceCountIs('AWS::CloudFront::CloudFrontOriginAccessIdentity', 1);
    commonTemplate.resourceCountIs('AWS::CloudFront::Distribution', 1);
    commonTemplate.resourceCountIs('AWS::Lambda::LayerVersion', 1);
    commonTemplate.resourceCountIs('Custom::CDKBucketDeployment', 1);

    commonTemplate.hasOutput('ControlPlaneUrl', {});
    commonTemplate.hasOutput('PortalBucket', {});
    commonTemplate.hasOutput('LogBucket', {});
  });

  test('Log bucket', () => {
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
        LogFilePrefix: 'log-bucket-access-log/',
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
          JWKS_URI: {
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
                '/.well-known/jwks.json',
              ],
            ],
          },
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
      ReservedConcurrentExecutions: 100,
      Runtime: 'nodejs18.x',
    },
    );
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
      ],
      ExplicitAuthFlows: [
        'ALLOW_USER_PASSWORD_AUTH',
        'ALLOW_REFRESH_TOKEN_AUTH',
      ],
      SupportedIdentityProviders: [
        'COGNITO',
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
    expect(findResourcesName(commonTemplate, 'AWS::Lambda::Function'))
      .toEqual([
        'ClickStreamApiBatchInsertDDBCustomResourceDicInitCustomResourceFunction50F646E7',
        'ClickStreamApiBatchInsertDDBCustomResourceDicInitCustomResourceProviderframeworkonEventCEE52DB5',
        'ClickStreamApiStackActionStateMachineCallbackFunction4F5BE492',
        'ClickStreamApiClickStreamApiFunction8C843168',
        'LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8aFD4BFC8A',
        'CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F',
        'CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C81C01536',
        'AuthorizerFunctionB4DBAA43',
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

    expect(findResourcesName(template, 'AWS::Lambda::Function'))
      .toEqual([
        'certificateCertificateRequestorFunction5D4BA95F',
        'ClickStreamApiBatchInsertDDBCustomResourceDicInitCustomResourceFunction50F646E7',
        'ClickStreamApiBatchInsertDDBCustomResourceDicInitCustomResourceProviderframeworkonEventCEE52DB5',
        'ClickStreamApiStackActionStateMachineCallbackFunction4F5BE492',
        'ClickStreamApiClickStreamApiFunction8C843168',
        'LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8aFD4BFC8A',
        'CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F',
        'CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C81C01536',
        'AuthorizerFunctionB4DBAA43',
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

    template.hasOutput('ControlPlaneUrl', {});
    template.hasOutput('PortalBucket', {});
    template.hasOutput('LogBucket', {});

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

    expect(findResourcesName(template, 'AWS::Lambda::Function'))
      .toEqual([
        'ClickStreamApiBatchInsertDDBCustomResourceDicInitCustomResourceFunction50F646E7',
        'ClickStreamApiBatchInsertDDBCustomResourceDicInitCustomResourceProviderframeworkonEventCEE52DB5',
        'ClickStreamApiStackActionStateMachineCallbackFunction4F5BE492',
        'ClickStreamApiClickStreamApiFunction8C843168',
        'LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8aFD4BFC8A',
        'CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F',
        'CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C81C01536',
        'AuthorizerFunctionB4DBAA43',
      ]);
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
          JWKS_URI: {
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
                '/.well-known/jwks.json',
              ],
            ],
          },
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
      ReservedConcurrentExecutions: 100,
      Runtime: 'nodejs18.x',
    },
    );
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
          JWKS_URI: Match.anyValue(),
          ISSUER: Match.anyValue(),
        },
      },
      Handler: 'index.handler',
      Runtime: 'nodejs18.x',
    });
  });

});