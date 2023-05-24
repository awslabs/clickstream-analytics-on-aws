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


process.env.AWS_REGION = 'us-east-1';
process.env.EMAILS = 'test1#test.com,test2#test.com';
process.env.SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:1111111111:metrics-alarmNotificationSnsTopic123456';

import { SNSClient, SubscribeCommand } from '@aws-sdk/client-sns';

import { CloudFormationCustomResourceEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import { handler } from '../../src/metrics/custom-resource/add-sns-subscription';
import { getMockContext } from '../common/lambda-context';

const c = getMockContext();

//@ts-ignore
const snsClientMock = mockClient(SNSClient);

beforeEach(() => {
  snsClientMock.reset();
});

test('should create emails subscription for create action', async () => {
  const event: CloudFormationCustomResourceEvent = {
    RequestType: 'Create',
    ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
    ResponseURL:
        'https://cloudformation-custom-resource-response-useast1.s3.amazonaws.com/testUrl',
    StackId:
        'arn:aws:cloudformation:us-east-1:111111111111:stack/test/54bce910-a6c8-11ed-8ff3-1212426f2299',
    RequestId: '6ffb9981-d1af-4177-aac1-34e11cdcccd8',
    LogicalResourceId: 'create-test-custom-resource',
    ResourceType: 'AWS::CloudFormation::CustomResource',
    ResourceProperties: {
      ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
    },
  };

  //@ts-ignore
  snsClientMock.on(SubscribeCommand).resolves({
    //@ts-ignore
    SubscriptionArn: 'test:SubscriptionArn',
  });
  await handler(event, c);
  //@ts-ignore
  expect(snsClientMock).toHaveReceivedCommandTimes(SubscribeCommand, 2);
  //@ts-ignore
  expect(snsClientMock).toHaveReceivedNthCommandWith(2, SubscribeCommand, {
    Endpoint: 'test2#test.com',
    Protocol: 'email',
    ReturnSubscriptionArn: true,
    TopicArn: 'arn:aws:sns:us-east-1:1111111111:metrics-alarmNotificationSnsTopic123456',
  });
});


test('should not create emails subscription for delete action', async () => {
  // @ts-ignore
  const event: CloudFormationCustomResourceEvent = {
    RequestType: 'Delete',
    ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
    ResponseURL:
          'https://cloudformation-custom-resource-response-useast1.s3.amazonaws.com/testUrl',
    StackId:
          'arn:aws:cloudformation:us-east-1:111111111111:stack/test/54bce910-a6c8-11ed-8ff3-1212426f2299',
    RequestId: '6ffb9981-d1af-4177-aac1-34e11cdcccd8',
    LogicalResourceId: 'create-test-custom-resource',
    ResourceType: 'AWS::CloudFormation::CustomResource',
    ResourceProperties: {
      ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
    },
  };

  //@ts-ignore
  snsClientMock.on(SubscribeCommand).resolves({
    //@ts-ignore
    SubscriptionArn: 'test:SubscriptionArn',
  });

  await handler(event, c);
  //@ts-ignore
  expect(snsClientMock).toHaveReceivedCommandTimes(SubscribeCommand, 0);

});

