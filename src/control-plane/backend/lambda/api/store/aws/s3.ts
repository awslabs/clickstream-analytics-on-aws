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

import { S3Client, ListBucketsCommand, GetBucketLocationCommand, GetBucketLocationCommandOutput, Bucket } from '@aws-sdk/client-s3';
import pLimit from 'p-limit';

const promisePool = pLimit(50);

export interface ClickStreamBucket {
  readonly name: string;
  readonly location: string;
}

export const listBuckets = async (region: string) => {
  const s3Client = new S3Client({});
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
