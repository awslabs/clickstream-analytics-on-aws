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


import { CloudWatchEventsClient, DeleteRuleCommand, ListTargetsByRuleCommand, PutRuleCommand, PutTargetsCommand, RemoveTargetsCommand, ResourceNotFoundException, Target } from '@aws-sdk/client-cloudwatch-events';
import { clickstreamEventBusArn, clickstreamEventBusInvokeRoleArn } from '../../common/constants';
import { logger } from '../../common/powertools';
import { aws_sdk_client_common_config } from '../../common/sdk-client-config-ln';

export const createRuleAndAddTargets = async (region: string, name: string, eventPattern: string) => {
  try {
    const ruleArn = await putRule(region, name, eventPattern);
    if (ruleArn) {
      const targets: Target[] = [{
        Id: 'ClickstreamEventBusArn',
        Arn: clickstreamEventBusArn,
        RoleArn: clickstreamEventBusInvokeRoleArn,
      }];
      await putTargets(region, name, targets);
    }
    return ruleArn;
  } catch (error) {
    logger.error('Error in putRule', { error });
    throw error;
  }
};

export const putRule = async (region: string, name: string, eventPattern: string) => {
  try {
    const client = new CloudWatchEventsClient({
      ...aws_sdk_client_common_config,
      region,
    });
    const command = new PutRuleCommand({
      Name: name,
      EventPattern: eventPattern,
    });
    return (await client.send(command)).RuleArn;
  } catch (error) {
    logger.error('Error in putRule', { error });
    throw error;
  }
};

export const putTargets = async (region: string, rule: string, targets: Target[]) => {
  try {
    const client = new CloudWatchEventsClient({
      ...aws_sdk_client_common_config,
      region,
    });
    const command = new PutTargetsCommand({
      Rule: rule,
      Targets: targets,
    });
    return await client.send(command);
  } catch (error) {
    logger.error('Error in putRule', { error });
    throw error;
  }
};

export const deleteRuleAndTargets = async (region: string, name: string) => {
  try {
    await deleteTargetsOfRule(region, name);
    await deleteRule(region, name);
  } catch (error) {
    logger.error('Error in deleteRuleAndTargets', { error });
    throw error;
  }
};

export const deleteTargetsOfRule = async (region: string, rule: string) => {
  try {
    const client = new CloudWatchEventsClient({
      ...aws_sdk_client_common_config,
      region,
    });
    const command = new ListTargetsByRuleCommand({
      Rule: rule,
    });
    const res = await client.send(command);
    const targetIds = res.Targets?.map((target) => target.Id || '') || [];
    if (targetIds.length === 0) {
      return;
    }
    await client.send(new RemoveTargetsCommand({
      Rule: rule,
      Ids: targetIds,
      Force: true,
    }));
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      logger.warn('Rule target not found', { error });
      return;
    }
    logger.error('Error in deleteTargetsOfRule', { error });
    throw error;
  }
};

export const deleteRule = async (region: string, name: string) => {
  try {
    const client = new CloudWatchEventsClient({
      ...aws_sdk_client_common_config,
      region,
    });
    const command = new DeleteRuleCommand({
      Name: name,
      Force: true,
    });
    await client.send(command);
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      logger.warn('Rule not found', { error });
      return;
    }
    logger.error('Error in deleteRule', { error });
    throw error;
  }
};
