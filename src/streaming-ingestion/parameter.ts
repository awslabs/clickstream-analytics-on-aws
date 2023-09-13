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
import { S3_BUCKET_ARN_PATTERN } from './common/constant';
import {
  REDSHIFT_CLUSTER_IDENTIFIER_PATTERN,
  REDSHIFT_DB_USER_NAME_PATTERN,
  S3_BUCKET_NAME_PATTERN,
  SUBNETS_PATTERN,
} from '../common/constant';
import { REDSHIFT_MODE } from '../common/model';
import { Parameters, SubnetParameterType } from '../common/parameters';

export interface StreamingIngestionStackProps {
  projectId: string;
  appIds: string;
  streamingIngestionConfiguration: {
    streamingIngestionRoleArn: string;
  };
  kinesis: {
    mode: string;
    shardCount: number;
    dataRetentionHours: number;
  };
  pipeline: {
    kinesisSourceStreamName: string;
    parallelism: number;
    parallelismPerKPU: number;
    applicationCodeBucketARN: string;
    applicationCodeBucketPrefix: string;
    securityGroupIds: string;
    subnetIds: string;
    bucket: {
      name: string;
      prefix: string;
    };
  };
  redshift: {
    mode: string;
    defaultDatabaseName: string;
    iamRole: string;
    existingServerless?: {
      workgroupName: string;
      workgroupId?: string;
      namespaceId?: string;
    };
    provisioned?: {
      clusterIdentifier: string;
      dbUser: string;
    };
    associateRoleTimeout: number;
  };
}

export function createStackParameters(scope: Construct): {
  metadata: {
    [key: string]: any;
  };
  params: StreamingIngestionStackProps;
} {

  const kinesisStreamModeParam = new CfnParameter(scope, 'KinesisStreamMode', {
    description: 'Kinesis Data Stream mode',
    type: 'String',
    allowedValues: ['ON_DEMAND', 'PROVISIONED'],
    default: 'ON_DEMAND',
  });

  const kinesisShardCountParam = new CfnParameter(scope, 'KinesisShardCount', {
    description:
    'Number of Kinesis Data Stream shards, only apply for Provisioned mode',
    type: 'Number',
    default: '3',
    minValue: 1,
  });

  const kinesisDataRetentionHoursParam = new CfnParameter(
    scope,
    'KinesisDataRetentionHours',
    {
      description: 'Data retention hours in Kinesis Data Stream, from 24 hours by default, up to 8760 hours (365 days)',
      type: 'Number',
      default: '24',
      minValue: 24,
      maxValue: 8760,
    },
  );

  const kinesisParamsGroup = [];
  kinesisParamsGroup.push({
    Label: { default: 'Kinesis Data Stream' },
    Parameters: [
      kinesisStreamModeParam.logicalId,
      kinesisShardCountParam.logicalId,
      kinesisDataRetentionHoursParam.logicalId,
    ],
  });

  const kinesisParamsLabels = {
    [ kinesisStreamModeParam.logicalId]: {
      default: 'Stream mode',
    },

    [ kinesisShardCountParam.logicalId]: {
      default: 'Shards number',
    },

    [ kinesisDataRetentionHoursParam.logicalId]: {
      default: 'Data retention hours',
    },
  };


  const kinesisSourceStreamParam = new CfnParameter(scope, 'KinesisSourceStream', {
    description: 'The name of Kinesis Data Stream used for streaming ingestion source.',
    type: 'String',
  });


  const streamingIngestionConfigurationParamsGroup = [];
  streamingIngestionConfigurationParamsGroup.push({
    Label: { default: 'Kinesis Data Stream' },
    Parameters: [
      kinesisSourceStreamParam.logicalId,
    ],
  });

  const streamingIngestionConfigurationParamsLabels = {
    [kinesisSourceStreamParam.logicalId]: {
      default: 'The name of Kinesis Data Stream',
    },
  };

  const parallelismParam = new CfnParameter(scope, 'Parallelism', {
    description:
    'Number of Flink application parallelism.',
    type: 'Number',
    default: '0',
    minValue: 0,
  });

  const parallelismPerKPUParam = new CfnParameter(scope, 'ParallelismPerKPU', {
    description:
    'Number of Flink application parallelism Per KPU.',
    type: 'Number',
    default: '4',
    minValue: 1,
  });

  const applicationCodeBucketARNParam = Parameters.createS3BucketParameter(scope, 'ApplicationCodeBucketARN', {
    description: 'The S3 bucket ARN for Flink application code.',
    allowedPattern: `^${S3_BUCKET_ARN_PATTERN}$`,
  });

  const applicationCodeBucketPrefixParam = Parameters.createS3PrefixParameter(scope, 'ApplicationCodeBucketPrefix', {
    description: 'S3 object prefix to save the flink application file',
    default: 'clickstream/project1/data/flink-etl/',
  });

  const securityGroupIdParam = Parameters.createSecurityGroupIdsParameter(scope, 'FlinkSecurityGroup', true, {
    description: 'Choose security groups for Flink application',
    default: '',
  });

  const subnetsPattern = `(^${SUBNETS_PATTERN}$)?`;
  const subnetIdsParam = Parameters.createPrivateSubnetParameter(scope, 'FlinkSubnets',
    SubnetParameterType.String, {
      allowedPattern: subnetsPattern,
      constraintDescription: `The subnets of Flink application match pattern ${subnetsPattern}`,
      default: '',
    });

  const pipelineS3BucketParam = Parameters.createS3BucketParameter(scope, 'PipelineS3Bucket', {
    description: 'Pipeline S3 bucket name in which to save temporary result',
    allowedPattern: `^${S3_BUCKET_NAME_PATTERN}$`,
  });

  const pipelineS3PrefixParam = Parameters.createS3PrefixParameter(scope, 'PipelineS3Prefix', {
    description: 'Pipeline S3 prefix',
    default: 'pipeline-temp/',
  });

  // Set pipeline parameters
  const pipelineParamsGroup = [];
  pipelineParamsGroup.push({
    Label: { default: 'Specify pipeline parameters' },
    Parameters: [
      parallelismParam.logicalId,
      parallelismPerKPUParam.logicalId,
      applicationCodeBucketARNParam.logicalId,
      applicationCodeBucketPrefixParam.logicalId,
      securityGroupIdParam.logicalId,
      subnetIdsParam.logicalId,
      pipelineS3BucketParam.logicalId,
      pipelineS3PrefixParam.logicalId,
    ],
  });

  const pipelineParamsLabels = {
    [parallelismParam.logicalId]: {
      default: 'Number of Flink application parallelism',
    },
    [parallelismPerKPUParam.logicalId]: {
      default: 'Number of Flink application parallelism Per KPU',
    },
    [applicationCodeBucketARNParam.logicalId]: {
      default: 'The S3 bucket ARN for Flink application code',
    },
    [applicationCodeBucketPrefixParam.logicalId]: {
      default: 'The S3 prefix name for Flink application code',
    },
    [securityGroupIdParam.logicalId]: {
      default: 'Choose security groups for Flink application',
    },
    [subnetIdsParam.logicalId]: {
      default: 'The subnets of Flink application',
    },
  };

  const redshiftModeParam = Parameters.createRedshiftModeParameter(scope, 'RedshiftMode');

  // Set Redshift common parameters
  const redshiftDefaultDatabaseParam = new CfnParameter(scope, 'RedshiftDefaultDatabase', {
    description: 'The name of the default database in Redshift',
    type: 'String',
    default: 'dev',
    allowedPattern: '^[a-zA-Z_]{1,127}[^\s"]+$',
  });

  const associateRoleTimeoutParam = new CfnParameter(scope, 'AssociateRoleTimeout', {
    description: 'Redshift associate role operation timeout.',
    constraintDescription: 'Range must be 50-600 in increments of 5.',
    type: 'Number',
    default: 120,
    maxValue: 600,
    minValue: 50,
  });

  const redshiftCommonParamsGroup = [];
  redshiftCommonParamsGroup.push({
    Label: { default: 'Redshift Database' },
    Parameters: [
      redshiftDefaultDatabaseParam.logicalId,
      associateRoleTimeoutParam.logicalId,
    ],
  });

  const { projectIdParam, appIdsParam } = Parameters.createProjectAndAppsParameters(scope, 'ProjectId', 'AppIds');

  // Set existing Redshift serverless parameters
  const existingRedshiftServerlessParamsGroup = [];

  const redshiftServerlessWorkgroupNameParam = createWorkgroupParameter(scope, 'RedshiftServerlessWorkgroupName');

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

  const redshiftIAMRoleParam = new CfnParameter(scope, 'RedshiftIAMRole', {
    description: 'The ARN of IAM role of Redshift serverless/provisioned user with superuser privilege.',
    type: 'String',
    default: '',
    allowedPattern: '^(arn:(aws|aws-cn):iam::[0-9]{12}:role/.*)?$',
  });

  existingRedshiftServerlessParamsGroup.push({
    Label: { default: 'Specify existing Redshift Serverless' },
    Parameters: [
      redshiftServerlessNamespaceIdParam.logicalId,
      redshiftServerlessWorkgroupNameParam.logicalId,
      redshiftServerlessWorkgroupIdParam.logicalId,
      redshiftIAMRoleParam.logicalId,
    ],
  });

  const existingRedshiftServerlessParamsLabels = {
    [redshiftServerlessWorkgroupNameParam.logicalId]: {
      default: 'Workgroup Name',
    },
    [redshiftServerlessWorkgroupIdParam.logicalId]: {
      default: 'Workgroup Id',
    },
    [redshiftServerlessNamespaceIdParam.logicalId]: {
      default: 'Namespace Id',
    },
    [redshiftIAMRoleParam.logicalId]: {
      default: 'Role ARN',
    },
  };

  new CfnRule(scope, 'ExistingRedshiftServerlessParameters', {
    ruleCondition: Fn.conditionEquals(redshiftModeParam.valueAsString, REDSHIFT_MODE.SERVERLESS),
    assertions: [
      {
        assert: Fn.conditionAnd(
          Fn.conditionNot(
            Fn.conditionEquals(redshiftServerlessWorkgroupNameParam.valueAsString, ''),
          ),
          Fn.conditionNot(
            Fn.conditionEquals(redshiftIAMRoleParam.valueAsString, ''),
          ),
        ),
        assertDescription:
            'Namespace, Workgroup and Role Arn are required for using existing Redshift Serverless.',
      },
    ],
  });

  // Set Redshift cluster parameters
  const redshiftClusterParamsGroup = [];

  const redshiftClusterIdentifierParam = new CfnParameter(scope, 'RedshiftClusterIdentifier', {
    description: 'The cluster identifier of Redshift.',
    type: 'String',
    allowedPattern: REDSHIFT_CLUSTER_IDENTIFIER_PATTERN,
    default: '',
  });

  const redshiftDbUserParam = new CfnParameter(scope, 'RedshiftDbUser', {
    description: 'The name of Redshift database user.',
    type: 'String',
    allowedPattern: REDSHIFT_DB_USER_NAME_PATTERN,
    default: '',
  });

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
    ruleCondition: Fn.conditionEquals(redshiftModeParam.valueAsString, REDSHIFT_MODE.PROVISIONED),
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

  const metadata = {
    'AWS::CloudFormation::Interface': {
      ParameterGroups: [
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
        ...kinesisParamsGroup,
        ...pipelineParamsGroup,
        ...streamingIngestionConfigurationParamsGroup,
        ...redshiftCommonParamsGroup,
        ...existingRedshiftServerlessParamsGroup,
        ...redshiftClusterParamsGroup,
      ],
      ParameterLabels: {
        [projectIdParam.logicalId]: {
          default: 'Project Id',
        },
        [appIdsParam.logicalId]: {
          default: 'App Ids',
        },
        ...kinesisParamsLabels,
        ...pipelineParamsLabels,
        ...streamingIngestionConfigurationParamsLabels,
        ...existingRedshiftServerlessParamsLabels,
        ...redshiftClusterParamsLabels,
        [associateRoleTimeoutParam.logicalId]: {
          default: 'Redshift associate role operation timeout',
        },
      },
    },
  };
  return {
    metadata,
    params: {
      projectId: projectIdParam.valueAsString,
      appIds: appIdsParam.valueAsString,
      streamingIngestionConfiguration: {
        streamingIngestionRoleArn: '',
      },
      kinesis: {
        mode: kinesisStreamModeParam.valueAsString,
        shardCount: kinesisShardCountParam.valueAsNumber,
        dataRetentionHours: kinesisDataRetentionHoursParam.valueAsNumber,
      },
      pipeline: {
        kinesisSourceStreamName: kinesisSourceStreamParam.valueAsString,
        parallelism: parallelismParam.valueAsNumber,
        parallelismPerKPU: parallelismPerKPUParam.valueAsNumber,
        applicationCodeBucketARN: applicationCodeBucketARNParam.valueAsString,
        applicationCodeBucketPrefix: applicationCodeBucketPrefixParam.valueAsString,
        securityGroupIds: securityGroupIdParam.valueAsString,
        subnetIds: subnetIdsParam.valueAsString,
        bucket: {
          name: pipelineS3BucketParam.valueAsString,
          prefix: pipelineS3PrefixParam.valueAsString,
        },
      },
      redshift: {
        mode: redshiftModeParam.valueAsString,
        defaultDatabaseName: redshiftDefaultDatabaseParam.valueAsString,
        iamRole: redshiftIAMRoleParam.valueAsString,
        existingServerless: {
          workgroupName: redshiftServerlessWorkgroupNameParam.valueAsString,
          workgroupId: redshiftServerlessWorkgroupIdParam.valueAsString,
          namespaceId: redshiftServerlessNamespaceIdParam.valueAsString,
        },
        provisioned: {
          dbUser: redshiftDbUserParam.valueAsString,
          clusterIdentifier: redshiftClusterIdentifierParam.valueAsString,
        },
        associateRoleTimeout: associateRoleTimeoutParam.valueAsNumber,
      },
    },
  };
}

function createWorkgroupParameter(scope: Construct, id: string): CfnParameter {
  return new CfnParameter(scope, id, {
    description: 'The name of the Redshift serverless workgroup.',
    type: 'String',
    default: 'default',
    allowedPattern: '^([a-z0-9-]{3,64})?$',
  });
}