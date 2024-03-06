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

import {
  DescribeExecutionCommand,
  DescribeExecutionCommandOutput,
  ExecutionDoesNotExist,
  ExecutionListItem,
  SFNClient, StartExecutionCommand, StartExecutionCommandOutput, paginateListExecutions,
} from '@aws-sdk/client-sfn';
import { logger } from '../../common/powertools';
import { aws_sdk_client_common_config } from '../../common/sdk-client-config-ln';


export const startExecution = async (region: string, stateMachineArn: string, executionName: string, input: string) => {
  try {
    const client = new SFNClient({
      ...aws_sdk_client_common_config,
      region,
    });
    const params: StartExecutionCommand = new StartExecutionCommand({
      stateMachineArn: stateMachineArn,
      input: input,
      name: executionName,
    });
    const result: StartExecutionCommandOutput = await client.send(params);
    return result.executionArn;
  } catch (error) {
    logger.error('Error in start execution', { error });
    throw error;
  }
};


export const getExecutionDetail = async (region: string, executionArn: string) => {
  try {
    const client = new SFNClient({
      ...aws_sdk_client_common_config,
      region,
    });
    const params: DescribeExecutionCommand = new DescribeExecutionCommand({
      executionArn: executionArn,
    });
    const result: DescribeExecutionCommandOutput = await client.send(params);
    return result;
  } catch (error) {
    if (error instanceof ExecutionDoesNotExist) {
      logger.info(`The specified execution does not exist: ${executionArn}`);
    } else {
      logger.warn('Get execution detail error ', { error });
    }
    return undefined;
  }
};

export const listExecutions = async (region: string, stateMachineArn: string) => {
  try {
    const client = new SFNClient({
      ...aws_sdk_client_common_config,
      region,
    });
    const records: ExecutionListItem[] = [];
    for await (const page of paginateListExecutions({ client: client }, {
      stateMachineArn: stateMachineArn,
    })) {
      records.push(...page.executions as ExecutionListItem[]);
    }
    return records.sort((a: ExecutionListItem, b: ExecutionListItem) => (b.startDate?.getTime() ?? 0) - (a.startDate?.getTime() ?? 0));
  } catch (error) {
    return [];
  }
};
