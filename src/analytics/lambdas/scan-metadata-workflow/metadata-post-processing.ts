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


import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommandInput, paginateQuery, UpdateCommand, UpdateCommandInput } from '@aws-sdk/lib-dynamodb';
import { NativeAttributeValue } from '@aws-sdk/util-dynamodb';
import { logger } from '../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../common/sdk-client-config';
import { MetadataPostProcessingBody } from '../../private/model';

const analyticsMetadataTable = process.env.METADATA_DDB_TABLE_ARN!;
const prefixMonthGSIName = process.env.PREFIX_MONTH_GSI_NAME!;
const { ddbRegion, ddbTableName } = parseDynamoDBTableARN(analyticsMetadataTable);
const projectId = process.env.PROJECT_ID!;

// Create an Amazon DynamoDB service client object.
const ddbClient = new DynamoDBClient({
  ...aws_sdk_client_common_config,
  region: ddbRegion,
});

const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export interface MetadataPostProcessingEvent {
  detail: MetadataPostProcessingBody;
}

export const handler = async (event: MetadataPostProcessingEvent) => {
  const appId = event.detail.appId;
  logger.info('Metadata post processing for appId: ', { appId });
  try {
    // get all metadata from DDB according to appId
    const records = await getAllMetadataFromDDB(appId);

    // group records by id
    const groupedRecords = await groupRecordsById(records);

    // order group record by month
    const orderedGroupedRecords = await orderGroupRecordByMonth(groupedRecords);

    await updateIsLastMonth(orderedGroupedRecords);

    return {
      detail: {
        appId: appId,
        status: 'SUCCEED',
        message: 'Metadata post processing succeed.',
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Error when post processing metadata.', { error });
    }
    return {
      detail: {
        appId: appId,
        status: 'FAILED',
        message: 'failed to post processing metadata.',
      },
    };
  }
};

/*
  Get all metadata from DDB according to appId
  @param appId
  @returns records
*/
async function getAllMetadataFromDDB(appId: string) {
  logger.info('Get all metadata from DDB according to appId: ', { appId });
  const queryCommandInput: QueryCommandInput = {
    TableName: ddbTableName,
    IndexName: prefixMonthGSIName,
    KeyConditionExpression: '#prefix= :prefix',
    ProjectionExpression: '#id, #month, #prefix, isLastMonth',
    ExpressionAttributeNames: {
      '#prefix': 'prefix',
      '#id': 'id',
      '#month': 'month',
    },
    ExpressionAttributeValues: {
      ':prefix': `EVENT_PARAMETER#${projectId}#${appId}`,
    },
    ScanIndexForward: false,
  };

  const records: Record<string, NativeAttributeValue>[] = [];
  for await (const page of paginateQuery({ client: ddbDocClient }, queryCommandInput)) {
    records.push(...page.Items as Record<string, NativeAttributeValue>[]);
  }
  return records;
}

/*
  Group records by id
  @param records
  @returns groupedRecords
*/
async function groupRecordsById(records: Record<string, NativeAttributeValue>[]) {
  logger.info('Group records by id started.');
  const groupedRecords: Record<string, Record<string, NativeAttributeValue>[]> = {};
  for (const record of records) {
    const id = record.id;
    if (!groupedRecords[id]) {
      groupedRecords[id] = [];
    }
    groupedRecords[id].push(record);
  }
  return groupedRecords;
}

/*
  Order group record by month
  @param groupedRecords
  @returns orderedGroupedRecords
*/
async function orderGroupRecordByMonth(groupedRecords: Record<string, Record<string, NativeAttributeValue>[]>) {
  logger.info('Order group record by month started.');
  const orderedGroupedRecords: Record<string, Record<string, NativeAttributeValue>[]> = {};
  for (const id in groupedRecords) {
    const records = groupedRecords[id];
    records.sort((a, b) => {
      const aMonth = a.month;
      const bMonth = b.month;
      return aMonth.localeCompare(bMonth);
    });
    orderedGroupedRecords[id] = records;
  }
  return orderedGroupedRecords;
}

/*
  Update isLastMonth to DDB table
  @param orderedGroupedRecords
*/
async function updateIsLastMonth(orderedGroupedRecords: Record<string, Record<string, NativeAttributeValue>[]>) {
  logger.info('Update isLastMonth to DDB table started.');
  const shouldUpdateRecords: Record<string, NativeAttributeValue>[] = [];
  for (const id in orderedGroupedRecords) {
    const records = orderedGroupedRecords[id];
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      let shouldIsLastMonth = false;
      if (i === records.length - 1) {
        shouldIsLastMonth = true;
      }
      if (record.isLastMonth === shouldIsLastMonth) {
        continue;
      }
      record.isLastMonth = shouldIsLastMonth;
      shouldUpdateRecords.push(record);
    }
  }
  // update orderedGroupedRecords to DDB table
  await updateIsLastMonthToDDB(shouldUpdateRecords);

}

async function updateIsLastMonthToDDB(updateRecords: Record<string, NativeAttributeValue>[]) {
  for (const record of updateRecords) {
    const updateCommandInput: UpdateCommandInput = {
      TableName: ddbTableName,
      Key: {
        id: record.id,
        month: record.month,
      },
      UpdateExpression: 'SET isLastMonth = :isLastMonth',
      ExpressionAttributeValues: {
        ':isLastMonth': record.isLastMonth,
      },
    };
    await ddbDocClient.send(new UpdateCommand(updateCommandInput));
  }
}

function parseDynamoDBTableARN(ddbArn: string) {
  const arnComponents = ddbArn.split(':');
  const region = arnComponents[3];
  const tableName = arnComponents[5].split('/')[1];

  return {
    ddbRegion: region,
    ddbTableName: tableName,
  };
}
