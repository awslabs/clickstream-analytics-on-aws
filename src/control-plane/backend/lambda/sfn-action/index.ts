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

import { fetchRemoteUrl, getAWSSDKClientConfig, logger } from '@aws/clickstream-base-lib';
import {
  CloudFormationClient,
  CreateStackCommand,
  DescribeStacksCommand,
  UpdateStackCommand,
  DeleteStackCommand,
  Parameter,
  Tag,
  Stack,
  StackStatus,
  UpdateTerminationProtectionCommand,
  CloudFormationServiceException,
  UpdateStackCommandInput,
  UpdateStackCommandOutput,
  Capability,
  AlreadyExistsException,
} from '@aws-sdk/client-cloudformation';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const MAX_ATTEMPTS = 3;
const CONNECTION_TIMEOUT = 10000;
const REQUEST_TIMEOUT = 10000;

export enum StackAction {
  CREATE = 'Create',
  UPDATE = 'Update',
  UPGRADE = 'Upgrade',
  DELETE = 'Delete',
  DESCRIBE = 'Describe',
  CALLBACK = 'Callback',
  END = 'End',
}

export interface SfnStackEvent {
  readonly Action: StackAction;
  readonly Input: SfnStackInput;
  readonly Callback?: SfnStackCallback;
  readonly Result?: Stack;
}

interface SfnStackInput {
  readonly Region: string;
  readonly StackName: string;
  readonly TemplateURL: string;
  readonly Parameters: Parameter[];
  readonly Tags?: Tag[];
}

interface SfnStackCallback {
  readonly BucketName: string;
  readonly BucketPrefix: string;
}

export const handler = async (event: SfnStackEvent, _context: any): Promise<any> => {
  logger.debug('Event received', { event: event });
  if (event.Action === StackAction.CREATE) {
    return createStack(event);
  } else if (event.Action === StackAction.UPDATE) {
    return updateStack(event);
  } else if (event.Action === StackAction.UPGRADE) {
    return upgradeStack(event);
  } else if (event.Action === StackAction.DELETE) {
    return deleteStack(event);
  } else if (event.Action === StackAction.DESCRIBE) {
    return describeStack(event);
  } else if (event.Action === StackAction.CALLBACK) {
    return callback(event);
  }
  throw Error('Action type error');
};

export const createStack = async (event: SfnStackEvent) => {
  try {
    const cloudFormationClient = new CloudFormationClient({
      ...getAWSSDKClientConfig(MAX_ATTEMPTS, CONNECTION_TIMEOUT, REQUEST_TIMEOUT),
      region: event.Input.Region,
    });
    const params: CreateStackCommand = new CreateStackCommand({
      StackName: event.Input.StackName,
      TemplateURL: event.Input.TemplateURL,
      Parameters: event.Input.Parameters,
      DisableRollback: true,
      EnableTerminationProtection: true,
      Capabilities: [
        Capability.CAPABILITY_IAM,
        Capability.CAPABILITY_NAMED_IAM,
        Capability.CAPABILITY_AUTO_EXPAND,
      ],
      Tags: event.Input.Tags,
    });
    const result = await cloudFormationClient.send(params);
    return {
      Action: StackAction.DESCRIBE,
      Input: event.Input,
      Callback: event.Callback,
      Result: {
        StackId: result.StackId,
        StackName: event.Input.StackName,
        StackStatus: StackStatus.CREATE_IN_PROGRESS,
        CreationTime: new Date(),
      } as Stack,
    } as SfnStackEvent;
  } catch (err) {
    if (err instanceof AlreadyExistsException) {
      logger.warn((err as Error).message, { error: err, metadata: err.$metadata });
      return {
        Action: StackAction.DESCRIBE,
        Input: event.Input,
        Callback: event.Callback,
        Result: {
          StackName: event.Input.StackName,
          StackStatus: StackStatus.CREATE_IN_PROGRESS,
          CreationTime: new Date(),
        } as Stack,
      } as SfnStackEvent;
    }
    logger.error((err as Error).message, { error: err, event: event });
    throw Error((err as Error).message);
  }
};

export const updateStack = async (event: SfnStackEvent) => {
  try {
    const parameters = await usePreviousParameterValue(
      event.Input.Region,
      event.Input.StackName,
      event.Input.TemplateURL,
      event.Input.Parameters,
    );
    const result = await doUpdate(event.Input.Region, {
      StackName: event.Input.StackName,
      Parameters: parameters,
      DisableRollback: false,
      UsePreviousTemplate: true,
      Capabilities: [
        Capability.CAPABILITY_IAM,
        Capability.CAPABILITY_NAMED_IAM,
        Capability.CAPABILITY_AUTO_EXPAND,
      ],
      Tags: event.Input.Tags,
    });
    return {
      Action: StackAction.DESCRIBE,
      Input: event.Input,
      Callback: event.Callback,
      Result: {
        StackId: result.StackId,
        StackName: event.Input.StackName,
        StackStatus: StackStatus.UPDATE_IN_PROGRESS,
        CreationTime: new Date(),
      } as Stack,
    } as SfnStackEvent;
  } catch (err) {
    logger.error((err as Error).message, { error: err, event: event });
    throw Error((err as Error).message);
  }
};

export const upgradeStack = async (event: SfnStackEvent) => {
  try {
    const parameters = await usePreviousParameterValue(
      event.Input.Region,
      event.Input.StackName,
      event.Input.TemplateURL,
      event.Input.Parameters,
    );
    const result = await doUpdate(event.Input.Region, {
      StackName: event.Input.StackName,
      TemplateURL: event.Input.TemplateURL,
      Parameters: parameters,
      DisableRollback: false,
      UsePreviousTemplate: false,
      Capabilities: ['CAPABILITY_IAM', 'CAPABILITY_NAMED_IAM', 'CAPABILITY_AUTO_EXPAND'],
      Tags: event.Input.Tags,
    });
    return {
      Action: StackAction.DESCRIBE,
      Input: event.Input,
      Callback: event.Callback,
      Result: {
        StackId: result.StackId,
        StackName: event.Input.StackName,
        StackStatus: StackStatus.UPDATE_IN_PROGRESS,
        CreationTime: new Date(),
      } as Stack,
    } as SfnStackEvent;
  } catch (err) {
    logger.error((err as Error).message, { error: err, event: event });
    throw Error((err as Error).message);
  }
};

export const deleteStack = async (event: SfnStackEvent) => {
  const stackName = event.Result?.StackId ? event.Result?.StackId : event.Input.StackName;
  const stack = await describe(event.Input.Region, stackName);
  if (!stack || stack.StackStatus === StackStatus.DELETE_COMPLETE) {
    // If stack does not exist
    return {
      Action: StackAction.END,
      Input: event.Input,
    } as SfnStackEvent;
  }
  try {
    const cloudFormationClient = new CloudFormationClient({
      ...getAWSSDKClientConfig(MAX_ATTEMPTS, CONNECTION_TIMEOUT, REQUEST_TIMEOUT),
      region: event.Input.Region,
    });
    const disProtectionParams: UpdateTerminationProtectionCommand = new UpdateTerminationProtectionCommand({
      EnableTerminationProtection: false,
      StackName: stack.StackId,
    });
    await cloudFormationClient.send(disProtectionParams);
    const params: DeleteStackCommand = new DeleteStackCommand({
      StackName: stack.StackId,
    });
    await cloudFormationClient.send(params);
    return {
      Action: StackAction.DESCRIBE,
      Input: event.Input,
      Callback: event.Callback,
      Result: {
        StackId: stack.StackId,
        StackName: event.Input.StackName,
        StackStatus: StackStatus.DELETE_IN_PROGRESS,
        CreationTime: new Date(),
      } as Stack,
    } as SfnStackEvent;
  } catch (err) {
    if (err instanceof CloudFormationServiceException &&
      err.name === 'ValidationError' &&
      err.message.includes('Termination protection cannot be updated')) {
      logger.warn('Termination protection cannot be updated.', { error: err, metadata: err.$metadata });
      return {
        Action: StackAction.DESCRIBE,
        Input: event.Input,
        Callback: event.Callback,
        Result: {
          StackId: stack.StackId,
          StackName: event.Input.StackName,
          StackStatus: StackStatus.DELETE_IN_PROGRESS,
          CreationTime: new Date(),
        } as Stack,
      } as SfnStackEvent;
    }
    logger.error((err as Error).message, { error: err, event: event });
    throw Error((err as Error).message);
  }
};

export const describeStack = async (event: SfnStackEvent) => {
  const stackName = event.Result?.StackId ? event.Result?.StackId : event.Input.StackName;
  const stack = await describe(event.Input.Region, stackName);
  if (!stack) {
    throw Error('Describe Stack failed.');
  }
  if (stack.StackStatus?.endsWith('_IN_PROGRESS')) {
    return {
      Action: StackAction.DESCRIBE,
      Input: event.Input,
      Callback: event.Callback,
      Result: stack,
    } as SfnStackEvent;
  }
  return {
    Action: StackAction.CALLBACK,
    Input: event.Input,
    Callback: event.Callback,
    Result: stack,
  } as SfnStackEvent;
};

export const describe = async (region: string, stackName: string) => {
  try {
    const cloudFormationClient = new CloudFormationClient({
      ...getAWSSDKClientConfig(MAX_ATTEMPTS, CONNECTION_TIMEOUT, REQUEST_TIMEOUT),
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

export const callback = async (event: SfnStackEvent) => {
  if (!event.Callback?.BucketName || !event.Callback?.BucketPrefix || !event.Result) {
    logger.error('Save runtime to S3 failed, Parameter error.', {
      event: event,
    });
    throw new Error('Save runtime to S3 failed, Parameter error.');
  }

  try {
    const s3Client = new S3Client({
      ...getAWSSDKClientConfig(MAX_ATTEMPTS, CONNECTION_TIMEOUT, REQUEST_TIMEOUT),
    });
    const input = {
      Body: JSON.stringify({ [event.Input.StackName]: event.Result }),
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

  if (event.Result.StackStatus?.endsWith('FAILED')) {
    logger.error(event.Result.StackStatusReason ?? 'Stack failed.', {
      event: event,
    });
    throw new Error(event.Result.StackStatusReason ?? 'Stack failed.');
  }

  return event;
};

export const doUpdate = async (region: string, input: UpdateStackCommandInput): Promise<UpdateStackCommandOutput> => {
  try {
    const cloudFormationClient = new CloudFormationClient({
      ...getAWSSDKClientConfig(MAX_ATTEMPTS, CONNECTION_TIMEOUT, REQUEST_TIMEOUT),
      region: region,
    });
    const params: UpdateStackCommand = new UpdateStackCommand(input);
    return await cloudFormationClient.send(params);
  } catch (err) {
    if (err instanceof CloudFormationServiceException &&
      err.name === 'ValidationError' &&
      err.message.includes('please use the disable-rollback parameter with update-stack API')) {
      const rollbackInput = {
        ...input,
        DisableRollback: true,
        RetainExceptOnCreate: true,
      };
      return doUpdate(region, rollbackInput);
    } else if (err instanceof CloudFormationServiceException &&
      err.name === 'ValidationError' &&
      (err.message.includes('No updates are to be performed.') || err.message.includes('can not be updated'))
    ) {
      logger.warn('No updates are to be performed.', { error: err, metadata: err.$metadata });
      return {
        $metadata: {},
        StackId: '',
      };
    }
    throw Error((err as Error).message);
  }
};

const fetchTemplateParameters = async (templateUrl: string): Promise<any> => {
  let parameters;
  try {
    const response = await fetchRemoteUrl(templateUrl);
    const jsonData = await response.json();
    logger.debug('Received remote template', { jsonData });
    parameters = jsonData.Parameters;
    logger.info('fetched the template Parameters.', { parameters });
  } catch (error) {
    logger.warn(`failed to fetch the template from ${templateUrl}`, { error });
  }
  return parameters;
};

const usePreviousParameterValue = async (region: string, stackName: string, templateUrl: string, parameters: Parameter[]): Promise<Parameter[]> => {
  const stack = await describe(region, stackName);
  if (!stack) {
    throw Error('Describe Stack failed.');
  }
  // Get the keys from Template Parameters
  const templateParameters = await fetchTemplateParameters(templateUrl);
  const templateParameterKeys = Object.keys(templateParameters);
  // Find the ParameterKeys in stack.Parameters but not in parameters
  const parameterKeys = parameters.map((p) => p.ParameterKey) ?? [];
  const previousParameters = stack.Parameters?.filter(
    (p) => p.ParameterKey && !parameterKeys.includes(p.ParameterKey) && templateParameterKeys.includes(p.ParameterKey),
  );
  const previousParameterList: Parameter[] = [];
  for (const previousParameter of previousParameters ?? []) {
    previousParameterList.push({
      ParameterKey: previousParameter.ParameterKey,
      UsePreviousValue: true,
    });
  }
  // concat the previous parameters to the parameters
  return parameters.concat(previousParameterList);
};