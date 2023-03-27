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
import { DataPipelineStack } from '../../src/data-pipeline-stack';
import { validateSubnetsRule } from '../rules';

const RefAnyValue = {
  Ref: Match.anyValue(),
};

function findFirstResourceByKeyPrefix(
  template: Template,
  type: string,
  keyPrefix: string,
) {
  const allResources = template.toJSON().Resources;
  for (const key of Object.keys(allResources)) {
    const resource = allResources[key];
    if (resource.Type == type && key.startsWith(keyPrefix)) {
      return {
        resource,
        key,
      };
    }
  }
  return {
    resource: undefined,
    key: undefined,
  };
}

function getParameter(template: Template, param: string) {
  return template.toJSON().Parameters[param];
}

describe('DataPipelineStack parameter test', () => {
  const app = new App();
  const stack = new DataPipelineStack(app, 'test-stack');
  const template = Template.fromStack(stack);

  test('Should has Parameter VpcId', () => {
    template.hasParameter('VpcId', {
      Type: 'AWS::EC2::VPC::Id',
    });
  });

  test('Should has Parameter PrivateSubnetIds', () => {
    template.hasParameter('PrivateSubnetIds', {
      Type: 'String',
    });
  });

  test('Should check PrivateSubnetIds pattern', () => {
    const param = getParameter(template, 'PrivateSubnetIds');
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);
    const validValues = [
      'subnet-a1234,subnet-b1234',
      'subnet-fffff1,subnet-fffff2,subnet-fffff3',
    ];

    for (const v of validValues) {
      expect(v).toMatch(regex);
    }

    const invalidValues = [
      'subnet-a1234',
      'net-a1234,net-b1234',
      'subnet-g1234,subnet-g1234',
      'subnet-a1234, subnet-b1234',
    ];
    for (const v of invalidValues) {
      expect(v).not.toMatch(regex);
    }
  });

  test('Has Rule to validate subnets in VPC', () => {
    validateSubnetsRule(template);
  });

  test('Should has parameter ProjectId', () => {
    template.hasParameter('ProjectId', {
      Type: 'String',
    });
  });


  test('Should check ProjectId pattern', () => {
    [getParameter(template, 'ProjectId')].forEach(param => {
      const pattern = param.AllowedPattern;
      const regex = new RegExp(`${pattern}`);
      const validValues = [
        'abc001',
        'abc_test',
      ];

      for (const v of validValues) {
        expect(v).toMatch(regex);
      }

      const invalidValues = [
        'toooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooloooooooooooooooooooooooooooooooooooooooooooooooog',
        'abc.test',
        'abc-test-01',
        'ABC',
        '',
        'ab$',
      ];
      for (const v of invalidValues) {
        expect(v).not.toMatch(regex);
      }
    });
  });

  test('Should has parameter AppIds', () => {
    template.hasParameter('AppIds', {
      Type: 'String',
    });
  });


  test('Should check AppIds pattern', () => {
    [getParameter(template, 'AppIds')].forEach(param => {
      const pattern = param.AllowedPattern;
      const regex = new RegExp(`${pattern}`);
      const validValues = [
        'abc001,abc002,abc003',
        'abc-test-01',
        'Abc_test',
        '',
      ];

      for (const v of validValues) {
        expect(v).toMatch(regex);
      }

      const invalidValues = [
        'abc.test',
        'abc,',
        ',abc',
        'a#',
      ];
      for (const v of invalidValues) {
        expect(v).not.toMatch(regex);
      }
    });
  });


  test('Should has parameter SourceS3Bucket', () => {
    template.hasParameter('SourceS3Bucket', {
      Type: 'String',
    });
  });

  test('Should has parameter SourceS3Prefix', () => {
    template.hasParameter('SourceS3Prefix', {
      Type: 'String',
    });
  });

  test('Should has parameter SinkS3Bucket', () => {
    template.hasParameter('SinkS3Bucket', {
      Type: 'String',
    });
  });


  test('Should check SourceS3Bucket and SinkS3Bucket pattern', () => {
    [getParameter(template, 'SourceS3Bucket'),
      getParameter(template, 'SinkS3Bucket')].forEach(param => {
      const pattern = param.AllowedPattern;
      const regex = new RegExp(`${pattern}`);
      const validValues = [
        'abc',
        'abc-test',
        'abc.test',
      ];

      for (const v of validValues) {
        expect(v).toMatch(regex);
      }

      const invalidValues = [
        'ab',
        'ab_test',
        '',
        'ABC',
        'tooooooooooooooooooooooooooooooooooooooooloooooooooooooooooooong',
      ];
      for (const v of invalidValues) {
        expect(v).not.toMatch(regex);
      }
    });
  });

  test('Should has parameter SinkS3Prefix', () => {
    template.hasParameter('SinkS3Prefix', {
      Type: 'String',
    });
  });

  test('Should has ParameterGroups and ParameterLabels', () => {
    const cfnInterface =
      template.toJSON().Metadata['AWS::CloudFormation::Interface'];
    expect(cfnInterface.ParameterGroups).toBeDefined();

    const paramCount = Object.keys(cfnInterface.ParameterLabels).length;
    expect(paramCount).toEqual(16);
  });


  test('Should has parameter PipelineS3Bucket', () => {
    template.hasParameter('PipelineS3Bucket', {
      Type: 'String',
    });
  });


  test('Should has parameter PipelineS3Prefix', () => {
    template.hasParameter('PipelineS3Prefix', {
      Type: 'String',
    });
  });


  test('Should has parameter DataFreshnessInHour', () => {
    template.hasParameter('DataFreshnessInHour', {
      Default: 72,
      Type: 'Number',
    });
  });

  test('Should has parameter ScheduleExpression', () => {
    template.hasParameter('ScheduleExpression', {
      Type: 'String',
    });
  });

  test('Should check ScheduleExpression pattern', () => {
    const param = getParameter(template, 'ScheduleExpression');
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);
    const validValues = [
      'rate(1 hour)',
      'rate(2 hours)',
      'rate(1 day)',
      'rate(2 days)',
      'rate( 2 days )',
      'cron(0 1 * * ? *)',
      'cron(15,45 * * * ? *)',
    ];

    for (const v of validValues) {
      expect(v).toMatch(regex);
    }

    const invalidValues = [
      'ab',
      '1',
      'cron',
      '2 hours',
    ];
    for (const v of invalidValues) {
      expect(v).not.toMatch(regex);
    }
  });

  test('Should has parameter TransformerAndEnrichClassNames', () => {
    template.hasParameter('TransformerAndEnrichClassNames', {
      Type: 'CommaDelimitedList',
    });
  });


  test('Should has parameter S3PathPluginJars', () => {
    template.hasParameter('S3PathPluginJars', {
      Type: 'CommaDelimitedList',
    });
  });

  test('Should check S3PathPluginJars pattern', () => {
    const param = getParameter(template, 'S3PathPluginJars');
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);
    const validValues = [
      's3://abc/abc.jar',
      's3://abc/abc/test.jar',
    ];

    for (const v of validValues) {
      expect(v).toMatch(regex);
    }

    const invalidValues = [
      'abc/abc.jar',
      's3://abc/abc.txt',
    ];
    for (const v of invalidValues) {
      expect(v).not.toMatch(regex);
    }
  });

  test('Should has parameter S3PathPluginFiles', () => {
    template.hasParameter('S3PathPluginFiles', {
      Type: 'CommaDelimitedList',
    });
  });

  test('Should check  S3PathPluginFiles pattern', () => {
    const param = getParameter(template, 'S3PathPluginFiles');
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);
    const validValues = [
      's3://abc/abc.txt',
      's3://abc/abc/test.txt',
    ];

    for (const v of validValues) {
      expect(v).toMatch(regex);
    }

    const invalidValues = [
      'abc/abc.txt',
      's3://abc_abc/abc/test.txt',
      's3://Abc/abc/test.txt',
    ];
    for (const v of invalidValues) {
      expect(v).not.toMatch(regex);
    }
  });

});

describe('DataPipelineStack Glue catalog resources test', () => {
  const app = new App();
  const stack = new DataPipelineStack(app, 'test-stack');
  const template = Template.fromStack(stack);

  test('Should has one Glue catalog database', () => {
    template.resourceCountIs('AWS::Glue::Database', 1);
  });

  test('Should has source and sink Glue catalog table', () => {
    template.resourceCountIs('AWS::Glue::Table', 2);

    template.hasResourceProperties('AWS::Glue::Table', {
      DatabaseName: {
        Ref: Match.anyValue(),
      },
      TableInput: {
        Name: {
          'Fn::Join': ['_', [{ Ref: 'ProjectId' }, 'source']],
        },
        TableType: 'EXTERNAL_TABLE',
      },
    });

    template.hasResourceProperties('AWS::Glue::Table', {
      DatabaseName: {
        Ref: Match.anyValue(),
      },
      TableInput: {
        Name: {
          'Fn::Join': ['_', [{ Ref: 'ProjectId' }, 'sink']],
        },
        TableType: 'EXTERNAL_TABLE',
      },
    });
  });


  test('Should create partition syncer lambda role', () => {
    const roleKey = findFirstResourceByKeyPrefix(
      template,
      'AWS::IAM::Role',
      'partitionSyncerLambdaRole',
    ).key;
    const policy = findFirstResourceByKeyPrefix(
      template,
      'AWS::IAM::Policy',
      'partitionSyncerLambdaRoleDefaultPolicy',
    ).resource;

    const statement = policy.Properties.PolicyDocument.Statement as any[];
    expect(statement[2].Action).toEqual('glue:BatchCreatePartition');

    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'logs:CreateLogStream',
              'logs:PutLogEvents',
              'logs:CreateLogGroup',
            ],
            Effect: 'Allow',
            Resource: '*',
          },
          {
            Action: [
              'ec2:CreateNetworkInterface',
              'ec2:DescribeNetworkInterfaces',
              'ec2:DeleteNetworkInterface',
              'ec2:AssignPrivateIpAddresses',
              'ec2:UnassignPrivateIpAddresses',
            ],
            Effect: 'Allow',
            Resource: '*',
          },
          {
            Action: 'glue:BatchCreatePartition',
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
                    ':glue:',
                    {
                      Ref: 'AWS::Region',
                    },
                    ':',
                    {
                      Ref: 'AWS::AccountId',
                    },
                    ':catalog',
                  ],
                ],
              },
              {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    {
                      Ref: 'AWS::Partition',
                    },
                    ':glue:',
                    {
                      Ref: 'AWS::Region',
                    },
                    ':',
                    {
                      Ref: 'AWS::AccountId',
                    },
                    ':database/',
                    {
                      Ref: Match.anyValue(),
                    },
                  ],
                ],
              },
              {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    {
                      Ref: 'AWS::Partition',
                    },
                    ':glue:',
                    {
                      Ref: 'AWS::Region',
                    },
                    ':',
                    {
                      Ref: 'AWS::AccountId',
                    },
                    ':table/',
                    {
                      Ref: Match.anyValue(),
                    },
                    '/',
                    {
                      Ref: Match.anyValue(),
                    },
                  ],
                ],
              },
              {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    {
                      Ref: 'AWS::Partition',
                    },
                    ':glue:',
                    {
                      Ref: 'AWS::Region',
                    },
                    ':',
                    {
                      Ref: 'AWS::AccountId',
                    },
                    ':table/',
                    {
                      Ref: Match.anyValue(),
                    },
                    '/',
                    {
                      Ref: Match.anyValue(),
                    },
                  ],
                ],
              },
            ],
          },
          {
            Action: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
            Effect: 'Allow',
            Resource: '*',
          },
        ],
      },
    });

    const roles = policy.Properties.Roles as any[];
    expect(roles[0].Ref).toEqual(roleKey);
  });

  test('Should create partition syncer lambda', () => {
    const lambdaRoleKey = findFirstResourceByKeyPrefix(
      template,
      'AWS::IAM::Role',
      'partitionSyncerLambdaRole',
    ).key;

    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          SOURCE_S3_BUCKET_NAME: {
            Ref: 'SourceS3Bucket',
          },
          SOURCE_S3_PREFIX: {
            Ref: 'SourceS3Prefix',
          },
          SINK_S3_BUCKET_NAME: {
            Ref: 'SinkS3Bucket',
          },
          SINK_S3_PREFIX: {
            Ref: 'SinkS3Prefix',
          },
          DATABASE_NAME: {
            Ref: Match.anyValue(),
          },
          SOURCE_TABLE_NAME: {
            Ref: Match.anyValue(),
          },
          SINK_TABLE_NAME: {
            Ref: Match.anyValue(),
          },
          PROJECT_ID: {
            Ref: 'ProjectId',
          },
          APP_IDS: {
            Ref: Match.anyValue(),
          },
          LOG_LEVEL: 'WARN',
        },
      },
      Role: {
        'Fn::GetAtt': [lambdaRoleKey, 'Arn'],
      },
    });
  });


  test('Should create partition syncer scheduler', () => {
    template.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: 'cron(0 0 * * ? *)',
      State: 'ENABLED',
    });
  });

  test('Lambda has POWERTOOLS settings', ()=> {
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

describe ('ETL job submitter', () => {

  const app = new App();
  const stack = new DataPipelineStack(app, 'test-stack');
  const template = Template.fromStack(stack);

  test ('Has lambda and emr-serverless IAM role', ()=> {
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: {
              Service: 'lambda.amazonaws.com',
            },
          },
          {
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: {
              Service: 'emr-serverless.amazonaws.com',
            },
          },
        ],
      },
    });
  });

  test('Emr SparkJob Submitter Function', () =>{
    template.hasResourceProperties('AWS::Lambda::Function', {
      VpcConfig: {
        SubnetIds: {
          'Fn::Split': [
            ',',
            {
              Ref: 'PrivateSubnetIds',
            },
          ],
        },
        SecurityGroupIds: Match.anyValue(),
      },
      Environment: {
        Variables: {
          EMR_SERVERLESS_APPLICATION_ID: Match.anyValue(),
          STACK_ID: Match.anyValue(),
          PROJECT_ID: Match.anyValue(),
          APP_IDS: Match.anyValue(),
          ROLE_ARN: Match.anyValue(),
          GLUE_CATALOG_ID: Match.anyValue(),
          GLUE_DB: Match.anyValue(),
          SOURCE_TABLE_NAME: Match.anyValue(),
          SOURCE_S3_BUCKET_NAME: RefAnyValue,
          SOURCE_S3_PREFIX: RefAnyValue,
          SINK_S3_BUCKET_NAME: RefAnyValue,
          SINK_S3_PREFIX: RefAnyValue,
          PIPELINE_S3_BUCKET_NAME: RefAnyValue,
          PIPELINE_S3_PREFIX: RefAnyValue,
          DATA_FRESHNESS_IN_HOUR: RefAnyValue,
          SCHEDULE_EXPRESSION: RefAnyValue,
          TRANSFORMER_AND_ENRICH_CLASS_NAMES: Match.anyValue(),
          S3_PATH_PLUGIN_JARS: {
            'Fn::GetAtt': [
              'CopyAssetsCustomResource',
              's3PathPluginJars',
            ],
          },
          S3_PATH_PLUGIN_FILES: {
            'Fn::GetAtt': [
              'CopyAssetsCustomResource',
              's3PathPluginFiles',
            ],
          },
          S3_PATH_ENTRY_POINT_JAR: {
            'Fn::GetAtt': [
              'CopyAssetsCustomResource',
              'entryPointJar',
            ],
          },
        },
      },
    });
  });

  test('Has ScheduleExpression rule', ()=> {
    template.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: {
        Ref: 'ScheduleExpression',
      },
      State: 'ENABLED',
    });
  });

  test('Has EMR EMRServerless Application', ()=> {
    template.hasResourceProperties('AWS::EMRServerless::Application', {
      Name: Match.anyValue(),
      ReleaseLabel: 'emr-6.9.0',
      Type: 'SPARK',
      AutoStartConfiguration: {
        Enabled: true,
      },
      AutoStopConfiguration: {
        Enabled: true,
        IdleTimeoutMinutes: 5,
      },
      NetworkConfiguration: Match.anyValue(),
    });
  });


  test('IAM::Policy for EMR job role has specified resource', ()=> {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          Match.anyValue(),
          Match.anyValue(),
          {
            Action:
              'emr-serverless:StartApplication',
            Effect: 'Allow',
            Resource: {
              'Fn::Join': [
                '',
                [
                  'arn:',
                  {
                    Ref: 'AWS::Partition',
                  },
                  ':emr-serverless:',
                  {
                    Ref: 'AWS::Region',
                  },
                  ':',
                  {
                    Ref: 'AWS::AccountId',
                  },
                  ':applications/',
                  {
                    'Fn::GetAtt': [
                      Match.anyValue(),
                      'ApplicationId',
                    ],
                  },
                ],
              ],
            },
          },
          {
            Action:
                'emr-serverless:StartJobRun',

            Effect: 'Allow',
            Resource: {
              'Fn::Join': [
                '',
                [
                  'arn:',
                  {
                    Ref: 'AWS::Partition',
                  },
                  ':emr-serverless:',
                  {
                    Ref: 'AWS::Region',
                  },
                  ':',
                  {
                    Ref: 'AWS::AccountId',
                  },
                  ':*',
                ],
              ],
            },
          },
          {
            Action: [
              'glue:GetDatabase',
              'glue:GetTable',
              'glue:GetPartitions',
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
                    ':glue:',
                    {
                      Ref: 'AWS::Region',
                    },
                    ':',
                    {
                      Ref: 'AWS::AccountId',
                    },
                    ':catalog',
                  ],
                ],
              },
              {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    {
                      Ref: 'AWS::Partition',
                    },
                    ':glue:',
                    {
                      Ref: 'AWS::Region',
                    },
                    ':',
                    {
                      Ref: 'AWS::AccountId',
                    },
                    ':database/',
                    {
                      Ref: Match.anyValue(),
                    },
                  ],
                ],
              },
              {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    {
                      Ref: 'AWS::Partition',
                    },
                    ':glue:',
                    {
                      Ref: 'AWS::Region',
                    },
                    ':',
                    {
                      Ref: 'AWS::AccountId',
                    },
                    ':table/',
                    {
                      Ref: Match.anyValue(),
                    },
                    '/',
                    {
                      Ref: Match.anyValue(),
                    },
                  ],
                ],
              },
              {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    {
                      Ref: 'AWS::Partition',
                    },
                    ':glue:',
                    {
                      Ref: 'AWS::Region',
                    },
                    ':',
                    {
                      Ref: 'AWS::AccountId',
                    },
                    ':table/',
                    {
                      Ref: Match.anyValue(),
                    },
                    '/',
                    {
                      Ref: Match.anyValue(),
                    },
                  ],
                ],
              },
            ],
          },
          {
            Action: 'iam:CreateServiceLinkedRole',
            Effect: 'Allow',
            Resource: {
              'Fn::Join': [
                '',
                [
                  'arn:',
                  {
                    Ref: 'AWS::Partition',
                  },
                  ':iam::',
                  {
                    Ref: 'AWS::AccountId',
                  },
                  ':role/aws-service-role/ops.emr-serverless.amazonaws.com/AWSServiceRoleForAmazonEMRServerless',
                ],
              ],
            },
          },
          Match.anyValue(),
          Match.anyValue(),
          Match.anyValue(),
          Match.anyValue(),
        ],
      },
    });
  });


  test('IAM::Policy for copy asset lambda role has specified resource', ()=> {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          Match.anyValue(),
          {
            Action: 's3:GetObject',
            Effect: 'Allow',
            Resource: {
              'Fn::Join': [
                '',
                [
                  'arn:',
                  {
                    Ref: 'AWS::Partition',
                  },
                  ':s3:::',
                  {
                    'Fn::Select': [
                      2,
                      {
                        'Fn::Split': [
                          '/',
                          {
                            Ref: 'EntryPointJar',
                          },
                        ],
                      },
                    ],
                  },
                  '/*',
                ],
              ],
            },
          },
          Match.anyValue(),
        ],
      },
    });
  });


});
