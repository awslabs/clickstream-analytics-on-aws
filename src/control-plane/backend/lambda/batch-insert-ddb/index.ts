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
  BatchWriteItemCommandInput,
} from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import {
  CdkCustomResourceEvent,
  CdkCustomResourceResponse,
  Context,
} from 'aws-lambda';
import { logger } from '../../../../common/powertools';
import { aws_sdk_client_common_config } from '../api/common/sdk-client-config-ln';

// Create an Amazon DynamoDB service client object.
const ddbClient = new DynamoDBClient({
  ...aws_sdk_client_common_config,
});
// Create the DynamoDB Document client.
const docClient = DynamoDBDocumentClient.from(ddbClient);

interface DicItem {
  readonly name: string;
  readonly data: any;
}

export const handler = async (
  event: CdkCustomResourceEvent,
  context: Context,
): Promise<CdkCustomResourceResponse> => {
  logger.info('Lambda is invoked', JSON.stringify(event, null, 2));

  const response: CdkCustomResourceResponse = {
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    PhysicalResourceId: context.logGroupName,
    Data: {
      TableName: event.ResourceProperties.tableName,
    },
    Status: 'SUCCESS',
  };

  try {
    await _handler(event);
  } catch (e) {
    if (e instanceof Error) {
      logger.error('Batch insert error.', e);
    }
    throw e;
  }
  return response;
};

async function _handler(event: CdkCustomResourceEvent) {
  const requestType = event.RequestType;

  if (requestType == 'Create' || requestType == 'Update') {
    await cleanData(event);
    await batchInsert(event);
  }
}

async function batchInsert(event: CdkCustomResourceEvent): Promise<any> {
  const tableName: string = event.ResourceProperties.tableName;
  const items: DicItem[] = event.ResourceProperties.items;
  const itemsAsDynamoPutRequest: any[] = [];
  items.forEach(item => {
    const marshallItem = marshall(item, {
      convertEmptyValues: true,
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
    });
    itemsAsDynamoPutRequest.push({
      PutRequest: {
        Item: marshallItem,
      },
    });
  });
  const input: BatchWriteItemCommandInput = {
    RequestItems: {
      [tableName]: itemsAsDynamoPutRequest,
    },
  };
  await ddbClient.send(new BatchWriteItemCommand(input));
}

async function cleanData(event: CdkCustomResourceEvent): Promise<any> {
  const tableName: string = event.ResourceProperties.tableName;
  const records = await getPaginatedResults(async (ExclusiveStartKey: any) => {
    const scan_params: ScanCommand = new ScanCommand({
      TableName: tableName,
      ExclusiveStartKey,
    });
    const queryResponse = await docClient.send(scan_params);
    return {
      marker: queryResponse.LastEvaluatedKey,
      results: queryResponse.Items,
    };
  });
  const items = records as DicItem[];
  for (let index in items) {
    const params: DeleteCommand = new DeleteCommand({
      TableName: tableName,
      Key: {
        name: items[index].name,
      },
    });
    await docClient.send(params);
  }
}

const getPaginatedResults = async (fn: any) => {
  const EMPTY = Symbol('empty');
  const res = [];
  for await (const lf of (async function* () {
    let NextMarker = EMPTY;
    let count = 0;
    while (NextMarker || NextMarker === EMPTY) {
      const {
        marker,
        results,
        count: ct,
      } = await fn(NextMarker !== EMPTY ? NextMarker : undefined, count);

      yield* results;

      if (!marker) {
        break;
      }

      NextMarker = marker;
      count = ct;
    }
  })()) {
    // @ts-ignore
    res.push(lf);
  }

  return res;
};