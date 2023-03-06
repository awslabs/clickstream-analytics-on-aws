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

import { S3Client, ListBucketsCommand, Bucket } from '@aws-sdk/client-s3';

export interface ClickStreamBucket {
  readonly name: string | undefined;
}

export const listBuckets = async () => {
  const s3Client = new S3Client({});
  const params: ListBucketsCommand = new ListBucketsCommand({});
  const result = await s3Client.send(params);
  const buckets: ClickStreamBucket[] = [];
  if (result.Buckets) {
    for (let index in result.Buckets as Bucket[]) {
      buckets.push({
        name: result.Buckets[index].Name,
      });
    }
  }
  return buckets;
};
