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

import { App } from 'aws-cdk-lib';
import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import { KafkaS3SinkConnectorStack } from './../../../src/kafka-s3-connector-stack';

function findFirstResourceByKeyPrefix(template: Template, type: string, keyPrefix: string) {
  const allResources = template.toJSON().Resources;
  for (const key of Object.keys(allResources)) {
    const resource = allResources[key];
    if (resource.Type == type && key.startsWith(keyPrefix)) {
      return { resource, key };
    }
  }
  return { resource: undefined, key: undefined };
}


function checkPattern(
  paramName: string,
  validValues: string[],
  invalidValues: string[],
) {
  const param = template.toJSON().Parameters[paramName];
  const pattern = param.AllowedPattern;
  const regex = new RegExp(`${pattern}`);
  for (const v of validValues) {
    expect(v).toMatch(regex);
  }
  for (const v of invalidValues) {
    expect(v).not.toMatch(regex);
  }
}

const app = new App();
const stack = new KafkaS3SinkConnectorStack(app, 'test-s3-connector');
const template = Template.fromStack(stack);

test('Parameters settings are as expected', () => {
  const params = [
    //Name, Type, Default
    ['DataS3Bucket', 'String'],
    ['DataS3Prefix', 'String', 'data'],
    ['LogS3Bucket', 'String'],
    ['LogS3Prefix', 'String', 'log'],
    ['PluginS3Bucket', 'String'],
    ['PluginS3Prefix', 'String', 'plugin'],
    ['SubnetIds', 'List<AWS::EC2::Subnet::Id>'],
    ['KafkaBrokers', 'String'],
    ['KafkaTopic', 'String'],
    ['SecurityGroupId', 'String'],
    ['MskClusterName', 'String'],
    ['MaxWorkerCount', 'Number', '3'],
    ['MinWorkerCount', 'Number', '1'],
    ['WorkerMcuCount', 'Number', '1'],
    [
      'PluginUrl',
      'String',
      'https://d1i4a15mxbxib1.cloudfront.net/api/plugins/confluentinc/kafka-connect-s3/versions/10.2.2/confluentinc-kafka-connect-s3-10.2.2.zip',
    ],
    ['RotateIntervalMS', 'Number', '3000000'],
    ['FlushSize', 'Number', '50000'],
    ['CustomConnectorConfiguration', 'String', '{}'],
  ];

  for (const param of params) {
    if (param.length == 2) {
      template.hasParameter(param[0], {
        Type: param[1],
      });
    } else if (param.length == 3) {
      template.hasParameter(param[0], {
        Type: param[1],
        Default: param[2],
      });
    }
  }
});

test('S3Prefix pattern', () => {
  const validValues = ['abc', '123'];
  const invalidValues = ['abc/', 'abc/abc'];
  const paramNames = ['DataS3Prefix', 'LogS3Prefix', 'PluginS3Prefix'];
  paramNames.forEach((p) => checkPattern(p, validValues, invalidValues));
});

test('KafkaBrokers pattern', () => {
  const validValues = [
    '1.abc1.com:9092,2.abc2.com:9092,3.abc3.com:9092',
    'abc.com',
    'abc1.com,abc2.com,',
  ];
  const invalidValues = [
    'abc',
    'http://abc.com',
    'https://abc.com',
    'abc1.com:9092,abc2.com:9092,abc3.com:9092,abc4.com:9092',
  ];
  const paramNames = ['KafkaBrokers'];
  paramNames.forEach((p) => checkPattern(p, validValues, invalidValues));
});

test('SecurityGroupId pattern', () => {
  const validValues = ['sg-abc0001', 'sg-0000', 'sg-ffff'];
  const invalidValues = ['ab', 'xx-aaaa', '', 'sg-xxx'];
  const paramNames = ['SecurityGroupId'];
  paramNames.forEach((p) => checkPattern(p, validValues, invalidValues));
});


test('KafkaTopic pattern', () => {
  const validValues = ['test1', '_test.abc.a', 'abc-test'];
  const invalidValues = ['abc#', 'ab$', '', '&', 'ab/a', 'abc,test'];
  const paramNames = ['KafkaTopic'];
  paramNames.forEach((p) => checkPattern(p, validValues, invalidValues));
});


test('PluginUrl pattern', () => {
  const validValues = [
    'http://test.com/abc/a.zip',
    'https://test.com/abc/a.zip',
    'http://test.com/abc/a.jar',
  ];
  const invalidValues = [
    'http://test.com/abc/',
    'https://test.com/abc/a.tar',
    'http://test.com/abc/a',
  ];
  const paramNames = ['PluginUrl'];
  paramNames.forEach((p) => checkPattern(p, validValues, invalidValues));
});

test('CustomConnectorConfiguration pattern', () => {
  const validValues = [
    '{"ab1" : "1"}',
    '{"ab1":"1"}',
    '{"ab2": "a"}',
    '{"ab1": "1","ab2": "a","abb": "b"}',
    '{"ab1": "1"  ,     "ab2": "a"}',
    '{"ab.test": "1"}',
    '{"Ab-Test": "1"}',
    '{}',
    '   {"ab1": "1"}  ',
  ];
  const invalidValues = ['{"ab1": 1}', '{"ab1": 1,"ab2": "a"}', 'abc', ''];
  const paramNames = ['CustomConnectorConfiguration'];
  paramNames.forEach((p) => checkPattern(p, validValues, invalidValues));
});

test('parameters are passed into customResource', () => {
  template.hasResourceProperties('AWS::CloudFormation::CustomResource', {
    ServiceToken: {
      'Fn::GetAtt': [Match.anyValue(), 'Arn'],
    },
    subnetIds: {
      'Fn::Join': [
        ',',
        {
          Ref: 'SubnetIds',
        },
      ],
    },
    dataS3Bucket: {
      Ref: 'DataS3Bucket',
    },
    dataS3Prefix: {
      Ref: 'DataS3Prefix',
    },
    pluginS3Bucket: {
      Ref: 'PluginS3Bucket',
    },
    pluginS3Prefix: {
      Ref: 'PluginS3Prefix',
    },
    logS3Bucket: {
      Ref: 'LogS3Bucket',
    },
    logS3Prefix: {
      Ref: 'LogS3Prefix',
    },
    kafkaTopics: {
      Ref: 'KafkaTopic',
    },
    kafkaBrokers: {
      Ref: 'KafkaBrokers',
    },
    securityGroupId: {
      Ref: 'SecurityGroupId',
    },
    s3SinkConnectorRole: Match.anyValue(),
    maxWorkerCount: {
      Ref: 'MaxWorkerCount',
    },
    minWorkerCount: {
      Ref: 'MinWorkerCount',
    },
    workerMcuCount: {
      Ref: 'WorkerMcuCount',
    },
    pluginUrl: {
      Ref: 'PluginUrl',
    },
    kafkaConnectVersion: '2.7.1',
    rotateIntervalMS: {
      Ref: 'RotateIntervalMS',
    },
    customConnectorConfiguration: {
      Ref: 'CustomConnectorConfiguration',
    },
    flushSize: {
      Ref: 'FlushSize',
    },
  });
});

test('Policy for s3 sink connector role', () => {
  const roleCaptureCustomResource = new Capture();
  template.hasResourceProperties('AWS::CloudFormation::CustomResource', {
    s3SinkConnectorRole: {
      'Fn::GetAtt': [roleCaptureCustomResource, 'Arn'],
    },
  });
  const statementCapture = new Capture();
  template.hasResourceProperties('AWS::IAM::Policy', {
    Roles: [
      {
        Ref: roleCaptureCustomResource.asString(),
      },
    ],
    PolicyDocument: { Statement: statementCapture },
  });
  expect( statementCapture.asArray()[0].Action).toEqual([
    'kafka-cluster:Connect',
    'kafka-cluster:DescribeCluster',
  ]);
  expect(statementCapture.asArray()[0].Resource['Fn::Join']).toBeDefined();
});


test('IAM policy for custom resource lambda role has a specified resource and region', () => {
  const sinkRoleKey = findFirstResourceByKeyPrefix(template, 'AWS::IAM::Role',
    's3kafkaconnectrole').key;
  const policy = findFirstResourceByKeyPrefix(template, 'AWS::IAM::Policy',
    'S3SinkConnectorCustomResourceLambdaRoleDefaultPolicy').resource;
  const statement = policy.Properties.PolicyDocument.Statement as any[];
  expect(statement[0].Action).toEqual([
    'iam:PassRole',
    'iam:CreateServiceLinkedRole',
    'iam:AttachRolePolicy',
    'iam:PutRolePolicy',
    'iam:UpdateRoleDescription',
    'iam:DeleteServiceLinkedRole',
    'iam:GetServiceLinkedRoleDeletionStatus',
  ]);
  expect(statement[0].Resource['Fn::GetAtt']).toEqual([
    sinkRoleKey,
    'Arn',
  ]);

  expect(statement).toContainEqual( {
    Action: [
      'kafkaconnect:ListConnectors',
      'kafkaconnect:CreateCustomPlugin',
      'kafkaconnect:CreateConnector',
      'kafkaconnect:DeleteConnector',
      'kafkaconnect:ListCustomPlugins',
      'kafkaconnect:DeleteCustomPlugin',
      'kafkaconnect:UpdateConnector',
    ],
    Condition: {
      StringEquals: {
        'aws:RequestedRegion': {
          Ref: 'AWS::Region',
        },
      },
    },
    Effect: 'Allow',
    Resource: '*',
  });

  expect(statement).toContainEqual( {
    Action: [
      'ec2:DescribeVpcs',
      'ec2:DescribeSubnets',
      'ec2:DescribeSecurityGroups',
      'ec2:CreateNetworkInterface',
      'ec2:DescribeNetworkInterfaces',
      'ec2:DeleteNetworkInterface',
      'ec2:AssignPrivateIpAddresses',
      'ec2:UnassignPrivateIpAddresses',
    ],
    Condition: {
      StringEquals: {
        'aws:RequestedRegion': {
          Ref: 'AWS::Region',
        },
      },
    },
    Effect: 'Allow',
    Resource: '*',
  });


  expect(statement).toContainEqual(
    {
      Action: [
        'logs:ListLogDeliveries',
        'logs:CreateLogDelivery',
        'logs:CreateLogStream',
        'logs:CreateLogGroup',
        'logs:PutDestinationPolicy',
        'logs:PutDestination',
        'logs:PutLogEvents',
        'logs:DeleteLogDelivery',
        'logs:DeleteLogGroup',
        'logs:DeleteLogStream',
        'logs:DeleteDestination',
        'logs:DeleteRetentionPolicy',
      ],
      Condition: {
        StringEquals: {
          'aws:RequestedRegion': {
            Ref: 'AWS::Region',
          },
        },
      },
      Effect: 'Allow',
      Resource: '*',
    });


  expect(statement).toContainEqual(
    {
      Action: 'iam:ListRoles',
      Condition: {
        StringEquals: {
          'aws:RequestedRegion': {
            Ref: 'AWS::Region',
          },
        },
      },
      Effect: 'Allow',
      Resource: {
        'Fn::Join': [
          '',
          [
            'arn:',
            {
              Ref: 'AWS::Partition',
            },
            ':iam:::*',
          ],
        ],
      },
    });
});


test('Lambda has POWERTOOLS ENV set', () => {
  template.hasResourceProperties('AWS::Lambda::Function', {
    Environment: {
      Variables: {
        LOG_LEVEL: 'ERROR',
        POWERTOOLS_SERVICE_NAME: 'ClickStreamAnalyticsOnAWS',
      },
    },
  });
});
