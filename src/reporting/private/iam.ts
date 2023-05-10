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

import { Arn, ArnFormat, Aws } from 'aws-cdk-lib';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { createLambdaRole } from '../../common/lambda';


export function createRoleForQuicksightCustomResourceLambda(
  scope: Construct,
  parameterName: string,
  parentTemplateArn: string,
) {
  const ssmRes = Arn.format(
    {
      resource: 'parameter',
      service: 'ssm',
      resourceName: parameterName,
      arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
      region: Aws.REGION,
      account: Aws.ACCOUNT_ID,
      partition: Aws.PARTITION,
    },
  );
  const logGroupArn = Arn.format(
    {
      resource: 'log-group',
      service: 'logs',
      resourceName: '/aws/lambda/*',
      arnFormat: ArnFormat.COLON_RESOURCE_NAME,
      region: Aws.REGION,
      account: Aws.ACCOUNT_ID,
      partition: Aws.PARTITION,
    },
  );

  const arnPrefix = `arn:${Aws.PARTITION}:quicksight:${Aws.REGION}:${Aws.ACCOUNT_ID}`;

  const policyStatements = [
    new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [
        `${arnPrefix}:datasource/clickstream_datasource_*`,
      ],
      actions: [
        'quicksight:DescribeDataSource',
        'quicksight:DeleteDataSource',
        'quicksight:CreateDataSource',
        'quicksight:UpdateDataSource',
        'quicksight:PassDataSource',
      ],
    }),

    new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [
        `${arnPrefix}:template/clickstream_template_*`,
        parentTemplateArn,
      ],
      actions: [
        'quicksight:DescribeTemplate',
        'quicksight:DeleteTemplate',
        'quicksight:CreateTemplate',
        'quicksight:UpdateTemplate',
      ],
    }),

    new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [
        `${arnPrefix}:dataset/clickstream_dataset_*`,
      ],
      actions: [
        'quicksight:DescribeDataSet',
        'quicksight:DeleteDataSet',
        'quicksight:CreateDataSet',
        'quicksight:UpdateDataSet',
        'quicksight:PassDataSet',
        'quicksight:PassDataSource',
      ],
    }),

    new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [
        `${arnPrefix}:analysis/clickstream_analysis_*`,
      ],
      actions: [
        'quicksight:DescribeAnalysis',
        'quicksight:DeleteAnalysis',
        'quicksight:CreateAnalysis',
        'quicksight:UpdateAnalysis',
      ],
    }),

    new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [
        `${arnPrefix}:dashboard/clickstream_dashboard_*`,
      ],
      actions: [
        'quicksight:DescribeDashboard',
        'quicksight:DeleteDashboard',
        'quicksight:CreateDashboard',
        'quicksight:UpdateDashboard',
      ],
    }),

    new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [ssmRes],
      actions: [
        'ssm:GetParameter',
      ],
    }),

  ];

  const principal = new ServicePrincipal('lambda.amazonaws.com');
  return createLambdaRole(scope, 'QuicksightCustomResourceLambdaRole', false, policyStatements, principal, logGroupArn);

}
