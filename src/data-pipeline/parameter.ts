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

import { CfnParameter } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EMR_VERSION_PATTERN, PARAMETER_GROUP_LABEL_VPC, PARAMETER_LABEL_PRIVATE_SUBNETS, PARAMETER_LABEL_VPCID, S3_BUCKET_NAME_PATTERN, S3_PATH_PLUGIN_FILES_PATTERN, S3_PATH_PLUGIN_JARS_PATTERN, SCHEDULE_EXPRESSION_PATTERN } from '../common/constant';
import { Parameters, SubnetParameterType } from '../common/parameters';

export function createStackParameters(scope: Construct) {
  const netWorkProps = Parameters.createNetworkParameters(scope, false, SubnetParameterType.String);

  const { projectIdParam, appIdsParam } = Parameters.createProjectAndAppsParameters(scope, 'ProjectId', 'AppIds');

  const sourceS3BucketParam = Parameters.createS3BucketParameter(scope, 'SourceS3Bucket', {
    description: 'Source S3 bucket name',
    allowedPattern: `^${S3_BUCKET_NAME_PATTERN}$`,
  });

  const sourceS3PrefixParam = Parameters.createS3PrefixParameter(scope, 'SourceS3Prefix', {
    description: 'Source S3 prefix',
    default: 'pipeline-source/',
  });

  const sinkS3BucketParam = Parameters.createS3BucketParameter(scope, 'SinkS3Bucket', {
    description: 'Sink S3 bucket name',
    allowedPattern: `^${S3_BUCKET_NAME_PATTERN}$`,
  });

  const sinkS3PrefixParam = Parameters.createS3PrefixParameter(scope, 'SinkS3Prefix', {
    description: 'Sink S3 prefix',
    default: 'pipeline-sink/',
  });


  const pipelineS3BucketParam = Parameters.createS3BucketParameter(scope, 'PipelineS3Bucket', {
    description: 'Pipeline S3 bucket name in which to save temporary result',
    allowedPattern: `^${S3_BUCKET_NAME_PATTERN}$`,
  });

  const pipelineS3PrefixParam = Parameters.createS3PrefixParameter(scope, 'PipelineS3Prefix', {
    description: 'Pipeline S3 prefix',
    default: 'pipeline-temp/',
  });

  const dataFreshnessInHourParam = new CfnParameter(scope, 'DataFreshnessInHour', {
    description: 'Data Freshness in hour, default is 72 hours (3 days)',
    default: 72,
    type: 'Number',
  });


  const userKeepDaysParam = new CfnParameter(scope, 'UserKeepMaxDays', {
    description: 'Max of user data keep days',
    default: 180,
    type: 'Number',
    minValue: 1,
  });


  const itemKeepDaysParam = new CfnParameter(scope, 'ItemKeepMaxDays', {
    description: 'Max of item data keep days',
    default: 360,
    type: 'Number',
    minValue: 1,
  });


  const dataBufferedSecondsParam = new CfnParameter(scope, 'DataBufferedSeconds', {
    description: 'S3 object stable wait time',
    default: 30,
    minValue: 5,
    type: 'Number',
  });

  const scheduleExpressionParam = new CfnParameter(scope, 'ScheduleExpression', {
    description: 'The schedule expression to run Data Processing job, e.g: rate(24 hours) or cron(0 1 * * ? *)',
    default: 'cron(0 1 * * ? *)',
    allowedPattern: SCHEDULE_EXPRESSION_PATTERN,
    type: 'String',
  });


  const transformerAndEnrichClassNamesParam = new CfnParameter(scope, 'TransformerAndEnrichClassNames', {
    description: 'The class name list of custom plugins to transform or enrich data',
    default: 'software.aws.solution.clickstream.Transformer,software.aws.solution.clickstream.UAEnrichment,software.aws.solution.clickstream.IPEnrichment',
    type: 'String',
  });

  const s3PathPluginJarsParam = new CfnParameter(scope, 'S3PathPluginJars', {
    description: 'The java jars of custom plugins to transform or enrich data',
    default: '',
    allowedPattern: S3_PATH_PLUGIN_JARS_PATTERN,
    type: 'String',
  });

  const s3PathPluginFilesParam = new CfnParameter(scope, 'S3PathPluginFiles', {
    description: 'The files of custom plugins to transform or enrich data',
    default: '',
    allowedPattern: S3_PATH_PLUGIN_FILES_PATTERN,
    type: 'String',
  });

  const outputFormatParam = new CfnParameter(scope, 'OutputFormat', {
    description: 'Output format',
    default: 'parquet',
    allowedValues: [
      'parquet',
      'json',
    ],
    type: 'String',
  });

  const emrVersionParam = new CfnParameter(scope, 'EmrVersion', {
    description: 'EMR Version',
    allowedPattern: EMR_VERSION_PATTERN,
    default: 'emr-6.11.0',
    type: 'String',
  });

  const emrApplicationIdleTimeoutMinutesParam = new CfnParameter(scope, 'EmrApplicationIdleTimeoutMinutes', {
    description: 'Emr-Serverless application idle timeout minutes',
    default: 5,
    minValue: 1,
    maxValue: 10080,
    type: 'Number',
  });

  const metadata = {
    'AWS::CloudFormation::Interface': {
      ParameterGroups: [
        {
          Label: { default: PARAMETER_GROUP_LABEL_VPC },
          Parameters: [
            netWorkProps.vpcId.logicalId,
            netWorkProps.privateSubnets.logicalId,
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
            sourceS3BucketParam.logicalId,
            sourceS3PrefixParam.logicalId,
            sinkS3BucketParam.logicalId,
            sinkS3PrefixParam.logicalId,
            pipelineS3BucketParam.logicalId,
            pipelineS3PrefixParam.logicalId,
          ],
        },

        {
          Label: { default: 'Job Schedule' },
          Parameters: [
            dataFreshnessInHourParam.logicalId,
            userKeepDaysParam.logicalId,
            itemKeepDaysParam.logicalId,
            scheduleExpressionParam.logicalId,
            dataBufferedSecondsParam.logicalId,
          ],
        },

        {
          Label: { default: 'Transformation and enrichment assets' },
          Parameters: [
            transformerAndEnrichClassNamesParam.logicalId,
            s3PathPluginJarsParam.logicalId,
            s3PathPluginFilesParam.logicalId,
            outputFormatParam.logicalId,
          ],
        },

        {
          Label: { default: 'EMR serverless application configuration' },
          Parameters: [
            emrVersionParam.logicalId,
            emrApplicationIdleTimeoutMinutesParam.logicalId,
          ],
        },
      ],
      ParameterLabels: {
        [netWorkProps.vpcId.logicalId]: {
          default: PARAMETER_LABEL_VPCID,
        },
        [netWorkProps.privateSubnets.logicalId]: {
          default: PARAMETER_LABEL_PRIVATE_SUBNETS,
        },

        [projectIdParam.logicalId]: {
          default: 'Project Id',
        },
        [appIdsParam.logicalId]: {
          default: 'App Ids',
        },

        [sourceS3BucketParam.logicalId]: {
          default: 'Source S3 bucket name',
        },
        [sourceS3PrefixParam.logicalId]: {
          default: 'Source S3 prefix',
        },
        [sinkS3BucketParam.logicalId]: {
          default: 'Sink S3 bucket name',
        },
        [sinkS3PrefixParam.logicalId]: {
          default: 'Sink S3 prefix',
        },

        [pipelineS3BucketParam.logicalId]: {
          default: 'Pipeline S3 bucket name',
        },
        [pipelineS3PrefixParam.logicalId]: {
          default: 'Pipeline S3 prefix',
        },

        [dataFreshnessInHourParam.logicalId]: {
          default: 'Data freshness',
        },

        [userKeepDaysParam.logicalId]: {
          default: 'Max days of users',
        },

        [itemKeepDaysParam.logicalId]: {
          default: 'Max days of items',
        },

        [dataBufferedSecondsParam.logicalId]: {
          default: 'Max time for data in buffer',
        },

        [scheduleExpressionParam.logicalId]: {
          default: 'Job schedule expression',
        },

        [transformerAndEnrichClassNamesParam.logicalId]: {
          default: 'Class name list for plugins',
        },

        [s3PathPluginJarsParam.logicalId]: {
          default: 'Plugin jars',
        },

        [s3PathPluginFilesParam.logicalId]: {
          default: 'Plugin files',
        },

        [outputFormatParam.logicalId]: {
          default: 'Output Format',
        },

        [emrVersionParam.logicalId]: {
          default: 'EMR version',
        },

        [emrApplicationIdleTimeoutMinutesParam.logicalId]: {
          default: 'EMR serverless idle timeout minutes',
        },
      },
    },
  };

  return {
    metadata,
    params: {
      vpcIdParam: netWorkProps.vpcId,
      privateSubnetIdsParam: netWorkProps.privateSubnets,
      projectIdParam,
      appIdsParam,
      sourceS3BucketParam,
      sourceS3PrefixParam,
      sinkS3BucketParam,
      sinkS3PrefixParam,
      pipelineS3BucketParam,
      pipelineS3PrefixParam,
      dataFreshnessInHourParam,
      dataBufferedSecondsParam,
      scheduleExpressionParam,
      transformerAndEnrichClassNamesParam,
      s3PathPluginJarsParam,
      s3PathPluginFilesParam,
      outputFormatParam,
      emrVersionParam,
      emrApplicationIdleTimeoutMinutesParam,
      userKeepDaysParam,
      itemKeepDaysParam,
    },
  };
}
