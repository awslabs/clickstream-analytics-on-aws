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

export function getMockContext(): Context {
  const getRemainingTimeInMillis = jest.fn(() => {return 10;});
  return {
    callbackWaitsForEmptyEventLoop: true,
    functionName: 'lambda-test-func',
    functionVersion: '1.0',
    invokedFunctionArn: 'arn:aws:lambda:us-east-2:xxxxxxxxxxxx:function:lambda-test-func-9mIwe6o7bhNz',
    memoryLimitInMB: '256',
    awsRequestId: 'request-id-1',
    logGroupName: 'logGroup1',
    logStreamName: 'logStream1',
    getRemainingTimeInMillis,
    done: function (error?: Error | undefined, result?: any): void {
      throw new Error(`Function not implemented.error:${error},result:${result}`);
    },
    fail: function (error: string | Error): void {
      throw new Error(`Function not implemented.error:${error}`);
    },
    succeed: function (messageOrObject: any): void {
      throw new Error(`Function not implemented.messageOrObject:${messageOrObject}`);
    },
  };
}