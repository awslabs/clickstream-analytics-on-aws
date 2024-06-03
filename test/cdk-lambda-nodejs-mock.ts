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
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';


export const MOCK_LAMBDA_CODE_S3_BUCKET = 'example-bucket';
export const MOCK_LAMBDA_CODE_S3_KEY = 'mock-index.ts';

/**
 * NodejsFunction Mock
 *
 * Running NodejsFunction for CDK tests is extremely slow, as it requires Parcel Bundler to run inside docker. Instead
 * we use the Lambda Function class that it is based on, with code from a fake
 * S3 bucket.
 */
export class NodejsFunction extends Function {
  constructor(scope: Construct, id: string, props: NodejsFunctionProps) {
    // Mock bucket
    const bucket = Bucket.fromBucketArn(
      scope,
      `${id}MockBucket`,
      `arn:aws:s3:::${MOCK_LAMBDA_CODE_S3_BUCKET}`,
    );

    const handler = props.handler ?? 'handler';
    // Create a Lambda Function without the real code generated using Parcel/Docker
    super(scope, id, {
      // Use other props
      ...props,
      // Required values if not set for LambdaFunction
      runtime: props.runtime ?? Runtime.NODEJS_20_X,
      // https://github.com/aws/aws-cdk/blob/main/packages/aws-cdk-lib/aws-lambda-nodejs/lib/function.ts#L116C16-L116C79
      handler: handler.indexOf('.') !== -1 ? `${handler}` : `index.${handler}`,
      // Set code with mock s3 location
      code: Code.fromBucket(bucket, MOCK_LAMBDA_CODE_S3_KEY),
      environment: {
        ...props.environment,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },

    });
  }
}