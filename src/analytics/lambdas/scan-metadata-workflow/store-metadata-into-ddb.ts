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
import { DynamoDBDocumentClient, BatchWriteCommand, BatchWriteCommandInput } from '@aws-sdk/lib-dynamodb';
import { logger } from '../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../common/sdk-client-config';
import { StoreMetadataBody } from '../../private/model';
import { getRedshiftClient, executeStatementsWithWait, getRedshiftProps, getStatementResult } from '../redshift-data';

const REDSHIFT_DATA_API_ROLE_ARN = process.env.REDSHIFT_DATA_API_ROLE!;
const REDSHIFT_DATABASE = process.env.REDSHIFT_DATABASE!;

const { ddb_region, ddb_table_name } = parseDynamoDBTableARN(process.env.METADATA_DDB_TABLE_ARN!);

// Create an Amazon service client object.
const redshiftDataApiClient = getRedshiftClient(REDSHIFT_DATA_API_ROLE_ARN);

export interface StoreMetadataEvent {
  detail: StoreMetadataBody;
}

// Create an Amazon DynamoDB service client object.
const ddbClient = new DynamoDBClient({
  ...aws_sdk_client_common_config,
  region: ddb_region,
});

const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

/**
 * The lambda function to get event metadata and properties metadata from redshift. And store them into DDB
 * @param event StoreMetadataEvent.
 * @returns.
 */
export const handler = async (event: StoreMetadataEvent) => {
  logger.debug('request event:', JSON.stringify(event));

  const metadataItems: any[] = [];
  const appId = event.detail.appId;
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

  const inputSql = `SELECT id, type, prefix, project_id, app_id, event_name, metadata_source, data_volumel_last_day, platform FROM ${appId}.event_metadata;`;

  const response = await queryMetadata(inputSql);

  response.Records!.forEach(record => {
    metadataItems.push({
      PutRequest: {
        Item: {
          id: record[0].stringValue,
          type: record[1].stringValue,
          prefix: record[2].stringValue,
          projectId: record[3].stringValue,
          appId: record[4].stringValue,
          name: record[5].stringValue,
          metadataSource: record[6].stringValue,
          dataVolumeLastDay: record[7].longValue,
          platform: convertToDDBList(record[8].stringValue),
          ...getCommonData(),
        },
      },
    });
  });
}

async function handlePropertiesMetadata(appId: string, metadataItems: any[]) {
  const inputSql =
    `SELECT id, type, prefix, event_name, project_id, app_id, category, metadata_source, property_type, property_name, property_id, value_type, value_enum, platform FROM ${appId}.event_properties_metadata;`;

  const response = await queryMetadata(inputSql);

  // Transform data to DynamoDB format
  response.Records!.forEach(record => {
    metadataItems.push({
      PutRequest: {
        Item: {
          id: record[0].stringValue,
          type: record[1].stringValue,
          prefix: record[2].stringValue,
          eventName: record[3].stringValue,
          projectId: record[4].stringValue,
          appId: record[5].stringValue,
          category: record[6].stringValue,
          metadataSource: record[7].stringValue,
          parameterType: record[8].stringValue,
          name: record[9].stringValue,
          parameterId: record[10].stringValue,
          valueType: record[11].stringValue,
          valueEnum: convertToDDBList(record[12].stringValue),
          platform: convertToDDBList(record[13].stringValue),
          eventDescription: '',
          eventDisplayName: '',
          ...getCommonData(),
        },
      },
    });
  });
}

async function handleUserAttributeMetadata(appId: string, metadataItems: any[]) {
  const inputSql =
    `SELECT id, type, prefix, project_id, app_id, category, metadata_source, property_type, property_name, value_type, value_enum, platform FROM ${appId}.user_attribute_metadata;`;

  const response = await queryMetadata(inputSql);

  // Transform data to DynamoDB format
  response.Records!.forEach(record => {
    metadataItems.push({
      PutRequest: {
        Item: {
          id: record[0].stringValue,
          type: record[1].stringValue,
          prefix: record[2].stringValue,
          projectId: record[3].stringValue,
          appId: record[4].stringValue,
          category: record[5].stringValue,
          metadataSource: record[6].stringValue,
          parameterType: record[7].stringValue,
          name: record[8].stringValue,
          valueType: record[9].stringValue,
          valueEnum: convertToDDBList(record[10].stringValue),
          platform: convertToDDBList(record[11].stringValue),
          ...getCommonData(),
        },
      },
    });
  });
}

async function batchWriteIntoDDB(metadataItems: any[]) {
  const chunkedMetadataItems = chunkArray(metadataItems, 20);

  for (const itemsChunk of chunkedMetadataItems) {
    const inputPara: BatchWriteCommandInput = {
      RequestItems: {
        [ddb_table_name]: itemsChunk,
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
  const table_name = arnComponents[5].split('/')[1];

  return {
    ddb_region: region,
    ddb_table_name: table_name,
  };
}

function convertToDDBList(inputString?: string) {
  let listData = [];
  if (inputString) {
    const formattedString = inputString.replace(/^\[|\]$/g, '').split(',').map(item => `"${item}"`).join(',');
    const jsonArray = `[${formattedString}]`;
    listData = JSON.parse(jsonArray);
  }
  return listData;
}

function getCommonData() {
  return {
    displayName: '',
    description: '',
    hasData: true,
    updateAt: Date.now(),
    createAt: Date.now(),
    operator: '',
    deleted: false,
    ttl: (Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60),
  };
}