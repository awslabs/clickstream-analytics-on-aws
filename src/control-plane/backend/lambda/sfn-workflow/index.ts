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

import { CloudFormationClient, DescribeStacksCommand, Output, Parameter, Tag } from '@aws-sdk/client-cloudformation';
import { JSONPath } from 'jsonpath-plus';
import { logger } from '../../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../../common/sdk-client-config';
import { putStringToS3, readS3ObjectAsJson } from '../api/store/aws/s3';

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
  Tags?: Tag[];
}

interface SfnStackCallback {
  readonly BucketName: string;
  readonly BucketPrefix: string;
}

export const handler = async (event: any): Promise<any> => {
  try {
    const eventData = event.MapRun? event.Data: event;
    if (eventData.Type === 'Pass') {
      await callback(eventData.Data as SfnStackEvent);
      return eventData;
    } else if (eventData.Type === 'Stack') {
      const stack = eventData as WorkFlowStack;
      await stackParametersResolve(stack);
      await stackTagsResolve(stack);
      return stack;
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
  await putStringToS3(
    JSON.stringify({ [event.Input.StackName]: stack ?? {} }),
    event.Input.Region,
    event.Callback.BucketName,
    `${event.Callback.BucketPrefix}/${event.Input.StackName}/output.json`,
  );
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
    const region = stack.Data.Input.Region;
    for (let param of stack.Data.Input.Parameters) {
      let key = param.ParameterKey;
      let value = param.ParameterValue;
      // Find the value in output accurately through JSONPath
      if (param.ParameterKey?.endsWith('.$') && param.ParameterValue?.startsWith('$.')) {
        ({ key, value } = await _getParameterKeyAndValueByJSONPath(param.ParameterKey, param.ParameterValue, region, bucket, prefix));
      } else if (param.ParameterKey?.endsWith('.#') && param.ParameterValue?.startsWith('#.')) { // Find the value in output by suffix
        ({ key, value } = await _getParameterKeyAndValueByStackOutput(param.ParameterKey, param.ParameterValue, region, bucket, prefix));
      }
      param.ParameterKey = key;
      param.ParameterValue = value;
    }
  }
}

async function stackTagsResolve(stack: WorkFlowStack) {
  const tags = stack.Data.Input.Tags;
  const bucket = stack.Data.Callback.BucketName;
  const prefix = stack.Data.Callback.BucketPrefix;
  const region = stack.Data.Input.Region;

  // When the tag Key or Value starts with '#.', resolve the tag using the pattern '#.{stackName}.{outputKeySuffix}'
  // e.g. origin = '#.Clickstream-ServiceCatalogAppRegistry-249f84aa8dd044c2a7294cb04cebe88b.ServiceCatalogAppRegistryApplicationTagKey'
  // If unable to find corresponding output, return `undefined`
  const resolveTagByOutput = async (origin: string): Promise<string | undefined> => {
    if (!origin.startsWith('#.') || origin.split('.').length !== 3) {
      return origin;
    }

    const splitValues = origin.split('.');
    const stackName = splitValues[1];
    const outputKeySuffix = splitValues[2];
    const outputs = await _getOutputsFromS3(region, bucket, prefix, stackName);
    const stackOutput = outputs.find(output => output.OutputKey?.endsWith(outputKeySuffix));
    return stackOutput?.OutputValue;
  };

  if (tags && bucket && prefix) {
    const resolvedTags: Tag[] = [];
    for (const tag of tags) {
      const Key = await resolveTagByOutput(tag.Key!);
      const Value = await resolveTagByOutput(tag.Value!);
      if (Key !== undefined && Value !== undefined) {
        resolvedTags.push({
          Key,
          Value,
        } as Tag);
      }
    };
    stack.Data.Input.Tags = resolvedTags;
  }
}

async function _getParameterKeyAndValueByStackOutput(paramKey: string, paramValue: string, region: string, bucket: string, prefix: string) {
  // get stack name
  const splitValues = paramValue.split('.');
  const stackName = splitValues[1];
  // get output from s3
  const outputs = await _getOutputsFromS3(region, bucket, prefix, stackName);
  const stackOutput = outputs.find(output => output.OutputKey?.endsWith(splitValues[2]));
  return {
    key: paramKey.substring(0, paramKey.length - 2),
    value: stackOutput?.OutputValue ?? '',
  };
}

async function _getParameterKeyAndValueByJSONPath(paramKey: string, paramValue: string, region: string, bucket: string, prefix: string) {
  const splitValues = paramValue.split('.');
  const stackName = splitValues[1];
  // get stack from s3
  const stackJson = await _getStackFromS3(region, bucket, prefix, stackName);
  let value = '';
  if (stackJson) {
    const values = JSONPath({ path: paramValue, json: stackJson });
    if (Array.prototype.isPrototypeOf(values) && values.length > 0) {
      value = values[0] as string;
    }
  }
  return {
    key: paramKey.substring(0, paramKey.length - 2),
    value,
  };
}

async function _getStackFromS3(region: string, bucket: string, prefix: string, stackName: string) {
  const fileKey = `${prefix}/${stackName}/output.json`;
  try {
    return await readS3ObjectAsJson(region, bucket, fileKey);
  } catch (err) {
    logger.error('read empty content error.', {
      region, bucket, key: fileKey,
    });
    return undefined;
  }
}

async function _getOutputsFromS3(region: string, bucket: string, prefix: string, stackName: string) {
  const fileKey = `${prefix}/${stackName}/output.json`;
  try {
    const content = await _getStackFromS3(region, bucket, fileKey, stackName);
    if (!content) {
      logger.warn('read empty outputs.', {
        region, bucket, key: fileKey,
      });
      return [];
    }
    const outputs = content[stackName].Outputs as Output[];
    return outputs;
  } catch (err) {
    logger.error('read outputs error.', {
      region, bucket, key: fileKey,
    });
    return [];
  }
}
