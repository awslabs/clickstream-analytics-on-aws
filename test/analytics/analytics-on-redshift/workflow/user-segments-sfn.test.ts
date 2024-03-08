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

import { readFileSync } from 'fs';
import { App } from 'aws-cdk-lib';
import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import { DataAnalyticsRedshiftStack } from '../../../../src/data-analytics-redshift-stack';

describe('DataAnalyticsRedshiftStack user segment workflow tests', () => {
  const app = new App();
  const stack = new DataAnalyticsRedshiftStack(app, 'DataAnalyticsRedshiftStack-UserSegments', {});
  const provisionedTemplate = Template.fromStack(stack.nestedStacks.redshiftProvisionedStack);
  const existingServerlessTemplate = Template.fromStack(stack.nestedStacks.redshiftServerlessStack);
  const newServerlessTemplate = Template.fromStack(stack.nestedStacks.newRedshiftServerlessStack);
  const templates = [
    provisionedTemplate,
    existingServerlessTemplate,
    newServerlessTemplate,
  ];

  test('should have state machine created for segments step functions', () => {
    const stepFuncDef = readFileSync(__dirname + '/user-segments-sfn.json', 'utf8');
    const strCapture = new Capture();

    for (const template of templates) {
      template.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        DefinitionString: strCapture,
        RoleArn: {
          'Fn::GetAtt': [
            'ClickstreamUserSegmentsWorkflowStateMachineRoleDCC1FAB4',
            'Arn',
          ],
        },
      });

      expect(JSON.stringify(strCapture.asObject(), undefined, 2)).toEqual(stepFuncDef);
    }
  });

  test('should have lambda created for segment job init', () => {
    for (const template of templates) {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            POWERTOOLS_SERVICE_NAME: 'ClickStreamAnalyticsOnAWS',
            POWERTOOLS_LOGGER_SAMPLE_RATE: '1',
            POWERTOOLS_LOGGER_LOG_EVENT: 'true',
            LOG_LEVEL: 'WARN',
            CLICKSTREAM_METADATA_DDB_ARN: {
              Ref: Match.stringLikeRegexp('ClickstreamMetadataDdbArn'),
            },
            AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
          },
        },
        Handler: 'index.handler',
      });
    }
  });

  test('should grant segment-job-init lambda proper permissions', () => {
    for (const template of templates) {
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
              Action: 'events:DisableRule',
              Effect: 'Allow',
              Resource: {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    {
                      Ref: 'AWS::Partition',
                    },
                    ':events:*:',
                    {
                      Ref: 'AWS::AccountId',
                    },
                    ':rule/Clickstream-*',
                  ],
                ],
              },
            },
            {
              Action: [
                'dynamodb:BatchGetItem',
                'dynamodb:GetRecords',
                'dynamodb:GetShardIterator',
                'dynamodb:Query',
                'dynamodb:GetItem',
                'dynamodb:Scan',
                'dynamodb:ConditionCheckItem',
                'dynamodb:BatchWriteItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:DescribeTable',
              ],
              Effect: 'Allow',
              Resource: [
                {
                  Ref: Match.stringLikeRegexp('ClickstreamMetadataDdbArn'),
                },
                {
                  Ref: 'AWS::NoValue',
                },
              ],
            },
          ],
          Version: '2012-10-17',
        },
      });
    }
  });

  test('should have lambda created for state machine status', () => {
    for (const template of templates) {
      template.hasResourceProperties('AWS::Lambda::Function', {
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
      });
    }
  });

  test('should grant state-machine-status lambda proper permissions', () => {
    for (const template of templates) {
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
              Action: 'states:ListExecutions',
              Effect: 'Allow',
              Resource: {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    {
                      Ref: 'AWS::Partition',
                    },
                    ':states:*:',
                    {
                      Ref: 'AWS::AccountId',
                    },
                    ':stateMachine:ClickstreamUserSegmentsWorkflowStateMachine*',
                  ],
                ],
              },
            },
          ],
          Version: '2012-10-17',
        },
      });
    }
  });

  test('should have lambda created for execute segment query', () => {
    newServerlessTemplate.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          POWERTOOLS_SERVICE_NAME: 'ClickStreamAnalyticsOnAWS',
          POWERTOOLS_LOGGER_SAMPLE_RATE: '1',
          POWERTOOLS_LOGGER_LOG_EVENT: 'true',
          LOG_LEVEL: 'WARN',
          REDSHIFT_MODE: 'Serverless',
          REDSHIFT_SERVERLESS_WORKGROUP_NAME: {
            'Fn::GetAtt': [
              Match.stringLikeRegexp('RedshiftServerelssWorkgroupClickstreamWorkgroup'),
              'Workgroup.WorkgroupName',
            ],
          },
          REDSHIFT_CLUSTER_IDENTIFIER: '',
          REDSHIFT_DATABASE: {
            Ref: Match.anyValue(),
          },
          REDSHIFT_DB_USER: '',
          REDSHIFT_DATA_API_ROLE: {
            'Fn::GetAtt': [
              Match.stringLikeRegexp('DataAPIRole'),
              'Arn',
            ],
          },
          CLICKSTREAM_METADATA_DDB_ARN: {
            Ref: Match.stringLikeRegexp('ClickstreamMetadataDdbArn'),
          },
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        },
      },
      Handler: 'index.handler',
    });
  });

  test('should grant execute-segment-query lambda proper permissions', () => {
    newServerlessTemplate.hasResourceProperties('AWS::IAM::Policy', {
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
              'dynamodb:BatchGetItem',
              'dynamodb:GetRecords',
              'dynamodb:GetShardIterator',
              'dynamodb:Query',
              'dynamodb:GetItem',
              'dynamodb:Scan',
              'dynamodb:ConditionCheckItem',
              'dynamodb:BatchWriteItem',
              'dynamodb:PutItem',
              'dynamodb:UpdateItem',
              'dynamodb:DeleteItem',
              'dynamodb:DescribeTable',
            ],
            Effect: 'Allow',
            Resource: [
              {
                Ref: Match.stringLikeRegexp('ClickstreamMetadataDdbArn'),
              },
              {
                Ref: 'AWS::NoValue',
              },
            ],
          },
          {
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Resource: {
              'Fn::GetAtt': [
                Match.stringLikeRegexp('DataAPIRole'),
                'Arn',
              ],
            },
          },
        ],
        Version: '2012-10-17',
      },
    });
  });

  test('should have lambda created for segment job status', () => {
    newServerlessTemplate.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          POWERTOOLS_SERVICE_NAME: 'ClickStreamAnalyticsOnAWS',
          POWERTOOLS_LOGGER_SAMPLE_RATE: '1',
          POWERTOOLS_LOGGER_LOG_EVENT: 'true',
          LOG_LEVEL: 'WARN',
          REDSHIFT_DATA_API_ROLE: {
            'Fn::GetAtt': [
              Match.stringLikeRegexp('DataAPIRole'),
              'Arn',
            ],
          },
          CLICKSTREAM_METADATA_DDB_ARN: {
            Ref: Match.stringLikeRegexp('ClickstreamMetadataDdbArn'),
          },
          SEGMENTS_S3_PREFIX: {
            Ref: Match.stringLikeRegexp('SegmentsS3Prefix'),
          },
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        },
      },
      Handler: 'index.handler',
    });
  });

  test('should grant segment-job-status lambda proper permissions', () => {
    newServerlessTemplate.hasResourceProperties('AWS::IAM::Policy', {
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
              'dynamodb:BatchWriteItem',
              'dynamodb:PutItem',
              'dynamodb:UpdateItem',
              'dynamodb:DeleteItem',
              'dynamodb:DescribeTable',
            ],
            Effect: 'Allow',
            Resource: [
              {
                Ref: Match.stringLikeRegexp('ClickstreamMetadataDdbArn'),
              },
              {
                Ref: 'AWS::NoValue',
              },
            ],
          },
          {
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Resource: {
              'Fn::GetAtt': [
                Match.stringLikeRegexp('DataAPIRole'),
                'Arn',
              ],
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
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    {
                      Ref: 'AWS::Partition',
                    },
                    ':s3:::',
                    {
                      Ref: Match.stringLikeRegexp('PipelineS3Bucket'),
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
                      Ref: Match.stringLikeRegexp('PipelineS3Bucket'),
                    },
                    '/',
                    {
                      Ref: Match.stringLikeRegexp('SegmentsS3Prefix'),
                    },
                    '*',
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
});
