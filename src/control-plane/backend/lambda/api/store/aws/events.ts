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

import { CloudWatchEventsClient, PutRuleCommand, PutTargetsCommand, Target } from '@aws-sdk/client-cloudwatch-events';
import { logger } from '../../common/powertools';
import { aws_sdk_client_common_config } from '../../common/sdk-client-config-ln';
import { getDefaultTags } from '../../common/utils';

export const createRuleAndAddTargets = async (region: string, projectId: string, name: string, eventPattern: string, targetArn: string) => {
  try {
    const ruleArn = await putRule(region, projectId, name, eventPattern);
    if (ruleArn) {
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

export const putRule = async (region: string, projectId: string, name: string, eventPattern: string) => {
  try {
    const client = new CloudWatchEventsClient({
      ...aws_sdk_client_common_config,
      region,
    });
    const command = new PutRuleCommand({
      Name: name,
      EventPattern: eventPattern,
      Tags: getDefaultTags(projectId),
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

