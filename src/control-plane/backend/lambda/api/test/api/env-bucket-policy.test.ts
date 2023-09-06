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
  IAMClient,
  PolicyEvaluationDecisionType,
  SimulateCustomPolicyCommand,
} from '@aws-sdk/client-iam';
import { S3Client, GetBucketPolicyCommand } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import {
  AllowIAMUserPutObejectPolicy,
  AllowLogDeliveryPutObejectPolicy,
  AllowIAMUserPutObejectPolicyInCN,
  AllowIAMUserPutObejectPolicyWithErrorUserId,
  AllowIAMUserPutObejectPolicyWithErrorPartition,
  AllowIAMUserPutObejectPolicyWithErrorBucket,
  AllowIAMUserPutObejectPolicyWithErrorBucketPrefix,
} from './ddb-mock';
import { validateEnableAccessLogsForALB } from '../../common/stack-params-valid';
import 'aws-sdk-client-mock-jest';

const s3Client = mockClient(S3Client);
const iamClient = mockClient(IAMClient);


describe('S3 bucket policy test', () => {
  beforeEach(() => {
    s3Client.reset();
    iamClient.reset();
  });
  it('IAM User PutObeject Policy', async () => {
    s3Client.on(GetBucketPolicyCommand).resolves({
      Policy: AllowIAMUserPutObejectPolicy,
    });
    iamClient.on(SimulateCustomPolicyCommand).resolves({
      EvaluationResults: [
        {
          EvalActionName: '',
          EvalDecision: PolicyEvaluationDecisionType.ALLOWED,
        },
      ],
    });
    const res = await validateEnableAccessLogsForALB('us-east-1', 'EXAMPLE_BUCKET');
    expect(res).toEqual(true);
    expect(iamClient).toHaveReceivedCommandTimes(SimulateCustomPolicyCommand, 1);
  });
  it('Log Delivery PutObeject Policy', async () => {
    s3Client.on(GetBucketPolicyCommand).resolves({
      Policy: AllowLogDeliveryPutObejectPolicy,
    });
    iamClient.on(SimulateCustomPolicyCommand).resolves({
      EvaluationResults: [
        {
          EvalActionName: '',
          EvalDecision: PolicyEvaluationDecisionType.ALLOWED,
        },
      ],
    });
    const res = await validateEnableAccessLogsForALB('ap-southeast-4', 'EXAMPLE_BUCKET');
    expect(res).toEqual(true);
    expect(iamClient).toHaveReceivedCommandTimes(SimulateCustomPolicyCommand, 1);
  });
  it('Log Delivery PutObeject Policy with error region', async () => {
    s3Client.on(GetBucketPolicyCommand).resolves({
      Policy: AllowLogDeliveryPutObejectPolicy,
    });
    const res = await validateEnableAccessLogsForALB('cn-north-1', 'EXAMPLE_BUCKET');
    expect(res).toEqual(false);
    expect(iamClient).toHaveReceivedCommandTimes(SimulateCustomPolicyCommand, 0);
  });
  it('IAM User PutObeject Policy in china region', async () => {
    s3Client.on(GetBucketPolicyCommand).resolves({
      Policy: AllowIAMUserPutObejectPolicyInCN,
    });
    iamClient.on(SimulateCustomPolicyCommand).resolves({
      EvaluationResults: [
        {
          EvalActionName: '',
          EvalDecision: PolicyEvaluationDecisionType.ALLOWED,
        },
      ],
    });
    const res = await validateEnableAccessLogsForALB('cn-north-1', 'EXAMPLE_BUCKET');
    expect(res).toEqual(true);
    expect(iamClient).toHaveReceivedCommandTimes(SimulateCustomPolicyCommand, 1);
  });
  it('IAM User PutObeject Policy with error userId', async () => {
    s3Client.on(GetBucketPolicyCommand).resolves({
      Policy: AllowIAMUserPutObejectPolicyWithErrorUserId,
    });
    const res = await validateEnableAccessLogsForALB('us-east-1', 'EXAMPLE_BUCKET');
    expect(res).toEqual(false);
    expect(iamClient).toHaveReceivedCommandTimes(SimulateCustomPolicyCommand, 0);
  });
  it('IAM User PutObeject Policy with error bucket', async () => {
    s3Client.on(GetBucketPolicyCommand).resolves({
      Policy: AllowIAMUserPutObejectPolicyWithErrorBucket,
    });
    iamClient.on(SimulateCustomPolicyCommand).resolves({
      EvaluationResults: [
        {
          EvalActionName: '',
          EvalDecision: PolicyEvaluationDecisionType.EXPLICIT_DENY,
        },
      ],
    });
    const res = await validateEnableAccessLogsForALB('us-east-1', 'EXAMPLE_BUCKET');
    expect(res).toEqual(false);
    expect(iamClient).toHaveReceivedCommandTimes(SimulateCustomPolicyCommand, 1);
  });
  it('IAM User PutObeject Policy with error partition', async () => {
    s3Client.on(GetBucketPolicyCommand).resolves({
      Policy: AllowIAMUserPutObejectPolicyWithErrorPartition,
    });
    iamClient.on(SimulateCustomPolicyCommand).resolves({
      EvaluationResults: [
        {
          EvalActionName: '',
          EvalDecision: PolicyEvaluationDecisionType.EXPLICIT_DENY,
        },
      ],
    });
    const res = await validateEnableAccessLogsForALB('us-east-1', 'EXAMPLE_BUCKET');
    expect(res).toEqual(false);
    expect(iamClient).toHaveReceivedCommandTimes(SimulateCustomPolicyCommand, 1);
  });
  it('IAM User PutObeject Policy with error bucket prefix', async () => {
    s3Client.on(GetBucketPolicyCommand).resolves({
      Policy: AllowIAMUserPutObejectPolicyWithErrorBucketPrefix,
    });
    iamClient.on(SimulateCustomPolicyCommand).resolves({
      EvaluationResults: [
        {
          EvalActionName: '',
          EvalDecision: PolicyEvaluationDecisionType.EXPLICIT_DENY,
        },
      ],
    });
    const res = await validateEnableAccessLogsForALB('us-east-1', 'EXAMPLE_BUCKET');
    expect(res).toEqual(false);
    expect(iamClient).toHaveReceivedCommandTimes(SimulateCustomPolicyCommand, 1);
  });
  afterAll((done) => {
    done();
  });

});