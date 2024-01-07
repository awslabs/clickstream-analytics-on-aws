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

import { CloudFormationClient, DescribeStacksCommand, DescribeTypeCommand, StackStatus } from '@aws-sdk/client-cloudformation';
import { PipelineStackType, PipelineStatusDetail } from '../../common/model-ln';
import { logger } from '../../common/powertools';
import { aws_sdk_client_common_config } from '../../common/sdk-client-config-ln';
import { getVersionFromTags } from '../../common/utils';

export const describeStack = async (region: string, stackName: string) => {
  try {
    const cloudFormationClient = new CloudFormationClient({
      ...aws_sdk_client_common_config,
      region,
    });
    const params: DescribeStacksCommand = new DescribeStacksCommand({
      StackName: stackName,
    });
    const result = await cloudFormationClient.send(params);
    if (result.Stacks) {
      return result.Stacks[0];
    }
    return undefined;
  } catch (error) {
    return undefined;
  }
};

export const getStacksDetailsByNames = async (region: string, stackNames: string[]) => {
  try {
    const stackDetails: PipelineStatusDetail[] = [];
    for (let stackName of stackNames) {
      const stack = await describeStack(region, stackName);
      const name = stack?.StackName ?? stackName;
      stackDetails.push({
        stackId: stack?.StackId ?? '',
        stackName: name,
        stackType: name.split('-')[1] as PipelineStackType,
        stackStatus: stack?.StackStatus as StackStatus,
        stackStatusReason: stack?.StackStatusReason ?? '',
        stackTemplateVersion: getVersionFromTags(stack?.Tags),
        outputs: stack?.Outputs ?? [],
      });
    }
    return stackDetails;
  } catch (error) {
    return [];
  }
};

export const describeType = async (region: string, typeName: string) => {
  try {
    const cloudFormationClient = new CloudFormationClient({
      ...aws_sdk_client_common_config,
      region,
    });
    const params: DescribeTypeCommand = new DescribeTypeCommand({
      Type: 'RESOURCE',
      TypeName: typeName,
    });
    return await cloudFormationClient.send(params);
  } catch (error) {
    logger.error('Describe AWS Resource Types Error', { error });
    return undefined;
  }
};

export const pingServiceResource = async (region: string, service: string) => {
  let resourceName = '';
  switch (service) {
    case 'emr-serverless':
      resourceName = 'AWS::EMRServerless::Application';
      break;
    case 'msk':
      resourceName = 'AWS::KafkaConnect::Connector';
      break;
    case 'redshift-serverless':
      resourceName = 'AWS::RedshiftServerless::Workgroup';
      break;
    case 'quicksight':
      resourceName = 'AWS::QuickSight::Dashboard';
      break;
    case 'athena':
      resourceName = 'AWS::Athena::WorkGroup';
      break;
    case 'global-accelerator':
      resourceName = 'AWS::GlobalAccelerator::Accelerator';
      break;
    default:
      break;
  };
  if (!resourceName) return false;
  if (service === 'quicksight' && region.startsWith('cn-')) {
    return false;
  }
  const resource = await describeType(region, resourceName);
  return resource?.Arn ? true : false;
};
