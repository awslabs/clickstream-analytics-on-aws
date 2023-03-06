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
import { APP_ID_PATTERN, PARAMETER_GROUP_LABEL_VPC, PARAMETER_LABEL_PRIVATE_SUBNETS, PARAMETER_LABEL_VPCID, PROJECT_ID_PATTERN, S3_BUCKET_NAME_PATTERN } from '../common/constant';
import { Parameters, SubnetParameterType } from '../common/parameters';

export function createStackParameters(scope: Construct) {
  const netWorkProps = Parameters.createNetworkParameters(scope, false, SubnetParameterType.String);

  const projectIdParam = new CfnParameter(scope, 'ProjectId', {
    description: 'Project Id',
    allowedPattern: `^${PROJECT_ID_PATTERN}$`,
    type: 'String',
  });

  const appIdsParam = new CfnParameter(scope, 'AppIds', {
    description: 'App Ids, comma delimited list',
    type: 'CommaDelimitedList',
    allowedPattern: `^${APP_ID_PATTERN}$`,
  });

  const sourceS3BucketParam = Parameters.createS3BucketParameter(scope, 'SourceS3Bucket', {
    description: 'Source S3 bucket name',
    allowedPattern: `^${S3_BUCKET_NAME_PATTERN}$`,
  });

  const sourceS3PrefixParam = Parameters.createS3PrefixParameter(scope, 'SourceS3Prefix', {
    description: 'Source S3 prefix',
    default: 'pipeline-source',
  });

  const sinkS3BucketParam = Parameters.createS3BucketParameter(scope, 'SinkS3Bucket', {
    description: 'Sink S3 bucket name',
    allowedPattern: `^${S3_BUCKET_NAME_PATTERN}$`,
  });

  const sinkS3PrefixParam = Parameters.createS3PrefixParameter(scope, 'SinkS3Prefix', {
    description: 'Sink S3 prefix',
    default: 'pipeline-sink',
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
      },
    },
  };

  return {
    metadata,
    params: {
      vpcIdParam: netWorkProps.vpcId,
      privateSubnetIdsParam: netWorkProps.privateSubnets,
      projectIdParam: projectIdParam,
      appIdsParam: appIdsParam,
      sourceS3BucketParam: sourceS3BucketParam,
      sourceS3PrefixParam: sourceS3PrefixParam,
      sinkS3BucketParam: sinkS3BucketParam,
      sinkS3PrefixParam: sinkS3PrefixParam,
    },
  };
}
