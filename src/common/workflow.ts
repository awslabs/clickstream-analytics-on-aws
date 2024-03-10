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
import { Context } from 'aws-lambda';

export interface WaitTimeInfo {
  waitTime: number;
  loopCount: number;
}

export const DEFAULT_WAIT_TIME_INFO: WaitTimeInfo = {
  waitTime: 30,
  loopCount: 0,
};

function calculateWaitTime(waitTime: number, loopCount: number, maxWaitTime = 600) {
  if (loopCount > 4) {
    const additionalTime = (loopCount - 4) * 10;
    waitTime += additionalTime;
  }
  loopCount++;
  return { waitTime: Math.min(waitTime, maxWaitTime), loopCount };
}

export function handleBackoffTimeInfo<T, R>(handler: (event: T, context?: Context) => Promise<R>) {
  return async (event: T & { waitTimeInfo?: WaitTimeInfo }, context?: Context): Promise<R & { waitTimeInfo: WaitTimeInfo }> => {
    if (event.waitTimeInfo === undefined) {
      event.waitTimeInfo = DEFAULT_WAIT_TIME_INFO;
    }

    const updatedWaitTimeInfo = calculateWaitTime(event.waitTimeInfo.waitTime, event.waitTimeInfo.loopCount);

    const { waitTimeInfo, ...restEvent } = event;

    const originalResponse = await handler(restEvent as T, context);

    return {
      ...originalResponse,
      waitTimeInfo: updatedWaitTimeInfo,
    };
  };
}