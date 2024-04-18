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

import { aws_sdk_client_common_config, logger } from '@aws/clickstream-base-lib';
import { ListSubscriptionsByTopicCommand, ListSubscriptionsByTopicCommandOutput, SNSClient, SubscribeCommand } from '@aws-sdk/client-sns';
import { CloudFormationCustomResourceEvent, Context } from 'aws-lambda';


const region = process.env.AWS_REGION!;
const snsTopicArn = process.env.SNS_TOPIC_ARN!;
const emails = process.env.EMAILS;

const snsClient = new SNSClient({
  ...aws_sdk_client_common_config,
  region,
});

export const handler = async (
  event: CloudFormationCustomResourceEvent,
  context: Context,
) => {
  try {
    await doWork(event, context);
  } catch (e: any) {
    logger.error(e);
    throw e;
  }
};

async function doWork(
  event: CloudFormationCustomResourceEvent,
  context: Context,
) {

  let requestType = event.RequestType;

  logger.info('requestType: ' + requestType);

  logger.info('functionName: ' + context.functionName);
  logger.info('region: ' + region);
  logger.info('snsTopicArn: ' + snsTopicArn);

  if (requestType == 'Delete') {
    logger.info('ignore requestType ' + requestType);
    return;
  }
  if (!emails) {
    return;
  }

  const subscriptionEmails = await getSubscriptionEmails();

  const emailList = emails.split(',');
  for (const email of emailList) {
    const maskedEmail = email.replace(/[a-zA-Z]/g, '#');

    if (subscriptionEmails.includes(email)) {
      logger.info('subscription already existed for email: ' + maskedEmail);
    } else {
      const res = await snsClient.send(new SubscribeCommand({
        TopicArn: snsTopicArn,
        Protocol: 'email',
        Endpoint: email,
        ReturnSubscriptionArn: true,
      }));
      logger.info(`created new subscription for ${maskedEmail}, arn: ${res.SubscriptionArn}`);
    }
  }
}

async function getSubscriptionEmails() {
  const subscriptionEmails = [];
  let nextToken = undefined;
  while (true) {
    let subsResult: ListSubscriptionsByTopicCommandOutput = await snsClient.send(new ListSubscriptionsByTopicCommand({
      TopicArn: snsTopicArn,
      NextToken: nextToken,
    }));
    nextToken = subsResult.NextToken;
    if (subsResult.Subscriptions) {
      for (const sub of subsResult.Subscriptions) {
        if (sub.Protocol == 'email') {
          subscriptionEmails.push(sub.Endpoint);
        }
      }
    }
    if (!nextToken) {
      break;
    }
  }
  return subscriptionEmails;
}