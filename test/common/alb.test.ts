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
  App,
  Stack,
} from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { ApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { setAccessLogForApplicationLoadBalancer } from '../../src/common/alb';

describe('ALB utility', () => {

  class StackProps {
    readonly bucketName?: string;
  }
  class TestStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
      super(scope, id);
      const bucket = props?.bucketName ? Bucket.fromBucketAttributes(this, 'Bucket', {
        bucketName: 'my-bucket',
      }) : new Bucket(this, 'Bucket');
      const vpc = new Vpc(this, 'vpc');
      const alb = new ApplicationLoadBalancer(this, 'LB', {
        vpc,
        internetFacing: true,
      });
      setAccessLogForApplicationLoadBalancer(this, {
        alb,
        albLogBucket: bucket,
        albLogPrefix: '/prefix',
      });
    }
  };


  test('Enable access logs for bucket created in stack', () => {
    const app = new App();

    const testStack = new TestStack(app, 'stack');

    const template = Template.fromStack(testStack);
    template.hasMapping('ALBServiceAccountMapping', {});
  });

  test('Enable access logs for bucket imported in stack', () => {
    const app = new App();

    const testStack = new TestStack(app, 'stack', {
      bucketName: 'my-bucket',
    });

    const template = Template.fromStack(testStack);
    expect(template.findMappings('ALBServiceAccountMapping')).toStrictEqual({});
  });
});