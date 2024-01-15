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

import { checkLoadStatus } from './check-load-status';
import { CLICKSTREAM_DEVICE_VIEW_NAME, CLICKSTREAM_EVENT_ATTR_VIEW_NAME, CLICKSTREAM_EVENT_PARAMETER_VIEW_NAME, CLICKSTREAM_LIFECYCLE_DAILY_VIEW_NAME, CLICKSTREAM_LIFECYCLE_WEEKLY_VIEW_NAME, CLICKSTREAM_RETENTION_VIEW_NAME, CLICKSTREAM_SESSION_DURATION_ATTR_VIEW_NAME, CLICKSTREAM_SESSION_PAGE_ATTR_VIEW_NAME, CLICKSTREAM_USER_FIRST_ATTR_VIEW_NAME } from '../../../common/constant';
import { logger } from '../../../common/powertools';

import { sleep } from '../../../common/utils';
import { getRedshiftClient, executeStatements, getRedshiftProps } from '../redshift-data';

const REDSHIFT_DATA_API_ROLE_ARN = process.env.REDSHIFT_DATA_API_ROLE!;
const REDSHIFT_DATABASE = process.env.REDSHIFT_DATABASE!;
const APP_IDS = process.env.APP_IDS!;
const SLEEP_SEC = process.env.SLEEP_SEC?? '30';

const redshiftDataApiClient = getRedshiftClient(REDSHIFT_DATA_API_ROLE_ARN);

export const handler = async (_e: any, _c: Context) => {

  const redshiftProps = getRedshiftProps(
    process.env.REDSHIFT_MODE!,
    REDSHIFT_DATABASE,
    REDSHIFT_DATA_API_ROLE_ARN,
    process.env.REDSHIFT_DB_USER!,
    process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME!,
    process.env.REDSHIFT_CLUSTER_IDENTIFIER!,
  );

  const appIds = APP_IDS.split(',');

  const queryIds: string[] = [];

  const ENABLE_REFRESH = process.env.ENABLE_REFRESH ?? 'false';
  if (ENABLE_REFRESH === 'true') {
    for (let rawAppId of appIds) {
      const schema = rawAppId.replace(/\./g, '_').replace(/-/g, '_');
      logger.info(`schema: ${schema}`);

      const sqlStatementForApp = `
        REFRESH MATERIALIZED VIEW ${schema}.user_m_view;
        REFRESH MATERIALIZED VIEW ${schema}.item_m_view;
        REFRESH MATERIALIZED VIEW ${schema}.${CLICKSTREAM_EVENT_ATTR_VIEW_NAME};
        REFRESH MATERIALIZED VIEW ${schema}.${CLICKSTREAM_EVENT_PARAMETER_VIEW_NAME};
        REFRESH MATERIALIZED VIEW ${schema}.${CLICKSTREAM_SESSION_DURATION_ATTR_VIEW_NAME};
        REFRESH MATERIALIZED VIEW ${schema}.${CLICKSTREAM_SESSION_PAGE_ATTR_VIEW_NAME};
        REFRESH MATERIALIZED VIEW ${schema}.${CLICKSTREAM_DEVICE_VIEW_NAME};
        REFRESH MATERIALIZED VIEW ${schema}.${CLICKSTREAM_LIFECYCLE_DAILY_VIEW_NAME};
        REFRESH MATERIALIZED VIEW ${schema}.${CLICKSTREAM_LIFECYCLE_WEEKLY_VIEW_NAME};
        REFRESH MATERIALIZED VIEW ${schema}.${CLICKSTREAM_RETENTION_VIEW_NAME};
        REFRESH MATERIALIZED VIEW ${schema}.${CLICKSTREAM_USER_FIRST_ATTR_VIEW_NAME};
      `;

      const sqlStatements = sqlStatementForApp.split(';').map(s => s.trim()).filter(s => s.length > 0);
      logger.info('sqlStatements', { sqlStatements });
      const queryId = await executeStatements(
        redshiftDataApiClient, sqlStatements, redshiftProps.serverlessRedshiftProps, redshiftProps.provisionedRedshiftProps);
      if (queryId) {
        queryIds.push(queryId);
      }
    }
  }

  const execInfo = [];
  await sleep(1000 * parseInt(SLEEP_SEC));

  for (const queryId of queryIds) {
    const statusRes = await checkLoadStatus(queryId);
    logger.info(`queryId: ${queryId} ${statusRes.Status}`);
    execInfo.push({
      queryId,
      status: statusRes.Status,
    });
  }
  return {
    execInfo,
  };

};
