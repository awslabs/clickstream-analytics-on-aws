
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

import { LambdaClient, ListTagsCommand } from '@aws-sdk/client-lambda';
import { SSMClient, PutParameterCommand, GetParametersByPathCommand, DeleteParameterCommand, AddTagsToResourceCommand, ResourceTypeForTagging } from '@aws-sdk/client-ssm';

import { CloudFormationCustomResourceEvent, Context } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';

//@ts-ignore
const ssmClientMock = mockClient(SSMClient);
const lambdaClientMock = mockClient(LambdaClient);


const c: Context = {
  callbackWaitsForEmptyEventLoop: true,
  functionVersion: '$LATEST',
  functionName: 'testFn',
  memoryLimitInMB: '512',
  logGroupName: '/aws/lambda/testFn',
  logStreamName: 'testFn',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:testFn',
  awsRequestId: '0d93e702-57ad-40e6-a1c2-9f95a0087d44',
  getRemainingTimeInMillis: function (): number {
    return 1;
  },
  done: function (): void { },
  fail: function (): void { },
  succeed: function (): void { },
};


process.env.STACK_ID = 'teststackid001';

import { handler } from '../../src/metrics/custom-resource/set-metrics-widgets';

beforeEach(() => {
  ssmClientMock.reset();
  lambdaClientMock.reset();
});

const paramValueInput = {
  name: 'lambda',
  description: {
    markdown: '## Lambda Executions',
  },
  widgets: [
    {
      type: 'metric',
      properties: {
        stat: 'Sum',
        metrics: [
          [
            'AWS/Kinesis',
            'PutRecords.ThrottledRecords',
            'StreamName',
            'testStreamName',
          ],

        ],
        title: 'Kinesis ThrottledRecords',
      },
    },

    {
      type: 'metric',
      properties: {
        stat: 'Sum',
        metrics: [
          [
            'AWS/Kinesis',
            'PutRecords.FailedRecords',
            'StreamName',
            'testStreamName',
          ],
        ],
        title: 'Kinesis FailedRecords',
      },
    },

    {
      type: 'metric',
      properties: {
        period: '60',
        stat: 'Sum',
        metrics: [
          [
            'AWS/Lambda',
            'Invocations',
            'FunctionName',
            'testFnName',
          ],
        ],
        title: 'Kinesis to S3 Lambda Invocations',
      },
    },

    {
      type: 'metric',
      properties: {
        period: '60',
        stat: 'Sum',
        metrics: [
          [
            'AWS/Lambda',
            'ConcurrentExecutions',
            'FunctionName',
            'testFnName',
          ],
        ],
        title: 'Kinesis to S3 Lambda ConcurrentExecutions',
      },
    },

    {
      type: 'metric',
      properties: {
        period: '60',
        stat: 'Sum',
        metrics: [
          [
            'AWS/Lambda',
            'Errors',
            'FunctionName',
            'testFnName',
            {
              stat: 'Sum',
              color: '#d13212',
              id: 'errors',
            },
          ],
        ],
        title: 'Kinesis to S3 Lambda Error count',
      },
    },

    {
      type: 'metric',
      properties: {
        period: '60',
        stat: 'Sum',
        view: 'gauge',
        yAxis: {
          left: {
            min: '0',
            max: '100',
          },
        },
        metrics: [
          [
            'AWS/Lambda',
            'Errors',
            'FunctionName',
            'testFnName',
            {
              stat: 'Sum',
              visible: 'false',
              id: 'errors',
            },
          ],
          [
            '.',
            'Invocations',
            '.',
            '.',
            {
              stat: 'Sum',
              visible: 'false',
              id: 'invocations',
            },
          ],
          [
            {
              yAxis: 'left',
              expression: '100 - 100 * errors / MAX([errors, invocations])',
              label: 'Success rate (%)',
              id: 'availability',
            },
          ],
        ],
        title: 'Kinesis to S3 Lambda success rate (%)',
      },
    },
  ],
  projectId: 'test_proj_001',
  order: '200',
};

test('Can set parameters when Create', async () => {
  const event: CloudFormationCustomResourceEvent = {
    RequestType: 'Create',
    ServiceToken: 'lambda:token',
    ResponseURL:
      'https://cloudformation-custom-resource-response-useast1.s3.amazonaws.com/testUrl',
    StackId: 'stack/test/54bce910-a6c8-11ed-8ff3-1212426f2299',
    RequestId: '6ffb9981-d1af-4177-aac1-34e11cdcccd8',
    LogicalResourceId: 'create-test-custom-resource',
    ResourceType: 'AWS::CloudFormation::CustomResource',
    ResourceProperties: {
      ServiceToken: 'lambda:token',
      metricsWidgetsProps: paramValueInput,
    },
  };

  lambdaClientMock.on(ListTagsCommand).resolves({
    Tags: {
      tag_1_key: 'tag_1_value',
      tag_2_key: 'tag_2_value',
    },
  });

  await handler(event, c);

  expect(ssmClientMock).toHaveReceivedCommandTimes(PutParameterCommand, 1);
  expect(ssmClientMock).toHaveReceivedCommandTimes(AddTagsToResourceCommand, 1);

  const paramValue1 = JSON.stringify(
    {
      name: 'lambda',
      description: {
        markdown: '## Lambda Executions',
      },
      widgets: [
        {
          type: 'metric',
          properties: {
            stat: 'Sum',
            metrics: [
              [
                'AWS/Kinesis',
                'PutRecords.ThrottledRecords',
                'StreamName',
                'testStreamName',
              ],
            ],
            title: 'Kinesis ThrottledRecords',
          },
        },
        {
          type: 'metric',
          properties: {
            stat: 'Sum',
            metrics: [
              [
                'AWS/Kinesis',
                'PutRecords.FailedRecords',
                'StreamName',
                'testStreamName',
              ],
            ],
            title: 'Kinesis FailedRecords',
          },
        },
        {
          type: 'metric',
          properties: {
            period: '60',
            stat: 'Sum',
            metrics: [
              [
                'AWS/Lambda',
                'Invocations',
                'FunctionName',
                'testFnName',
              ],
            ],
            title: 'Kinesis to S3 Lambda Invocations',
          },
        },
        {
          type: 'metric',
          properties: {
            period: '60',
            stat: 'Sum',
            metrics: [
              [
                'AWS/Lambda',
                'ConcurrentExecutions',
                'FunctionName',
                'testFnName',
              ],
            ],
            title: 'Kinesis to S3 Lambda ConcurrentExecutions',
          },
        },
        {
          type: 'metric',
          properties: {
            period: '60',
            stat: 'Sum',
            metrics: [
              [
                'AWS/Lambda',
                'Errors',
                'FunctionName',
                'testFnName',
                {
                  stat: 'Sum',
                  color: '#d13212',
                  id: 'errors',
                },
              ],
            ],
            title: 'Kinesis to S3 Lambda Error count',
          },
        },
        {
          type: 'metric',
          properties: {
            period: '60',
            stat: 'Sum',
            view: 'gauge',
            yAxis: {
              left: {
                min: '0',
                max: '100',
              },
            },
            metrics: [
              [
                'AWS/Lambda',
                'Errors',
                'FunctionName',
                'testFnName',
                {
                  stat: 'Sum',
                  visible: 'false',
                  id: 'errors',
                },
              ],
              [
                '.',
                'Invocations',
                '.',
                '.',
                {
                  stat: 'Sum',
                  visible: 'false',
                  id: 'invocations',
                },
              ],
              [
                {
                  yAxis: 'left',
                  expression: '100 - 100 * errors / MAX([errors, invocations])',
                  label: 'Success rate (%)',
                  id: 'availability',
                },
              ],
            ],
            title: 'Kinesis to S3 Lambda success rate (%)',
          },
        },
      ],
      projectId: 'test_proj_001',
      order: '200',
      index: 1,
      total: 1,
    },
  );

  expect(ssmClientMock).toHaveReceivedNthCommandWith(1, PutParameterCommand, {
    Name: '/Clickstream/metrics/test_proj_001/teststackid001/lambda/1',
    Overwrite: true,
    Type: 'String',
    Value: paramValue1,
  });


  expect(ssmClientMock).toHaveReceivedNthCommandWith(2, AddTagsToResourceCommand, {
    Tags: [{ Key: 'tag_1_key', Value: 'tag_1_value' }, { Key: 'tag_2_key', Value: 'tag_2_value' }],
    ResourceId: '/Clickstream/metrics/test_proj_001/teststackid001/lambda/1',
    ResourceType: ResourceTypeForTagging.PARAMETER,
  });

});


test('Can delete parameters when Delete', async () => {
  //@ts-ignore
  const event: CloudFormationCustomResourceEvent = {
    RequestType: 'Delete',
    ServiceToken: 'lambdaFn',
    ResponseURL:
      'https://cloudformation-custom-resource-response-useast1.s3.amazonaws.com/testUrl',
    StackId: 'stack/test/54bce910-a6c8-11ed-8ff3-1212426f2299',
    RequestId: '6ffb9981-d1af-4177-aac1-34e11cdcccd8',
    LogicalResourceId: 'create-test-custom-resource',
    ResourceType: 'AWS::CloudFormation::CustomResource',
    ResourceProperties: {
      ServiceToken: 'lambdaFn',
      metricsWidgetsProps: paramValueInput,
    },
  };

  ssmClientMock.on(GetParametersByPathCommand).resolves({
    Parameters: [
      {
        Name: '/Clickstream/metrics/test_proj_001/teststackid001/lambda/1',
        Value: 'value 1',
      },
      {
        Name: '/Clickstream/metrics/test_proj_001/teststackid001/lambda/2',
        Value: 'value 2',
      },
    ],
  });

  await handler(event, c);
  expect(ssmClientMock).toHaveReceivedCommandTimes(DeleteParameterCommand, 2);

});


