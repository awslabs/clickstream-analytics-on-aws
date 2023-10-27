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
import { ServiceCatalogAppregistryStack } from '../../src/service-catalog-appregistry-stack';

const app = new App();
const stack = new ServiceCatalogAppregistryStack(app, 'test-service-catalog-appregistry-stack');
const template = Template.fromStack(stack);

test('Should has parameter projectId', () => {
  template.hasParameter('ProjectId', {
    Type: 'String',
    AllowedPattern: '^[a-z][a-z0-9_]{0,126}$',
  });
});

test('Should has condition to check region', () => {
  template.hasCondition('ServiceCatalogAvailableRegion', {});
});

test('Should has Service Catalog AppRegistry application', () => {
  template.hasResourceProperties('AWS::ServiceCatalogAppRegistry::Application', {
    Name: {
      'Fn::Join': [
        '-',
        [
          'clickstream-analytics',
          {
            Ref: 'ProjectId',
          },
          {
            Ref: 'AWS::Region',
          },
          {
            Ref: 'AWS::AccountId',
          },
        ],
      ],
    },
    Tags: {
      'Solutions:ApplicationType': 'AWS-Solutions',
      'Solutions:SolutionID': Match.anyValue(),
      'Solutions:SolutionName': 'Clickstream Analytics on AWS',
      'Solutions:SolutionVersion': Match.anyValue(),
    },
  });
});

test('Should has output', () => {
  template.hasOutput('ServiceCatalogAppRegistryApplicationArn', {
    Condition: 'ServiceCatalogAvailableRegion',
  });
});
