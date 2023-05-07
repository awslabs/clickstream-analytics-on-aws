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

  test('Should has Parameter quickSightVpcConnectionParam', () => {
    template.hasParameter('QuickSightVpcConnectionParam', {
      Type: 'String',
    });
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
        Match.stringLikeRegexp('QuicksightDatasourceCustomResourceProviderframeworkonEvent[A-Z0-9a-z]+'),
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
            Ref: 'QuickSightVpcConnectionParam',
          },
        },
        dataSets: [
          {
            id: {
              'Fn::Join': [
                '',
                [
                  'dataset_clickstream_daily_active_user_view_v1_',
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
              DailyActiveUserTable: {
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
                  Name: 'clickstream_daily_active_user_view',
                  SqlQuery: 'SELECT * FROM ##SCHEMA##.clickstream_daily_active_user_view',
                  Columns: [
                    {
                      Name: 'user_type',
                      Type: 'STRING',
                    },
                    {
                      Name: 'mobile_brand',
                      Type: 'STRING',
                    },
                    {
                      Name: 'country',
                      Type: 'STRING',
                    },
                    {
                      Name: 'event_create_day',
                      Type: 'DATETIME',
                    },
                  ],
                },
              },
            },
            logicalTableMap: {
              DailyActiveUserLogicTable: {
                Alias: 'DailyActiveUserTableAlias',
                Source: {
                  PhysicalTableId: 'DailyActiveUserTable',
                },
                DataTransforms: [
                  {
                    TagColumnOperation: {
                      ColumnName: 'country',
                      Tags: [
                        {
                          ColumnGeographicRole: 'COUNTRY',
                        },
                      ],
                    },
                  },
                ],
              },
            },
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
                      Name: 'event_name',
                      Type: 'STRING',
                    },
                    {
                      Name: 'event_date',
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
                      Name: 'avg_session_duration_min',
                      Type: 'DECIMAL',
                    },
                    {
                      Name: 'engaged_rate_percentage',
                      Type: 'DECIMAL',
                    },
                    {
                      Name: 'engaged_session_num__per_user',
                      Type: 'DECIMAL',
                    },
                    {
                      Name: 'event_create_day',
                      Type: 'DATETIME',
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
                  'dataset_clickstream_retention_view_v1_',
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
                  Name: 'clickstream_retention_view',
                  SqlQuery: 'SELECT * FROM ##SCHEMA##.clickstream_retention_view',
                  Columns: [
                    {
                      Name: 'day_cohort',
                      Type: 'DATETIME',
                    },
                    {
                      Name: 'day_3',
                      Type: 'INTEGER',
                    },
                    {
                      Name: 'day_1',
                      Type: 'INTEGER',
                    },
                    {
                      Name: 'day_2',
                      Type: 'INTEGER',
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
                  'dataset_clickstream_dau_wau_view_v1_',
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
                  'Dau Wau Dataset ',
                  {
                    Ref: 'RedshiftDBParam',
                  },
                  '_##SCHEMA##',
                ],
              ],
            },
            importMode: 'DIRECT_QUERY',
            physicalTableMap: {
              DauWauTable: {
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
                  Name: 'clickstream_dau_wau_view',
                  SqlQuery: 'SELECT * FROM ##SCHEMA##.clickstream_dau_wau_view',
                  Columns: [
                    {
                      Name: 'today_active_user_num',
                      Type: 'INTEGER',
                    },
                    {
                      Name: 'active_user_numer_last_7_days',
                      Type: 'INTEGER',
                    },
                    {
                      Name: 'event_create_day',
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
            DataSetPlaceholder: 'clickstream_daily_active_user_view',
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
                  ':dataset/dataset_clickstream_daily_active_user_view_v1_',
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
            DataSetPlaceholder: 'clickstream_dau_wau_view',
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
                  ':dataset/dataset_clickstream_dau_wau_view_v1_',
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
            DataSetPlaceholder: 'clickstream_retention_view',
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
                  ':dataset/dataset_clickstream_retention_view_v1_',
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