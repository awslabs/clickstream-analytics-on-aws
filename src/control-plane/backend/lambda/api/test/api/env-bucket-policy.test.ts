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
import request from 'supertest';
import {
  AllowIAMUserPutObejectPolicy,
  AllowLogDeliveryPutObejectPolicy,
  AllowIAMUserPutObejectPolicyInCN,
  AllowIAMUserPutObejectPolicyWithErrorUserId,
  AllowIAMUserPutObejectPolicyWithErrorPartition,
  AllowIAMUserPutObejectPolicyWithErrorBucket,
  AllowIAMUserPutObejectPolicyWithErrorBucketPrefix,
} from './ddb-mock';
import { app, server } from '../../index';
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
    const res = await request(app).get('/api/env/s3/checkalblogpolicy?region=us-east-1&bucket=EXAMPLE_BUCKET');
    expect(iamClient).toHaveReceivedCommandTimes(SimulateCustomPolicyCommand, 1);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        check: true,
      },
    });
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
    const res = await request(app).get('/api/env/s3/checkalblogpolicy?region=ap-southeast-4&bucket=EXAMPLE_BUCKET');
    expect(iamClient).toHaveReceivedCommandTimes(SimulateCustomPolicyCommand, 1);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        check: true,
      },
    });
  });
  it('Log Delivery PutObeject Policy with error region', async () => {
    s3Client.on(GetBucketPolicyCommand).resolves({
      Policy: AllowLogDeliveryPutObejectPolicy,
    });
    const res = await request(app).get('/api/env/s3/checkalblogpolicy?region=cn-north-1&bucket=EXAMPLE_BUCKET');
    expect(iamClient).toHaveReceivedCommandTimes(SimulateCustomPolicyCommand, 0);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        check: false,
      },
    });
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
    const res = await request(app).get('/api/env/s3/checkalblogpolicy?region=cn-north-1&bucket=EXAMPLE_BUCKET');
    expect(iamClient).toHaveReceivedCommandTimes(SimulateCustomPolicyCommand, 1);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        check: true,
      },
    });
  });
  it('IAM User PutObeject Policy with error userId', async () => {
    s3Client.on(GetBucketPolicyCommand).resolves({
      Policy: AllowIAMUserPutObejectPolicyWithErrorUserId,
    });
    const res = await request(app).get('/api/env/s3/checkalblogpolicy?region=us-east-1&bucket=EXAMPLE_BUCKET');
    expect(iamClient).toHaveReceivedCommandTimes(SimulateCustomPolicyCommand, 0);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        check: false,
      },
    });
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
    const res = await request(app).get('/api/env/s3/checkalblogpolicy?region=us-east-1&bucket=EXAMPLE_BUCKET');
    expect(iamClient).toHaveReceivedCommandTimes(SimulateCustomPolicyCommand, 1);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        check: false,
      },
    });
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
    const res = await request(app).get('/api/env/s3/checkalblogpolicy?region=us-east-1&bucket=EXAMPLE_BUCKET');
    expect(iamClient).toHaveReceivedCommandTimes(SimulateCustomPolicyCommand, 1);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        check: false,
      },
    });
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
    const res = await request(app).get('/api/env/s3/checkalblogpolicy?region=us-east-1&bucket=EXAMPLE_BUCKET');
    expect(iamClient).toHaveReceivedCommandTimes(SimulateCustomPolicyCommand, 1);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        check: false,
      },
    });
  });
  afterAll((done) => {
    server.close();
    done();
  });

});