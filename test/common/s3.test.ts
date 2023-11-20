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

import { Readable, PassThrough } from 'stream';
import util from 'util';
import zlib from 'zlib';
import { CopyObjectCommand, DeleteObjectsCommand, GetObjectCommand, ListObjectsV2Command, NoSuchKey, PutObjectCommand, S3Client, _Object } from '@aws-sdk/client-s3';
import { sdkStreamMixin } from '@smithy/util-stream-node';
import { mockClient } from 'aws-sdk-client-mock';
import { copyS3Object, deleteObjectsByPrefix, listObjectsByPrefix, processS3GzipObjectLineByLine, putStringToS3, readS3ObjectAsJson } from '../../src/common/s3';
import 'aws-sdk-client-mock-jest';

const gzip = util.promisify(zlib.gzip);

const s3ClientMock = mockClient(S3Client);

const testBucketName = 'test-bucket';
const testPrefix = 'test-prefix';

beforeEach(() => {
  s3ClientMock.reset();
});

test('putStringToS3()', async ()=> {
  await putStringToS3('test string', testBucketName, testPrefix);
  expect(s3ClientMock).toHaveReceivedCommand(PutObjectCommand);
});

test('readS3ObjectAsJson()', async ()=> {
  const obj = { test: 'testMe' };

  const stream = new Readable();
  stream.push(JSON.stringify(obj));
  stream.push(null);
  // wrap the Stream with SDK mixin
  const sdkStream = sdkStreamMixin(stream);

  s3ClientMock.on(GetObjectCommand).resolves(
    {
      Body: sdkStream,
    },
  );

  const readObj = await readS3ObjectAsJson(testBucketName, `${testPrefix}/test.json`);
  expect(readObj).toEqual(obj);
});


test('readS3ObjectAsJson() object not exist', async ()=> {
  // @ts-ignore
  const err = new NoSuchKey();

  s3ClientMock.on(GetObjectCommand).rejects(err);
  const readObj = await readS3ObjectAsJson(testBucketName, `${testPrefix}/test.json`);
  expect(readObj).toBeUndefined();
});


test('readS3ObjectAsJson() error', async ()=> {
  const err = new Error('error');
  s3ClientMock.on(GetObjectCommand).rejects(err);

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
  expect(s3ClientMock).toHaveReceivedCommand(CopyObjectCommand);
});


test('deleteObjectsByPrefix()', async ()=> {
  s3ClientMock.on(ListObjectsV2Command).resolvesOnce({
    IsTruncated: false,
    Contents: [
      {
        Key: 'test/file.json',
      },
    ],
  });

  await deleteObjectsByPrefix(testBucketName, testPrefix);
  expect(s3ClientMock).toHaveReceivedCommand(DeleteObjectsCommand);
});


test('deleteObjectsByPrefix() - NextContinuationToken', async ()=> {
  s3ClientMock.on(ListObjectsV2Command).resolvesOnce({
    IsTruncated: true,
    Contents: [
      {
        Key: 'test/file.json',
      },
    ],
  }).resolvesOnce(
    {
      IsTruncated: false,
      Contents: [
        {
          Key: 'test/file2.json',
        },
        {
          Key: 'test/file3.json',
        },
      ],
    },
  );

  const delCount = await deleteObjectsByPrefix(testBucketName, testPrefix);
  expect(delCount).toEqual(3);
  expect(s3ClientMock).toHaveReceivedCommandTimes(DeleteObjectsCommand, 2);

});

test('processS3GzipObjectLineByLine()', async ()=> {
  const logText = [
    '23/04/04 02:43:02 INFO ETLRunner: [ETLMetric]source dataset count:1',
    '23/04/04 02:43:07 INFO Transformer: [ETLMetric]transform enter dataset count:123',
    '23/04/04 02:43:11 INFO Cleaner: [ETLMetric]clean enter dataset count:123',
    '23/04/04 02:43:11 INFO Cleaner: [ETLMetric]corrupted dataset count:4',
    '23/04/04 02:43:15 INFO Cleaner: [ETLMetric]after decodeDataColumn dataset count:123',
    '23/04/04 02:43:20 INFO Cleaner: [ETLMetric]flatted source dataset count:2',
    '23/04/04 02:43:24 INFO Cleaner: [ETLMetric]after load data schema dataset count:123',
    '23/04/04 02:43:33 INFO Cleaner: [ETLMetric]after processCorruptRecords dataset count:123',
    '23/04/04 02:43:36 INFO Cleaner: [ETLMetric]after processDataColumnSchema dataset count:123',
    '23/04/04 02:43:42 INFO Cleaner: [ETLMetric]after filterByDataFreshness dataset count:123',
    '23/04/04 02:43:46 INFO Cleaner: [ETLMetric]after filterByAppIds dataset count:123',
    '23/04/04 02:43:50 INFO Cleaner: [ETLMetric]after filter dataset count:123',
    '23/04/04 02:43:54 INFO Transformer: [ETLMetric]after clean dataset count:999',
    '23/04/04 02:43:59 INFO Transformer: [ETLMetric]transform return dataset count:123',
    '23/04/04 02:44:05 INFO ETLRunner: [ETLMetric]after software.aws.solution.clickstream.TransformerV2 dataset count:123',
    '23/04/04 02:44:20 INFO ETLRunner: [ETLMetric]writeResult dataset count:1000',
    '23/04/04 02:44:32 INFO ETLRunner: [ETLMetric]sink dataset count:3',
  ].join('\n');

  const zipBuff = await gzip(logText);
  const bufferStream = new PassThrough();
  s3ClientMock.on(GetObjectCommand).resolves({
    Body: bufferStream.end(zipBuff),
  } as any);

  let lineCount = 0;
  const testProcess = (line: string) => {
    if (line.includes('ETLRunner')) {
      lineCount++;
    }
  };
  await processS3GzipObjectLineByLine(testBucketName, testPrefix, testProcess);
  expect(lineCount).toEqual(4);

});

test('listObjectsByPrefix()', async ()=> {
  s3ClientMock.on(ListObjectsV2Command).resolvesOnce({
    IsTruncated: true,
    Contents: [
      {
        Key: 'test/file.json',
        Size: 1024,
        LastModified: new Date(),
      },
    ],
  }).resolvesOnce(
    {
      IsTruncated: false,
      Contents: [
        {
          Key: 'test/file2.json',
          Size: 1024,
          LastModified: new Date(),
        },
        {
          Key: 'test/file3.json',
          Size: 1024,
          LastModified: new Date(),
        },
        {
          Key: 'test/_.json',
          Size: 0,
          LastModified: new Date(),
        },
      ],
    },
  );

  let objectCount = 0;
  let totalSize = 0;
  await listObjectsByPrefix(testBucketName, testPrefix, (obj: _Object) => {
    objectCount++;
    totalSize +=obj.Size!;
  });

  expect(objectCount).toEqual(4);
  expect(totalSize).toEqual(3072);
});

