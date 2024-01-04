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

import { readFileSync } from 'fs';
import { App } from 'aws-cdk-lib';
import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import { DataAnalyticsRedshiftStack } from '../../../../src/data-analytics-redshift-stack';

const app = new App();
const stack = new DataAnalyticsRedshiftStack(app, 'redshiftserverlessstack', {});
const newServerlessTemplate = Template.fromStack(stack.nestedStacks.newRedshiftServerlessStack);
const stepFuncDef = readFileSync(__dirname + '/sql-execution-sfn.json', 'utf8');

test('SQL execution is created as expected', () => {
  const strCapture = new Capture();

  newServerlessTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {
    DefinitionString: strCapture,
    RoleArn: {
      'Fn::GetAtt': [
        'CreateApplicationSchemasSQLExecutionStateMachineRole303B761B',
        'Arn',
      ],
    },
  });

  expect(JSON.stringify(strCapture.asObject(), undefined, 4)).toEqual(stepFuncDef);
});

test('SQLExecutionStepFn is created as expected', () => {

  newServerlessTemplate.hasResourceProperties('AWS::Lambda::Function', {
    Architectures: [
      'arm64',
    ],
    Code: Match.anyValue(),
    Environment: {
      Variables: {
        POWERTOOLS_SERVICE_NAME: 'ClickStreamAnalyticsOnAWS',
        POWERTOOLS_LOGGER_SAMPLE_RATE: '1',
        POWERTOOLS_LOGGER_LOG_EVENT: 'true',
        LOG_LEVEL: 'WARN',
        REDSHIFT_DATA_API_ROLE: {
          'Fn::GetAtt': [
            'RedshiftServerelssWorkgroupRedshiftServerlessDataAPIRole303D0537',
            'Arn',
          ],
        },
        REDSHIFT_DATABASE: {
          Ref: Match.anyValue(),
        },
        REDSHIFT_CLUSTER_IDENTIFIER: '',
        REDSHIFT_DB_USER: '',
        REDSHIFT_SERVERLESS_WORKGROUP_NAME: {
          'Fn::GetAtt': [
            Match.anyValue(),
            'Workgroup.WorkgroupName',
          ],
        },
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
    },
    Handler: 'index.handler',
    LoggingConfig: {
      ApplicationLogLevel: 'INFO',
      LogFormat: 'JSON',
    },
    MemorySize: 256,
    Role: {
      'Fn::GetAtt': [
        'CreateApplicationSchemasSQLExecutionStepFnRoleFDEA1F59',
        'Arn',
      ],
    },
    Runtime: 'nodejs18.x',
    Timeout: 900,
  });


});


test('SQLExecutionStepFn role policy is created as expected', () => {
  newServerlessTemplate.hasResourceProperties('AWS::IAM::Policy', {

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
          Resource: {
            'Fn::GetAtt': [
              'RedshiftServerelssWorkgroupRedshiftServerlessDataAPIRole303D0537',
              'Arn',
            ],
          },
        },
        {
          Action: [
            's3:GetObject*',
            's3:GetBucket*',
            's3:List*',
          ],
          Effect: 'Allow',
          Resource: [
            {
              'Fn::Join': [
                '',
                [
                  'arn:',
                  {
                    Ref: 'AWS::Partition',
                  },
                  ':s3:::',
                  {
                    Ref: Match.anyValue(),
                  },
                ],
              ],
            },
            {
              'Fn::Join': [
                '',
                [
                  'arn:',
                  {
                    Ref: 'AWS::Partition',
                  },
                  ':s3:::',
                  {
                    Ref: Match.anyValue(),
                  },
                  '/*',
                ],
              ],
            },
          ],
        },
      ],
      Version: '2012-10-17',
    },
    PolicyName: Match.anyValue(),
    Roles: [
      {
        Ref: 'CreateApplicationSchemasSQLExecutionStepFnRoleFDEA1F59',
      },
    ],
  });

});


