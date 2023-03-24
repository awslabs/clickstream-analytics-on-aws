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

import { Parameter } from '@aws-sdk/client-cloudformation';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { JSONPath } from 'jsonpath-plus';
import { logger } from '../../../../common/powertools';

interface WorkFlowStack {
  Name: string;
  Type: string;
  Data: SfnStackEvent;
}

interface SfnStackEvent {
  readonly Input: SfnStackInput;
  readonly Callback: SfnStackCallback;
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

export const handler = async (event: any): Promise<any> => {
  logger.info('Lambda is invoked', JSON.stringify(event, null, 2));
  try {
    const eventData = event.MapRun? event.Data: event;
    if (eventData.Type === 'Pass') {
      return eventData;
    } else if (eventData.Type === 'Stack') {
      const stack = eventData as WorkFlowStack;
      return await stackParametersResolve(stack);
    } else if (eventData.Type === 'Parallel') {
      return {
        Type: 'Parallel',
        Data: eventData.Branches,
      };
    }

    const data = [];
    let currentKey = eventData.StartAt;
    let currentStep = eventData.States[currentKey];
    while (true) {
      currentStep.Name = currentKey;
      data.push(currentStep);
      if (currentStep.End) {
        break;
      }
      currentKey = currentStep.Next;
      currentStep = eventData.States[currentKey];
    }
    return {
      Type: 'Serial',
      Data: data,
    };
  } catch (err) {
    logger.error('Stack workflow input failed.', {
      error: err,
      event: event,
    });
    throw new Error('Stack workflow input failed.');
  }
};

async function stackParametersResolve(stack: WorkFlowStack) {
  if (stack.Data.Callback.BucketName && stack.Data.Callback.BucketPrefix) {
    const bucket = stack.Data.Callback.BucketName;
    const prefix = stack.Data.Callback.BucketPrefix;
    for (let param of stack.Data.Input.Parameters) {
      if (param.ParameterKey?.endsWith('.$') && param.ParameterValue?.startsWith('$.')) {
        // get stack name
        const splitValues = param.ParameterValue.split('.');
        const stackName = splitValues[1];
        // get output from s3
        const output = await getObject(bucket, `${prefix}/${stackName}/output.json`);
        if (output) {
          const value = JSONPath({ path: param.ParameterValue, json: JSON.parse(output as string) });
          param.ParameterKey = param.ParameterKey.substring(0, param.ParameterKey.length - 2);
          if (Array.prototype.isPrototypeOf(value) && value.length > 0) {
            param.ParameterValue = value[0] as string;
          }
        }
      }
    }
  }
  return stack;
}

async function getObject(bucket: string, key: string) {
  const streamToString = (stream: any) => new Promise((resolve, reject) => {
    const chunks: any = [];
    stream.on('data', (chunk: any) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  try {
    const s3Client = new S3Client({});
    const { Body } = await s3Client.send(command);
    const bodyContents = await streamToString(Body);
    return bodyContents;
  } catch (error) {
    return undefined;
  }
}
