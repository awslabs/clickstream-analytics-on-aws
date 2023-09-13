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

import { Logger } from '@aws-lambda-powertools/logger';
import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { StreamingIngestionMainStack } from '../../../src/streaming-ingestion-stack';
import { RefAnyValue } from '../../utils';

const logger = new Logger();

describe('StreamingIngestionRedshiftStack lambda function test', () => {
  const app = new App();
  const testId = 'test-redshift-1';
  const stack = new StreamingIngestionMainStack(app, testId+'-StreamingIngestionMainStack', {});
  const template = Template.fromStack(stack);

  beforeEach(() => {
    logger.info(testId + template);
  });

  test('Check StreamingIngestionAssociateRoleStreamingIngestionAssociateIAMRoleFnRole', ()=>{
    if (stack.redshiftServerlessStack) {
      const nestedTemplate = Template.fromStack(stack.redshiftServerlessStack);
      nestedTemplate.hasResourceProperties('AWS::IAM::Role', {
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
          Version: '2012-10-17',
        },
      });
    }

    if (stack.redshiftProvisionedStack) {
      const nestedTemplate = Template.fromStack(stack.redshiftProvisionedStack);
      nestedTemplate.hasResourceProperties('AWS::IAM::Role', {
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
          Version: '2012-10-17',
        },
      });
    }
  });

  test('Check StreamingIngestionAssociateRoleStreamingIngestionAssociateIAMRoleFnRoleDefaultPolicy', ()=>{
    if (stack.redshiftServerlessStack) {
      const nestedTemplate = Template.fromStack(stack.redshiftServerlessStack);
      nestedTemplate.hasResourceProperties('AWS::IAM::Policy', {
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
              Action: 'iam:PassRole',
              Effect: 'Allow',
              Resource: '*',
            },
            {
              Action: 'redshift-serverless:GetWorkgroup',
              Effect: 'Allow',
              Resource: {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    RefAnyValue,
                    ':redshift-serverless:',
                    RefAnyValue,
                    ':',
                    RefAnyValue,
                    ':workgroup/*',
                  ],
                ],
              },
            },
            {
              Action: [
                'redshift-serverless:GetNamespace',
                'redshift-serverless:UpdateNamespace',
              ],
              Effect: 'Allow',
              Resource: {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    RefAnyValue,
                    ':redshift-serverless:',
                    RefAnyValue,
                    ':',
                    RefAnyValue,
                    ':namespace/*',
                  ],
                ],
              },
            },
          ],
          Version: '2012-10-17',
        },
      });
    }

    if (stack.redshiftProvisionedStack) {
      const nestedTemplate = Template.fromStack(stack.redshiftProvisionedStack);
      nestedTemplate.hasResourceProperties('AWS::IAM::Policy', {
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
              Action: 'iam:PassRole',
              Effect: 'Allow',
              Resource: '*',
            },
            {
              Action: 'redshift-serverless:GetWorkgroup',
              Effect: 'Allow',
              Resource: {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    RefAnyValue,
                    ':redshift-serverless:',
                    RefAnyValue,
                    ':',
                    RefAnyValue,
                    ':workgroup/*',
                  ],
                ],
              },
            },
            {
              Action: [
                'redshift-serverless:GetNamespace',
                'redshift-serverless:UpdateNamespace',
              ],
              Effect: 'Allow',
              Resource: {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    RefAnyValue,
                    ':redshift-serverless:',
                    RefAnyValue,
                    ':',
                    RefAnyValue,
                    ':namespace/*',
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

  test('Check StreamingIngestionAssociateRoleRedshiftServerlessAllWorkgroupPolicy', ()=>{
    if (stack.redshiftServerlessStack) {
      const nestedTemplate = Template.fromStack(stack.redshiftServerlessStack);
      nestedTemplate.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Action: 'redshift-serverless:GetWorkgroup',
              Effect: 'Allow',
              Resource: {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    RefAnyValue,
                    ':redshift-serverless:',
                    RefAnyValue,
                    ':',
                    RefAnyValue,
                    ':workgroup/*',
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

  test('Check StreamingIngestionAssociateRoleRedshiftServerlessSingleWorkgroupPolicy', ()=>{
    if (stack.redshiftServerlessStack) {
      const nestedTemplate = Template.fromStack(stack.redshiftServerlessStack);
      nestedTemplate.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Action: 'redshift-serverless:GetWorkgroup',
              Effect: 'Allow',
              Resource: {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    RefAnyValue,
                    ':redshift-serverless:',
                    RefAnyValue,
                    ':',
                    RefAnyValue,
                    ':workgroup/',
                    RefAnyValue,
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

  test('Check StreamingIngestionAssociateRoleRedshiftServerlessAllNamespacePolicy', ()=>{
    if (stack.redshiftServerlessStack) {
      const nestedTemplate = Template.fromStack(stack.redshiftServerlessStack);
      nestedTemplate.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Action: [
                'redshift-serverless:GetNamespace',
                'redshift-serverless:UpdateNamespace',
              ],
              Effect: 'Allow',
              Resource: {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    RefAnyValue,
                    ':redshift-serverless:',
                    RefAnyValue,
                    ':',
                    RefAnyValue,
                    ':namespace/*',
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

  test('Check StreamingIngestionAssociateRoleRedshiftServerlessSingleNamespacePolicy', ()=>{
    if (stack.redshiftServerlessStack) {
      const nestedTemplate = Template.fromStack(stack.redshiftServerlessStack);
      nestedTemplate.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Action: [
                'redshift-serverless:GetNamespace',
                'redshift-serverless:UpdateNamespace',
              ],
              Effect: 'Allow',
              Resource: {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    RefAnyValue,
                    ':redshift-serverless:',
                    RefAnyValue,
                    ':',
                    RefAnyValue,
                    ':namespace/',
                    RefAnyValue,
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

  test('Check CreateStreamingIngestionSchemasCreateSteamingIngestionSchemaRole', ()=>{
    if (stack.redshiftServerlessStack) {
      const nestedTemplate = Template.fromStack(stack.redshiftServerlessStack);
      nestedTemplate.hasResourceProperties('AWS::IAM::Role', {
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
          Version: '2012-10-17',
        },
      });
    }

    if (stack.redshiftProvisionedStack) {
      const nestedTemplate = Template.fromStack(stack.redshiftProvisionedStack);
      nestedTemplate.hasResourceProperties('AWS::IAM::Role', {
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
          Version: '2012-10-17',
        },
      });
    }
  });

  test('Check CreateStreamingIngestionSchemasCreateSteamingIngestionSchemaRoleDefaultPolicy', ()=>{
    if (stack.redshiftServerlessStack) {
      const nestedTemplate = Template.fromStack(stack.redshiftServerlessStack);
      nestedTemplate.hasResourceProperties('AWS::IAM::Policy', {
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
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Resource: RefAnyValue,
            },
          ],
          Version: '2012-10-17',
        },
      });
    }

    if (stack.redshiftProvisionedStack) {
      const nestedTemplate = Template.fromStack(stack.redshiftProvisionedStack);
      nestedTemplate.hasResourceProperties('AWS::IAM::Policy', {
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
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Resource: RefAnyValue,
            },
          ],
          Version: '2012-10-17',
        },
      });
    }
  });

});

describe('StreamingIngestionRedshiftMainStack custom resource test', () => {
  const app = new App();
  const testId = 'test-redshift-2';
  const stack = new StreamingIngestionMainStack(app, testId+'-StreamingIngestionMainStack', {});

  test('StreamingIngestionRedshiftMainStack has 2 CustomResource', ()=>{
    if (stack.redshiftServerlessStack) {
      Template.fromStack(stack.redshiftServerlessStack).resourceCountIs('AWS::CloudFormation::CustomResource', 2);
    }
  });

  test('Check CreateStreamingIngestionSchemasStreamingIngestionSchemasCustomResource', ()=>{
    if (stack.redshiftServerlessStack) {
      const nestedTemplate = Template.fromStack(stack.redshiftServerlessStack);
      nestedTemplate.hasResourceProperties('AWS::CloudFormation::CustomResource', {
        ServiceToken: {
          'Fn::GetAtt': [
            Match.anyValue(),
            'Arn',
          ],
        },
        projectId: RefAnyValue,
        appIds: RefAnyValue,
        stackShortId: {
          'Fn::Select': [
            0,
            {
              'Fn::Split': [
                '-',
                {
                  'Fn::Select': [
                    2,
                    {
                      'Fn::Split': [
                        '/',
                        RefAnyValue,
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        databaseName: RefAnyValue,
        dataAPIRole: RefAnyValue,
        serverlessRedshiftProps: {
          createdInStack: false,
          databaseName: RefAnyValue,
          workgroupName: RefAnyValue,
          workgroupId: RefAnyValue,
          namespaceId: RefAnyValue,
          dataAPIRoleArn: RefAnyValue,
        },
        reportingViewsDef: Match.anyValue(),
        schemaDefs: Match.anyValue(),
        streamingIngestionProps: {
          streamingIngestionRoleArn: RefAnyValue,
        },
      });
    }

    if (stack.redshiftProvisionedStack) {
      const nestedTemplate = Template.fromStack(stack.redshiftProvisionedStack);
      nestedTemplate.hasResourceProperties('AWS::CloudFormation::CustomResource', {
        ServiceToken: {
          'Fn::GetAtt': [
            Match.anyValue(),
            'Arn',
          ],
        },
        projectId: RefAnyValue,
        appIds: RefAnyValue,
        stackShortId: {
          'Fn::Select': [
            0,
            {
              'Fn::Split': [
                '-',
                {
                  'Fn::Select': [
                    2,
                    {
                      'Fn::Split': [
                        '/',
                        RefAnyValue,
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        databaseName: RefAnyValue,
        dataAPIRole: RefAnyValue,
        provisionedRedshiftProps: {
          databaseName: RefAnyValue,
          dbUser: RefAnyValue,
          clusterIdentifier: RefAnyValue,
        },
        reportingViewsDef: Match.anyValue(),
        schemaDefs: Match.anyValue(),
        streamingIngestionProps: {
          streamingIngestionRoleArn: RefAnyValue,
        },
      });
    }
  });

  test('Check StreamingIngestionAssociateRoleStreamingIngestionRedshiftAssociateIAMRoleCustomResource', ()=>{
    if (stack.redshiftServerlessStack) {
      const nestedTemplate = Template.fromStack(stack.redshiftServerlessStack);
      nestedTemplate.hasResourceProperties('AWS::CloudFormation::CustomResource', {
        ServiceToken: {
          'Fn::GetAtt': [
            Match.anyValue(),
            'Arn',
          ],
        },
        roleArn: RefAnyValue,
        serverlessRedshiftProps: {
          createdInStack: false,
          databaseName: RefAnyValue,
          workgroupName: RefAnyValue,
          workgroupId: RefAnyValue,
          namespaceId: RefAnyValue,
          dataAPIRoleArn: RefAnyValue,
        },
      });
    }

    if (stack.redshiftProvisionedStack) {
      const nestedTemplate = Template.fromStack(stack.redshiftProvisionedStack);
      nestedTemplate.hasResourceProperties('AWS::CloudFormation::CustomResource', {
        ServiceToken: {
          'Fn::GetAtt': [
            Match.anyValue(),
            'Arn',
          ],
        },
        roleArn: RefAnyValue,
        provisionedRedshiftProps: {
          databaseName: RefAnyValue,
          dbUser: RefAnyValue,
          clusterIdentifier: RefAnyValue,
        },
      });
    }
  });


});
