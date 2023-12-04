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
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand, BatchWriteCommandInput, BatchGetCommandInput, BatchGetCommand, BatchGetCommandOutput } from '@aws-sdk/lib-dynamodb';
import { logger } from '../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../common/sdk-client-config';
import { StoreMetadataBody } from '../../private/model';
import { getRedshiftClient, executeStatementsWithWait, getRedshiftProps, getStatementResult } from '../redshift-data';

const REDSHIFT_DATA_API_ROLE_ARN = process.env.REDSHIFT_DATA_API_ROLE!;
const REDSHIFT_DATABASE = process.env.REDSHIFT_DATABASE!;

const { ddbRegion, ddbTableName } = parseDynamoDBTableARN(process.env.METADATA_DDB_TABLE_ARN!);

// Create an Amazon service client object.
const redshiftDataApiClient = getRedshiftClient(REDSHIFT_DATA_API_ROLE_ARN);

export interface StoreMetadataEvent {
  detail: StoreMetadataBody;
}

// Create an Amazon DynamoDB service client object.
const ddbClient = new DynamoDBClient({
  ...aws_sdk_client_common_config,
  region: ddbRegion,
});

const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

/**
 * The lambda function to get event metadata and properties metadata from redshift. And store them into DDB
 * @param event StoreMetadataEvent.
 * @returns.
 */
export const handler = async (event: StoreMetadataEvent) => {
  logger.debug('request event:', JSON.stringify(event));

  const appId = event.detail.appId;
  const metadataItems: any[] = [];
  try {

    await handleEventMetadata(appId, metadataItems);

    await handlePropertiesMetadata(appId, metadataItems);

    await handleUserAttributeMetadata(appId, metadataItems);

    await batchWriteIntoDDB(metadataItems);

    return {
      detail: {
        appId: appId,
        status: 'SUCCEED',
        message: 'store metadata into ddb successfully',
      },
    };
  } catch (err) {
    if (err instanceof Error) {
      logger.error('Error when query metadata.', err);
    }
    return {
      detail: {
        appId: appId,
        status: 'FAILED',
        message: 'store metadata into ddb failed',
      },
    };
  }
};

async function handleEventMetadata(appId: string, metadataItems: any[]) {

  const itemsMap = await getExistingItemsFromDDB(appId, 'event_metadata');

  const inputSql = `SELECT id, month, prefix, project_id, app_id, day_number, count, event_name, platform, sdk_version, sdk_name FROM ${appId}.event_metadata;`;

  const response = await queryMetadata(inputSql);

  response.Records!.forEach((record: any) => {
    const key = `${record[0].stringValue}${record[1].stringValue}`;
    if (itemsMap.has(key)) {
      const item = itemsMap.get(key);
      item[`day${record[5].longValue}`] = {
        count: record[6].longValue,
        hasData: true,
        platform: convertToDDBList(record[8].stringValue),
        sdkVersion: convertToDDBList(record[9].stringValue),
        sdkName: convertToDDBList(record[10].stringValue),
      };
    } else {
      const item = {
        id: record[0].stringValue,
        month: record[1].stringValue,
        prefix: record[2].stringValue,
        projectId: record[3].stringValue,
        appId: record[4].stringValue,
        name: record[7].stringValue,
        [`day${record[5].longValue}`]: {
          count: record[6].longValue,
          hasData: true,
          platform: convertToDDBList(record[8].stringValue),
          sdkVersion: convertToDDBList(record[9].stringValue),
          sdkName: convertToDDBList(record[10].stringValue),
        },
      };
      itemsMap.set(key, item);
    }
  });

  // aggregate summary info
  for (const item of itemsMap.values()) {
    const platformSet: Set<string> = new Set();
    const sdkVersionSet: Set<string> = new Set();
    const sdkNameSet: Set<string> = new Set();
    for (const key in item) {
      if (key.startsWith('day')) {
        const dayData = item[key];
        dayData.platform?.forEach((element: string) => platformSet.add(element));
        dayData.sdkVersion?.forEach((element: string) => sdkVersionSet.add(element));
        dayData.sdkName?.forEach((element: string) => sdkNameSet.add(element));
      }
    }
    item.summary = {
      platform: Array.from(platformSet),
      sdkVersion: Array.from(sdkVersionSet),
      sdkName: Array.from(sdkNameSet),
    };
  }

  putItemsMapIntoDDBItems(metadataItems, itemsMap);
}

async function handlePropertiesMetadata(appId: string, metadataItems: any[]) {
  const itemsMap = await getExistingItemsFromDDB(appId, 'event_parameter_metadata');

  const inputSql =
    `SELECT id, month, prefix, project_id, app_id, day_number, category, event_name, property_name, value_type, value_enum, platform FROM ${appId}.event_parameter_metadata;`;

  const response = await queryMetadata(inputSql);

  response.Records!.forEach((record: any) => {
    const key = `${record[0].stringValue}${record[1].stringValue}`;
    if (itemsMap.has(key)) {
      const item = itemsMap.get(key);
      item[`day${record[5].longValue}`] = {
        hasData: true,
        platform: convertToDDBList(record[11].stringValue),
        valueEnum: convertValueEnumToDDBList(record[10].stringValue),
      };
    } else {
      const item = {
        id: record[0].stringValue,
        month: record[1].stringValue,
        prefix: record[2].stringValue,
        projectId: record[3].stringValue,
        appId: record[4].stringValue,
        name: record[8].stringValue,
        eventName: record[7].stringValue,
        category: record[6].stringValue,
        valueType: record[9].stringValue,
        [`day${record[5].longValue}`]: {
          hasData: true,
          platform: convertToDDBList(record[11].stringValue),
          valueEnum: convertValueEnumToDDBList(record[10].stringValue),
        },
      };
      itemsMap.set(key, item);
    }
  });

  // aggregate summary info
  for (const item of itemsMap.values()) {
    const platformSet: Set<string> = new Set();
    const valueEnumAggregation: { [key: string]: number } = {};
    for (const key in item) {
      if (key.startsWith('day')) {
        const dayData = item[key];
        dayData.platform?.forEach((element: string) => platformSet.add(element));
        dayData.valueEnum?.forEach((element: any) => {
          if (valueEnumAggregation[element.value]) {
            valueEnumAggregation[element.value] += element.count;
          } else {
            valueEnumAggregation[element.value] = element.count;
          }
        });
      }
    }
    item.summary = {
      platform: Array.from(platformSet),
      valueEnum: Object.keys(valueEnumAggregation).map(key => ({
        count: valueEnumAggregation[key],
        value: key,
      })),
    };
  }

  putItemsMapIntoDDBItems(metadataItems, itemsMap);
}

async function handleUserAttributeMetadata(appId: string, metadataItems: any[]) {
  const itemsMap = await getExistingItemsFromDDB(appId, 'user_attribute_metadata');
  const inputSql =
    `SELECT id, month, prefix, project_id, app_id, day_number, category, property_name, value_type, value_enum FROM ${appId}.user_attribute_metadata;`;

  const response = await queryMetadata(inputSql);

  response.Records!.forEach((record: any) => {
    const key = `${record[0].stringValue}${record[1].stringValue}`;
    if (itemsMap.has(key)) {
      const item = itemsMap.get(key);
      item[`day${record[5].longValue}`] = {
        hasData: true,
        valueEnum: convertValueEnumToDDBList(record[9].stringValue),
      };
      item.summary = {
        hasData: true,
        valueEnum: convertValueEnumToDDBList(record[9].stringValue),
      };
    } else {
      const item = {
        id: record[0].stringValue,
        month: record[1].stringValue,
        prefix: record[2].stringValue,
        projectId: record[3].stringValue,
        appId: record[4].stringValue,
        name: record[7].stringValue,
        category: record[6].stringValue,
        valueType: record[8].stringValue,
        [`day${record[5].longValue}`]: {
          hasData: true,
          valueEnum: convertValueEnumToDDBList(record[9].stringValue),
        },
        summary: {
          hasData: true,
          valueEnum: convertValueEnumToDDBList(record[9].stringValue),
        },
      };
      itemsMap.set(key, item);
    }
  });

  putItemsMapIntoDDBItems(metadataItems, itemsMap);
}

async function batchWriteIntoDDB(metadataItems: any[]) {
  const chunkedMetadataItems = chunkArray(metadataItems, 20);

  for (const itemsChunk of chunkedMetadataItems) {
    const inputPara: BatchWriteCommandInput = {
      RequestItems: {
        [ddbTableName]: itemsChunk,
      },
    };
    await ddbDocClient.send(new BatchWriteCommand(inputPara));
  }
}

function chunkArray(inputArray: any[], chunkSize: number) {
  const chunks = [];
  for (let i = 0; i < inputArray.length; i += chunkSize) {
    chunks.push(inputArray.slice(i, i + chunkSize));
  }
  return chunks;
};

async function queryMetadata(inputSql: string) {
  const redshiftProps = getRedshiftProps(
    process.env.REDSHIFT_MODE!,
    REDSHIFT_DATABASE,
    REDSHIFT_DATA_API_ROLE_ARN,
    process.env.REDSHIFT_DB_USER!,
    process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME!,
    process.env.REDSHIFT_CLUSTER_IDENTIFIER!,
  );
  const sqlStatements : string[] = [];

  sqlStatements.push(inputSql);
  try {
    const queryId = await executeStatementsWithWait(
      redshiftDataApiClient, sqlStatements, redshiftProps.serverlessRedshiftProps, redshiftProps.provisionedRedshiftProps);

    if (!queryId) {
      throw new Error(`Query failed with sqls: ${sqlStatements}`);
    }

    logger.info('query metadata response:', { queryId });

    // Fetch results
    const response = await getStatementResult(redshiftDataApiClient, queryId);

    return response;
  } catch (err) {
    if (err instanceof Error) {
      logger.error('Error when query metadata.', err);
    }
    throw err;
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

function convertToDDBList(inputString?: string) {
  let listData: any[] = [];
  if (inputString) {
    listData = inputString.split('#|!|#');
  }
  return listData;
}

function convertValueEnumToDDBList(inputString?: string) {
  let listData: any[] = [];
  if (inputString) {
    listData = inputString.split('#|!|#').map(item => {
      const lastUnderscoreIndex = item.lastIndexOf('_');
      const value = item.substring(0, lastUnderscoreIndex);
      const count = parseInt(item.substring(lastUnderscoreIndex + 1));
      if (!value || isNaN(count)) {
        return null;
      }
      return { value, count };
    }).filter(item => item !== null);
  }
  return listData;
}

async function batchGetDDBItems(allKeys: any[]) {
  const batchSize = 50;
  const batchResults: any[] = [];
  for (let i = 0; i < allKeys.length; i += batchSize) {
    const currentBatchKeys = allKeys.slice(i, i + batchSize);
    const request: BatchGetCommandInput = {
      RequestItems: {
        [ddbTableName]: {
          Keys: currentBatchKeys,
        },
      },
    };
    const command = new BatchGetCommand(request);
    try {
      const response: BatchGetCommandOutput = await ddbDocClient.send(command);
      batchResults.push(...response.Responses![ddbTableName]);
    } catch (error) {
      console.error(error);
      return null;
    }
  }
  return batchResults;
}

async function getExistingItemsFromDDB(appId: string, redshiftTableName: string) {
  const distinctIdAndMonthSql = `SELECT distinct id, month FROM ${appId}.${redshiftTableName};`;
  const idAndMonthResponse = await queryMetadata(distinctIdAndMonthSql);

  const keys:any[] = [];

  idAndMonthResponse.Records!.forEach((record: any) => {
    keys.push(
      {
        id: record[0].stringValue,
        month: record[1].stringValue,
      },
    );
  });
  // read all ddb item of keys
  const ddbRecrods = await batchGetDDBItems(keys);

  const itemsMap = new Map();
  ddbRecrods?.forEach(item => {
    const key = `${item.id}${item.month}`;
    itemsMap.set(key, item);
  });
  return itemsMap;
}

function putItemsMapIntoDDBItems(metadataItems: any[], itemsMap: Map<string, any[]>) {
  for (const item of itemsMap.values()) {
    metadataItems.push({
      PutRequest: {
        Item: item,
      },
    });
  }
}
