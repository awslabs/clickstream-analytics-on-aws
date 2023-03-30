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
    s3PathPluginJars: 's3://my-bucket/my-test-prefix/jar/plugin1.jar,s3://my-bucket/my-test-prefix/jar/plugin2.jar',
    s3PathPluginFiles: 's3://my-bucket/my-test-prefix/files/file1.mmdb,s3://my-bucket/my-test-prefix/files/file2.mmdb',
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

const DeleteObjectsCommandMock = jest.fn(()=>{return { name: 'DeleteObjectsCommand' };});
jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn(() => S3ClientMock),
    CopyObjectCommand: jest.fn(() => {return { name: 'CopyObjectCommand' };}),
    DeleteObjectsCommand: DeleteObjectsCommandMock,
    ListObjectsV2Command: jest.fn(()=>{return { name: 'ListObjectsV2Command' };}),
  };
});

import { CloudFormationCustomResourceEvent, Context } from 'aws-lambda';

process.env.AWS_REGION = 'us-east-1';
process.env.STACK_ID = 'test-stack-id';
process.env.POWERTOOLS_SERVICE_NAME = 'Jest TEST';
process.env.LOG_LEVEL = 'INFO';
process.env.PIPELINE_S3_BUCKET_NAME = 'test-pipeline-bucket',
process.env.PIPELINE_S3_PREFIX = 'test-prefix/';
process.env.PROJECT_ID = 'test_project_id';

import { handler } from '../../src/data-pipeline/lambda/copy-assets';

test('CloudFormation Create ', async () => {
  event.RequestType = 'Create';
  const response = (await handler(
    event as CloudFormationCustomResourceEvent,
    c,
  )) as any;
  expect(response.Data).toEqual({
    s3PathPluginJars: 's3://test-pipeline-bucket/test-prefix/test-stack-id/test_project_id/custom-plugins/jars/plugin1.jar,s3://test-pipeline-bucket/test-prefix/test-stack-id/test_project_id/custom-plugins/jars/plugin2.jar',
    s3PathPluginFiles: 's3://test-pipeline-bucket/test-prefix/test-stack-id/test_project_id/custom-plugins/files/file1.mmdb,s3://test-pipeline-bucket/test-prefix/test-stack-id/test_project_id/custom-plugins/files/file2.mmdb',
  });
});

test('CloudFormation Update ', async () => {
  event.RequestType = 'Update';
  const response = (await handler(
    event as CloudFormationCustomResourceEvent,
    c,
  )) as any;
  expect(response.Data).toEqual({
    s3PathPluginJars: 's3://test-pipeline-bucket/test-prefix/test-stack-id/test_project_id/custom-plugins/jars/plugin1.jar,s3://test-pipeline-bucket/test-prefix/test-stack-id/test_project_id/custom-plugins/jars/plugin2.jar',
    s3PathPluginFiles: 's3://test-pipeline-bucket/test-prefix/test-stack-id/test_project_id/custom-plugins/files/file1.mmdb,s3://test-pipeline-bucket/test-prefix/test-stack-id/test_project_id/custom-plugins/files/file2.mmdb',
  });
});

test('CloudFormation Delete ', async () => {
  S3ClientMock.send = jest.fn().mockImplementation((command: any) => {
    if (command.name === 'ListObjectsV2Command') {
      return {
        Contents: [
          {
            Key: 'test-prefix/test-stack-id/test_project_id/custom-plugins/jars/plugin1.jar',
          },
        ],
      };
    }
    return {};
  });
  event.RequestType = 'Delete';
  await handler(event as CloudFormationCustomResourceEvent, c);
  // delete jars and delete files
  expect(DeleteObjectsCommandMock.mock.calls.length).toEqual(2);
});
