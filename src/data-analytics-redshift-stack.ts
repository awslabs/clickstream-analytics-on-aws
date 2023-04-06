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
import { SubnetSelection, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { RedshiftAnalyticsStack } from './analytics/analytics-on-redshift';
import {
  createStackParameters, RedshiftAnalyticsStackProps,
} from './analytics/parameter';
import { RedshiftMode } from './analytics/private/constant';
import { addCfnNagForCfnResource, ruleRolePolicyWithWildcardResources } from './common/cfn-nag';
import { SolutionInfo } from './common/solution-info';

export class DataAnalyticsRedshiftStack extends Stack {
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

    createRedshiftAnalyticsStack(this, p.params);

    addCfnNagForCfnResource(this, 'CDK built-in custom resource for S3 bucket notification', 'BucketNotificationsHandler[0-9a-fA-F]+',
      undefined, [ruleRolePolicyWithWildcardResources('BucketNotificationsHandler[0-9a-fA-F]+/Role/DefaultPolicy/Resource', 'CDK built-in BucketNotification', 's3')]);
  }
}

export function createRedshiftAnalyticsStack(
  scope: Construct,
  props: RedshiftAnalyticsStackProps,
) {
  // Vpc
  const vpc = Vpc.fromVpcAttributes(scope, 'from-vpc-for-redshift', {
    vpcId: props.vpcIdParam.valueAsString,
    availabilityZones: Fn.getAzs(),
    privateSubnetIds: Fn.split(',', props.privateSubnetIdsParam.valueAsString),
  });

  const subnetSelection: SubnetSelection = {
    subnets: vpc.privateSubnets,
  };

  const sinkS3Bucket = Bucket.fromBucketName(
    scope,
    'redshift-from-pipeline-sinkS3Bucket',
    props.sinkS3BucketParam.valueAsString,
  );

  const loadWorkflowS3Bucket = Bucket.fromBucketName(
    scope,
    'redshift-from-pipeline-loadWorkflowBucket',
    props.loadTempBucketParam.valueAsString,
  );

  const nestStackProps = {
    vpc: vpc,
    subnetSelection: subnetSelection,
    projectId: props.projectIdParam.valueAsString,
    appIds: props.appIdsParam.valueAsString,
    odsSource: {
      s3Bucket: sinkS3Bucket,
      prefix: props.sinkS3PrefixParam.valueAsString,
      fileSuffix: props.sinkS3FileSuffixParam.valueAsString,
    },
    loadWorkflowData: {
      s3Bucket: loadWorkflowS3Bucket,
      prefix: props.loadTempBucketPrefixParam.valueAsString,
    },
    loadDataProps: {
      scheduleInterval: props.loadJobScheduleIntervalParam.valueAsNumber,
      maxFilesLimit: props.maxFilesLimitParam.valueAsNumber,
      processingFilesLimit: props.processingFilesLimitParam.valueAsNumber,
    },
  };

  sinkS3Bucket.enableEventBridgeNotification();

  const redshiftModeStr = props.redshiftModeParam.valueAsString;

  const isRedshiftServerless = new CfnCondition(
    scope,
    'redshiftServerless',
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
  const redshiftServerlessStack = new RedshiftAnalyticsStack(
    scope,
    RedshiftMode.SERVERLESS + ' Redshift',
    {
      ...nestStackProps,
      serverlessRedshiftProps: {
        namespaceId: props.redshiftServerlessNamespaceIdParam.valueAsString,
        workgroupName: props.redshiftServerlessWorkgroupNameParam.valueAsString,
        workgroupId: props.redshiftServerlessWorkgroupIdParam.valueAsString,
        superUserIAMRoleArn: props.redshiftServerlessIAMRoleParam.valueAsString,
      },
    },
  );
  (redshiftServerlessStack.nestedStackResource as CfnStack).cfnOptions.condition = isRedshiftServerless;

  const redshiftProvisionedStack = new RedshiftAnalyticsStack(
    scope,
    RedshiftMode.PROVISIONED + ' Redshift',
    {
      ...nestStackProps,
      provisionedRedshiftProps: {
        clusterIdentifier: props.redshiftClusterIdentifierParam.valueAsString,
        dbUser: props.redshiftDbUserParam.valueAsString,
      },
    },
  );
  (redshiftProvisionedStack.nestedStackResource as CfnStack).cfnOptions.condition = isRedshiftProvisioned;
  return {
    redshiftServerlessStack,
    redshiftProvisionedStack,
  };
}

