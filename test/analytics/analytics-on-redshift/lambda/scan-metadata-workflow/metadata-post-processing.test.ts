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

import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { handler, MetadataPostProcessingEvent } from '../../../../../src/analytics/lambdas/scan-metadata-workflow/metadata-post-processing';
import { MetadataPostProcessingBody } from '../../../../../src/analytics/private/model';
import 'aws-sdk-client-mock-jest';


const metadataPostProcessingBody: MetadataPostProcessingBody = {
  appId: 'app1',
};

const metadataPostProcessingEvent: MetadataPostProcessingEvent = {
  detail: metadataPostProcessingBody,
};

describe('Lambda - Metadata Post Processing', () => {
  const dynamoDBMock = mockClient(DynamoDBDocumentClient);

  beforeEach(() => {
    dynamoDBMock.reset();
  });

  const mockRecords = [
    {
      id: 'project1#app1#eventName#propertyName#valueType',
      month: '#202301',
      prefix: 'EVENT_PARAMETER#project1#app1',
      isLastMonth: false,
    },
    {
      id: 'project1#app1#eventName#propertyName#valueType',
      month: '#202302',
      prefix: 'EVENT_PARAMETER#project1#app1',
      isLastMonth: true,
    },
    {
      id: 'project1#app1#eventName#propertyName#valueType',
      month: '#202303',
      prefix: 'EVENT_PARAMETER#project1#app1',
      isLastMonth: true,
    },
    {
      id: 'project1#app1#eventName#propertyName1#valueType',
      month: '#202301',
      prefix: 'EVENT_PARAMETER#project1#app1',
      isLastMonth: true,
    },
    {
      id: 'project1#app1#eventName#propertyName1#valueType',
      month: '#202302',
      prefix: 'EVENT_PARAMETER#project1#app1',
      isLastMonth: false,
    },
    {
      id: 'project1#app1#eventName#propertyName1#valueType',
      month: '#202303',
      prefix: 'EVENT_PARAMETER#project1#app1',
      isLastMonth: false,
    },
    {
      id: 'project1#app1#eventName#propertyName2#valueType',
      month: '#202301',
      prefix: 'EVENT_PARAMETER#project1#app1',
      isLastMonth: false,
    },
    {
      id: 'project1#app1#eventName#propertyName2#valueType',
      month: '#202302',
      prefix: 'EVENT_PARAMETER#project1#app1',
      isLastMonth: true,
    },
    {
      id: 'project1#app1#eventName#propertyName2#valueType',
      month: '#202303',
      prefix: 'EVENT_PARAMETER#project1#app1',
      isLastMonth: false,
    },
    {
      id: 'project1#app1#eventName#propertyName3#valueType',
      month: '#202301',
      prefix: 'EVENT_PARAMETER#project1#app1',
    },
    {
      id: 'project1#app1#eventName#propertyName3#valueType',
      month: '#202302',
      prefix: 'EVENT_PARAMETER#project1#app1',
    },
    {
      id: 'project1#app1#eventName#propertyName3#valueType',
      month: '#202303',
      prefix: 'EVENT_PARAMETER#project1#app1',
    },
    {
      id: 'project1#app1#eventName#propertyName4#valueType',
      month: '#202301',
      prefix: 'EVENT_PARAMETER#project1#app1',
      isLastMonth: true,
    },
    {
      id: 'project1#app1#eventName#propertyName4#valueType',
      month: '#202303',
      prefix: 'EVENT_PARAMETER#project1#app1',
    },
  ];

  test('should handle metadata post processing', async () => {
    // Mock DynamoDBDocumentClient query
    dynamoDBMock.on(QueryCommand).resolves({
      Items: mockRecords,
    });

    // Mock DynamoDBDocumentClient update
    dynamoDBMock.on(UpdateCommand).resolves({});

    await handler(metadataPostProcessingEvent);

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(1,
      QueryCommand,
      {
        TableName: 'ClickstreamAnalyticsMetadata',
        IndexName: 'prefix-month-gsi-name',
        KeyConditionExpression: '#prefix= :prefix',
        ProjectionExpression: '#id, #month, #prefix, isLastMonth',
        Limit: undefined,
        ExclusiveStartKey: undefined,
        ExpressionAttributeNames: {
          '#prefix': 'prefix',
          '#id': 'id',
          '#month': 'month',
        },
        ExpressionAttributeValues: {
          ':prefix': 'EVENT_PARAMETER#project1#app1',
        },
        ScanIndexForward: false,
      },
    );

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(2, UpdateCommand,
      {
        TableName: 'ClickstreamAnalyticsMetadata',
        Key: {
          id: 'project1#app1#eventName#propertyName#valueType',
          month: '#202302',
        },
        UpdateExpression: 'SET isLastMonth = :isLastMonth',
        ExpressionAttributeValues: {
          ':isLastMonth': false,
        },
      },
    );

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(3, UpdateCommand,
      {
        TableName: 'ClickstreamAnalyticsMetadata',
        Key: {
          id: 'project1#app1#eventName#propertyName1#valueType',
          month: '#202301',
        },
        UpdateExpression: 'SET isLastMonth = :isLastMonth',
        ExpressionAttributeValues: {
          ':isLastMonth': false,
        },
      },
    );

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(4, UpdateCommand,
      {
        TableName: 'ClickstreamAnalyticsMetadata',
        Key: {
          id: 'project1#app1#eventName#propertyName1#valueType',
          month: '#202303',
        },
        UpdateExpression: 'SET isLastMonth = :isLastMonth',
        ExpressionAttributeValues: {
          ':isLastMonth': true,
        },
      },
    );

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(5, UpdateCommand,
      {
        TableName: 'ClickstreamAnalyticsMetadata',
        Key: {
          id: 'project1#app1#eventName#propertyName2#valueType',
          month: '#202302',
        },
        UpdateExpression: 'SET isLastMonth = :isLastMonth',
        ExpressionAttributeValues: {
          ':isLastMonth': false,
        },
      },
    );

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(6, UpdateCommand,
      {
        TableName: 'ClickstreamAnalyticsMetadata',
        Key: {
          id: 'project1#app1#eventName#propertyName2#valueType',
          month: '#202303',
        },
        UpdateExpression: 'SET isLastMonth = :isLastMonth',
        ExpressionAttributeValues: {
          ':isLastMonth': true,
        },
      },
    );

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(7, UpdateCommand,
      {
        TableName: 'ClickstreamAnalyticsMetadata',
        Key: {
          id: 'project1#app1#eventName#propertyName3#valueType',
          month: '#202301',
        },
        UpdateExpression: 'SET isLastMonth = :isLastMonth',
        ExpressionAttributeValues: {
          ':isLastMonth': false,
        },
      },
    );

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(8, UpdateCommand,
      {
        TableName: 'ClickstreamAnalyticsMetadata',
        Key: {
          id: 'project1#app1#eventName#propertyName3#valueType',
          month: '#202302',
        },
        UpdateExpression: 'SET isLastMonth = :isLastMonth',
        ExpressionAttributeValues: {
          ':isLastMonth': false,
        },
      },
    );

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(9, UpdateCommand,
      {
        TableName: 'ClickstreamAnalyticsMetadata',
        Key: {
          id: 'project1#app1#eventName#propertyName3#valueType',
          month: '#202303',
        },
        UpdateExpression: 'SET isLastMonth = :isLastMonth',
        ExpressionAttributeValues: {
          ':isLastMonth': true,
        },
      },
    );

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(10, UpdateCommand,
      {
        TableName: 'ClickstreamAnalyticsMetadata',
        Key: {
          id: 'project1#app1#eventName#propertyName4#valueType',
          month: '#202301',
        },
        UpdateExpression: 'SET isLastMonth = :isLastMonth',
        ExpressionAttributeValues: {
          ':isLastMonth': false,
        },
      },
    );

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(11, UpdateCommand,
      {
        TableName: 'ClickstreamAnalyticsMetadata',
        Key: {
          id: 'project1#app1#eventName#propertyName4#valueType',
          month: '#202303',
        },
        UpdateExpression: 'SET isLastMonth = :isLastMonth',
        ExpressionAttributeValues: {
          ':isLastMonth': true,
        },
      },
    );

    expect(dynamoDBMock).toHaveReceivedCommandTimes(UpdateCommand, 10);
  });
});