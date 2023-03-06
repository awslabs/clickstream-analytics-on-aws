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

import { Logger } from '@aws-lambda-powertools/logger';
import { Stack } from '@aws-sdk/client-cloudformation';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const logger = new Logger({ serviceName: 'ClickstreamSfnCallback' });

interface SfnCallbackEvent {
  readonly Input: SfnCallbackInput;
  readonly Callback: SfnCallback;
  readonly Result?: SfnCallbackResult;
}

interface SfnCallbackInput {
  readonly Action: string;
  readonly StackName: string;
  readonly TemplateURL: string;
  readonly Parameters: SfnCallbackParameters[];
}

interface SfnCallbackParameters {
  readonly ParameterKey: string;
  readonly ParameterValue: string;
}

interface SfnCallback {
  readonly TableName: string;
  readonly ProjectId: string;
  readonly Type: string;
  readonly AttributeName: string;
}

interface SfnCallbackResult {
  readonly Stacks: Stack[];
}

export const handler = async (event: SfnCallbackEvent, _context: any): Promise<any> => {
  logger.info('Lambda is invoked', JSON.stringify(event, null, 2));
  try {
    // Create DynamoDB Client and patch it for tracing
    const ddbClient = new DynamoDBClient({});
    // Create the DynamoDB Document client.
    const docClient = DynamoDBDocumentClient.from(ddbClient);
    const command: UpdateCommand = new UpdateCommand({
      TableName: event.Callback.TableName,
      Key: {
        projectId: event.Callback.ProjectId,
        type: event.Callback.Type,
      },
      // Define expressions for the new or updated attributes
      UpdateExpression: 'SET #AttributeName = :v',
      ExpressionAttributeNames: {
        '#AttributeName': event.Callback.AttributeName,
      },
      ExpressionAttributeValues: {
        ':v': event.Result?.Stacks[0],
      },
      ReturnValues: 'ALL_NEW',
    });
    await docClient.send(command);

    return {
      statusCode: 200,
      body: 'OK',
    };
  } catch (err) {
    logger.error('Save runtime info failed.', {
      error: err,
      event: event,
    });
    throw new Error('Save runtime info failed.');
  }
};