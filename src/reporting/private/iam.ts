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

import { QUICKSIGHT_RESOURCE_NAME_PREFIX } from '@aws/clickstream-base-lib';
import { Arn, ArnFormat, Aws } from 'aws-cdk-lib';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { createLambdaRole } from '../../common/lambda';

export function createRoleForQuicksightCustomResourceLambda(
  scope: Construct,
  parentTemplateArn: string,
) {
  const arnPrefix = `arn:${Aws.PARTITION}:quicksight:${Aws.REGION}:${Aws.ACCOUNT_ID}`;
  const policyStatements = [
    new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [
        `${arnPrefix}:datasource/clickstream_datasource_*`,
      ],
      actions: [
        'quicksight:DescribeDataSource',
        'quicksight:PassDataSource',
        'quicksight:DescribeDataSourcePermissions',
        'quicksight:UpdateDataSourcePermissions',
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
        'quicksight:ListTemplateVersions',
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
        'quicksight:UpdateDataSetPermissions',
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
        'quicksight:UpdateAnalysisPermissions',
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
        'quicksight:UpdateDashboardPermissions',
        'quicksight:UpdateDashboardPublishedVersion',
      ],
    }),

    new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [
        `${arnPrefix}:folder/${QUICKSIGHT_RESOURCE_NAME_PREFIX}*`,
      ],
      actions: [
        'quicksight:CreateFolderMembership',
        'quicksight:DeleteFolderMembership',
        'quicksight:DescribeFolder',
        'quicksight:CreateFolder',
        'quicksight:DeleteFolder',
        'quicksight:UpdateFolder',
        'quicksight:UpdateFolderPermissions',
        'quicksight:ListFolderMembers',
      ],
    }),

  ];

  return createLambdaRole(scope, 'QuicksightCustomResourceLambdaRole', false, policyStatements);

}

export function createNetworkInterfaceCheckCustomResourceLambda(
  scope: Construct,
) {
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

  const policyStatements = [
    new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [
        '*',
      ],
      actions: [
        'ec2:DescribeNetworkInterfaces',
        'quicksight:DescribeVPCConnection',
      ],
    }),
  ];

  const principal = new ServicePrincipal('lambda.amazonaws.com');
  return createLambdaRole(scope, 'NetworkInterfaceCheckCustomResourceLambdaRole', false, policyStatements, principal, logGroupArn);

}
