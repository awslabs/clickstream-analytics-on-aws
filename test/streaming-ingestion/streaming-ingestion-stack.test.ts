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
import { OUTPUT_STREAMING_INGESTION_FLINK_APP_ARN } from '../../src/common/constant';
import { REDSHIFT_MODE } from '../../src/common/model';
import { SolutionInfo } from '../../src/common/solution-info';
import { SINK_STREAM_NAME_PREFIX } from '../../src/streaming-ingestion/private/constant';
import { StreamingIngestionStack } from '../../src/streaming-ingestion-stack';
import { CFN_FN } from '../constants';
import { RefAnyValue, findConditionByName, findFirstResourceByKeyPrefix } from '../utils';

const app = new App();
const testId = 'test-stack';
const stack = new StreamingIngestionStack(app, testId+'-StreamingIngestionStack', {});
const template = Template.fromStack(stack);

describe('common parameter test of StreamingIngestionStack', () => {

  test('Should has Parameter KinesisStreamMode', () => {
    template.hasParameter('KinesisStreamMode', {
      Type: 'String',
    });
  });

  test('Should has Parameter KinesisShardCount', () => {
    template.hasParameter('KinesisShardCount', {
      Type: 'Number',
    });
  });

  test('Should has Parameter KinesisDataRetentionHours', () => {
    template.hasParameter('KinesisDataRetentionHours', {
      Type: 'Number',
    });
  });

  test('Should has Parameter KinesisSourceStreamArn', () => {
    template.hasParameter('KinesisSourceStreamArn', {
      Type: 'String',
    });
  });

  test('Should has Parameter Parallelism', () => {
    template.hasParameter('Parallelism', {
      Type: 'Number',
    });
  });

  test('Should has Parameter ParallelismPerKPU', () => {
    template.hasParameter('ParallelismPerKPU', {
      Type: 'Number',
    });
  });

  test('Should has Parameter WorkerSubnets', () => {
    template.hasParameter('WorkerSubnets', {
      Type: 'String',
    });
  });

  test('Should has Parameter RedshiftMode', () => {
    template.hasParameter('RedshiftMode', {
      Type: 'String',
    });
  });

  test('RedshiftMode allowedValues', () => {
    const param = template.toJSON().Parameters.RedshiftMode;
    const allowedValues = param.AllowedValues;
    expect(allowedValues.length).toEqual(2);
    expect(allowedValues).toEqual(expect.arrayContaining([
      REDSHIFT_MODE.PROVISIONED,
      REDSHIFT_MODE.SERVERLESS,
    ]));
  });

  test('Should has Parameter RedshiftDefaultDatabase', () => {
    template.hasParameter('RedshiftDefaultDatabase', {
      Type: 'String',
    });
  });

  test('Conditions for nested stacks are created as expected', () => {
    const condition1 = findConditionByName(template,
      'existingRedshiftServerless');
    expect(condition1[CFN_FN.EQUALS][0]).toEqual({
      Ref: 'RedshiftMode',
    });
    expect(condition1[CFN_FN.EQUALS][1]).toEqual('Serverless');

    const condition2 = findConditionByName(template,
      'redshiftProvisioned');
    expect(condition2[CFN_FN.EQUALS][0]).toEqual({
      Ref: 'RedshiftMode',
    });
    expect(condition2[CFN_FN.EQUALS][1]).toEqual('Provisioned');
  });

  test('Should has Parameter RedshiftServerlessWorkgroupName', () => {
    template.hasParameter('RedshiftServerlessWorkgroupName', {
      Type: 'String',
    });
  });

  test('Should has Parameter RedshiftServerlessNamespaceId', () => {
    template.hasParameter('RedshiftServerlessNamespaceId', {
      Type: 'String',
    });
  });

  test('Should has Parameter RedshiftDataAPIRole', () => {
    template.hasParameter('RedshiftDataAPIRole', {
      Type: 'String',
    });
  });

  test('RedshiftDataAPIRole allowedPattern', () => {
    const param = template.toJSON().Parameters.RedshiftDataAPIRole;
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

  test('Should has Parameter RedshiftClusterIdentifier', () => {
    template.hasParameter('RedshiftClusterIdentifier', {
      Type: 'String',
    });
  });

  test('Should has Parameter RedshiftDbUser', () => {
    template.hasParameter('RedshiftDbUser', {
      Type: 'String',
    });
  });

  test('Should has Rules for existing RedshiftServerless', () => {
    const rule = template.toJSON().Rules.ExistingRedshiftServerlessParameters;
    for (const e of rule.Assertions[0].Assert[CFN_FN.AND]) {
      expect(e[CFN_FN.NOT][0][CFN_FN.EQUALS][0].Ref === 'RedshiftServerlessWorkgroupName' ||
          e[CFN_FN.NOT][0][CFN_FN.EQUALS][0].Ref === 'RedshiftDataAPIRole').toBeTruthy();
    }
  });
});

describe('have custom resource to provisioning sink kinesis', () => {

  test('Lambda role has sufficient and least permissions to manage the sink Kinesis data stream', () => {
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
              'kinesis:AddTagsToStream',
              'kinesis:CreateStream',
              'kinesis:DecreaseStreamRetentionPeriod',
              'kinesis:DeleteStream',
              'kinesis:DescribeStream',
              'kinesis:DescribeStreamSummary',
              'kinesis:IncreaseStreamRetentionPeriod',
              'kinesis:ListTagsForStream',
              'kinesis:RemoveTagsFromStream',
              'kinesis:UpdateShardCount',
              'kinesis:UpdateStreamMode',
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
                  ':kinesis:',
                  {
                    Ref: 'AWS::Region',
                  },
                  ':',
                  {
                    Ref: 'AWS::AccountId',
                  },
                  `:stream/${SINK_STREAM_NAME_PREFIX}`,
                  {
                    Ref: 'ProjectId',
                  },
                  '_*',
                ],
              ],
            },
          },
          {
            Action: 'kinesis:StartStreamEncryption',
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
                    ':kinesis:',
                    {
                      Ref: 'AWS::Region',
                    },
                    ':',
                    {
                      Ref: 'AWS::AccountId',
                    },
                    `:stream/${SINK_STREAM_NAME_PREFIX}`,
                    {
                      Ref: 'ProjectId',
                    },
                    '_*',
                  ],
                ],
              },
              {
                Ref: 'KinesisEncryptionKMSKeyArn',
              },
            ],
          },
        ],
      },
    });
  });

  test('The properties of custom resource are expected.', ()=>{
    const customResource = findFirstResourceByKeyPrefix(template, 'AWS::CloudFormation::CustomResource',
      'StreamingIngestionSinkKinesisSinkCustomResource');
    expect(customResource.resource.Properties.projectId).toBeDefined();
    expect(customResource.resource.Properties.appIds).toBeDefined();
    expect(customResource.resource.Properties.mode).toBeDefined();
    expect(customResource.resource.Properties.shardCount).toBeDefined();
    expect(customResource.resource.Properties.dataRetentionHours).toBeDefined();
    expect(customResource.resource.Properties.encryptionKeyArn).toBeDefined();
    expect(customResource.resource.Properties.streamMode).toBeDefined();
    expect(customResource.resource.Properties.identifier).toBeDefined();
  });
});

describe('managed Flink application for real-time data processing', () => {

  test('Custom resource for downloading jar and files to S3 for Flink application.', ()=>{
    const customResource = findFirstResourceByKeyPrefix(template, 'Custom::CDKBucketDeployment',
      'JarsAndFilesCustomResource');
    expect(customResource.resource.Properties.SourceBucketNames).toBeDefined();
    expect(customResource.resource.Properties.SourceObjectKeys).toBeDefined();
    expect(customResource.resource.Properties.DestinationBucketName).toBeDefined();
    expect(customResource.resource.Properties.DestinationBucketKeyPrefix).toEqual({
      'Fn::Join': [
        '',
        [
          {
            Ref: 'IngestionPipelineS3Prefix',
          },
          {
            'Fn::Join': [
              '/',
              [
                {
                  Ref: 'ProjectId',
                },
                'streaming-ingestion',
                {
                  'Fn::Join': [
                    '',
                    [
                      'built-in-',
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
              ],
            ],
          },
        ],
      ],
    });
  });

  test('The role/policy of Flink application with sufficient and least permissions', ()=>{
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: Match.objectLike({
        // match part of statements
        Statement: Match.arrayWith([
          {
            Action: [
              's3:GetObject*',
              's3:GetBucket*',
              's3:List*',
            ],
            Effect: 'Allow',
            Resource: [
              {
                Ref: 'IngestionPipelineS3BucketArn',
              },
              {
                'Fn::Join': [
                  '',
                  [
                    {
                      Ref: 'IngestionPipelineS3BucketArn',
                    },
                    '/*',
                  ],
                ],
              },
            ],
          },
          {
            Action: [
              'kinesis:DescribeStreamSummary',
              'kinesis:GetRecords',
              'kinesis:GetShardIterator',
              'kinesis:ListShards',
              'kinesis:SubscribeToShard',
              'kinesis:DescribeStream',
              'kinesis:ListStreams',
              'kinesis:DescribeStreamConsumer',
            ],
            Effect: 'Allow',
            Resource: {
              Ref: 'KinesisSourceStreamArn',
            },
          },
          {
            Action: [
              's3:GetObject*',
              's3:GetBucket*',
              's3:List*',
            ],
            Effect: 'Allow',
            Resource: [
              {
                Ref: 'IngestionPipelineS3BucketArn',
              },
              {
                'Fn::Join': [
                  '',
                  [
                    {
                      Ref: 'IngestionPipelineS3BucketArn',
                    },
                    '/',
                    {
                      Ref: 'IngestionPipelineS3Prefix',
                    },
                    {
                      'Fn::Join': [
                        '/',
                        [
                          {
                            Ref: 'ProjectId',
                          },
                          'streaming-ingestion',
                          {
                            'Fn::Join': [
                              '',
                              [
                                'built-in-',
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
                        ],
                      ],
                    },
                    `/flink-etl-${SolutionInfo.SOLUTION_VERSION_SHORT}-all.jar`,
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
            ],
            Effect: 'Allow',
            Resource: [
              {
                Ref: 'IngestionPipelineS3BucketArn',
              },
              {
                'Fn::Join': [
                  '',
                  [
                    {
                      Ref: 'IngestionPipelineS3BucketArn',
                    },
                    '/',
                    {
                      Ref: 'IngestionPipelineS3Prefix',
                    },
                    {
                      'Fn::Join': [
                        '/',
                        [
                          {
                            Ref: 'ProjectId',
                          },
                          'streaming-ingestion',
                          {
                            'Fn::Join': [
                              '',
                              [
                                'built-in-',
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
                        ],
                      ],
                    },
                    '/GeoLite2-City.mmdb',
                  ],
                ],
              },
            ],
          },
          {
            Action: [
              'kinesis:PutRecord',
              'kinesis:PutRecords',
              'kinesis:ListShards',
            ],
            Resource: {
              'Fn::Join': [
                '',
                [
                  'arn:',
                  {
                    Ref: 'AWS::Partition',
                  },
                  ':kinesis:',
                  {
                    Ref: 'AWS::Region',
                  },
                  ':',
                  {
                    Ref: 'AWS::AccountId',
                  },
                  ':stream/clickstream_streaming_sink_',
                  {
                    Ref: 'ProjectId',
                  },
                  '_*',
                ],
              ],
            },
            Effect: 'Allow',
          },
        ]),
      }),
    });
  });

  test('Managed Flink application', ()=>{
    template.hasResourceProperties('AWS::KinesisAnalyticsV2::Application', {
      ApplicationConfiguration: {
        ApplicationCodeConfiguration: {
          CodeContent: {
            S3ContentLocation: {
              BucketARN: {
                Ref: 'IngestionPipelineS3BucketArn',
              },
              FileKey: {
                'Fn::Join': [
                  '',
                  [
                    {
                      Ref: 'IngestionPipelineS3Prefix',
                    },
                    {
                      'Fn::Join': [
                        '/',
                        [
                          {
                            Ref: 'ProjectId',
                          },
                          'streaming-ingestion',
                          {
                            'Fn::Join': [
                              '',
                              [
                                'built-in-',
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
                        ],
                      ],
                    },
                    `/flink-etl-${SolutionInfo.SOLUTION_VERSION_SHORT}-all.jar`,
                  ],
                ],
              },
            },
          },
          CodeContentType: 'ZIPFILE',
        },
        ApplicationSnapshotConfiguration: {
          SnapshotsEnabled: false,
        },
        EnvironmentProperties: {
          PropertyGroups: [
            {
              PropertyGroupId: 'EnvironmentProperties',
              PropertyMap: {
                projectId: {
                  Ref: 'ProjectId',
                },
                stackShortId: {
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
                inputStreamArn: {
                  Ref: 'KinesisSourceStreamArn',
                },
                dataBucketName: {
                  'Fn::Select': [
                    0,
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
                                  Ref: 'IngestionPipelineS3BucketArn',
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                geoFileKey: {
                  'Fn::Join': [
                    '',
                    [
                      {
                        Ref: 'IngestionPipelineS3Prefix',
                      },
                      {
                        'Fn::Join': [
                          '/',
                          [
                            {
                              Ref: 'ProjectId',
                            },
                            'streaming-ingestion',
                            {
                              'Fn::Join': [
                                '',
                                [
                                  'built-in-',
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
                          ],
                        ],
                      },
                      '/GeoLite2-City.mmdb',
                    ],
                  ],
                },
              },
            },
          ],
        },
        FlinkApplicationConfiguration: {
          CheckpointConfiguration: {
            CheckpointingEnabled: true,
            ConfigurationType: 'CUSTOM',
          },
          MonitoringConfiguration: {
            ConfigurationType: 'CUSTOM',
            LogLevel: 'ERROR',
            MetricsLevel: 'TASK',
          },
          ParallelismConfiguration: {
            AutoScalingEnabled: true,
            ConfigurationType: 'CUSTOM',
            Parallelism: {
              Ref: 'Parallelism',
            },
            ParallelismPerKPU: {
              Ref: 'ParallelismPerKPU',
            },
          },
        },
        VpcConfigurations: [
          {
            SecurityGroupIds: [
              {
                'Fn::GetAtt': [
                  'ClickstreamStreamingIngestionSecurityGroup0B30C9A9',
                  'GroupId',
                ],
              },
            ],
            SubnetIds: {
              'Fn::Split': [
                ',',
                {
                  Ref: 'WorkerSubnets',
                },
              ],
            },
          },
        ],
      },
      ApplicationDescription: {
        'Fn::Join': [
          '',
          [
            'Streaming ingestion for Clickstream project ',
            {
              Ref: 'ProjectId',
            },
          ],
        ],
      },
    });
  });

  test('Has ARN of Flink application output', ()=>{
    template.hasOutput(OUTPUT_STREAMING_INGESTION_FLINK_APP_ARN, {
    });
  });
});

describe('nested redshift stacks in streaming ingestion stack', () => {

  test('Nested Provisioned Redshift stack', () => {
    const nestedStack = findFirstResourceByKeyPrefix(template, 'AWS::CloudFormation::Stack',
      'StreamingToProvisionedRedshiftNestedStackStreamingToProvisionedRedshift');
    expect(nestedStack.resource.Condition).toEqual('redshiftProvisioned');
  });

  test('Nested Redshift Serverless stack', () => {
    const nestedStack = findFirstResourceByKeyPrefix(template, 'AWS::CloudFormation::Stack',
      'StreamingToServerlessRedshiftNestedStackStreamingToServerlessRedshift');
    expect(nestedStack.resource.Condition).toEqual('existingRedshiftServerless');
  });
});

describe('resources in nested redshift stacks', () => {

  const redShiftServerlessStack = Template.fromStack(stack.toRedshiftServerlessStack);
  const provisionedRedshiftStack = Template.fromStack(stack.toProvisionedRedshiftStack);

  test('Redshift role is able to read from sink Kinesis data stream with encryption', ()=>{
    redShiftServerlessStack.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: {
              Service: 'redshift.amazonaws.com',
            },
          },
        ],
      },
      Path: '/clickstream-role/',
      Policies: [
        {
          PolicyDocument: {
            Statement: [
              {
                Action: [
                  'kinesis:DescribeStreamSummary',
                  'kinesis:GetShardIterator',
                  'kinesis:GetRecords',
                  'kinesis:DescribeStream',
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
                      ':kinesis:',
                      {
                        Ref: 'AWS::Region',
                      },
                      ':',
                      {
                        Ref: 'AWS::AccountId',
                      },
                      `:stream/${SINK_STREAM_NAME_PREFIX}`,
                      RefAnyValue,
                      '_*',
                    ],
                  ],
                },
                Sid: 'ReadStream',
              },
              {
                Action: [
                  'kinesis:ListStreams',
                  'kinesis:ListShards',
                ],
                Effect: 'Allow',
                Resource: '*',
                Sid: 'ListStream',
              },
              {
                Action: 'kms:Decrypt',
                Effect: 'Allow',
                Resource: RefAnyValue,
                Sid: 'DecryptStream',
              },
            ],
          },
        },
      ],
    });
  });

  test('Custom resource is used for associating IAM role to Redshift Serverless', ()=>{
    redShiftServerlessStack.hasResource('AWS::CloudFormation::CustomResource', {
      Properties: {
        roleArn: {
          'Fn::GetAtt': [
            'StreamingIngestionFromKDS60C94B37',
            'Arn',
          ],
        },
        timeoutInSeconds: 180,
        serverlessRedshiftProps: {
          createdInStack: false,
          workgroupId: RefAnyValue,
          namespaceId: RefAnyValue,
          workgroupName: RefAnyValue,
          databaseName: RefAnyValue,
          dataAPIRoleArn: RefAnyValue,
        },
        provisionedRedshiftProps: Match.absent(),
      },
      DependsOn: [
        'RedshiftAssociateKDSIngestionRoleRedshiftServerlessAllNamespacePolicy90B6012E',
        'RedshiftAssociateKDSIngestionRoleRedshiftServerlessAllWorkgroupPolicyB7A8DDC2',
      ],
    });
  });

  test('Custom resource is used for associating IAM role to Provisioned Redshift', ()=>{
    provisionedRedshiftStack.hasResource('AWS::CloudFormation::CustomResource', {
      Properties: {
        roleArn: {
          'Fn::GetAtt': [
            'StreamingIngestionFromKDS60C94B37',
            'Arn',
          ],
        },
        timeoutInSeconds: 180,
        provisionedRedshiftProps: {
          clusterIdentifier: RefAnyValue,
          databaseName: RefAnyValue,
          dbUser: RefAnyValue,
        },
        serverlessRedshiftProps: Match.absent(),
      },
      DependsOn: [
        'ProvisionedRedshiftIAMPolicy19784BA5',
      ],
    });
  });

  test('Custom resource is used for initializing the schema, views for streaming ingestion', ()=>{
    redShiftServerlessStack.hasResource('AWS::CloudFormation::CustomResource', {
      Properties: {
        dataAPIRole: RefAnyValue,
        serverlessRedshiftProps: {
          createdInStack: false,
          workgroupId: RefAnyValue,
          namespaceId: RefAnyValue,
          workgroupName: RefAnyValue,
          databaseName: RefAnyValue,
        },
        lastModifiedTime: Match.anyValue(),
        projectId: RefAnyValue,
        appIds: RefAnyValue,
        databaseName: RefAnyValue,
        streamingRoleArn: {
          'Fn::GetAtt': [
            'StreamingIngestionFromKDS60C94B37',
            'Arn',
          ],
        },
        identifier: Match.anyValue(),
        schemaDefs: [
          {
            sqlFile: 'ods-events-streaming-mv.sql',
          },
          {
            sqlFile: 'ods-events-streaming-view.sql',
          },
          {
            sqlFile: 'grant-permissions-to-bi-user.sql',
          },
        ],
        biUsername: RefAnyValue,
      },
      DependsOn: Match.arrayWith([
        'RedshiftAssociateIAMRoleCustomResource',
        'StreamingIngestionSchemasSQLExecutionStateMachine9266C6B2',
      ]),
    });
  });
});