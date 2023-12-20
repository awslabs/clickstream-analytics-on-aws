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

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, QueryCommandInput, paginateQuery, UpdateCommandInput } from '@aws-sdk/lib-dynamodb';
import { NativeAttributeValue } from '@aws-sdk/util-dynamodb';
import { EventBridgeEvent } from 'aws-lambda';
import { ExecutionDetail } from '../../../../common/model';
import { logger } from '../../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../../common/sdk-client-config';

const ddbClient = new DynamoDBClient({
  ...aws_sdk_client_common_config,
});

const marshallOptions = {
  convertEmptyValues: false,
  removeUndefinedValues: true,
  convertClassInstanceToMap: true,
  convertTopLevelContainer: false,
};

const unmarshallOptions = {
  wrapNumbers: false,
};

const translateConfig = {
  marshallOptions: { ...marshallOptions, convertTopLevelContainer: true },
  unmarshallOptions: { ...unmarshallOptions },
};

const docClient = DynamoDBDocumentClient.from(ddbClient, { ...translateConfig });

const clickStreamTableName = process.env.CLICKSTREAM_TABLE_NAME ?? '';
const prefixTimeGSIName = process.env.PREFIX_TIME_GSI_NAME ?? '';

interface StepFunctionsExecutionStatusChangeNotificationEventDetail extends ExecutionDetail {
  startDate?: number;
  stopDate?: number;
  input?: any;
  output?: any;
}

export const handler = async (
  event: EventBridgeEvent<'Step Functions Execution Status Change', StepFunctionsExecutionStatusChangeNotificationEventDetail>): Promise<void> => {
  logger.debug('Event: ', { event: event });

  const eventDetail = event.detail;
  const executionName = eventDetail.name;
  if (!executionName?.startsWith('main-')) {
    logger.warn('Not a main execution, skip: ', { executionName });
    return;
  }
  const pipelineId = executionName.split('-')[1];
  const projectId = await getProjectIdByPipelineId(pipelineId);
  if (!projectId) {
    logger.error('Failed to get projectId by pipelineId: ', { pipelineId });
    return;
  }

  await updatePipelineStateStatus(projectId, pipelineId, eventDetail);
};


async function getProjectIdByPipelineId(pipelineId: string): Promise<string | undefined> {
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
      return records[0].id;
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
      stateMachineArn: eventDetail.stateMachineArn,
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
