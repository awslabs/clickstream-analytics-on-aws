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

import { Stack, Parameter } from '@aws-sdk/client-cloudformation';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '../../../../common/powertools';

interface SfnStackEvent {
  readonly Input: SfnStackInput;
  readonly Callback: SfnStackCallback;
  readonly Result?: SfnCallbackResult;
}

interface SfnStackInput {
  readonly Action: string;
  readonly StackName: string;
  readonly TemplateURL: string;
  readonly Parameters: Parameter[];
}

interface SfnStackCallback {
  readonly BucketName: string;
  readonly BucketPrefix: string;
}

interface SfnCallbackResult {
  readonly Stacks: Stack[];
}

export const handler = async (event: SfnStackEvent, _context: any): Promise<any> => {
  logger.info('Lambda is invoked', JSON.stringify(event, null, 2));
  try {
    if (!event.Callback.BucketName ||
      !event.Callback.BucketPrefix
    ) {
      logger.error('Save runtime to S3 failed, Parameter error.', {
        event: event,
      });
      throw new Error('Save runtime to S3 failed, Parameter error.');
    }
    const s3Client = new S3Client({});
    const output = event.Result?.Stacks[0];
    const input = {
      Body: JSON.stringify({ [event.Input.StackName]: output }),
      Bucket: event.Callback.BucketName,
      Key: `${event.Callback.BucketPrefix}/output.json`,
      ContentType: 'application/json',
    };
    const command = new PutObjectCommand(input);
    await s3Client.send(command);

    if (output?.StackStatus?.startsWith('ROLLBACK') ||
      output?.StackStatus?.endsWith('FAILED')) {
      logger.error('Stack failed.', {
        event: event,
      });
      throw new Error('Stack failed.');
    }

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