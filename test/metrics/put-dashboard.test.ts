
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

process.env.AWS_REGION = 'us-east-1';
process.env.DASHBOARD_NAME = 'test-dashboard';
process.env.PROJECT_ID = 'test_proj_001';
process.env.COLUMN_NUMBER = '4';
process.env.LEGEND_POSITION = 'bottom';
process.env.SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:1111111111:metrics-alarmNotificationSnsTopic123456';

import { CloudWatchClient, ComparisonOperator, DescribeAlarmsCommand, PutDashboardCommand, PutMetricAlarmCommand, StateValue, Statistic } from '@aws-sdk/client-cloudwatch';
import { SSMClient, GetParametersByPathCommand } from '@aws-sdk/client-ssm';

import { CloudFormationCustomResourceEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import { handler } from '../../src/metrics/custom-resource/put-dashboard';
import { getMockContext } from '../common/lambda-context';

const c = getMockContext();

//@ts-ignore
const cwClientMock = mockClient(CloudWatchClient);
const ssmClientMock = mockClient(SSMClient);


beforeEach(() => {
  cwClientMock.reset();
  ssmClientMock.reset();
});

const paramValue1 = {
  name: 'lambda',
  description: {
    markdown: '## Lambda Executions',
  },
  widgets: [
    {
      type: 'alarm',
      properties: {
        alarms: [
          'arn:aws:cloudwatch:us-east-1:1111111111:alarm:Clickstream|test_alarm1',
          'arn:aws:cloudwatch:us-east-1:1111111111:alarm:Clickstream|test_alarm2',
        ],
      },
    },
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
          [
            'AWS/Kinesis',
            'PutRecords.FailedRecords',
            'StreamName',
            'testStreamName',
          ],
        ],
        title: 'Kinesis Throttled and Failed Records',
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
  total: 1,
  index: 1,
};


const paramValue2 = {
  name: 'kinesisDataStream',
  description: {
    markdown: '## Kinesis Data Stream',
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

  ],
  projectId: 'test_proj_001',
  order: '250',
  total: 2,
  index: 1,
};


const paramValue3 = {
  name: 'kinesisDataStream',
  description: {
    markdown: '## Kinesis Data Stream',
  },
  widgets: [

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

  ],
  projectId: 'test_proj_001',
  order: '250',
  total: 2,
  index: 2,
};


const dashboardBody =
{
  start: '-PT12H',
  periodOverride: 'inherit',
  widgets: [
    {
      type: 'text',
      x: 0,
      y: 0,
      width: 24,
      height: 1,
      properties: {
        markdown: '## Lambda Executions',
      },
    },
    {
      type: 'alarm',
      properties: {
        alarms: [
          'arn:aws:cloudwatch:us-east-1:1111111111:alarm:Clickstream|test_alarm1',
          'arn:aws:cloudwatch:us-east-1:1111111111:alarm:Clickstream|test_alarm2',
        ],
      },
      x: 0,
      y: 1,
      width: 6,
      height: 6,
    },
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
          [
            'AWS/Kinesis',
            'PutRecords.FailedRecords',
            'StreamName',
            'testStreamName',
          ],
        ],
        title: 'Kinesis Throttled and Failed Records',
        region: 'us-east-1',
        legend: {
          position: 'bottom',
        },
      },
      x: 6,
      y: 1,
      width: 6,
      height: 6,
    },
    {
      type: 'metric',
      properties: {
        period: 60,
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
        region: 'us-east-1',
        legend: {
          position: 'bottom',
        },
      },
      x: 12,
      y: 1,
      width: 6,
      height: 6,
    },
    {
      type: 'metric',
      properties: {
        period: 60,
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
        region: 'us-east-1',
        legend: {
          position: 'bottom',
        },
      },
      x: 18,
      y: 1,
      width: 6,
      height: 6,
    },
    {
      type: 'metric',
      properties: {
        period: 60,
        stat: 'Sum',
        view: 'gauge',
        yAxis: {
          left: {
            min: 0,
            max: 100,
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
              visible: false,
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
              visible: false,
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
        region: 'us-east-1',
        legend: {
          position: 'bottom',
        },
      },
      x: 0,
      y: 7,
      width: 6,
      height: 6,
    },
    {
      type: 'text',
      properties: {
        markdown: '',
        background: 'transparent',
      },
      x: 6,
      y: 7,
      width: 6,
      height: 6,
    },
    {
      type: 'text',
      properties: {
        markdown: '',
        background: 'transparent',
      },
      x: 12,
      y: 7,
      width: 6,
      height: 6,
    },
    {
      type: 'text',
      properties: {
        markdown: '',
        background: 'transparent',
      },
      x: 18,
      y: 7,
      width: 6,
      height: 6,
    },
    {
      type: 'text',
      x: 0,
      y: 8,
      width: 24,
      height: 1,
      properties: {
        markdown: '## Kinesis Data Stream',
      },
    },
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
        region: 'us-east-1',
        legend: {
          position: 'bottom',
        },
      },
      x: 0,
      y: 9,
      width: 6,
      height: 6,
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
        region: 'us-east-1',
        legend: {
          position: 'bottom',
        },
      },
      x: 6,
      y: 9,
      width: 6,
      height: 6,
    },
    {
      type: 'text',
      properties: {
        markdown: '',
        background: 'transparent',
      },
      x: 12,
      y: 9,
      width: 6,
      height: 6,
    },
    {
      type: 'text',
      properties: {
        markdown: '',
        background: 'transparent',
      },
      x: 18,
      y: 9,
      width: 6,
      height: 6,
    },
  ],
};

const allAlarms1 = {
  NextToken: 'next',
  $metadata: {
    httpStatusCode: 200,
    requestId: '5146250d-5cc3-45d3-87e2-c5a376b5e839',
    attempts: 1,
    totalRetryDelay: 0,
  },
  CompositeAlarms: [],
  MetricAlarms: [
    {
      AlarmName: 'Clickstream|test_project_007 ECS Cluster CPUUtilization cae00c80',
      AlarmArn: 'arn:aws:cloudwatch:us-east-1:1111111111:alarm:Clickstream|test_project_007 ECS Cluster CPUUtilization cae00c80',
      AlarmDescription: 'ECS Cluster CPUUtilization more than 85%',
      ActionsEnabled: true,
      OKActions: [
      ],
      AlarmActions: [
      ],
      InsufficientDataActions: [],
      StateValue: 'OK',
      MetricName: 'CPUUtilization',
      Namespace: 'AWS/ECS',
      Statistic: 'Average',
      Dimensions: [
        {
          Name: 'ClusterName',
          Value: 'ClusterName1',
        },
      ],
      Period: 300,
      EvaluationPeriods: 1,
      Threshold: 85,
      ComparisonOperator: 'GreaterThanThreshold',
    },

    {
      AlarmName: 'Clickstream|test_project_007 Upsert users workflow e868eaa0',
      AlarmArn: 'arn:aws:cloudwatch:us-east-1:1111111111:alarm:Clickstream|test_project_007 Upsert users workflow e868eaa0',
      AlarmDescription: 'Upsert users workflow failed',
      ActionsEnabled: true,
      OKActions: [
        'arn:aws:sns:us-east-1:1111111111:metrics-alarmNotificationSnsTopic123456',
      ],
      AlarmActions: [
        'arn:aws:sns:us-east-1:1111111111:metrics-alarmNotificationSnsTopic123456',
      ],
      InsufficientDataActions: [],
      StateValue: 'OK',
      MetricName: 'ExecutionsFailed',
      Namespace: 'AWS/States',
      Statistic: 'Sum',
      Dimensions: [
        {
          Name: 'StateMachineArn',
          Value: 'StateMachineArn1',
        },
      ],
      Period: 86400,
      EvaluationPeriods: 1,
      Threshold: 1,
      ComparisonOperator: 'GreaterThanOrEqualToThreshold',
    },
  ],
};

const allAlarms2 = {
  $metadata: {
    httpStatusCode: 200,
    requestId: '5146250d-5cc3-45d3-87e2-c5a376b5e839',
    attempts: 1,
    totalRetryDelay: 0,
  },
  CompositeAlarms: [],
  MetricAlarms: [
    {
      AlarmName: 'Clickstream|test_project_007 Upsert users workflow e868eaa0',
      AlarmArn: 'arn:aws:cloudwatch:us-east-1:1111111111:alarm:Clickstream|test_project_007 Upsert users workflow e868eaa0',
      AlarmDescription: 'Upsert users workflow failed',
      ActionsEnabled: true,
      OKActions: [
        'arn:aws:sns:us-east-1:1111111111:metrics-alarmNotificationSnsTopic123456',
      ],
      AlarmActions: [

      ],
      InsufficientDataActions: [],
      StateValue: StateValue.OK,
      StateReason: 'Threshold Crossed: 1 datapoint [0.0 (23/05/23 01:02:00)] was not greater than or equal to the threshold (1.0).',
      MetricName: 'ExecutionsFailed',
      Namespace: 'AWS/States',
      Statistic: Statistic.Sum,
      Dimensions: [
        {
          Name: 'StateMachineArn',
          Value: 'StateMachineArn1',
        },
      ],
      Period: 86400,
      EvaluationPeriods: 1,
      Threshold: 1,
      ComparisonOperator: ComparisonOperator.GreaterThanOrEqualToThreshold,
    },
  ],
};

test('Can put dashboard with alarms - Create', async () => {
  const event: CloudFormationCustomResourceEvent = {
    RequestType: 'Create',
    ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
    ResponseURL:
      'https://cloudformation-custom-resource-response-useast1.s3.amazonaws.com/testUrl',
    StackId:
      'arn:aws:cloudformation:us-east-1:111111111111:stack/test/54bce910-a6c8-11ed-8ff3-1212426f2299',
    RequestId: '6ffb9981-d1af-4177-aac1-34e11cdcccd8',
    LogicalResourceId: 'create-test-custom-resource',
    ResourceType: 'AWS::CloudFormation::CustomResource',
    ResourceProperties: {
      ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',

    },
  };

  ssmClientMock.on(GetParametersByPathCommand).resolvesOnce({
    NextToken: 'nextToken',
    Parameters: [
      {
        Name: 'test1',
        Value: JSON.stringify(paramValue1),
      },
    ],
  }).resolvesOnce({
    NextToken: 'nextToken',
    Parameters: [
      {
        Name: 'test2',
        Value: JSON.stringify(paramValue2),
      },
    ],
  },
  ).resolvesOnce({
    Parameters: [
      {
        Name: 'test3',
        Value: JSON.stringify(paramValue3),
      },
    ],
  });

  cwClientMock.on(DescribeAlarmsCommand).resolvesOnce(allAlarms1 as any).resolvesOnce(allAlarms2);

  await handler(event, c);
  expect(cwClientMock).toHaveReceivedCommandTimes(PutDashboardCommand, 1);
  expect(cwClientMock).toHaveReceivedCommandWith(PutDashboardCommand, {
    DashboardName: 'test-dashboard',
    DashboardBody: JSON.stringify(dashboardBody),
  });

  expect(cwClientMock).toHaveReceivedCommandTimes(PutMetricAlarmCommand, allAlarms1.MetricAlarms.length - 1 + allAlarms2.MetricAlarms.length);
  expect(cwClientMock).toHaveReceivedNthCommandWith(3, PutMetricAlarmCommand,
    {
      ActionsEnabled: true,
      AlarmActions: ['arn:aws:sns:us-east-1:1111111111:metrics-alarmNotificationSnsTopic123456'],
      AlarmDescription: 'ECS Cluster CPUUtilization more than 85%',
      AlarmName: 'Clickstream|test_project_007 ECS Cluster CPUUtilization cae00c80',
      ComparisonOperator: 'GreaterThanThreshold',
      Dimensions: [{
        Name: 'ClusterName',
        Value: 'ClusterName1',
      }],
      EvaluationPeriods: 1,
      InsufficientDataActions: [],
      MetricName: 'CPUUtilization',
      Namespace: 'AWS/ECS',
      OKActions: ['arn:aws:sns:us-east-1:1111111111:metrics-alarmNotificationSnsTopic123456'],
      Period: 300,
      Statistic: 'Average',
      Threshold: 85,
    },
  );
});


test('Can put dashboard without alarms - Create', async () => {
  const event: CloudFormationCustomResourceEvent = {
    RequestType: 'Create',
    ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
    ResponseURL:
      'https://cloudformation-custom-resource-response-useast1.s3.amazonaws.com/testUrl',
    StackId:
      'arn:aws:cloudformation:us-east-1:111111111111:stack/test/54bce910-a6c8-11ed-8ff3-1212426f2299',
    RequestId: '6ffb9981-d1af-4177-aac1-34e11cdcccd8',
    LogicalResourceId: 'create-test-custom-resource',
    ResourceType: 'AWS::CloudFormation::CustomResource',
    ResourceProperties: {
      ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',

    },
  };

  ssmClientMock.on(GetParametersByPathCommand).resolvesOnce({
    Parameters: [
      {
        Name: 'test3',
        Value: JSON.stringify(paramValue3),
      },
    ],
  });

  await handler(event, c);
  expect(cwClientMock).toHaveReceivedCommandTimes(PutDashboardCommand, 1);
  expect(cwClientMock).toHaveReceivedCommandTimes(PutMetricAlarmCommand, 0);
  expect(cwClientMock).toHaveReceivedCommandTimes(DescribeAlarmsCommand, 0);

});

test('No action - Delete', async () => {

  //@ts-ignore
  const event: CloudFormationCustomResourceEvent = {
    RequestType: 'Delete',
    ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
    ResponseURL:
      'https://cloudformation-custom-resource-response-useast1.s3.amazonaws.com/testUrl',
    StackId:
      'arn:aws:cloudformation:us-east-1:111111111111:stack/test/54bce910-a6c8-11ed-8ff3-1212426f2299',
    RequestId: '6ffb9981-d1af-4177-aac1-34e11cdcccd8',
    LogicalResourceId: 'create-test-custom-resource',
    ResourceType: 'AWS::CloudFormation::CustomResource',
    ResourceProperties: {
      ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',

    },
  };

  await handler(event, c);
  expect(cwClientMock).toHaveReceivedCommandTimes(PutDashboardCommand, 0);
  expect(cwClientMock).toHaveReceivedCommandTimes(PutMetricAlarmCommand, 0);
});


test('Put dashboard can be triggered by cloudwatch ssm update(Parameter Store Change) event', async () => {
  const event = {
    'version': '0',
    'id': '37431cfd-db5b-762c-4350-b9021c865c34',
    'detail-type': 'Parameter Store Change',
    'source': 'aws.ssm',
    'account': '111111111',
    'time': '2023-05-10T03:01:23Z',
    'region': 'us-east-1',
    'resources': [
      'arn:aws:ssm:us-east-1:111111111:parameter/Clickstream/metrics/test_proj_001/teststackid001/redshiftServerless/1',
    ],
    'detail': {
      name: '/Clickstream/metrics/test_proj_001/teststackid001/redshiftServerless/1',
      description: 'Clickstream Metrics test_proj_001',
      type: 'String',
      operation: 'Update',
    },
  };

  ssmClientMock.on(GetParametersByPathCommand).resolvesOnce({
    NextToken: 'nextToken',
    Parameters: [
      {
        Name: '/Clickstream/metrics/test_proj_001/teststackid001/redshiftServerless/1',
        Value: JSON.stringify(paramValue1),
      },
    ],
  }).resolvesOnce({
    NextToken: 'nextToken',
    Parameters: [
      {
        Name: '/Clickstream/metrics/test_proj_001/teststackid001/redshiftServerless/2',
        Value: JSON.stringify(paramValue2),
      },
    ],
  },
  ).resolvesOnce({
    Parameters: [
      {
        Name: '/Clickstream/metrics/test_proj_001/teststackid001/redshiftServerless/3',
        Value: JSON.stringify(paramValue3),
      },
    ],
  });
  cwClientMock.on(DescribeAlarmsCommand).resolves(allAlarms2 as any);

  await handler(event, c);
  expect(cwClientMock).toHaveReceivedCommandTimes(PutDashboardCommand, 1);
  expect(cwClientMock).toHaveReceivedCommandWith(PutDashboardCommand, {
    DashboardName: 'test-dashboard',
    DashboardBody: JSON.stringify(dashboardBody),
  });
  expect(cwClientMock).toHaveReceivedCommandTimes(PutMetricAlarmCommand, 0);

});


test('Ssm update(Parameter Store Change) event is ignored with unexpected name', async () => {
  const event = {
    'version': '0',
    'id': '37431cfd-db5b-762c-4350-b9021c865c34',
    'detail-type': 'Parameter Store Change',
    'source': 'aws.ssm',
    'account': '111111111',
    'time': '2023-05-10T03:01:23Z',
    'region': 'us-east-1',
    'resources': [
      'arn:aws:ssm:us-east-1:111111111:parameter/Clickstream/metrics/test_proj_001/redshiftServerless/1',
    ],
    'detail': {
      name: '/Clickstream/metrics/test_proj_001/teststackid001/redshiftServerless/2',
      description: 'Clickstream Metrics test_proj_001',
      type: 'String',
      operation: 'Update',
    },
  };
  await handler(event, c);
  expect(cwClientMock).toHaveReceivedCommandTimes(PutDashboardCommand, 0);
});

