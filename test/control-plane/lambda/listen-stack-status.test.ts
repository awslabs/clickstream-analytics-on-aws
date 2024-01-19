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

import {
  CloudFormationClient, DescribeStacksCommand, Stack, StackStatus,
} from '@aws-sdk/client-cloudformation';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeEvent, SQSEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { BuiltInTagKeys, PipelineStackType, PipelineStatusDetail } from '../../../src/common/model';
import { handler } from '../../../src/control-plane/backend/lambda/listen-stack-status';
import { CloudFormationStackStatusChangeNotificationEventDetail } from '../../../src/control-plane/backend/lambda/listen-stack-status/listen-tools';
import 'aws-sdk-client-mock-jest';

const cloudFormationMock = mockClient(CloudFormationClient);
const docMock = mockClient(DynamoDBDocumentClient);

describe('Listen CFN Stack Status Lambda Function', () => {

  const MOCK_PIPELINE_ID = '6972c135cb864885b25c5b7ebe584fdf';
  const MOCK_PROJECT_ID = '6666-6666';
  const MOCK_EXECUTION_ID = `main-${MOCK_PIPELINE_ID}-123`;

  const baseEvent: EventBridgeEvent<'CloudFormation Stack Status Change', CloudFormationStackStatusChangeNotificationEventDetail> = {
    'id': 'b1b9f9b0-1f1e-4f1f-8f1f-1f1f1f1f1f1f',
    'version': '0',
    'account': '0',
    'time': '2021-09-01T00:00:00Z',
    'region': 'ap-southeast-1',
    'detail-type': 'CloudFormation Stack Status Change',
    'detail': {
      'stack-id': `arn:aws:cloudformation:ap-southeast-1:555555555555:stack/Clickstream-Ingestion-kafka-${MOCK_PIPELINE_ID}/5b6971e0-f261-11ed-a7e3-02a848659f60`,
      'status-details': {
        'status': StackStatus.CREATE_COMPLETE,
        'status-reason': 'Stack creation completed',
      },
    },
    'resources': [],
    'source': 'aws.cloudformation',
  };

  const sqsEvent: SQSEvent = {
    Records: [
      {
        messageId: '1305930a-8b79-4636-a5e9-def8d04b986a',
        receiptHandle: 'AQEBNQaNQCrvdypFLS4Z',
        body: JSON.stringify(baseEvent),
        attributes: {
          ApproximateReceiveCount: '1',
          SentTimestamp: '1630454400000',
          SenderId: 'EXAMPLE',
          ApproximateFirstReceiveTimestamp: '1630454400001',
        },
        messageAttributes: {},
        md5OfBody: '4b411ed5dfa42dd53590a142c9aafe98',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:ap-southeast-1:555555555555:test-ap-southeast-1',
        awsRegion: 'ap-southeast-1',
      },
    ],
  };

  const mockIngestionKafkaStack: Stack = {
    StackId: `arn:aws:cloudformation:ap-southeast-1:555555555555:stack/Clickstream-Ingestion-kafka-${MOCK_PIPELINE_ID}/5b6971e0-f261-11ed-a7e3-02a848659f60`,
    StackName: `Clickstream-Ingestion-kafka-${MOCK_PIPELINE_ID}`,
    CreationTime: new Date('2021-09-01T00:00:00Z'),
    StackStatus: StackStatus.CREATE_COMPLETE,
    StackStatusReason: 'Stack creation completed',
    DisableRollback: false,
    NotificationARNs: [],
    Capabilities: [],
    Outputs: [],
    Tags: [
      {
        Key: BuiltInTagKeys.AWS_SOLUTION_VERSION,
        Value: 'v1.0.0',
      },
    ],
    EnableTerminationProtection: false,
    DriftInformation: {
      StackDriftStatus: 'NOT_CHECKED',
    },
  };

  const mockStackDetails: PipelineStatusDetail[] = [
    {
      stackId: '',
      outputs: [],
      stackName: 'Clickstream-KafkaConnector-6972c135cb864885b25c5b7ebe584fdf',
      stackStatus: undefined,
      stackStatusReason: '',
      stackTemplateVersion: '',
      stackType: PipelineStackType.KAFKA_CONNECTOR,
    },
    {
      stackId: '',
      outputs: [],
      stackName: 'Clickstream-Ingestion-kafka-6972c135cb864885b25c5b7ebe584fdf',
      stackStatus: undefined,
      stackStatusReason: '',
      stackTemplateVersion: '',
      stackType: PipelineStackType.INGESTION,
    },
    {
      stackId: '',
      outputs: [],
      stackName: 'Clickstream-DataProcessing-6972c135cb864885b25c5b7ebe584fdf',
      stackStatus: undefined,
      stackStatusReason: '',
      stackTemplateVersion: '',
      stackType: PipelineStackType.DATA_PROCESSING,
    },
    {
      stackId: '',
      outputs: [],
      stackName: 'Clickstream-DataModelingRedshift-6972c135cb864885b25c5b7ebe584fdf',
      stackStatus: undefined,
      stackStatusReason: '',
      stackTemplateVersion: '',
      stackType: PipelineStackType.DATA_MODELING_REDSHIFT,
    },
    {
      stackId: '',
      outputs: [],
      stackName: 'Clickstream-Reporting-6972c135cb864885b25c5b7ebe584fdf',
      stackStatus: undefined,
      stackStatusReason: '',
      stackTemplateVersion: '',
      stackType: PipelineStackType.REPORTING,
    },
    {
      stackId: '',
      outputs: [],
      stackName: 'Clickstream-Metrics-6972c135cb864885b25c5b7ebe584fdf',
      stackStatus: undefined,
      stackStatusReason: '',
      stackTemplateVersion: '',
      stackType: PipelineStackType.METRICS,
    },
  ];

  const mockPipeline = {
    id: MOCK_PIPELINE_ID,
    projectId: MOCK_PROJECT_ID,
    stackDetails: [...mockStackDetails],
    workflow: {
      Version: '2022-03-15',
      Workflow: {
        Type: 'Parallel',
        End: true,
        Branches: [
          {
            States: {
              KafkaConnector: {
                Type: 'Stack',
                Data: {
                  Input: {
                    Region: 'ap-southeast-1',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/kafka-s3-sink-stack.template.json',
                    Action: 'Create',
                    Parameters: [],
                    StackName: `Clickstream-KafkaConnector-${MOCK_PIPELINE_ID}`,
                  },
                  Callback: {
                    BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID}`,
                    BucketName: 'EXAMPLE_BUCKET',
                  },
                },
                End: true,
              },
              Ingestion: {
                Type: 'Stack',
                Data: {
                  Input: {
                    Region: 'ap-southeast-1',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/ingestion-server-kafka-stack.template.json',
                    Action: 'Create',
                    Parameters: [],
                    StackName: `Clickstream-Ingestion-kafka-${MOCK_PIPELINE_ID}`,
                  },
                  Callback: {
                    BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID}`,
                    BucketName: 'EXAMPLE_BUCKET',
                  },
                },
                Next: 'KafkaConnector',
              },
            },
            StartAt: 'Ingestion',
          },
          {
            States: {
              DataProcessing: {
                Type: 'Stack',
                Data: {
                  Input: {
                    Region: 'ap-southeast-1',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-pipeline-stack.template.json',
                    Action: 'Create',
                    Parameters: [],
                    StackName: `Clickstream-DataProcessing-${MOCK_PIPELINE_ID}`,
                  },
                  Callback: {
                    BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID}`,
                    BucketName: 'EXAMPLE_BUCKET',
                  },
                },
                Next: 'DataModeling',
              },
              Reporting: {
                Type: 'Stack',
                Data: {
                  Input: {
                    Region: 'ap-southeast-1',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-reporting-quicksight-stack.template.json',
                    Action: 'Create',
                    Parameters: [],
                    StackName: `Clickstream-Reporting-${MOCK_PIPELINE_ID}`,
                  },
                  Callback: {
                    BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID}`,
                    BucketName: 'EXAMPLE_BUCKET',
                  },
                },
                End: true,
              },
              DataModeling: {
                Type: 'Stack',
                Data: {
                  Input: {
                    Region: 'ap-southeast-1',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-analytics-redshift-stack.template.json',
                    Action: 'Create',
                    Parameters: [
                      {
                        ParameterKey: 'DataProcessingCronOrRateExpression',
                        ParameterValue: 'rate(16 minutes)',
                      },
                    ],
                    StackName: `Clickstream-DataModelingRedshift-${MOCK_PIPELINE_ID}`,
                  },
                  Callback: {
                    BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID}`,
                    BucketName: 'EXAMPLE_BUCKET',
                  },
                },
                Next: 'Reporting',
              },
            },
            StartAt: 'DataProcessing',
          },
          {
            StartAt: 'Metrics',
            States: {
              Metrics: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID}`,
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `Clickstream-Metrics-${MOCK_PIPELINE_ID}`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/metrics-stack.template.json',
                  },
                },
                End: true,
                Type: 'Stack',
              },
            },
          },
        ],
      },
    },
    updateAt: new Date('2022-01-01').getTime(),
  };

  beforeEach(() => {
    docMock.reset();
    cloudFormationMock.reset();
  });

  test('Save stack status to DDB', async () => {
    cloudFormationMock.on(DescribeStacksCommand).resolves({
      Stacks: [{ ...mockIngestionKafkaStack }],
    });
    docMock.on(QueryCommand).resolves({
      Items: [{ ...mockPipeline }],
    });
    docMock.on(UpdateCommand).resolves({});
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2023-01-01'));
    await handler(sqsEvent);
    expect(cloudFormationMock).toHaveReceivedCommandTimes(DescribeStacksCommand, 1);
    expect(docMock).toHaveReceivedCommandTimes(QueryCommand, 1);
    expect(docMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
    expect(mockStackDetails).toContainEqual({
      stackId: 'arn:aws:cloudformation:ap-southeast-1:555555555555:stack/Clickstream-Ingestion-kafka-6972c135cb864885b25c5b7ebe584fdf/5b6971e0-f261-11ed-a7e3-02a848659f60',
      outputs: [],
      stackName: mockIngestionKafkaStack.StackName,
      stackStatus: mockIngestionKafkaStack.StackStatus,
      stackStatusReason: mockIngestionKafkaStack.StackStatusReason,
      stackTemplateVersion: 'v1.0.0',
      stackType: PipelineStackType.INGESTION,
    });
    expect(docMock).toHaveReceivedNthSpecificCommandWith(1, UpdateCommand, {
      TableName: process.env.CLICKSTREAM_TABLE_NAME ?? '',
      Key: {
        id: MOCK_PROJECT_ID,
        type: `PIPELINE#${MOCK_PIPELINE_ID}#latest`,
      },
      ConditionExpression: '#ConditionVersion = :ConditionVersionValue',
      UpdateExpression: 'SET #stackDetails = :stackDetails, #ConditionVersion = :updateAt',
      ExpressionAttributeNames: {
        '#ConditionVersion': 'updateAt',
        '#stackDetails': 'stackDetails',
      },
      ExpressionAttributeValues: {
        ':stackDetails': [...mockStackDetails],
        ':ConditionVersionValue': new Date('2022-01-01').getTime(),
        ':updateAt': new Date('2023-01-01').getTime(),
      },
    });
  });

  test('Save stack status to DDB with Conditional Check Failed', async () => {
    cloudFormationMock.on(DescribeStacksCommand).resolves({
      Stacks: [{ ...mockIngestionKafkaStack }],
    });
    docMock.on(QueryCommand).resolves({
      Items: [{ ...mockPipeline }],
    });
    const mockConditionalCheckFailed = new ConditionalCheckFailedException(
      {
        message: 'ConditionalCheckFailedException',
        $metadata: {},
      },
    );
    docMock.on(UpdateCommand).rejectsOnce(mockConditionalCheckFailed).resolves({});
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2023-01-01'));
    await handler(sqsEvent);
    expect(cloudFormationMock).toHaveReceivedCommandTimes(DescribeStacksCommand, 1);
    expect(docMock).toHaveReceivedCommandTimes(QueryCommand, 2);
    expect(docMock).toHaveReceivedCommandTimes(UpdateCommand, 2);
    expect(mockStackDetails).toContainEqual({
      stackId: 'arn:aws:cloudformation:ap-southeast-1:555555555555:stack/Clickstream-Ingestion-kafka-6972c135cb864885b25c5b7ebe584fdf/5b6971e0-f261-11ed-a7e3-02a848659f60',
      outputs: [],
      stackName: mockIngestionKafkaStack.StackName,
      stackStatus: mockIngestionKafkaStack.StackStatus,
      stackStatusReason: mockIngestionKafkaStack.StackStatusReason,
      stackTemplateVersion: 'v1.0.0',
      stackType: PipelineStackType.INGESTION,
    });
    expect(docMock).toHaveReceivedNthSpecificCommandWith(1, UpdateCommand, {
      TableName: process.env.CLICKSTREAM_TABLE_NAME ?? '',
      Key: {
        id: MOCK_PROJECT_ID,
        type: `PIPELINE#${MOCK_PIPELINE_ID}#latest`,
      },
      ConditionExpression: '#ConditionVersion = :ConditionVersionValue',
      UpdateExpression: 'SET #stackDetails = :stackDetails, #ConditionVersion = :updateAt',
      ExpressionAttributeNames: {
        '#ConditionVersion': 'updateAt',
        '#stackDetails': 'stackDetails',
      },
      ExpressionAttributeValues: {
        ':stackDetails': [...mockStackDetails],
        ':ConditionVersionValue': new Date('2022-01-01').getTime(),
        ':updateAt': new Date('2023-01-01').getTime(),
      },
    });
  });

});
