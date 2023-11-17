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

import { createInterface } from 'readline';
import { Readable } from 'stream';
import { createGunzip } from 'zlib';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  ObjectIdentifier,
  NoSuchKey,
  _Object,
} from '@aws-sdk/client-s3';
import { logger } from './powertools';
import { aws_sdk_client_common_config } from './sdk-client-config';


const s3Client = new S3Client({
  ...aws_sdk_client_common_config,
});

export async function putStringToS3(
  content: string,
  bucketName: string,
  key: string,
) {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: content,
    }),
  );
  logger.info(`save content to s3://${bucketName}/${key}`);
}

export async function readS3ObjectAsJson(bucketName: string, key: string) {
  logger.info(`readS3ObjectAsJson: s3://${bucketName}/${key}`);
  try {
    const res = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      }),
    );
    if (res.Body) {
      const jsonStr = await res.Body.transformToString('utf-8');
      return JSON.parse(jsonStr);
    } else {
      return;
    }
  } catch (e) {
    return handleNoSuchKeyError(e);
  }
}

export async function processS3GzipObjectLineByLine(bucketName: string, key: string,
  lineProcess: (line: string) => void): Promise<void> {

  logger.info(`processS3GzipObjectLineByLine: s3://${bucketName}/${key}`);
  try {
    const res = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      }),
    );
    if (res.Body) {
      return await new Promise((resolve, reject) => {
        const readableStream = res.Body as Readable;
        let lineReader = createInterface({
          input: readableStream.pipe(createGunzip()),
        });
        lineReader.on('line', lineProcess);
        lineReader.on('error', reject);
        lineReader.on('close', ()=> {
          logger.info('read all lines done');
          return resolve();
        });
      });

    } else {
      return;
    }
  } catch (e) {
    return handleNoSuchKeyError(e);
  }
}

export async function copyS3Object(sourceS3Uri: string, destS3Uri: string) {
  const s = new RegExp(/s3:\/\/([^/]+)\/(.*)/).exec(sourceS3Uri);
  const d = new RegExp(/s3:\/\/([^/]+)\/(.*)/).exec(destS3Uri);
  if (d && s) {
    const destBucket = d[1];
    const destKey = d[2];
    const sourceBucket = s[1];
    const sourceKey = s[2];
    const CopySource = `/${sourceBucket}/${encodeURIComponent(sourceKey)}`;

    await s3Client.send(
      new CopyObjectCommand({
        Bucket: destBucket,
        Key: destKey,
        CopySource,
      }),
    );
    logger.info(`copied ${sourceS3Uri} ${destS3Uri}`);
    return;
  }
  throw Error('invalid s3 uri ' + sourceS3Uri + ' or ' + destS3Uri);
}

export async function deleteObjectsByPrefix(
  bucketName: string,
  prefix: string,
) {
  let delCount = 0;
  let listObjectsCommand = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: prefix,
  });

  while (true) {
    const output =
      await s3Client.send(listObjectsCommand);
    if (output.Contents) {
      const objectKeys: ObjectIdentifier[] = output.Contents.map((object) => {
        return { Key: object.Key };
      });

      const deleteObjectsCommand = new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: { Objects: objectKeys },
      });
      await s3Client.send(deleteObjectsCommand);
      logger.info(
        `Deleted ${objectKeys.length} objects with prefix "${prefix}", IsTruncated: ${!!output.IsTruncated}`,
      );
      delCount += objectKeys.length;
    } else {
      break;
    }
    if (!output.IsTruncated) {
      break;
    }
    listObjectsCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      ContinuationToken: output.NextContinuationToken,
    });
  }
  logger.info(
    `${delCount} objects were deleted in bucket=${bucketName}, prefix=${prefix}`,
  );
  return delCount;
}


export async function listObjectsByPrefix(
  bucketName: string,
  prefix: string,
  process: (obj: _Object) => void,
) {
  let listObjectsCommand = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: prefix,
  });

  while (true) {
    const output =
      await s3Client.send(listObjectsCommand);
    if (output.Contents) {
      output.Contents.forEach(obj => process(obj));
    } else {
      break;
    }
    if (!output.IsTruncated) {
      break;
    }
    listObjectsCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      ContinuationToken: output.NextContinuationToken,
    });
  }
}

// @ts-ignore
function handleNoSuchKeyError(e): undefined {
  if (e instanceof NoSuchKey) {
    logger.warn('file does not exist');
    return;
  }
  logger.error(e);
  throw e;
}