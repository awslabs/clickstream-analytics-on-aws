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

import { logger } from '@aws/clickstream-base-lib';
import { RefreshViewOrSp } from './get-refresh-viewlist';
import { getRedshiftClient, executeStatements, getRedshiftProps } from '../redshift-data';

const REDSHIFT_DATA_API_ROLE_ARN = process.env.REDSHIFT_DATA_API_ROLE!;
const REDSHIFT_DATABASE = process.env.REDSHIFT_DATABASE!;

const redshiftDataApiClient = getRedshiftClient(REDSHIFT_DATA_API_ROLE_ARN);

export interface RefreshSpEvent {
  sp: RefreshViewOrSp;
  timezoneWithAppId: {
    appId: string;
    timezone: string;
  };
  refreshDate: string;
  refreshSpDays: string;
}

/**
 * The lambda function submit a SQL statement to scan metadata.
 * @param event RefreshSpEvent, the JSON format is as follows:
 * @returns The query_id and relevant properties.
 */
export const handler = async (event: RefreshSpEvent) => {

  const redshiftProps = getRedshiftProps(
    process.env.REDSHIFT_MODE!,
    REDSHIFT_DATABASE,
    REDSHIFT_DATA_API_ROLE_ARN,
    process.env.REDSHIFT_DB_USER!,
    process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME!,
    process.env.REDSHIFT_CLUSTER_IDENTIFIER!,
  );

  const sqlStatements: string[] = [];
  try {
    const timezoneWithAppId = event.timezoneWithAppId;
    const spName = event.sp.name;
    const refreshDate = event.refreshDate;
    const timezoneSensitive = event.sp.timezoneSensitive;
    const refreshSpDays = event.refreshSpDays;
    if (timezoneSensitive === 'true') {
      sqlStatements.push(`CALL ${timezoneWithAppId.appId}.${spName}('${refreshDate}', '${timezoneWithAppId.timezone}', ${refreshSpDays});`);
    } else {
      sqlStatements.push(`CALL ${timezoneWithAppId.appId}.${spName}('${refreshDate}', ${refreshSpDays});`);
    }

    logger.info('sqlStatements', { sqlStatements });
    const queryId = await executeStatements(
      redshiftDataApiClient, sqlStatements, redshiftProps.serverlessRedshiftProps, redshiftProps.provisionedRedshiftProps);

    logger.info(`Refresh sp for app: ${timezoneWithAppId.appId} finished, spName: ${spName}`);
    return {
      detail: {
        queryId: queryId,
        spName: spName,
        refreshDate: refreshDate,
      },
    };
  } catch (err) {
    logger.error('Error when refresh sp:', { err });
    throw err;
  }
};