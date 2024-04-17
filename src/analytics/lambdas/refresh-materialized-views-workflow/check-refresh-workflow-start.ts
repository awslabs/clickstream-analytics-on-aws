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

import { aws_sdk_client_common_config, logger } from '@aws/clickstream-base-lib';
import { SFNClient, ListExecutionsCommand, ListExecutionsCommandOutput } from '@aws-sdk/client-sfn';
import { WorkflowStatus } from '../../private/constant';

const REGION = process.env.AWS_REGION; //e.g. "us-east-1"

const sfnClient = new SFNClient({
  region: REGION,
  ...aws_sdk_client_common_config,
});

export interface CheckRefreshWorkflowEvent {
  executionId: string;
}

/**
 * The lambda function to check refresh workflow should be start or not
 */
export const handler = async (event: CheckRefreshWorkflowEvent) => {
  try {
    const hasRunningExecution: boolean = await hasOtherRunningExecutions(event.executionId);
    if (!hasRunningExecution) {
      return {
        status: WorkflowStatus.CONTINUE,
      };
    } else {
      return {
        status: WorkflowStatus.SKIP,
      };
    }
  } catch (err) {
    if (err instanceof Error) {
      logger.error('Error when check refresh workflow start or not.', err);
    }
    throw err;
  }
};

async function hasOtherRunningExecutions(executionArn: string) {
  const tempArr: string[] = executionArn.split(':');
  tempArr.pop();
  const stateMachineArn = tempArr.join(':').replace(':execution:', ':stateMachine:');

  logger.info('ListExecutionsCommand, stateMachineArn=' + stateMachineArn);
  const res: ListExecutionsCommandOutput = await sfnClient.send(new ListExecutionsCommand({
    stateMachineArn,
    statusFilter: 'RUNNING',
  }));

  let otherRunningExecutionsCount = 0;

  let hasRunningWorkflow = false;
  if (res.executions) {
    logger.info('totalExecutionsCount=' + res.executions.length);
    otherRunningExecutionsCount = res.executions.filter(e => e.executionArn != executionArn).length;
  }

  logger.info('otherRunningExecutionsCount=' + otherRunningExecutionsCount);

  if (otherRunningExecutionsCount > 0) {
    hasRunningWorkflow = true;
  }

  return hasRunningWorkflow;

}