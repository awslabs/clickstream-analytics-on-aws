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

import { CloudFormationClient, DescribeStacksCommand, Stack, StackStatus, Tag } from '@aws-sdk/client-cloudformation';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommandInput, UpdateCommand, UpdateCommandInput, paginateQuery } from '@aws-sdk/lib-dynamodb';
import { NativeAttributeValue } from '@aws-sdk/util-dynamodb';
import { EventBridgeEvent } from 'aws-lambda';
import { BuiltInTagKeys, PipelineStackType, PipelineStatusDetail } from '../../../../common/model';
import { logger } from '../../../../common/powertools';
import { aws_sdk_client_common_config, marshallOptions, unmarshallOptions } from '../../../../common/sdk-client-config';
import { WorkflowParallelBranch, WorkflowState, WorkflowStateType } from '../api/common/types';

const ddbClient = new DynamoDBClient({
  ...aws_sdk_client_common_config,
});

const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { ...marshallOptions },
  unmarshallOptions: { ...unmarshallOptions },
});

const clickStreamTableName = process.env.CLICKSTREAM_TABLE_NAME ?? '';
const prefixTimeGSIName = process.env.PREFIX_TIME_GSI_NAME ?? '';

export interface CloudFormationStackStatusChangeNotificationEventDetail {
  'stack-id': string;
  'status-details': {
    status: StackStatus;
    'status-reason': string;
  };
}

export const handler = async (
  event: EventBridgeEvent<'CloudFormation Stack Status Change', CloudFormationStackStatusChangeNotificationEventDetail>): Promise<void> => {

  const eventDetail = event.detail;
  const region = event.region;
  const stackId = eventDetail['stack-id'];
  const stackName = stackId.split('/')[1];

  if (!stackName.startsWith('Clickstream')) {
    return;
  }
  const stackDetail = await describeStack(stackId, region);
  if (!stackDetail) {
    logger.error('Failed to describe stack: ', { stackId, region });
    return;
  }
  if (stackDetail.ParentId) {
    return;
  }
  logger.info('Detail: ', { stackName: stackName, status: stackDetail.StackStatus });

  const pipelineId = getPipelineIdFromStackName(stackName);
  const pipeline = await getPipeline(pipelineId);
  if (!pipeline) {
    logger.error('Failed to get pipeline by pipelineId: ', { pipelineId });
    return;
  }

  const projectId = pipeline.projectId;
  if (!pipeline.workflow) {
    logger.error('No workflow found in pipeline: ', { pipelineId });
    return;
  }
  const stackNames = getWorkflowStacks(pipeline.workflow.Workflow);

  const newStackDetails = getNewStackDetails(stackDetail, pipeline.stackDetails ?? [], stackNames);

  await updatePipelineStackStatus(projectId, pipelineId, newStackDetails);

};

async function describeStack(stackId: string, region: string): Promise<Stack | undefined> {
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
    return;
  }
}

async function getPipeline(pipelineId: string): Promise<any> {
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
    return;
  }
}

async function updatePipelineStackStatus(projectId: string, pipelineId:string, stackDetails: PipelineStatusDetail[]): Promise<void> {
  try {
    const input: UpdateCommandInput = {
      TableName: clickStreamTableName,
      Key: {
        id: projectId,
        type: `PIPELINE#${pipelineId}#latest`,
      },
      UpdateExpression: 'SET #stackDetails = :stackDetails',
      ExpressionAttributeNames: {
        '#stackDetails': 'stackDetails',
      },
      ExpressionAttributeValues: {
        ':stackDetails': stackDetails,
      },
    };
    await docClient.send(new UpdateCommand(input));
  } catch (err) {
    logger.error('Failed to update pipeline stack status: ', { projectId, pipelineId, err });
  }
}

function getNewStackDetails(curStack: Stack, stackDetails: PipelineStatusDetail[], stackNames: string[]): PipelineStatusDetail[] {
  const existedStackNames = stackDetails.map(s => s.stackName);
  for (const stackName of stackNames) {
    if (!existedStackNames.includes(stackName)) {
      stackDetails.push({
        stackName: stackName,
        stackType: stackName.split('-')[1] as PipelineStackType,
        stackStatus: undefined,
        stackStatusReason: '',
        stackTemplateVersion: '',
        outputs: [],
      } as PipelineStatusDetail);
    }
  }
  for (const stackDetail of stackDetails) {
    if (stackDetail.stackName === curStack.StackName) {
      stackDetail.stackStatus = curStack.StackStatus;
      stackDetail.stackStatusReason = curStack.StackStatusReason ?? '';
      stackDetail.outputs = curStack.Outputs ?? [];
      stackDetail.stackTemplateVersion = getVersionFromTags(curStack.Tags);
      break;
    }
  }
  return stackDetails;
}

function getPipelineIdFromStackName(stackName: string): string {
  const stackType = stackName.split('-')[1] as PipelineStackType;
  if (stackType === PipelineStackType.INGESTION) {
    return stackName.split('-')[3];
  } else {
    return stackName.split('-')[2];
  }
  return '';
}

function getVersionFromTags(tags: Tag[] | undefined) {
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

function getWorkflowStacks(state: WorkflowState): string[] {
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
