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

import {
  CfnCondition,
  CfnStack,
  Fn,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { RedshiftAnalyticsStack } from './analytics/analytics-on-redshift';
import {
  createStackParameters, RedshiftAnalyticsStackProps,
} from './analytics/parameter';
import { RedshiftMode } from './analytics/private/constant';
import { addCfnNagForCfnResource, ruleRolePolicyWithWildcardResources } from './common/cfn-nag';
import { SolutionInfo } from './common/solution-info';

export class DataAnalyticsRedshiftStack extends Stack {
  public readonly nestedStacks: {
    readonly redshiftServerlessStack: RedshiftAnalyticsStack;
    readonly redshiftProvisionedStack: RedshiftAnalyticsStack;
    readonly newRedshiftServerlessStack: RedshiftAnalyticsStack;
  };
  constructor(
    scope: Construct,
    id: string,
    props?: StackProps,
  ) {
    super(scope, id, props);

    const featureName = 'Analytics';
    this.templateOptions.description = `(${SolutionInfo.SOLUTION_ID}) ${SolutionInfo.SOLUTION_NAME} - ${featureName} (Version ${SolutionInfo.SOLUTION_VERSION})`;

    const p = createStackParameters(this);
    this.templateOptions.metadata = p.metadata;

    this.nestedStacks = createRedshiftAnalyticsStack(this, p.params);

    addCfnNagForCfnResource(this, 'CDK built-in custom resource for S3 bucket notification', 'BucketNotificationsHandler[0-9a-fA-F]+',
      undefined, [ruleRolePolicyWithWildcardResources('BucketNotificationsHandler[0-9a-fA-F]+/Role/DefaultPolicy/Resource', 'CDK built-in BucketNotification', 's3')]);
  }
}

export function createRedshiftAnalyticsStack(
  scope: Construct,
  props: RedshiftAnalyticsStackProps,
) {
  // Vpc

  const nestStackProps = {
    vpc: props.network.vpc,
    subnetSelection: props.network.subnetSelection,
    projectId: props.projectId,
    appIds: props.appIds,
    odsSource: {
      s3Bucket: props.odsEvents.bucket,
      prefix: props.odsEvents.prefix,
      fileSuffix: props.odsEvents.fileSuffix,
    },
    loadWorkflowData: {
      s3Bucket: props.loadConfiguration.workdir.bucket,
      prefix: props.loadConfiguration.workdir.prefix,
    },
    loadDataProps: {
      scheduleInterval: props.loadConfiguration.loadJobScheduleIntervalInMinutes,
      maxFilesLimit: props.loadConfiguration.maxFilesLimit,
      processingFilesLimit: props.loadConfiguration.processingFilesLimit,
    },
    upsertUsersWorkflowData: {
      scheduleExpression: props.upsertUsersConfiguration.scheduleExpression,
    },
  };

  props.odsEvents.bucket.enableEventBridgeNotification();

  const redshiftModeStr = props.redshift.mode;

  const isNewRedshiftServerless = new CfnCondition(
    scope,
    'newRedshiftServerless',
    {
      expression:
        Fn.conditionEquals(redshiftModeStr, RedshiftMode.NEW_SERVERLESS),
    },
  );
  const isExistingRedshiftServerless = new CfnCondition(
    scope,
    'existingRedshiftServerless',
    {
      expression:
        Fn.conditionEquals(redshiftModeStr, RedshiftMode.SERVERLESS),
    },
  );
  const isRedshiftProvisioned = new CfnCondition(
    scope,
    'redshiftProvisioned',
    {
      expression:
        Fn.conditionEquals(redshiftModeStr, RedshiftMode.PROVISIONED),
    },
  );

  const newRedshiftServerlessStack = new RedshiftAnalyticsStack(
    scope,
    RedshiftMode.NEW_SERVERLESS + ' Redshift',
    {
      ...nestStackProps,
      newRedshiftServerlessProps: {
        ...props.redshift.newServerless!,
        databaseName: props.redshift.defaultDtabaseName,
      },
    },
  );
  (newRedshiftServerlessStack.nestedStackResource as CfnStack).cfnOptions.condition = isNewRedshiftServerless;

  const redshiftExistingServerlessStack = new RedshiftAnalyticsStack(
    scope,
    RedshiftMode.SERVERLESS + ' Redshift',
    {
      ...nestStackProps,
      existingRedshiftServerlessProps: {
        createdInStack: false,
        databaseName: props.redshift.defaultDtabaseName,
        ...props.redshift.existingServerless!,
        dataAPIRoleArn: props.redshift.existingServerless!.iamRole,
      },
    },
  );
  (redshiftExistingServerlessStack.nestedStackResource as CfnStack).cfnOptions.condition = isExistingRedshiftServerless;

  const redshiftProvisionedStack = new RedshiftAnalyticsStack(
    scope,
    RedshiftMode.PROVISIONED + ' Redshift',
    {
      ...nestStackProps,
      provisionedRedshiftProps: {
        databaseName: props.redshift.defaultDtabaseName,
        ...props.redshift.provisioned!,
      },
    },
  );
  (redshiftProvisionedStack.nestedStackResource as CfnStack).cfnOptions.condition = isRedshiftProvisioned;
  return {
    redshiftServerlessStack: redshiftExistingServerlessStack,
    newRedshiftServerlessStack,
    redshiftProvisionedStack,
  };
}

