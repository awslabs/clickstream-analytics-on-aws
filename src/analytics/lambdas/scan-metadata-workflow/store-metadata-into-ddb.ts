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
import { DynamoDBDocumentClient, GetCommand, PutCommand, BatchWriteCommand, BatchWriteCommandInput, QueryCommandInput, QueryCommand } from '@aws-sdk/lib-dynamodb';
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
  const appId = event.detail.appId;
  const metadataItems: any[] = [];
  // id as key, and currentMonth as value for those marked latest month
  const markedLatestMonthMap: Map<string, any> = new Map();
  try {
    logger.warn('mingtong step 1 Start to store metadata into ddb.');
    await handlePropertiesMetadata(appId, metadataItems, markedLatestMonthMap);

    logger.warn('mingtong step 2');
    await handleEventMetadata(appId, metadataItems, markedLatestMonthMap);

    logger.warn('mingtong step 3');

    await handleUserAttributeMetadata(appId, metadataItems, markedLatestMonthMap);

    logger.warn('mingtong step 4');

    for (const item of metadataItems) {
      if (item.PutRequest.Item.id === 'metadata_performance_tunning_iiof#app1#event#_exception_stack#string') {
        logger.warn('mingtong step 4.1, item:', { item });
      }
    }

    await batchWriteIntoDDB(metadataItems);

    logger.warn('mingtong step 5');

    return {
      detail: {
        appId: appId,
        status: 'SUCCEED',
        message: 'store metadata into ddb successfully',
      },
    };
  } catch (err) {
    if (err instanceof Error) {
      logger.error('Error when store metadata into ddb.', err);
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

async function handleEventMetadata(appId: string, metadataItems: any[], markedLatestMonthMap: Map<string, any>) {

  const itemsMap = await getExistingItemsFromDDB(appId, 'event_metadata');

  const inputSql = `SELECT id, month, prefix, project_id, app_id, day_number, count, event_name, platform, sdk_version, sdk_name FROM ${appId}.event_metadata;`;

  const response = await queryMetadata(inputSql);

  for (const record of response.Records!){
    const key = `${record[0].stringValue}${record[1].stringValue}`;
    if (itemsMap.has(key)) {
      const item = itemsMap.get(key);
      item[`day${record[5].longValue}`] = {
        count: record[6].longValue,
        hasData: true,
        platform: Array.from(convertToSet(record[8].stringValue)),
        sdkVersion: Array.from(convertToSet(record[9].stringValue)),
        sdkName: Array.from(convertToSet(record[10].stringValue)),
      };
    } else {
      const item = {
        id: record[0].stringValue,
        month: await getAndMarkMonthValue(itemsMap, record[0].stringValue, record[1].stringValue, markedLatestMonthMap),
        originMonth: record[1].stringValue,
        prefix: record[2].stringValue,
        projectId: record[3].stringValue,
        appId: record[4].stringValue,
        name: record[7].stringValue,
        [`day${record[5].longValue}`]: {
          count: record[6].longValue,
          hasData: true,
          platform: Array.from(convertToSet(record[8].stringValue)),
          sdkVersion: Array.from(convertToSet(record[9].stringValue)),
          sdkName: Array.from(convertToSet(record[10].stringValue)),
        },
        summary: {
          hasData: true,
          platform: [],
          sdkVersion: [],
          sdkName: [],
          associatedParameters: [],
        },
      };
      itemsMap.set(key, item);
    }
  }
  
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
    item.summary.platform = Array.from(platformSet);
    item.summary.sdkVersion = Array.from(sdkVersionSet);
    item.summary.sdkName = Array.from(sdkNameSet);
    associatedParametersToEvent(item.name, item.summary.associatedParameters, metadataItems);
  }
  putItemsMapIntoDDBItems(metadataItems, itemsMap);
}

function associatedParametersToEvent(eventName: string, associatedParameters: any[], parameterItem: any[]) {
  for (const parameter of parameterItem) {
    const parameterItem = parameter.PutRequest.Item;
    if (parameterItem.summary.associatedEvents.includes(eventName)) {
      const parameterName = parameterItem.name;
      const parameterCategory = parameterItem.category;
      const parameterValueType = parameterItem.valueType;
      // check if any record of associatedParameters contains parameterName, parameterCategory and parameterValueType
      const existedParameter = associatedParameters.find(
        (element: any) => element.name === parameterName && element.category === parameterCategory && element.valueType === parameterValueType);
      if (!existedParameter && associatedParameters.length < 1000) {
        associatedParameters.push({
          name: parameterName,
          category: parameterCategory,
          valueType: parameterValueType,
        });
      }
    }
  }
}

async function handlePropertiesMetadata(appId: string, metadataItems: any[], markedLatestMonthMap: Map<string, any>) {
  const itemsMap = await getExistingItemsFromDDB(appId, 'event_parameter_metadata');

  const inputSql =
    `SELECT id, month, prefix, project_id, app_id, day_number, category, event_name_set, property_name, value_type, property_value, count, platform FROM ${appId}.event_parameter_metadata;`;
  const response = await queryMetadata(inputSql);

  // clear item.dayN record which will be replaced by new record
  for (const record of response.Records!) {
    const key = `${record[0].stringValue}${record[1].stringValue}`;
    if (itemsMap.has(key)) {
      const item = itemsMap.get(key);
      item[`day${record[5].longValue}`] = {
        hasData: true,
        platform: [],
        valueEnum: [],
      };
    }
  }

  for (const record of response.Records!) {
    const key = `${record[0].stringValue}${record[1].stringValue}`;
    if (itemsMap.has(key)) {
      const item = itemsMap.get(key);
      const dayNumber = `day${record[5].longValue}`;
      if (!item[dayNumber]) {
        // initialize dayN record
        item[dayNumber] = {
          hasData: true,
          platform: [],
          valueEnum: [],
        };
      }      
      // set platform value
      const platformSet: Set<string> = new Set(item[dayNumber].platform);

      addSetIntoAnotherSet(platformSet, convertToSet(record[12].stringValue));

      item[dayNumber].platform = Array.from(platformSet);

      // push parameter value and count into valueEnum
      item[dayNumber].valueEnum.push({ value: record[10].stringValue, count: record[11].longValue });

      if(item.summary) {
        // add event name to event name set
        const eventNameSet: Set<string> = new Set(item.summary.associatedEvents);
        addSetIntoAnotherSet(eventNameSet, convertToSet(record[7].stringValue));
        item.summary.associatedEvents = Array.from(eventNameSet);

        // add platform value into summary platform
        addSetIntoAnotherSet(platformSet, item.summary.platform);
        item.summary.platform = Array.from(platformSet);
      }
    } else {
      // there is not existing item in ddb, create a new item
      const item = {
        id: record[0].stringValue,
        month: await getAndMarkMonthValue(itemsMap, record[0].stringValue, record[1].stringValue, markedLatestMonthMap),
        originMonth: record[1].stringValue,
        prefix: record[2].stringValue,
        projectId: record[3].stringValue,
        appId: record[4].stringValue,
        name: record[8].stringValue,
        category: record[6].stringValue,
        valueType: record[9].stringValue,
        createTimeStamp: Date.now(),
        [`day${record[5].longValue}`]: {
          hasData: true,
          platform: Array.from(convertToSet(record[12].stringValue)),
          valueEnum: [{ value: record[10].stringValue, count: record[11].longValue }],
        },
        summary: {
          hasData: true,
          platform: Array.from(convertToSet(record[12].stringValue)),
          valueEnum: [{ value: record[10].stringValue, count: record[11].longValue }],
          associatedEvents: Array.from(convertToSet(record[7].stringValue)),
        },
      };
      itemsMap.set(key, item);
    }    
  }

  // aggregate summary info
  for (const item of itemsMap.values()) {
    const valueEnumAggregation: { [key: string]: number } = {};
    for (const key in item) {
      if (key.startsWith('day')) {
        const dayData = item[key];
        dayData.valueEnum?.forEach((element: any) => {
          if (valueEnumAggregation[element.value]) {
            valueEnumAggregation[element.value] += element.count;
          } else {
            valueEnumAggregation[element.value] = element.count;
          }
        });
      }
    }
    const valueEnum = [];
    for (const key in valueEnumAggregation) {
      if (valueEnum.length < 50) {
        valueEnum.push({ value: key, count: valueEnumAggregation[key] });
      }
    }
    item.summary.valueEnum = valueEnum;
    item.updateTimeStamp = Date.now();
  }
  putItemsMapIntoDDBItems(metadataItems, itemsMap);
}

async function handleUserAttributeMetadata(appId: string, metadataItems: any[], markedLatestMonthMap: Map<string, any>) {
  const itemsMap = await getExistingItemsFromDDB(appId, 'user_attribute_metadata');
  const inputSql =
    `SELECT id, month, prefix, project_id, app_id, day_number, category, property_name, value_type, value_enum FROM ${appId}.user_attribute_metadata;`;

  const response = await queryMetadata(inputSql);

  for (const record of response.Records!){
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
        month: await getAndMarkMonthValue(itemsMap, record[0].stringValue, record[1].stringValue, markedLatestMonthMap),
        originMonth: record[1].stringValue,
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
  };

  putItemsMapIntoDDBItems(metadataItems, itemsMap);
}

async function batchWriteIntoDDB(metadataItems: any[]) {

  // mingtong temp function
  checkIfItemExistInMetadataItems(metadataItems);

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

function addSetIntoAnotherSet(sourceSet: Set<string>, inputSet: Set<string>) {
  for (const element of inputSet) {
    if (sourceSet.size < 1000) {
      sourceSet.add(element);
    }
  }
}

async function getAndMarkMonthValue(memoryItemMap: Map<string, any>, id: string, currentMonth: string, markedLatestMonthMap: Map<string, any>) {
  const getCommandParameter = {
    TableName: ddbTableName,
    Key: {
      id: id,
      month: 'latest',
    },
  };

  // compare with ddb latest month
  try {
    const response = await ddbDocClient.send(new GetCommand(getCommandParameter));
    if (response.Item) {
      const item = response.Item;
      const originMonth = item.originMonth;
      if (originMonth < currentMonth) {
        item.month = item.originMonth;
        const params = {
          TableName: ddbTableName,
          Item: item
        };
        await ddbDocClient.send(new PutCommand(params));     
      } else {
        return currentMonth;
      }
    }

    // compare with memory latest month
    if (markedLatestMonthMap.has(id)) {
      const markedMonth = markedLatestMonthMap.get(id);
      if (markedMonth < currentMonth) {
        // update memory latest month
        const key = `${id}${markedMonth}`;
        const item = memoryItemMap.get(key);
        item.month = markedMonth;
        memoryItemMap.set(key, item);
      } else {
        return currentMonth;
      }
    }
    // update memory latest month
    markedLatestMonthMap.set(id, currentMonth);    
    return 'latest';
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Error when mark latest month .', error);
    }
    throw error;
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

function convertToSet(inputString?: string) {
  let dataSet : Set<string> = new Set();
  if (inputString) {
    inputString.split('#|!|#').forEach(item => {
      // limit the size of set to 1000 for events in parameter
      if (dataSet.size < 1000) {
        dataSet.add(item);
      }
    });
  }
  return dataSet;
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

// async function batchGetDDBItems(allKeys: any[]) {
//   const batchSize = 50;
//   const batchResults: any[] = [];
//   for (let i = 0; i < allKeys.length; i += batchSize) {
//     const currentBatchKeys = allKeys.slice(i, i + batchSize);
//     const request: BatchGetCommandInput = {
//       RequestItems: {
//         [ddbTableName]: {
//           Keys: currentBatchKeys,
//         },
//       },
//     };
//     const command = new BatchGetCommand(request);
//     try {
//       const response: BatchGetCommandOutput = await ddbDocClient.send(command);
//       batchResults.push(...response.Responses![ddbTableName]);
//     } catch (error) {
//       console.error(error);
//       return null;
//     }
//   }
//   return batchResults;
// }

async function getMetadataFromDDBByIdAndOriginMonth(id: string, originMonth: string) {
  logger.info(`Get all metadata from DDB according to id: ${id} and originMonth: ${originMonth}`);
  const queryCommandInput: QueryCommandInput = {
    TableName: ddbTableName,
    KeyConditionExpression: '#id= :id',
    FilterExpression: '#originMonth = :originMonth',
    ExpressionAttributeNames: {
      '#originMonth': 'originMonth',
      '#id': 'id',
    },
    ExpressionAttributeValues: {
      ':id': id,
      ':originMonth': originMonth,
    },
    ScanIndexForward: false,
  };
  const response = await ddbDocClient.send(new QueryCommand(queryCommandInput));
  return response.Items;
}

async function getExistingItemsFromDDB(appId: string, redshiftTableName: string) {
  const distinctIdAndMonthSql = `SELECT distinct id, month FROM ${appId}.${redshiftTableName};`;
  const idAndMonthResponse = await queryMetadata(distinctIdAndMonthSql);
  const itemsMap = new Map();
  for (const record of idAndMonthResponse.Records!) {
    // read all ddb item of keys
    const ddbRecrods = await getMetadataFromDDBByIdAndOriginMonth(record[0].stringValue, record[1].stringValue); 
    ddbRecrods?.forEach(item => {
      const key = `${item.id}${item.originMonth}`;
      itemsMap.set(key, item);
    });  
  };
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

// mingtong temp function
// create a funtion to check if there is the same id and month in input metadataItems 
function checkIfItemExistInMetadataItems(metadataItems: any[]) {
  const idAndMonthSet: Set<string> = new Set();
  for (const item of metadataItems) {
    const idAndMonth = `${item.PutRequest.Item.id}${item.PutRequest.Item.month}`;
    if (idAndMonthSet.has(idAndMonth)) {
      logger.warn(`mingtong step, There is the same id and month in input metadataItems: ${idAndMonth}`);
    } else {
      idAndMonthSet.add(idAndMonth);
    }
  }
}

