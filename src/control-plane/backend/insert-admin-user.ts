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

import { Duration } from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { AwsCustomResource, AwsCustomResourcePolicy, AwsSdkCall, PhysicalResourceId } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { DEFAULT_SOLUTION_OPERATOR } from '../../common/constant';

export interface AddAdminUserProps {
  readonly uid: string;
  readonly userTable: Table;
}

export class AddAdminUser extends Construct {

  readonly crForAddAdminUser: AwsCustomResource;

  constructor(scope: Construct, id: string, props: AddAdminUserProps) {
    super(scope, id);

    const physicalResourceId = PhysicalResourceId.of('AddAdminUserCustomResource');

    const putItemSdkCall: AwsSdkCall = {
      service: 'DynamoDB',
      action: 'putItem',
      physicalResourceId: physicalResourceId,
      parameters: {
        TableName: props.userTable.tableName,
        Item: {
          id: { S: props.uid },
          type: { S: 'USER' },
          prefix: { S: 'USER' },
          roles: { L: [{ S: 'Admin' }] },
          createAt: { N: Date.now().toString() },
          updateAt: { N: Date.now().toString() },
          operator: { S: DEFAULT_SOLUTION_OPERATOR },
          deleted: { BOOL: false },
        },
        ConditionExpression: 'attribute_not_exists(id)',
      },
    };

    const updateItemSdkCall: AwsSdkCall = {
      service: 'DynamoDB',
      action: 'updateItem',
      physicalResourceId: physicalResourceId,
      parameters: {
        TableName: props.userTable.tableName,
        Key: {
          id: { S: props.uid },
          type: { S: 'USER' },
        },
        UpdateExpression: 'SET #roles = :roles, #prefix = :prefix, #createAt = :createAt, #updateAt = :updateAt, #operator = :operator, #deleted = :deleted',
        ExpressionAttributeNames: {
          '#roles': 'roles',
          '#createAt': 'createAt',
          '#updateAt': 'updateAt',
          '#operator': 'operator',
          '#deleted': 'deleted',
          '#prefix': 'prefix',
        },
        ExpressionAttributeValues: {
          ':prefix': { S: 'USER' },
          ':roles': { L: [{ S: 'Admin' }] },
          ':createAt': { N: Date.now().toString() },
          ':updateAt': { N: Date.now().toString() },
          ':operator': { S: DEFAULT_SOLUTION_OPERATOR },
          ':deleted': { BOOL: false },
        },
      },
    };

    const deleteItemSdkCall: AwsSdkCall = {
      service: 'DynamoDB',
      action: 'deleteItem',
      physicalResourceId: physicalResourceId,
      parameters: {
        TableName: props.userTable.tableName,
        Key: {
          id: { S: props.uid },
          type: { S: 'USER' },
        },
        ConditionExpression: 'attribute_exists(id)',
      },
    };

    this.crForAddAdminUser = new AwsCustomResource(this, 'AddAdminUserAwsCustomResource', {
      onCreate: putItemSdkCall,
      onUpdate: updateItemSdkCall,
      onDelete: deleteItemSdkCall,
      logRetention: RetentionDays.ONE_WEEK,
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          sid: 'DynamoWriteAccess',
          effect: Effect.ALLOW,
          actions: [
            'dynamodb:PutItem',
            'dynamodb:UpdateItem',
            'dynamodb:DeleteItem',
          ],
          resources: [props.userTable.tableArn],
        }),
      ]),
      timeout: Duration.minutes(1),
      installLatestAwsSdk: false,
    },
    );
  }
}
