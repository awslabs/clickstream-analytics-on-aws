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

import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { DataReportingQuickSightStack } from '../../../src/data-reporting-quicksight-stack';

describe('DataReportingQuickSightStack parameter test', () => {
  const app = new App();
  const testId = 'test-1';
  const stack = new DataReportingQuickSightStack(app, testId+'-data-analytics-quicksight-stack', {});
  const template = Template.fromStack(stack);

  beforeEach(() => {
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

  test('Should has Parameter QuickSightPrincipalParam', () => {
    template.hasParameter('QuickSightPrincipalParam', {
      Type: 'String',
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

  test('Should has Parameter redshiftPortParam', () => {
    template.hasParameter('RedshiftPortParam', {
      Type: 'Number',
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

});

describe('DataReportingQuickSightStack resource test', () => {
  const app = new App();
  const testId = 'test-2';
  const stack = new DataReportingQuickSightStack(app, testId+'-data-analytics-quicksight-stack', {});
  const template = Template.fromStack(stack);

  template.resourcePropertiesCountIs('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            'logs:CreateLogStream',
            'logs:PutLogEvents',
            'logs:CreateLogGroup',
          ],
          Effect: 'Allow',
          Resource: {
            'Fn::Join': [
              '',
              [
                'arn:',
                {
                  Ref: 'AWS::Partition',
                },
                ':logs:',
                {
                  Ref: 'AWS::Region',
                },
                ':',
                {
                  Ref: 'AWS::AccountId',
                },
                ':log-group:/aws/lambda/*',
              ],
            ],
          },
        },
        {
          Action: [
            'quicksight:DescribeDataSource',
            'quicksight:DeleteDataSource',
            'quicksight:CreateDataSource',
            'quicksight:UpdateDataSource',
            'quicksight:PassDataSource',
          ],
          Effect: 'Allow',
          Resource: {
            'Fn::Join': [
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
                ':datasource/clickstream_quicksight_data_source_*',
              ],
            ],
          },
        },
        {
          Action: [
            'quicksight:DescribeTemplate',
            'quicksight:DeleteTemplate',
            'quicksight:CreateTemplate',
            'quicksight:UpdateTemplate',
          ],
          Effect: 'Allow',
          Resource: [
            {
              'Fn::Join': [
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
                  ':template/clickstream_quicksight_template_*',
                ],
              ],
            },
            {
              Ref: 'QuickSightTemplateArnParam',
            },
          ],
        },
        {
          Action: [
            'quicksight:DescribeDataSet',
            'quicksight:DeleteDataSet',
            'quicksight:CreateDataSet',
            'quicksight:UpdateDataSet',
            'quicksight:PassDataSet',
            'quicksight:PassDataSource',
          ],
          Effect: 'Allow',
          Resource: {
            'Fn::Join': [
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
                ':dataset/dataset_clickstream_*',
              ],
            ],
          },
        },
        {
          Action: [
            'quicksight:DescribeAnalysis',
            'quicksight:DeleteAnalysis',
            'quicksight:CreateAnalysis',
            'quicksight:UpdateAnalysis',
          ],
          Effect: 'Allow',
          Resource: {
            'Fn::Join': [
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
          Action: [
            'quicksight:DescribeDashboard',
            'quicksight:DeleteDashboard',
            'quicksight:CreateDashboard',
            'quicksight:UpdateDashboard',
          ],
          Effect: 'Allow',
          Resource: {
            'Fn::Join': [
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
          Action: 'ssm:GetParameter',
          Effect: 'Allow',
          Resource: {
            'Fn::Join': [
              '',
              [
                'arn:',
                {
                  Ref: 'AWS::Partition',
                },
                ':ssm:',
                {
                  Ref: 'AWS::Region',
                },
                ':',
                {
                  Ref: 'AWS::AccountId',
                },
                ':parameter/',
                {
                  Ref: 'RedshiftParameterKeyParam',
                },
              ],
            ],
          },
        },
      ],
      Version: '2012-10-17',
    },
    PolicyName: 'QuicksightCustomResourceLambdaRoleDefaultPolicyA0EB8B03',
    Roles: [
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
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
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
        Match.stringLikeRegexp('QuicksightDatasourceCustomResourceProviderframeworkonEventServiceRole[A-Z0-9]+'),
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

  template.resourcePropertiesCountIs('Custom::LogRetention', {
    ServiceToken: {
      'Fn::GetAtt': [
        Match.stringLikeRegexp('LogRetention[a-zA-Z0-9]+'),
        'Arn',
      ],
    },
    LogGroupName: {
      'Fn::Join': [
        '',
        [
          '/aws/lambda/',
          {
            Ref: Match.stringLikeRegexp('QuicksightCustomResourceLambda[a-zA-Z0-9]+'),
          },
        ],
      ],
    },
    RetentionInDays: 7,
  }, 1);

  template.resourcePropertiesCountIs('AWS::CloudFormation::CustomResource', {
    ServiceToken: {
      'Fn::GetAtt': [
        Match.stringLikeRegexp('QuicksightDatasourceCustomResourceProviderframeworkonEvent[0-9A-Z]+'),
        'Arn',
      ],
    },
    awsAccountId: {
      Ref: 'AWS::AccountId',
    },
    awsRegion: {
      Ref: 'AWS::Region',
    },
    awsPartition: {
      Ref: 'AWS::Partition',
    },
    quickSightNamespace: {
      Ref: 'QuickSightNamespaceParam',
    },
    quickSightUser: {
      Ref: 'QuickSightUserParam',
    },
    quickSightPrincipalArn: {
      Ref: 'QuickSightPrincipalParam',
    },
    schemas: {
      Ref: 'RedShiftDBSchemaParam',
    },
    dashboardDefProps: {
      analysisId: {
        'Fn::Join': [
          '',
          [
            'clickstream_analysis_v1_',
            {
              Ref: 'RedshiftDBParam',
            },
            '_##SCHEMA##',
          ],
        ],
      },
      analysisName: {
        'Fn::Join': [
          '',
          [
            'Clickstream Analysis ',
            {
              Ref: 'RedshiftDBParam',
            },
            '_##SCHEMA##',
          ],
        ],
      },
      dashboardId: {
        'Fn::Join': [
          '',
          [
            'clickstream_dashboard_v1_',
            {
              Ref: 'RedshiftDBParam',
            },
            '_##SCHEMA##',
          ],
        ],
      },
      dashboardName: {
        'Fn::Join': [
          '',
          [
            'Clickstream Dashboard ',
            {
              Ref: 'RedshiftDBParam',
            },
            '_##SCHEMA##',
          ],
        ],
      },
      template: {
        id: {
          'Fn::Join': [
            '',
            [
              'clickstream_quicksight_template_v1_',
              {
                Ref: 'RedshiftDBParam',
              },
              '_##SCHEMA##',
            ],
          ],
        },
        name: {
          'Fn::Join': [
            '',
            [
              'Clickstream Quicksight Template ',
              {
                Ref: 'RedshiftDBParam',
              },
              '_##SCHEMA##',
            ],
          ],
        },
        templateArn: {
          Ref: 'QuickSightTemplateArnParam',
        },
      },
      data: {
        dataSource: {
          id: {
            'Fn::Join': [
              '',
              [
                'clickstream_quicksight_data_source_v1_',
                {
                  Ref: 'RedshiftDBParam',
                },
                '_##SCHEMA##',
              ],
            ],
          },
          name: {
            'Fn::Join': [
              '',
              [
                'Clickstream Quicksight Data Source ',
                {
                  Ref: 'RedshiftDBParam',
                },
                '_##SCHEMA##',
              ],
            ],
          },
          endpoint: {
            Ref: 'RedshiftEndpointParam',
          },
          port: {
            Ref: 'RedshiftPortParam',
          },
          databaseName: {
            Ref: 'RedshiftDBParam',
          },
          credentialParameter: {
            Ref: 'RedshiftParameterKeyParam',
          },
          vpcConnectionArn: {
            'Fn::GetAtt': [
              'ClickstreamVPCConnectionResource',
              'Arn',
            ],
          },
        },
        dataSets: [
          {
            id: {
              'Fn::Join': [
                '',
                [
                  'dataset_clickstream_user_dim_view_v1_',
                  {
                    Ref: 'RedshiftDBParam',
                  },
                  '_##SCHEMA##',
                ],
              ],
            },
            name: {
              'Fn::Join': [
                '',
                [
                  'Daily Active User Dataset ',
                  {
                    Ref: 'RedshiftDBParam',
                  },
                  '_##SCHEMA##',
                ],
              ],
            },
            importMode: 'DIRECT_QUERY',
            physicalTableMap: {
              UserDimTable: {
                CustomSql: {
                  DataSourceArn: {
                    'Fn::Join': [
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
                        ':datasource/clickstream_quicksight_data_source_v1_',
                        {
                          Ref: 'RedshiftDBParam',
                        },
                        '_##SCHEMA##',
                      ],
                    ],
                  },
                  Name: 'clickstream_user_dim_view',
                  SqlQuery: 'SELECT * FROM ##SCHEMA##.clickstream_user_dim_view',
                  Columns: [
                    {
                      Name: 'user_id',
                      Type: 'STRING',
                    },
                    {
                      Name: 'custom_attr_value',
                      Type: 'STRING',
                    },
                    {
                      Name: 'is_registered',
                      Type: 'STRING',
                    },
                    {
                      Name: 'first_visit_country',
                      Type: 'STRING',
                    },
                    {
                      Name: 'first_traffic_source_source',
                      Type: 'STRING',
                    },
                    {
                      Name: 'first_traffic_source_name',
                      Type: 'STRING',
                    },
                    {
                      Name: 'custom_attr_key',
                      Type: 'STRING',
                    },
                    {
                      Name: 'first_visit_city',
                      Type: 'STRING',
                    },
                    {
                      Name: 'first_traffic_source_medium',
                      Type: 'STRING',
                    },
                    {
                      Name: 'first_visit_install_source',
                      Type: 'STRING',
                    },
                    {
                      Name: 'first_visit_device_language',
                      Type: 'STRING',
                    },
                    {
                      Name: 'user_pseudo_id',
                      Type: 'STRING',
                    },
                    {
                      Name: 'first_visit_date',
                      Type: 'DATETIME',
                    },
                    {
                      Name: 'first_platform',
                      Type: 'STRING',
                    },
                  ],
                },
              },
            },
            logicalTableMap: {
              UserDimLogicalTable: {
                Alias: 'UserDimTableAlias',
                Source: {
                  PhysicalTableId: 'UserDimTable',
                },
                DataTransforms: [
                  {
                    TagColumnOperation: {
                      ColumnName: 'first_visit_country',
                      Tags: [
                        {
                          ColumnGeographicRole: 'COUNTRY',
                        },
                      ],
                    },
                  },
                  {
                    TagColumnOperation: {
                      ColumnName: 'first_visit_city',
                      Tags: [
                        {
                          ColumnGeographicRole: 'CITY',
                        },
                      ],
                    },
                  },
                  {
                    ProjectOperation: {
                      ProjectedColumns: [
                        'user_pseudo_id',
                        'user_id',
                        'first_visit_date',
                        'first_visit_install_source',
                        'first_visit_device_language',
                        'first_platform',
                        'first_visit_country',
                        'first_visit_city',
                        'first_traffic_source_source',
                        'first_traffic_source_medium',
                        'first_traffic_source_name',
                        'custom_attr_key',
                        'custom_attr_value',
                        'is_registered',
                      ],
                    },
                  },
                ],
              },
            },
            columnGroups: [
              {
                GeoSpatialColumnGroup: {
                  Name: 'geo',
                  Columns: [
                    'first_visit_country',
                    'first_visit_city',
                  ],
                },
              },
            ],
          },
          {
            id: {
              'Fn::Join': [
                '',
                [
                  'dataset_clickstream_ods_flattened_view_v1_',
                  {
                    Ref: 'RedshiftDBParam',
                  },
                  '_##SCHEMA##',
                ],
              ],
            },
            name: {
              'Fn::Join': [
                '',
                [
                  'ODS Flattened Dataset ',
                  {
                    Ref: 'RedshiftDBParam',
                  },
                  '_##SCHEMA##',
                ],
              ],
            },
            importMode: 'DIRECT_QUERY',
            physicalTableMap: {
              ODSFalttenedTable: {
                CustomSql: {
                  DataSourceArn: {
                    'Fn::Join': [
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
                        ':datasource/clickstream_quicksight_data_source_v1_',
                        {
                          Ref: 'RedshiftDBParam',
                        },
                        '_##SCHEMA##',
                      ],
                    ],
                  },
                  Name: 'clickstream_ods_flattened_view',
                  SqlQuery: 'SELECT * FROM ##SCHEMA##.clickstream_ods_flattened_view',
                  Columns: [
                    {
                      Name: 'event_parameter_value',
                      Type: 'STRING',
                    },
                    {
                      Name: 'event_name',
                      Type: 'STRING',
                    },
                    {
                      Name: 'platform',
                      Type: 'STRING',
                    },
                    {
                      Name: 'event_date',
                      Type: 'DATETIME',
                    },
                    {
                      Name: 'event_id',
                      Type: 'STRING',
                    },
                    {
                      Name: 'user_pseudo_id',
                      Type: 'STRING',
                    },
                    {
                      Name: 'app_info_version',
                      Type: 'STRING',
                    },
                    {
                      Name: 'geo_country',
                      Type: 'STRING',
                    },
                    {
                      Name: 'event_parameter_key',
                      Type: 'STRING',
                    },
                  ],
                },
              },
            },
          },
          {
            id: {
              'Fn::Join': [
                '',
                [
                  'dataset_clickstream_session_view_v1_',
                  {
                    Ref: 'RedshiftDBParam',
                  },
                  '_##SCHEMA##',
                ],
              ],
            },
            name: {
              'Fn::Join': [
                '',
                [
                  'Session Dataset ',
                  {
                    Ref: 'RedshiftDBParam',
                  },
                  '_##SCHEMA##',
                ],
              ],
            },
            importMode: 'DIRECT_QUERY',
            physicalTableMap: {
              SessionTable: {
                CustomSql: {
                  DataSourceArn: {
                    'Fn::Join': [
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
                        ':datasource/clickstream_quicksight_data_source_v1_',
                        {
                          Ref: 'RedshiftDBParam',
                        },
                        '_##SCHEMA##',
                      ],
                    ],
                  },
                  Name: 'clickstream_session_view',
                  SqlQuery: 'SELECT * FROM ##SCHEMA##.clickstream_session_view',
                  Columns: [
                    {
                      Name: 'session_engagement_time_min',
                      Type: 'DECIMAL',
                    },
                    {
                      Name: 'exit_view',
                      Type: 'STRING',
                    },
                    {
                      Name: 'session_date',
                      Type: 'DATETIME',
                    },
                    {
                      Name: 'platform',
                      Type: 'STRING',
                    },
                    {
                      Name: 'session_views',
                      Type: 'INTEGER',
                    },
                    {
                      Name: 'session_id',
                      Type: 'STRING',
                    },
                    {
                      Name: 'user_pseudo_id',
                      Type: 'STRING',
                    },
                    {
                      Name: 'engaged_session',
                      Type: 'INTEGER',
                    },
                    {
                      Name: 'entry_view',
                      Type: 'STRING',
                    },
                  ],
                },
              },
            },
          },
          {
            id: {
              'Fn::Join': [
                '',
                [
                  'dataset_clickstream_ods_events_view_v1_',
                  {
                    Ref: 'RedshiftDBParam',
                  },
                  '_##SCHEMA##',
                ],
              ],
            },
            name: {
              'Fn::Join': [
                '',
                [
                  'Retention Dataset ',
                  {
                    Ref: 'RedshiftDBParam',
                  },
                  '_##SCHEMA##',
                ],
              ],
            },
            importMode: 'DIRECT_QUERY',
            physicalTableMap: {
              RetentionTable: {
                CustomSql: {
                  DataSourceArn: {
                    'Fn::Join': [
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
                        ':datasource/clickstream_quicksight_data_source_v1_',
                        {
                          Ref: 'RedshiftDBParam',
                        },
                        '_##SCHEMA##',
                      ],
                    ],
                  },
                  Name: 'clickstream_ods_events_view',
                  SqlQuery: 'SELECT * FROM ##SCHEMA##.clickstream_ods_events_view',
                  Columns: [
                    {
                      Name: 'event_id',
                      Type: 'STRING',
                    },
                    {
                      Name: 'event_date_d',
                      Type: 'DATETIME',
                    },
                  ],
                },
              },
            },
          },
        ],
        dataSetReferences: [
          {
            DataSetPlaceholder: 'clickstream_user_dim_view',
            DataSetArn: {
              'Fn::Join': [
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
                  ':dataset/dataset_clickstream_user_dim_view_v1_',
                  {
                    Ref: 'RedshiftDBParam',
                  },
                  '_##SCHEMA##',
                ],
              ],
            },
          },
          {
            DataSetPlaceholder: 'clickstream_ods_flattened_view',
            DataSetArn: {
              'Fn::Join': [
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
                  ':dataset/dataset_clickstream_ods_flattened_view_v1_',
                  {
                    Ref: 'RedshiftDBParam',
                  },
                  '_##SCHEMA##',
                ],
              ],
            },
          },
          {
            DataSetPlaceholder: 'clickstream_session_view',
            DataSetArn: {
              'Fn::Join': [
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
                  ':dataset/dataset_clickstream_session_view_v1_',
                  {
                    Ref: 'RedshiftDBParam',
                  },
                  '_##SCHEMA##',
                ],
              ],
            },
          },
          {
            DataSetPlaceholder: 'clickstream_ods_events_view',
            DataSetArn: {
              'Fn::Join': [
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
                  ':dataset/dataset_clickstream_ods_events_view_v1_',
                  {
                    Ref: 'RedshiftDBParam',
                  },
                  '_##SCHEMA##',
                ],
              ],
            },
          },
        ],
      },
    },
  }, 1);

});