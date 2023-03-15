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


const sendMock = {
  send: jest.fn(() => {}),
};

const s3Mock={
  S3Client: jest.fn(() => sendMock),
  PutObjectCommand: jest.fn(() => {return { name: 'PutObjectCommand' };}),
  GetObjectCommand: jest.fn(() => {return { name: 'GetObjectCommand' };}),
  CopyObjectCommand: jest.fn(() => {return { name: 'CopyObjectCommand' };}),
  DeleteObjectsCommand: jest.fn(()=>{return { name: 'DeleteObjectsCommand' };}),
  ListObjectsV2Command: jest.fn(()=>{return { name: 'ListObjectsV2Command' };}),

};
jest.mock('@aws-sdk/client-s3', () => {
  return s3Mock;
});

import { copyS3Object, deleteObjectsByPrefix, putStringToS3, readS3ObjectAsJson } from '../../src/common/s3';

const testBucketName = 'test-bucket';
const testPrefix = 'test-prefix';

test('putStringToS3()', async ()=> {
  await putStringToS3('test string', testBucketName, testPrefix);
  expect(s3Mock.PutObjectCommand.mock.calls.length).toEqual(1);
});


test('readS3ObjectAsJson()', async ()=> {
  const obj = { test: 'testMe' };
  sendMock.send = jest.fn().mockImplementation((command: any) => {
    if (command.name == 'GetObjectCommand') {
      return {
        Body: {
          transformToString: ()=> {
            return JSON.stringify(obj);
          },
        },
      };
    }
    return {};

  });
  const readObj = await readS3ObjectAsJson(testBucketName, `${testPrefix}/test.json`);

  expect(readObj).toEqual(obj);
});


test('readS3ObjectAsJson() object not exist', async ()=> {
  sendMock.send = jest.fn().mockImplementation((command: any) => {
    if (command.name == 'GetObjectCommand') {
      throw new Error('The specified key does not exist.');
    }
    return {};

  });
  const readObj = await readS3ObjectAsJson(testBucketName, `${testPrefix}/test.json`);
  expect(readObj).toBeUndefined();
});


test('readS3ObjectAsJson() error', async ()=> {
  sendMock.send = jest.fn().mockImplementation((command: any) => {
    if (command.name == 'GetObjectCommand') {
      throw new Error('Error');
    }
    return {};
  });

  let error = false;
  try {
    await readS3ObjectAsJson(testBucketName, `${testPrefix}/test.json`);
  } catch ( e: any) {
    error = true;
  }
  expect(error).toBeTruthy();

});


test('copyS3Object()', async ()=> {
  await copyS3Object(`s3://${testBucketName}/${testPrefix}/test-src.txt`, `s3://${testBucketName}/${testPrefix}/test-dest.txt`);
  expect(s3Mock.CopyObjectCommand.mock.calls.length).toEqual(1);
});


test('deleteObjectsByPrefix()', async ()=> {
  sendMock.send = jest.fn().mockImplementation((command: any) => {
    if (command.name == 'ListObjectsV2Command') {
      return {
        Contents: [
          {
            Key: 'test/file.json',
          },
        ],
      };
    }
    return {};
  });

  await deleteObjectsByPrefix(testBucketName, testPrefix);
  expect(s3Mock.DeleteObjectsCommand.mock.calls.length).toEqual(1);
});


test('deleteObjectsByPrefix() - NextContinuationToken', async ()=> {
  sendMock.send = jest.fn().mockImplementationOnce((command: any) => {
    if (command.name == 'ListObjectsV2Command') {
      return {
        IsTruncated: true,
        NextContinuationToken: 'nextToken',
        Contents: [
          {
            Key: 'test/file1.json',
          },
        ],

      };
    }
    return {};
  }).mockImplementation((command: any) => {
    if (command.name == 'ListObjectsV2Command') {
      return {
        Contents: [
          {
            Key: 'test/file2.json',
          },
          {
            Key: 'test/file3.json',
          },
        ],

      };
    }
    return {};
  });

  const delCount = await deleteObjectsByPrefix(testBucketName, testPrefix);
  expect(s3Mock.DeleteObjectsCommand.mock.calls.length).toEqual(2);
  expect(delCount).toEqual(3);
});


