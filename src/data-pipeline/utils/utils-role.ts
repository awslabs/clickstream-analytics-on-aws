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


import { Arn, ArnFormat, Aws, aws_iam as iam, Stack } from 'aws-cdk-lib';

import { Effect } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { createLambdaRole } from '../../common/lambda';

export class RoleUtil {

  public static newInstance(scope: Construct) {
    return new this(scope);
  }

  private readonly scope: Construct;

  private constructor(scope: Construct) {
    this.scope = scope;
  }

  public createPartitionSyncerRole(roleName: string, databaseName: string, sourceTableName: string, sinkTableName: string): iam.Role {
    return createLambdaRole(this.scope, roleName, true, [
      new iam.PolicyStatement({
        effect: Effect.ALLOW,
        resources: [
          // `arn:aws:glue:*:${this.props.account}:catalog`,
          // `arn:aws:glue:*:${this.props.account}:database/${databaseName}`,
          // `arn:aws:glue:*:${this.props.account}:table/${databaseName}/${sourceTableName}`,
          // `arn:aws:glue:*:${this.props.account}:table/${databaseName}/${sinkTableName}`,
          this.getGlueResourceArn('catalog'),
          this.getGlueResourceArn(`database/${databaseName}`),
          this.getGlueResourceArn(`table/${databaseName}/${sourceTableName}`),
          this.getGlueResourceArn(`table/${databaseName}/${sinkTableName}`),
        ],
        actions: ['glue:BatchCreatePartition'],
      }),
    ]);
  }

  private getGlueResourceArn(resource: string) {
    return Arn.format(
      {
        resource: resource,
        region: Aws.REGION,
        account: Aws.ACCOUNT_ID,
        service: 'glue',
        arnFormat: ArnFormat.COLON_RESOURCE_NAME,
      },
      Stack.of(this.scope),
    );
  }
}