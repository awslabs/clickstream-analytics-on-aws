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

describe('Athena built-in query test', () => {
  const app = new App();
  const stack = new DataModelingAthenaStack(app, 'testAthenaStack', {});

  const template = Template.fromStack(stack);

  test('parameter and condition test', () => {
    template.hasParameter('AthenaDatabase', {});
    template.hasParameter('AthenaWorkGroup', {});
    template.hasParameter('AthenaEventTable', {});
    template.hasParameter('AthenaEventParamTable', {});
    template.hasParameter('AthenaUserTable', {});
  });

  test('Should have device query', () => {
    template.hasResourceProperties('AWS::Athena::NamedQuery', {
      Name: {
        'Fn::Join': [
          '',
          [
            'Clickstream - Device Query - ',
            {
              Ref: Match.anyValue(),
            },
          ],
        ],
      },
      Description: 'Athena SQL that queries device information',
    });
  });

  test('Should have life cycle daily query', () => {
    template.hasResourceProperties('AWS::Athena::NamedQuery', {
      Name: {
        'Fn::Join': [
          '',
          [
            'Clickstream - User Life Cycle Query(daily view) - ',
            {
              Ref: Match.anyValue(),
            },
          ],
        ],
      },
      Description: 'Athena SQL that generates user life cycle information by date',
    });
  });

  test('Should have life cycle weekly query', () => {
    template.hasResourceProperties('AWS::Athena::NamedQuery', {
      Name: {
        'Fn::Join': [
          '',
          [
            'Clickstream - User Life Cycle Query (weekly view) - ',
            {
              Ref: Match.anyValue(),
            },
          ],
        ],
      },
      Description: 'Athena SQL that generates user life cycle information by week',
    });
  });

  test('Should have events parameter query', () => {
    template.hasResourceProperties('AWS::Athena::NamedQuery', {
      Name: {
        'Fn::Join': [
          '',
          [
            'Clickstream - Events Parameter Query - ',
            {
              Ref: Match.anyValue(),
            },
          ],
        ],
      },
      Description: 'Athena SQL that queries event parameters',
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
      Description: 'Athena SQL that queries events information',
    });
  });

  test('Should have retention query', () => {
    template.hasResourceProperties('AWS::Athena::NamedQuery', {
      Name: {
        'Fn::Join': [
          '',
          [
            'Clickstream - Retention Query - ',
            {
              Ref: Match.anyValue(),
            },
          ],
        ],
      },
      Description: 'Athena SQL that calculates user retention metrics',
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
      Description: 'Athena SQL that calculates session-related metrics',
    });
  });

  test('Should have use dim query', () => {
    template.hasResourceProperties('AWS::Athena::NamedQuery', {
      Name: {
        'Fn::Join': [
          '',
          [
            'Clickstream - User Dimension Query - ',
            {
              Ref: Match.anyValue(),
            },
          ],
        ],
      },
      Description: 'Athena SQL that generates latest user information',
    });
  });

  test('Should have use attribute query', () => {
    template.hasResourceProperties('AWS::Athena::NamedQuery', {
      Name: {
        'Fn::Join': [
          '',
          [
            'Clickstream - User Attribute Query - ',
            {
              Ref: Match.anyValue(),
            },
          ],
        ],
      },
      Description: 'Athena SQL that queries users\' attributes',
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
