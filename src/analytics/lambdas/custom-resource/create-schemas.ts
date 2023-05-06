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

import crypto from 'crypto';
import { RedshiftDataClient } from '@aws-sdk/client-redshift-data';
import { DeleteParameterCommand, DeleteParameterCommandInput, ParameterNotFound, ParameterTier, ParameterType, PutParameterCommand, PutParameterCommandInput, SSMClient } from '@aws-sdk/client-ssm';
import { CdkCustomResourceHandler, CdkCustomResourceEvent, CdkCustomResourceResponse } from 'aws-lambda';
import { BIUserCredential } from '../../../common/model';
import { logger } from '../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../common/sdk-client-config';
import { SQL_TEMPLATE_PARAMETER } from '../../private/constant';
import { CreateDatabaseAndSchemas, MustacheParamType } from '../../private/model';
import { getSqlContent, getSqlContents } from '../../private/utils';
import { getRedshiftClient, executeStatementsWithWait } from '../redshift-data';

export type ResourcePropertiesType = CreateDatabaseAndSchemas & {
  readonly ServiceToken: string;
}

const ssmClient = new SSMClient({
  ...aws_sdk_client_common_config,
});
export const physicalIdPrefix = 'create-redshift-db-schemas-custom-resource-';
export const handler: CdkCustomResourceHandler = async (event) => {
  logger.info(JSON.stringify(event));
  const physicalId = ('PhysicalResourceId' in event) ? event.PhysicalResourceId :
    `${physicalIdPrefix}${generateRandomStr(8, 'abcdefghijklmnopqrstuvwxyz0123456789')}`;
  const biUsername = `${(event.ResourceProperties as ResourcePropertiesType).redshiftBIUsernamePrefix}${physicalId.substring(physicalIdPrefix.length)}`;
  const response: CdkCustomResourceResponse = {
    PhysicalResourceId: physicalId,
    Data: {
      DatabaseName: event.ResourceProperties.databaseName,
      RedshiftBIUsername: biUsername,
    },
    Status: 'SUCCESS',
  };

  try {
    await _handler(event, biUsername);
  } catch (e) {
    if (e instanceof Error) {
      logger.error('Error when creating database and schema in redshift', e);
    }
    throw e;
  }
  return response;
};

async function _handler(event: CdkCustomResourceEvent, biUsername: string) {
  const requestType = event.RequestType;

  logger.info('RequestType: ' + requestType);
  if (requestType == 'Create') {
    await onCreate(event, biUsername);
  }

  if (requestType == 'Update') {
    await onUpdate(event, biUsername);
  }

  if (requestType == 'Delete') {
    await onDelete(event, biUsername);
  }
}

async function onCreate(event: CdkCustomResourceEvent, biUsername: string) {
  logger.info('onCreate()');

  const props = event.ResourceProperties as ResourcePropertiesType;

  // 0. generate password and save to parameter store
  const credential = await createBIUserCredentialParameter(props.redshiftBIUserParameter, biUsername, props.projectId);

  // 1. create database in Redshift
  const client = getRedshiftClient(props.dataAPIRole);
  if (props.serverlessRedshiftProps || props.provisionedRedshiftProps) {
    await createDatabaseInRedshift(client, props.databaseName, props);
    await createDatabaseBIUser(client, credential, props);
  } else {
    throw new Error('Can\'t identity the mode Redshift cluster!');
  }

  // 2. create schemas in Redshift for applications
  await createSchemas(props, biUsername);

  // 3. create views for reporting
  await createViewForReporting(props);
}

async function createBIUserCredentialParameter(parameterName: string, biUsername: string, projectId: string): Promise<BIUserCredential> {
  const credential: BIUserCredential = {
    username: biUsername,
    password: generateRedshiftUserPassword(32),
  };
  const input: PutParameterCommandInput = {
    Name: parameterName,
    DataType: 'text',
    Description: `Managed by Clickstream for storing credential of Quicksight reporting user for project ${projectId}.`,
    Tier: ParameterTier.STANDARD,
    Type: ParameterType.SECURE_STRING,
    Value: JSON.stringify(credential),
    Overwrite: true,
  };
  logger.info(`Creating the credential of BI user '${biUsername}' of Redshift to parameter ${parameterName}.`);
  await ssmClient.send(new PutParameterCommand(input));

  return credential;
}

async function deleteBIUserCredentialParameter(parameterName: string, biUsername: string) {
  const input: DeleteParameterCommandInput = {
    Name: parameterName,
  };
  logger.info(`Deleting the credential of BI user '${biUsername}' of Redshift to parameter ${parameterName}.`);
  await ssmClient.send(new DeleteParameterCommand(input));
}

async function onUpdate(event: CdkCustomResourceEvent, biUsername: string) {
  logger.info('onUpdate()');

  const props = event.ResourceProperties as ResourcePropertiesType;
  await createSchemas(props, biUsername);

  await createViewForReporting(props);
}

async function onDelete(event: CdkCustomResourceEvent, biUsername: string) {
  logger.info('onDelete()');
  const props = event.ResourceProperties as ResourcePropertiesType;
  try {
    await deleteBIUserCredentialParameter(props.redshiftBIUserParameter, biUsername);
  } catch (error) {
    if (error instanceof ParameterNotFound) {
      logger.warn(`The parameter ${props.redshiftBIUserParameter} already is deleted.`);
    }
  }
  logger.info('doNothing to keep the database and schema');
}

function splitString(str: string): string[] {
  if (!str.trim()) { // checks if string is blank or only whitespace characters
    return []; // return an empty array
  } else {
    return str.split(','); // split the string by comma
  }
}

async function createSchemas(props: ResourcePropertiesType, biUsername: string) {
  const odsTableName = props.odsTableName;

  const appIds = splitString(props.appIds);
  const sqlStatements : string[] = [];
  for (const app of appIds) {
    const mustacheParam: MustacheParamType = {
      schema: app,
      table_ods_events: odsTableName,
      user_bi: biUsername,
      ...SQL_TEMPLATE_PARAMETER,
    };
    sqlStatements.push(`CREATE SCHEMA IF NOT EXISTS ${app}`);
    sqlStatements.push(getSqlContent('ods-events.sql', mustacheParam));
    sqlStatements.push(getSqlContent('sp-clickstream-log.sql', mustacheParam));

    sqlStatements.push(...getSqlContents('grant-permissions-to-bi-user.sql', mustacheParam));

    sqlStatements.push(getSqlContent('dim-users.sql', mustacheParam));
    sqlStatements.push(getSqlContent('sp-upsert-users.sql', mustacheParam));
  };

  if (sqlStatements.length == 0) {
    logger.info('Ignore creating schema in Redshift due to there is no application.');
  } else {
    const redShiftClient = getRedshiftClient(props.dataAPIRole);
    await createSchemasInRedshift(redShiftClient, sqlStatements, props);
  }
}

async function createViewForReporting(props: ResourcePropertiesType) {
  const odsTableName = props.odsTableName;
  const appIds = splitString(props.appIds);
  const sqlStatements : string[] = [];
  for (const app of appIds) {
    const mustacheParam: MustacheParamType = {
      schema: app,
      table_ods_events: odsTableName,
      ...SQL_TEMPLATE_PARAMETER,
    };
    // keep view order due to dependency between them.
    sqlStatements.push(getSqlContent('clickstream-daily-active-user-view.sql', mustacheParam));
    sqlStatements.push(getSqlContent('clickstream-ods-flattened-view.sql', mustacheParam));
    sqlStatements.push(getSqlContent('clickstream-dau-wau-view.sql', mustacheParam));
    sqlStatements.push(getSqlContent('clickstream-session-view.sql', mustacheParam));
    sqlStatements.push(getSqlContent('clickstream-retention-view.sql', mustacheParam));
  };

  if (sqlStatements.length == 0) {
    logger.info('Ignore creating reporting views in Redshift due to there is no application.');
  } else {
    const redShiftClient = getRedshiftClient(props.dataAPIRole);
    await createSchemasInRedshift(redShiftClient, sqlStatements, props);
  }
}

const createDatabaseInRedshift = async (redshiftClient: RedshiftDataClient, databaseName: string,
  props: CreateDatabaseAndSchemas, owner?: string) => {
  try {
    await executeStatementsWithWait(redshiftClient, [`CREATE DATABASE ${databaseName}${owner ? ` WITH OWNER "${owner}"` : ''};`],
      props.serverlessRedshiftProps, props.provisionedRedshiftProps);
  } catch (err) {
    if (err instanceof Error) {
      logger.error(`Error happened when creating database '${databaseName}' in Redshift.`, err);
    }
    throw err;
  }
};

const createDatabaseBIUser = async (redshiftClient: RedshiftDataClient, credential: BIUserCredential,
  props: CreateDatabaseAndSchemas) => {
  try {
    await executeStatementsWithWait(redshiftClient, [
      `CREATE USER ${credential.username} PASSWORD 'md5${md5Hash(credential.password+credential.username)}'`,
    ], props.serverlessRedshiftProps, props.provisionedRedshiftProps,
    props.serverlessRedshiftProps?.databaseName ?? props.provisionedRedshiftProps?.databaseName, false);
  } catch (err) {
    if (err instanceof Error) {
      logger.error(`Error when creating BI user '${credential.username}' in Redshift.`, err);
    }
    throw err;
  }
};

// write a function to cacluate md5 hash of string
const md5Hash = (str: string) => {
  return crypto.createHash('md5').update(str).digest('hex');
};

const createSchemasInRedshift = async (redshiftClient: RedshiftDataClient, sqlStatements: string[], props: CreateDatabaseAndSchemas) => {
  try {
    await executeStatementsWithWait(redshiftClient, sqlStatements,
      props.serverlessRedshiftProps, props.provisionedRedshiftProps, props.databaseName);
  } catch (err) {
    if (err instanceof Error) {
      logger.error('Error when creating schema in serverless Redshift.', err);
    }
    throw err;
  }
};

const generateRandomStr = (length: number, charSet?: string): string => {
  const charset = charSet ?? 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%^&-_=+|';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

function generateRedshiftUserPassword(length: number): string {
  const password = generateRandomStr(length);
  const regex = new RegExp(`^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!#$%^&-_=+|]).{${length},64}$`);
  if (regex.test(password)) {
    return password;
  }
  return generateRedshiftUserPassword(length);
}