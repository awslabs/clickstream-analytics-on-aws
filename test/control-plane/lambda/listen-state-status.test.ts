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

import { CloudWatchEventsClient, DeleteRuleCommand, ListTargetsByRuleCommand, RemoveTargetsCommand } from '@aws-sdk/client-cloudwatch-events';
import { TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
import { ExecutionStatus } from '@aws-sdk/client-sfn';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { handler, StepFunctionsExecutionStatusChangeNotificationEventDetail } from '../../../src/control-plane/backend/lambda/listen-state-status';
import 'aws-sdk-client-mock-jest';

const docMock = mockClient(DynamoDBDocumentClient);
const cloudWatchEventsMock = mockClient(CloudWatchEventsClient);

describe('Listen SFN Status Lambda Function', () => {

  const MOCK_PIPELINE_ID = '6972c135cb864885b25c5b7ebe584fdf';
  const MOCK_PROJECT_ID = '6666-6666';
  const MOCK_EXECUTION_ID = `main-${MOCK_PIPELINE_ID}-123`;

  const mockExecutionDetail = {
    executionArn: `arn:aws:states:ap-southeast-1:555555555555:execution:Clickstream-DataModelingRedshift-${MOCK_PIPELINE_ID}:${MOCK_EXECUTION_ID}`,
    name: MOCK_EXECUTION_ID,
    status: ExecutionStatus.SUCCEEDED,
  };

  const baseEvent: EventBridgeEvent<'Step Functions Execution Status Change', StepFunctionsExecutionStatusChangeNotificationEventDetail> = {
    'id': 'b1b9f9b0-1f1e-4f1f-8f1f-1f1f1f1f1f1f',
    'version': '0',
    'account': '0',
    'time': '2021-09-01T00:00:00Z',
    'region': 'ap-southeast-1',
    'detail-type': 'Step Functions Execution Status Change',
    'detail': mockExecutionDetail,
    'resources': [],
    'source': 'aws.states',
  };

  const mockPipeline = {
    id: MOCK_PIPELINE_ID,
    projectId: MOCK_PROJECT_ID,
  };

  beforeEach(() => {
    docMock.reset();
    cloudWatchEventsMock.reset();
  });

  test('Save state status to DDB', async () => {
    docMock.on(QueryCommand).resolves({
      Items: [{ ...mockPipeline, lastAction: 'Create' }],
    });
    docMock.on(UpdateCommand).resolves({});
    await handler(baseEvent);
    expect(docMock).toHaveReceivedCommandTimes(QueryCommand, 1);
    expect(docMock).toHaveReceivedNthSpecificCommandWith(1, UpdateCommand, {
      TableName: process.env.CLICKSTREAM_TABLE_NAME ?? '',
      Key: {
        id: MOCK_PROJECT_ID,
        type: `PIPELINE#${MOCK_PIPELINE_ID}#latest`,
      },
      UpdateExpression: 'SET #executionDetail = :executionDetail',
      ExpressionAttributeNames: {
        '#executionDetail': 'executionDetail',
      },
      ExpressionAttributeValues: {
        ':executionDetail': mockExecutionDetail,
      },
    });
    expect(docMock).toHaveReceivedCommandTimes(ScanCommand, 0);
    expect(docMock).toHaveReceivedCommandTimes(TransactWriteItemsCommand, 0);
    expect(cloudWatchEventsMock).toHaveReceivedCommandTimes(ListTargetsByRuleCommand, 0);
    expect(cloudWatchEventsMock).toHaveReceivedCommandTimes(RemoveTargetsCommand, 0);
    expect(cloudWatchEventsMock).toHaveReceivedCommandTimes(DeleteRuleCommand, 0);
  });

  test('Delete project', async () => {
    docMock.on(QueryCommand).resolves({
      Items: [{ ...mockPipeline, lastAction: 'Delete' }],
    });
    docMock.on(UpdateCommand).resolves({});
    docMock.on(ScanCommand).resolves({});
    docMock.on(TransactWriteItemsCommand).resolves({});
    cloudWatchEventsMock.on(ListTargetsByRuleCommand).resolves({
      Targets: [
        {
          Arn: 'arn:aws:lambda:ap-southeast-1:123456789012:function:Clickstream-DataModelingRedshift-DeleteProject',
          Id: 'Clickstream-DataModelingRedshift-DeleteProject',
        },
      ],
    });
    cloudWatchEventsMock.on(RemoveTargetsCommand).resolves({});
    cloudWatchEventsMock.on(DeleteRuleCommand).resolves({});
    await handler(baseEvent);
    expect(docMock).toHaveReceivedCommandTimes(QueryCommand, 1);
    expect(docMock).toHaveReceivedNthSpecificCommandWith(1, UpdateCommand, {
      TableName: process.env.CLICKSTREAM_TABLE_NAME ?? '',
      Key: {
        id: MOCK_PROJECT_ID,
        type: `PIPELINE#${MOCK_PIPELINE_ID}#latest`,
      },
      UpdateExpression: 'SET #executionDetail = :executionDetail',
      ExpressionAttributeNames: {
        '#executionDetail': 'executionDetail',
      },
      ExpressionAttributeValues: {
        ':executionDetail': mockExecutionDetail,
      },
    });
    expect(docMock).toHaveReceivedCommandTimes(ScanCommand, 1);
    expect(docMock).toHaveReceivedCommandTimes(TransactWriteItemsCommand, 1);
    expect(cloudWatchEventsMock).toHaveReceivedCommandTimes(ListTargetsByRuleCommand, 1);
    expect(cloudWatchEventsMock).toHaveReceivedCommandTimes(RemoveTargetsCommand, 1);
    expect(cloudWatchEventsMock).toHaveReceivedCommandTimes(DeleteRuleCommand, 1);
  });

});
