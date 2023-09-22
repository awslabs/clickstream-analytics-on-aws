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
import { CloudFormationCustomResourceEvent, Context } from 'aws-lambda';
import { handler } from '../../../../../src/analytics/lambdas/custom-resource/get-source-prefix';
import 'aws-sdk-client-mock-jest';

const c: Context = {
  callbackWaitsForEmptyEventLoop: true,
  functionVersion: '$LATEST',
  functionName: 'testFn',
  memoryLimitInMB: '512',
  logGroupName: '/aws/lambda/testFn',
  logStreamName: 'testFn',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
  awsRequestId: '0d93e702-57ad-40e6-a1c2-9f95a0087d44',
  getRemainingTimeInMillis: function (): number {
    return 1;
  },
  done: function (): void { },
  fail: function (): void { },
  succeed: function (): void { },
};

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
    odsEventPrefix: 'project0001/test/ods_events/',
  },
};


test('can get prefix from ods_events prefix1', async () => {
  event.ResourceProperties.odsEventPrefix = 'project0001/abc/ods_events/';

  const res = await handler(event, c);
  expect(res).toEqual({ Data: { prefix: 'project0001/abc/' }, Status: 'SUCCESS' });
});


test('can get prefix from ods_events prefix2', async () => {
  event.ResourceProperties.odsEventPrefix = 'project0002/abc/ods_events';

  const res = await handler(event, c);
  expect(res).toEqual({ Data: { prefix: 'project0002/abc/' }, Status: 'SUCCESS' });
});


test('can get prefix from data prefix3', async () => {
  event.ResourceProperties.odsEventPrefix = 'project0003/data/';

  const res = await handler(event, c);
  expect(res).toEqual({ Data: { prefix: 'project0003/data/' }, Status: 'SUCCESS' });
});


test('can get prefix from data prefix4', async () => {
  event.ResourceProperties.odsEventPrefix = 'project0004/data';

  const res = await handler(event, c);
  expect(res).toEqual({ Data: { prefix: 'project0004/data/' }, Status: 'SUCCESS' });
});


