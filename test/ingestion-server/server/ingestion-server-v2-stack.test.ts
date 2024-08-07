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
import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import { IngestionServerStackV2 } from '../../../src/ingestion-server-v2-stack';
import { WIDGETS_ORDER } from '../../../src/metrics/settings';
import { validateSubnetsRule } from '../../rules';
import { findResourceByCondition, getParameter, getParameterNamesFromParameterObject, findResources, findFirstResource, findConditionByName } from '../../utils';

if (process.env.CI !== 'true') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  jest.mock('aws-cdk-lib/aws-lambda-nodejs', () => require('../../cdk-lambda-nodejs-mock'));
}

const app = new App();

const v2Stack = new IngestionServerStackV2(app, 'test-v2-stack', {});

const v2Template = Template.fromStack(v2Stack);

test('Has Parameter VpcId', () => {
  v2Template.hasParameter('VpcId', {
    Type: 'AWS::EC2::VPC::Id',
  });
});

test('Has Parameter PublicSubnetIds', () => {
  v2Template.hasParameter('PublicSubnetIds', {
    Type: 'String',
  });
});

test('PublicSubnetIds pattern', () => {
  const param = getParameter(v2Template, 'PublicSubnetIds');
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
  validateSubnetsRule(v2Template);
});

test('Has Parameter PrivateSubnetIds', () => {
  v2Template.hasParameter('PrivateSubnetIds', {
    Type: 'String',
  });
});

test('PrivateSubnetIds pattern', () => {
  const param = getParameter(v2Template, 'PrivateSubnetIds');
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

test('Has Parameter DomainName', () => {
  v2Template.hasParameter('DomainName', {
    Type: 'String',
  });
});

test('Has Parameter ACMCertificateArn', () => {
  v2Template.hasParameter('ACMCertificateArn', {
    Type: 'String',
  });
});

test('domainName pattern', () => {
  const param = getParameter(v2Template, 'DomainName');
  const pattern = param.AllowedPattern;
  const regex = new RegExp(`${pattern}`);
  const validValues = [
    'abc.com',
    'test.abc.com',
    'example.services',
    'test.example.graphics',
    '123.test.clickstream.management',
    '123.test.abc.com',
    'a123#~&%.test-2.a_bc.com',
  ];

  for (const v of validValues) {
    expect(v).toMatch(regex);
  }

  const invalidValues = ['a', 'abc.example_test', 'abc.c', 'abc^.com'];
  for (const v of invalidValues) {
    expect(v).not.toMatch(regex);
  }
});

test('Has Parameter ServerEndpointPath', () => {
  v2Template.hasParameter('ServerEndpointPath', {
    Type: 'String',
    Default: '/collect',
  });
});

test('ServerEndpointPath pattern', () => {
  const param = getParameter(v2Template, 'ServerEndpointPath');
  const pattern = param.AllowedPattern;
  const regex = new RegExp(`${pattern}`);
  const validValues = ['/a', '/a_b', '/a1', '/123', '/a/ab#', '/a/ab&'];

  for (const v of validValues) {
    expect(v).toMatch(regex);
  }

  const invalidValues = ['a/b', '*', 'a', 'collect'];
  for (const v of invalidValues) {
    expect(v).not.toMatch(regex);
  }
});

test('Has Parameter serverCorsOrigin', () => {
  v2Template.hasParameter('ServerCorsOrigin', {
    Type: 'String',
    Default: '',
  });
});

test('ServerCorsOrigin pattern', () => {
  const param = getParameter(v2Template, 'ServerCorsOrigin');
  const pattern = param.AllowedPattern;
  const regex = new RegExp(`${pattern}`);
  const validValues = [
    '.*',
    'http://.*\\.test\\.com',
    'http://abc\\.test\\.com',
    'http://abc1\\.test\\.com|http://abc2\\.test\\.com|http://abc3\\.test\\.com',
    'http://abc1\\.test\\.com|http://abc2\\.test\\.com',
  ];

  for (const v of validValues) {
    expect(v).toMatch(regex);
  }

  const invalidValues = ['http://a', 'http://abc1.test.com; http://abc2.test.com'];
  for (const v of invalidValues) {
    expect(v).not.toMatch(regex);
  }
});

test('Has Parameter Protocol', () => {
  v2Template.hasParameter('Protocol', {
    Type: 'String',
    Default: 'HTTP',
  });
});

test('Has Parameter EnableApplicationLoadBalancerAccessLog', () => {
  v2Template.hasParameter('EnableApplicationLoadBalancerAccessLog', {
    Type: 'String',
    Default: 'No',
  });
});

test('Has Parameter EnableGlobalAccelerator', () => {
  v2Template.hasParameter('EnableGlobalAccelerator', {
    Type: 'String',
    Default: 'No',
  });
});

test('Has Parameter EnableAuthentication', () => {
  v2Template.hasParameter('EnableAuthentication', {
    Type: 'String',
    Default: 'No',
  });
});

test('Has Parameter AuthenticationSecretArn', () => {
  v2Template.hasParameter('AuthenticationSecretArn', {
    Type: 'String',
  });
});

test('Has Parameter LogS3Bucket', () => {
  v2Template.hasParameter('LogS3Bucket', {
    Type: 'String',
    Default: '',
  });
});

test('Has Parameter LogS3Prefix', () => {
  v2Template.hasParameter('LogS3Prefix', {
    Type: 'String',
    Default: 'ingestion-server-log/',
  });
});

test('Has Parameter KafkaBrokers', () => {
  v2Template.hasParameter('KafkaBrokers', {
    Type: 'String',
    Default: '',
  });
});

test('KafkaBrokers pattern', () => {
  const param = getParameter(v2Template, 'KafkaBrokers');
  const pattern = param.AllowedPattern;
  const regex = new RegExp(`${pattern}`);
  const validValues = [
    'b1.test.com:9092',
    'b-1.test.com:9092,b-2.test.com:9092',
    'b-1.test.com:9092,b-2.test.com:9092,b-3.test.com:9092',
    '192.169.1.1:9092,192.169.1.2:9092,192.169.1.3:9092',
  ];

  for (const v of validValues) {
    expect(v).toMatch(regex);
  }

  const invalidValues = [
    'a',
    'b1.test.com:abc',
    'b1.test.com',
    'b-1.test.com,b-2.test.com:9092',
    '192.169.1.1,192.169.1.2,192.169.1.3',
    '192.169.1.1',
    '192.169.1.1:9092,192.169.1.2',
  ];
  for (const v of invalidValues) {
    expect(v).not.toMatch(regex);
  }
});

test('Has Parameter KafkaTopic', () => {
  v2Template.hasParameter('KafkaTopic', {
    Type: 'String',
    Default: '',
  });
});

test('KafkaTopic pattern', () => {
  const param = getParameter(v2Template, 'KafkaTopic');
  const pattern = param.AllowedPattern;
  const regex = new RegExp(`${pattern}`);
  const validValues = ['test1', 'test-abc.ab_ab', ''];

  for (const v of validValues) {
    expect(v).toMatch(regex);
  }

  const invalidValues = ['abc%', 'a#', 'a,b'];
  for (const v of invalidValues) {
    expect(v).not.toMatch(regex);
  }
});

test('Has Parameter MskSecurityGroupId', () => {
  v2Template.hasParameter('MskSecurityGroupId', {
    Type: 'String',
    Default: '',
  });
});

test('MskSecurityGroupId pattern', () => {
  const param = getParameter(v2Template, 'MskSecurityGroupId');
  const pattern = param.AllowedPattern;
  const regex = new RegExp(`${pattern}`);
  const validValues = ['sg-124434ab', 'sg-ffffff', 'sg-00000', ''];
  for (const v of validValues) {
    expect(v).toMatch(regex);
  }

  const invalidValues = ['sg-test1', 'abc', 'mysg-12323'];
  for (const v of invalidValues) {
    expect(v).not.toMatch(regex);
  }
});

test('Has Parameter MskClusterName', () => {
  v2Template.hasParameter('MskClusterName', {
    Type: 'String',
    Default: '',
  });
});

test('Has Parameter ServerMin', () => {
  v2Template.hasParameter('ServerMin', {
    Type: 'Number',
    Default: '2',
  });
});

test('Has Parameter ServerMax', () => {
  v2Template.hasParameter('ServerMax', {
    Type: 'Number',
    Default: '2',
  });
});

test('Has Parameter WarmPoolSize', () => {
  v2Template.hasParameter('WarmPoolSize', {
    Type: 'Number',
    Default: '0',
  });
});

test('Has Parameter ScaleOnCpuUtilizationPercent', () => {
  v2Template.hasParameter('ScaleOnCpuUtilizationPercent', {
    Type: 'Number',
    Default: '50',
  });
});

test('Has Parameter KinesisDataS3Bucket', () => {
  v2Template.hasParameter('KinesisDataS3Bucket', {
    Type: 'String',
    Default: '',
  });
});

test('Has Parameter KinesisDataS3Prefix', () => {
  v2Template.hasParameter('KinesisDataS3Prefix', {
    Type: 'String',
    Default: 'kinesis-data/',
  });
});

test('Has Parameter KinesisStreamMode', () => {
  v2Template.hasParameter('KinesisStreamMode', {
    Type: 'String',
    Default: 'ON_DEMAND',
  });
});

test('Has Parameter KinesisShardCount', () => {
  v2Template.hasParameter('KinesisShardCount', {
    Type: 'Number',
    Default: '3',
  });
});

test('Has Parameter KinesisDataRetentionHours', () => {
  v2Template.hasParameter('KinesisDataRetentionHours', {
    Type: 'Number',
    Default: '24',
    MinValue: 24,
    MaxValue: 8760,
  });
});

test('Has Parameter KinesisBatchSize', () => {
  v2Template.hasParameter('KinesisBatchSize', {
    Type: 'Number',
    Default: '10000',
    MinValue: 1,
    MaxValue: 10000,
  });
});

test('Has Parameter KinesisMaxBatchingWindowSeconds', () => {
  v2Template.hasParameter('KinesisMaxBatchingWindowSeconds', {
    Type: 'Number',
    Default: '300',
    MinValue: 0,
    MaxValue: 300,
  });
});

test('Has Parameter S3DataBucket', () => {
  v2Template.hasParameter('S3DataBucket', {
    Type: 'String',
    Default: '',
  });
});

test('Has Parameter S3DataPrefix', () => {
  v2Template.hasParameter('S3DataPrefix', {
    Type: 'String',
    Default: 's3-data/',
  });
});

test('Has Parameter S3BatchMaxBytes', () => {
  v2Template.hasParameter('S3BatchMaxBytes', {
    Type: 'Number',
    Default: '30000000',
    MaxValue: 50000000,
    MinValue: 1000000,
  });
});

test('Has Parameter S3BatchTimeout', () => {
  v2Template.hasParameter('S3BatchTimeout', {
    Type: 'Number',
    Default: '300',
    MinValue: 30,
  });
});

test('Has ParameterGroups', () => {
  const cfnInterface =
  v2Template.toJSON().Metadata['AWS::CloudFormation::Interface'];
  expect(cfnInterface.ParameterGroups).toBeDefined();
});

test('Check parameters for Kafka nested stack - has all parameters', () => {
  const nestStack = findResourceByCondition(
    v2Template,
    'IngestionServerFM11Condition',
  );
  expect(nestStack).toBeDefined();

  const exceptedParams = [
    'MskSecurityGroupId',
    'ServerEndpointPath',
    'ServerCorsOrigin',
    'WorkerStopTimeout',
    'KafkaBrokers',
    'KafkaTopic',
    'DevMode',
    'ServerMin',
    'PrivateSubnetIds',
    'ServerMax',
    'ScaleOnCpuUtilizationPercent',
    'MskClusterName',
    'IamRoleBoundaryArn',
    'ProjectId',
  ];
  const templateParams = Object.keys(nestStack.Properties.Parameters).map(
    (pk) => {
      if (nestStack.Properties.Parameters[pk].Ref) {
        return nestStack.Properties.Parameters[pk].Ref;
      }
    },
  );

  for (const ep of exceptedParams) {
    expect(templateParams.includes(ep)).toBeTruthy();
  }

  expect(templateParams.length).toEqual(exceptedParams.length + 3);
});

test('Check parameters for Kafka nested stack - has minimum parameters', () => {
  const nestStack = findResourceByCondition(
    v2Template,
    'IngestionServerFM00Condition',
  );
  expect(nestStack).toBeDefined();

  const exceptedParams = [
    'ServerEndpointPath',
    'ServerCorsOrigin',
    'WorkerStopTimeout',
    'KafkaBrokers',
    'KafkaTopic',
    'DevMode',
    'ServerMin',
    'PrivateSubnetIds',
    'ServerMax',
    'ScaleOnCpuUtilizationPercent',
    'IamRoleBoundaryArn',
    'ProjectId',
  ];

  const templateParams = Object.keys(nestStack.Properties.Parameters).map(
    (pk) => {
      if (nestStack.Properties.Parameters[pk].Ref) {
        return nestStack.Properties.Parameters[pk].Ref;
      }
    },
  );

  for (const ep of exceptedParams) {
    expect(templateParams.includes(ep)).toBeTruthy();
  }
  expect(templateParams.length).toEqual(exceptedParams.length + 3);
});

test('Check parameters for Kinesis nested stack - has all parameters', () => {
  const nestStack = findResourceByCondition(
    v2Template,
    'IngestionServerFK1Condition',
  );
  expect(nestStack).toBeDefined();

  const exceptedParams = [
    'ServerEndpointPath',
    'ServerCorsOrigin',
    'WorkerStopTimeout',
    'DevMode',
    'ServerMin',
    'PrivateSubnetIds',
    'ServerMax',
    'ScaleOnCpuUtilizationPercent',
    'IamRoleBoundaryArn',
    'ProjectId',
  ];

  const templateParams = Object.keys(nestStack.Properties.Parameters).map(
    (pk) => {
      if (nestStack.Properties.Parameters[pk].Ref) {
        return nestStack.Properties.Parameters[pk].Ref;
      }
    },
  );

  for (const ep of exceptedParams) {
    expect(templateParams.includes(ep)).toBeTruthy();
  }
  expect(templateParams.length).toEqual(exceptedParams.length + 4);
});

test('Check parameters for Kinesis nested stack - has minimum parameters', () => {
  const nestStack = findResourceByCondition(
    v2Template,
    'IngestionServerFK2Condition',
  );
  expect(nestStack).toBeDefined();

  const exceptedParams = [
    'ServerEndpointPath',
    'ServerCorsOrigin',
    'WorkerStopTimeout',
    'DevMode',
    'ServerMin',
    'PrivateSubnetIds',
    'ServerMax',
    'ScaleOnCpuUtilizationPercent',
    'IamRoleBoundaryArn',
    'ProjectId',
  ];

  const templateParams = Object.keys(nestStack.Properties.Parameters).map(
    (pk) => {
      if (nestStack.Properties.Parameters[pk].Ref) {
        return nestStack.Properties.Parameters[pk].Ref;
      }
    },
  );

  for (const ep of exceptedParams) {
    expect(templateParams.includes(ep)).toBeTruthy();
  }
  expect(templateParams.length).toEqual(exceptedParams.length + 4);
});

test('Check parameters for S3 nested stack - has all parameters', () => {
  const nestStack = findResourceByCondition(
    v2Template,
    'IngestionServerFCCondition',
  );
  expect(nestStack).toBeDefined();
  const exceptedParams = [
    'ServerEndpointPath',
    'ServerCorsOrigin',
    'WorkerStopTimeout',
    'DevMode',
    'ServerMin',
    'PrivateSubnetIds',
    'ServerMax',
    'ScaleOnCpuUtilizationPercent',
    'IamRoleBoundaryArn',
    'ProjectId',
    'S3DataBucket',
    'S3DataPrefix',
    'S3BatchMaxBytes',
    'S3BatchTimeout',
  ];

  const templateParams = Object.keys(nestStack.Properties.Parameters).map(
    (pk) => {
      if (nestStack.Properties.Parameters[pk].Ref) {
        return nestStack.Properties.Parameters[pk].Ref;
      }
    },
  );
  for (const ep of exceptedParams) {
    expect(templateParams.includes(ep)).toBeTruthy();
  }
  expect(templateParams.length).toEqual(exceptedParams.length + 3);
});

test('Conditions are created as expected', () => {
  const expectedConditions = [
    'IngestionServerFM11Condition',
    'IngestionServerFM10Condition',
    'IngestionServerFM01Condition',
    'IngestionServerFM00Condition',
    'IngestionServerFK1Condition',
    'IngestionServerFK2Condition',
    'IngestionServerFCCondition',
  ];

  const conditions: string[] = [];

  const conditionObj = v2Template.toJSON().Conditions;
  const tempConditions = Object.keys(conditionObj)
    .filter((ck) => ck.startsWith('IngestionServer'))
    .map((ck) => ck);

  conditions.push(...tempConditions);
  for (const ec of expectedConditions) {
    expect(conditions.includes(ec)).toBeTruthy();
  }
});

test('Rule logS3BucketAndEnableLogRule', () => {
  const assert =
  v2Template.toJSON().Rules.logS3BucketAndEnableLogRule.Assertions[0].Assert;

  let assertStr = JSON.stringify(assert).replace(/Fn::Or/g, 'or');
  assertStr = assertStr.replace(/Fn::And/g, 'and');
  assertStr = assertStr.replace(/Fn::Equals/g, 'eq');
  assertStr = assertStr.replace(/Fn::Not/g, 'not');

  const expectedAssert = {
    or: [
      {
        and: [
          {
            eq: [
              {
                Ref: 'EnableApplicationLoadBalancerAccessLog',
              },
              'Yes',
            ],
          },

          {
            not: [
              {
                eq: [
                  {
                    Ref: 'LogS3Bucket',
                  },
                  '',
                ],
              },
            ],
          },

          {
            not: [
              {
                eq: [
                  {
                    Ref: 'LogS3Prefix',
                  },
                  '',
                ],
              },
            ],
          },
        ],
      },

      {
        eq: [
          {
            Ref: 'EnableApplicationLoadBalancerAccessLog',
          },
          'No',
        ],
      },
    ],
  };

  expect(JSON.parse(assertStr)).toEqual(expectedAssert);
});

test('Rule enableAuthenticationRule', () => {
  const assert =
  v2Template.toJSON().Rules.enableAuthenticationRule.Assertions[0].Assert;

  let assertStr = JSON.stringify(assert).replace(/Fn::Or/g, 'or');
  assertStr = assertStr.replace(/Fn::And/g, 'and');
  assertStr = assertStr.replace(/Fn::Equals/g, 'eq');
  assertStr = assertStr.replace(/Fn::Not/g, 'not');

  const expectedAssert = {
    or: [
      {
        and: [
          {
            eq: [
              {
                Ref: 'EnableAuthentication',
              },
              'Yes',
            ],
          },

          {
            not: [
              {
                eq: [
                  {
                    Ref: 'AuthenticationSecretArn',
                  },
                  '',
                ],
              },
            ],
          },

          {
            not: [
              {
                eq: [
                  {
                    Ref: 'Protocol',
                  },
                  'HTTP',
                ],
              },
            ],
          },
        ],
      },

      {
        eq: [
          {
            Ref: 'EnableAuthentication',
          },
          'No',
        ],
      },
    ],
  };

  expect(JSON.parse(assertStr)).toEqual(expectedAssert);
});

test('Rule sinkToKinesisRule', () => {
  const assert =
  v2Template.toJSON().Rules.sinkToKinesisRule.Assertions[0].Assert;

  let assertStr = JSON.stringify(assert).replace(/Fn::Or/g, 'or');
  assertStr = assertStr.replace(/Fn::And/g, 'and');
  assertStr = assertStr.replace(/Fn::Equals/g, 'eq');
  assertStr = assertStr.replace(/Fn::Not/g, 'not');

  const expectedAssert = {
    or: [
      {
        and: [
          {
            eq: [
              {
                Ref: 'SinkType',
              },
              'KDS',
            ],
          },
          {
            not: [
              {
                eq: [
                  {
                    Ref: 'KinesisDataS3Bucket',
                  },
                  '',
                ],
              },
            ],
          },

          {
            not: [
              {
                eq: [
                  {
                    Ref: 'KinesisDataS3Prefix',
                  },
                  '',
                ],
              },
            ],
          },
        ],
      },
      {
        not: [
          {
            eq: [
              {
                Ref: 'SinkType',
              },
              'KDS',
            ],
          },
        ],
      },
    ],
  };
  expect(JSON.parse(assertStr)).toEqual(expectedAssert);
});

test('Parameters of onDemand Kinesis nested stack ', () => {
  const paramCapture = new Capture();
  v2Template.hasResource('AWS::CloudFormation::Stack', {
    Condition: 'onDemandStackCondition',
    Properties: {
      Parameters: paramCapture,
    },
  });
  const paramObj = paramCapture.asObject();
  const params = getParameterNamesFromParameterObject(paramObj);
  expect(params).toEqual([
    'ProjectId',
    'KinesisDataRetentionHours',
    'VpcId',
    'IamRoleBoundaryArn',
    'KinesisDataS3Bucket',
    'KinesisDataS3Prefix',
    'PrivateSubnetIds',
    'KinesisBatchSize',
    'KinesisMaxBatchingWindowSeconds',
  ]);
});

test('Parameters of provisioned Kinesis nested stack ', () => {
  const paramCapture = new Capture();
  v2Template.hasResource('AWS::CloudFormation::Stack', {
    Condition: 'provisionedStackCondition',
    Properties: {
      Parameters: paramCapture,
    },
  });
  const paramObj = paramCapture.asObject();
  const params = getParameterNamesFromParameterObject(paramObj);
  expect(params).toEqual([
    'ProjectId',
    'KinesisDataRetentionHours',
    'KinesisShardCount',
    'VpcId',
    'IamRoleBoundaryArn',
    'KinesisDataS3Bucket',
    'KinesisDataS3Prefix',
    'PrivateSubnetIds',
    'KinesisBatchSize',
    'KinesisMaxBatchingWindowSeconds',
  ]);
});

test('Environment variables name are as expected for Lambda::Function in kinesis nested stack', () => {
  expect(v2Stack.kinesisNestedStacks).toBeDefined();
  if (v2Stack.kinesisNestedStacks) {
    [
      v2Stack.kinesisNestedStacks.onDemandStack,
      v2Stack.kinesisNestedStacks.provisionedStack,
    ]
      .map((s) => Template.fromStack(s))
      .forEach((t) => {
        t.hasResourceProperties('AWS::Lambda::Function', {
          Environment: {
            Variables: {
              S3_BUCKET: {
                Ref: Match.anyValue(),
              },
              S3_PREFIX: {
                Ref: Match.anyValue(),
              },
            },
          },
        });
      });
  }
});

test('Each of kinesis nested templates has EventSourceMapping', () => {
  expect(v2Stack.kinesisNestedStacks).toBeDefined();
  if (v2Stack.kinesisNestedStacks) {
    [
      v2Stack.kinesisNestedStacks.onDemandStack,
      v2Stack.kinesisNestedStacks.provisionedStack,
    ]
      .map((s) => Template.fromStack(s))
      .forEach((t) => {
        t.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
          BatchSize: {
            Ref: Match.anyValue(),
          },
          Enabled: true,
          MaximumBatchingWindowInSeconds: {
            Ref: Match.anyValue(),
          },
        });
      });
  }
});

test('Each of kinesis nested templates has Kinesis::Stream', () => {
  expect(v2Stack.kinesisNestedStacks).toBeDefined();
  if (v2Stack.kinesisNestedStacks) {
    [
      v2Stack.kinesisNestedStacks.onDemandStack,
      v2Stack.kinesisNestedStacks.provisionedStack,
    ]
      .map((s) => Template.fromStack(s))
      .forEach((t) => {
        t.resourceCountIs('AWS::Kinesis::Stream', 1);
      });
  }
});

test('Each of kinesis nested templates has AWS::Kinesis::Stream with correct properties', () => {
  if (v2Stack.kinesisNestedStacks) {
    [
      v2Stack.kinesisNestedStacks.onDemandStack,
      v2Stack.kinesisNestedStacks.provisionedStack,
    ]
      .map((s) => Template.fromStack(s))
      .forEach((t) => {
        t.hasResource('AWS::Kinesis::Stream', {
          DeletionPolicy: 'Delete',
        });
      });
  }
});

test('Lambda has POWERTOOLS ENV set', () => {
  if (v2Stack.kinesisNestedStacks) {
    [
      v2Stack.kinesisNestedStacks.onDemandStack,
      v2Stack.kinesisNestedStacks.provisionedStack,
    ].forEach(stack => {
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            LOG_LEVEL: 'WARN',
            POWERTOOLS_SERVICE_NAME: 'ClickStreamAnalyticsOnAWS',
          },
        },
      });
    });
  }

});

test('Each of kinesis nested templates can handle multi subnets', () => {
  expect(v2Stack.kinesisNestedStacks).toBeDefined();
  if (v2Stack.kinesisNestedStacks) {
    [
      v2Stack.kinesisNestedStacks.onDemandStack,
      v2Stack.kinesisNestedStacks.provisionedStack,
    ]
      .map((s) => Template.fromStack(s))
      .forEach((t) => {
        t.hasResourceProperties('AWS::Lambda::Function', {
          VpcConfig: {
            SubnetIds: {
              'Fn::Split': [
                ',',
                {
                  Ref: Match.anyValue(),
                },
              ],
            },
          },
        });
      });
  }
});

test('S3DataPrefix pattern', () => {
  const param = getParameter(v2Template, 'S3DataPrefix');
  const pattern = param.AllowedPattern;
  const regex = new RegExp(`${pattern}`);
  const validValues = [
    '',
    'prefix/',
    'prefix/prefix/',
  ];

  for (const v of validValues) {
    expect(v).toMatch(regex);
  }

  const invalidValues = ['/prefix'];
  for (const v of invalidValues) {
    expect(v).not.toMatch(regex);
  }
});

test('check ACMCertificateArn pattern', () => {
  const param = getParameter(v2Template, 'ACMCertificateArn');
  const pattern = param.AllowedPattern;
  const regex = new RegExp(`${pattern}`);
  const validValues = [
    '',
    'arn:aws:acm:us-east-1:111111111111:certificate/fake',
    'arn:aws-cn:acm:cn-northwest-1:111111111111:certificate/fake',
    'arn:aws-us-gov:acm:us-gov-west-1:111111111111:certificate/fake',
  ];
  for (const v of validValues) {
    expect(v).toMatch(regex);
  }
  const invalidValues = ['abc', 'arn:aws-cx:acm:us-east-1:111111111111:certificate/fake', 'arn:aws:acme:us-east-1:111111111111:certificate/fake'];
  for (const v of invalidValues) {
    expect(v).not.toMatch(regex);
  }
});

test('check AuthenticationSecretArn pattern', () => {
  const param = getParameter(v2Template, 'AuthenticationSecretArn');
  const pattern = param.AllowedPattern;
  const regex = new RegExp(`${pattern}`);
  const validValues = [
    '',
    'arn:aws:secretsmanager:us-east-1:111111111111:secret:fake-xxxxxx',
    'arn:aws-cn:secretsmanager:cn-northwest-1:111111111111:secret:fake-xxxxxx',
    'arn:aws-us-gov:secretsmanager:us-gov-west-1:111111111111:secret:fake-xxxxxx',
    'arn:aws:secretsmanager:us-east-1:111111111111:secret:prefix/fake-xxxxxx',
  ];
  for (const v of validValues) {
    expect(v).toMatch(regex);
  }
  const invalidValues = ['abc', 'arn:aws-cx:secretsmanager:us-east-1:111111111111:secret:fake', 'arn:aws:secretsmanager:us-east-1:111111111111:certificate/fake-xxxxxx'];
  for (const v of invalidValues) {
    expect(v).not.toMatch(regex);
  }
});


test('Each of kinesis nested templates should set metrics widgets', () => {
  expect(v2Stack.kinesisNestedStacks).toBeDefined();
  if (v2Stack.kinesisNestedStacks) {
    [
      v2Stack.kinesisNestedStacks.onDemandStack,
      v2Stack.kinesisNestedStacks.provisionedStack,
    ]
      .map((s) => Template.fromStack(s))
      .forEach((t) => {
        t.hasResourceProperties('AWS::CloudFormation::CustomResource', {
          metricsWidgetsProps: {
            order: WIDGETS_ORDER.kinesisDataStream,
            projectId: Match.anyValue(),
            name: Match.anyValue(),
            description: {
              markdown: Match.anyValue(),
            },
            widgets: Match.anyValue(),
          },
        });
      });
  }
});

test('Check there are Kinesis Arn outputs in Kinesis', () => {
  const template = v2Template.toJSON();

  const kinesisArnOutput = template.Outputs && Object.keys(template.Outputs).find(key => key.indexOf('KinesisArn') !== -1);

  expect(kinesisArnOutput).toBeDefined();

});

test('Should has Parameter AppRegistryApplicationArn', () => {
  v2Template.hasParameter('AppRegistryApplicationArn', {
    Type: 'String',
  });
});

test('Should has ApplicationArnCondition', () => {
  v2Template.hasCondition('ApplicationArnCondition', {
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
  v2Template.hasResourceProperties('AWS::ServiceCatalogAppRegistry::ResourceAssociation', {
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

test('SecurityGroupIngress is added to ECS cluster SecurityGroup to allow access from ALB', () => {
  const sgIngress = findResources(v2Template, 'AWS::EC2::SecurityGroupIngress');
  let findSgIngress = false;
  for (const ingress of sgIngress) {
    if (
      ingress.Properties.FromPort == 8088 &&
      ingress.Properties.ToPort == 8088
    ) {
      findSgIngress = true;
      break;
    }
  }
  expect(findSgIngress).toBeTruthy();
});

test('Alb is internet-facing and ipv4 by default', () => {
  v2Template.hasCondition('IngestionCommonResourcesCreateApplicationLoadBalancerIsPrivateSubnets376AE3D6', {
    'Fn::Equals': [
      {
        Ref: 'PublicSubnetIds',
      },
      {
        Ref: 'PrivateSubnetIds',
      },
    ],
  });
  v2Template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    IpAddressType: 'ipv4',
    Scheme: {
      'Fn::If': ['IngestionCommonResourcesCreateApplicationLoadBalancerIsPrivateSubnets376AE3D6', 'internal', 'internet-facing'],
    },
    Subnets: {
      'Fn::If': [
        'IngestionCommonResourcesCreateApplicationLoadBalancerIsPrivateSubnets376AE3D6',
        {
          'Fn::Split': [
            ',',
            {
              Ref: 'PrivateSubnetIds',
            },
          ],
        },
        {
          'Fn::Split': [
            ',',
            {
              Ref: 'PublicSubnetIds',
            },
          ],
        },
      ],
    },
  });
});

test('Alb drop_invalid_header_fields is enabled', () => {
  const alb = findFirstResource(
    v2Template,
    'AWS::ElasticLoadBalancingV2::LoadBalancer',
  )?.resource;

  const albAttrs = alb.Properties.LoadBalancerAttributes['Fn::If'][1];

  let drop_invalid_header_fields = false;

  for (const attr of albAttrs) {
    if (attr.Key == 'routing.http.drop_invalid_header_fields.enabled') {
      drop_invalid_header_fields = attr.Value;
    }
  }
  expect(drop_invalid_header_fields).toBeTruthy();
});

test('enable Alb access log is configured', () => {
  const alb = findFirstResource(
    v2Template,
    'AWS::ElasticLoadBalancingV2::LoadBalancer',
  )?.resource;
  const albAttrs = alb.Properties.LoadBalancerAttributes['Fn::If'][1];

  let access_logs_s3_bucket = false;
  let access_logs_s3_enabled = false;

  for (const attr of albAttrs) {
    if (attr.Key == 'access_logs.s3.bucket') {
      access_logs_s3_bucket = true;
    }
    if (attr.Key == 'access_logs.s3.enabled') {
      access_logs_s3_enabled = true;
    }
  }
  expect(access_logs_s3_bucket).toBeTruthy();
  expect(access_logs_s3_enabled).toBeTruthy();
});

test('Enable Global Accelerator feature', () => {
  const accelerator = findResources(v2Template, 'AWS::GlobalAccelerator::Accelerator');

  expect(accelerator.length === 1).toBeTruthy();

  const conditionName = accelerator[0].Condition;

  const condition = findConditionByName(v2Template, conditionName);

  expect(condition['Fn::And'][0]).toEqual({
    'Fn::Equals': [
      {
        Ref: 'EnableGlobalAccelerator',
      },
      'Yes',
    ],
  });

  expect(condition['Fn::And'][1]['Fn::Not'][0]['Fn::Or'][0]).toEqual({ 'Fn::Equals': [{ Ref: 'AWS::Region' }, 'cn-north-1'] });
  expect(condition['Fn::And'][1]['Fn::Not'][0]['Fn::Or'][1]).toEqual({ 'Fn::Equals': [{ Ref: 'AWS::Region' }, 'cn-northwest-1'] });

});

test('Check security group count', () => {
  v2Template.resourceCountIs('AWS::EC2::SecurityGroup', 2);
});
