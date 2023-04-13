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

import { promisify } from 'util';
import { gzip } from 'zlib';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { KinesisStreamEvent, KinesisStreamRecord } from 'aws-lambda';
import { v4 as uuid_v4 } from 'uuid';
import { logger } from '../../../common/powertools';

const region = process.env.AWS_REGION;
const s3Bucket = process.env.S3_BUCKET;
const s3Prefix = process.env.S3_PREFIX;
const s3Client = new S3Client({ region });

export const handler = async (event: KinesisStreamEvent) => {
  const d = new Date().toISOString(); //'2023-02-17T03:17:54.522Z'
  const yyyy = d.split('-')[0];
  const MM = d.split('-')[1];
  const dd = d.split('-')[2].split('T')[0];
  const HH = d.split('-')[2].split('T')[1].split(':')[0];

  const partition = `year=${yyyy}/month=${MM}/day=${dd}/hour=${HH}`;
  const dataLines = [];
  for (const record of event.Records) {
    try {
      dataLines.push(recordToJsonLine(record));
    } catch (e: any) {
      logger.error(e);
    }
  }
  logger.info('dataLines length: ' + dataLines.length);
  if (dataLines.length > 0) {
    const fileName = `${uuid_v4()}.gz`;
    const key = `${s3Prefix}${partition}/${fileName}`;
    await stringToS3(dataLines, key);
  }
};

async function stringToS3(dataLines: string[], key: string) {
  const buff = Buffer.from(dataLines.join('\n'), 'utf-8');
  const zippedContent = await promisify(gzip)(buff);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: s3Bucket,
      Key: key,
      Body: zippedContent,
      ContentType: 'application/x-gzip',
    }),
  );
  logger.info(`put file s3://${s3Bucket}/${key}`);
}

function recordToJsonLine(record: KinesisStreamRecord): string {
  const stringData = decode(record.kinesis.data);
  const oneLineJsonData = JSON.stringify(JSON.parse(stringData));
  return oneLineJsonData;
}

function decode(b64string: string): string {
  return Buffer.from(b64string, 'base64').toString('utf-8');
}
