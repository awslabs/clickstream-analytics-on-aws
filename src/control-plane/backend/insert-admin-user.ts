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

import { join } from 'path';
import { Duration, CustomResource, Stack } from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime, Function } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { createLambdaRole } from '../../common/lambda';
import { attachListTagsPolicyForFunction } from '../../common/lambda/tags';
import { POWERTOOLS_ENVS } from '../../common/powertools';
import { addCfnNagToStack, ruleForLambdaVPCAndReservedConcurrentExecutions } from '../../common/cfn-nag';

export interface AddAdminUserProps {
  readonly email: string;
  readonly userTable: Table;
}

export class AddAdminUser extends Construct {

  readonly crForAddAdminUser: CustomResource;

  constructor(scope: Construct, id: string, props: AddAdminUserProps) {
    super(scope, id);

    this.crForAddAdminUser = this.createAddAdminUserCustomResource(props);
  }

  private createAddAdminUserCustomResource(props: AddAdminUserProps): CustomResource {
    const fn = this.createAddAdminUserLambda(props);

    const provider = new Provider(
      this,
      'AddAdminUserCustomResourceProvider',
      {
        onEventHandler: fn,
        logRetention: RetentionDays.FIVE_DAYS,
      },
    );

    const cr = new CustomResource(this, 'AddAdminUserCustomResource', {
      serviceToken: provider.serviceToken,
      properties: {
        Email: props.email,
        UserTableName: props.userTable.tableName,
      },
    });

    return cr;
  }

  private createAddAdminUserLambda(props: AddAdminUserProps): Function {
    const lambdaRootPath = __dirname + '/lambda/add-admin-user';

    const readAndWriteTablePolicy: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [
        props.userTable.tableArn,
      ],
      actions: [
        'dynamodb:BatchGetItem',
        'dynamodb:GetRecords',
        'dynamodb:GetShardIterator',
        'dynamodb:Query',
        'dynamodb:GetItem',
        'dynamodb:Scan',
        'dynamodb:ConditionCheckItem',
        'dynamodb:BatchWriteItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:DescribeTable',
      ],
    });

    const fn = new NodejsFunction(this, 'AddAdminUserFn', {
      runtime: Runtime.NODEJS_18_X,
      entry: join(
        lambdaRootPath,
        'index.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      reservedConcurrentExecutions: 1,
      timeout: Duration.minutes(5),
      logRetention: RetentionDays.ONE_WEEK,
      role: createLambdaRole(this, 'AddAdminUserRole', false, [readAndWriteTablePolicy]),
      environment: {
        ... POWERTOOLS_ENVS,
      },
    });

    attachListTagsPolicyForFunction(this, 'AddAdminUserFn', fn);
    addCfnNagToStack(Stack.of(this), [
      ruleForLambdaVPCAndReservedConcurrentExecutions(
        'ClickStreamApi/AddAdminUserCustomResource/AddAdminUserFn/Resource',
        'AddAdminUserFn',
      ),
      ruleForLambdaVPCAndReservedConcurrentExecutions(
        'ClickStreamApi/AddAdminUserCustomResource/AddAdminUserCustomResourceProvider/framework-onEvent/Resource',
        'AddAdminUserFnProvider',
      ),
    ]);

    return fn;
  }
}
