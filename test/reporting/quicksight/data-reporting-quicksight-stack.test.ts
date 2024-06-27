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

import { OUTPUT_REPORTING_QUICKSIGHT_DASHBOARDS, OUTPUT_REPORTING_QUICKSIGHT_DATA_SOURCE_ARN, OUTPUT_REPORTING_QUICKSIGHT_REDSHIFT_DATABASE_NAME, OUTPUT_REPORTING_QUICKSIGHT_REDSHIFT_DATA_API_ROLE_ARN, OUTPUT_REPORTING_QUICKSIGHT_REDSHIFT_ENDPOINT_ADDRESS } from '@aws/clickstream-base-lib';
import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { DataReportingQuickSightStack } from '../../../src/data-reporting-quicksight-stack';

if (process.env.CI !== 'true') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  jest.mock('aws-cdk-lib/aws-lambda-nodejs', () => require('../../cdk-lambda-nodejs-mock'));
}

describe('DataReportingQuickSightStack parameter test', () => {
  const app = new App();
  const testId = 'test-1';
  const stack = new DataReportingQuickSightStack(app, testId+'-data-analytics-quicksight-stack', {});
  const template = Template.fromStack(stack);

  beforeEach(() => {
  });

  test('Has Dashboards output', () => {
    template.hasOutput(OUTPUT_REPORTING_QUICKSIGHT_DASHBOARDS, {});
  });

  test('Has Dashboards output', () => {
    template.hasOutput(OUTPUT_REPORTING_QUICKSIGHT_DATA_SOURCE_ARN, {});
  });

  test('Has Redshift serverless data api role output', () => {
    template.hasOutput(OUTPUT_REPORTING_QUICKSIGHT_REDSHIFT_DATA_API_ROLE_ARN, {});
  });

  test('Has Redshift database name output', () => {
    template.hasOutput(OUTPUT_REPORTING_QUICKSIGHT_REDSHIFT_DATABASE_NAME, {});
  });

  test('Has Redshift serverless workgroup name', () => {
    template.hasOutput(OUTPUT_REPORTING_QUICKSIGHT_REDSHIFT_ENDPOINT_ADDRESS, {});
  });

  test('Should has Parameter quickSightUserParam', () => {
    template.hasParameter('QuickSightUserParam', {
      Type: 'String',
    });
  });

  test('Should has Parameter quickSightNamespaceParam', () => {
    template.hasParameter('QuickSightNamespaceParam', {
      Type: 'String',
    });
  });

  test('Should has Parameter QuickSightVpcConnectionSGParam', () => {
    template.hasParameter('QuickSightVpcConnectionSGParam', {});
  });

  test('Should has Parameter QuickSightVpcConnectionSubnetParam', () => {
    template.hasParameter('QuickSightVpcConnectionSubnetParam', {});
  });

  test('Should has Parameter QuickSightOwnerPrincipalParam', () => {
    template.hasParameter('QuickSightOwnerPrincipalParam', {
      Type: 'String',
    });
  });

  test('Should has Parameter QuickSightTimezoneParam', () => {
    template.hasParameter('QuickSightTimezoneParam', {
      Type: 'String',
      Default: '[]',
    });
  });

  test('Should has Parameter QuickSightUseSpiceParam', () => {
    template.hasParameter('QuickSightUseSpiceParam', {
      Type: 'String',
      Default: 'no',
      AllowedValues: ['no', 'yes'],
    });
  });

  test('Should has Parameter QuickSightRealTimeDashboardParam', () => {
    template.hasParameter('QuickSightRealTimeDashboardParam', {
      Type: 'String',
      Default: 'yes',
      AllowedValues: ['no', 'yes'],
    });
  });

  test('Should has Parameter redshiftEndpointParam', () => {
    template.hasParameter('RedshiftEndpointParam', {
      Type: 'String',
    });
  });

  test('Should has Parameter redshiftDBParam', () => {
    template.hasParameter('RedshiftDBParam', {
      Type: 'String',
    });
  });

  test('Should has Parameter redshiftDefaultDBParam', () => {
    template.hasParameter('RedshiftDefaultDBParam', {
      Type: 'String',
      Default: 'dev',
    });
  });

  test('Should has Parameter redShiftDBSchemaParam', () => {
    template.hasParameter('RedShiftDBSchemaParam', {
      Description: 'Comma delimited Redshift database schema name list',
      Type: 'String',
    });
  });

  test('Should has Parameter redshiftPortParam', () => {
    template.hasParameter('RedshiftPortParam', {
      Type: 'Number',
    });
  });

  test('Should has Parameter redshiftIAMRoleParam', () => {
    template.hasParameter('RedshiftIAMRoleParam', {
      Type: 'String',
    });
  });

  test('QuickSightUserParam pattern', () => {
    const param = template.toJSON().Parameters.QuickSightUserParam;
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);
    const validValues = [
      'abc-123',
      'abc_456',
      'Abc_456_def',
      '1abcd',
      '123345',
      'test@example.com',
      'Admin/test',
      'test-test',
      'test-ABC@example.com',
    ];

    for (const v of validValues) {
      expect(v).toMatch(regex);
    }

    const invalidValues = [
      'test;123',
      'test#',
      'a',
    ];
    for (const v of invalidValues) {
      expect(v).not.toMatch(regex);
    }
  });

  test('QuickSightPrincipalArnParam pattern', () => {
    const param = template.toJSON().Parameters.QuickSightOwnerPrincipalParam;
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);

    const validValues = [
      'arn:aws:quicksight:us-east-1:111111111111:user/default/clickstream',
      'arn:aws:quicksight:us-east-1:111111111111:user/default/Admin/testuser',
      'arn:aws:quicksight:us-east-1:111111111111:user/default/Admin/testuser@example.com',
      'arn:aws-cn:quicksight:cn-north-1:111111111111:user/namespace1/testuser@example.com',
    ];

    for (const v of validValues) {
      expect(v).toMatch(regex);
    }

    const invalidValues = [
      'testArn',
      'arn:aws:quicksight:us-east-1:2211:user/default/clickstream',
      'arn:aws:quicksight:us-east-1:111111111111:user/123/Admin/testuser',
      'arn:aws:quicksight:us-east-1:111111111111:user/default/test;123',
    ];
    for (const v of invalidValues) {
      expect(v).not.toMatch(regex);
    }
  });

  test('QuickSightNamespaceParam pattern', () => {
    const param = template.toJSON().Parameters.QuickSightNamespaceParam;
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);
    const validValues = [
      'abcde',
      'ABC1234',
      'default',
    ];

    for (const v of validValues) {
      expect(v).toMatch(regex);
    }

    const invalidValues = [
      '_abcedf',
      '-jklsks',
      'abc$rt',
      '123',
      'abc',
    ];
    for (const v of invalidValues) {
      expect(v).not.toMatch(regex);
    }
  });

  test('QuickSightVpcConnectionSubnetParam pattern', () => {
    const param = template.toJSON().Parameters.QuickSightVpcConnectionSubnetParam;
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);
    const validValues = [
      'subnet-06e3a4689f1025e5b,subnet-06e3a4689f1025eab',
      'subnet-aaaaaaaa,subnet-bbbbbbb,subnet-ccccccc,',

    ];

    for (const v of validValues) {
      expect(v).toMatch(regex);
    }

    const invalidValues = [
      'Subnet-06e3a4689f1025e5b',
      'subnet-06e3a4689f1025e5b,  subnet-06e3a4689f102fff',
      'xxxxxx-06e3a4689f1025e5b,yyyyy-06e3a4689f1025e5b',
      'subnet-06E3a4689f1025e5b',
      'subnet-1231aacc',
      'subnet-cccc',
    ];
    for (const v of invalidValues) {
      expect(v).not.toMatch(regex);
    }
  });

  test('QuickSightVpcConnectionSGParam pattern', () => {
    const param = template.toJSON().Parameters.QuickSightVpcConnectionSGParam;
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);
    const validValues = [
      'sg-0757849a2a9eebc4c,sg-11111aaaaaaaaa',
      'sg-0757849a2a9eebc4c,sg-11111aaaaaaaaa,sg-11111bbbbbbbb',
      'sg-0757849a2a9eebc4c',
      'sg-12345678',
    ];

    for (const v of validValues) {
      for ( const t of v.split(',')) {
        expect(t).toMatch(regex);
      }
    }

    const invalidValues = [
      'sg-0757849a2a9eebc4c,  sg-11111aaaaaaaaa',
      'xxxxxx-0757849a2a9eebc4c',
      'subnet-0757849a2a9Eebc4c',
    ];
    for (const v of invalidValues) {
      expect(v).not.toMatch(regex);
    }
  });

  test('RedshiftDBParam pattern', () => {
    const param = template.toJSON().Parameters.RedshiftDBParam;
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);
    const validValues = [
      'abc',
      'aaa12',
      'abc_ef',
    ];

    for (const v of validValues) {
      expect(v).toMatch(regex);
    }

    const invalidValues = [
      'ACde',
      'bCde',
      'abc-ef',
      'abc$rt',
      '123',
    ];
    for (const v of invalidValues) {
      expect(v).not.toMatch(regex);
    }
  });

  test('RedShiftDBSchemaParam pattern', () => {
    const param = template.toJSON().Parameters.RedShiftDBSchemaParam;
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);
    const validValues = [
      '',
      'abc',
      'abcd,efgh',
      'aaa12',
      'abc_ef',
      'ACde',
    ];

    for (const v of validValues) {
      expect(v).toMatch(regex);
    }

    const invalidValues = [
      'abc-ef',
      'abc$rt',
      '123',
    ];
    for (const v of invalidValues) {
      expect(v).not.toMatch(regex);
    }
  });

  test('RedshiftEndpointParam pattern', () => {
    const param = template.toJSON().Parameters.RedshiftEndpointParam;
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);
    const validValues = [
      'abc.com',
      'test.abc.com',
      '123.test.abc.com',
      '123.test-v1.abc.com',
      'test_v1.abc.com',
      'a123#~&%.test-2.a_bc.com',
      'a.b.c.d.e.f.com',
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

  test('Should has Parameter AppRegistryApplicationArn', () => {
    template.hasParameter('AppRegistryApplicationArn', {
      Type: 'String',
    });
  });

  test('RedshiftIAMRole allowedPattern', () => {
    const param = template.toJSON().Parameters.RedshiftIAMRoleParam;
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);
    const validValues = [
      'arn:aws:iam::000000000000:role/redshift-serverless-role',
      'arn:aws-cn:iam::000000000000:role/redshift-serverless-role',
    ];

    for (const v of validValues) {
      expect(v).toMatch(regex);
    }

    const invalidValues = [
      'arn:aws:iam::xxxxxxxxxxxx:role/redshift-serverless-role',
      'arn:aws:iam::1234:role/redshift-serverless-role',
      'b1.test.com:abc',
      'b-1.test.com:9092,b-2.test.com:9092',
      'b1.test.com:9092',
      'b_1.test.com',
      '',
    ];
    for (const v of invalidValues) {
      expect(v).not.toMatch(regex);
    }
  });

});

describe('DataReportingQuickSightStack resource test', () => {
  const app = new App();
  const testId = 'test-2';
  const stack = new DataReportingQuickSightStack(app, testId+'-data-analytics-quicksight-stack', {});
  const template = Template.fromStack(stack);

  template.resourcePropertiesCountIs('AWS::IAM::Policy',
    {
      PolicyDocument:
    {
      Statement:
        [
          {
            Action:
                [
                  'logs:CreateLogStream',
                  'logs:PutLogEvents',
                  'logs:CreateLogGroup',
                ],
            Effect: 'Allow',
            Resource: '*',
          },
          {
            Action:
                [
                  'quicksight:DescribeDataSource',
                  'quicksight:PassDataSource',
                  'quicksight:DescribeDataSourcePermissions',
                  'quicksight:UpdateDataSourcePermissions',
                ],
            Effect: 'Allow',
            Resource:
                {
                  'Fn::Join':
                    [
                      '',
                      [
                        'arn:',
                        {
                          Ref: 'AWS::Partition',
                        },
                        ':quicksight:',
                        {
                          Ref: 'AWS::Region',
                        },
                        ':',
                        {
                          Ref: 'AWS::AccountId',
                        },
                        ':datasource/clickstream_datasource_*',
                      ],
                    ],
                },
          },
          {
            Action:
                [
                  'quicksight:DescribeTemplate',
                  'quicksight:ListTemplateVersions',
                ],
            Effect: 'Allow',
            Resource:
                [
                  {
                    'Fn::Join':
                        [
                          '',
                          [
                            'arn:',
                            {
                              Ref: 'AWS::Partition',
                            },
                            ':quicksight:',
                            {
                              Ref: 'AWS::Region',
                            },
                            ':',
                            {
                              Ref: 'AWS::AccountId',
                            },
                            ':template/clickstream_template_*',
                          ],
                        ],
                  },
                  {
                    'Fn::GetAtt':
                        [
                          'ClickstreamTemplateDef',
                          'Arn',
                        ],
                  },
                ],
          },
          {
            Action:
                [
                  'quicksight:DescribeDataSet',
                  'quicksight:DeleteDataSet',
                  'quicksight:CreateDataSet',
                  'quicksight:UpdateDataSet',
                  'quicksight:PassDataSet',
                  'quicksight:PassDataSource',
                  'quicksight:UpdateDataSetPermissions',
                ],
            Effect: 'Allow',
            Resource:
                {
                  'Fn::Join':
                    [
                      '',
                      [
                        'arn:',
                        {
                          Ref: 'AWS::Partition',
                        },
                        ':quicksight:',
                        {
                          Ref: 'AWS::Region',
                        },
                        ':',
                        {
                          Ref: 'AWS::AccountId',
                        },
                        ':dataset/clickstream_dataset_*',
                      ],
                    ],
                },
          },
          {
            Action:
                [
                  'quicksight:DescribeAnalysis',
                  'quicksight:DeleteAnalysis',
                  'quicksight:CreateAnalysis',
                  'quicksight:UpdateAnalysis',
                  'quicksight:UpdateAnalysisPermissions',
                ],
            Effect: 'Allow',
            Resource:
                {
                  'Fn::Join':
                    [
                      '',
                      [
                        'arn:',
                        {
                          Ref: 'AWS::Partition',
                        },
                        ':quicksight:',
                        {
                          Ref: 'AWS::Region',
                        },
                        ':',
                        {
                          Ref: 'AWS::AccountId',
                        },
                        ':analysis/clickstream_analysis_*',
                      ],
                    ],
                },
          },
          {
            Action:
                [
                  'quicksight:DescribeDashboard',
                  'quicksight:DeleteDashboard',
                  'quicksight:CreateDashboard',
                  'quicksight:UpdateDashboard',
                  'quicksight:UpdateDashboardPermissions',
                  'quicksight:UpdateDashboardPublishedVersion',
                ],
            Effect: 'Allow',
            Resource:
                {
                  'Fn::Join':
                    [
                      '',
                      [
                        'arn:',
                        {
                          Ref: 'AWS::Partition',
                        },
                        ':quicksight:',
                        {
                          Ref: 'AWS::Region',
                        },
                        ':',
                        {
                          Ref: 'AWS::AccountId',
                        },
                        ':dashboard/clickstream_dashboard_*',
                      ],
                    ],
                },
          },
          {
            Action:
                [
                  'quicksight:DescribeRefreshSchedule',
                  'quicksight:CreateRefreshSchedule',
                  'quicksight:UpdateRefreshSchedule',
                  'quicksight:DeleteRefreshSchedule',
                  'quicksight:PutDataSetRefreshProperties',
                  'quicksight:DescribeDataSetRefreshProperties',
                  'quicksight:DeleteDataSetRefreshProperties',
                ],
            Effect: 'Allow',
            Resource:
                {
                  'Fn::Join':
                    [
                      '',
                      [
                        'arn:',
                        {
                          Ref: 'AWS::Partition',
                        },
                        ':quicksight:',
                        {
                          Ref: 'AWS::Region',
                        },
                        ':',
                        {
                          Ref: 'AWS::AccountId',
                        },
                        ':dataset/clickstream_dataset_*',
                      ],
                    ],
                },
          },
          {
            Action:
                [
                  'quicksight:CreateFolderMembership',
                  'quicksight:DeleteFolderMembership',
                  'quicksight:DescribeFolder',
                  'quicksight:CreateFolder',
                  'quicksight:DeleteFolder',
                  'quicksight:UpdateFolder',
                  'quicksight:UpdateFolderPermissions',
                  'quicksight:ListFolderMembers',
                ],
            Effect: 'Allow',
            Resource:
                {
                  'Fn::Join':
                    [
                      '',
                      [
                        'arn:',
                        {
                          Ref: 'AWS::Partition',
                        },
                        ':quicksight:',
                        {
                          Ref: 'AWS::Region',
                        },
                        ':',
                        {
                          Ref: 'AWS::AccountId',
                        },
                        ':folder/clickstream*',
                      ],
                    ],
                },
          },
        ],
      Version: '2012-10-17',
    },
      PolicyName: 'QuicksightCustomResourceLambdaRoleDefaultPolicyA0EB8B03',
      Roles:
    [
      {
        Ref: 'QuicksightCustomResourceLambdaRole58092032',
      },
    ],
    }, 1);

  template.resourcePropertiesCountIs('AWS::Lambda::Function', {
    Code: Match.anyValue(),
    Role: {
      'Fn::GetAtt': [
        Match.stringLikeRegexp('QuicksightCustomResourceLambdaRole[0-9]+'),
        'Arn',
      ],
    },
    Environment: {
      Variables: {
        POWERTOOLS_SERVICE_NAME: 'ClickStreamAnalyticsOnAWS',
        POWERTOOLS_LOGGER_SAMPLE_RATE: '1',
        POWERTOOLS_LOGGER_LOG_EVENT: 'true',
        LOG_LEVEL: 'WARN',
      },
    },
    LoggingConfig: {
      LogFormat: 'JSON',
      ApplicationLogLevel: 'INFO',
      LogGroup: {
        Ref: 'QuicksightCustomResourceLambdalog376BFB51',
      },
    },
    Handler: 'index.handler',
    MemorySize: 256,
    Timeout: 900,
  }, 1);

  template.resourcePropertiesCountIs('AWS::QuickSight::VPCConnection', {
    AwsAccountId: {
      Ref: 'AWS::AccountId',
    },
    RoleArn: {
      'Fn::GetAtt': [
        'VPCConnectionCreateRoleC12A5544',
        'Arn',
      ],
    },
    SecurityGroupIds: {
      Ref: 'QuickSightVpcConnectionSGParam',
    },
    SubnetIds: {
      'Fn::Split': [
        ',',
        {
          Ref: 'QuickSightVpcConnectionSubnetParam',
        },
      ],
    },
  }, 1);

  template.resourcePropertiesCountIs('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: {
            Service: 'quicksight.amazonaws.com',
          },
        },
      ],
      Version: '2012-10-17',
    },
    Description: 'IAM role use to create QuickSight VPC connection.',
  }, 1);

  template.resourcePropertiesCountIs('AWS::Lambda::Function', {
    Code: Match.anyValue(),
    Role: {
      'Fn::GetAtt': [
        Match.stringLikeRegexp('QuicksightCustomResourceProviderframeworkonEventServiceRole[A-Z0-9]+'),
        'Arn',
      ],
    },
    Environment: {
      Variables: {
        USER_ON_EVENT_FUNCTION_ARN: {
          'Fn::GetAtt': [
            Match.stringLikeRegexp('QuicksightCustomResourceLambda[A-Z0-9]+'),
            'Arn',
          ],
        },
      },
    },
    Handler: 'framework.onEvent',
    Timeout: 900,
  }, 1);

  template.resourcePropertiesCountIs('AWS::Logs::LogGroup', {
    RetentionInDays: 7,
  }, 2);

  template.resourcePropertiesCountIs('AWS::QuickSight::Template',
    {
      AwsAccountId: {
        Ref: 'AWS::AccountId',
      },
      Definition: {
        'Fn::If': [
          'useSpiceCondition',
          Match.anyValue(),
          Match.anyValue(),
        ],
      },
      Permissions: [
        {
          Actions: [
            'quicksight:UpdateTemplatePermissions',
            'quicksight:DescribeTemplatePermissions',
            'quicksight:DescribeTemplate',
            'quicksight:DeleteTemplate',
            'quicksight:UpdateTemplate',
          ],
          Principal: {
            Ref: 'QuickSightOwnerPrincipalParam',
          },
        },
      ],
      TemplateId: {
        'Fn::Join': [
          '',
          [
            'clickstream_template_',
            {
              Ref: 'RedshiftDBParam',
            },
            '_',
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
    }, 1);

  template.resourcePropertiesCountIs('AWS::QuickSight::DataSource', {
    AwsAccountId: {
      Ref: 'AWS::AccountId',
    },
    Credentials: {
      CredentialPair: {
        Password: {
          'Fn::Join': [
            '',
            [
              '{{resolve:secretsmanager:arn:',
              {
                Ref: 'AWS::Partition',
              },
              ':secretsmanager:',
              {
                Ref: 'AWS::Region',
              },
              ':',
              {
                Ref: 'AWS::AccountId',
              },
              ':secret:',
              {
                Ref: 'RedshiftParameterKeyParam',
              },
              ':SecretString:password::}}',
            ],
          ],
        },
        Username: {
          'Fn::Join': [
            '',
            [
              '{{resolve:secretsmanager:arn:',
              {
                Ref: 'AWS::Partition',
              },
              ':secretsmanager:',
              {
                Ref: 'AWS::Region',
              },
              ':',
              {
                Ref: 'AWS::AccountId',
              },
              ':secret:',
              {
                Ref: 'RedshiftParameterKeyParam',
              },
              ':SecretString:username::}}',
            ],
          ],
        },
      },
    },
    DataSourceId: {
      'Fn::Join': [
        '',
        [
          'clickstream_datasource_',
          {
            Ref: 'RedshiftDBParam',
          },
          '_',
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
    DataSourceParameters: {
      RedshiftParameters: {
        Database: {
          Ref: 'RedshiftDefaultDBParam',
        },
        Host: {
          Ref: 'RedshiftEndpointParam',
        },
        Port: {
          Ref: 'RedshiftPortParam',
        },
      },
    },
    Name: {
      'Fn::Join': [
        '',
        [
          'Clickstream DataSource ',
          {
            Ref: 'RedshiftDBParam',
          },
        ],
      ],
    },
    Type: 'REDSHIFT',
    VpcConnectionProperties: {
      VpcConnectionArn: {
        'Fn::GetAtt': [
          'ClickstreamVPCConnectionResource',
          'Arn',
        ],
      },
    },
  }, 1);

  template.resourcePropertiesCountIs('AWS::CloudFormation::CustomResource',
    
    , 1);

  template.resourcePropertiesCountIs('AWS::CloudFormation::CustomResource',
    {
      ServiceToken: {
        'Fn::GetAtt': [
          'NetworkInterfaceCheckCustomResourceProviderframeworkonEvent123C1881',
          'Arn',
        ],
      },
      awsRegion: {
        Ref: 'AWS::Region',
      },
      networkInterfaces: {
        'Fn::GetAtt': [
          'ClickstreamVPCConnectionResource',
          'NetworkInterfaces',
        ],
      },
    }, 1);

  test('Should has ApplicationArnCondition', () => {
    template.hasCondition('ApplicationArnCondition', {
      'Fn::Not': [
        {
          'Fn::Equals': [
            {
              Ref: 'AppRegistryApplicationArn',
            },
            '',
          ],
        },
      ],
    });
  });

  test('Should has AppRegistryAssociation', () => {
    template.hasResourceProperties('AWS::ServiceCatalogAppRegistry::ResourceAssociation', {
      Application: {
        'Fn::Select': [
          2,
          {
            'Fn::Split': [
              '/',
              {
                'Fn::Select': [
                  5,
                  {
                    'Fn::Split': [
                      ':',
                      {
                        Ref: 'AppRegistryApplicationArn',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      Resource: {
        Ref: 'AWS::StackId',
      },
      ResourceType: 'CFN_STACK',
    });
  });

});