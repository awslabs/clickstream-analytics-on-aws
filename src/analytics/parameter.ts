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

import { CfnParameter, CfnRule, Fn } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { RedshiftMode } from './private/constant';
import { PARAMETER_GROUP_LABEL_VPC, PARAMETER_LABEL_PRIVATE_SUBNETS, PARAMETER_LABEL_VPCID, S3_BUCKET_NAME_PATTERN } from '../common/constant';
import { Parameters, SubnetParameterType } from '../common/parameters';

export interface RedshiftAnalyticsStackProps {
  redshiftModeParam: CfnParameter;
  vpcIdParam: CfnParameter;
  privateSubnetIdsParam: CfnParameter;
  projectIdParam: CfnParameter;
  appIdsParam: CfnParameter;
  sinkS3BucketParam: CfnParameter;
  sinkS3PrefixParam: CfnParameter;
  sinkS3FileSuffixParam: CfnParameter;
  loadTempBucketParam: CfnParameter;
  loadTempBucketPrefixParam: CfnParameter;
  redshiftDefaultDatabaseParam: CfnParameter;
  redshiftServerlessWorkgroupNameParam: CfnParameter;
  redshiftServerlessWorkgroupIdParam: CfnParameter;
  redshiftServerlessNamespaceIdParam: CfnParameter;
  redshiftServerlessIAMRoleParam: CfnParameter;
  redshiftClusterIdentifierParam: CfnParameter;
  redshiftDbUserParam: CfnParameter;
  loadJobScheduleIntervalParam: CfnParameter;
  maxFilesLimitParam: CfnParameter;
  processingFilesLimitParam: CfnParameter;
  upsertUsersWorkflowScheduleExpressionParam: CfnParameter;
}

export function createStackParameters(scope: Construct) {
  const redshiftModeParam = new CfnParameter(scope, 'RedshiftMode', {
    description: 'Select Redshift cluster mode',
    type: 'String',
    default: RedshiftMode.SERVERLESS,
    allowedValues: [RedshiftMode.SERVERLESS, RedshiftMode.PROVISIONED],
  });

  const networkProps = Parameters.createNetworkParameters(scope, false, SubnetParameterType.String);

  const { projectIdParam, appIdsParam } = Parameters.createProjectAndAppsParameters(scope, 'ProjectId', 'AppIds');

  const odsEventBucketParam = Parameters.createS3BucketParameter(scope, 'ODSEventBucket', {
    description: 'The S3 bucket name for ODS events.',
    allowedPattern: `^${S3_BUCKET_NAME_PATTERN}$`,
  });

  const odsEventBucketPrefixParam = Parameters.createS3PrefixParameter(scope, 'ODSEventPrefix', {
    description: 'The S3 prefix for ODS events.',
    default: '',
  });

  const sinkS3FileSuffixParam = new CfnParameter(scope, 'ODSEventFileSuffix', {
    description: 'The suffix of the ODS event files on S3 to be imported.',
    type: 'String',
    default: '.snappy.parquet',
  });

  const loadWorkflowBucketParam = Parameters.createS3BucketParameter(scope, 'LoadWorkflowBucket', {
    description: 'The S3 bucket name for the data of loading workflow.',
    allowedPattern: `^${S3_BUCKET_NAME_PATTERN}$`,
  });

  const loadWorkflowBucketPrefixParam = Parameters.createS3PrefixParameter(scope, 'LoadWorkflowBucketPrefix', {
    description: 'The S3 prefix for the data of loading workflow.',
    default: '',
  });

  new CfnRule(scope, 'S3BucketReadinessRule', {
    assertions: [
      {
        assert:
          Fn.conditionAnd(
            Fn.conditionNot(
              Fn.conditionEquals(odsEventBucketParam.valueAsString, ''),
            ),
            Fn.conditionNot(
              Fn.conditionEquals(odsEventBucketPrefixParam.valueAsString, ''),
            ),
            Fn.conditionNot(
              Fn.conditionEquals(loadWorkflowBucketParam.valueAsString, ''),
            ),
            Fn.conditionNot(
              Fn.conditionEquals(loadWorkflowBucketPrefixParam.valueAsString, ''),
            ),
          ),
        assertDescription:
          'ODSEventBucket, ODSEventPrefix, LoadWorkflowBucket and LoadWorkflowBucketPrefix cannot be empty.',
      },
    ],
  });

  // Set Redshift common parameters
  const redshiftDefaultDatabaseParam = new CfnParameter(scope, 'RedshiftDefaultDatabase', {
    description: 'The name of the default database in Redshift',
    type: 'String',
    default: 'dev',
    allowedPattern: '^[a-zA-Z_]{1,127}[^\s"]+$',
  });
  const redshiftCommonParamsGroup = [];
  redshiftCommonParamsGroup.push({
    Label: { default: 'Redshift Database' },
    Parameters: [
      redshiftDefaultDatabaseParam.logicalId,
    ],
  });
  // Set Redshift serverless parameters
  const redshiftServerlessParamsGroup = [];

  const redshiftServerlessWorkgroupNameParam = new CfnParameter(scope, 'RedshiftServerlessWorkgroupName', {
    description: 'The name of the workgroup in Redshift serverless.',
    type: 'String',
    default: 'default',
    allowedPattern: '^([a-z0-9-]{3,64})?$',
  });

  const redshiftServerlessWorkgroupIdParam = new CfnParameter(scope, 'RedshiftServerlessWorkgroupId', {
    description: '[Optional] The id of the workgroup in Redshift serverless. Please input it for least permission.',
    type: 'String',
    default: '',
    allowedPattern: '^([a-z0-9-]{24,})?$',
  });

  const redshiftServerlessNamespaceIdParam = new CfnParameter(scope, 'RedshiftServerlessNamespaceId', {
    description: 'The id of the namespace in Redshift serverless.',
    type: 'String',
    default: '',
    allowedPattern: '^([a-z0-9-]{24,})?$',
  });

  const redshiftServerlessIAMRoleParam = new CfnParameter(scope, 'RedshiftServerlessIAMRole', {
    description: 'The ARN of IAM role of Redshift serverless user with superuser privillege.',
    type: 'String',
    default: '',
    allowedPattern: '^(arn:(aws|aws-cn):iam::[0-9]{12}:role/.*)?$',
  });

  const redshiftServerlessParam = {
    redshiftServerlessNamespaceIdParam,
    redshiftServerlessWorkgroupNameParam,
    redshiftServerlessWorkgroupIdParam,
    redshiftServerlessIAMRoleParam,
  };

  redshiftServerlessParamsGroup.push({
    Label: { default: 'Redshift Serverless' },
    Parameters: [
      redshiftServerlessNamespaceIdParam.logicalId,
      redshiftServerlessWorkgroupNameParam.logicalId,
      redshiftServerlessWorkgroupIdParam.logicalId,
      redshiftServerlessIAMRoleParam.logicalId,
    ],
  });

  const redshiftServerlessParamsLabels = {
    [redshiftServerlessWorkgroupNameParam.logicalId]: {
      default: 'Workgroup Name',
    },
    [redshiftServerlessWorkgroupIdParam.logicalId]: {
      default: 'Workgroup Id',
    },
    [redshiftServerlessNamespaceIdParam.logicalId]: {
      default: 'Namespace Id',
    },
    [redshiftServerlessIAMRoleParam.logicalId]: {
      default: 'Role ARN',
    },
  };

  new CfnRule(scope, 'RedshiftServerlessParameters', {
    ruleCondition: Fn.conditionEquals(redshiftModeParam.valueAsString, RedshiftMode.SERVERLESS),
    assertions: [
      {
        assert: Fn.conditionAnd(
          Fn.conditionNot(
            Fn.conditionEquals(redshiftServerlessWorkgroupNameParam.valueAsString, ''),
          ),
          Fn.conditionNot(
            Fn.conditionEquals(redshiftServerlessIAMRoleParam.valueAsString, ''),
          ),
        ),
        assertDescription:
            'Namespace, Workgroup and Role Arn are required when using Redshift Serverless.',
      },
    ],
  });

  // Set Redshift cluster parameters
  const redshiftClusterParamsGroup = [];

  const redshiftClusterIdentifierParam = new CfnParameter(scope, 'RedshiftClusterIdentifier', {
    description: 'The cluster identifier of Redshift.',
    type: 'String',
    allowedPattern: '^([a-z0-9-]{1,63})?$',
    default: '',
  });

  const redshiftDbUserParam = new CfnParameter(scope, 'RedshiftDbUser', {
    description: 'The name of Redshift database user.',
    type: 'String',
    allowedPattern: '^([a-z0-9-]{1,63})?$',
    default: '',
  });

  const redshiftClusterParam = {
    redshiftClusterIdentifierParam,
    redshiftDbUserParam,
  };

  redshiftClusterParamsGroup.push({
    Label: { default: 'Provisioned Redshift Cluster' },
    Parameters: [
      redshiftClusterIdentifierParam.logicalId,
      redshiftDbUserParam.logicalId,
    ],
  });

  const redshiftClusterParamsLabels = {
    [redshiftClusterIdentifierParam.logicalId]: {
      default: 'Cluster Identifier',
    },
    [redshiftDbUserParam.logicalId]: {
      default: 'DB user',
    },
  };

  new CfnRule(scope, 'RedshiftProvisionedParameters', {
    ruleCondition: Fn.conditionEquals(redshiftModeParam.valueAsString, RedshiftMode.PROVISIONED),
    assertions: [
      {
        assert: Fn.conditionAnd(
          Fn.conditionNot(
            Fn.conditionEquals(redshiftClusterIdentifierParam.valueAsString, ''),
          ),
          Fn.conditionNot(
            Fn.conditionEquals(redshiftDbUserParam.valueAsString, ''),
          ),
        ),
        assertDescription:
            'ClusterIdentifier and DbUser are required when using Redshift Provisioned cluster.',
      },
    ],
  });

  // Set load job parameters
  const loadJobParamsGroup = [];

  const loadJobScheduleIntervalParam = new CfnParameter(scope, 'LoadJobScheduleInterval', {
    description: 'The time interval at which the loading job runs regularly, in minutes.',
    type: 'Number',
    default: 5,
  });

  const maxFilesLimitParam = new CfnParameter(scope, 'MaxFilesLimit', {
    description: 'Maximum number of files for each job fetched from the Dynamodb is not recommended to exceed 50.',
    type: 'Number',
    default: 50,
  });

  const processingFilesLimitParam = new CfnParameter(scope, 'ProcessingFilesLimit', {
    description: 'Maximum number of files currently being loaded, recommended to be twice the `MaxFilesLimit`.',
    type: 'Number',
    default: 100,
  });

  const loadJobParam = {
    loadJobScheduleIntervalParam,
    maxFilesLimitParam,
    processingFilesLimitParam,
  };

  loadJobParamsGroup.push({
    Label: { default: 'Load job' },
    Parameters: [
      loadJobScheduleIntervalParam.logicalId,
      maxFilesLimitParam.logicalId,
      processingFilesLimitParam.logicalId,
    ],
  });

  const loadJobParamsLabels = {
    [loadJobScheduleIntervalParam.logicalId]: {
      default: 'Load schedule interval',
    },
    [maxFilesLimitParam.logicalId]: {
      default: 'Maximum number of files',
    },
    [processingFilesLimitParam.logicalId]: {
      default: 'Maximum number of files currently being loaded',
    },
  };

  // Set upsert users job parameters
  const upsertUsersWorkflowParamsGroup = [];

  const upsertUsersWorkflowScheduleExpressionParam = new CfnParameter(scope, 'UpsertUsersScheduleExpression', {
    description: 'The schedule expression at which the upsert users job runs regularly. in days.',
    type: 'String',
    // allowedPattern: '^cron\\(([0-5]?[0-9])\\s([01]?[0-9]|2[0-3])\\s\\*\\s\\*\\s\\?\\s\\*\\)$',
    allowedPattern: '^cron\\((([0-5]?[0-9])|0/[0-5]?[0-9])\\s([01]?[0-9]|2[0-3]|\\*/([01]?[0-9]|2[0-3])|\\*)\\s\\*\\s\\*\\s\\?\\s\\*\\)$',
    constraintDescription: 'Must be in the format cron(minutes,hours,day-of-month,month,day-of-week,year), when the task should run at any time on everyday.',
    default: 'cron(0 1 * * ? *)',
  });

  const upsertUsersWorkflowParam = {
    upsertUsersWorkflowScheduleExpressionParam,
  };

  upsertUsersWorkflowParamsGroup.push({
    Label: { default: 'Upsert users job' },
    Parameters: [
      upsertUsersWorkflowScheduleExpressionParam.logicalId,
    ],
  });

  const upsertUsersWorkflowParamsLabels = {
    [upsertUsersWorkflowScheduleExpressionParam.logicalId]: {
      default: 'Upsert users schedule expression',
    },
  };

  const metadata = {
    'AWS::CloudFormation::Interface': {
      ParameterGroups: [
        {
          Label: { default: PARAMETER_GROUP_LABEL_VPC },
          Parameters: [
            networkProps.vpcId.logicalId,
            networkProps.privateSubnets.logicalId,
          ],
        },
        {
          Label: { default: 'Project ID' },
          Parameters: [
            projectIdParam.logicalId,
          ],
        },
        {
          Label: { default: 'App IDs' },
          Parameters: [
            appIdsParam.logicalId,
          ],
        },
        {
          Label: { default: 'S3 Information' },
          Parameters: [
            odsEventBucketParam.logicalId,
            odsEventBucketPrefixParam.logicalId,
            sinkS3FileSuffixParam.logicalId,
            loadWorkflowBucketParam.logicalId,
            loadWorkflowBucketPrefixParam.logicalId,
          ],
        },
        ...redshiftCommonParamsGroup,
        ...redshiftServerlessParamsGroup,
        ...redshiftClusterParamsGroup,
        ...loadJobParamsGroup,
        ...upsertUsersWorkflowParamsGroup,
      ],
      ParameterLabels: {
        [networkProps.vpcId.logicalId]: {
          default: PARAMETER_LABEL_VPCID,
        },
        [networkProps.privateSubnets.logicalId]: {
          default: PARAMETER_LABEL_PRIVATE_SUBNETS,
        },

        [projectIdParam.logicalId]: {
          default: 'Project Id',
        },
        [appIdsParam.logicalId]: {
          default: 'App Ids',
        },

        [odsEventBucketParam.logicalId]: {
          default: 'S3 bucket name for ODS Event',
        },
        [odsEventBucketPrefixParam.logicalId]: {
          default: 'S3 prefix for ODS Event',
        },
        [sinkS3FileSuffixParam.logicalId]: {
          default: 'File suffix for ODS Event',
        },
        [loadWorkflowBucketParam.logicalId]: {
          default: 'S3 bucket name for load workflow data',
        },
        [loadWorkflowBucketPrefixParam.logicalId]: {
          default: 'S3 prefix for load workflow data',
        },
        ...redshiftServerlessParamsLabels,
        ...redshiftClusterParamsLabels,
        ...loadJobParamsLabels,
        ...upsertUsersWorkflowParamsLabels,
      },
    },
  };
  return {
    metadata,
    params: {
      redshiftModeParam: redshiftModeParam,
      vpcIdParam: networkProps.vpcId,
      privateSubnetIdsParam: networkProps.privateSubnets,
      projectIdParam: projectIdParam,
      appIdsParam: appIdsParam,
      sinkS3BucketParam: odsEventBucketParam,
      sinkS3PrefixParam: odsEventBucketPrefixParam,
      sinkS3FileSuffixParam: sinkS3FileSuffixParam,
      loadTempBucketParam: loadWorkflowBucketParam,
      loadTempBucketPrefixParam: loadWorkflowBucketPrefixParam,
      redshiftDefaultDatabaseParam,
      ...redshiftServerlessParam,
      ...redshiftClusterParam,
      ...loadJobParam,
      ...upsertUsersWorkflowParam,
    },
  };
}