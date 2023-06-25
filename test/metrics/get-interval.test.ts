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

import 'aws-sdk-client-mock-jest';
import { handler } from '../../src/metrics/custom-resource/get-interval';
import { getMockContext } from '../common/lambda-context';

const c = getMockContext();

const commonEventProps = {
  RequestType: 'Create',
  ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
  ResponseURL:
    'https://cloudformation-custom-resource-response-useast1.s3.amazonaws.com/testUrl',
  StackId:
    'arn:aws:cloudformation:us-east-1:111111111111:stack/test/54bce910-a6c8-11ed-8ff3-1212426f2299',
  RequestId: '6ffb9981-d1af-4177-aac1-34e11cdcccd8',
  LogicalResourceId: 'create-test-custom-resource',
  ResourceType: 'AWS::CloudFormation::CustomResource',
};

beforeEach(() => {
});

test('should get interval seconds for rate expression - hours', async () => {
  const event = {
    ...commonEventProps,
    ResourceProperties: {
      ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
      expression: 'rate(2 hours)',
    },
  };

  //@ts-ignore
  const data = await handler(event, c);
  expect(data).toEqual({ Data: { intervalSeconds: 7200 } });
});


test('should get interval seconds for rate expression - days', async () => {
  const event = {
    ...commonEventProps,
    ResourceProperties: {
      ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
      expression: 'rate(1 day)',
    },
  };

  //@ts-ignore
  const data = await handler(event, c);
  expect(data).toEqual({ Data: { intervalSeconds: 86400 } });
});


test('should get interval seconds for rate expression - minutes', async () => {
  const event = {
    ...commonEventProps,
    ResourceProperties: {
      ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
      expression: 'rate ( 2 minutes )',
    },
  };

  //@ts-ignore
  const data = await handler(event, c);
  expect(data).toEqual({ Data: { intervalSeconds: 120 } });
});


test('should get interval seconds for rate expression - seconds', async () => {
  const event = {
    ...commonEventProps,
    ResourceProperties: {
      ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
      expression: 'rate ( 1 second )',
    },
  };

  //@ts-ignore
  const data = await handler(event, c);
  expect(data).toEqual({ Data: { intervalSeconds: 60 } });
});


test('should get interval seconds for rate expression - evaluationPeriods', async () => {
  const event = {
    ...commonEventProps,
    ResourceProperties: {
      ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
      expression: 'rate ( 12 hours )',
      evaluationPeriods: 3,
    },
  };

  //@ts-ignore
  const data = await handler(event, c);
  expect(data).toEqual({ Data: { intervalSeconds: 28800 } });
});


test('should get interval seconds for rate expression - evaluationPeriods 2', async () => {
  const event = {
    ...commonEventProps,
    ResourceProperties: {
      ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
      expression: 'rate ( 28801 seconds )',
      evaluationPeriods: 3,
    },
  };

  //@ts-ignore
  const data = await handler(event, c);
  expect(data).toEqual({ Data: { intervalSeconds: 28800 } });
});


test('should get interval seconds for rate expression - intervalSeconds must N * 60 - 65', async () => {
  const event = {
    ...commonEventProps,
    ResourceProperties: {
      ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
      expression: 'rate ( 65 seconds )',
    },
  };

  //@ts-ignore
  const data = await handler(event, c);
  expect(data).toEqual({ Data: { intervalSeconds: 60 } });
});


test('should get interval seconds for rate expression - intervalSeconds must N * 60 - 119', async () => {
  const event = {
    ...commonEventProps,
    ResourceProperties: {
      ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
      expression: 'rate ( 119 seconds )',
    },
  };

  //@ts-ignore
  const data = await handler(event, c);
  expect(data).toEqual({ Data: { intervalSeconds: 60 } });
});


test('should get interval seconds for rate expression - weeks', async () => {
  const event = {
    ...commonEventProps,
    ResourceProperties: {
      ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
      expression: 'rate ( 2 weeks )',
    },
  };

  //@ts-ignore
  const data = await handler(event, c);
  expect(data).toEqual({ Data: { intervalSeconds: 3600 * 24 } });
});


test('should get interval seconds for rate expression - month', async () => {
  const event = {
    ...commonEventProps,
    ResourceProperties: {
      ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
      expression: 'rate(1 month)',
    },
  };

  //@ts-ignore
  const data = await handler(event, c);
  expect(data).toEqual({ Data: { intervalSeconds: 3600 * 24 } });
});


test('should get interval seconds for cron expression', async () => {
  const event = {
    ...commonEventProps,
    ResourceProperties: {
      ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
      expression: 'cron(*/2 * * * *)',
    },
  };

  //@ts-ignore
  const data = await handler(event, c);
  expect(data).toEqual({ Data: { intervalSeconds: 120 } });
});


test('should get interval seconds for cron expression 2', async () => {
  const event = {
    ...commonEventProps,
    ResourceProperties: {
      ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
      expression: 'cron ( */2 * * * * )',
    },
  };

  //@ts-ignore
  const data = await handler(event, c);
  expect(data).toEqual({ Data: { intervalSeconds: 120 } });
});


test('should get interval seconds for cron expression 3', async () => {
  const event = {
    ...commonEventProps,
    ResourceProperties: {
      ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
      expression: 'cron (2 * * * * )',
    },
  };

  //@ts-ignore
  const data = await handler(event, c);
  expect(data).toEqual({ Data: { intervalSeconds: 3600 } });
});


test('should get interval seconds for cron expression 4', async () => {
  const event = {
    ...commonEventProps,
    ResourceProperties: {
      ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
      expression: 'cron (0 1 * * ? * )',
    },
  };

  //@ts-ignore
  const data = await handler(event, c);
  expect(data).toEqual({ Data: { intervalSeconds: 3600 } });
});


test('should get interval seconds for cron expression 5', async () => {
  const event = {
    ...commonEventProps,
    ResourceProperties: {
      ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
      expression: 'cron (0 1 1 * ? * )',
    },
  };

  //@ts-ignore
  const data = await handler(event, c);
  expect(data).toEqual({ Data: { intervalSeconds: 3600 * 24 } });
});


test('throw exception with wrong expression', async () => {
  const event = {
    ...commonEventProps,
    ResourceProperties: {
      ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
      expression: '(0 1 * * * *)',
    },
  };

  let errMessage = '';
  try {
    //@ts-ignore
    await handler(event, c);
  } catch (e) {
    //@ts-ignore
    errMessage = e.message;
  }
  expect(errMessage).toEqual('Unknown expression:(0 1 * * * *)');
});


test('should do nothing for Delete', async () => {
  const event = {
    ...commonEventProps,
    RequestType: 'Delete',
    ResourceProperties: {
      ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
      expression: 'cron (0 1 * * ? * )',
    },
  };

  //@ts-ignore
  const data = await handler(event, c);
  expect(data).toEqual({});
});


test('should get interval seconds for expression update', async () => {
  const event = {
    ...commonEventProps,
    RequestType: 'Update',
    ResourceProperties: {
      ServiceToken: 'arn:aws:lambda:us-east-1:11111111111:function:testFn',
      expression: 'rate(2 minutes )',
    },
  };

  //@ts-ignore
  const data = await handler(event, c);
  expect(data).toEqual({ Data: { intervalSeconds: 120 } });
});
