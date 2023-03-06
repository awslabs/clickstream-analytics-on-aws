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

import { SFNClient, StartExecutionCommand, StartExecutionCommandOutput } from '@aws-sdk/client-sfn';
import { stackActionStateMachineArn } from '../common/constants';

// Create SFN Client
const sfnClient = new SFNClient({});

export interface StackRequest {
  readonly Input: StackRequestInput;
  readonly Callback: StackRequestCallback;
}
export interface StackRequestInput {
  readonly Action: string;
  readonly StackName: string;
  readonly TemplateURL: string;
  readonly Parameters: StackRequestInputParameter[];

}
export interface StackRequestInputParameter {
  readonly ParameterKey: string;
  readonly ParameterValue: string;
}
export interface StackRequestCallback {
  readonly TableName: string;
  readonly ProjectId: string;
  readonly Type: string;
  readonly AttributeName: string;
}

export class StackManager {
  public async execute(req: StackRequest): Promise<string | undefined> {
    const params: StartExecutionCommand = new StartExecutionCommand({
      stateMachineArn: stackActionStateMachineArn,
      input: JSON.stringify(req),
    });
    const result: StartExecutionCommandOutput = await sfnClient.send(params);
    return result.executionArn;
  }
}