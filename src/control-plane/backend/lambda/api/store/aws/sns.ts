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

import { SNSClient, CreateTopicCommand, SubscribeCommand, SetTopicAttributesCommand, TagResourceCommand } from '@aws-sdk/client-sns';
import { logger } from '../../common/powertools';
import { aws_sdk_client_common_config } from '../../common/sdk-client-config-ln';
import { getDefaultTags } from '../../common/utils';

export const createTopicAndSubscribeSQSQueue = async (region: string, projectId: string, name: string, queueArn: string) => {
  try {
    const topicArn = await createTopic(region, name);
    if (topicArn) {
      await tagResource(region, topicArn, projectId);
      await setPermissionForEventRule(region, topicArn);
      await subscribeSQSQueue(region, topicArn, queueArn);
    }
    return topicArn;
  } catch (error) {
    logger.error('Error in create topic and subscribe queue', { error });
    throw error;
  }
};

export const createTopic = async (region: string, name: string) => {
  try {
    const client = new SNSClient({
      ...aws_sdk_client_common_config,
      region,
    });
    const command = new CreateTopicCommand({
      Name: name,
    });
    const data = await client.send(command);
    return data.TopicArn;
  } catch (error) {
    logger.error('Error in create topic', { error });
    throw error;
  }
};


export const tagResource = async (region: string, topicArn: string, projectId: string) => {
  try {
    const client = new SNSClient({
      region,
    });
    const command = new TagResourceCommand({
      ResourceArn: topicArn,
      Tags: getDefaultTags(projectId),
    });
    await client.send(command);
  } catch (error) {
    logger.error('Error in tag topic', { error });
    throw error;
  }
};

export const subscribeSQSQueue = async (region: string, topicArn: string, queueArn: string) => {
  try {
    const client = new SNSClient({
      ...aws_sdk_client_common_config,
      region,
    });
    const command = new SubscribeCommand({
      TopicArn: topicArn,
      Protocol: 'sqs',
      Endpoint: queueArn,
      Attributes: {
        RawMessageDelivery: 'true',
      },
    });
    await client.send(command);
  } catch (error) {
    logger.error('Error in subscribe topic', { error });
    throw error;
  }
};

export const setPermissionForEventRule = async (region: string, topicArn: string) => {
  try {
    const eventRulePolicy = {
      Version: '2008-10-17',
      Id: '__default_policy_ID',
      Statement: [
        {
          Sid: '__events_statement_ID',
          Effect: 'Allow',
          Principal: {
            Service: 'events.amazonaws.com',
          },
          Action: 'SNS:Publish',
          Resource: topicArn,
        },
      ],
    };
    const client = new SNSClient({
      region,
    });
    const command = new SetTopicAttributesCommand({
      TopicArn: topicArn,
      AttributeName: 'Policy',
      AttributeValue: JSON.stringify(eventRulePolicy),
    });
    await client.send(command);
  } catch (error) {
    logger.error('Error in subscribe topic', { error });
    throw error;
  }
};
