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

import { Parameter, Output, CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { JSONPath } from 'jsonpath-plus';
import { logger } from '../../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../../common/sdk-client-config';

export interface WorkFlowStack {
  Name: string;
  Type: string;
  Data: SfnStackEvent;
}

export interface SfnStackEvent {
  readonly Input: SfnStackInput;
  readonly Callback: SfnStackCallback;
}

interface SfnStackInput {
  readonly Region: string;
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
      await callback(eventData.Data as SfnStackEvent);
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

export const callback = async (event: SfnStackEvent) => {
  if (!event.Callback || !event.Callback.BucketName || !event.Callback.BucketPrefix) {
    logger.error('Save runtime to S3 failed, Parameter error.', {
      event: event,
    });
    throw new Error('Save runtime to S3 failed, Parameter error.');
  }

  const stack = await describe(event.Input.Region, event.Input.StackName);
  if (!stack) {
    throw Error('Describe Stack failed.');
  }

  try {
    const s3Client = new S3Client({
      ...aws_sdk_client_common_config,
    });
    const input = {
      Body: JSON.stringify({ [event.Input.StackName]: stack }),
      Bucket: event.Callback.BucketName,
      Key: `${event.Callback.BucketPrefix}/${event.Input.StackName}/output.json`,
      ContentType: 'application/json',
    };
    const command = new PutObjectCommand(input);
    await s3Client.send(command);
  } catch (err) {
    logger.error((err as Error).message, { error: err, event: event });
    throw Error((err as Error).message);
  }
  return event;
};


export const describe = async (region: string, stackName: string) => {
  try {
    const cloudFormationClient = new CloudFormationClient({
      ...aws_sdk_client_common_config,
      region,
    });
    const params: DescribeStacksCommand = new DescribeStacksCommand({
      StackName: stackName,
    });
    const result = await cloudFormationClient.send(params);
    if (result.Stacks) {
      return result.Stacks[0];
    }
    return undefined;
  } catch (err) {
    logger.error((err as Error).message, { error: err });
    return undefined;
  }
};

async function stackParametersResolve(stack: WorkFlowStack) {
  if (stack.Data.Callback.BucketName && stack.Data.Callback.BucketPrefix) {
    const bucket = stack.Data.Callback.BucketName;
    const prefix = stack.Data.Callback.BucketPrefix;
    for (let param of stack.Data.Input.Parameters) {
      let key, value;
      // Find the value in output accurately through JSONPath
      if (param.ParameterKey?.endsWith('.$') && param.ParameterValue?.startsWith('$.')) {
        ({ key, value } = await _getParameterKeyAndValueByJSONPath(param.ParameterKey, param.ParameterValue, bucket, prefix));
      } else if (param.ParameterKey?.endsWith('.#') && param.ParameterValue?.startsWith('#.')) { // Find the value in output by suffix
        ({ key, value } = await _getParameterKeyAndValueByStackOutput(param.ParameterKey, param.ParameterValue, bucket, prefix));
      } else {
        key = param.ParameterKey;
        value = param.ParameterValue;
      }
      param.ParameterKey = key;
      param.ParameterValue = value;
    }
  }
  return stack;
}

async function _getParameterKeyAndValueByStackOutput(paramKey: string, paramValue: string, bucket: string, prefix: string) {
  // get stack name
  const splitValues = paramValue.split('.');
  const stackName = splitValues[1];
  // get output from s3
  let stackOutputs;
  try {
    const output = await getObject(bucket, `${prefix}/${stackName}/output.json`);
    stackOutputs = JSON.parse(output as string)[stackName].Outputs;
  } catch (err) {
    logger.error('Stack workflow output error.', {
      error: err,
      output: `${prefix}/${stackName}/output.json`,
    });
  }
  let value = '';
  if (stackOutputs) {
    for (let out of stackOutputs as Output[]) {
      if (out.OutputKey?.endsWith(splitValues[2])) {
        value = out.OutputValue ?? '';
        break;
      }
    }
  }
  return {
    key: paramKey.substring(0, paramKey.length - 2),
    value: value ?? '',
  };
}

async function _getParameterKeyAndValueByJSONPath(paramKey: string, paramValue: string, bucket: string, prefix: string) {
  const splitValues = paramValue.split('.');
  const stackName = splitValues[1];
  // get output from s3
  let stackOutputs;
  try {
    const output = await getObject(bucket, `${prefix}/${stackName}/output.json`);
    stackOutputs = JSON.parse(output as string);
  } catch (err) {
    logger.error('Stack workflow output error.', {
      error: err,
      output: `${prefix}/${stackName}/output.json`,
    });
  }
  let value = '';
  if (stackOutputs) {
    const values = JSONPath({ path: paramValue, json: stackOutputs });
    if (Array.prototype.isPrototypeOf(values) && values.length > 0) {
      value = values[0] as string;
    }
  }
  return {
    key: paramKey.substring(0, paramKey.length - 2),
    value,
  };
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
    const s3Client = new S3Client({
      ...aws_sdk_client_common_config,
    });
    const { Body } = await s3Client.send(command);
    const bodyContents = await streamToString(Body);
    return bodyContents;
  } catch (error) {
    return undefined;
  }
}
