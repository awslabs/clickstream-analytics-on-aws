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

import { CloudWatchEventsClient, DeleteRuleCommand, ListTargetsByRuleCommand, RemoveTargetsCommand, ResourceNotFoundException } from '@aws-sdk/client-cloudwatch-events';
import { DynamoDBClient, TransactWriteItemsCommand, TransactWriteItemsCommandInput } from '@aws-sdk/client-dynamodb';
import { ExecutionStatus } from '@aws-sdk/client-sfn';
import { DynamoDBDocumentClient, UpdateCommand, QueryCommandInput, paginateQuery, UpdateCommandInput, ScanCommandInput, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { NativeAttributeValue } from '@aws-sdk/util-dynamodb';
import { EventBridgeEvent } from 'aws-lambda';
import { ExecutionDetail, PipelineStatusType } from '../../../../common/model';
import { logger } from '../../../../common/powertools';
import { aws_sdk_client_common_config, marshallOptions, unmarshallOptions } from '../../../../common/sdk-client-config';
import { CFN_RULE_PREFIX } from '../api/common/constants';

const ddbClient = new DynamoDBClient({
  ...aws_sdk_client_common_config,
});

const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { ...marshallOptions },
  unmarshallOptions: { ...unmarshallOptions },
});

const clickStreamTableName = process.env.CLICKSTREAM_TABLE_NAME ?? '';
const prefixTimeGSIName = process.env.PREFIX_TIME_GSI_NAME ?? '';

export interface StepFunctionsExecutionStatusChangeNotificationEventDetail extends ExecutionDetail {
  startDate?: number;
  stopDate?: number;
  input?: any;
  output?: any;
}

export const handler = async (
  event: EventBridgeEvent<'Step Functions Execution Status Change', StepFunctionsExecutionStatusChangeNotificationEventDetail>): Promise<void> => {

  const eventDetail = event.detail;
  const executionName = eventDetail.name;
  if (!executionName?.startsWith('main-')) {
    return;
  }
  logger.info('Detail: ', { executionName: eventDetail.name, status: eventDetail.status });

  const pipelineId = executionName.split('-')[1];
  const pipeline = await getPipeline(pipelineId);
  if (!pipeline) {
    logger.error('Failed to get pipeline by pipelineId: ', { pipelineId });
    return;
  }

  const projectId = pipeline.projectId;

  await updatePipelineStateStatus(projectId, pipelineId, eventDetail);

  console.log('eventDetail.status: ', eventDetail.status, pipeline.lastAction);
  if (eventDetail.status === ExecutionStatus.SUCCEEDED && pipeline.lastAction === 'Delete') {
    await deleteProject(projectId);
    await deleteRuleAndTargets(pipeline.region, `${CFN_RULE_PREFIX}-${projectId}`);
  }
};

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

async function updatePipelineStateStatus(
  projectId: string, pipelineId:string,
  eventDetail: StepFunctionsExecutionStatusChangeNotificationEventDetail): Promise<void> {
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
      UpdateExpression: 'SET #executionDetail = :executionDetail',
      ExpressionAttributeNames: {
        '#executionDetail': 'executionDetail',
      },
      ExpressionAttributeValues: {
        ':executionDetail': executionDetail,
      },
    };
    await docClient.send(new UpdateCommand(input));
  } catch (err) {
    logger.error('Failed to update pipeline state status: ', { projectId, pipelineId, err });
  }
}

async function deleteProject(projectId: string): Promise<void> {
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
    const records = (await docClient.send(new ScanCommand(input))).Items ?? [];
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
  }
}

export const deleteRuleAndTargets = async (region: string, name: string) => {
  try {
    if (region === process.env.AWS_REGION) {
      return;
    }
    await deleteTargetsOfRule(region, name);
    await deleteRule(region, name);
  } catch (error) {
    logger.error('Error in deleteRuleAndTargets', { error });
    throw error;
  }
};

export const deleteTargetsOfRule = async (region: string, rule: string) => {
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

export const deleteRule = async (region: string, name: string) => {
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

