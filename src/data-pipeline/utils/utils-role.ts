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


import { Database, Table } from '@aws-cdk/aws-glue-alpha';
import { Arn, ArnFormat, Aws, Stack } from 'aws-cdk-lib';
import { CompositePrincipal, Effect, Policy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { METRIC_NAMESPACE_DATAPIPELINE } from '../../common/constant';
import { createLambdaRole } from '../../common/lambda';

export class RoleUtil {
  public static newInstance(scope: Construct) {
    return new this(scope);
  }

  private readonly scope: Construct;

  private constructor(scope: Construct) {
    this.scope = scope;
  }

  public createPartitionSyncerRole(
    roleName: string,
    databaseName: string,
    sourceTableName: string,
    sinkTableName: string,
  ): Role {
    return createLambdaRole(this.scope, roleName, true, [
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [
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

  public createJobSubmitterLambdaRole(glueDB: Database, sourceTable: Table, sinkTable: Table, emrApplicationId: string): Role {
    const assumedBy = new CompositePrincipal(
      new ServicePrincipal('lambda.amazonaws.com'),
      new ServicePrincipal('emr-serverless.amazonaws.com'),
    );

    const policyStatement: PolicyStatement[] = [
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [
          Arn.format(
            {
              resource: `applications/${emrApplicationId}`,
              region: Aws.REGION,
              account: Aws.ACCOUNT_ID,
              service: 'emr-serverless',
              arnFormat: ArnFormat.COLON_RESOURCE_NAME,
            },
            Stack.of(this.scope),
          ),
        ],
        actions: [
          'emr-serverless:StartApplication',
        ],
      }),

      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [
          Arn.format(
            {
              resource: '*',
              region: Aws.REGION,
              account: Aws.ACCOUNT_ID,
              service: 'emr-serverless',
              arnFormat: ArnFormat.COLON_RESOURCE_NAME,
            },
            Stack.of(this.scope),
          ),
        ],
        actions: [
          'emr-serverless:StartJobRun',
        ],
      }),

      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [
          this.getGlueResourceArn('catalog'),
          this.getGlueResourceArn('database/default'),
          this.getGlueResourceArn(`database/${glueDB.databaseName}`),
          this.getGlueResourceArn(`table/${glueDB.databaseName}/${sourceTable.tableName}`),
          this.getGlueResourceArn(`table/${glueDB.databaseName}/${sinkTable.tableName}`),
        ],
        actions: ['glue:GetDatabase', 'glue:GetTable', 'glue:GetPartitions'],
      }),

      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [
          // arn:aws:iam::1111222233333:role/aws-service-role/ops.emr-serverless.amazonaws.com/AWSServiceRoleForAmazonEMRServerless
          Arn.format(
            {
              resource: 'role/aws-service-role/ops.emr-serverless.amazonaws.com/AWSServiceRoleForAmazonEMRServerless',
              region: '',
              account: Aws.ACCOUNT_ID,
              service: 'iam',
              arnFormat: ArnFormat.COLON_RESOURCE_NAME,
            },
            Stack.of(this.scope),
          ),
        ],
        actions: ['iam:CreateServiceLinkedRole'],
      }),
    ];

    const role = createLambdaRole(
      this.scope,
      'EmrSparkJobSubmitterLambdaRole',
      true,
      policyStatement,
      assumedBy,
    );
    const passRolePolicy = new Policy(this.scope, 'PassRolePolicy');
    passRolePolicy.addStatements(
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [
          role.roleArn,
        ],
        actions: ['iam:PassRole'],
      }),
    );
    role.attachInlinePolicy(passRolePolicy);
    return role;
  }

  public createEmrJobStateListenerLambdaRole(emrApplicationId: string) {

    const policyStatement: PolicyStatement[] = [
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: ['*'],
        actions: [
          'cloudwatch:PutMetricData',
        ],
        conditions: {
          StringEquals: { 'cloudwatch:namespace': METRIC_NAMESPACE_DATAPIPELINE },
        },
      }),

      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [
          Arn.format(
            {
              resource: 'applications',
              resourceName: `${emrApplicationId}/jobruns/*`,
              region: Aws.REGION,
              account: Aws.ACCOUNT_ID,
              service: 'emr-serverless',
              arnFormat: ArnFormat.SLASH_RESOURCE_SLASH_RESOURCE_NAME,
            },
            Stack.of(this.scope),
          ),
        ],
        actions: [
          'emr-serverless:GetJobRun',
        ],
      }),
    ];

    const role = createLambdaRole(
      this.scope,
      'EmrJobStateListenerLambdaRole',
      true,
      policyStatement,
    );

    return role;
  }
}
