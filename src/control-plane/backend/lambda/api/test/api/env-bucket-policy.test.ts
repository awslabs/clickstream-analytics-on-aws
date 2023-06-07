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

import { S3Client, GetBucketPolicyCommand } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import request from 'supertest';
import { app, server } from '../../index';

const s3Client = mockClient(S3Client);

const AllowIAMUserPutObejectPolicy = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::127311923021:root"},"Action":["s3:PutObject","s3:PutObjectLegalHold","s3:PutObjectRetention","s3:PutObjectTagging","s3:PutObjectVersionTagging","s3:Abort*"],"Resource":"arn:aws:s3:::EXAMPLE_BUCKET/clickstream/*"}]}';
const AllowLogDeliveryPutObejectPolicy = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"logdelivery.elasticloadbalancing.amazonaws.com"},"Action":["s3:PutObject","s3:PutObjectLegalHold","s3:PutObjectRetention","s3:PutObjectTagging","s3:PutObjectVersionTagging","s3:Abort*"],"Resource":"arn:aws:s3:::EXAMPLE_BUCKET/clickstream/*"}]}';
const AllowIAMUserPutObejectPolicyInCN = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":"arn:aws-cn:iam::638102146993:root"},"Action":["s3:PutObject","s3:PutObjectLegalHold","s3:PutObjectRetention","s3:PutObjectTagging","s3:PutObjectVersionTagging","s3:Abort*"],"Resource":"arn:aws-cn:s3:::EXAMPLE_BUCKET/clickstream/*"}]}';
const AllowIAMUserPutObejectPolicyWithErrorUserId = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::555555555555:root"},"Action":["s3:PutObject","s3:PutObjectLegalHold","s3:PutObjectRetention","s3:PutObjectTagging","s3:PutObjectVersionTagging","s3:Abort*"],"Resource":"arn:aws:s3:::EXAMPLE_BUCKET/clickstream/*"},{"Effect":"Allow","Principal":{"Service":"logdelivery.elasticloadbalancing.amazonaws.com"},"Action":["s3:PutObject","s3:PutObjectLegalHold","s3:PutObjectRetention","s3:PutObjectTagging","s3:PutObjectVersionTagging","s3:Abort*"],"Resource":"arn:aws:s3:::EXAMPLE_BUCKET/clickstream/*"}]}';
const AllowIAMUserPutObejectPolicyWithErrorPartition = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::127311923021:root"},"Action":["s3:PutObject","s3:PutObjectLegalHold","s3:PutObjectRetention","s3:PutObjectTagging","s3:PutObjectVersionTagging","s3:Abort*"],"Resource":"arn:aws-cn:s3:::EXAMPLE_BUCKET/clickstream/*"}]}';
const AllowIAMUserPutObejectPolicyWithErrorBucket = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::127311923021:root"},"Action":["s3:PutObject","s3:PutObjectLegalHold","s3:PutObjectRetention","s3:PutObjectTagging","s3:PutObjectVersionTagging","s3:Abort*"],"Resource":"arn:aws:s3:::EXAMPLE_BUCKET1/clickstream/*"}]}';
const AllowIAMUserPutObejectPolicyWithErrorBucketPrefix = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::127311923021:root"},"Action":["s3:PutObject","s3:PutObjectLegalHold","s3:PutObjectRetention","s3:PutObjectTagging","s3:PutObjectVersionTagging","s3:Abort*"],"Resource":"arn:aws:s3:::EXAMPLE_BUCKET/*"}]}';
export const AllowIAMUserPutObejectPolicyWithErrorService = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"errorservice.elasticloadbalancing.amazonaws.com"},"Action":["s3:PutObject","s3:PutObjectLegalHold","s3:PutObjectRetention","s3:PutObjectTagging","s3:PutObjectVersionTagging","s3:Abort*"],"Resource":"arn:aws:s3:::EXAMPLE_BUCKET/clickstream/*"}]}';
export const AllowIAMUserPutObejectPolicyInApSouthEast1 = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::114774131450:root"},"Action":["s3:PutObject","s3:PutObjectLegalHold","s3:PutObjectRetention","s3:PutObjectTagging","s3:PutObjectVersionTagging","s3:Abort*"],"Resource":"arn:aws:s3:::EXAMPLE_BUCKET/clickstream/*"}]}';


describe('Account Env test', () => {
  beforeEach(() => {
    s3Client.reset();
  });
  it('Check bucket policy', async () => {
    s3Client.on(GetBucketPolicyCommand).resolves({
      Policy: AllowIAMUserPutObejectPolicy,
    });
    let res = await request(app).get('/api/env/s3/checkalblogpolicy?region=us-east-1&bucket=EXAMPLE_BUCKET');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        check: true,
      },
    });

    s3Client.on(GetBucketPolicyCommand).resolves({
      Policy: AllowLogDeliveryPutObejectPolicy,
    });
    res = await request(app).get('/api/env/s3/checkalblogpolicy?region=MOCK_NO_REGION&bucket=EXAMPLE_BUCKET');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        check: true,
      },
    });

    s3Client.on(GetBucketPolicyCommand).resolves({
      Policy: AllowLogDeliveryPutObejectPolicy,
    });
    res = await request(app).get('/api/env/s3/checkalblogpolicy?region=cn-north-1&bucket=EXAMPLE_BUCKET');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        check: false,
      },
    });

    s3Client.on(GetBucketPolicyCommand).resolves({
      Policy: AllowIAMUserPutObejectPolicyInCN,
    });
    res = await request(app).get('/api/env/s3/checkalblogpolicy?region=cn-north-1&bucket=EXAMPLE_BUCKET');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        check: true,
      },
    });

    s3Client.on(GetBucketPolicyCommand).resolves({
      Policy: AllowIAMUserPutObejectPolicyWithErrorUserId,
    });
    res = await request(app).get('/api/env/s3/checkalblogpolicy?region=us-east-1&bucket=EXAMPLE_BUCKET');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        check: false,
      },
    });

    s3Client.on(GetBucketPolicyCommand).resolves({
      Policy: AllowIAMUserPutObejectPolicyWithErrorBucket,
    });
    res = await request(app).get('/api/env/s3/checkalblogpolicy?region=us-east-1&bucket=EXAMPLE_BUCKET');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        check: false,
      },
    });

    s3Client.on(GetBucketPolicyCommand).resolves({
      Policy: AllowIAMUserPutObejectPolicyWithErrorPartition,
    });
    res = await request(app).get('/api/env/s3/checkalblogpolicy?region=us-east-1&bucket=EXAMPLE_BUCKET');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        check: false,
      },
    });

    s3Client.on(GetBucketPolicyCommand).resolves({
      Policy: AllowIAMUserPutObejectPolicyWithErrorBucketPrefix,
    });
    res = await request(app).get('/api/env/s3/checkalblogpolicy?region=us-east-1&bucket=EXAMPLE_BUCKET');
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