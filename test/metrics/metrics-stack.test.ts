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


