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

import { logger } from '../../../common/powertools';
import { getRedshiftClient, executeStatements, getRedshiftProps } from '../redshift-data';

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
  logger.debug('request event:', JSON.stringify(event));
  const redshiftProps = getRedshiftProps(
    process.env.REDSHIFT_MODE!,
    REDSHIFT_DATABASE,
    REDSHIFT_DATA_API_ROLE_ARN,
    process.env.REDSHIFT_DB_USER!,
    process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME!,
    process.env.REDSHIFT_CLUSTER_IDENTIFIER!,
  );

  const schema = event.appId;
  const sqlStatements : string[] = [];
  const topFrequentPropertiesLimit = process.env.TOP_FREQUENT_PROPERTIES_LIMIT;

  try {
    const scanEndDate = event.scanEndDate;
    const scanStartDate = event.scanStartDate;
    if (scanStartDate) {
      sqlStatements.push(`CALL ${schema}.sp_scan_metadata(${topFrequentPropertiesLimit}, '${scanEndDate}', '${scanStartDate}')`);
    } else {
      sqlStatements.push(`CALL ${schema}.sp_scan_metadata(${topFrequentPropertiesLimit}, '${scanEndDate}', NULL)`);
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