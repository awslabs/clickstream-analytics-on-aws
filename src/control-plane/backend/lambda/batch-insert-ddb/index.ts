/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { Logger } from '@aws-lambda-powertools/logger';
import {
  DynamoDBClient,
  BatchWriteItemCommand,
  BatchWriteItemCommandInput,
} from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient, ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  CdkCustomResourceEvent,
  CdkCustomResourceResponse,
  Context,
} from 'aws-lambda';

const logger = new Logger({ serviceName: 'ClickstreamBatchInsertDDB' });

// Create an Amazon DynamoDB service client object.
const ddbClient = new DynamoDBClient({});
// Create the DynamoDB Document client.
const docClient = DynamoDBDocumentClient.from(ddbClient);

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
    Status: 'SUCCESS',
  };

  try {
    switch (event.RequestType) {
      case 'Create':
      case 'Update':
        await cleanData(event);
        await batchInsert(event);
        return response;
      case 'Delete':
        await cleanData(event);
        return response;
    }
  } catch (error) {
    logger.error('Batch insert error.', {
      error: error,
      event: event,
    });
    throw new Error('Batch insert error.');
  }
};

export interface DicItem {
  readonly name: string;
  readonly data: any;
}

async function batchInsert(event: CdkCustomResourceEvent): Promise<any> {
  const tableName: string = event.ResourceProperties.tableName;
  const items: DicItem[] = event.ResourceProperties.items;
  const itemsAsDynamoPutRequest: any[] = [];
  items.forEach(item => {
    if ((typeof item.data) === 'string') {
      itemsAsDynamoPutRequest.push({
        PutRequest: {
          Item: {
            name: { S: item.name },
            data: { S: item.data },
          },
        },
      });
    } else if ((typeof item.data) === 'number') {
      itemsAsDynamoPutRequest.push({
        PutRequest: {
          Item: {
            name: { S: item.name },
            data: { N: item.data.toString() },
          },
        },
      });
    } else if ((typeof item.data) === 'boolean') {
      itemsAsDynamoPutRequest.push({
        PutRequest: {
          Item: {
            name: { S: item.name },
            data: { BOOL: item.data },
          },
        },
      });
    } else if ((typeof item.data) === 'object') {
      itemsAsDynamoPutRequest.push({
        PutRequest: {
          Item: {
            name: { S: item.name },
            data: { S: JSON.stringify(item.data) },
          },
        },
      });
    }
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