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
import {
  PARAMETER_GROUP_LABEL_VPC, PARAMETER_LABEL_PRIVATE_SUBNETS, PARAMETER_LABEL_VPCID,
  S3_BUCKET_NAME_PATTERN, SCHEDULE_EXPRESSION_PATTERN, SUBNETS_THREE_AZ_PATTERN, VPC_ID_PATTERN,
  DDB_TABLE_ARN_PATTERN,
  TABLE_NAME_EVENT_V2,
  TABLE_NAME_SESSION,
  TABLE_NAME_USER_V2,
  TABLE_NAME_ITEM_V2,
} from '@aws/clickstream-base-lib';
import { CfnParameter, CfnResource, CfnRule, CustomResource, Duration, Fn } from 'aws-cdk-lib';
import { ITable, Table } from 'aws-cdk-lib/aws-dynamodb';
import { IVpc, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { GetResourcePrefixPropertiesType } from './lambdas/custom-resource/get-source-prefix';
import { addCfnNagSuppressRules, rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions } from '../common/cfn-nag';
import { createLambdaRole } from '../common/lambda';
import { REDSHIFT_MODE } from '../common/model';
import { Parameters, SubnetParameterType } from '../common/parameters';
import { getExistVpc } from '../common/vpc-utils';
import { SolutionNodejsFunction } from '../private/function';

export interface RedshiftAnalyticsStackProps {
  network: {
    vpc: IVpc;
    subnetSelection: SubnetSelection;
  };
  projectId: string;
  appIds: string;
  dataProcessingCronOrRateExpression: string;
  dataFreshnessInHour: number;
  refreshReportDays: number;
  timezoneWithAppId: string;
  dataSourceConfiguration: {
    bucket: IBucket;
    prefix: string;
    fileSuffix: string;
    emrServerlessApplicationId: string;
  };
  loadConfiguration: {
    workdir: {
      bucket: IBucket;
      prefix: string;
    };
    loadJobScheduleIntervalInMinutes: string;
    maxFilesLimit: number;
    processingFilesLimit: number;
  };
  scanMetadataConfiguration: {
    clickstreamAnalyticsMetadataDdbArn: string;
    topFrequentPropertiesLimit: string;
    scanWorkflowMinInterval: string;
    pipelineS3Bucket: string;
    pipelineS3Prefix: string;
  };
  clearExpiredEventsConfiguration: {
    scheduleExpression: string;
    retentionRangeDays: number;
  };
  redshift: {
    mode: string;
    defaultDatabaseName: string;
    mvRefreshInterval: number;
    newServerless?: {
      vpcId: string;
      subnetIds: string;
      securityGroupIds: string;
      workgroupName: string;
      baseCapacity: number;
    };
    existingServerless?: {
      workgroupName: string;
      workgroupId?: string;
      namespaceId?: string;
      iamRole: string;
    };
    provisioned?: {
      clusterIdentifier: string;
      dbUser: string;
    };
  };
  clickstreamMetadataDdbTable: ITable;
  segmentsS3Prefix: string;
}

export interface AthenaAnalyticsStackProps {
  readonly database: string;
  readonly workGroup: string;
  readonly eventTable: string;
  readonly sessionTable: string;
  readonly userTable: string;
  readonly itemTable: string;
}

export function createAthenaStackParameters(scope: Construct): {
  metadata: {
    [key: string]: any;
  };
  params: AthenaAnalyticsStackProps;
} {
  // Set athena parameters
  const athenaParamsGroup = [];

  const athenaWorkGroupParam = new CfnParameter(scope, 'AthenaWorkGroup', {
    description: 'The Athena workgroup name.',
    type: 'String',
    default: 'primary',
  });

  const athenaDatabaseParam = new CfnParameter(scope, 'AthenaDatabase', {
    description: 'The Athena database name.',
    type: 'String',
  });

  const athenaEventTableParam = new CfnParameter(scope, 'AthenaEventTable', {
    description: 'The Athena event table name.',
    type: 'String',
    default: TABLE_NAME_EVENT_V2,
  });

  const athenaSessionTableParam = new CfnParameter(scope, 'AthenaSessionTable', {
    description: 'The Athena session table name.',
    type: 'String',
    default: TABLE_NAME_SESSION,
  });

  const athenaUserTableParam = new CfnParameter(scope, 'AthenaUserTable', {
    description: 'The Athena user table name.',
    type: 'String',
    default: TABLE_NAME_USER_V2,
  });

  const athenaItemTableParam = new CfnParameter(scope, 'AthenaItemTable', {
    description: 'The Athena item table name.',
    type: 'String',
    default: TABLE_NAME_ITEM_V2,
  });

  athenaParamsGroup.push({
    Label: { default: 'Athena Information' },
    Parameters: [
      athenaWorkGroupParam.logicalId,
      athenaDatabaseParam.logicalId,
      athenaEventTableParam.logicalId,
      athenaSessionTableParam.logicalId,
      athenaUserTableParam.logicalId,
      athenaItemTableParam.logicalId,
    ],
  });

  const athenaWorkGroupParamsLabels = {
    [athenaWorkGroupParam.logicalId]: {
      default: 'Athena Workgroup Name',
    },
  };

  const athenaDatabaseParamsLabels = {
    [athenaDatabaseParam.logicalId]: {
      default: 'Athena Database Name',
    },
  };

  const athenaEventTableParamsLabels = {
    [athenaEventTableParam.logicalId]: {
      default: 'Athena Event Table Name',
    },
  };

  const athenaSessionTableParamsLabels = {
    [athenaSessionTableParam.logicalId]: {
      default: 'Athena Session Table Name',
    },
  };

  const athenaUserTableParamsLabels = {
    [athenaUserTableParam.logicalId]: {
      default: 'Athena User Table Name',
    },
  };

  const athenaItemTableParamsLabels = {
    [athenaItemTableParam.logicalId]: {
      default: 'Athena Item Table Name',
    },
  };

  const metadata = {
    'AWS::CloudFormation::Interface': {
      ParameterGroups: [
        ...athenaParamsGroup,
      ],
      ParameterLabels: {
        ...athenaDatabaseParamsLabels,
        ...athenaWorkGroupParamsLabels,
        ...athenaEventTableParamsLabels,
        ...athenaSessionTableParamsLabels,
        ...athenaUserTableParamsLabels,
        ...athenaItemTableParamsLabels,
      },
    },
  };

  return {
    metadata,
    params: {
      database: athenaDatabaseParam.valueAsString,
      workGroup: athenaWorkGroupParam.valueAsString,
      eventTable: athenaEventTableParam.valueAsString,
      sessionTable: athenaSessionTableParam.valueAsString,
      userTable: athenaUserTableParam.valueAsString,
      itemTable: athenaItemTableParam.valueAsString,
    },
  };

}

export function createStackParameters(scope: Construct): {
  metadata: {
    [key: string]: any;
  };
  params: RedshiftAnalyticsStackProps;
} {
  const redshiftModeParam = Parameters.createRedshiftModeParameter(scope, 'RedshiftMode');

  const networkProps = Parameters.createNetworkParameters(scope, false, SubnetParameterType.String);

  const { projectIdParam, appIdsParam } = Parameters.createProjectAndAppsParameters(scope, 'ProjectId', 'AppIds');

  const odsEventBucketParam = Parameters.createS3BucketParameter(scope, 'ODSEventBucket', {
    description: 'The S3 bucket name for ODS data files.',
    allowedPattern: `^${S3_BUCKET_NAME_PATTERN}$`,
  });

  const odsEventBucketPrefixParam = Parameters.createS3PrefixParameter(scope, 'ODSEventPrefix', {
    description: 'The S3 prefix for ODS data files.',
    default: '',
  });

  const emrServerlessApplicationIdParam = new CfnParameter(scope, 'EMRServerlessApplicationId', {
    description: 'EMR Serverless Application Id',
    type: 'String',
    default: '',
  });

  const odsEventFileSuffixParam = new CfnParameter(scope, 'ODSEventFileSuffix', {
    description: 'The suffix of the ODS data files on S3 to be imported.',
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

  const pipelineS3BucketParam = Parameters.createS3BucketParameter(scope, 'PipelineS3Bucket', {
    description: 'Pipeline S3 bucket name in which to save temporary result',
    allowedPattern: `^${S3_BUCKET_NAME_PATTERN}$`,
  });

  const pipelineS3PrefixParam = Parameters.createS3PrefixParameter(scope, 'PipelineS3Prefix', {
    description: 'Pipeline S3 prefix',
    default: 'pipeline-temp/',
  });

  const segmentsS3PrefixParam = Parameters.createS3PrefixParameter(scope, 'SegmentsS3Prefix', {
    description: 'Segments S3 prefix',
    default: 'segments/',
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
            Fn.conditionNot(
              Fn.conditionEquals(pipelineS3BucketParam.valueAsString, ''),
            ),
            Fn.conditionNot(
              Fn.conditionEquals(pipelineS3PrefixParam.valueAsString, ''),
            ),
            Fn.conditionNot(
              Fn.conditionEquals(segmentsS3PrefixParam.valueAsString, ''),
            ),
          ),
        assertDescription:
          'ODSEventBucket, ODSEventPrefix, LoadWorkflowBucket, LoadWorkflowBucketPrefix, pipelineS3Bucket, pipelineS3Prefix and segmentsS3Prefix cannot be empty.',
      },
    ],
  }).overrideLogicalId('S3BucketReadinessRule');

  // Set Redshift common parameters
  const { redshiftDefaultDatabaseParam } = Parameters.createRedshiftCommonParameters(scope);

  const mvRefreshIntervalParam = new CfnParameter(scope, 'MVRefreshInterval', {
    description: 'The interval of refresh redshift materialized views in minutes',
    type: 'Number',
    default: 120,
    minValue: 6,
    maxValue: 1440,
  });

  const redshiftCommonParamsGroup = [];
  redshiftCommonParamsGroup.push({
    Label: { default: 'Redshift Default Database Name' },
    Parameters: [
      redshiftDefaultDatabaseParam.logicalId,
      mvRefreshIntervalParam.logicalId,
    ],
  });

  const redshiftCommonParamsLabels = {
    [redshiftDefaultDatabaseParam.logicalId]: {
      default: 'Redshift Default Database',
    },
    [mvRefreshIntervalParam.logicalId]: {
      default: 'Materialized View Refresh Interval',
    },
  };

  // Set new Redshift serverless parameters
  const redshiftServerlessWorkgroupName = Parameters.createRedshiftWorkgroupParameter(scope, 'NewRedshiftServerlessWorkgroupName');
  const redshiftServerlessRPU = new CfnParameter(scope, 'RedshiftServerlessRPU', {
    description: 'Redshift processing units (RPUs) used to process your workload.',
    constraintDescription: 'Range must be 8-512 in increments of 8.',
    type: 'Number',
    default: 16,
    maxValue: 512,
    minValue: 8,
  });
  const redshiftServerlessVPCId = Parameters.createVpcIdParameter(scope, 'RedshiftServerlessVPCId', {
    allowedPattern: `(${VPC_ID_PATTERN})?`,
    default: '',
    type: 'String',
  });
  const subnetsPattern = `(^${SUBNETS_THREE_AZ_PATTERN}$)?`;
  const redshiftServerlessSubnets = Parameters.createPrivateSubnetParameter(scope, 'RedshiftServerlessSubnets',
    SubnetParameterType.String, {
      allowedPattern: subnetsPattern,
      constraintDescription: `The subnets of Redshift Serverless workgroup must have at least three subnets crossing three AZs and match pattern ${subnetsPattern}`,
      default: '',
    });
  const redshiftServerlessSGs = Parameters.createSecurityGroupIdsParameter(scope, 'RedshiftServerlessSGs', true, {
    description: 'Choose security groups for Redshift Serverless workgroup',
    default: '',
  });
  const redshiftServerlessParamsGroup = [{
    Label: { default: 'Provision new Redshift Serverless' },
    Parameters: [
      redshiftServerlessWorkgroupName.logicalId,
      redshiftServerlessVPCId.logicalId,
      redshiftServerlessSubnets.logicalId,
      redshiftServerlessSGs.logicalId,
      redshiftServerlessRPU.logicalId,
    ],
  }];

  const redshiftServerlessParamsLabels = {
    [redshiftServerlessWorkgroupName.logicalId]: {
      default: 'Workgroup Name',
    },
    [redshiftServerlessVPCId.logicalId]: {
      default: 'Redshift Serverless VPC Id',
    },
    [redshiftServerlessSubnets.logicalId]: {
      default: 'Redshift Serverless subnets',
    },
    [redshiftServerlessSGs.logicalId]: {
      default: 'Redshift Serverless security groups',
    },
    [redshiftServerlessRPU.logicalId]: {
      default: 'Redshift Serverless RPU capacity',
    },
  };

  new CfnRule(scope, 'NewRedshiftServerlessParameters', {
    ruleCondition: Fn.conditionEquals(redshiftModeParam.valueAsString, REDSHIFT_MODE.NEW_SERVERLESS),
    assertions: [
      {
        assert: Fn.conditionAnd(
          Fn.conditionNot(
            Fn.conditionEquals(redshiftServerlessWorkgroupName.valueAsString, ''),
          ),
          Fn.conditionNot(
            Fn.conditionEquals(redshiftServerlessVPCId.valueAsString, ''),
          ),
          Fn.conditionNot(
            Fn.conditionEquals(redshiftServerlessSubnets.valueAsString, ''),
          ),
          Fn.conditionNot(
            Fn.conditionEquals(redshiftServerlessSGs.valueAsString, ''),
          ),
        ),
        assertDescription:
            'Workgroup, VpcID, Subnets, and Security groups are required for provisioning new Redshift Serverless.',
      },
      {
        assert: Fn.conditionEachMemberIn(Fn.valueOfAll('AWS::EC2::Subnet::Id', 'VpcId'), Fn.refAll('AWS::EC2::VPC::Id')),
        assertDescription:
          'All subnets of Redshift Serverless must be in the VPC',
      },
    ],
  }).overrideLogicalId('NewRedshiftServerlessParameters');

  // Set existing Redshift serverless parameters
  const existingRedshiftServerlessParamsGroup = [];

  const redshiftServerlessWorkgroupNameParam = Parameters.createRedshiftWorkgroupParameter(scope, 'RedshiftServerlessWorkgroupName');

  const { redshiftServerlessWorkgroupIdParam, redshiftServerlessNamespaceIdParam } =
    Parameters.createRedshiftServerlessWorkgroupAndNamespaceParameters(scope);

  const redshiftServerlessIAMRoleParam = Parameters.createRedshiftServerlessDataRoleParameter(scope);

  existingRedshiftServerlessParamsGroup.push({
    Label: { default: 'Specify existing Redshift Serverless' },
    Parameters: [
      redshiftServerlessNamespaceIdParam.logicalId,
      redshiftServerlessWorkgroupNameParam.logicalId,
      redshiftServerlessWorkgroupIdParam.logicalId,
      redshiftServerlessIAMRoleParam.logicalId,
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
    [redshiftServerlessIAMRoleParam.logicalId]: {
      default: 'Role ARN',
    },
  };

  Parameters.createRedshiftServerlessParametersRule(scope, {
    redshiftModeParam,
    redshiftServerlessWorkgroupNameParam,
    redshiftDataAPIRoleParam: redshiftServerlessIAMRoleParam,
  });

  // Set Redshift cluster parameters
  const redshiftClusterParamsGroup = [];

  const { redshiftClusterIdentifierParam, redshiftDbUserParam } = Parameters.createProvisionedRedshiftParameters(scope);

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

  // Set load job parameters
  const loadJobParamsGroup = [];

  const loadJobScheduleIntervalParam = new CfnParameter(scope, 'LoadJobScheduleInterval', {
    description: 'The time interval of cron(minutes,hours,day-of-month,month,day-of-week,year) or rate(value unit) at which the loading job runs regularly, in minutes.',
    type: 'String',
    allowedPattern: SCHEDULE_EXPRESSION_PATTERN,
    default: 'rate(5 minutes)',
  });

  const maxFilesLimitParam = new CfnParameter(scope, 'MaxFilesLimit', {
    description: 'Maximum number of files for each job fetched from the Dynamodb is not recommended to exceed 50.',
    type: 'Number',
    default: 50,
  });

  const processingFilesLimitParam = new CfnParameter(scope, 'ProcessingFilesLimit', {
    description: 'Maximum number of files currently being loaded, recommended to be twice the `MaxFilesLimit`.(Deprecated)',
    type: 'Number',
    default: 100,
  });

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
    description: 'The schedule expression at which the upsert users job runs regularly. in days(deprecated).',
    type: 'String',
    allowedPattern: SCHEDULE_EXPRESSION_PATTERN,
    constraintDescription: 'Must be in the format cron(minutes,hours,day-of-month,month,day-of-week,year), when the task should run at any time on everyday.',
    default: 'cron(0 1 * * ? *)',
  });

  upsertUsersWorkflowParamsGroup.push({
    Label: { default: 'Upsert users job(deprecated)' },
    Parameters: [
      upsertUsersWorkflowScheduleExpressionParam.logicalId,
    ],
  });

  const upsertUsersWorkflowParamsLabels = {
    [upsertUsersWorkflowScheduleExpressionParam.logicalId]: {
      default: 'Upsert users schedule expression(deprecated)',
    },
  };

  // Set scan metadata job parameters
  const scanMetadataWorkflowParamsGroup = [];

  const clickstreamAnalyticsMetadataDdbArnParam = new CfnParameter(scope, 'ClickstreamAnalyticsMetadataDdbArn', {
    description: 'The arn of ClickstreamAnalyticsMetadata Dynamodb table.',
    type: 'String',
    allowedPattern: DDB_TABLE_ARN_PATTERN,
  });

  const clickstreamMetadataDdbArnParam = Parameters.createClickstreamMetadataDdbArnParameter(scope);

  const topFrequentPropertiesLimitParam = new CfnParameter(scope, 'TopFrequentPropertiesLimit', {
    description: 'The number of top property values that get from ods event table.',
    type: 'Number',
    default: 20,
  });

  const scanWorkflowMinIntervalParam = new CfnParameter(scope, 'ScanWorkflowMinInterval', {
    description: 'The minimum interval minutes of scan workflow execution (Default 1 day)',
    type: 'Number',
    default: '1440',
    minValue: 60,
  });

  scanMetadataWorkflowParamsGroup.push({
    Label: { default: 'Scan metadata job' },
    Parameters: [
      clickstreamAnalyticsMetadataDdbArnParam.logicalId,
      topFrequentPropertiesLimitParam.logicalId,
      scanWorkflowMinIntervalParam.logicalId,
      pipelineS3BucketParam.logicalId,
      pipelineS3PrefixParam.logicalId,
    ],
  });

  const scanMetadataWorkflowParamsLabels = {
    [clickstreamAnalyticsMetadataDdbArnParam.logicalId]: {
      default: 'Scan metadata dynamodb table arn',
    },
    [topFrequentPropertiesLimitParam.logicalId]: {
      default: 'The number of top property values',
    },
    [scanWorkflowMinIntervalParam.logicalId]: {
      default: 'The minimum interval minutes of scan workflow execution (Default 1 day)',
    },
    [pipelineS3BucketParam.logicalId]: {
      default: 'Pipeline S3 bucket name',
    },
    [pipelineS3PrefixParam.logicalId]: {
      default: 'Pipeline S3 prefix',
    },
  };

  // Set clear expired events job parameters
  const clearExpiredEventsWorkflowParamsGroup = [];

  const clearExpiredEventsWorkflowScheduleExpressionParam = new CfnParameter(scope, 'ClearExpiredEventsScheduleExpression', {
    description: 'The schedule expression at which the clear expired events job runs regularly. in days.',
    type: 'String',
    allowedPattern: SCHEDULE_EXPRESSION_PATTERN,
    constraintDescription: 'Must be in the format cron(minutes,hours,day-of-month,month,day-of-week,year), when the task should run at any time on everyday.',
    default: 'cron(0 17 * * ? *)',
  });

  const clearExpiredEventsWorkflowRetentionRangeDaysParam = new CfnParameter(scope, 'ClearExpiredEventsRetentionRangeDays', {
    description: 'The period of time which records saved in Redshift. in days.',
    type: 'Number',
    default: 365,
  });

  const dataFreshnessInHourParam = Parameters.createDataFreshnessInHourParameter(scope, 24);

  const refreshReportDaysParam = new CfnParameter(scope, 'RefreshReportDays', {
    description: 'Refresh report data in day, default is 1 day',
    default: 1,
    type: 'Number',
  });

  const timezoneWithAppIdParam = new CfnParameter(scope, 'TimeZoneWithAppId', {
    description: 'The time zone with app id as json string',
    type: 'String',
    default: '[]',
  });

  const dataProcessingCronOrRateExpressionParam = new CfnParameter(scope, 'DataProcessingCronOrRateExpression', {
    description: 'The schedule expression of data processing.',
    type: 'String',
    allowedPattern: SCHEDULE_EXPRESSION_PATTERN,
    constraintDescription: 'Must be in the format cron(minutes,hours,day-of-month,month,day-of-week,year) or rate(N seconds|minutes|hours|days|months|years)',
    default: 'rate(1 hour)',
  });

  clearExpiredEventsWorkflowParamsGroup.push({
    Label: { default: 'Clear expired events job' },
    Parameters: [
      clearExpiredEventsWorkflowScheduleExpressionParam.logicalId,
      clearExpiredEventsWorkflowRetentionRangeDaysParam.logicalId,
    ],
  });

  const clearExpiredEventsWorkflowParamsLabels = {
    [clearExpiredEventsWorkflowScheduleExpressionParam.logicalId]: {
      default: 'Clear expired events schedule expression',
    },
    [clearExpiredEventsWorkflowRetentionRangeDaysParam.logicalId]: {
      default: 'Clear expired events retention range days',
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
          Label: { default: 'EMR Serverless Application Id' },
          Parameters: [
            emrServerlessApplicationIdParam.logicalId,
          ],
        },

        {
          Label: { default: 'S3 Information' },
          Parameters: [
            odsEventBucketParam.logicalId,
            odsEventBucketPrefixParam.logicalId,
            odsEventFileSuffixParam.logicalId,
            loadWorkflowBucketParam.logicalId,
            loadWorkflowBucketPrefixParam.logicalId,
          ],
        },
        ...redshiftCommonParamsGroup,
        ...redshiftServerlessParamsGroup,
        ...existingRedshiftServerlessParamsGroup,
        ...redshiftClusterParamsGroup,
        ...loadJobParamsGroup,
        ...upsertUsersWorkflowParamsGroup,
        ...scanMetadataWorkflowParamsGroup,
        ...clearExpiredEventsWorkflowParamsGroup,
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

        [emrServerlessApplicationIdParam.logicalId]: {
          default: 'EMR Serverless Application Id',
        },

        [odsEventBucketParam.logicalId]: {
          default: 'S3 bucket name for source data',
        },
        [odsEventBucketPrefixParam.logicalId]: {
          default: 'S3 prefix for source data',
        },
        [odsEventFileSuffixParam.logicalId]: {
          default: 'File suffix for source data',
        },
        [loadWorkflowBucketParam.logicalId]: {
          default: 'S3 bucket name for load workflow data',
        },
        [loadWorkflowBucketPrefixParam.logicalId]: {
          default: 'S3 prefix for load workflow data',
        },
        [segmentsS3PrefixParam.logicalId]: {
          default: 'S3 prefix for segments output',
        },
        ...redshiftCommonParamsLabels,
        ...redshiftServerlessParamsLabels,
        ...existingRedshiftServerlessParamsLabels,
        ...redshiftClusterParamsLabels,
        ...loadJobParamsLabels,
        ...upsertUsersWorkflowParamsLabels,
        ...scanMetadataWorkflowParamsLabels,
        ...clearExpiredEventsWorkflowParamsLabels,

        [dataProcessingCronOrRateExpressionParam.logicalId]: {
          default: 'The schedule expression of data processing',
        },
        [clickstreamMetadataDdbArnParam.logicalId]: {
          default: 'Clickstream Metadata DDB table arn',
        },
      },
    },
  };
  const vpc = getExistVpc(scope, 'vpc-for-analytics-in-redshift', {
    vpcId: networkProps.vpcId.valueAsString,
    availabilityZones: Fn.getAzs(),
    privateSubnetIds: Fn.split(',', networkProps.privateSubnets.valueAsString),
  });

  return {
    metadata,
    params: {
      network: {
        vpc,
        subnetSelection: {
          subnets: vpc.privateSubnets,
        },
      },
      projectId: projectIdParam.valueAsString,
      appIds: appIdsParam.valueAsString,
      dataProcessingCronOrRateExpression: dataProcessingCronOrRateExpressionParam.valueAsString,
      dataFreshnessInHour: dataFreshnessInHourParam.valueAsNumber,
      refreshReportDays: refreshReportDaysParam.valueAsNumber,
      timezoneWithAppId: timezoneWithAppIdParam.valueAsString,
      dataSourceConfiguration: {
        bucket: Bucket.fromBucketName(
          scope,
          'pipeline-ods-events-bucket',
          odsEventBucketParam.valueAsString,
        ),
        prefix: getSourcePrefix(scope, odsEventBucketPrefixParam.valueAsString, projectIdParam.valueAsString),
        fileSuffix: odsEventFileSuffixParam.valueAsString,
        emrServerlessApplicationId: emrServerlessApplicationIdParam.valueAsString,
      },
      loadConfiguration: {
        workdir: {
          bucket: Bucket.fromBucketName(
            scope,
            'load-workflow-working-bucket',
            loadWorkflowBucketParam.valueAsString,
          ),
          prefix: loadWorkflowBucketPrefixParam.valueAsString,
        },
        loadJobScheduleIntervalInMinutes: loadJobScheduleIntervalParam.valueAsString,
        maxFilesLimit: maxFilesLimitParam.valueAsNumber,
        processingFilesLimit: processingFilesLimitParam.valueAsNumber,
      },
      scanMetadataConfiguration: {
        clickstreamAnalyticsMetadataDdbArn: clickstreamAnalyticsMetadataDdbArnParam.valueAsString,
        topFrequentPropertiesLimit: topFrequentPropertiesLimitParam.valueAsString,
        scanWorkflowMinInterval: scanWorkflowMinIntervalParam.valueAsString,
        pipelineS3Bucket: pipelineS3BucketParam.valueAsString,
        pipelineS3Prefix: pipelineS3PrefixParam.valueAsString,
      },
      clearExpiredEventsConfiguration: {
        scheduleExpression: clearExpiredEventsWorkflowScheduleExpressionParam.valueAsString,
        retentionRangeDays: clearExpiredEventsWorkflowRetentionRangeDaysParam.valueAsNumber,
      },
      redshift: {
        mode: redshiftModeParam.valueAsString,
        defaultDatabaseName: redshiftDefaultDatabaseParam.valueAsString,
        mvRefreshInterval: mvRefreshIntervalParam.valueAsNumber,
        newServerless: {
          vpcId: redshiftServerlessVPCId.valueAsString,
          subnetIds: redshiftServerlessSubnets.valueAsString,
          securityGroupIds: redshiftServerlessSGs.valueAsString,
          workgroupName: redshiftServerlessWorkgroupName.valueAsString,
          baseCapacity: redshiftServerlessRPU.valueAsNumber,
        },
        existingServerless: {
          workgroupName: redshiftServerlessWorkgroupNameParam.valueAsString,
          workgroupId: redshiftServerlessWorkgroupIdParam.valueAsString,
          namespaceId: redshiftServerlessNamespaceIdParam.valueAsString,
          iamRole: redshiftServerlessIAMRoleParam.valueAsString,
        },
        provisioned: {
          dbUser: redshiftDbUserParam.valueAsString,
          clusterIdentifier: redshiftClusterIdentifierParam.valueAsString,
        },
      },
      clickstreamMetadataDdbTable: Table.fromTableArn(scope, 'ClickstreamMetadataDdbTable', clickstreamMetadataDdbArnParam.valueAsString),
      segmentsS3Prefix: segmentsS3PrefixParam.valueAsString,
    },
  };
}

function getSourcePrefix(scope: Construct, odsEventPrefix: string, projectId: string): string {

  const role = createLambdaRole(scope, 'GetSourcePrefixCustomerResourceFnRole', false, []);

  const lambdaRootPath = __dirname + '/lambdas/custom-resource';
  const fn = new SolutionNodejsFunction(scope, 'GetSourcePrefixCustomerResourceFn', {
    entry: join(
      lambdaRootPath,
      'get-source-prefix.ts',
    ),
    handler: 'handler',
    memorySize: 128,
    timeout: Duration.minutes(1),
    logConf: {
      retention: RetentionDays.ONE_WEEK,
    },
    role,
  });
  const provider = new Provider(
    scope,
    'GetSourcePrefixCustomerResourceProvider',
    {
      onEventHandler: fn,
      logRetention: RetentionDays.FIVE_DAYS,
    },
  );

  addCfnNagSuppressRules(fn.node.defaultChild as CfnResource,
    rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions('CDK'));

  const customProps: GetResourcePrefixPropertiesType = {
    odsEventPrefix,
    projectId,
  };

  const cr = new CustomResource(scope, 'GetSourcePrefixCustomerResource', {
    serviceToken: provider.serviceToken,
    properties: customProps,
  });
  return cr.getAttString('prefix');
}