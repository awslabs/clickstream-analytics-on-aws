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
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  CdkCustomResourceEvent,
  CdkCustomResourceHandler,
  CdkCustomResourceResponse,
  CloudFormationCustomResourceEvent,
  Context,
} from 'aws-lambda';
import { logger } from '../../../../common/powertools';
import { aws_sdk_client_common_config } from '../api/common/sdk-client-config-ln';

// Create an Amazon DynamoDB service client object.
const ddbClient = new DynamoDBClient({
  ...aws_sdk_client_common_config,
});
// Create the DynamoDB Document client.
const docClient = DynamoDBDocumentClient.from(ddbClient);

export const physicalIdPrefix = 'add-admin-user-custom-resource-';
export const handler: CdkCustomResourceHandler = async (event: CloudFormationCustomResourceEvent, _context: Context) => {
  logger.info(JSON.stringify(event));
  const physicalId = ('PhysicalResourceId' in event) ? event.PhysicalResourceId :
    `${physicalIdPrefix}${generateRandomStr(8, 'abcdefghijklmnopqrstuvwxyz0123456789')}`;
  const userTableName = event.ResourceProperties.UserTableName;
  const email = event.ResourceProperties.Email;
  const response: CdkCustomResourceResponse = {
    PhysicalResourceId: physicalId,
    Data: {},
    Status: 'SUCCESS',
  };

  try {
    await _handler(event, userTableName, email);
  } catch (e) {
    if (e instanceof Error) {
      logger.error('Error when creating admin user', e);
    }
    throw e;
  }
  return response;
};

async function _handler(event: CdkCustomResourceEvent, userTableName: string, email: string) {
  const requestType = event.RequestType;

  logger.info('RequestType: ' + requestType);
  if (requestType == 'Create' || requestType == 'Update') {
    await onCreate(userTableName, email);
  }
  if (requestType == 'Delete') {
    await onDelete(userTableName, email);
  }
}

async function onCreate(userTableName: string, email: string) {
  logger.info('onCreate()');
  const item = getItem(userTableName, email);
  if (!item) {
    await putItem(userTableName, email);
  }
}

async function onDelete(userTableName: string, email: string) {
  logger.info('onDelete()');
  const item = getItem(userTableName, email);
  if (!item) {
    await deleteItem(userTableName, email);
  }
}

// a function to put email to DynamoDB
async function putItem(tableName: string, email: string) {
  try {
    const params: PutCommand = new PutCommand({
      TableName: tableName,
      Item: {
        email: email,
      },
    });
    await docClient.send(params);
  } catch (error) {
    logger.error('Error when inserting admin user to DynamoDB', { error });
    throw error;
  }
}

// a function to delete email from DynamoDB
async function deleteItem(tableName: string, email: string) {
  try {
    const params: DeleteCommand = new DeleteCommand({
      TableName: tableName,
      Key: {
        email: email,
      },
    });
    await docClient.send(params);
  } catch (error) {
    logger.error('Error when deleting admin user from DynamoDB', { error });
    throw error;
  }
}

// a function to get email from DynamoDB
async function getItem(tableName: string, email: string) {
  try {
    const params: GetCommand = new GetCommand({
      TableName: tableName,
      Key: {
        email: email,
      },
    });
    const data = await docClient.send(params);
    return data.Item;
  } catch (error) {
    logger.error('Error when getting admin user from DynamoDB', { error });
    throw error;
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
