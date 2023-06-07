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

import {
  S3Client,
  ListBucketsCommand,
  GetBucketLocationCommand,
  GetBucketLocationCommandOutput,
  Bucket,
  GetObjectCommand,
  GetBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import pLimit from 'p-limit';
import { aws_sdk_client_common_config } from '../../common/sdk-client-config-ln';
import { ClickStreamBucket } from '../../common/types';

const promisePool = pLimit(20);

export const listBuckets = async (region: string) => {
  const s3Client = new S3Client({
    ...aws_sdk_client_common_config,
  });
  const params: ListBucketsCommand = new ListBucketsCommand({});
  const result = await s3Client.send(params);
  const buckets: ClickStreamBucket[] = [];
  if (result.Buckets) {
    const input = [];
    for (let bucket of result.Buckets as Bucket[]) {
      const bucketName = bucket.Name;
      if (bucketName) {
        input.push(promisePool(() => {
          return s3Client.send(new GetBucketLocationCommand({
            Bucket: bucketName,
          })).then(res => {
            buckets.push({
              name: bucketName,
              location: (res as GetBucketLocationCommandOutput).LocationConstraint ?? 'us-east-1',
            });
          }).catch(_ => {
            return;
          });
        }));
      }
    }
    await Promise.all(input);
  }
  if (region) {
    return buckets.filter((obj) => {
      return obj.location === region;
    });
  }

  return buckets;
};

export async function getS3Object(region: string, bucket: string, key: string): Promise<any> {
  const streamToString = (stream: any) => new Promise((resolve, reject) => {
    const chunks: any = [];
    stream.on('data', (chunk: any) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  try {
    const s3Client = new S3Client({
      ...aws_sdk_client_common_config,
      region,
    });
    const { Body } = await s3Client.send(command);
    const bodyContents = await streamToString(Body);
    return bodyContents;
  } catch (error) {
    return undefined;
  }
}

export const getS3BucketPolicy = async (region: string, bucket: string) => {
  try {
    const s3Client = new S3Client({
      ...aws_sdk_client_common_config,
      region,
    });
    const params: GetBucketPolicyCommand = new GetBucketPolicyCommand({
      Bucket: bucket,
    });
    const result = await s3Client.send(params);
    return result.Policy;
  } catch (error) {
    return undefined;
  }
};
