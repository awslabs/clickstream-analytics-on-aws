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

import { aws_sdk_client_common_config } from '@aws/clickstream-base-lib';
import { CloudWatchEventsClient, PutRuleCommand, PutTargetsCommand, TagResourceCommand, Target } from '@aws-sdk/client-cloudwatch-events';
import { logger } from '../../common/powertools';
import { getDefaultTags } from '../../common/utils';

export const createRuleAndAddTargets = async (region: string, projectId: string, name: string, eventPattern: string, targetArn: string) => {
  try {
    const ruleArn = await putRule(region, name, eventPattern);
    if (ruleArn) {
      await tagResource(region, ruleArn, projectId);
      const targets: Target[] = [{
        Id: 'ClickstreamTarget',
        Arn: targetArn,
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

export const tagResource = async (region: string, ruleArn: string, projectId: string) => {
  try {
    const client = new CloudWatchEventsClient({
      region,
    });
    const command = new TagResourceCommand({
      ResourceARN: ruleArn,
      Tags: getDefaultTags(projectId),
    });
    await client.send(command);
  } catch (error) {
    logger.error('Error in tag rule', { error });
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

