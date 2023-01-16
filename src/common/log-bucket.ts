/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { RemovalPolicy } from 'aws-cdk-lib';
import { BucketEncryption, BlockPublicAccess, IBucket, Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface LogProps {
  logPrefix?: string;
  encryption?: BucketEncryption;
  enforceSSL?: boolean;
  autoDeleteObjects?: boolean;
  removalPolicy?: RemovalPolicy;
}

/**
 * Create S3 buckt for service log
 */
export class LogBucket extends Construct {

  public readonly bucket: IBucket;

  constructor(scope: Construct, id: string, props?: LogProps) {
    super(scope, id);

    this.bucket = new Bucket(this, 'LogBucket', {
      encryption: props?.encryption ?? BucketEncryption.S3_MANAGED,
      enforceSSL: props?.enforceSSL ?? true,
      autoDeleteObjects: props?.autoDeleteObjects ?? false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: props?.removalPolicy ?? RemovalPolicy.RETAIN,
      serverAccessLogsPrefix: props?.logPrefix ?? 'log-bucket-access-logs',
    });
  }
}
