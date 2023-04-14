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

import path from 'path';
import { Duration, CustomResource, Stack } from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { DicItem } from './click-stream-api';
import { addCfnNagToStack, ruleForLambdaVPCAndReservedConcurrentExecutions } from '../../common/cfn-nag';
import { cloudWatchSendLogs, createLambdaRole } from '../../common/lambda';
import { POWERTOOLS_ENVS } from '../../common/powertools';

export interface CdkCallCustomResourceProps {
  readonly table: Table;
  readonly items: DicItem[];
  readonly targetToCNRegions?: boolean;
}

export class BatchInsertDDBCustomResource extends Construct {

  constructor(scope: Construct, id: string, props: CdkCallCustomResourceProps) {
    super(scope, id);

    const customResourceLambda = new NodejsFunction(this, 'DicInitCustomResourceFunction', {
      description: 'Lambda function for dictionary init of solution Click Stream Analytics on AWS',
      entry: path.join(__dirname, './lambda/batch-insert-ddb/index.ts'),
      handler: 'handler',
      timeout: Duration.seconds(30),
      runtime: props.targetToCNRegions ? Runtime.NODEJS_16_X : Runtime.NODEJS_18_X,
      memorySize: 256,
      reservedConcurrentExecutions: 1,
      role: createLambdaRole(this, 'DicInitCustomResourceRole', false, []),
      architecture: props.targetToCNRegions ? Architecture.X86_64 : Architecture.ARM_64,
      environment: {
        ... POWERTOOLS_ENVS,
      },
    });

    props.table.grantReadWriteData(customResourceLambda);
    cloudWatchSendLogs('custom-resource-func-logs', customResourceLambda);
    addCfnNagToStack(Stack.of(this), [
      ruleForLambdaVPCAndReservedConcurrentExecutions(
        'BatchInsertDDBCustomResource/DicInitCustomResourceFunction/Resource',
        'DicInitCustomResourceFunction',
      ),
    ]);

    const customResourceProvider = new Provider(
      this,
      'DicInitCustomResourceProvider',
      {
        onEventHandler: customResourceLambda,
        logRetention: RetentionDays.FIVE_DAYS,
      },
    );

    new CustomResource(
      this,
      'DicInitCustomResource',
      {
        serviceToken: customResourceProvider.serviceToken,
        properties: {
          tableName: props.table.tableName,
          items: props.items,
        },
      },
    );
  }

}