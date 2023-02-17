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
  Match,
  // Capture,
} from 'aws-cdk-lib/assertions';
import { TestEnv } from './test-utils';

describe('Click Stream Api Construct Test', () => {

  test('DynamoDB table', () => {
    const { template } = TestEnv.newApiStack();

    template.hasResourceProperties('AWS::DynamoDB::Table', {
      KeySchema: [
        {
          AttributeName: 'name',
          KeyType: 'HASH',
        },
      ],
      AttributeDefinitions: [
        {
          AttributeName: 'name',
          AttributeType: 'S',
        },
      ],
      BillingMode: 'PAY_PER_REQUEST',
      PointInTimeRecoverySpecification: {
        PointInTimeRecoveryEnabled: true,
      },
      SSESpecification: {
        SSEEnabled: true,
      },
    });
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      KeySchema: [
        {
          AttributeName: 'projectId',
          KeyType: 'HASH',
        },
        {
          AttributeName: 'type',
          KeyType: 'RANGE',
        },
      ],
      AttributeDefinitions: [
        {
          AttributeName: 'projectId',
          AttributeType: 'S',
        },
        {
          AttributeName: 'type',
          AttributeType: 'S',
        },
      ],
      BillingMode: 'PAY_PER_REQUEST',
      PointInTimeRecoverySpecification: {
        PointInTimeRecoveryEnabled: true,
      },
      SSESpecification: {
        SSEEnabled: true,
      },
      TimeToLiveSpecification: {
        AttributeName: 'ttl',
        Enabled: true,
      },
    });
  });

  test('Api lambda', () => {
    const { template } = TestEnv.newApiStack();

    template.hasResourceProperties('AWS::Lambda::Function', {
      Architectures: [
        'x86_64',
      ],
      Description: 'Lambda function for api of solution Click Stream Analytics on AWS',
      Environment: {
        Variables: {
          CLICK_STREAM_TABLE_NAME: {
            Ref: 'testClickStreamApiClickstreamMetadata987DD938',
          },
          DICTIONARY_TABLE_NAME: {
            Ref: 'testClickStreamApiClickstreamDictionaryF74FCF1C',
          },
          AWS_ACCOUNT_ID: {
            Ref: 'AWS::AccountId',
          },
          POWERTOOLS_SERVICE_NAME: 'click-stream',
          POWERTOOLS_LOGGER_LOG_LEVEL: 'WARN',
          POWERTOOLS_LOGGER_SAMPLE_RATE: '0.01',
          POWERTOOLS_LOGGER_LOG_EVENT: 'true',
          POWERTOOLS_METRICS_NAMESPACE: 'click-stream',
        },
      },
      MemorySize: 512,
      PackageType: 'Image',
      ReservedConcurrentExecutions: 3,
      Timeout: 30,
      TracingConfig: {
        Mode: 'Active',
      },
    });
    template.hasResource('AWS::Lambda::Function', {
      DependsOn: [
        'apifunceni59253B5A',
        'testClickStreamApiClickStreamApiFunctionRoleDefaultPolicyF611914E',
        'testClickStreamApiClickStreamApiFunctionRole648B4D65',
      ],
    });
  });

  test('IAM Resource for Api Lambda', () => {
    const { template } = TestEnv.newApiStack();

    // Creates the function's execution role...
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
        ],
      },
    });

    // And finally the execution role's policy
    template.hasResourceProperties('AWS::IAM::Policy', Match.objectLike({
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'xray:PutTraceSegments',
              'xray:PutTelemetryRecords',
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
                'Fn::GetAtt': [
                  'testClickStreamApiClickstreamDictionaryF74FCF1C',
                  'Arn',
                ],
              },
              {
                Ref: 'AWS::NoValue',
              },
            ],
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
                'Fn::GetAtt': [
                  'testClickStreamApiClickstreamMetadata987DD938',
                  'Arn',
                ],
              },
              {
                Ref: 'AWS::NoValue',
              },
            ],
          },
        ],
        Version: '2012-10-17',
      },
      PolicyName: 'testClickStreamApiClickStreamApiFunctionRoleDefaultPolicyF611914E',
      Roles: [
        {
          Ref: 'testClickStreamApiClickStreamApiFunctionRole648B4D65',
        },
      ],
    }));

  });

  test('Check SecurityGroup', () => {
    const { template } = TestEnv.newApiStack();

    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'apiTestStack/testClickStreamApi/ClickStreamApiFunctionSG',
      SecurityGroupEgress: [
        {
          CidrIp: '0.0.0.0/0',
          Description: 'Allow all outbound traffic by default',
          IpProtocol: '-1',
        },
      ],
      VpcId: 'vpc-11111111111111111',
    });

    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      IpProtocol: 'tcp',
      Description: 'allow all traffic from application load balancer',
      FromPort: 0,
      GroupId: {
        'Fn::GetAtt': [
          'testClickStreamApiClickStreamApiFunctionSG915D8668',
          'GroupId',
        ],
      },
      SourceSecurityGroupId: {
        'Fn::GetAtt': [
          'testsg872EB48A',
          'GroupId',
        ],
      },
      ToPort: 65535,
    });


  });

  test('Lambda Log Group Policy', () => {
    const { template } = TestEnv.newApiStack();

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
                  ':log-group:/aws/lambda/',
                  {
                    Ref: 'testClickStreamApiClickStreamApiFunctionB4C3E556',
                  },
                  ':*',
                ],
              ],
            },
          },
        ],
        Version: '2012-10-17',
      },
      PolicyName: 'apifunclogs9F7B9244',
      Roles: [
        {
          Ref: 'testClickStreamApiClickStreamApiFunctionRole648B4D65',
        },
      ],
    });
  });

}); //end test suite