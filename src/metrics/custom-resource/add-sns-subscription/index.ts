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

import { SNSClient, SubscribeCommand } from '@aws-sdk/client-sns';
import { CloudFormationCustomResourceEvent, Context } from 'aws-lambda';
import { logger } from '../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../common/sdk-client-config';


const region = process.env.AWS_REGION!;
const snsToicArn = process.env.SNS_TOPIC_ARN!;
const emails = process.env.EMAILS;

const snsClient = new SNSClient({
  ...aws_sdk_client_common_config,
  region,
});

export const handler = async (
  event: CloudFormationCustomResourceEvent,
  context: Context,
) => {
  logger.info(JSON.stringify(event));
  try {
    return await _handler(event, context);
  } catch (e: any) {
    logger.error(e);
    throw e;
  }
};

async function _handler(
  event: CloudFormationCustomResourceEvent,
  context: Context,
) {

  let requestType = (event as CloudFormationCustomResourceEvent).RequestType;

  logger.info('requestType: ' + requestType);

  logger.info('functionName: ' + context.functionName);
  logger.info('region: ' + region);
  logger.info('snsToicArn: ' + snsToicArn);

  if (requestType == 'Delete') {
    logger.info('ignore requestType ' + requestType);
    return;
  }
  if (!emails) {
    return;
  }

  const subscriptionResponses = await Promise.all(emails.split(',').map(email => {
    logger.info('subscribe for email: ' + email.replace(/[a-zA-Z]/g, '#') );
    return snsClient.send(new SubscribeCommand({
      TopicArn: snsToicArn,
      Protocol: 'email',
      Endpoint: email,
      ReturnSubscriptionArn: true,
    }));
  }));
  subscriptionResponses.forEach(r => {
    logger.info(r.SubscriptionArn!);
  });

}