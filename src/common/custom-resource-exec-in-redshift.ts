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

import { aws_sdk_client_common_config, logger, sleep } from '@aws/clickstream-base-lib';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { putStringToS3 } from './s3';

const sfnClient = new SFNClient({
  ...aws_sdk_client_common_config,
});

const STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN!;
const S3_BUCKET = process.env.S3_BUCKET!;
const S3_PREFIX = process.env.S3_PREFIX!;

export const createSchemasInRedshiftAsync = async (projectId: string, sqlStatementsByApp: Map<string, string[]>) => {
  const createSchemasInRedshiftForApp = async (appId: string, sqlStatements: string[]) => {
    logger.info(`creating schema in serverless Redshift for ${appId}`);
    await executeSqlsByStateMachine(sqlStatements, projectId, appId);
  };

  for (const [appId, sqlStatements] of sqlStatementsByApp) {
    await createSchemasInRedshiftForApp(appId, sqlStatements);
    await sleep(process.env.SUBMIT_SQL_INTERVAL_MS ? parseInt(process.env.SUBMIT_SQL_INTERVAL_MS) : 1000);
  }
};


const executeSqlsByStateMachine = async (sqlStatements: string[], projectId: string, appId: string) => {

  const s3Paths = [];
  let index = 0;
  const timestamp = new Date().toISOString().replace(/[:.-]/g, '');

  for (const sqlStatement of sqlStatements) {
    const bucketName = S3_BUCKET;
    const fileName = `${appId}-${timestamp}/${index++}.sql`;
    const key = `${S3_PREFIX}tmp/${projectId}/sqls/${fileName}`;

    await putStringToS3(sqlStatement, bucketName, key);

    const s3Path = `s3://${bucketName}/${key}`;
    s3Paths.push(s3Path);
  }

  const params = {
    stateMachineArn: STATE_MACHINE_ARN,
    name: `${appId}-${timestamp}-${index}`,
    input: JSON.stringify({
      sqls: s3Paths,
    }),
  };
  logger.info('executeSqlsByStateMachine()', { params });
  try {
    const res = await sfnClient.send(new StartExecutionCommand(params));
    logger.info('executeSqlsByStateMachine()', { res });
    return res;
  } catch (err) {
    logger.error('Error happened when executing sqls in state machine.', { err });
    throw err;
  }
};