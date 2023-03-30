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

import EventEmitter from 'events';
jest.setTimeout(60 * 1000);

class NotFoundExceptionMock extends Error {
  readonly name: string = 'NotFoundException';
}

const event = {
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
    dataS3Bucket: 'test-data-bucket',
    dataS3Prefix: 'data',
    pluginS3Bucket: 'test-plugin-bucket',
    pluginS3Prefix: 'plugin',
    logS3Bucket: 'test-log-bucket',
    logS3Prefix: 'log',
    kafkaTopics: 'test-topic1',
    kafkaBrokers: 'server1:9092,server2:9092,server3:9092',
    s3SinkConnectorRole: 'arn:iam:test:role',
    securityGroupId: 'sg-11111111',
    maxWorkerCount: '2',
    minWorkerCount: '1',
    workerMcuCount: '1',
    subnetIds: 'sub-0001,sub-0002',
    pluginUrl: 'http://test/url',
    kafkaConnectVersion: '2.7.1',
    rotateIntervalMS: '60000',
    customConnectorConfiguration: '{"max.task": "8"}',
    flushSize: '100',
    stackShortId: '54bce910',
  },
};
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
  done: function (): void {},
  fail: function (): void {},
  succeed: function (): void {},
};

const S3ClientMock = {
  send: jest.fn(() => {}),
};

const KafkaConnectClientMock = {
  send: async () => {
    return {
      customPluginArn: 'arn:aws:test-plugin',
      customPluginState: 'ACTIVE',
      connectorArn: 'arn:aws:test-connector',
      connectorState: 'RUNNING',
      customPlugins: [
        {
          customPluginArn: 'arn:aws:test-plugin',
          customPluginState: 'ACTIVE',
          name: '54bce910-Plugin-create-test-custom-resource54bce910',
        },
      ],
      connectors: [
        {
          connectorArn: 'arn:aws:test-connector',
          currentVersion: '1',
          connectorState: 'RUNNING',
        },
      ],
    };
  },
};

jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn(() => S3ClientMock),
    PutObjectCommand: jest.fn(() => {}),
    DeleteObjectCommand: jest.fn(() => {}),
  };
});

jest.mock('@aws-sdk/client-kafkaconnect', () => {
  return {
    NotFoundException: jest.fn(() => NotFoundExceptionMock),
    KafkaConnectClient: jest.fn(() => KafkaConnectClientMock),
    CreateConnectorCommand: jest.fn((cmd) => {
      return { ...cmd, command: 'CreateConnectorCommand' };
    }),
    CreateCustomPluginCommand: jest.fn(() => {
      return { command: 'CreateCustomPluginCommand' };
    }),
    DeleteConnectorCommand: jest.fn(() => {
      return { command: 'DeleteConnectorCommand' };
    }),
    DeleteCustomPluginCommand: jest.fn(() => {
      return { command: 'DeleteCustomPluginCommand' };
    }),
    DescribeConnectorCommand: jest.fn(() => {
      return { command: 'DescribeConnectorCommand' };
    }),
    DescribeCustomPluginCommand: jest.fn(() => {
      return { command: 'DescribeCustomPluginCommand' };
    }),
    ListConnectorsCommand: jest.fn(() => {
      return { command: 'ListConnectorsCommand' };
    }),
    ListCustomPluginsCommand: jest.fn(() => {
      return { command: 'ListCustomPluginsCommand' };
    }),
    UpdateConnectorCommand: jest.fn(() => {
      return { command: 'UpdateConnectorCommand' };
    }),
  };
});

jest.mock('fs', () => {
  return {
    readFileSync: jest.fn(() => {}),
    createWriteStream: () => {
      return {
        close: jest.fn(() => {}),
        on: (code: string, callback: () => {}) => {
          console.log('on ' + code);
          if (callback) {
            callback();
          }
        },
      };
    },
  };
});

import https from 'https';
import { CloudFormationCustomResourceEvent, Context } from 'aws-lambda';

jest.mock('https');
const emitter = new EventEmitter();
const httpIncomingMessage = {
  pipe: jest.fn(),
};

https.get = jest.fn().mockImplementation((uri, callback?) => {
  console.log('url:' + uri);
  if (callback) {
    callback(httpIncomingMessage);
  }
  return emitter;
});

process.env.SLEEP_SEC = '1';
process.env.MAX_N = '1';
process.env.AWS_REGION = 'us-east-1';
process.env.LOG_LEVEL = 'WARN';

import { handler as msk_sink_handler } from '../../../../src/ingestion-server/kafka-s3-connector/custom-resource/kafka-s3-sink-connector';

test('Create s3 sink - success', async () => {
  event.RequestType = 'Create';
  const response = await msk_sink_handler(
    event as CloudFormationCustomResourceEvent,
    c,
  );
  expect(response.Status).toEqual('SUCCESS');
});

test('Update s3 sink - success', async () => {
  event.RequestType = 'Update';
  const response = await msk_sink_handler(
    event as CloudFormationCustomResourceEvent,
    c,
  );
  expect(response.Status).toEqual('SUCCESS');
});

test('Delete s3 sink - success', async () => {
  event.RequestType = 'Delete';
  const response = await msk_sink_handler(
    event as CloudFormationCustomResourceEvent,
    c,
  );
  expect(response.Status).toEqual('SUCCESS');
});

test('Create s3 sink - failed', async () => {
  event.RequestType = 'Create';
  https.get = jest.fn().mockImplementation(() => {
    throw new Error('get err');
  });
  let error = false;
  try {
    await msk_sink_handler(event as CloudFormationCustomResourceEvent, c);
  } catch (e: any) {
    error = true;
  }
  expect(error).toBeTruthy();
});

test('Update s3 sink existing - success', async () => {
  KafkaConnectClientMock.send = jest.fn().mockImplementation((command: any) => {
    if (command.command == 'UpdateConnectorCommand') {
      throw new Error(
        'The specified parameter value is identical to the current value for the connector',
      );
    }
    return {
      connectors: [
        {
          connectorArn: 'arn:aws:test-connector',
          currentVersion: '1',
          connectorState: 'RUNNING',
        },
      ],
    };
  });

  event.RequestType = 'Update';
  const response = await msk_sink_handler(
    event as CloudFormationCustomResourceEvent,
    c,
  );
  expect(response.Status).toEqual('SUCCESS');
});

test('Update s3 sink  - error', async () => {
  KafkaConnectClientMock.send = jest.fn().mockImplementation((command: any) => {
    if (command.command == 'UpdateConnectorCommand') {
      throw new Error('update err message');
    }
    return {
      connectors: [
        {
          connectorArn: 'arn:aws:test-connector',
          currentVersion: '1',
          connectorState: 'RUNNING',
        },
      ],
    };
  });

  event.RequestType = 'Update';
  let error = false;
  try {
    await msk_sink_handler(event as CloudFormationCustomResourceEvent, c);
  } catch (e: any) {
    error = true;
  }
  expect(error).toBeTruthy();
});


test('Delete s3 sink plugin not found - success', async () => {
  KafkaConnectClientMock.send = jest.fn().mockImplementation((command: any) => {
    if (command.command == 'DescribeCustomPluginCommand') {
      throw new NotFoundExceptionMock();
    }
    return {
      connectors: [
        {
          connectorArn: 'arn:aws:test-connector',
          currentVersion: '1',
          connectorState: 'RUNNING',
        },
      ],

      customPlugins: [
        {
          customPluginArn: 'arn:aws:test-plugin',
          customPluginState: 'ACTIVE',
          name: '54bce910-Plugin-create-test-custom-resource54bce910',
        },
      ],
    };
  });
  event.RequestType = 'Delete';
  let error = false;
  try {
    await msk_sink_handler(event as CloudFormationCustomResourceEvent, c);
  } catch (e: any) {
    error = true;
  }
  expect(error).toBeFalsy();
});


test('Delete s3 sink describe plugin error - error', async () => {
  KafkaConnectClientMock.send = jest.fn().mockImplementation((command: any) => {
    if (command.command == 'DescribeCustomPluginCommand') {
      throw new Error('DescribeCustomPluginCommand error');
    }
    return {
      connectors: [
        {
          connectorArn: 'arn:aws:test-connector',
          currentVersion: '1',
          connectorState: 'RUNNING',
        },
      ],
      customPlugins: [
        {
          customPluginArn: 'arn:aws:test-plugin',
          customPluginState: 'ACTIVE',
          name: '54bce910-Plugin-create-test-custom-resource54bce910',
        },
      ],
    };
  });
  event.RequestType = 'Delete';
  let error = false;
  try {
    await msk_sink_handler(event as CloudFormationCustomResourceEvent, c);
  } catch (e: any) {
    error = true;
  }
  expect(error).toBeTruthy();
});

test('Delete s3 sink connector not found - success', async () => {
  KafkaConnectClientMock.send = jest.fn().mockImplementation((command: any) => {
    if (command.command == 'DescribeConnectorCommand') {
      throw new NotFoundExceptionMock();
    }
    return {
      connectors: [
        {
          connectorArn: 'arn:aws:test-connector',
          currentVersion: '1',
          connectorState: 'RUNNING',
        },
      ],

      customPlugins: [
        {
          customPluginArn: 'arn:aws:test-plugin',
          customPluginState: 'ACTIVE',
          name: '54bce910-Plugin-create-test-custom-resource54bce910',
        },
      ],
    };
  });
  event.RequestType = 'Delete';
  let error = false;
  try {
    await msk_sink_handler(event as CloudFormationCustomResourceEvent, c);
  } catch (e: any) {
    error = true;
  }
  expect(error).toBeFalsy();
});
