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
import { DataModelingAthenaStack } from '../../../src/data-modeling-athena-stack';

if (process.env.CI !== 'true') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  jest.mock('aws-cdk-lib/aws-lambda-nodejs', () => require('../../cdk-lambda-nodejs-mock'));
}

describe('Athena built-in query test', () => {
  const app = new App();
  const stack = new DataModelingAthenaStack(app, 'testAthenaStack', {});

  const template = Template.fromStack(stack);

  test('parameter and condition test', () => {
    template.hasParameter('AthenaDatabase', {});
    template.hasParameter('AthenaWorkGroup', {});
    template.hasParameter('AthenaEventTable', {});
    template.hasParameter('AthenaSessionTable', {});
    template.hasParameter('AthenaUserTable', {});
    template.hasParameter('AthenaItemTable', {});
    template.hasParameter('AppRegistryApplicationArn', {});
  });

  test('Should have event-user-session query', () => {
    template.hasResourceProperties('AWS::Athena::NamedQuery', {
      Name: {
        'Fn::Join': [
          '',
          [
            'Clickstream - All Data Query - ',
            {
              Ref: Match.anyValue(),
            },
          ],
        ],
      },
      Description: 'Athena SQL that queries event,user and session information',
    });
  });

  test('Should have events query', () => {
    template.hasResourceProperties('AWS::Athena::NamedQuery', {
      Name: {
        'Fn::Join': [
          '',
          [
            'Clickstream - Event Query - ',
            {
              Ref: Match.anyValue(),
            },
          ],
        ],
      },
      Description: 'Athena SQL that queries event information',
    });
  });

  test('Should have session query', () => {
    template.hasResourceProperties('AWS::Athena::NamedQuery', {
      Name: {
        'Fn::Join': [
          '',
          [
            'Clickstream - Session Query - ',
            {
              Ref: Match.anyValue(),
            },
          ],
        ],
      },
      Description: 'Athena SQL that queries session-related metrics',
    });
  });

  test('Should have user query', () => {
    template.hasResourceProperties('AWS::Athena::NamedQuery', {
      Name: {
        'Fn::Join': [
          '',
          [
            'Clickstream - User Query - ',
            {
              Ref: Match.anyValue(),
            },
          ],
        ],
      },
      Description: 'Athena SQL that queries user information',
    });
  });

  test('Should have item query', () => {
    template.hasResourceProperties('AWS::Athena::NamedQuery', {
      Name: {
        'Fn::Join': [
          '',
          [
            'Clickstream - Item Query - ',
            {
              Ref: Match.anyValue(),
            },
          ],
        ],
      },
      Description: 'Athena SQL that queries item information',
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
});
