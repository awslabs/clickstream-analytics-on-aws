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

import { EMR_VERSION_PATTERN, OUTPUT_DATA_PROCESSING_EMR_SERVERLESS_APPLICATION_ID_SUFFIX, OUTPUT_DATA_PROCESSING_GLUE_DATABASE_SUFFIX, OUTPUT_DATA_PROCESSING_GLUE_EVENT_TABLE_SUFFIX, TABLE_NAME_EVENT, TABLE_NAME_EVENT_PARAMETER, TABLE_NAME_INGESTION, TABLE_NAME_ITEM, TABLE_NAME_USER, TRANSFORMER_AND_ENRICH_CLASS_NAMES } from '@aws/clickstream-base-lib';
import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { DataPipelineStack } from '../../src/data-pipeline-stack';
import { WIDGETS_ORDER } from '../../src/metrics/settings';
import { validateSubnetsRule } from '../rules';
import { genString, getResourceById } from '../utils';

const c63Str = genString(63);
const c64Str = genString(64);
const c127Str = genString(127);
const c128Str = genString(128);

const anyGlueTable = {
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
};

const app = new App();
const rootStack = new DataPipelineStack(app, 'test-stack');
const nestedStacks = rootStack.nestedStacks;

const rootTemplate = Template.fromStack(rootStack);
const nestedTemplates = nestedStacks.map(stack => Template.fromStack(stack));

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

test('has two nested stacks', () => {
  expect(nestedTemplates).toHaveLength(2);
});

describe('DataPipelineStack parameter test', () => {

  const template = rootTemplate;

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
        'test',
        'a001',
        'a',
        c127Str,
      ];

      for (const v of validValues) {
        expect(v).toMatch(regex);
      }

      const invalidValues = [
        '1a',
        'abc#test',
        'abc.test',
        'ABC',
        'abbA',
        '',
        'ab$',
        '项目',
        'abc-test-01',
        c128Str,
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
        'Abc_test',
        '',
        c127Str,
        `${c127Str},${c127Str}`,
      ];

      for (const v of validValues) {
        expect(v).toMatch(regex);
      }

      const invalidValues = [
        c128Str,
        'abc-test-01',
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
        c63Str,
      ];

      for (const v of validValues) {
        expect(v).toMatch(regex);
      }

      const invalidValues = [
        'ab',
        'ab_test',
        '',
        'ABC',
        c64Str,
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


  test('Check S3Prefix pattern', () => {
    [getParameter(template, 'SourceS3Prefix'),
      getParameter(template, 'SinkS3Prefix'),
      getParameter(template, 'PipelineS3Prefix')].forEach(param => {
      const pattern = param.AllowedPattern;
      const regex = new RegExp(`${pattern}`);
      const validValues = [
        'abc/',
        'abc/test/',
        'ABC/test/',
      ];

      for (const v of validValues) {
        expect(v).toMatch(regex);
      }

      const invalidValues = [
        '/ab',
        'ab_test',
        'ab/test',
      ];
      for (const v of invalidValues) {
        expect(v).not.toMatch(regex);
      }
    });
  });

  test('Should has parameter EmrVersion', () => {
    template.hasParameter('EmrVersion', {
      AllowedPattern: EMR_VERSION_PATTERN,
      Default: 'emr-6.15.0',
      Type: 'String',
    });
  });

  test('Should check EmrVersion pattern', () => {
    [getParameter(template, 'EmrVersion')].forEach(param => {
      const pattern = param.AllowedPattern;
      const regex = new RegExp(`${pattern}`);
      const validValues = [
        'emr-6.10.0',
        'emr-6.9.0',
        'emr-6.12.1',
      ];

      for (const v of validValues) {
        expect(v).toMatch(regex);
      }

      const invalidValues = [
        'emr6.10.0',
        '6.9.0',
        'emr-6.12',
      ];
      for (const v of invalidValues) {
        expect(v).not.toMatch(regex);
      }
    });
  });

  test('Should has parameter EmrApplicationIdleTimeoutMinutes', () => {
    template.hasParameter('EmrApplicationIdleTimeoutMinutes', {
      Default: 5,
      MinValue: 1,
      MaxValue: 10080,
      Type: 'Number',
    });
  });

  test('Should has ParameterGroups and ParameterLabels', () => {
    const cfnInterface =
      template.toJSON().Metadata['AWS::CloudFormation::Interface'];
    expect(cfnInterface.ParameterGroups).toBeDefined();

    const paramCount = Object.keys(cfnInterface.ParameterLabels).length;
    expect(paramCount).toEqual(22);
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


  test('Should has parameter UserKeepMaxDays', () => {
    template.hasParameter('UserKeepMaxDays', {
      Default: 180,
      Type: 'Number',
    });
  });


  test('Should has parameter ItemKeepMaxDays', () => {
    template.hasParameter('ItemKeepMaxDays', {
      Default: 360,
      Type: 'Number',
    });
  });


  test('Should has parameter DataBufferedSeconds', () => {
    template.hasParameter('DataBufferedSeconds', {
      Default: 30,
      MinValue: 5,
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
      Default: TRANSFORMER_AND_ENRICH_CLASS_NAMES,
      Type: 'String',
    });
  });


  test('Should has parameter S3PathPluginJars', () => {
    template.hasParameter('S3PathPluginJars', {
      Type: 'String',
    });
  });

  test('Should check S3PathPluginJars pattern', () => {
    const param = getParameter(template, 'S3PathPluginJars');
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);
    const validValues = [
      's3://abc/abc.jar',
      's3://abc/abc/test.jar',
      's3://abc/abc/test.jar,s3://abc/abc/test2.jar',
      '',
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
      Type: 'String',
    });
  });

  test('Should check S3PathPluginFiles pattern', () => {
    const param = getParameter(template, 'S3PathPluginFiles');
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);
    const validValues = [
      's3://abc/abc.txt',
      's3://abc/abc/test.txt',
      's3://abc/abc/test.txt,s3://abc/abc/test2.txt',
      '',
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


  test('Should has parameter EmrApplicationArchitecture', () => {
    template.hasParameter('EmrApplicationArchitecture', {
      Type: 'String',
      Default: 'Auto',
    });
  });

  test('Should has Parameter AppRegistryApplicationArn', () => {
    template.hasParameter('AppRegistryApplicationArn', {
      Type: 'String',
    });
  });
});


test('Security group count is 1', () => {
  for (const template of nestedTemplates) {
    template.resourceCountIs('AWS::EC2::SecurityGroup', 1);
  }
});

describe('Glue tables have fixed logic id', () => {

  for (const template of nestedTemplates) {

    test('Glue table `ingestion_events` logic id is SourceTable617AB4E1', ()=> {
      const tableResource = getResourceById(template, 'SourceTable617AB4E1');
      expect( tableResource.Properties.TableInput.Name).toEqual('ingestion_events');
    });

    test('Glue table `event` logic id is eventSinkTableA33E3CC9', ()=> {
      const tableResource = getResourceById(template, 'eventSinkTableA33E3CC9');
      expect( tableResource.Properties.TableInput.Name).toEqual('event');
    });

    test('Glue table `event_parameter` logic id is eventparameterSinkTable03A457D7', ()=> {
      const tableResource = getResourceById(template, 'eventparameterSinkTable03A457D7');
      expect( tableResource.Properties.TableInput.Name).toEqual('event_parameter');
    });

    test('Glue table `item` logic id is itemSinkTable7F9A1F7C', ()=> {
      const tableResource = getResourceById(template, 'itemSinkTable7F9A1F7C');
      expect( tableResource.Properties.TableInput.Name).toEqual('item');
    });

    test('Glue table `user` logic id is userSinkTable993D48C3', ()=> {
      const tableResource = getResourceById(template, 'userSinkTable993D48C3');
      expect( tableResource.Properties.TableInput.Name).toEqual('user');
    });
  }
});

describe('DataPipelineStack Glue catalog resources test', () => {

  const template = nestedTemplates[0];

  test('Should has one Glue catalog database', () => {
    template.resourceCountIs('AWS::Glue::Database', 1);
  });

  test('Should has source and sink Glue catalog table', () => {
    template.resourceCountIs('AWS::Glue::Table', 5);


    template.hasResourceProperties('AWS::Glue::Table', {
      DatabaseName: {
        Ref: Match.anyValue(),
      },
      TableInput: {
        Name: TABLE_NAME_INGESTION,
        TableType: 'EXTERNAL_TABLE',
      },
    });

    template.hasResourceProperties('AWS::Glue::Table', {
      DatabaseName: {
        Ref: Match.anyValue(),
      },
      TableInput: {
        Name: TABLE_NAME_EVENT,
        TableType: 'EXTERNAL_TABLE',
      },
    });

    template.hasResourceProperties('AWS::Glue::Table', {
      DatabaseName: {
        Ref: Match.anyValue(),
      },
      TableInput: {
        Name: TABLE_NAME_EVENT_PARAMETER,
        TableType: 'EXTERNAL_TABLE',
      },
    });


    template.hasResourceProperties('AWS::Glue::Table', {
      DatabaseName: {
        Ref: Match.anyValue(),
      },
      TableInput: {
        Name: TABLE_NAME_ITEM,
        TableType: 'EXTERNAL_TABLE',
      },
    });

    template.hasResourceProperties('AWS::Glue::Table', {
      DatabaseName: {
        Ref: Match.anyValue(),
      },
      TableInput: {
        Name: TABLE_NAME_USER,
        TableType: 'EXTERNAL_TABLE',
      },
    });

  });


  test('Should create partition sync lambda role', () => {
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
    const roles = policy.Properties.Roles as any[];
    expect(roles[0].Ref).toEqual(roleKey);

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
              ...[... Array(5)].map(_ => anyGlueTable),
            ],
          },
          {
            Action: [
              's3:GetObject*',
              's3:GetBucket*',
              's3:List*',
              's3:DeleteObject*',
              's3:PutObject',
              's3:PutObjectLegalHold',
              's3:PutObjectRetention',
              's3:PutObjectTagging',
              's3:PutObjectVersionTagging',
              's3:Abort*',
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
                    ':s3:::',
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
                    ':s3:::',
                    {
                      Ref: Match.anyValue(),
                    },
                    '/',
                    {
                      Ref: Match.anyValue(),
                    },
                    '*',
                  ],
                ],
              },
            ],
          },
          {
            Action: [
              's3:GetObject*',
              's3:GetBucket*',
              's3:List*',
              's3:DeleteObject*',
              's3:PutObject',
              's3:PutObjectLegalHold',
              's3:PutObjectRetention',
              's3:PutObjectTagging',
              's3:PutObjectVersionTagging',
              's3:Abort*',
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
                    ':s3:::',
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
                    ':s3:::',
                    {
                      Ref: Match.anyValue(),
                    },
                    '/',
                    {
                      Ref: Match.anyValue(),
                    },
                    '*',
                  ],
                ],
              },
            ],
          },
          {
            Action: [
              'xray:PutTraceSegments',
              'xray:PutTelemetryRecords',
            ],
            Effect: 'Allow',
            Resource: '*',
          },
        ],
      },
    });

  });

  test('Should create partition sync lambda', () => {
    const lambdaRoleKey = findFirstResourceByKeyPrefix(
      template,
      'AWS::IAM::Role',
      'partitionSyncerLambdaRole',
    ).key;

    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          SOURCE_S3_BUCKET_NAME: {
            Ref: Match.anyValue(),
          },
          SOURCE_S3_PREFIX: {
            Ref: Match.anyValue(),
          },
          SINK_S3_BUCKET_NAME: {
            Ref: Match.anyValue(),
          },
          SINK_S3_PREFIX: {
            Ref: Match.anyValue(),
          },
          DATABASE_NAME: {
            Ref: Match.anyValue(),
          },
          SOURCE_TABLE_NAME: {
            Ref: Match.anyValue(),
          },
          PROJECT_ID: {
            Ref: Match.anyValue(),
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
      ReservedConcurrentExecutions: Match.absent(),
    });
  });


  test('Should create partition sync scheduler', () => {
    template.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: 'cron(0 0 * * ? *)',
      State: 'ENABLED',
    });
  });

  test('Lambda has POWERTOOLS settings', () => {
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

describe('Data Processing job submitter', () => {
  const template = nestedTemplates[0];

  test('Has lambda and emr-serverless IAM role', () => {
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

  test('Emr SparkJob Submitter Function', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      VpcConfig: {
        SubnetIds: {
          'Fn::Split': [
            ',',
            {
              Ref: Match.anyValue(),
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
          DATA_BUFFERED_SECONDS: RefAnyValue,
          SCHEDULE_EXPRESSION: RefAnyValue,
          TRANSFORMER_AND_ENRICH_CLASS_NAMES: Match.anyValue(),
          S3_PATH_PLUGIN_JARS: Match.anyValue(),
          S3_PATH_PLUGIN_FILES: Match.anyValue(),
          S3_PATH_ENTRY_POINT_JAR: Match.anyValue(),
          OUTPUT_FORMAT: Match.anyValue(),
        },
      },
    });
  });

  test('Has ScheduleExpression rule', () => {
    template.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: {
        Ref: Match.anyValue(),
      },
      State: 'ENABLED',
    });
  });

  test('The role of EMR submitter function has lambda:ListTags permission', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: 'lambda:ListTags',
            Effect: 'Allow',
            Resource: {
              'Fn::GetAtt': [
                'EmrSparkJobSubmitterFunctionBEE9C140',
                'Arn',
              ],
            },
          },
        ],
      },
      Roles: [
        {
          Ref: 'EmrSparkJobSubmitterLambdaRole8B2F7827',
        },
      ],
    });
    template.hasResourceProperties('AWS::Lambda::Function', {
      Role: {
        'Fn::GetAtt': [
          'EmrSparkJobSubmitterLambdaRole8B2F7827',
          'Arn',
        ],
      },
      Environment: {
        Variables: {
          EMR_SERVERLESS_APPLICATION_ID: {
            'Fn::GetAtt': [
              Match.anyValue(),
              'ApplicationId',
            ],
          },
        },
      },
    });
  });

  test('IAM::Policy for EMR job role has specified resource', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          Match.anyValue(),
          Match.anyValue(),
          {
            Action: [
              'emr-serverless:StartApplication',
              'emr-serverless:GetApplication',
              'emr-serverless:StartJobRun',
              'emr-serverless:TagResource',
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
                  ':emr-serverless:',
                  {
                    Ref: 'AWS::Region',
                  },
                  ':',
                  {
                    Ref: 'AWS::AccountId',
                  },
                  ':/applications/',
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
            Action: [
              'glue:GetDatabase',
              'glue:CreateDatabase',
              'glue:GetDataBases',
              'glue:CreateTable',
              'glue:GetTable',
              'glue:UpdateTable',
              'glue:DeleteTable',
              'glue:GetTables',
              'glue:GetPartition',
              'glue:GetPartitions',
              'glue:CreatePartition',
              'glue:BatchCreatePartition',
              'glue:GetUserDefinedFunctions',
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
                    ':database/default',
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
                    '/etl*',
                  ],
                ],
              },
              ...[... Array(5)].map(_ => anyGlueTable),

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
          {
            Action: [
              's3:GetObject*',
              's3:GetBucket*',
              's3:List*',
              's3:DeleteObject*',
              's3:PutObject',
              's3:PutObjectLegalHold',
              's3:PutObjectRetention',
              's3:PutObjectTagging',
              's3:PutObjectVersionTagging',
              's3:Abort*',
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
                    ':s3:::',
                    Match.anyValue(),
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
                    ':s3:::',
                    Match.anyValue(),
                    '/',
                    Match.anyValue(),
                    Match.anyValue(),
                    '/rules/*',
                  ],
                ],
              },
            ],
          },

          {
            Action: [
              'xray:PutTraceSegments',
              'xray:PutTelemetryRecords',
            ],
            Effect: 'Allow',
            Resource: '*',
          },
        ],
      },
    });
  });


  test('IAM::Policy for copy asset lambda role has specified resource', () => {
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
                            Ref: Match.anyValue(),
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

test('Root stack has two nested stacks', () => {
  rootTemplate.resourceCountIs('AWS::CloudFormation::Stack', 2);
});


test('All nested stacks has Custom::CDKBucketDeployment', () => {
  nestedTemplates.forEach(template => {
    template.resourceCountIs('Custom::CDKBucketDeployment', 1);
  });
});


test('Plugins nested stack has CopyAssetsCustomResource Lambda', () => {
  const template = nestedTemplates[0];
  template.hasResourceProperties('AWS::Lambda::Function', {
    Environment: {
      Variables: {
        STACK_ID: Match.anyValue(),
        PROJECT_ID: Match.anyValue(),
        PIPELINE_S3_BUCKET_NAME: Match.anyValue(),
        PIPELINE_S3_PREFIX: Match.anyValue(),
      },
    },
  });
});

test('Plugins nested stack has CopyAssetsCustomResource', () => {
  const template = nestedTemplates[0];
  template.hasResourceProperties('AWS::CloudFormation::CustomResource', {
    s3PathPluginJars: RefAnyValue,
    s3PathPluginFiles: RefAnyValue,
  });
});

test('Nested stack has CreateEMRServerlessApplicationCustomResource', () => {
  const template = nestedTemplates[0];
  template.hasResourceProperties('AWS::CloudFormation::CustomResource', {
    projectId: RefAnyValue,
    name: {
      'Fn::Join': [
        '',
        [
          'Clickstream-',
          RefAnyValue,
        ],
      ],
    },
    version: RefAnyValue,
    securityGroupId: {
      'Fn::GetAtt': [
        Match.anyValue(),
        'GroupId',
      ],
    },
    subnetIds: {
      'Fn::Join': [
        ',',
        {
          'Fn::Split': [
            ',',
            RefAnyValue,
          ],
        },
      ],
    },
    idleTimeoutMinutes: RefAnyValue,
    pipelineS3BucketName: RefAnyValue,
    pipelineS3Prefix: RefAnyValue,
  });
});

test('CreateEMRServerlessApplicationLambdaRole policy is set correctly', () => {
  const template = nestedTemplates[0];
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
          Action: [
            'emr-serverless:CreateApplication',
            'emr-serverless:DeleteApplication',
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
                ':emr-serverless:',
                {
                  Ref: 'AWS::Region',
                },
                ':',
                {
                  Ref: 'AWS::AccountId',
                },
                ':/*',
              ],
            ],
          },
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
        {
          Action: [
            's3:GetObject*',
            's3:GetBucket*',
            's3:List*',
            's3:DeleteObject*',
            's3:PutObject',
            's3:PutObjectLegalHold',
            's3:PutObjectRetention',
            's3:PutObjectTagging',
            's3:PutObjectVersionTagging',
            's3:Abort*',
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
                  ':s3:::',
                  RefAnyValue,
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
                  ':s3:::',
                  RefAnyValue,
                  '/*',
                ],
              ],
            },
          ],
        },
      ],
      Version: '2012-10-17',
    },

  });
});

test('AWS::Events::Rule for EMR Serverless Job Run State Change', () => {
  const template = nestedTemplates[0];
  template.hasResourceProperties('AWS::Events::Rule', {
    EventPattern: {
      'source': [
        'aws.emr-serverless',
      ],
      'detail-type': [
        'EMR Serverless Job Run State Change',
      ],
      'detail': {
        applicationId: [{
          'Fn::GetAtt': [
            Match.anyValue(),
            'ApplicationId',
          ],
        }],
        state: ['SUCCESS', 'FAILED'],
      },
    },
    State: 'ENABLED',
    Targets: [
      {
        Arn: {
          'Fn::GetAtt': [
            Match.anyValue(),
            'Arn',
          ],
        },
        DeadLetterConfig: {
          Arn: {
            'Fn::GetAtt': [
              Match.anyValue(),
              'Arn',
            ],
          },
        },
        Id: Match.anyValue(),
        RetryPolicy: {
          MaximumEventAgeInSeconds: 86400,
          MaximumRetryAttempts: 180,
        },
      },
    ],
  });
});


test('Should set metrics widgets', () => {
  const template = nestedTemplates[0];
  template.hasResourceProperties('AWS::CloudFormation::CustomResource', {
    metricsWidgetsProps: {
      order: WIDGETS_ORDER.dataProcessing,
      projectId: Match.anyValue(),
      name: Match.anyValue(),
      description: {
        markdown: Match.anyValue(),
      },
      widgets: Match.anyValue(),
    },
  });
});

test ('Should has alarm: data Processing Job Failed', ()=> {
  const template = nestedTemplates[0];
  template.hasResourceProperties('AWS::CloudWatch::Alarm', {
    ComparisonOperator: 'GreaterThanThreshold',
    EvaluationPeriods: 1,
    AlarmDescription: {
      'Fn::Join': Match.anyValue(),
    },
    AlarmName: {
      'Fn::Join': Match.anyValue(),
    },
    Dimensions: [
      {
        Name: 'ApplicationId',
        Value: {
          'Fn::GetAtt': [
            Match.anyValue(),
            'ApplicationId',
          ],
        },
      },
    ],
    MetricName: 'FailedJobs',
    Namespace: 'AWS/EMRServerless',
    Period: {
      'Fn::GetAtt': [
        Match.anyValue(),
        'intervalSeconds',
      ],
    },
    Statistic: 'Sum',
    Threshold: 1,
  });
});


test ('Should has alarm: No data loaded in past 24 hours', ()=> {
  const template = nestedTemplates[0];
  template.hasResourceProperties('AWS::CloudWatch::Alarm', {
    ComparisonOperator: 'LessThanOrEqualToThreshold',
    EvaluationPeriods: 1,
    AlarmDescription: {
      'Fn::Join': Match.anyValue(),
    },
    AlarmName: {
      'Fn::Join': Match.anyValue(),
    },
    Dimensions: [
      {
        Name: 'ApplicationId',
        Value: {
          'Fn::GetAtt': [
            Match.anyValue(),
            'ApplicationId',
          ],
        },
      },
      {
        Name: 'service',
        Value: 'EMR-Serverless',
      },
    ],
    MetricName: 'Data Processing sink count',
    Namespace: 'Clickstream/DataPipeline',
    Period: 86400,
    Statistic: 'Sum',
    Threshold: 0,
    TreatMissingData: 'notBreaching',
  });
});


test('Root template has Cfn Outputs for Glue database and table', () => {

  rootTemplate.hasOutput(`WithPlugins${OUTPUT_DATA_PROCESSING_GLUE_DATABASE_SUFFIX}`, {
    Description: 'Glue Database',
    Value: {
      'Fn::GetAtt': [
        Match.anyValue(),
        Match.anyValue(),
      ],
    },
    Condition: 'withCustomPluginsCondition',
  });
  rootTemplate.hasOutput(`WithPlugins${OUTPUT_DATA_PROCESSING_GLUE_EVENT_TABLE_SUFFIX}`, {
    Description: 'Glue Event Table',
    Value: {
      'Fn::GetAtt': [
        Match.anyValue(),
        Match.anyValue(),
      ],
    },
    Condition: 'withCustomPluginsCondition',
  });

  rootTemplate.hasOutput(`WithPlugins${OUTPUT_DATA_PROCESSING_EMR_SERVERLESS_APPLICATION_ID_SUFFIX}`, {
    Description: 'EMR Serverless Application Id',
    Value: Match.anyValue(),
    Condition: 'withCustomPluginsCondition',
  });

  rootTemplate.hasOutput(`WithoutPlugins${OUTPUT_DATA_PROCESSING_GLUE_DATABASE_SUFFIX}`, {
    Description: 'Glue Database',
    Value: {
      'Fn::GetAtt': [
        Match.anyValue(),
        Match.anyValue(),
      ],
    },
    Condition: 'withoutCustomPluginsCondition',
  });

  rootTemplate.hasOutput(`WithoutPlugins${OUTPUT_DATA_PROCESSING_GLUE_EVENT_TABLE_SUFFIX}`, {
    Description: 'Glue Event Table',
    Value: {
      'Fn::GetAtt': [
        Match.anyValue(),
        Match.anyValue(),
      ],
    },
    Condition: 'withoutCustomPluginsCondition',
  });

  rootTemplate.hasOutput(`WithoutPlugins${OUTPUT_DATA_PROCESSING_EMR_SERVERLESS_APPLICATION_ID_SUFFIX}`, {
    Description: 'EMR Serverless Application Id',
    Value: Match.anyValue(),
    Condition: 'withoutCustomPluginsCondition',
  });

});

test('Should has ApplicationArnCondition', () => {
  rootTemplate.hasCondition('ApplicationArnCondition', {
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
  rootTemplate.hasResourceProperties('AWS::ServiceCatalogAppRegistry::ResourceAssociation', {
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
