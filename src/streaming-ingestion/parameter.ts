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
  CLICKSTREAM_TRANSFORMER_NAME_PARAMETER,
  GTM_TRANSFORMER_NAME_PARAMETER,
  KINESIS_DATA_STREAM_ARN_PATTERN,
  KMS_KEY_ARN_PATTERN,
  S3_BUCKET_ARN_PATTERN,
  SENSORS_TRANSFORMER_NAME_PARAMETER,
  SUBNETS_PATTERN,
} from '@aws/clickstream-base-lib';
import { CfnParameter, Fn } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { REDSHIFT_MODE } from '../common/model';
import { Parameters, SubnetParameterType } from '../common/parameters';

export interface StreamingIngestionStackProps {
  projectId: string;
  appIds: string;
  pipeline: {
    source: {
      kinesisArn?: string;
    };
    buffer: {
      kinesis: {
        mode: string;
        shardCount: number;
        dataRetentionHours: number;
        encryptionKeyArn: string;
      };
    };
    destination: {
      redshift: {
        mode: string;
        defaultDatabaseName: string;
        dataAPIRoleArn: string;
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
        userName: string;
      };
    };
    worker: {
      configuration: {
        parallelism: number;
        parallelismPerKPU: number;
      };
    };
    network: {
      vpcId: string;
      subnetIds: string;
    };
    dataBucket: {
      arn: string;
      prefix: string;
    };
    eventProcessing : {
      transformerName: string;
      enableStreamIngestion: string;
      retentionHours: number;
      allowEvents: string;
      enableUaEnrich: string;
      enableIpEnrich: string;
      enableTrafficSourceEnrich: string;
      withCustomParameters: string;
      enableWindowAgg: string;
      windowAggTypes: string;
      windowSizeMinutes: number;
      windowSlideMinutes: number;
    };
  };
}

export function createStackParameters(scope: Construct): {
  metadata: {
    [key: string]: any;
  };
  params: StreamingIngestionStackProps;
} {

  const { kinesisStreamModeParam, kinesisShardCountParam, kinesisDataRetentionHoursParam } = Parameters.createKinesisParameters(scope);
  const kinesisEncryptionKMSKeyARNParam = new CfnParameter(scope, 'KinesisEncryptionKMSKeyArn', {
    description: 'The ARN of KMS key for encrypting the Kinesis data stream',
    type: 'String',
    allowedPattern: KMS_KEY_ARN_PATTERN,
  });

  const kinesisParamsGroup = [];
  kinesisParamsGroup.push({
    Label: { default: 'Kinesis Data Stream for streaming buffer' },
    Parameters: [
      kinesisStreamModeParam.logicalId,
      kinesisShardCountParam.logicalId,
      kinesisDataRetentionHoursParam.logicalId,
      kinesisEncryptionKMSKeyARNParam.logicalId,
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
    [kinesisEncryptionKMSKeyARNParam.logicalId]: {
      default: 'KMS key(ARN) for encrypting KDS',
    },
  };

  const kinesisSourceStreamARNParam = new CfnParameter(scope, 'KinesisSourceStreamArn', {
    description: 'The ARN of Kinesis Data Stream used as streaming ingestion source.',
    type: 'String',
    allowedPattern: KINESIS_DATA_STREAM_ARN_PATTERN,
  });

  const streamingIngestionConfigurationParamsGroup = [];
  streamingIngestionConfigurationParamsGroup.push({
    Label: { default: 'Streaming source' },
    Parameters: [
      kinesisSourceStreamARNParam.logicalId,
    ],
  });

  const streamingIngestionConfigurationParamsLabels = {
    [kinesisSourceStreamARNParam.logicalId]: {
      default: 'The ARN of Kinesis Data Stream',
    },
  };

  const parallelismParam = new CfnParameter(scope, 'Parallelism', {
    description:
    'Number of Flink application parallelism.',
    type: 'Number',
    default: '1',
    minValue: 1,
  });

  const parallelismPerKPUParam = new CfnParameter(scope, 'ParallelismPerKPU', {
    description:
    'Number of Flink application parallelism Per KPU.',
    type: 'Number',
    default: '1',
    minValue: 1,
  });

  const vpcIdParam = Parameters.createVpcIdParameter(scope);
  const subnetIdsParam = Parameters.createPrivateSubnetParameter(scope, 'WorkerSubnets',
    SubnetParameterType.String, {
      allowedPattern: SUBNETS_PATTERN,
      constraintDescription: 'The subnets of streaming ingestion application run',
    });

  const pipelineS3BucketArnParam = Parameters.createS3BucketParameter(scope, 'IngestionPipelineS3BucketArn', {
    description: 'Ingestion pipeline S3 bucket arn',
    allowedPattern: `^${S3_BUCKET_ARN_PATTERN}$`,
  });

  const pipelineS3PrefixParam = Parameters.createS3PrefixParameter(scope, 'IngestionPipelineS3Prefix', {
    description: 'Ingestion Pipeline S3 prefix',
    default: 'clickstream/',
  });


  const transformerNameParam = new CfnParameter(scope, 'TransformerName', {
    description: 'The name of the transformer',
    type: 'String',
    default: 'clickstream',
    allowedValues: [CLICKSTREAM_TRANSFORMER_NAME_PARAMETER, GTM_TRANSFORMER_NAME_PARAMETER, SENSORS_TRANSFORMER_NAME_PARAMETER],
  });

  // EnableStreamIngestion
  const enableStreamIngestionParam = new CfnParameter(scope, 'EnableStreamIngestion', {
    description: 'Enable streaming ingestion to redshift',
    type: 'String',
    default: 'true',
    allowedValues: ['true', 'false'],
  });

  const retentionHoursParam = new CfnParameter(scope, 'RetentionHours', {
    description: 'The retention hours of events in the event table',
    type: 'Number',
    default: 24.0,
    minValue: 0.01,
  });

  const allowEventsParam = new CfnParameter(scope, 'AllowEvents', {
    description: 'The events that are allowed to be ingested, default is all events, use comma to separate multiple events',
    type: 'CommaDelimitedList',
    default: 'ALL',
  });

  const enableUaEnrichParam = new CfnParameter(scope, 'EnableUaEnrich', {
    description: 'Enable User Agent enrichment',
    type: 'String',
    default: 'true',
    allowedValues: ['true', 'false'],
  });

  const enableIpEnrichParam = new CfnParameter(scope, 'EnableIpEnrich', {
    description: 'Enable IP enrichment',
    type: 'String',
    default: 'true',
    allowedValues: ['true', 'false'],
  });

  const enableTrafficSourceEnrichParam = new CfnParameter(scope, 'EnableTrafficSourceEnrich', {
    description: 'Enable Traffic Source enrichment',
    type: 'String',
    default: 'true',
    allowedValues: ['true', 'false'],
  });

  const withCustomParametersParam = new CfnParameter(scope, 'WithCustomParameters', {
    description: 'Enable custom parameters',
    type: 'String',
    default: 'false',
    allowedValues: ['true', 'false'],
  });

  // EnableWindowAgg
  const enableWindowAggParam = new CfnParameter(scope, 'EnableWindowAgg', {
    description: 'Enable window aggregation in Flink',
    type: 'String',
    default: 'false',
    allowedValues: ['true', 'false'],
  });

  // windowAggTypes
  const windowAggTypesParam = new CfnParameter(scope, 'WindowAggTypes', {
    description: 'The window aggregation types, use comma to separate multiple types',
    type: 'CommaDelimitedList',
    default: 'eventNameTopRank,pageTitleTopRank,eventAndUserCount,trafficSourceSourceTopRank',
  });

  // windowSizeMinutes
  const windowSizeMinutesParam = new CfnParameter(scope, 'WindowSizeMinutes', {
    description: 'The window size in minutes',
    type: 'Number',
    default: 60,
    minValue: 1,
  });
  // windowSlideMinutes
  const windowSlideMinutesParam = new CfnParameter(scope, 'WindowSlideMinutes', {
    description: 'The window slide in minutes',
    type: 'Number',
    default: 10,
    minValue: 1,
  });

  // Set pipeline parameters
  const pipelineParamsGroup = [];
  pipelineParamsGroup.push({
    Label: { default: 'Specify streaming ingestion parameters' },
    Parameters: [
      parallelismParam.logicalId,
      parallelismPerKPUParam.logicalId,
      subnetIdsParam.logicalId,
      pipelineS3BucketArnParam.logicalId,
      pipelineS3PrefixParam.logicalId,
      transformerNameParam.logicalId,

      enableStreamIngestionParam.logicalId,
      allowEventsParam.logicalId,
      retentionHoursParam.logicalId,
      enableUaEnrichParam.logicalId,
      enableIpEnrichParam.logicalId,
      enableTrafficSourceEnrichParam.logicalId,
      withCustomParametersParam.logicalId,

      enableWindowAggParam.logicalId,
      windowAggTypesParam.logicalId,
      windowSizeMinutesParam.logicalId,
      windowSlideMinutesParam.logicalId,
    ],
  });

  const pipelineParamsLabels = {
    [parallelismParam.logicalId]: {
      default: 'Number of Flink application parallelism',
    },
    [parallelismPerKPUParam.logicalId]: {
      default: 'Number of Flink application parallelism Per KPU',
    },
    [vpcIdParam.logicalId]: {
      default: 'Choose VPC',
    },
    [subnetIdsParam.logicalId]: {
      default: 'The subnets of stream ingestion application',
    },
    [pipelineS3BucketArnParam.logicalId]: {
      default: 'The S3 bucket ARN for streaming ingestion stores temporary files',
    },
    [pipelineS3PrefixParam.logicalId]: {
      default: 'The prefix of S3 bucket for streaming ingestion stores temporary files',
    },
    [transformerNameParam.logicalId]: {
      default: 'The name of the transformer',
    },
    [retentionHoursParam.logicalId]: {
      default: 'The retention hours of events in the event table',
    },
    [enableStreamIngestionParam.logicalId]: {
      default: 'Enable streaming ingestion to redshift',
    },
    [allowEventsParam.logicalId]: {
      default: 'The events that are allowed to be ingested to redshift in streaming ingestion',
    },
    [enableUaEnrichParam.logicalId]: {
      default: 'Enable User Agent enrichment',
    },
    [enableIpEnrichParam.logicalId]: {
      default: 'Enable IP enrichment',
    },
    [enableTrafficSourceEnrichParam.logicalId]: {
      default: 'Enable Traffic Source enrichment',
    },
    [withCustomParametersParam.logicalId]: {
      default: 'Enable custom parameters',
    },
    [enableWindowAggParam.logicalId]: {
      default: 'Enable window aggregation in Flink',
    },
    [windowAggTypesParam.logicalId]: {
      default: 'The window aggregation types',
    },
    [windowSizeMinutesParam.logicalId]: {
      default: 'The window size in minutes',
    },
    [windowSlideMinutesParam.logicalId]: {
      default: 'The window slide in minutes',
    },
  };

  const redshiftModeParam = Parameters.createRedshiftModeParameter(scope, 'RedshiftMode', {
    allowedValues: [REDSHIFT_MODE.SERVERLESS, REDSHIFT_MODE.PROVISIONED],
    default: REDSHIFT_MODE.SERVERLESS,
  });

  // Set Redshift common parameters
  const { redshiftDefaultDatabaseParam } = Parameters.createRedshiftCommonParameters(scope);

  const associateRoleTimeoutParam = new CfnParameter(scope, 'AssociateRoleTimeout', {
    description: 'Redshift associate role operation timeout.',
    constraintDescription: 'Range must be 50-600 in increments of 5.',
    type: 'Number',
    default: 120,
    maxValue: 600,
    minValue: 50,
  });

  const redshiftUserParam = new CfnParameter(scope, 'RedshiftUserParam', {
    description: 'User name is for reporting module to access the Redshift.',
    type: 'String',
    allowedPattern: '\\w+',
  });

  const redshiftCommonParamsGroup = [];
  redshiftCommonParamsGroup.push({
    Label: { default: 'Redshift Configuration' },
    Parameters: [
      redshiftDefaultDatabaseParam.logicalId,
      associateRoleTimeoutParam.logicalId,
      redshiftUserParam.logicalId,
    ],
  });

  const { projectIdParam, appIdsParam } = Parameters.createProjectAndAppsParameters(scope, 'ProjectId', 'AppIds');

  // Set existing Redshift serverless parameters
  const existingRedshiftServerlessParamsGroup = [];

  const redshiftServerlessWorkgroupNameParam = Parameters.createRedshiftWorkgroupParameter(scope, 'RedshiftServerlessWorkgroupName');

  const { redshiftServerlessWorkgroupIdParam, redshiftServerlessNamespaceIdParam } =
    Parameters.createRedshiftServerlessWorkgroupAndNamespaceParameters(scope);

  const redshiftDataAPIRoleParam = Parameters.createRedshiftDataAPIRoleParameter(scope);

  Parameters.createRedshiftServerlessParametersRule(scope, {
    redshiftModeParam,
    redshiftServerlessWorkgroupNameParam,
    redshiftDataAPIRoleParam: redshiftDataAPIRoleParam,
  });

  existingRedshiftServerlessParamsGroup.push({
    Label: { default: 'Specify existing Redshift Serverless' },
    Parameters: [
      redshiftServerlessNamespaceIdParam.logicalId,
      redshiftServerlessWorkgroupNameParam.logicalId,
      redshiftServerlessWorkgroupIdParam.logicalId,
      redshiftDataAPIRoleParam.logicalId,
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
    [redshiftDataAPIRoleParam.logicalId]: {
      default: 'Role ARN',
    },
  };

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
      pipeline: {
        source: {
          kinesisArn: kinesisSourceStreamARNParam.valueAsString,
        },
        buffer: {
          kinesis: {
            mode: kinesisStreamModeParam.valueAsString,
            shardCount: kinesisShardCountParam.valueAsNumber,
            dataRetentionHours: kinesisDataRetentionHoursParam.valueAsNumber,
            encryptionKeyArn: kinesisEncryptionKMSKeyARNParam.valueAsString,
          },
        },
        destination: {
          redshift: {
            mode: redshiftModeParam.valueAsString,
            defaultDatabaseName: redshiftDefaultDatabaseParam.valueAsString,
            dataAPIRoleArn: redshiftDataAPIRoleParam.valueAsString,
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
            userName: redshiftUserParam.valueAsString,
          },
        },
        worker: {
          configuration: {
            parallelism: parallelismParam.valueAsNumber,
            parallelismPerKPU: parallelismPerKPUParam.valueAsNumber,
          },
        },
        network: {
          vpcId: vpcIdParam.valueAsString,
          subnetIds: subnetIdsParam.valueAsString,
        },
        dataBucket: {
          arn: pipelineS3BucketArnParam.valueAsString,
          prefix: pipelineS3PrefixParam.valueAsString,
        },
        eventProcessing: {
          transformerName: transformerNameParam.valueAsString,
          enableStreamIngestion: enableStreamIngestionParam.valueAsString,
          retentionHours: retentionHoursParam.valueAsNumber,
          allowEvents: Fn.join(',', allowEventsParam.valueAsList), // convert to string
          enableUaEnrich: enableUaEnrichParam.valueAsString,
          enableIpEnrich: enableIpEnrichParam.valueAsString,
          enableTrafficSourceEnrich: enableTrafficSourceEnrichParam.valueAsString,
          withCustomParameters: withCustomParametersParam.valueAsString,
          enableWindowAgg: enableWindowAggParam.valueAsString,
          windowAggTypes: Fn.join(',', windowAggTypesParam.valueAsList), // convert to string
          windowSizeMinutes: windowSizeMinutesParam.valueAsNumber,
          windowSlideMinutes: windowSlideMinutesParam.valueAsNumber,

        },
      },
    },
  };
}
