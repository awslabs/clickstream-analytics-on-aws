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

import { Context } from 'aws-lambda';

import { logger } from '../../../common/powertools';

import { getRedshiftClient, executeStatements, getRedshiftProps } from '../redshift-data';


const REDSHIFT_DATA_API_ROLE_ARN = process.env.REDSHIFT_DATA_API_ROLE!;
const REDSHIFT_DATABASE = process.env.REDSHIFT_DATABASE!;
const APP_IDS = process.env.APP_IDS!;

const redshiftDataApiClient = getRedshiftClient(REDSHIFT_DATA_API_ROLE_ARN);

export const handler = async (event: any, _: Context) => {
  logger.debug('requestJson:', { event});

  const redshiftProps = getRedshiftProps(
    process.env.REDSHIFT_MODE!,
    REDSHIFT_DATABASE,
    REDSHIFT_DATA_API_ROLE_ARN,
    process.env.REDSHIFT_DB_USER!,
    process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME!,
    process.env.REDSHIFT_CLUSTER_IDENTIFIER!,
  );

  const appIds = APP_IDS.split(",");

  const sqlStatements: string[] = [];

  for (let appId of appIds) {
    appId = appId.replace(/\./g, '_').replace(/\-/g, '_');
    logger.info(`appId:${appId}`);
    const schema = appId;

    const sqlStatementForApp = `
REFRESH MATERIALIZED VIEW ${schema}.user_m_view;
REFRESH MATERIALIZED VIEW ${schema}.item_m_view;
REFRESH MATERIALIZED VIEW ${schema}.clickstream_event_view_v1;
REFRESH MATERIALIZED VIEW ${schema}.clickstream_event_parameter_view_v1;
REFRESH MATERIALIZED VIEW ${schema}.clickstream_session_view_v1;
REFRESH MATERIALIZED VIEW ${schema}.clickstream_device_view_v1;
REFRESH MATERIALIZED VIEW ${schema}.clickstream_lifecycle_daily_view_v1;
REFRESH MATERIALIZED VIEW ${schema}.clickstream_lifecycle_weekly_view_v1;
REFRESH MATERIALIZED VIEW ${schema}.clickstream_retention_view_v1;
`;

    sqlStatements.push(...sqlStatementForApp.split("\n"));
  }

  logger.info("sqlStatements", { sqlStatements })

  try {
    const queryId = await executeStatements(
      redshiftDataApiClient, sqlStatements, redshiftProps.serverlessRedshiftProps, redshiftProps.provisionedRedshiftProps);
    logger.info('executeStatements response:', { queryId });
    return {
      detail: {
        id: queryId,
      },
    };
  } catch (err) {
    if (err instanceof Error) {
      logger.error('Error when loading data to Redshift.', err);
    }
    throw err;
  }

};
