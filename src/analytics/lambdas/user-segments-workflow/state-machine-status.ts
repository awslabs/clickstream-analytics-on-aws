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

import { ExecutionStatus, ListExecutionsCommand, ListExecutionsCommandInput, SFNClient } from '@aws-sdk/client-sfn';
import { SegmentJobInitOutput } from './segment-job-init';
import { logger } from '../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../common/sdk-client-config';
import { calculateWaitTime, WaitTimeInfo } from '../../../common/workflow';

export interface StateMachineStatusEvent {
  stateMachineArn: string;
  input: SegmentJobInitOutput & {
    waitTimeInfo?: WaitTimeInfo;
  };
}

export interface StateMachineStatusOutput {
  appId: string;
  segmentId: string;
  jobRunId: string;
  stateMachineStatus: StateMachineStatus;
  waitTimeInfo: WaitTimeInfo;
}

export enum StateMachineStatus {
  IDLE = 'IDLE',
  BUSY = 'BUSY',
}

const sfnClient = new SFNClient({
  ...aws_sdk_client_common_config,
  region: process.env.AWS_REGION,
});

export const handler = async (event: StateMachineStatusEvent) => {
  try {
    // Update waitTimeInfo
    const waitTimeInfo = event.input.waitTimeInfo;
    const updatedWaitTimeInfo = !!waitTimeInfo ? calculateWaitTime(
      waitTimeInfo.waitTime,
      waitTimeInfo.loopCount,
    ) : {
      waitTime: 60,
      loopCount: 0,
    };

    // Get state machine executions status
    const request: ListExecutionsCommandInput = {
      stateMachineArn: event.stateMachineArn,
      statusFilter: ExecutionStatus.RUNNING,
    };
    const command = new ListExecutionsCommand(request);
    const response = await sfnClient.send(command);

    const output: StateMachineStatusOutput = {
      ...event.input,
      waitTimeInfo: updatedWaitTimeInfo,
      stateMachineStatus: (response.executions === undefined || response.executions.length <= 1) ?
        StateMachineStatus.IDLE : StateMachineStatus.BUSY,
    };
    return output;
  } catch (err) {
    logger.error('Failed to get state machine status', err as Error);
    throw err;
  }
};
