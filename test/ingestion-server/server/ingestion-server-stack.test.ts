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
import { IngestionServerStack } from '../../../src/ingestion-server-stack';

function findResourceByCondition(template: Template, condition: string) {
  const allResources = template.toJSON().Resources;
  for (const key of Object.keys(allResources)) {
    const resource = allResources[key];
    if (resource.Condition == condition) {
      return resource;
    }
  }
  return;
}

function getParameter(template: Template, param: string) {
  return template.toJSON().Parameters[param];
}

function getParameterNamesFromParameterObject(paramObj: any) : string[] {
  const allParams: string[] = [];
  for ( const k of Object.keys(paramObj) ) {
    allParams.push( paramObj[k].Ref );
  }
  return allParams;
}

const app = new App();
const stack = new IngestionServerStack(app, 'test-stack');
const template = Template.fromStack(stack);

test('Has Parameter VpcId', () => {
  template.hasParameter('VpcId', {
    Type: 'AWS::EC2::VPC::Id',
  });
});

test('Has Parameter PublicSubnetIds', () => {
  template.hasParameter('PublicSubnetIds', {
    Type: 'String',
  });
});

test('PublicSubnetIds pattern', () => {
  const param = getParameter(template, 'PublicSubnetIds');
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


test('Has Parameter PrivateSubnetIds', () => {
  template.hasParameter('PrivateSubnetIds', {
    Type: 'String',
  });
});


test('PrivateSubnetIds pattern', () => {
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


test('Has Parameter HostedZoneId', () => {
  template.hasParameter('HostedZoneId', {
    Type: 'AWS::Route53::HostedZone::Id',
  });
});

test('Has Parameter HostedZoneName', () => {
  template.hasParameter('HostedZoneName', {
    Type: 'String',
  });
});


test('HostedZoneName pattern', () => {
  const param = getParameter(template, 'HostedZoneName');
  const pattern = param.AllowedPattern;
  const regex = new RegExp(`${pattern}`);
  const validValues = [
    'abc.com',
    'test.abc.com',
    '123.test.abc.com',
    'a123#~&%.test-2.a_bc.com',
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


test('Has Parameter ServerEndpointPath', () => {
  template.hasParameter('ServerEndpointPath', {
    Type: 'String',
    Default: '/collect',
  });
});


test('ServerEndpointPath pattern', () => {
  const param = getParameter(template, 'ServerEndpointPath');
  const pattern = param.AllowedPattern;
  const regex = new RegExp(`${pattern}`);
  const validValues = [
    '/a',
    '/a_b',
    '/a1',
    '/123',
    '/a/ab#',
    '/a/ab&',
  ];

  for (const v of validValues) {
    expect(v).toMatch(regex);
  }

  const invalidValues = [
    'a/b',
    '*',
    'a',
    'collect',
  ];
  for (const v of invalidValues) {
    expect(v).not.toMatch(regex);
  }
});

test('Has Parameter serverCorsOrigin', () => {
  template.hasParameter('ServerCorsOrigin', {
    Type: 'String',
    Default: '*',
  });
});


test('ServerCorsOrigin pattern', () => {
  const param = getParameter(template, 'ServerCorsOrigin');
  const pattern = param.AllowedPattern;
  const regex = new RegExp(`${pattern}`);
  const validValues = [
    '*',
    '*.test.com',
    'abc.test.com',
    'abc1.test.com, abc2.test.com, abc3.test.com',
    'abc1.test.com,abc2.test.com',
  ];

  for (const v of validValues) {
    expect(v).toMatch(regex);
  }

  const invalidValues = [
    'a',
    'abc1.test.com; abc2.test.com',
  ];
  for (const v of invalidValues) {
    expect(v).not.toMatch(regex);
  }
});

test('Has Parameter Protocol', () => {
  template.hasParameter('Protocol', {
    Type: 'String',
    Default: 'HTTP',
  });
});

test('Has Parameter EnableApplicationLoadBalancerAccessLog', () => {
  template.hasParameter('EnableApplicationLoadBalancerAccessLog', {
    Type: 'String',
    Default: 'No',
  });
});

test('Has Parameter LogS3Bucket', () => {
  template.hasParameter('LogS3Bucket', {
    Type: 'String',
    Default: '',
  });
});

test('Has Parameter LogS3Prefix', () => {
  template.hasParameter('LogS3Prefix', {
    Type: 'String',
    Default: 'ingestion-server-log',
  });
});

test('Has Parameter NotificationsTopicArn', () => {
  template.hasParameter('NotificationsTopicArn', {
    Type: 'String',
    Default: '',
  });
});

test('Has Parameter SinkToKafka', () => {
  template.hasParameter('SinkToKafka', {
    Type: 'String',
    Default: 'Yes',
  });
});

test('Has Parameter KafkaBrokers', () => {
  template.hasParameter('KafkaBrokers', {
    Type: 'String',
    Default: '',
  });
});


test('KafkaBrokers pattern', () => {
  const param = getParameter(template, 'KafkaBrokers');
  const pattern = param.AllowedPattern;
  const regex = new RegExp(`${pattern}`);
  const validValues = [
    'b1.test.com',
    'b1.test.com:9092',
    'b-1.test.com:9092,b-2.test.com:9092',
    'b-1.test.com:9092,b-2.test.com:9092,b-3.test.com:9092',
    '192.169.1.1:9092,192.169.1.2:9092,192.169.1.3:9092',
    '192.169.1.1,192.169.1.2,192.169.1.3',
    '192.169.1.1',
    '192.169.1.1:9092,192.169.1.2',
  ];

  for (const v of validValues) {
    expect(v).toMatch(regex);
  }

  const invalidValues = [
    'a',
    'b1.test.com:abc',
  ];
  for (const v of invalidValues) {
    expect(v).not.toMatch(regex);
  }
});


test('Has Parameter KafkaTopic', () => {
  template.hasParameter('KafkaTopic', {
    Type: 'String',
    Default: '',
  });
});


test('KafkaTopic pattern', () => {
  const param = getParameter(template, 'KafkaTopic');
  const pattern = param.AllowedPattern;
  const regex = new RegExp(`${pattern}`);
  const validValues = [
    'test1',
    'test-abc.ab_ab',
    '',
  ];

  for (const v of validValues) {
    expect(v).toMatch(regex);
  }

  const invalidValues = [
    'abc%',
    'a#',
    'a,b',
  ];
  for (const v of invalidValues) {
    expect(v).not.toMatch(regex);
  }
});

test('Has Parameter MskSecurityGroupId', () => {
  template.hasParameter('MskSecurityGroupId', {
    Type: 'String',
    Default: '',
  });
});


test('MskSecurityGroupId pattern', () => {
  const param = getParameter(template, 'MskSecurityGroupId');
  const pattern = param.AllowedPattern;
  const regex = new RegExp(`${pattern}`);
  const validValues = [
    'sg-124434ab',
    'sg-ffffff',
    'sg-00000',
    '',
  ];
  for (const v of validValues) {
    expect(v).toMatch(regex);
  }

  const invalidValues = [
    'sg-test1',
    'abc',
    'mysg-12323',
  ];
  for (const v of invalidValues) {
    expect(v).not.toMatch(regex);
  }
});

test('Has Parameter MskClusterName', () => {
  template.hasParameter('MskClusterName', {
    Type: 'String',
    Default: '',
  });
});

test('Has Parameter RecordName', () => {
  template.hasParameter('RecordName', {
    Type: 'String',
  });
});

test('Has Parameter ServerMin', () => {
  template.hasParameter('ServerMin', {
    Type: 'Number',
    Default: '2',
  });
});

test('Has Parameter ServerMax', () => {
  template.hasParameter('ServerMax', {
    Type: 'Number',
    Default: '2',
  });
});

test('Has Parameter WarmPoolSize', () => {
  template.hasParameter('WarmPoolSize', {
    Type: 'Number',
    Default: '0',
  });
});

test('Has Parameter ScaleOnCpuUtilizationPercent', () => {
  template.hasParameter('ScaleOnCpuUtilizationPercent', {
    Type: 'Number',
    Default: '50',
  });
});


test('Has Parameter SinkToKinesis', () => {
  template.hasParameter('SinkToKinesis', {
    Type: 'String',
    Default: 'No',
  });
});

test('Has Parameter KinesisDataS3Bucket', () => {
  template.hasParameter('KinesisDataS3Bucket', {
    Type: 'String',
    Default: '',
  });
});


test('Has Parameter KinesisDataS3Prefix', () => {
  template.hasParameter('KinesisDataS3Prefix', {
    Type: 'String',
    Default: 'kinesis-data',
  });
});

test('Has Parameter KinesisStreamMode', () => {
  template.hasParameter('KinesisStreamMode', {
    Type: 'String',
    Default: 'ON_DEMAND',
  });
});


test('Has Parameter KinesisShardCount', () => {
  template.hasParameter('KinesisShardCount', {
    Type: 'Number',
    Default: '3',
  });
});


test('Has Parameter KinesisDataRetentionHours', () => {
  template.hasParameter('KinesisDataRetentionHours', {
    Type: 'Number',
    Default: '24',
    MinValue: 24,
    MaxValue: 8760,
  });
});


test('Has Parameter KinesisBatchSize', () => {
  template.hasParameter('KinesisBatchSize', {
    Type: 'Number',
    Default: '10000',
    MinValue: 1,
    MaxValue: 10000,
  });
});


test('Has Parameter KinesisMaxBatchingWindowSeconds', () => {
  template.hasParameter('KinesisMaxBatchingWindowSeconds', {
    Type: 'Number',
    Default: '300',
    MinValue: 0,
    MaxValue: 300,
  });
});


test('Has Nest Stack with all parameters', () => {
  const nestStack = findResourceByCondition(
    template,
    'IngestionServerM1211111Condition',
  );
  expect(nestStack).toBeDefined();

  const exceptedParams = [
    'MskSecurityGroupId',
    'ServerMax',
    'ServerMin',
    'WarmPoolSize',
    'NotificationsTopicArn',
    'PrivateSubnetIds',
    'ServerEndpointPath',
    'ServerCorsOrigin',
    'KafkaBrokers',
    'KafkaTopic',
    'MskClusterName',
    'VpcId',
    'RecordName',
    'HostedZoneName',
    'HostedZoneId',
    'LogS3Bucket',
    'LogS3Prefix',
    'PublicSubnetIds',
    'ScaleOnCpuUtilizationPercent',
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
  expect(templateParams.length).toEqual(exceptedParams.length + 1);

});

test('Has ParameterGroups', () => {
  const cfnInterface = template.toJSON().Metadata['AWS::CloudFormation::Interface'];
  expect(cfnInterface.ParameterGroups).toBeDefined();

  const paramCount = Object.keys(cfnInterface.ParameterLabels).length;
  expect(paramCount).toEqual(30);
});


test('Has Nest Stack with minimum parameters', () => {
  const nestStack = findResourceByCondition(
    template,
    'IngestionServerM1000000Condition',
  );
  expect(nestStack).toBeDefined();

  const exceptedParams = [
    'ServerMax',
    'ServerMin',
    'WarmPoolSize',
    'PrivateSubnetIds',
    'ServerEndpointPath',
    'ServerCorsOrigin',
    'KafkaBrokers',
    'KafkaTopic',
    'VpcId',
    'RecordName',
    'HostedZoneName',
    'HostedZoneId',
    'PublicSubnetIds',
    'ScaleOnCpuUtilizationPercent',
  ];

  const templateParams = Object.keys(nestStack.Properties.Parameters).map(
    (pk) => {
      return nestStack.Properties.Parameters[pk].Ref;
    },
  );
  for (const ep of exceptedParams) {
    expect(templateParams.includes(ep)).toBeTruthy();
  }
});

test('Conditions are created as expected', () => {
  const conditionObj = template.toJSON().Conditions;
  const allConditions = Object.keys(conditionObj)
    .filter((ck) => ck.startsWith('IngestionServer'))
    .map((ck) => {
      return {
        cItems: (conditionObj[ck]['Fn::And'] as any[]).map(
          (it) => it.Condition,
        ),
        cKey: ck,
      };
    });

  for (const c of allConditions) {
    const binStr = c.cItems
      .map(it => {
        if ((it as string).endsWith('Neg') ) {
          return 0;
        } else if ((it as string) === 'onDemandStackCondition') {
          return 2;
        } else {
          return 1;
        }
      })
      .join('');

    expect(c.cKey.indexOf(`${binStr}Condition`) > 0).toBeTruthy();
  }
});

test('Has all neg condition', () => {
  const conditionObj = template.toJSON().Conditions;
  const conds = (
    conditionObj.IngestionServerM1000000Condition['Fn::And'] as any[]
  ).map((c) => c.Condition);
  const expectedConds = [
    'sinkToKafkaCondition',
    'sinkToKinesisConditionNeg',
    'enableAccessLogConditionNeg',
    'protocolHttpsConditionNeg',
    'notificationsTopicArnConditionNeg',
    'mskSecurityGroupIdConditionNeg',
    'mskClusterNameConditionNeg',
  ];
  expect(conds).toEqual(expectedConds);
});

test('Has all pos condition provisionedStackCondition', () => {
  const conditionObj = template.toJSON().Conditions;
  const conds = (
    conditionObj.IngestionServerM1111111Condition['Fn::And'] as any[]
  ).map((c) => c.Condition);
  const expectedConds = [
    'sinkToKafkaCondition',
    'provisionedStackCondition',
    'enableAccessLogCondition',
    'protocolHttpsCondition',
    'notificationsTopicArnCondition',
    'mskSecurityGroupIdCondition',
    'mskClusterNameCondition',
  ];
  expect(conds).toEqual(expectedConds);
});

test('Has all pos condition - onDemandStackCondition', () => {
  const conditionObj = template.toJSON().Conditions;
  const conds = (
    conditionObj.IngestionServerM1211111Condition['Fn::And'] as any[]
  ).map((c) => c.Condition);
  const expectedConds = [
    'sinkToKafkaCondition',
    'onDemandStackCondition',
    'enableAccessLogCondition',
    'protocolHttpsCondition',
    'notificationsTopicArnCondition',
    'mskSecurityGroupIdCondition',
    'mskClusterNameCondition',
  ];
  expect(conds).toEqual(expectedConds);
});

test('Rule logS3BucketAndEnableLogRule', () => {
  const assert = template.toJSON().Rules.logS3BucketAndEnableLogRule.Assertions[0].Assert;

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


test('Rule sinkToKinesisRule', () => {
  const assert = template.toJSON().Rules.sinkToKinesisRule.Assertions[0].Assert;

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
                Ref: 'SinkToKinesis',
              },
              'Yes',
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
        eq: [
          {
            Ref: 'SinkToKinesis',
          },
          'No',
        ],
      },
    ],
  };
  expect(JSON.parse(assertStr)).toEqual(expectedAssert);
});


test('Parameters of onDemand Kinesis nested stack ', () => {
  const paramCapture = new Capture();
  template.hasResource('AWS::CloudFormation::Stack', {
    Condition: 'onDemandStackCondition',
    Properties: {
      Parameters: paramCapture,
    },
  });
  const paramObj = paramCapture.asObject();
  const params = getParameterNamesFromParameterObject(paramObj);
  expect(params).toEqual([
    'KinesisDataRetentionHours', 'VpcId', 'KinesisDataS3Bucket', 'KinesisDataS3Prefix', 'PrivateSubnetIds', 'KinesisBatchSize', 'KinesisMaxBatchingWindowSeconds',
  ]);
});


test('Parameters of provisioned Kinesis nested stack ', () => {
  const paramCapture = new Capture();
  template.hasResource('AWS::CloudFormation::Stack', {
    Condition: 'provisionedStackCondition',
    Properties: {
      Parameters: paramCapture,
    },
  });
  const paramObj = paramCapture.asObject();
  const params = getParameterNamesFromParameterObject(paramObj);
  expect(params).toEqual([
    'KinesisDataRetentionHours', 'KinesisShardCount', 'VpcId', 'KinesisDataS3Bucket', 'KinesisDataS3Prefix', 'PrivateSubnetIds', 'KinesisBatchSize', 'KinesisMaxBatchingWindowSeconds',
  ]);
});


test('Environment variables name are as expected for Lambda::Function in kinesis nested stack', () => {

  [Template.fromStack(stack.kinesisNestedStacks.onDemandStack),
    Template.fromStack(stack.kinesisNestedStacks.provisionedStack)].forEach(
    t => {
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
});

test('Each of kinesis nested templates has EventSourceMapping', ()=> {
  [Template.fromStack(stack.kinesisNestedStacks.onDemandStack),
    Template.fromStack(stack.kinesisNestedStacks.provisionedStack)].forEach(
    t => {
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
});


test('Each of kinesis nested templates has Kinesis::Stream', ()=> {
  [Template.fromStack(stack.kinesisNestedStacks.onDemandStack),
    Template.fromStack(stack.kinesisNestedStacks.provisionedStack)].forEach( t => {
    t.resourceCountIs('AWS::Kinesis::Stream', 1);
  } );
});

