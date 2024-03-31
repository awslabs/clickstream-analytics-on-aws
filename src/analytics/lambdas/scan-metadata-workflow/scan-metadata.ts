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

import { readFileSync } from 'fs';
import { logger } from '../../../common/powertools';
import { SP_SCAN_METADATA, PROPERTY_ARRAY_TEMP_TABLE, USER_COLUMN_TEMP_TABLE } from '../../private/constant';
import { describeStatement, getRedshiftClient, executeStatements, getRedshiftProps } from '../redshift-data';

const REDSHIFT_DATA_API_ROLE_ARN = process.env.REDSHIFT_DATA_API_ROLE!;
const REDSHIFT_DATABASE = process.env.REDSHIFT_DATABASE!;

// Create an Amazon service client object.
const redshiftDataApiClient = getRedshiftClient(REDSHIFT_DATA_API_ROLE_ARN);

export interface ScanMetadataEvent {
  appId: string;
  scanEndDate: string;
  scanStartDate: string;
}

/**
 * The lambda function submit a SQL statement to scan metadata.
 * @param event ScanMetadataEvent, the JSON format is as follows:
 {
    "detail": {
      "appId": app1
    }
  }
  @returns The query_id and relevant properties.
 */
export const handler = async (event: ScanMetadataEvent) => {
  const redshiftProps = getRedshiftProps(
    process.env.REDSHIFT_MODE!,
    REDSHIFT_DATABASE,
    REDSHIFT_DATA_API_ROLE_ARN,
    process.env.REDSHIFT_DB_USER!,
    process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME!,
    process.env.REDSHIFT_CLUSTER_IDENTIFIER!,
  );

  const schema = event.appId;
  const topFrequentPropertiesLimit = process.env.TOP_FREQUENT_PROPERTIES_LIMIT;

  try {
    const propertyListSqlStatements : string[] = [];
    const dropPropertyArrayTempTable = `DROP TABLE IF EXISTS ${schema}.${PROPERTY_ARRAY_TEMP_TABLE};`;
    propertyListSqlStatements.push(dropPropertyArrayTempTable);
    const createPropertyArrayTempTable = `CREATE TABLE IF NOT EXISTS ${schema}.${PROPERTY_ARRAY_TEMP_TABLE} (category VARCHAR, property_name VARCHAR, value_type VARCHAR, property_type VARCHAR);`;
    propertyListSqlStatements.push(createPropertyArrayTempTable);

    const fileContent = readFileSync('/opt/event-v2.sql', 'utf-8');
    insertPropertyTemplateTable(fileContent, propertyListSqlStatements, `${schema}.${PROPERTY_ARRAY_TEMP_TABLE}`, 'event_property');

    const fileContentUser = readFileSync('/opt/user-v2.sql', 'utf-8');
    insertPropertyTemplateTable(fileContentUser, propertyListSqlStatements, `${schema}.${USER_COLUMN_TEMP_TABLE}`, 'user_property');

    const propertyListQueryId = await executeStatements(
      redshiftDataApiClient, propertyListSqlStatements, redshiftProps.serverlessRedshiftProps, redshiftProps.provisionedRedshiftProps);

    logger.debug(`propertyListQueryId:${propertyListQueryId}`);
    while (true) {
      const response = await describeStatement(redshiftDataApiClient, propertyListQueryId!);
      if (response.Status === 'FINISHED') {
        break;
      } else if (response.Status === 'FAILED' || response.Status === 'ABORTED') {
        throw new Error(`propertyListQueryId:${propertyListQueryId} status of statement is ${response.Status}`);
      } else {
        await new Promise(r => setTimeout(r, 20000));
      }
    }

    const sqlStatements : string[] = [];
    const scanEndDate = new Date(event.scanEndDate).toISOString();
    if (event.scanStartDate) {
      const scanStartDate = new Date(event.scanStartDate).toISOString();
      sqlStatements.push(`CALL ${schema}.${SP_SCAN_METADATA}(${topFrequentPropertiesLimit}, '${scanEndDate}', '${scanStartDate}')`);
    } else {
      sqlStatements.push(`CALL ${schema}.${SP_SCAN_METADATA}(${topFrequentPropertiesLimit}, '${scanEndDate}', NULL)`);
    }

    const queryId = await executeStatements(
      redshiftDataApiClient, sqlStatements, redshiftProps.serverlessRedshiftProps, redshiftProps.provisionedRedshiftProps);

    logger.info('Scan metadata response:', { queryId });
    return {
      detail: {
        appId: schema,
        id: queryId,
        lastScanEndDate: scanEndDate,
      },
    };

  } catch (err) {
    if (err instanceof Error) {
      logger.error('Error when scan metadata.', err);
    }
    throw err;
  }
};

function insertPropertyTemplateTable(fileContent: string, sqlStatements: string[], tableName: string, property_type: string) {
  const metadataRegex = /-- METADATA (.+)/g;
  const metadataMatches = fileContent.matchAll(metadataRegex);
  let values: string = '';
  for (const match of metadataMatches) {
    const metadataJson = match[1];
    try {
      const metadataObject = JSON.parse(metadataJson);
      values += `('${metadataObject.category}', '${metadataObject.name}', '${metadataObject.dataType}', '${property_type}'), `;
    } catch (parseError) {
      logger.error('JSON parsing error:', { parseError });
    }
  }
  if (values.length > 0) {
    values = values.slice(0, -2);
    const insertPropertyArrayTempTable = `INSERT INTO ${tableName} (category, property_name, value_type) VALUES ${values};`;
    sqlStatements.push(insertPropertyArrayTempTable);
  }
}