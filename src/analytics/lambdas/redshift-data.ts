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
import { DescribeStatementCommand, ExecuteStatementCommand, RedshiftDataClient } from '@aws-sdk/client-redshift-data';
import { fromTemporaryCredentials } from '@aws-sdk/credential-providers';
import { logger } from '../../common/powertools';
import { ServerlessRedshiftProps, ProvisionedRedshiftProps } from '../private/model';

export function getRedshiftClient(roleArn: string) {
  return new RedshiftDataClient({
    credentials: fromTemporaryCredentials({
      // Required. Options passed to STS AssumeRole operation.
      params: {
        // Required. ARN of role to assume.
        RoleArn: roleArn,
        // Optional. An identifier for the assumed role session. If skipped, it generates a random
        // session name with prefix of 'aws-sdk-js-'.
        RoleSessionName: 'redshift-data-api',
        // Optional. The duration, in seconds, of the role session.
        DurationSeconds: 900,
      },
    }),
  });
}

const GET_STATUS_TIMEOUT = 150; // second

export const executeStatement = async (client: RedshiftDataClient, sqlStatement: string, database: string,
  serverlessRedshiftProps?: ServerlessRedshiftProps, provisionedRedshiftProps?: ProvisionedRedshiftProps) => {
  if (serverlessRedshiftProps) {logger.info(`Execute create schemas SQL statement in ${serverlessRedshiftProps.workgroupName}.${database}`);} else if (provisionedRedshiftProps) {logger.info(`Execute create schemas SQL statement in ${provisionedRedshiftProps.clusterIdentifier}.${database}`);}
  const params = new ExecuteStatementCommand({
    Sql: sqlStatement,
    WorkgroupName: serverlessRedshiftProps?.workgroupName,
    ClusterIdentifier: provisionedRedshiftProps?.clusterIdentifier,
    DbUser: provisionedRedshiftProps?.dbUser,
    Database: database,
    WithEvent: true,
  });
  const execResponse = await client.send(params);
  const queryId: string = execResponse.Id!;
  logger.info(`Got query_id:${queryId} after executing command ${sqlStatement} in redshift.`);

  return queryId;
};

export const executeStatementWithWait = async (client: RedshiftDataClient, sqlStatement: string, database: string,
  serverlessRedshiftProps?: ServerlessRedshiftProps, provisionedRedshiftProps?: ProvisionedRedshiftProps) => {
  const queryId = await executeStatement(client, sqlStatement, database, serverlessRedshiftProps, provisionedRedshiftProps);

  const checkParams = new DescribeStatementCommand({
    Id: queryId,
  });
  var response = await client.send(checkParams);
  logger.info(`Get create schemas status: ${response.Status}`, JSON.stringify(response));
  var count = 0;
  while (response.Status != 'FINISHED' && response.Status != 'FAILED' && count < GET_STATUS_TIMEOUT) {
    await Sleep(1000);
    count++;
    response = await client.send(checkParams);
    logger.info(`Get create schemas status: ${response.Status}`, JSON.stringify(response));
  }
  if (response.Status == 'FAILED') {
    logger.error('Error: '+ response.Status, JSON.stringify(response));
    throw new Error(JSON.stringify(response));
  }
};

export const Sleep = (ms: number) => {
  return new Promise(resolve=>setTimeout(resolve, ms));
};