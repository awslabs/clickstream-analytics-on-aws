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
      Type: 'CommaDelimitedList',
    });
  });


  test('Should check AppIds pattern', () => {
    [getParameter(template, 'AppIds')].forEach(param => {
      const pattern = param.AllowedPattern;
      const regex = new RegExp(`${pattern}`);
      const validValues = [
        'abc001',
        'abc-test-01',
        'Abc_test',
      ];

      for (const v of validValues) {
        expect(v).toMatch(regex);
      }

      const invalidValues = [
        'abc.test',
        'a#',
        '',
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
    expect(paramCount).toEqual(8);
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
            'Fn::Join': Match.anyValue(),
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
