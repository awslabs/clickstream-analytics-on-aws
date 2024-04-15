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

import { OUTPUT_CONTROL_PLANE_URL } from '@aws/clickstream-base-lib';
import {
  Aws,
} from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { findResourcesName, findResourceByKeyAndType } from './test-utils';
import { ApplicationLoadBalancerControlPlaneStack } from '../../src/alb-control-plane-stack';
import { SolutionInfo } from '../../src/common/solution-info';
import { SOLUTION_CONFIG_PATH } from '../../src/control-plane/private/solution-config';
import { TestApp, removeFolder } from '../common/jest';
import { validateSubnetsRule } from '../rules';

function getParameter(template: Template, param: string) {
  return template.toJSON().Parameters[param];
}

describe('ALBLambdaPortalStack - exist vpc & public & custom domain', () => {

  afterAll(() => {
    removeFolder(cdkOut);
  });

  const cdkOut = '/tmp/alb-portal-stack-public-custom-domain';
  const app = new TestApp(cdkOut);
  const portalStack = new ApplicationLoadBalancerControlPlaneStack(app, 'ALBPublicControlplaneTestStack01', {
    env: {
      region: Aws.REGION,
      account: Aws.ACCOUNT_ID,
    },
    existingVpc: true,
    internetFacing: true,
    useCustomDomain: true,
  });
  const template = Template.fromStack(portalStack);

  test('ALBPortalStack - exist vpc - public - custom domain', () => {
    template.hasParameter('VpcId', {});
    template.hasParameter('PublicSubnets', {});

    template.hasParameter('HostedZoneId', {});
    template.hasParameter('HostedZoneName', {});
    template.hasParameter('RecordName', {});

    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      Scheme: 'internet-facing',
    });
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      Protocol: 'HTTPS',
    });

    const albControlPlanePortalFn = findResourceByKeyAndType(template, 'albcontrolplaneportalfn', 'AWS::Lambda::Function');
    expect(JSON.stringify(albControlPlanePortalFn.Properties.VpcConfig.SubnetIds)).toContain('{"Ref":"PublicSubnets"}');

    expect(findResourcesName(template, 'AWS::CertificateManager::Certificate'))
      .toEqual(['certificateEC031123']);
    expect(findResourcesName(template, 'AWS::Route53::RecordSet'))
      .toEqual(['albcontrolplanealiasRecord2560DD98']);
    expect(findResourcesName(template, 'AWS::S3::Bucket'))
      .toEqual(['ClickstreamSolutionDataBucket200465FE']);

    template.hasOutput(OUTPUT_CONTROL_PLANE_URL, {});
    template.hasOutput('VpcId', {});

  });

  test('DynamoDB Endpoint - exist vpc - public - custom domain', () => {
    template.resourceCountIs('AWS::EC2::VPCEndpoint', 0);
  });

  test('VpcId pattern', () => {
    const param = getParameter(template, 'VpcId');
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);
    const validValues = [
      'vpc-ab1234c',
    ];

    for (const v of validValues) {
      expect(v).toMatch(regex);
    }

    const invalidValues = [
      'vpc-g1234567',
      'abc-f1234',
      'vpca12345',
      'vpc-ab1234c, vpc-b1234e',
    ];
    for (const v of invalidValues) {
      expect(v).not.toMatch(regex);
    }
  });

  test('HostedZoneId pattern', () => {
    const param = getParameter(template, 'HostedZoneId');
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);
    const validValues = [
      'ZERTYUGDDDDZRHJ',
    ];

    for (const v of validValues) {
      expect(v).toMatch(regex);
    }

    const invalidValues = [
      'AERTYUGDDDDZRHJ',
      'ZERTYUGDDDDabcdef',
    ];
    for (const v of invalidValues) {
      expect(v).not.toMatch(regex);
    }
  });

  test('HostedZoneName pattern', () => {
    const param = getParameter(template, 'HostedZoneName');
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);
    const validValues = [
      'abc.com',
      'test.abc.com',
      '123.test.abc.com',
      '123.test-v1.abc.com',
      'test_v1.abc.com',
      'a123#~&%.test-2.a_bc.com',
    ];

    for (const v of validValues) {
      expect(v).toMatch(regex);
    }

    const invalidValues = [
      '',
      'a',
      'abc.example_test',
      'abc.c',
      'abc^.com',
    ];
    for (const v of invalidValues) {
      expect(v).not.toMatch(regex);
    }
  });

  test('RecordName pattern', () => {
    const param = getParameter(template, 'RecordName');
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);
    const validValues = [
      'abc',
      'def-',
      'bce_',
      '124',
      'ABC123',
    ];

    for (const v of validValues) {
      expect(v).toMatch(regex);
    }

    const invalidValues = [
      '',
      'abc@',
      'abc.example',
    ];
    for (const v of invalidValues) {
      expect(v).not.toMatch(regex);
    }
  });

  test('Subnets in VPC rule', () => {
    validateSubnetsRule(template);
  });
});

describe('ALBLambdaPortalStack - exist vpc & public & no custom domain', () => {

  afterAll(() => {
    removeFolder(cdkOut);
  });

  const cdkOut = '/tmp/alb-portal-stack-public';
  const app = new TestApp(cdkOut);
  const portalStack = new ApplicationLoadBalancerControlPlaneStack(app, 'ALBPublicControlplaneTestStack02', {
    env: {
      region: Aws.REGION,
      account: Aws.ACCOUNT_ID,
    },
    existingVpc: true,
    internetFacing: true,
    useCustomDomain: false,
  });
  const template = Template.fromStack(portalStack);

  test('ALBPortalStack - exist vpc & public & no custom domain', () => {
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      Scheme: 'internet-facing',
    });

    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      Protocol: 'HTTP',
    });

    template.hasParameter('VpcId', {});
    template.hasParameter('PublicSubnets', {});
    template.resourceCountIs('AWS::CertificateManager::Certificate', 0);
    template.resourceCountIs('AWS::Route53::RecordSet', 0);
    expect(findResourcesName(template, 'AWS::S3::Bucket'))
      .toEqual([
        'ClickstreamSolutionDataBucket200465FE',
      ]);

    template.hasOutput(OUTPUT_CONTROL_PLANE_URL, {});
    template.hasOutput('VpcId', {});

  });

  test('DynamoDB Endpoint - exist vpc - public - no custom domain', () => {
    template.resourceCountIs('AWS::EC2::VPCEndpoint', 0);

  });
});

describe('ALBLambdaPortalStack - new vpc & public & no custom domain', () => {

  afterAll(() => {
    removeFolder(cdkOut);
  });

  const cdkOut = '/tmp/alb-portal-stack-new-vpc-public';
  const app = new TestApp(cdkOut);
  const portalStack = new ApplicationLoadBalancerControlPlaneStack(app, 'ALBPublicControlplaneTestStack03', {
    env: {
      region: Aws.REGION,
      account: Aws.ACCOUNT_ID,
    },
    existingVpc: false,
    internetFacing: true,
    useCustomDomain: false,
  });
  const template = Template.fromStack(portalStack);

  test('ALBPortalStack - new VPC - public - no custom domain', () => {
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      Scheme: 'internet-facing',
    });

    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      Protocol: 'HTTP',
    });
    template.resourceCountIs('AWS::CertificateManager::Certificate', 0);
    template.resourceCountIs('AWS::Route53::RecordSet', 0);
    expect(findResourcesName(template, 'AWS::S3::Bucket'))
      .toEqual([
        'ClickstreamSolutionDataBucket200465FE',
      ]);

    template.hasOutput(OUTPUT_CONTROL_PLANE_URL, {});
    template.hasOutput('VpcId', {});
    template.hasOutput('PublicSubnets', {});
    template.hasOutput('PrivateSubnets', {});

  });

  test('DynamoDB Endpoint - new VPC - public - no custom domain', () => {
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      ServiceName: {
        'Fn::Join': [
          '',
          [
            'com.amazonaws.',
            {
              Ref: 'AWS::Region',
            },
            '.dynamodb',
          ],
        ],
      },
      VpcId: {
        Ref: 'ClickstreamAnalyticsonAWSVpcDefaultVPC31B28594',
      },
      RouteTableIds: [
        {
          Ref: 'ClickstreamAnalyticsonAWSVpcDefaultVPCprivateSubnet1RouteTableBD0343AE',
        },
        {
          Ref: 'ClickstreamAnalyticsonAWSVpcDefaultVPCprivateSubnet2RouteTableB93D5F20',
        },
        { Ref: 'ClickstreamAnalyticsonAWSVpcDefaultVPCpublicSubnet1RouteTable354E1075' },
        { Ref: 'ClickstreamAnalyticsonAWSVpcDefaultVPCpublicSubnet2RouteTableBCCB9C3C' },
        { Ref: 'ClickstreamAnalyticsonAWSVpcDefaultVPCisolatedSubnet1RouteTable8028ED41' },
        { Ref: 'ClickstreamAnalyticsonAWSVpcDefaultVPCisolatedSubnet2RouteTable4C8052B7' },
      ],
      VpcEndpointType: 'Gateway',
    });
  });
});

describe('ALBLambdaPortalStack - new vpc & public & custom domain', () => {
  afterAll(() => {
    removeFolder(cdkOut);
  });

  const cdkOut = '/tmp/alb-portal-stack-new-vpc-public-custom-domain';
  const app = new TestApp(cdkOut);
  const portalStack = new ApplicationLoadBalancerControlPlaneStack(app, 'ALBPublicControlplaneTestStack04', {
    env: {
      region: Aws.REGION,
      account: Aws.ACCOUNT_ID,
    },
    existingVpc: false,
    internetFacing: true,
    useCustomDomain: true,
  });
  const template = Template.fromStack(portalStack);

  test('ALBPortalStack - new VPC - public - custom domain', () => {
    template.hasParameter('HostedZoneId', {});
    template.hasParameter('HostedZoneName', {});
    template.hasParameter('RecordName', {});

    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      Scheme: 'internet-facing',
    });

    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      Protocol: 'HTTPS',
    });
    template.resourceCountIs('AWS::CertificateManager::Certificate', 1);
    expect(findResourcesName(template, 'AWS::Route53::RecordSet'))
      .toEqual([
        'albcontrolplanealiasRecord2560DD98',
      ]);
    expect(findResourcesName(template, 'AWS::S3::Bucket'))
      .toEqual([
        'ClickstreamSolutionDataBucket200465FE',
      ]);

    template.hasOutput(OUTPUT_CONTROL_PLANE_URL, {});
    template.hasOutput('VpcId', {});
    template.hasOutput('PublicSubnets', {});
    template.hasOutput('PrivateSubnets', {});

  });

  test('DynamoDB Endpoint - new VPC - public - custom domain', () => {
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      ServiceName: {
        'Fn::Join': [
          '',
          [
            'com.amazonaws.',
            {
              Ref: 'AWS::Region',
            },
            '.dynamodb',
          ],
        ],
      },
      VpcId: {
        Ref: 'ClickstreamAnalyticsonAWSVpcDefaultVPC31B28594',
      },
      RouteTableIds: [
        {
          Ref: 'ClickstreamAnalyticsonAWSVpcDefaultVPCprivateSubnet1RouteTableBD0343AE',
        },
        {
          Ref: 'ClickstreamAnalyticsonAWSVpcDefaultVPCprivateSubnet2RouteTableB93D5F20',
        },
        { Ref: 'ClickstreamAnalyticsonAWSVpcDefaultVPCpublicSubnet1RouteTable354E1075' },
        { Ref: 'ClickstreamAnalyticsonAWSVpcDefaultVPCpublicSubnet2RouteTableBCCB9C3C' },
        { Ref: 'ClickstreamAnalyticsonAWSVpcDefaultVPCisolatedSubnet1RouteTable8028ED41' },
        { Ref: 'ClickstreamAnalyticsonAWSVpcDefaultVPCisolatedSubnet2RouteTable4C8052B7' },
      ],
      VpcEndpointType: 'Gateway',
    });

  });

  test('Cognito', () => {
    template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
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
                'Fn::Join': [
                  '.',
                  [
                    {
                      Ref: 'RecordName',
                    },
                    {
                      Ref: 'HostedZoneName',
                    },
                  ],
                ],
              },
              ':443/signin',
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
                'Fn::Join': [
                  '.',
                  [
                    {
                      Ref: 'RecordName',
                    },
                    {
                      Ref: 'HostedZoneName',
                    },
                  ],
                ],
              },
              ':443',
            ],
          ],
        },
      ],
    });

    template.hasResourceProperties('AWS::Cognito::UserPool', {
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

    template.hasResourceProperties('AWS::Cognito::UserPoolDomain', {});
    template.hasResourceProperties('AWS::Cognito::UserPoolUser', {
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

  });

  test('Fix response', () => {
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::ListenerRule', {
      Actions: [
        {
          FixedResponseConfig: {
            ContentType: 'application/json',
            MessageBody: {
              'Fn::Join': [
                '',
                [
                  '{"oidc_provider":"https://cognito-idp.',
                  {
                    Ref: 'AWS::Region',
                  },
                  '.amazonaws.com/',
                  {
                    Ref: 'userPoolDC9497E0',
                  },
                  '","oidc_client_id":"',
                  {
                    Ref: 'clickstreambackendclient721D6562',
                  },
                  '","oidc_redirect_url":"https://',
                  {
                    'Fn::Join': [
                      '.',
                      [
                        {
                          Ref: 'RecordName',
                        },
                        {
                          Ref: 'HostedZoneName',
                        },
                      ],
                    ],
                  },
                  `:443/signin","solution_version":"${SolutionInfo.SOLUTION_VERSION}","control_plane_mode":"ALB","solution_data_bucket":"`,
                  {
                    Ref: 'ClickstreamSolutionDataBucket200465FE',
                  },
                  '","solution_plugin_prefix":"plugins/","solution_region":"',
                  {
                    Ref: 'AWS::Region',
                  },
                  '","oidc_logout_url":"https://',
                  {
                    Ref: 'userPoolcognitodomain5F5914A6',
                  },
                  '.auth.',
                  {
                    Ref: 'AWS::Region',
                  },
                  '.amazoncognito.com/logout"}',
                ],
              ],
            },
            StatusCode: '200',
          },
          Type: 'fixed-response',
        },
      ],
      Conditions: [
        {
          Field: 'path-pattern',
          PathPatternConfig: {
            Values: [
              SOLUTION_CONFIG_PATH,
            ],
          },
        },
      ],
      Priority: 45,
      ListenerArn: {
        Ref: 'albcontrolplaneALBListener2210871E',
      },
    });

  });
});


describe('ALBPortalStack - exist vpc & private & no custom domain', () => {
  afterAll(() => {
    removeFolder(cdkOut);
  });

  const cdkOut = '/tmp/alb-portal-stack-private';
  const app = new TestApp(cdkOut);
  const portalStack = new ApplicationLoadBalancerControlPlaneStack(app, 'ALBPublicControlplaneTestStack05', {
    env: {
      region: Aws.REGION,
      account: Aws.ACCOUNT_ID,
    },
    existingVpc: true,
    internetFacing: false,
    useCustomDomain: false,
  });

  test('Test control plane stack in existing vpc', () => {
    const template = Template.fromStack(portalStack);
    template.hasParameter('VpcId', {});
    template.hasParameter('PrivateSubnets', {});
    const publicSubnets = template.findParameters('PublicSubnets', {});
    expect(publicSubnets).toEqual({});

    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      Scheme: 'internal',
    });
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      Protocol: 'HTTP',
    });
    template.resourceCountIs('AWS::CertificateManager::Certificate', 0);
    template.resourceCountIs('AWS::Route53::RecordSet', 0);

    const albControlPlanePortalFn = findResourceByKeyAndType(template, 'albcontrolplaneportalfn', 'AWS::Lambda::Function');
    expect(JSON.stringify(albControlPlanePortalFn.Properties.VpcConfig.SubnetIds)).toContain('{"Ref":"PrivateSubnets"}');

    expect(findResourcesName(template, 'AWS::S3::Bucket'))
      .toEqual([
        'ClickstreamSolutionDataBucket200465FE',
      ]);
    expect(findResourcesName(template, 'AWS::Lambda::Function'))
      .toEqual([
        'albcontrolplaneportalfnC6B1CDAC',
        'ClickStreamApiBatchInsertDDBCustomResourceDicInitCustomResourceFunction50F646E7',
        'ClickStreamApiBatchInsertDDBCustomResourceDicInitCustomResourceProviderframeworkonEventCEE52DB5',
        'ClickStreamApiStackActionStateMachineActionFunction8314F7B4',
        'ClickStreamApiStackWorkflowStateMachineWorkflowFunctionD5F091A8',
        'ClickStreamApiBackendEventBusListenStateFunctionE05DD00F',
        'ClickStreamApiBackendEventBusListenStackFunction2C052556',
        'ClickStreamApiApiFunction684A4D61',
        'LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8aFD4BFC8A',
        'AWS679f53fac002430cb0da5b7982bd22872D164C4C',
      ]);
    template.hasResourceProperties('AWS::Lambda::Function', {
      PackageType: 'Image',
      Timeout: 10,
    });

    template.hasOutput(OUTPUT_CONTROL_PLANE_URL, {});
    template.hasOutput('VpcId', {});
    template.hasOutput('SourceSecurityGroup', {});

    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          LOG_LEVEL: 'WARN',
          POWERTOOLS_SERVICE_NAME: 'ClickStreamAnalyticsOnAWS',
        },
      },
    });

  });
});

describe('ALBLambdaPortalStack - new vpc & private', () => {
  afterAll(() => {
    removeFolder(cdkOut);
  });

  const cdkOut = '/tmp/alb-portal-stack-new-vpc-private';
  const app = new TestApp(cdkOut);
  const portalStack = new ApplicationLoadBalancerControlPlaneStack(app, 'ALBPublicControlplaneTestStack06', {
    env: {
      region: Aws.REGION,
      account: Aws.ACCOUNT_ID,
    },
    existingVpc: false,
    internetFacing: false,
    useCustomDomain: false,
  });
  const template = Template.fromStack(portalStack);

  test('ALBPortalStack - new VPC - private - no custom domain', () => {
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      Scheme: 'internal',
    });
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      Protocol: 'HTTP',
    });
    template.resourceCountIs('AWS::CertificateManager::Certificate', 0);
    template.resourceCountIs('AWS::Route53::RecordSet', 0);

    expect(findResourcesName(template, 'AWS::S3::Bucket'))
      .toEqual([
        'ClickstreamSolutionDataBucket200465FE',
      ]);

    template.hasOutput(OUTPUT_CONTROL_PLANE_URL, {});
    template.hasOutput('VpcId', {});
    template.hasOutput('SourceSecurityGroup', {});
    template.hasOutput('PublicSubnets', {});
    template.hasOutput('PrivateSubnets', {});

  });

  test('grant the ALB writing access log to solution\'s data bucket, support both ALB account name and logdeliver service', () => {
    template.hasResource('AWS::S3::BucketPolicy', {
      Properties: {
        PolicyDocument: {
          Statement: [
            {
              Action: 's3:*',
              Condition: {
                Bool: {
                  'aws:SecureTransport': 'false',
                },
              },
              Effect: 'Deny',
              Principal: {
                AWS: '*',
              },
              Resource: [
                {
                  'Fn::GetAtt': [
                    'ClickstreamSolutionDataBucket200465FE',
                    'Arn',
                  ],
                },
                {
                  'Fn::Join': [
                    '',
                    [
                      {
                        'Fn::GetAtt': [
                          'ClickstreamSolutionDataBucket200465FE',
                          'Arn',
                        ],
                      },
                      '/*',
                    ],
                  ],
                },
              ],
            },
            {
              Action: [
                's3:PutObject',
                's3:PutObjectLegalHold',
                's3:PutObjectRetention',
                's3:PutObjectTagging',
                's3:PutObjectVersionTagging',
                's3:Abort*',
              ],
              Effect: 'Allow',
              Principal: {
                AWS: {
                  'Fn::Join': [
                    '',
                    [
                      'arn:',
                      {
                        Ref: 'AWS::Partition',
                      },
                      ':iam::',
                      {
                        'Fn::FindInMap': [
                          'ALBServiceAccountMapping',
                          {
                            Ref: 'AWS::Region',
                          },
                          'account',
                        ],
                      },
                      ':root',
                    ],
                  ],
                },
              },
              Resource: {
                'Fn::Join': [
                  '',
                  [
                    {
                      'Fn::GetAtt': [
                        'ClickstreamSolutionDataBucket200465FE',
                        'Arn',
                      ],
                    },
                    '/console-alb-access-logs/*',
                  ],
                ],
              },
            },
          ],
        },
      },
      Condition: 'ALBAccountsInRegion',
    });

    template.hasResource('AWS::S3::BucketPolicy', {
      Properties: {
        PolicyDocument: {
          Statement: [
            {
              Action: 's3:*',
              Condition: {
                Bool: {
                  'aws:SecureTransport': 'false',
                },
              },
              Effect: 'Deny',
              Principal: {
                AWS: '*',
              },
              Resource: [
                {
                  'Fn::GetAtt': [
                    'ClickstreamSolutionDataBucket200465FE',
                    'Arn',
                  ],
                },
                {
                  'Fn::Join': [
                    '',
                    [
                      {
                        'Fn::GetAtt': [
                          'ClickstreamSolutionDataBucket200465FE',
                          'Arn',
                        ],
                      },
                      '/*',
                    ],
                  ],
                },
              ],
            },
            {
              Action: [
                's3:PutObject',
                's3:PutObjectLegalHold',
                's3:PutObjectRetention',
                's3:PutObjectTagging',
                's3:PutObjectVersionTagging',
                's3:Abort*',
              ],
              Effect: 'Allow',
              Principal: {
                Service: 'logdelivery.elasticloadbalancing.amazonaws.com',
              },
              Resource: {
                'Fn::Join': [
                  '',
                  [
                    {
                      'Fn::GetAtt': [
                        'ClickstreamSolutionDataBucket200465FE',
                        'Arn',
                      ],
                    },
                    '/console-alb-access-logs/*',
                  ],
                ],
              },
            },
          ],
        },
      },
      Condition: 'ALBAccountsNotInRegion',
    });
  });
});