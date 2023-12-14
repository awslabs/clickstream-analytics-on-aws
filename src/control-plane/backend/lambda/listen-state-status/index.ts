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

import { ExecutionStatus } from '@aws-sdk/client-sfn';
import { EventBridgeEvent } from 'aws-lambda';
import { logger } from '../../../../common/powertools';

interface StepFunctionsExecutionStatusChangeNotificationEventDetail {
  executionArn: string;
  stateMachineArn: string;
  name: string;
  status?: ExecutionStatus;
  startDate?: number;
  stopDate?: number;
  input?: any;
  output?: any;
}

export const handler = async (
  event: EventBridgeEvent<'Step Functions Execution Status Change', StepFunctionsExecutionStatusChangeNotificationEventDetail>): Promise<void> => {

  logger.debug('Event: ', { event: event });
};
