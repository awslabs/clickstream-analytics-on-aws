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

import { Stack } from 'aws-cdk-lib';
import { addCfnNagForLogRetention, addCfnNagToStack, addCfnNagForCustomResourceProvider, ruleToSuppressRolePolicyWithWildcardResources, ruleForLambdaVPCAndReservedConcurrentExecutions } from '../../../common/cfn-nag';


const cfnNagList = [
  {
    paths_endswith: [
      'IngestionServer/clickstream-ingestion-service-ecs-asg/InstanceRole/DefaultPolicy/Resource',
      'IngestionServer/clickstream-ingestion-service-ecs-asg/DrainECSHook/Function/ServiceRole/DefaultPolicy/Resource',
      'IngestionServer/clickstream-ingestion-service-ecs-task-def/ExecutionRole/DefaultPolicy/Resource',
      'IngestionServer/ECSFargateCluster/ecs-fargate-service/clickstream-ingestion-service-ecs-fargate-task-def/ExecutionRole/DefaultPolicy/Resource',
      'IngestionServer/ECSEc2Cluster/clickstream-ingestion-service-ecs-service/clickstream-ingestion-service-ecs-task-def/ExecutionRole/DefaultPolicy/Resource',
      'IngestionServer/ECSEc2Cluster/clickstream-ingestion-service-ecs-asg/InstanceRole/DefaultPolicy/Resource',
      'IngestionServer/ECSEc2Cluster/clickstream-ingestion-service-ecs-asg/DrainECSHook/Function/ServiceRole/DefaultPolicy/Resource',
    ],
    rules_to_suppress: [
      ruleToSuppressRolePolicyWithWildcardResources('CDK built-in Lambda', ''),
    ],
  },
  ruleForLambdaVPCAndReservedConcurrentExecutions('IngestionServer/clickstream-ingestion-service-ecs-asg/DrainECSHook/Function/Resource',
    'ECSDrainHook'),
  ruleForLambdaVPCAndReservedConcurrentExecutions('IngestionServer/ECSEc2Cluster/clickstream-ingestion-service-ecs-asg/DrainECSHook/Function/Resource',
    'ECSEc2DrainHook'),
  {
    paths_endswith: [
      'IngestionServer/clickstream-ingestion-service-ecs-asg/LifecycleHookDrainHook/Topic/Resource',
      'IngestionServer/ECSEc2Cluster/clickstream-ingestion-service-ecs-asg/LifecycleHookDrainHook/Topic/Resource',
    ],
    rules_to_suppress: [
      {
        id: 'W47',
        reason:
          'SNS Topic is managed outside of this stack, no need to specify KmsMasterKeyId property',
      },
    ],
  },
];

export function addCfnNagToIngestionServer(stack: Stack) {
  addCfnNagForLogRetention(stack);
  addCfnNagForCustomResourceProvider(stack, 'S3SinkConnector', 'S3SinkConnectorCustomResource', '');
  addCfnNagForCustomResourceProvider(stack, 'Metrics', 'MetricsCustomResourceProvider', '');
  addCfnNagForCustomResourceProvider(stack, 'updateAlbRulesCustomResourceProvider', 'updateAlbRulesCustomResourceProvider', '');
  addCfnNagForCustomResourceProvider(stack, 'deleteECSClusterCustomResourceProvider', 'deleteECSClusterCustomResourceProvider', '');
  addCfnNagToStack(stack, cfnNagList);
}

export function addCfnNagToIngestionCommonResourcesStack(stack: Stack) {
  addCfnNagForLogRetention(stack);
  addCfnNagForCustomResourceProvider(stack, 'updateAlbRulesCustomResourceProvider', 'updateAlbRulesCustomResourceProvider', '');
}