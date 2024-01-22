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
  DynamoDBClient,
  BatchWriteItemCommand,
} from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { CdkCustomResourceEvent, CdkCustomResourceResponse } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { handler } from '../../../src/control-plane/backend/lambda/batch-insert-ddb/index';
import { getMockContext } from '../../common/lambda-context';
import { basicCloudFormationEvent } from '../../common/lambda-events';
import 'aws-sdk-client-mock-jest';

describe('Dictionary Data', () => {

  const context = getMockContext();
  const ddbMock = mockClient(DynamoDBClient);
  const docMock = mockClient(DynamoDBDocumentClient);

  const basicEvent = {
    ...basicCloudFormationEvent,
    ResourceProperties: {
      ...basicCloudFormationEvent.ResourceProperties,
      tableName: 'Dictionary',
      lastModifiedTime: '2021-01-01T00:00:00.000Z',
    },
  };

  const createDictionaryEvent = {
    ...basicEvent,
    ResourceProperties: {
      ...basicEvent.ResourceProperties,
    },
  };

  const updateDictionaryEvent: CdkCustomResourceEvent = {
    ...createDictionaryEvent,
    OldResourceProperties: createDictionaryEvent.ResourceProperties,
    ResourceProperties: {
      ...createDictionaryEvent.ResourceProperties,
      lastModifiedTime: '2021-01-02T00:00:00.000Z',
    },
    PhysicalResourceId: 'physical-resource-id',
    RequestType: 'Update',
  };

  const deleteDictionaryEvent: CdkCustomResourceEvent = {
    ...basicEvent,
    PhysicalResourceId: 'physical-resource-id',
    RequestType: 'Delete',
  };

  beforeEach(() => {
    ddbMock.reset();
    docMock.reset();
  });

  test('Initialize Dictionary', async () => {
    docMock.on(ScanCommand).resolvesOnce({ Items: [] });
    docMock.on(DeleteCommand).resolves({});
    ddbMock.on(BatchWriteItemCommand).resolvesOnce({});
    const resp = await handler(createDictionaryEvent, context) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(docMock).toHaveReceivedCommandTimes(ScanCommand, 1);
    expect(docMock).toHaveReceivedCommandTimes(DeleteCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(BatchWriteItemCommand, 1);
  });

  test('Update Dictionary', async () => {
    docMock.on(ScanCommand).resolvesOnce({ Items: [{ name: 'D1', data: {} }] });
    docMock.on(DeleteCommand).resolves({});
    ddbMock.on(BatchWriteItemCommand).resolvesOnce({});
    const resp = await handler(updateDictionaryEvent, context) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(docMock).toHaveReceivedCommandTimes(ScanCommand, 1);
    expect(docMock).toHaveReceivedCommandTimes(DeleteCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(BatchWriteItemCommand, 1);
  });

  test('Delete Dictionary', async () => {
    const event = deleteDictionaryEvent;
    docMock.on(ScanCommand).resolvesOnce({
      Items: [
        { name: 'D1', data: {} },
        { name: 'D2', data: {} },
      ],
    });
    docMock.on(DeleteCommand).resolves({});
    const resp = await handler(event, context) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(docMock).toHaveReceivedCommandTimes(ScanCommand, 0);
    expect(docMock).toHaveReceivedCommandTimes(DeleteCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(BatchWriteItemCommand, 0);
  });

});
