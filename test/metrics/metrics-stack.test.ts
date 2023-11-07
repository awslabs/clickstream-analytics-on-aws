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
import { PARAMETERS_DESCRIPTION } from '../../src/metrics/settings';
import { MetricsStack } from '../../src/metrics-stack';

const app = new App();
const stack = new MetricsStack(app, 'test-stack');
const template = Template.fromStack(stack);


test('Should has Parameter ProjectId', () => {
  template.hasParameter('ProjectId', {
    Type: 'String',
  });
});


test('Should has Parameter ColumnNumber', () => {
  template.hasParameter('ColumnNumber', {
    Type: 'Number',
    Default: '4',
    MinValue: 1,
  });
});


test('Should has Parameter LegendPosition', () => {
  template.hasParameter('LegendPosition', {
    Type: 'String',
    Default: 'bottom',
    AllowedValues: [
      'right',
      'bottom',
      'hidden',
    ],
  });
});


test('Should has Parameter Emails', () => {
  template.hasParameter('Emails', {
    Type: 'CommaDelimitedList',
    Default: '',
    AllowedPattern: '(^\\w+([-+.]\\w+)*@\\w+([-.]\\w+)*\\.\\w+([-.]\\w+)*$)?',
  });
});

test('has Events::Rule', () => {
  template.hasResourceProperties('AWS::Events::Rule', {
    EventPattern: {
      'source': [
        'aws.ssm',
      ],
      'detail-type': [
        'Parameter Store Change',
      ],
      'detail': {
        description: [
          {
            'Fn::Join': [
              '',
              [
                `${PARAMETERS_DESCRIPTION} `,
                {
                  Ref: 'ProjectId',
                },
              ],
            ],
          },
        ],
      },
    },
  });

});

test('has Dashboard', () => {
  template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
    DashboardBody: '{"start":"-PT12H","periodOverride":"auto","widgets":[]}',
  });
});


test('has lambda Function to put dashbaord', () => {
  template.hasResourceProperties('AWS::Lambda::Function', {
    Environment: {
      Variables: {
        DASHBOARD_NAME: {
          Ref: Match.anyValue(),
        },
        PROJECT_ID: {
          Ref: 'ProjectId',
        },
        LEGEND_POSITION: {
          Ref: 'LegendPosition',
        },
        COLUMN_NUMBER: {
          Ref: 'ColumnNumber',
        },
      },
    },
  });
});


test('has lambda Function to create SNS subscriptions for emails', () => {
  template.hasResourceProperties('AWS::Lambda::Function', {
    Environment: {
      Variables: {
        EMAILS: {
          'Fn::Join': [
            ',',
            {
              Ref: 'Emails',
            },
          ],
        },
      },
    },
  });
});

test('has SNS topic', () => {
  template.hasResourceProperties('AWS::SNS::Topic', {
    DisplayName: {
      'Fn::Join': [
        '',
        [
          'Clickstream alarms notification [project:',
          {
            Ref: 'ProjectId',
          },
          ']',
        ],
      ],
    },
    KmsMasterKeyId: {
      'Fn::GetAtt': [
        Match.anyValue(),
        'Arn',
      ],
    },
  });
});


test('has SNS TopicPolicy', () => {
  template.hasResourceProperties('AWS::SNS::TopicPolicy', {
    PolicyDocument: {
      Statement: [
        {
          Action: 'sns:Publish',
          Effect: 'Allow',
          Principal: {
            Service: 'cloudwatch.amazonaws.com',
          },
          Resource: {
            Ref: Match.anyValue(),
          },
          Sid: '0',
        },
      ],
      Version: '2012-10-17',
    },
    Topics: [
      {
        Ref: Match.anyValue(),
      },
    ],
  });
});


test('has Key for cloudwatch to Decrypt', () => {
  template.hasResourceProperties('AWS::KMS::Key', {
    KeyPolicy: {
      Statement: [
        {
          Action: 'kms:*',
          Effect: 'Allow',
          Principal: {
            AWS: {
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
                  ':root',
                ],
              ],
            },
          },
          Resource: '*',
        },
        {
          Action: [
            'kms:Decrypt',
            'kms:GenerateDataKey*',
          ],
          Effect: 'Allow',
          Principal: {
            Service: 'cloudwatch.amazonaws.com',
          },
          Resource: '*',
        },
      ],
      Version: '2012-10-17',
    },
    EnableKeyRotation: true,
  });
});

test('Should has ApplicationArnCondition', () => {
  template.hasCondition('ApplicationArnCondition', {
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
  template.hasResourceProperties('AWS::ServiceCatalogAppRegistry::ResourceAssociation', {
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
