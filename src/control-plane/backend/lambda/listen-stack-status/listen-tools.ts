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

import { aws_sdk_client_common_config, logger, marshallOptions, unmarshallOptions } from '@aws/clickstream-base-lib';
import { CloudFormationClient, DescribeStacksCommand, Stack, StackStatus, Tag } from '@aws-sdk/client-cloudformation';
import { CloudWatchEventsClient, DeleteRuleCommand, ListTargetsByRuleCommand, RemoveTargetsCommand, ResourceNotFoundException } from '@aws-sdk/client-cloudwatch-events';
import { ConditionalCheckFailedException, DynamoDBClient, TransactWriteItemsCommand, TransactWriteItemsCommandInput } from '@aws-sdk/client-dynamodb';
import { DeleteTopicCommand, ListSubscriptionsByTopicCommand, SNSClient, UnsubscribeCommand } from '@aws-sdk/client-sns';
import { DynamoDBDocumentClient, QueryCommandInput, ScanCommandInput, UpdateCommand, UpdateCommandInput, paginateQuery, paginateScan } from '@aws-sdk/lib-dynamodb';
import { NativeAttributeValue } from '@aws-sdk/util-dynamodb';
import { BuiltInTagKeys, ExecutionDetail, PipelineStackType, PipelineStatusDetail, PipelineStatusType } from '../../../../common/model';
import { CFN_TOPIC_PREFIX } from '../api/common/constants';
import { WorkflowParallelBranch, WorkflowState, WorkflowStateType } from '../api/common/types';
import { getStackPrefix } from '../api/common/utils';

const MAX_RETRY_COUNT = 3;

const ddbClient = new DynamoDBClient({
  ...aws_sdk_client_common_config,
  region: process.env.AWS_REGION,
});

const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { ...marshallOptions },
  unmarshallOptions: { ...unmarshallOptions },
});

const clickStreamTableName = process.env.CLICKSTREAM_TABLE_NAME ?? '';
const prefixTimeGSIName = process.env.PREFIX_TIME_GSI_NAME ?? '';
export const stackPrefix = getStackPrefix(process.env.IAM_ROLE_PREFIX);

export interface CloudFormationStackStatusChangeNotificationEventDetail {
  'stack-id': string;
  'status-details': {
    status: StackStatus;
    'status-reason': string;
  };
}

export interface StepFunctionsExecutionStatusChangeNotificationEventDetail extends ExecutionDetail {
  startDate?: number;
  stopDate?: number;
  input?: any;
  output?: any;
}

export async function describeStack(stackId: string, region: string): Promise<Stack | undefined> {
  try {
    const cloudFormationClient = new CloudFormationClient({
      ...aws_sdk_client_common_config,
      region,
    });
    const params: DescribeStacksCommand = new DescribeStacksCommand({
      StackName: stackId,
    });
    const res = await cloudFormationClient.send(params);
    if (res.Stacks && res.Stacks.length > 0) {
      return res.Stacks[0];
    }
    return;
  } catch (error) {
    logger.error('Failed to describe stack: ', { stackId, region, error });
    throw error;
  }
}

export async function getPipeline(pipelineId: string): Promise<any> {
  try {
    const type = `PIPELINE#${pipelineId}#latest`;
    const input: QueryCommandInput = {
      TableName: clickStreamTableName,
      IndexName: prefixTimeGSIName,
      KeyConditionExpression: '#prefix= :prefix',
      FilterExpression: 'deleted = :d AND #type = :type',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
        '#type': 'type',
      },
      ExpressionAttributeValues: {
        ':d': false,
        ':prefix': 'PIPELINE',
        ':type': type,
      },
    };
    const records: Record<string, NativeAttributeValue>[] = [];
    for await (const page of paginateQuery({ client: docClient }, input)) {
      records.push(...page.Items as Record<string, NativeAttributeValue>[]);
    }
    if (records.length > 0) {
      return records[0];
    }
    return;
  } catch (err) {
    logger.error('Failed to query pipeline: ', { pipelineId, err });
    throw err;
  }
}

async function updateStackStatusWithOptimisticLocking(
  projectId: string, pipelineId:string, stackDetails: PipelineStatusDetail[], updateAt: number): Promise<boolean> {
  try {
    const input: UpdateCommandInput = {
      TableName: clickStreamTableName,
      Key: {
        id: projectId,
        type: `PIPELINE#${pipelineId}#latest`,
      },
      ConditionExpression: '#ConditionVersion = :ConditionVersionValue',
      UpdateExpression: 'SET #stackDetails = :stackDetails, #ConditionVersion = :updateAt',
      ExpressionAttributeNames: {
        '#stackDetails': 'stackDetails',
        '#ConditionVersion': 'updateAt',
      },
      ExpressionAttributeValues: {
        ':stackDetails': stackDetails,
        ':ConditionVersionValue': updateAt,
        ':updateAt': Date.now(),
      },
    };
    await docClient.send(new UpdateCommand(input));
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      return false;
    }
    logger.error('Failed to update pipeline stack status: ', { projectId, pipelineId, err });
    throw err;
  }
}

export async function updatePipelineStackStatus(
  projectId: string, pipelineId:string, curStackDetail: Stack, stackDetails: PipelineStatusDetail[], updateAt: number): Promise<void> {
  try {
    let retryCount = 0;
    let success = await updateStackStatusWithOptimisticLocking(projectId, pipelineId, stackDetails, updateAt);
    while (!success && retryCount < MAX_RETRY_COUNT) {
      logger.warn('Failed to update pipeline stack status with optimistic locking: ', { projectId, pipelineId, retryCount });
      const pipeline = await getPipeline(pipelineId);
      if (!pipeline) {
        logger.error('Failed to get pipeline: ', { projectId, pipelineId });
        throw new Error('Failed to get pipeline');
      }
      const stackNames = getWorkflowStacks(pipeline.workflow.Workflow);
      const newStackDetails = getNewStackDetails(curStackDetail, pipeline.stackDetails ?? [], stackNames);
      success = await updateStackStatusWithOptimisticLocking(projectId, pipelineId, newStackDetails, pipeline.updateAt);
      retryCount += 1;
    }
  } catch (err) {
    logger.error('Failed to update pipeline stack status: ', { projectId, pipelineId, err });
    throw err;
  }
}

export function getNewStackDetails(curStack: Stack, stackDetails: PipelineStatusDetail[], stackNames: string[]): PipelineStatusDetail[] {
  const existedStackNames = stackDetails.map(s => s.stackName);
  for (const stackName of stackNames) {
    if (!existedStackNames.includes(stackName)) {
      const cutPrefixName = stackName.substring(stackPrefix.length);
      stackDetails.push({
        stackId: '',
        stackName: stackName,
        stackType: cutPrefixName.split('-')[1] as PipelineStackType,
        stackStatus: undefined,
        stackStatusReason: '',
        stackTemplateVersion: '',
        outputs: [],
      } as PipelineStatusDetail);
    }
  }
  for (const stackDetail of stackDetails) {
    if (stackDetail.stackName === curStack.StackName) {
      stackDetail.stackId = curStack.StackId ?? '';
      stackDetail.stackStatus = curStack.StackStatus;
      stackDetail.stackStatusReason = curStack.StackStatusReason ?? '';
      stackDetail.outputs = curStack.Outputs ?? [];
      stackDetail.stackTemplateVersion = getVersionFromTags(curStack.Tags);
      break;
    }
  }
  return stackDetails;
}

export function getPipelineIdFromStackName(stackName: string): string {
  return stackName.split('-').pop() ?? '';
}

export function getVersionFromTags(tags: Tag[] | undefined) {
  let version = '';
  if (!tags) {
    return version;
  }
  const versionTag = tags.filter(t => t.Key === BuiltInTagKeys.AWS_SOLUTION_VERSION);
  if (versionTag.length > 0) {
    version = versionTag[0].Value ?? '';
  }
  return version;
}

export function getWorkflowStacks(state: WorkflowState): string[] {
  let res: string[] = [];
  if (state.Type === WorkflowStateType.PARALLEL) {
    for (let branch of state.Branches as WorkflowParallelBranch[]) {
      for (let key of Object.keys(branch.States)) {
        res = res.concat(getWorkflowStacks(branch.States[key]));
      }
    }
  } else if (state.Type === WorkflowStateType.STACK) {
    if (state.Data?.Input.StackName) {
      res.push(state.Data?.Input.StackName);
    }
  }
  return res;
}

export const getTopicArn = (region: string, pipelineId: string) => {
  const partition = region.startsWith('cn') ? 'aws-cn' : 'aws';
  const topicName = `${CFN_TOPIC_PREFIX}-${pipelineId}`;
  return `arn:${partition}:sns:${region}:${process.env.AWS_ACCOUNT_ID}:${topicName}`;
};

async function updateStateStatusWithOptimisticLocking(
  projectId: string, pipelineId:string,
  eventDetail: StepFunctionsExecutionStatusChangeNotificationEventDetail,
  updateAt: number): Promise<boolean> {
  try {
    const executionDetail: ExecutionDetail = {
      executionArn: eventDetail.executionArn,
      name: eventDetail.name,
      status: eventDetail.status,
    };
    const input: UpdateCommandInput = {
      TableName: clickStreamTableName,
      Key: {
        id: projectId,
        type: `PIPELINE#${pipelineId}#latest`,
      },
      ConditionExpression: '#ConditionVersion = :ConditionVersionValue',
      UpdateExpression: 'SET #executionDetail = :executionDetail, #ConditionVersion = :updateAt',
      ExpressionAttributeNames: {
        '#executionDetail': 'executionDetail',
        '#ConditionVersion': 'updateAt',
      },
      ExpressionAttributeValues: {
        ':executionDetail': executionDetail,
        ':ConditionVersionValue': updateAt,
        ':updateAt': Date.now(),
      },
    };
    await docClient.send(new UpdateCommand(input));
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      return false;
    }
    logger.error('Failed to update pipeline state status: ', { projectId, pipelineId, err });
    throw err;
  }
};

export const updatePipelineStateStatus = async (
  projectId: string, pipelineId:string,
  eventDetail: StepFunctionsExecutionStatusChangeNotificationEventDetail,
  updateAt: number) => {
  try {
    let retryCount = 0;
    let success = await updateStateStatusWithOptimisticLocking(projectId, pipelineId, eventDetail, updateAt);
    while (!success && retryCount < MAX_RETRY_COUNT) {
      logger.warn('Failed to update pipeline state status with optimistic locking: ', { projectId, pipelineId, retryCount });
      const pipeline = await getPipeline(pipelineId);
      if (!pipeline) {
        logger.error('Failed to get pipeline: ', { projectId, pipelineId });
        throw new Error('Failed to get pipeline');
      }
      success = await updateStateStatusWithOptimisticLocking(projectId, pipelineId, eventDetail, pipeline.updateAt);
      retryCount += 1;
    }
  } catch (err) {
    logger.error('Failed to update pipeline state status: ', { projectId, pipelineId, err });
    throw err;
  }
};

export const deleteProject = async (projectId: string) => {
  try {
    // Scan all project versions
    const input: ScanCommandInput = {
      TableName: clickStreamTableName,
      FilterExpression: 'id = :p AND deleted = :d',
      ExpressionAttributeValues: {
        ':p': projectId,
        ':d': false,
      },
    };
    const records: Record<string, NativeAttributeValue>[] = [];
    for await (const page of paginateScan({ client: docClient }, input)) {
      records.push(...page.Items as Record<string, NativeAttributeValue>[]);
    }
    if (records.length === 0) {
      return;
    }
    const transactInput: TransactWriteItemsCommandInput = {
      TransactItems: [],
    };
    for (let rec of records) {
      transactInput.TransactItems!.push({
        Update: {
          TableName: clickStreamTableName,
          Key: {
            id: { S: projectId },
            type: { S: rec.type },
          },
          UpdateExpression: 'SET deleted= :d, statusType= :s ',
          ExpressionAttributeValues: {
            ':d': { BOOL: true },
            ':s': { S: PipelineStatusType.DELETED },
          },
        },
      });
    }
    const params: TransactWriteItemsCommand = new TransactWriteItemsCommand(transactInput);
    await docClient.send(params);
  } catch (err) {
    logger.error('Failed to delete project: ', { projectId, err });
    throw err;
  }
};

export const deleteRuleAndTargets = async (region: string, name: string) => {
  try {
    await deleteTargetsOfRule(region, name);
    await deleteRule(region, name);
  } catch (error) {
    logger.error('Error in deleteRuleAndTargets', { error });
    throw error;
  }
};

const deleteTargetsOfRule = async (region: string, rule: string) => {
  try {
    const client = new CloudWatchEventsClient({
      ...aws_sdk_client_common_config,
      region,
    });
    const command = new ListTargetsByRuleCommand({
      Rule: rule,
    });
    const res = await client.send(command);
    const targetIds = res.Targets?.map((target) => target.Id || '') || [];
    if (targetIds.length === 0) {
      return;
    }
    await client.send(new RemoveTargetsCommand({
      Rule: rule,
      Ids: targetIds,
      Force: true,
    }));
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      logger.warn('Rule target not found', { error });
      return;
    }
    logger.error('Error in deleteTargetsOfRule', { error });
    throw error;
  }
};

const deleteRule = async (region: string, name: string) => {
  try {
    const client = new CloudWatchEventsClient({
      ...aws_sdk_client_common_config,
      region,
    });
    const command = new DeleteRuleCommand({
      Name: name,
      Force: true,
    });
    await client.send(command);
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      logger.warn('Rule not found', { error });
      return;
    }
    logger.error('Error in deleteRule', { error });
    throw error;
  }
};

export const deleteRuleAndTopic = async (region: string, ruleName: string, topicArn: string) => {
  try {
    await deleteTopicAndSubscription(region, topicArn);
    await deleteRuleAndTargets(region, ruleName);
  } catch (error) {
    logger.error('Error in deleteRuleAndTopic', { error });
    throw error;
  }
};

const deleteTopicAndSubscription = async (region: string, topicArn: string) => {
  try {
    await unsubscribeTopic(region, topicArn);
    await deleteTopic(region, topicArn);
  } catch (error) {
    logger.error('Error in deleteTopicAndSubscription', { error });
    throw error;
  }
};

const deleteTopic = async (region: string, topicArn: string) => {
  try {
    const client = new SNSClient({
      region,
    });
    const command = new DeleteTopicCommand({
      TopicArn: topicArn,
    });
    await client.send(command);
  } catch (error) {
    logger.error('Error in delete topic', { error });
    throw error;
  }
};

const unsubscribeTopic = async (region: string, topicArn: string) => {
  try {
    const client = new SNSClient({
      region,
    });
    const command = new ListSubscriptionsByTopicCommand({
      TopicArn: topicArn,
    });
    const subs = (await client.send(command)).Subscriptions ?? [];
    for (const sub of subs) {
      const unsubscribeCommand = new UnsubscribeCommand({
        SubscriptionArn: sub.SubscriptionArn,
      });
      await client.send(unsubscribeCommand);
    }
  } catch (error) {
    logger.error('Error in unsubscribe topic', { error });
    throw error;
  }
};
