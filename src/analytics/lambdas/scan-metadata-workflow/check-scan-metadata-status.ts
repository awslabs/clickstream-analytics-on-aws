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

import { StatusString } from '@aws-sdk/client-redshift-data';
import { logger } from '../../../common/powertools';
import { SP_SCAN_METADATA } from '../../private/constant';
import { CheckScanMetadataStatusEventDetail } from '../../private/model';
import { describeStatement, executeStatementsWithWait, getRedshiftClient, getRedshiftProps, getStatementResult } from '../redshift-data';

const REDSHIFT_DATA_API_ROLE_ARN = process.env.REDSHIFT_DATA_API_ROLE!;
const REDSHIFT_DATABASE = process.env.REDSHIFT_DATABASE!;

// Create an Amazon service client object.
const redshiftDataApiClient = getRedshiftClient(REDSHIFT_DATA_API_ROLE_ARN);

export interface CheckScanMetadataStatusEvent {
  detail: CheckScanMetadataStatusEventDetail;
}

/**
 * The lambda function get scan metadata status in Redshift by query_id.
 * @param event CheckScanMetadataStatusEvent.
 * @returns The scan metadata results of query_id.
 */
export const handler = async (event: CheckScanMetadataStatusEvent) => {
  logger.debug('request event:', JSON.stringify(event));

  const queryId = event.detail.id;
  const appId = event.detail.appId;
  logger.debug(`query_id:${queryId}`);
  // There is a scan metadata job need to check result.
  const response = await describeStatement(redshiftDataApiClient, queryId);

  if (response.Status == StatusString.FINISHED) {
    logger.info('Scan metadata success.');
    const queryResult = await queryScanMetadataLog(appId);
    return {
      detail: {
        appId: appId,
        status: response.Status,
        message: queryResult.detail.message,
      },
    };
  } else if (response.Status == StatusString.FAILED || response.Status == StatusString.ABORTED) {
    logger.info(`Executing ${queryId} status of statement is ${response.Status}`);
    const queryResult = await queryScanMetadataLog(appId);
    return {
      detail: {
        id: queryId,
        appId: appId,
        status: response.Status,
        message: 'Error:' + response.Error + '\nLog:' + queryResult.detail.message,
      },
    };
  } else {
    logger.info(`Executing ${queryId} status of statement is ${response.Status}`);
    return {
      detail: {
        id: queryId,
        appId: appId,
        status: response.Status,
      },
    };
  }
};

export const queryScanMetadataLog = async (appId: string) => {
  const redshiftProps = getRedshiftProps(
    process.env.REDSHIFT_MODE!,
    REDSHIFT_DATABASE,
    REDSHIFT_DATA_API_ROLE_ARN,
    process.env.REDSHIFT_DB_USER!,
    process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME!,
    process.env.REDSHIFT_CLUSTER_IDENTIFIER!,
  );

  const schema = appId;
  try {
    const querySqlStatement = `SELECT * FROM ${schema}.clickstream_log WHERE log_name='${SP_SCAN_METADATA}' ORDER BY log_date, id`;
    const queryId = await executeStatementsWithWait(
      redshiftDataApiClient, [querySqlStatement], redshiftProps.serverlessRedshiftProps, redshiftProps.provisionedRedshiftProps);

    const response = await getStatementResult(redshiftDataApiClient, queryId!);

    logger.info('Scan metadata log response:', { response });

    const delSqlStatement = `DELETE FROM ${schema}.clickstream_log WHERE log_name='${SP_SCAN_METADATA}'`;
    await executeStatementsWithWait(
      redshiftDataApiClient, [delSqlStatement], redshiftProps.serverlessRedshiftProps, redshiftProps.provisionedRedshiftProps);
    return {
      detail: {
        appId: schema,
        message: response.Records,
      },
    };

  } catch (err) {
    if (err instanceof Error) {
      logger.error('Error when query scan metadata log.', err);
    }
    throw err;
  }
};
