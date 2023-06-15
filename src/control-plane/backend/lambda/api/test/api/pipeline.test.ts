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

import { DescribeStacksCommand, CloudFormationClient, StackStatus } from '@aws-sdk/client-cloudformation';
import { TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
import {
  EC2Client,
  DescribeSubnetsCommand,
  DescribeRouteTablesCommand,
  DescribeVpcEndpointsCommand,
  DescribeSecurityGroupRulesCommand,
} from '@aws-sdk/client-ec2';
import { KafkaClient } from '@aws-sdk/client-kafka';
import {
  DescribeAccountSubscriptionCommand,
  QuickSightClient,
} from '@aws-sdk/client-quicksight';
import {
  RedshiftClient,
} from '@aws-sdk/client-redshift';
import {
  RedshiftServerlessClient,
} from '@aws-sdk/client-redshift-serverless';
import {
  GetBucketPolicyCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { DescribeExecutionCommand, ExecutionStatus, SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { DynamoDBDocumentClient, GetCommand, GetCommandInput, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import request from 'supertest';
import {
  createPipelineMock,
  dictionaryMock,
  MOCK_PIPELINE_ID,
  MOCK_PLUGIN_ID,
  MOCK_PROJECT_ID,
  MOCK_TOKEN,
  pipelineExistedMock,
  projectExistedMock,
  tokenMock,
} from './ddb-mock';
import {
  KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE,
  KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW,
  S3_INGESTION_PIPELINE,
  KINESIS_DATA_PROCESSING_NEW_REDSHIFT_QUICKSIGHT_PIPELINE,
  KINESIS_DATA_PROCESSING_PROVISIONED_REDSHIFT_EMPTY_DBUSER_QUICKSIGHT_PIPELINE,
  KINESIS_DATA_PROCESSING_NEW_REDSHIFT_UPDATE_PIPELINE_WITH_WORKFLOW,
  KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW_FOR_UPGRADE,
  KINESIS_DATA_PROCESSING_PROVISIONED_REDSHIFT_QUICKSIGHT_PIPELINE,
  S3_INGESTION_HTTP_AUTHENTICATION_PIPELINE,
  KINESIS_DATA_PROCESSING_NEW_REDSHIFT_WITH_ERROR_RPU_PIPELINE,
} from './pipeline-mock';
import { clickStreamTableName, dictionaryTableName } from '../../common/constants';
import { app, server } from '../../index';
import 'aws-sdk-client-mock-jest';

const ddbMock = mockClient(DynamoDBDocumentClient);
const sfnMock = mockClient(SFNClient);
const cloudFormationMock = mockClient(CloudFormationClient);
const kafkaMock = mockClient(KafkaClient);
const redshiftMock = mockClient(RedshiftClient);
const redshiftServerlessMock = mockClient(RedshiftServerlessClient);
const secretsManagerMock = mockClient(SecretsManagerClient);
const ec2Mock = mockClient(EC2Client);
const quickSightMock = mockClient(QuickSightClient);
const s3Mock = mockClient(S3Client);


describe('Pipeline test', () => {
  beforeEach(() => {
    ddbMock.reset();
    sfnMock.reset();
    cloudFormationMock.reset();
    kafkaMock.reset();
    redshiftMock.reset();
    redshiftServerlessMock.reset();
    secretsManagerMock.reset();
    ec2Mock.reset();
    quickSightMock.reset();
    s3Mock.reset();
  });
  it('Create pipeline', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock,
      ec2Mock, sfnMock, secretsManagerMock, quickSightMock, s3Mock, {
        publicAZContainPrivateAZ: true,
        subnetsCross3AZ: true,
        subnetsIsolated: true,
      });
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_QUICKSIGHT_PIPELINE,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.message).toEqual('Pipeline added.');
    expect(res.body.success).toEqual(true);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeVpcEndpointsCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeSecurityGroupRulesCommand, 2);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeSubnetsCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeRouteTablesCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);
  });
  it('Create pipeline only ingestion', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock,
      ec2Mock, sfnMock, secretsManagerMock, quickSightMock, s3Mock, {
        publicAZContainPrivateAZ: true,
        subnetsCross3AZ: true,
        subnetsIsolated: true,
      });
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        ...S3_INGESTION_PIPELINE,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.message).toEqual('Pipeline added.');
    expect(res.body.success).toEqual(true);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeVpcEndpointsCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeSecurityGroupRulesCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeSubnetsCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeRouteTablesCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);
  });
  it('Create pipeline with error RPU not increments of 8', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock,
      ec2Mock, sfnMock, secretsManagerMock, quickSightMock, s3Mock, {
        publicAZContainPrivateAZ: true,
        subnetsCross3AZ: true,
        subnetsIsolated: true,
      });
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_WITH_ERROR_RPU_PIPELINE,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toEqual('Validation error: RPU range must be 8-512 in increments of 8.');
  });
  it('Create pipeline with error RPU not match region RPU range', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock,
      ec2Mock, sfnMock, secretsManagerMock, quickSightMock, s3Mock, {
        publicAZContainPrivateAZ: true,
        subnetsCross3AZ: true,
      });
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_QUICKSIGHT_PIPELINE,
        region: 'us-west-1',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toEqual('Validation error: RPU range must be 32-512 in increments of 8.');
  });
  it('Create pipeline with ingestion authentication and HTTP protocol', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock,
      ec2Mock, sfnMock, secretsManagerMock, quickSightMock, s3Mock, {
        publicAZContainPrivateAZ: true,
        subnetsCross3AZ: true,
        subnetsIsolated: true,
      });
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        ...S3_INGESTION_HTTP_AUTHENTICATION_PIPELINE,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toEqual('Validation error: you must select protocol as HTTPS if open the authentication for ingestion server.');
  });
  it('Create pipeline without isolated subnet', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock,
      ec2Mock, sfnMock, secretsManagerMock, quickSightMock, s3Mock, {
        publicAZContainPrivateAZ: true,
        subnetsCross3AZ: true,
        subnetsIsolated: false,
      });
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_QUICKSIGHT_PIPELINE,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.message).toEqual('Pipeline added.');
    expect(res.body.success).toEqual(true);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeVpcEndpointsCommand, 0);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeSecurityGroupRulesCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeSubnetsCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeRouteTablesCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);
  });
  it('Create pipeline with ALB policy disable ', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock,
      ec2Mock, sfnMock, secretsManagerMock, quickSightMock, s3Mock, {
        publicAZContainPrivateAZ: true,
        subnetsCross3AZ: true,
        subnetsIsolated: true,
        albPolicyDisable: true,
      });
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_QUICKSIGHT_PIPELINE,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toEqual('Validation error: your S3 bucket must have a bucket policy that grants Elastic Load Balancing permission to write the access logs to the bucket.');
    expect(s3Mock).toHaveReceivedCommandTimes(GetBucketPolicyCommand, 1);
  });
  it('Create pipeline with standard QuickSigth', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock,
      ec2Mock, sfnMock, secretsManagerMock, quickSightMock, s3Mock, {
        publicAZContainPrivateAZ: true,
        subnetsCross3AZ: true,
        subnetsIsolated: true,
        quickSightStandard: true,
      });
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_QUICKSIGHT_PIPELINE,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toEqual('Validation error: QuickSight edition is not enterprise in your account.');
    expect(quickSightMock).toHaveReceivedCommandTimes(DescribeAccountSubscriptionCommand, 1);
  });
  it('Create pipeline subnets not cross two AZ', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock,
      ec2Mock, sfnMock, secretsManagerMock, quickSightMock, s3Mock, {
        publicAZContainPrivateAZ: false,
      });


    ec2Mock.on(DescribeSubnetsCommand)
      .resolves({
        Subnets: [
          {
            SubnetId: 'subnet-00000000000000010',
            AvailabilityZone: 'us-east-1a',
            CidrBlock: '10.0.16.0/20',
          },
          {
            SubnetId: 'subnet-00000000000000011',
            AvailabilityZone: 'us-east-1a',
            CidrBlock: '10.0.32.0/20',
          },
          {
            SubnetId: 'subnet-00000000000000012',
            AvailabilityZone: 'us-east-1a',
            CidrBlock: '10.0.48.0/20',
          },
          {
            SubnetId: 'subnet-00000000000000013',
            AvailabilityZone: 'us-east-1a',
            CidrBlock: '10.0.64.0/20',
          },
          {
            SubnetId: 'subnet-00000000000000021',
            AvailabilityZone: 'us-east-1a',
            CidrBlock: '10.0.64.0/20',
          },
          {
            SubnetId: 'subnet-00000000000000022',
            AvailabilityZone: 'us-east-1a',
            CidrBlock: '10.0.64.0/20',
          },
          {
            SubnetId: 'subnet-00000000000000023',
            AvailabilityZone: 'us-east-1a',
            CidrBlock: '10.0.64.0/20',
          },
        ],
      });
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toEqual('Validate error: the public and private subnets for the ingestion endpoint must locate in at least two Availability Zones (AZ).');
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeSubnetsCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeRouteTablesCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeVpcEndpointsCommand, 0);
  });
  it('Create pipeline subnets AZ can not meeting conditions', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock,
      ec2Mock, sfnMock, secretsManagerMock, quickSightMock, s3Mock, {
        publicAZContainPrivateAZ: false,
      });


    ec2Mock.on(DescribeSubnetsCommand)
      .resolves({
        Subnets: [
          {
            SubnetId: 'subnet-00000000000000010',
            AvailabilityZone: 'us-east-1a',
            CidrBlock: '10.0.16.0/20',
          },
          {
            SubnetId: 'subnet-00000000000000011',
            AvailabilityZone: 'us-east-1b',
            CidrBlock: '10.0.32.0/20',
          },
          {
            SubnetId: 'subnet-00000000000000012',
            AvailabilityZone: 'us-east-1c',
            CidrBlock: '10.0.48.0/20',
          },
          {
            SubnetId: 'subnet-00000000000000013',
            AvailabilityZone: 'us-east-1d',
            CidrBlock: '10.0.64.0/20',
          },
          {
            SubnetId: 'subnet-00000000000000021',
            AvailabilityZone: 'us-east-1c',
            CidrBlock: '10.0.64.0/20',
          },
          {
            SubnetId: 'subnet-00000000000000022',
            AvailabilityZone: 'us-east-1d',
            CidrBlock: '10.0.64.0/20',
          },
          {
            SubnetId: 'subnet-00000000000000023',
            AvailabilityZone: 'us-east-1e',
            CidrBlock: '10.0.64.0/20',
          },
        ],
      });
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toEqual('Validate error: the public subnets and private subnets for ingestion endpoint must be in the same Availability Zones (AZ). For example, you can not select public subnets in AZ (a, b), while select private subnets in AZ (b, c).');
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeSubnetsCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeRouteTablesCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeVpcEndpointsCommand, 0);
  });
  it('Create pipeline with new Redshift serverless subnets not cross three AZ', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock,
      ec2Mock, sfnMock, secretsManagerMock, quickSightMock, s3Mock, {
        publicAZContainPrivateAZ: true,
        subnetsCross3AZ: false,
        subnetsIsolated: true,
      });
    ddbMock.on(PutCommand).resolves({});

    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toEqual('Validation error: the network for deploying New_Serverless Redshift at least three subnets that cross three AZs. Please check and try again.');
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeVpcEndpointsCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeSecurityGroupRulesCommand, 2);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeSubnetsCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeRouteTablesCommand, 1);
  });
  it('Create pipeline with new Redshift serverless in us-west-1', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock,
      ec2Mock, sfnMock, secretsManagerMock, quickSightMock, s3Mock, {
        publicAZContainPrivateAZ: true,
        twoAZsInRegion: true,
      });
    ddbMock.on(PutCommand).resolves({});

    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE,
        dataModeling: {
          ods: {
            bucket: {
              name: 'EXAMPLE_BUCKET',
              prefix: '',
            },
            fileSuffix: '.snappy.parquet',
          },
          athena: false,
          redshift: {
            dataRange: 'rate(6 months)',
            newServerless: {
              network: {
                vpcId: 'vpc-00000000000000001',
                subnetIds: [
                  'subnet-00000000000000010',
                  'subnet-00000000000000011',
                  'subnet-00000000000000021',
                ],
                securityGroups: [
                  'sg-00000000000000030',
                  'sg-00000000000000031',
                ],
              },
              baseCapacity: 8,
            },
          },
          loadWorkflow: {
            bucket: {
              name: 'EXAMPLE_BUCKET',
              prefix: '',
            },
            loadJobScheduleIntervalExpression: 'rate(5 minutes)',
            maxFilesLimit: 50,
            processingFilesLimit: 50,
          },
          upsertUsers: {
            scheduleExpression: 'rate(5 minutes)',
          },
        },
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.message).toEqual('Pipeline added.');
    expect(res.body.success).toEqual(true);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeVpcEndpointsCommand, 0);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeSecurityGroupRulesCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeSubnetsCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeRouteTablesCommand, 1);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);
  });
  it('Create pipeline with new Redshift serverless two subnets in us-west-1', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock,
      ec2Mock, sfnMock, secretsManagerMock, quickSightMock, s3Mock, {
        publicAZContainPrivateAZ: true,
        twoAZsInRegion: true,
      });
    ddbMock.on(PutCommand).resolves({});

    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE,
        dataModeling: {
          ods: {
            bucket: {
              name: 'EXAMPLE_BUCKET',
              prefix: '',
            },
            fileSuffix: '.snappy.parquet',
          },
          athena: false,
          redshift: {
            dataRange: 'rate(6 months)',
            newServerless: {
              network: {
                vpcId: 'vpc-00000000000000001',
                subnetIds: [
                  'subnet-00000000000000010',
                  'subnet-00000000000000011',
                ],
                securityGroups: [
                  'sg-00000000000000030',
                  'sg-00000000000000031',
                ],
              },
              baseCapacity: 8,
            },
          },
          loadWorkflow: {
            bucket: {
              name: 'EXAMPLE_BUCKET',
              prefix: '',
            },
            loadJobScheduleIntervalExpression: 'rate(5 minutes)',
            maxFilesLimit: 50,
            processingFilesLimit: 50,
          },
          upsertUsers: {
            scheduleExpression: 'rate(5 minutes)',
          },
        },
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toEqual('Validation error: the network for deploying New_Serverless Redshift at least three subnets that cross two AZs. Please check and try again.');
  });
  it('Create pipeline with vpc endpoint SG error', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock,
      ec2Mock, sfnMock, secretsManagerMock, quickSightMock, s3Mock, {
        publicAZContainPrivateAZ: true,
        subnetsIsolated: true,
        subnetsCross3AZ: true,
        sgError: true,
      });
    ddbMock.on(PutCommand).resolves({});

    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toEqual('Validation error: vpc endpoint error in subnet: subnet-00000000000000011, detail: [{\"service\":\"com.amazonaws.ap-southeast-1.logs\",\"reason\":\"The traffic is not allowed by security group rules\"}].');
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeVpcEndpointsCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeSecurityGroupRulesCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeSubnetsCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeRouteTablesCommand, 1);
  });
  it('Create pipeline with vpc endpoint subnets error', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock,
      ec2Mock, sfnMock, secretsManagerMock, quickSightMock, s3Mock, {
        publicAZContainPrivateAZ: true,
        subnetsIsolated: true,
        subnetsCross3AZ: true,
        vpcEndpointSubnetErr: true,
      });
    ddbMock.on(PutCommand).resolves({});

    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toEqual('Validation error: vpc endpoint error in subnet: subnet-00000000000000011, detail: [{\"service\":\"com.amazonaws.ap-southeast-1.glue\",\"reason\":\"The Availability Zones (AZ) of VPC Endpoint (com.amazonaws.ap-southeast-1.glue) subnets must contain Availability Zones (AZ) of isolated subnets.\"}].');
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeVpcEndpointsCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeSecurityGroupRulesCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeSubnetsCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeRouteTablesCommand, 1);
  });
  it('Create pipeline skip Redshift SG validation when reporting is disabled', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock,
      ec2Mock, sfnMock, secretsManagerMock, quickSightMock, s3Mock, {
        publicAZContainPrivateAZ: true,
        subnetsCross3AZ: true,
        sgError: true,
      });
    ddbMock.on(PutCommand).resolves({});

    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(quickSightMock).toHaveReceivedCommandTimes(DescribeAccountSubscriptionCommand, 0);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeVpcEndpointsCommand, 0);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeSecurityGroupRulesCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeSubnetsCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeRouteTablesCommand, 1);
  });
  it('Create pipeline with new Redshift serverless SG error', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock,
      ec2Mock, sfnMock, secretsManagerMock, quickSightMock, s3Mock, {
        publicAZContainPrivateAZ: true,
        subnetsCross3AZ: true,
        sgError: true,
      });
    ddbMock.on(PutCommand).resolves({});

    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        ...KINESIS_DATA_PROCESSING_PROVISIONED_REDSHIFT_QUICKSIGHT_PIPELINE,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toEqual('Validation error: Provisioned Redshift security groups missing rule for QuickSight access.');
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeVpcEndpointsCommand, 0);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeSecurityGroupRulesCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeSubnetsCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeRouteTablesCommand, 1);
  });
  it('Create pipeline in the isolated subnets', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock,
      ec2Mock, sfnMock, secretsManagerMock, quickSightMock, s3Mock, {
        publicAZContainPrivateAZ: true,
        subnetsCross3AZ: true,
        subnetsIsolated: true,
      });
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.message).toEqual('Pipeline added.');
    expect(res.body.success).toEqual(true);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeVpcEndpointsCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeSecurityGroupRulesCommand, 2);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeSubnetsCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeRouteTablesCommand, 1);
  });
  it('Create pipeline in the isolated subnets with s3 endpoint route table error', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock,
      ec2Mock, sfnMock, secretsManagerMock, quickSightMock, s3Mock, {
        publicAZContainPrivateAZ: true,
        subnetsCross3AZ: true,
        subnetsIsolated: true,
        s3EndpointRouteError: true,
      });
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toEqual('Validation error: vpc endpoint error in subnet: subnet-00000000000000011, detail: [{\"service\":\"com.amazonaws.ap-southeast-1.s3\",\"reason\":\"The route of vpc endpoint need attached in the route table\"}].');
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeVpcEndpointsCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeSecurityGroupRulesCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeSubnetsCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeRouteTablesCommand, 1);
  });
  it('Create pipeline in the isolated subnets with glue endpoint sg error', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock,
      ec2Mock, sfnMock, secretsManagerMock, quickSightMock, s3Mock, {
        publicAZContainPrivateAZ: true,
        subnetsCross3AZ: true,
        subnetsIsolated: true,
        glueEndpointSGError: true,
      });
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toEqual('Validation error: vpc endpoint error in subnet: subnet-00000000000000011, detail: [{\"service\":\"com.amazonaws.ap-southeast-1.glue\",\"reason\":\"The traffic is not allowed by security group rules\"}].');
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeVpcEndpointsCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeSecurityGroupRulesCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeSubnetsCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeRouteTablesCommand, 1);
  });
  it('Create pipeline in the isolated subnets miss vpc endpoint', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock,
      ec2Mock, sfnMock, secretsManagerMock, quickSightMock, s3Mock, {
        publicAZContainPrivateAZ: true,
        subnetsCross3AZ: true,
        subnetsIsolated: true,
        missVpcEndpoint: true,
      });
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toEqual('Validation error: vpc endpoint error in subnet: subnet-00000000000000011, detail: [{\"service\":\"com.amazonaws.ap-southeast-1.s3\",\"reason\":\"Miss vpc endpoint\"}].');
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeSubnetsCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeRouteTablesCommand, 1);
    expect(ec2Mock).toHaveReceivedCommandTimes(DescribeVpcEndpointsCommand, 1);
  });
  it('Create pipeline with provisioned redshift empty dbuser', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock,
      ec2Mock, sfnMock, secretsManagerMock, quickSightMock, s3Mock, {
        publicAZContainPrivateAZ: true,
        subnetsCross3AZ: true,
      });
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        ...KINESIS_DATA_PROCESSING_PROVISIONED_REDSHIFT_EMPTY_DBUSER_QUICKSIGHT_PIPELINE,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toEqual('Cluster Identifier and DbUser are required when using Redshift Provisioned cluster.');
  });
  it('Create pipeline with dictionary no found', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock, 'BuiltInPlugins');
    ddbMock.on(GetCommand, {
      TableName: dictionaryTableName,
      Key: {
        name: 'Solution',
      },
    }).resolves({
      Item: undefined,
    });
    ddbMock.on(GetCommand, {
      TableName: dictionaryTableName,
      Key: {
        name: 'Templates',
      },
    }).resolves({
      Item: undefined,
    });
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock,
      ec2Mock, sfnMock, secretsManagerMock, quickSightMock, s3Mock, {
        publicAZContainPrivateAZ: true,
      });
    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send(S3_INGESTION_PIPELINE);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      message: 'Template: Ingestion_s3 not found in dictionary.',
      success: false,
    });
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });
  it('Create pipeline with mock error', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock,
      ec2Mock, sfnMock, secretsManagerMock, quickSightMock, s3Mock, {
        publicAZContainPrivateAZ: true,
      });
    // Mock DynamoDB error
    ddbMock.on(TransactWriteItemsCommand).rejects(new Error('Mock DynamoDB error'));
    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send(S3_INGESTION_PIPELINE);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });
  it('Create pipeline 400', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    const res = await request(app)
      .post('/api/pipeline');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          value: {},
          msg: 'Value is empty.',
          param: '',
          location: 'body',
        },
        {
          msg: 'Value is empty.',
          param: 'projectId',
          location: 'body',
        },
        {
          msg: 'Value is empty.',
          param: 'x-click-stream-request-id',
          location: 'headers',
        },
      ],
    });
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });
  it('Create pipeline Not Modified', async () => {
    tokenMock(ddbMock, true);
    projectExistedMock(ddbMock, true);
    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send(S3_INGESTION_PIPELINE);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'headers',
          msg: 'Not Modified.',
          param: 'x-click-stream-request-id',
          value: '0000-0000',
        },
      ],
    });
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });
  it('Create pipeline with non-existent project', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, false);
    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send(S3_INGESTION_PIPELINE);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'body',
          msg: 'Project resource does not exist.',
          param: 'projectId',
          value: MOCK_PROJECT_ID,
        },
      ],
    });
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });
  it('Get pipeline by ID', async () => {
    projectExistedMock(ddbMock, true);
    ddbMock.on(GetCommand).resolves({
      Item: KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW,
    });
    cloudFormationMock.on(DescribeStacksCommand).resolves({
      Stacks: [
        {
          StackName: 'xxx',
          Outputs: [
            {
              OutputKey: 'IngestionServerC000IngestionServerURL',
              OutputValue: 'http://xxx/xxx',
            },
            {
              OutputKey: 'IngestionServerC000IngestionServerDNS',
              OutputValue: 'http://yyy/yyy',
            },
            {
              OutputKey: 'Dashboards',
              OutputValue: '[{"appId":"app1","dashboardId":"clickstream_dashboard_v1_notepad_mtzfsocy_app1"},{"appId":"app2","dashboardId":"clickstream_dashboard_v1_notepad_mtzfsocy_app2"}]',
            },
            {
              OutputKey: 'ObservabilityDashboardName',
              OutputValue: 'clickstream_dashboard_notepad_mtzfsocy',
            },
          ],
          StackStatus: StackStatus.CREATE_COMPLETE,
          CreationTime: new Date(),
        },
      ],
    });
    dictionaryMock(ddbMock);
    ddbMock.on(QueryCommand, {
      ExclusiveStartKey: undefined,
      ExpressionAttributeNames:
        { '#prefix': 'prefix' },
      ExpressionAttributeValues: new Map<string, any>([
        [':d', false],
        [':prefix', 'PLUGIN'],
      ]),
      FilterExpression: 'deleted = :d',
      IndexName: undefined,
      KeyConditionExpression:
    '#prefix= :prefix',
      Limit: undefined,
      ScanIndexForward: true,
      TableName: undefined,
    }).resolves({
      Items: [
        { id: `${MOCK_PLUGIN_ID}_2`, name: `${MOCK_PLUGIN_ID}_2` },
      ],
    });
    let res = await request(app)
      .get(`/api/pipeline/${MOCK_PIPELINE_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW,
        dataProcessing: {
          ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW.dataProcessing,
          enrichPlugin: [
            {
              bindCount: 0,
              builtIn: true,
              createAt: 1667355960000,
              deleted: false,
              dependencyFiles: [],
              description: 'Description of UAEnrichment',
              id: 'BUILT-IN-2',
              jarFile: '',
              mainFunction: 'software.aws.solution.clickstream.UAEnrichment',
              name: 'UAEnrichment',
              operator: '',
              pluginType: 'Enrich',
              prefix: 'PLUGIN',
              type: 'PLUGIN#BUILT-IN-2',
              updateAt: 1667355960000,
            },
            {
              bindCount: 0,
              builtIn: true,
              createAt: 1667355960000,
              deleted: false,
              dependencyFiles: [],
              description: 'Description of IPEnrichment',
              id: 'BUILT-IN-3',
              jarFile: '',
              mainFunction: 'software.aws.solution.clickstream.IPEnrichment',
              name: 'IPEnrichment',
              operator: '',
              pluginType: 'Enrich',
              prefix: 'PLUGIN',
              type: 'PLUGIN#BUILT-IN-3',
              updateAt: 1667355960000,
            },
            {
              id: `${MOCK_PLUGIN_ID}_2`, name: `${MOCK_PLUGIN_ID}_2`,
            },
          ],
          transformPlugin: {
            bindCount: 0,
            builtIn: true,
            createAt: 1667355960000,
            deleted: false,
            dependencyFiles: [],
            description: 'Description of Transformer',
            id: 'BUILT-IN-1',
            jarFile: '',
            mainFunction: 'software.aws.solution.clickstream.Transformer',
            name: 'Transformer',
            operator: '',
            pluginType: 'Transform',
            prefix: 'PLUGIN',
            type: 'PLUGIN#BUILT-IN-1',
            updateAt: 1667355960000,
          },
        },
        dns: 'http://yyy/yyy',
        endpoint: 'http://xxx/xxx',
        dashboards: [
          {
            appId: 'app1',
            dashboardId: 'clickstream_dashboard_v1_notepad_mtzfsocy_app1',
          },
          {
            appId: 'app2',
            dashboardId: 'clickstream_dashboard_v1_notepad_mtzfsocy_app2',
          },
        ],
        templateInfo: {
          isLatest: false,
          solutionVersion: 'v1.0.0',
        },
        metricsDashboardName: 'clickstream_dashboard_notepad_mtzfsocy',
      },
    });
  });
  it('Get pipeline with cache status in ddb', async () => {
    projectExistedMock(ddbMock, true);
    ddbMock.on(GetCommand).resolves({
      Item: KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW,
    });
    let res = await request(app)
      .get(`/api/pipeline/${MOCK_PIPELINE_ID}?pid=${MOCK_PROJECT_ID}&cache=true`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW,
        dns: null,
        endpoint: null,
        dashboards: null,
        metricsDashboardName: null,
        templateInfo: null,
      },
    });
  });
  it('Get pipeline by ID with stack no outputs', async () => {
    projectExistedMock(ddbMock, true);
    ddbMock.on(GetCommand).resolves({
      Item: KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW,
    });
    cloudFormationMock.on(DescribeStacksCommand).resolves({
      Stacks: [
        {
          StackName: 'xxx',
          StackStatus: StackStatus.CREATE_COMPLETE,
          CreationTime: new Date(),
        },
      ],
    });
    dictionaryMock(ddbMock);
    ddbMock.on(QueryCommand, {
      ExclusiveStartKey: undefined,
      ExpressionAttributeNames:
        { '#prefix': 'prefix' },
      ExpressionAttributeValues: new Map<string, any>([
        [':d', false],
        [':prefix', 'PLUGIN'],
      ]),
      FilterExpression: 'deleted = :d',
      IndexName: undefined,
      KeyConditionExpression:
        '#prefix= :prefix',
      Limit: undefined,
      ScanIndexForward: true,
      TableName: undefined,
    }).resolves({
      Items: [
        { id: `${MOCK_PLUGIN_ID}_2`, name: `${MOCK_PLUGIN_ID}_2` },
      ],
    });
    let res = await request(app)
      .get(`/api/pipeline/${MOCK_PIPELINE_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW,
        dataProcessing: {
          ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW.dataProcessing,
          enrichPlugin: [
            {
              bindCount: 0,
              builtIn: true,
              createAt: 1667355960000,
              deleted: false,
              dependencyFiles: [],
              description: 'Description of UAEnrichment',
              id: 'BUILT-IN-2',
              jarFile: '',
              mainFunction: 'software.aws.solution.clickstream.UAEnrichment',
              name: 'UAEnrichment',
              operator: '',
              pluginType: 'Enrich',
              prefix: 'PLUGIN',
              type: 'PLUGIN#BUILT-IN-2',
              updateAt: 1667355960000,
            },
            {
              bindCount: 0,
              builtIn: true,
              createAt: 1667355960000,
              deleted: false,
              dependencyFiles: [],
              description: 'Description of IPEnrichment',
              id: 'BUILT-IN-3',
              jarFile: '',
              mainFunction: 'software.aws.solution.clickstream.IPEnrichment',
              name: 'IPEnrichment',
              operator: '',
              pluginType: 'Enrich',
              prefix: 'PLUGIN',
              type: 'PLUGIN#BUILT-IN-3',
              updateAt: 1667355960000,
            },
            {
              id: `${MOCK_PLUGIN_ID}_2`, name: `${MOCK_PLUGIN_ID}_2`,
            },
          ],
          transformPlugin: {
            bindCount: 0,
            builtIn: true,
            createAt: 1667355960000,
            deleted: false,
            dependencyFiles: [],
            description: 'Description of Transformer',
            id: 'BUILT-IN-1',
            jarFile: '',
            mainFunction: 'software.aws.solution.clickstream.Transformer',
            name: 'Transformer',
            operator: '',
            pluginType: 'Transform',
            prefix: 'PLUGIN',
            type: 'PLUGIN#BUILT-IN-1',
            updateAt: 1667355960000,
          },
        },
        dns: '',
        endpoint: '',
        dashboards: [],
        metricsDashboardName: '',
        templateInfo: {
          isLatest: false,
          solutionVersion: 'v1.0.0',
        },
      },
    });
  });
  it('Get pipeline by ID with mock error', async () => {
    projectExistedMock(ddbMock, true);
    // Mock DynamoDB error
    const detailInput: GetCommandInput = {
      TableName: clickStreamTableName,
      Key: {
        id: MOCK_PROJECT_ID,
        type: `PIPELINE#${MOCK_PIPELINE_ID}#latest`,
      },
    };
    ddbMock.on(GetCommand, detailInput).rejects(new Error('Mock DynamoDB error'));
    const res = await request(app)
      .get(`/api/pipeline/${MOCK_PIPELINE_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('Get pipeline by with ingestion server endpoint', async () => {
    projectExistedMock(ddbMock, true);
    ddbMock.on(GetCommand).resolves({
      Item: S3_INGESTION_PIPELINE,
    });
    cloudFormationMock
      .on(DescribeStacksCommand, {
        StackName: 'Clickstream-Ingestion-s3-6666-6666',
      })
      .resolves({
        Stacks: [
          {
            StackName: 'Clickstream-Ingestion-s3-6666-6666',
            Outputs: [
              {
                OutputKey: 'IngestionServerC000IngestionServerURL',
                OutputValue: 'http://xxx/xxx',
              },
              {
                OutputKey: 'IngestionServerC000IngestionServerDNS',
                OutputValue: 'http://yyy/yyy',
              },
            ],
            StackStatus: StackStatus.CREATE_COMPLETE,
            CreationTime: new Date(),
          },
        ],
      });
    dictionaryMock(ddbMock);
    ddbMock.on(QueryCommand, {
      ExclusiveStartKey: undefined,
      ExpressionAttributeNames:
        { '#prefix': 'prefix' },
      ExpressionAttributeValues: new Map<string, any>([
        [':d', false],
        [':prefix', 'PLUGIN'],
      ]),
      FilterExpression: 'deleted = :d',
      IndexName: undefined,
      KeyConditionExpression:
        '#prefix= :prefix',
      Limit: undefined,
      ScanIndexForward: true,
      TableName: undefined,
    }).resolves({
      Items: [
        { id: `${MOCK_PLUGIN_ID}_2`, name: `${MOCK_PLUGIN_ID}_2` },
      ],
    });
    let res = await request(app)
      .get(`/api/pipeline/${MOCK_PIPELINE_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(cloudFormationMock).toHaveReceivedCommandTimes(DescribeStacksCommand, 3);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        ...S3_INGESTION_PIPELINE,
        dataProcessing: {
          ...S3_INGESTION_PIPELINE.dataProcessing,
          enrichPlugin: [],
          transformPlugin: null,
        },
        dns: 'http://yyy/yyy',
        endpoint: 'http://xxx/xxx',
        dashboards: [],
        templateInfo: {
          isLatest: false,
          solutionVersion: 'v1.0.0',
        },
      },
    });
  });
  it('Get pipeline with no pid', async () => {
    projectExistedMock(ddbMock, true);
    ddbMock.on(QueryCommand).resolves({});
    const res = await request(app)
      .get(`/api/pipeline/${MOCK_PIPELINE_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'query',
          msg: 'Value is empty.',
          param: 'pid',
        },
      ],
    });
  });
  it('Get non-existent project', async () => {
    projectExistedMock(ddbMock, false);
    pipelineExistedMock(ddbMock, true);
    const res = await request(app)
      .get(`/api/pipeline/${MOCK_PIPELINE_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'query',
          msg: 'Project resource does not exist.',
          param: 'pid',
          value: MOCK_PROJECT_ID,
        },
      ],
    });
  });
  it('Get non-existent pipeline', async () => {
    projectExistedMock(ddbMock, true);
    pipelineExistedMock(ddbMock, false);
    const res = await request(app)
      .get(`/api/pipeline/${MOCK_PIPELINE_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'Pipeline not found',
    });
  });
  it('Get pipeline list', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { name: 'Pipeline-01' },
        { name: 'Pipeline-02' },
        { name: 'Pipeline-03' },
        { name: 'Pipeline-04' },
        { name: 'Pipeline-05' },
      ],
    });
    ddbMock.on(UpdateCommand).resolves({});
    let res = await request(app)
      .get('/api/pipeline');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        items: [
          {
            name: 'Pipeline-01',
            status: {
              status: 'Active',
              stackDetails: [],
              executionDetail: {},
            },
          },
          {
            name: 'Pipeline-02',
            status: {
              status: 'Active',
              stackDetails: [],
              executionDetail: {},
            },
          },
          {
            name: 'Pipeline-03',
            status: {
              status: 'Active',
              stackDetails: [],
              executionDetail: {},
            },
          },
          {
            name: 'Pipeline-04',
            status: {
              status: 'Active',
              stackDetails: [],
              executionDetail: {},
            },
          },
          {
            name: 'Pipeline-05',
            status: {
              status: 'Active',
              stackDetails: [],
              executionDetail: {},
            },
          },
        ],
        totalCount: 5,
      },
    });

    // Mock DynamoDB error
    ddbMock.on(QueryCommand).rejects(new Error('Mock DynamoDB error'));
    res = await request(app)
      .get(`/api/pipeline?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('Get pipeline list with pid', async () => {
    projectExistedMock(ddbMock, true);
    pipelineExistedMock(ddbMock, true);
    ddbMock.on(QueryCommand).resolves({
      Items: [S3_INGESTION_PIPELINE],
    });
    ddbMock.on(UpdateCommand).resolves({});
    let res = await request(app)
      .get(`/api/pipeline?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        items: [
          S3_INGESTION_PIPELINE,
        ],
        totalCount: 1,
      },
    });

    // Mock DynamoDB error
    ddbMock.on(QueryCommand).rejects(new Error('Mock DynamoDB error'));
    res = await request(app)
      .get(`/api/pipeline?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('Get pipeline list with version', async () => {
    projectExistedMock(ddbMock, true);
    pipelineExistedMock(ddbMock, true);
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { name: 'Pipeline-01' },
        { name: 'Pipeline-02' },
        { name: 'Pipeline-03' },
        { name: 'Pipeline-04' },
        { name: 'Pipeline-05' },
      ],
    });
    ddbMock.on(UpdateCommand).resolves({});
    let res = await request(app)
      .get(`/api/pipeline?pid=${MOCK_PROJECT_ID}&version=latest`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        items: [
          {
            name: 'Pipeline-01',
            status: {
              status: 'Active',
              stackDetails: [],
              executionDetail: {},
            },
          },
          {
            name: 'Pipeline-02',
            status: {
              status: 'Active',
              stackDetails: [],
              executionDetail: {},
            },
          },
          {
            name: 'Pipeline-03',
            status: {
              status: 'Active',
              stackDetails: [],
              executionDetail: {},
            },
          },
          {
            name: 'Pipeline-04',
            status: {
              status: 'Active',
              stackDetails: [],
              executionDetail: {},
            },
          },
          {
            name: 'Pipeline-05',
            status: {
              status: 'Active',
              stackDetails: [],
              executionDetail: {},
            },
          },
        ],
        totalCount: 5,
      },
    });

    // Mock DynamoDB error
    ddbMock.on(QueryCommand).rejects(new Error('Mock DynamoDB error'));
    res = await request(app)
      .get(`/api/pipeline?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('Get pipeline list with page', async () => {
    projectExistedMock(ddbMock, true);
    pipelineExistedMock(ddbMock, true);
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { name: 'Pipeline-01' },
        { name: 'Pipeline-02' },
        { name: 'Pipeline-03' },
        { name: 'Pipeline-04' },
        { name: 'Pipeline-05' },
      ],
    });
    ddbMock.on(UpdateCommand).resolves({});
    const res = await request(app)
      .get(`/api/pipeline?pid=${MOCK_PROJECT_ID}&pageNumber=2&pageSize=2`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        items: [
          {
            name: 'Pipeline-03',
            status: {
              status: 'Active',
              stackDetails: [],
              executionDetail: {},
            },
          },
          {
            name: 'Pipeline-04',
            status: {
              status: 'Active',
              stackDetails: [],
              executionDetail: {},
            },
          },
        ],
        totalCount: 5,
      },
    });
  });
  it('Get pipeline list with stack fail', async () => {
    projectExistedMock(ddbMock, true);
    pipelineExistedMock(ddbMock, true);
    ddbMock.on(QueryCommand).resolves({
      Items: [KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW],
    });
    cloudFormationMock.on(DescribeStacksCommand)
      .resolvesOnce({
        Stacks: [{
          StackName: 'test',
          StackStatus: StackStatus.UPDATE_FAILED,
          StackStatusReason: '',
          CreationTime: undefined,
        }],
      })
      .resolves({
        Stacks: [{
          StackName: 'test',
          StackStatus: StackStatus.UPDATE_IN_PROGRESS,
          StackStatusReason: '',
          CreationTime: undefined,
        }],
      });
    ddbMock.on(UpdateCommand).resolves({});
    sfnMock.on(DescribeExecutionCommand).resolves({
      executionArn: 'xx',
      stateMachineArn: 'yy',
      name: 'exec1',
      status: ExecutionStatus.SUCCEEDED,
      output: 'SUCCEEDED',
    });
    const res = await request(app)
      .get(`/api/pipeline?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.items[0].status).toEqual({
      executionDetail: {
        name: 'exec1',
        output: 'SUCCEEDED',
        status: 'SUCCEEDED',
      },
      stackDetails: [
        {
          stackName: 'Clickstream-KafkaConnector-6666-6666',
          stackType: 'KafkaConnector',
          stackStatus: 'UPDATE_FAILED',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-Ingestion-kafka-6666-6666',
          stackType: 'Ingestion',
          stackStatus: 'UPDATE_IN_PROGRESS',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-DataProcessing-6666-6666',
          stackType: 'DataProcessing',
          stackStatus: 'UPDATE_IN_PROGRESS',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-Reporting-6666-6666',
          stackType: 'Reporting',
          stackStatus: 'UPDATE_IN_PROGRESS',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-DataModelingRedshift-6666-6666',
          stackType: 'DataModelingRedshift',
          stackStatus: 'UPDATE_IN_PROGRESS',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-Metrics-6666-6666',
          stackType: 'Metrics',
          stackStatus: 'UPDATE_IN_PROGRESS',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
      ],
      status: 'Failed',
    });
  });
  it('Get pipeline list with stack creating', async () => {
    projectExistedMock(ddbMock, true);
    pipelineExistedMock(ddbMock, true);
    ddbMock.on(QueryCommand).resolves({
      Items: [KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW],
    });
    cloudFormationMock.on(DescribeStacksCommand)
      .resolvesOnce({
        Stacks: [{
          StackName: 'test',
          StackStatus: StackStatus.CREATE_IN_PROGRESS,
          StackStatusReason: '',
          CreationTime: undefined,
        }],
      })
      .resolves({
        Stacks: [{
          StackName: 'test',
          StackStatus: StackStatus.CREATE_COMPLETE,
          StackStatusReason: '',
          CreationTime: undefined,
        }],
      });
    ddbMock.on(UpdateCommand).resolves({});
    sfnMock.on(DescribeExecutionCommand).resolves({
      executionArn: 'xx',
      stateMachineArn: 'yy',
      name: 'exec1',
      status: ExecutionStatus.SUCCEEDED,
      output: 'SUCCEEDED',
    });
    const res = await request(app)
      .get(`/api/pipeline?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.items[0].status).toEqual({
      executionDetail: {
        name: 'exec1',
        output: 'SUCCEEDED',
        status: 'SUCCEEDED',
      },
      stackDetails: [
        {
          stackName: 'Clickstream-KafkaConnector-6666-6666',
          stackType: 'KafkaConnector',
          stackStatus: 'CREATE_IN_PROGRESS',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-Ingestion-kafka-6666-6666',
          stackType: 'Ingestion',
          stackStatus: 'CREATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-DataProcessing-6666-6666',
          stackType: 'DataProcessing',
          stackStatus: 'CREATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-Reporting-6666-6666',
          stackType: 'Reporting',
          stackStatus: 'CREATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-DataModelingRedshift-6666-6666',
          stackType: 'DataModelingRedshift',
          stackStatus: 'CREATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-Metrics-6666-6666',
          stackType: 'Metrics',
          stackStatus: 'CREATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
      ],
      status: 'Creating',
    });
  });
  it('Get pipeline list with stack updating', async () => {
    projectExistedMock(ddbMock, true);
    pipelineExistedMock(ddbMock, true);
    ddbMock.on(QueryCommand).resolves({
      Items: [KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW],
    });
    cloudFormationMock.on(DescribeStacksCommand)
      .resolvesOnce({
        Stacks: [{
          StackName: 'test',
          StackStatus: StackStatus.UPDATE_IN_PROGRESS,
          StackStatusReason: '',
          CreationTime: undefined,
        }],
      })
      .resolves({
        Stacks: [{
          StackName: 'test',
          StackStatus: StackStatus.UPDATE_COMPLETE,
          StackStatusReason: '',
          CreationTime: undefined,
        }],
      });
    ddbMock.on(UpdateCommand).resolves({});
    sfnMock.on(DescribeExecutionCommand).resolves({
      executionArn: 'xx',
      stateMachineArn: 'yy',
      name: 'exec1',
      status: ExecutionStatus.SUCCEEDED,
      output: 'SUCCEEDED',
    });
    const res = await request(app)
      .get(`/api/pipeline?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.items[0].status).toEqual({
      executionDetail: {
        name: 'exec1',
        output: 'SUCCEEDED',
        status: 'SUCCEEDED',
      },
      stackDetails: [
        {
          stackName: 'Clickstream-KafkaConnector-6666-6666',
          stackType: 'KafkaConnector',
          stackStatus: 'UPDATE_IN_PROGRESS',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-Ingestion-kafka-6666-6666',
          stackType: 'Ingestion',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-DataProcessing-6666-6666',
          stackType: 'DataProcessing',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-Reporting-6666-6666',
          stackType: 'Reporting',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-DataModelingRedshift-6666-6666',
          stackType: 'DataModelingRedshift',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-Metrics-6666-6666',
          stackType: 'Metrics',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
      ],
      status: 'Updating',
    });
  });
  it('Get pipeline list with report stack updating', async () => {
    projectExistedMock(ddbMock, true);
    pipelineExistedMock(ddbMock, true);
    ddbMock.on(QueryCommand).resolves({
      Items: [KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW],
    });
    cloudFormationMock
      .on(DescribeStacksCommand)
      .resolves({
        Stacks: [{
          StackName: 'test',
          StackStatus: StackStatus.UPDATE_COMPLETE,
          StackStatusReason: '',
          CreationTime: undefined,
        }],
      })
      .on(DescribeStacksCommand, {
        StackName: 'Clickstream-Reporting-6666-6666',
      })
      .resolves({
        Stacks: [{
          StackName: 'test',
          StackStatus: StackStatus.UPDATE_IN_PROGRESS,
          StackStatusReason: '',
          CreationTime: undefined,
        }],
      })
    ;
    ddbMock.on(UpdateCommand).resolves({});
    sfnMock.on(DescribeExecutionCommand).resolves({
      executionArn: 'xx',
      stateMachineArn: 'yy',
      name: 'exec1',
      status: ExecutionStatus.SUCCEEDED,
      output: 'SUCCEEDED',
    });
    const res = await request(app)
      .get(`/api/pipeline?pid=${MOCK_PROJECT_ID}`);
    expect(cloudFormationMock).toHaveReceivedCommandTimes(DescribeStacksCommand, 6);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.items[0].status).toEqual({
      executionDetail: {
        name: 'exec1',
        output: 'SUCCEEDED',
        status: 'SUCCEEDED',
      },
      stackDetails: [
        {
          stackName: 'Clickstream-KafkaConnector-6666-6666',
          stackType: 'KafkaConnector',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-Ingestion-kafka-6666-6666',
          stackType: 'Ingestion',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-DataProcessing-6666-6666',
          stackType: 'DataProcessing',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-Reporting-6666-6666',
          stackType: 'Reporting',
          stackStatus: 'UPDATE_IN_PROGRESS',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-DataModelingRedshift-6666-6666',
          stackType: 'DataModelingRedshift',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-Metrics-6666-6666',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
          stackType: 'Metrics',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
      ],
      status: 'Updating',
    });
  });
  it('Get pipeline list with step function execution interval ', async () => {
    projectExistedMock(ddbMock, true);
    pipelineExistedMock(ddbMock, true);
    ddbMock.on(QueryCommand).resolves({
      Items: [KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW],
    });
    cloudFormationMock
      .on(DescribeStacksCommand)
      .resolves({
        Stacks: [{
          StackName: 'test',
          StackStatus: StackStatus.UPDATE_COMPLETE,
          StackStatusReason: '',
          CreationTime: undefined,
        }],
      });
    ddbMock.on(UpdateCommand).resolves({});
    sfnMock.on(DescribeExecutionCommand).resolves({
      executionArn: 'xx',
      stateMachineArn: 'yy',
      name: 'exec1',
      status: ExecutionStatus.RUNNING,
      input: '{"Type":"Parallel","End":true,"Branches":[{"States":{"Ingestion":{"Type":"Stack","Data":{"Input":{"Region":"ap-southeast-1","TemplateURL":"xxx","Action":"Update","Parameters":[],"StackName":"xxx","Tags":[]},"Callback":{"BucketPrefix":"xxx","BucketName":"xxx"}},"End":true}},"StartAt":"Ingestion"}]}',
      output: 'SUCCEEDED',
    });
    const res = await request(app)
      .get(`/api/pipeline?pid=${MOCK_PROJECT_ID}`);
    expect(cloudFormationMock).toHaveReceivedCommandTimes(DescribeStacksCommand, 6);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.items[0].status).toEqual({
      executionDetail: {
        name: 'exec1',
        output: 'SUCCEEDED',
        status: 'RUNNING',
      },
      stackDetails: [
        {
          stackName: 'Clickstream-KafkaConnector-6666-6666',
          stackType: 'KafkaConnector',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-Ingestion-kafka-6666-6666',
          stackType: 'Ingestion',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-DataProcessing-6666-6666',
          stackType: 'DataProcessing',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-Reporting-6666-6666',
          stackType: 'Reporting',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-DataModelingRedshift-6666-6666',
          stackType: 'DataModelingRedshift',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        }, {
          stackName: 'Clickstream-Metrics-6666-6666',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
          stackType: 'Metrics',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
      ],
      status: 'Updating',
    });
  });
  it('Get pipeline list with stack deleting', async () => {
    projectExistedMock(ddbMock, true);
    pipelineExistedMock(ddbMock, true);
    ddbMock.on(QueryCommand).resolves({
      Items: [KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW],
    });
    cloudFormationMock.on(DescribeStacksCommand)
      .resolvesOnce({
        Stacks: [{
          StackName: 'test',
          StackStatus: StackStatus.DELETE_IN_PROGRESS,
          StackStatusReason: '',
          CreationTime: undefined,
        }],
      })
      .resolves({
        Stacks: [{
          StackName: 'test',
          StackStatus: StackStatus.DELETE_COMPLETE,
          StackStatusReason: '',
          CreationTime: undefined,
        }],
      });
    ddbMock.on(UpdateCommand).resolves({});
    sfnMock.on(DescribeExecutionCommand).resolves({
      executionArn: 'xx',
      stateMachineArn: 'yy',
      name: 'exec1',
      status: ExecutionStatus.SUCCEEDED,
      output: 'SUCCEEDED',
    });
    const res = await request(app)
      .get(`/api/pipeline?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.items[0].status).toEqual({
      executionDetail: {
        name: 'exec1',
        output: 'SUCCEEDED',
        status: 'SUCCEEDED',
      },
      stackDetails: [
        {
          stackName: 'Clickstream-KafkaConnector-6666-6666',
          stackType: 'KafkaConnector',
          stackStatus: 'DELETE_IN_PROGRESS',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-Ingestion-kafka-6666-6666',
          stackType: 'Ingestion',
          stackStatus: 'DELETE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-DataProcessing-6666-6666',
          stackType: 'DataProcessing',
          stackStatus: 'DELETE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-Reporting-6666-6666',
          stackType: 'Reporting',
          stackStatus: 'DELETE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-DataModelingRedshift-6666-6666',
          stackType: 'DataModelingRedshift',
          stackStatus: 'DELETE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-Metrics-6666-6666',
          stackType: 'Metrics',
          stackStatus: 'DELETE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
      ],
      status: 'Deleting',
    });
  });
  it('Get pipeline list with stack active', async () => {
    projectExistedMock(ddbMock, true);
    pipelineExistedMock(ddbMock, true);
    ddbMock.on(QueryCommand).resolves({
      Items: [KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW],
    });
    cloudFormationMock.on(DescribeStacksCommand)
      .resolves({
        Stacks: [{
          StackName: 'test',
          StackStatus: StackStatus.UPDATE_COMPLETE,
          StackStatusReason: '',
          CreationTime: undefined,
        }],
      });
    ddbMock.on(UpdateCommand).resolves({});
    sfnMock.on(DescribeExecutionCommand).resolves({
      executionArn: 'xx',
      stateMachineArn: 'yy',
      name: 'exec1',
      status: ExecutionStatus.SUCCEEDED,
      output: 'SUCCEEDED',
    });
    const res = await request(app)
      .get(`/api/pipeline?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.items[0].status).toEqual({
      executionDetail: {
        name: 'exec1',
        output: 'SUCCEEDED',
        status: 'SUCCEEDED',
      },
      stackDetails: [
        {
          stackName: 'Clickstream-KafkaConnector-6666-6666',
          stackType: 'KafkaConnector',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-Ingestion-kafka-6666-6666',
          stackType: 'Ingestion',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-DataProcessing-6666-6666',
          stackType: 'DataProcessing',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-Reporting-6666-6666',
          stackType: 'Reporting',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-DataModelingRedshift-6666-6666',
          stackType: 'DataModelingRedshift',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-Metrics-6666-6666',
          stackType: 'Metrics',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
      ],
      status: 'Active',
    });
  });
  it('Get pipeline list with execution fail status and all stack complate', async () => {
    projectExistedMock(ddbMock, true);
    pipelineExistedMock(ddbMock, true);
    ddbMock.on(QueryCommand).resolves({
      Items: [KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW],
    });
    cloudFormationMock.on(DescribeStacksCommand)
      .resolves({
        Stacks: [{
          StackName: 'test',
          StackStatus: StackStatus.CREATE_COMPLETE,
          StackStatusReason: '',
          CreationTime: undefined,
        }],
      });
    ddbMock.on(UpdateCommand).resolves({});
    sfnMock.on(DescribeExecutionCommand).resolves({
      executionArn: 'xx',
      stateMachineArn: 'yy',
      name: 'exec1',
      status: ExecutionStatus.FAILED,
      output: 'error',
    });
    const res = await request(app)
      .get(`/api/pipeline?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.items[0].status).toEqual({
      executionDetail: {
        name: 'exec1',
        output: 'error',
        status: 'FAILED',
      },
      stackDetails: [
        {
          stackName: 'Clickstream-KafkaConnector-6666-6666',
          stackType: 'KafkaConnector',
          stackStatus: 'CREATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-Ingestion-kafka-6666-6666',
          stackType: 'Ingestion',
          stackStatus: 'CREATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-DataProcessing-6666-6666',
          stackType: 'DataProcessing',
          stackStatus: 'CREATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-Reporting-6666-6666',
          stackType: 'Reporting',
          stackStatus: 'CREATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-DataModelingRedshift-6666-6666',
          stackType: 'DataModelingRedshift',
          stackStatus: 'CREATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-Metrics-6666-6666',
          stackType: 'Metrics',
          stackStatus: 'CREATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
      ],
      status: 'Active',
    });
  });
  it('Get pipeline list with execution fail status and miss stack', async () => {
    projectExistedMock(ddbMock, true);
    pipelineExistedMock(ddbMock, true);
    ddbMock.on(QueryCommand).resolves({
      Items: [KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW],
    });
    cloudFormationMock.on(DescribeStacksCommand)
      .resolvesOnce({})
      .resolves({
        Stacks: [{
          StackName: 'test',
          StackStatus: StackStatus.CREATE_COMPLETE,
          StackStatusReason: '',
          CreationTime: undefined,
        }],
      });
    ddbMock.on(UpdateCommand).resolves({});
    sfnMock.on(DescribeExecutionCommand).resolves({
      executionArn: 'xx',
      stateMachineArn: 'yy',
      name: 'exec1',
      status: ExecutionStatus.FAILED,
      output: 'error',
    });
    const res = await request(app)
      .get(`/api/pipeline?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.items[0].status).toEqual({
      executionDetail: {
        name: 'exec1',
        output: 'error',
        status: 'FAILED',
      },
      stackDetails: [
        {
          stackName: 'Clickstream-KafkaConnector-6666-6666',
          stackType: 'KafkaConnector',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-Ingestion-kafka-6666-6666',
          stackType: 'Ingestion',
          stackStatus: 'CREATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-DataProcessing-6666-6666',
          stackType: 'DataProcessing',
          stackStatus: 'CREATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-Reporting-6666-6666',
          stackType: 'Reporting',
          stackStatus: 'CREATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-DataModelingRedshift-6666-6666',
          stackType: 'DataModelingRedshift',
          stackStatus: 'CREATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-Metrics-6666-6666',
          stackType: 'Metrics',
          stackStatus: 'CREATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
      ],
      status: 'Failed',
    });
  });
  it('Get pipeline list with stack fail status', async () => {
    projectExistedMock(ddbMock, true);
    pipelineExistedMock(ddbMock, true);
    ddbMock.on(QueryCommand).resolves({
      Items: [KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW],
    });
    cloudFormationMock.on(DescribeStacksCommand)
      .resolvesOnce({
        Stacks: [{
          StackName: 'test',
          StackStatus: StackStatus.CREATE_COMPLETE,
          StackStatusReason: '',
          CreationTime: undefined,
        }],
      })
      .resolves({
        Stacks: [{
          StackName: 'test',
          StackStatus: StackStatus.UPDATE_FAILED,
          StackStatusReason: '',
          CreationTime: undefined,
        }],
      });
    ddbMock.on(UpdateCommand).resolves({});
    sfnMock.on(DescribeExecutionCommand).resolves({
      executionArn: 'xx',
      stateMachineArn: 'yy',
      name: 'exec1',
      status: ExecutionStatus.SUCCEEDED,
      output: 'SUCCEEDED',
    });
    const res = await request(app)
      .get(`/api/pipeline?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.items[0].status).toEqual({
      status: 'Failed',
      stackDetails: [
        {
          stackName: 'Clickstream-KafkaConnector-6666-6666',
          stackType: 'KafkaConnector',
          stackStatus: 'CREATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-Ingestion-kafka-6666-6666',
          stackType: 'Ingestion',
          stackStatus: 'UPDATE_FAILED',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-DataProcessing-6666-6666',
          stackType: 'DataProcessing',
          stackStatus: 'UPDATE_FAILED',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-Reporting-6666-6666',
          stackType: 'Reporting',
          stackStatus: 'UPDATE_FAILED',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-DataModelingRedshift-6666-6666',
          stackType: 'DataModelingRedshift',
          stackStatus: 'UPDATE_FAILED',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-Metrics-6666-6666',
          stackType: 'Metrics',
          stackStatus: 'UPDATE_FAILED',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
      ],
      executionDetail: {
        name: 'exec1',
        status: 'SUCCEEDED',
        output: 'SUCCEEDED',
      },
    });
  });
  it('Update pipeline', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock,
      ec2Mock, sfnMock, secretsManagerMock, quickSightMock, s3Mock, {
        publicAZContainPrivateAZ: true,
        subnetsCross3AZ: true,
        subnetsIsolated: true,
        update: true,
        updatePipeline: KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW,
      });
    cloudFormationMock.on(DescribeStacksCommand).resolves({
      Stacks: [
        {
          StackName: 'xxx',
          Outputs: [
            {
              OutputKey: 'IngestionServerC000IngestionServerURL',
              OutputValue: 'http://xxx/xxx',
            },
            {
              OutputKey: 'IngestionServerC000IngestionServerDNS',
              OutputValue: 'http://yyy/yyy',
            },
            {
              OutputKey: 'Dashboards',
              OutputValue: '[{"appId":"app1","dashboardId":"clickstream_dashboard_v1_notepad_mtzfsocy_app1"},{"appId":"app2","dashboardId":"clickstream_dashboard_v1_notepad_mtzfsocy_app2"}]',
            },
            {
              OutputKey: 'ObservabilityDashboardName',
              OutputValue: 'clickstream_dashboard_notepad_mtzfsocy',
            },
          ],
          StackStatus: StackStatus.CREATE_COMPLETE,
          CreationTime: new Date(),
        },
      ],
    });

    ddbMock.on(TransactWriteItemsCommand).resolves({});
    let res = await request(app)
      .put(`/api/pipeline/${MOCK_PIPELINE_ID}`)
      .send(KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 6);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      data: {
        id: MOCK_PIPELINE_ID,
      },
      success: true,
      message: 'Pipeline updated.',
    });

    // Mock DynamoDB error
    ddbMock.on(TransactWriteItemsCommand).rejects(new Error('Mock DynamoDB error'));
    res = await request(app)
      .put(`/api/pipeline/${MOCK_PIPELINE_ID}`)
      .send(KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('Update pipeline with emails changed', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock,
      ec2Mock, sfnMock, secretsManagerMock, quickSightMock, s3Mock, {
        publicAZContainPrivateAZ: true,
        subnetsCross3AZ: true,
        subnetsIsolated: true,
        update: true,
        updatePipeline: KINESIS_DATA_PROCESSING_NEW_REDSHIFT_UPDATE_PIPELINE_WITH_WORKFLOW,
      });
    cloudFormationMock.on(DescribeStacksCommand).resolves({
      Stacks: [
        {
          StackName: 'xxx',
          Outputs: [
            {
              OutputKey: 'IngestionServerC000IngestionServerURL',
              OutputValue: 'http://xxx/xxx',
            },
            {
              OutputKey: 'IngestionServerC000IngestionServerDNS',
              OutputValue: 'http://yyy/yyy',
            },
            {
              OutputKey: 'Dashboards',
              OutputValue: '[{"appId":"app1","dashboardId":"clickstream_dashboard_v1_notepad_mtzfsocy_app1"},{"appId":"app2","dashboardId":"clickstream_dashboard_v1_notepad_mtzfsocy_app2"}]',
            },
            {
              OutputKey: 'ObservabilityDashboardName',
              OutputValue: 'clickstream_dashboard_notepad_mtzfsocy',
            },
          ],
          StackStatus: StackStatus.CREATE_COMPLETE,
          CreationTime: new Date(),
        },
      ],
    });

    ddbMock.on(TransactWriteItemsCommand).resolves({});
    const res = await request(app)
      .put(`/api/pipeline/${MOCK_PIPELINE_ID}`)
      .send(KINESIS_DATA_PROCESSING_NEW_REDSHIFT_UPDATE_PIPELINE_WITH_WORKFLOW);
    expect(ddbMock).toHaveReceivedCommandTimes(GetCommand, 6);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      data: {
        id: MOCK_PIPELINE_ID,
      },
      success: true,
      message: 'Pipeline updated.',
    });
  });
  it('Update pipeline with not match id', async () => {
    projectExistedMock(ddbMock, true);
    pipelineExistedMock(ddbMock, true);
    const res = await request(app)
      .put(`/api/pipeline/${MOCK_PIPELINE_ID}1`)
      .send(KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'body',
          msg: 'ID in path does not match ID in body.',
          param: 'pipelineId',
          value: MOCK_PIPELINE_ID,
        },
      ],
    });
  });
  it('Update pipeline with not body', async () => {
    projectExistedMock(ddbMock, true);
    pipelineExistedMock(ddbMock, true);
    const res = await request(app)
      .put(`/api/pipeline/${MOCK_PIPELINE_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          msg: 'Value is empty.',
          param: 'projectId',
          location: 'body',
        },
        {
          msg: 'Value is empty.',
          param: 'version',
          location: 'body',
        },
        {
          msg: 'Value is empty.',
          param: 'pipelineId',
          location: 'body',
        },
        {
          msg: 'ID in path does not match ID in body.',
          param: 'pipelineId',
          location: 'body',
        },
      ],
    });

  });
  it('Update pipeline with project no existed', async () => {
    projectExistedMock(ddbMock, false);
    pipelineExistedMock(ddbMock, true);
    const res = await request(app)
      .put(`/api/pipeline/${MOCK_PIPELINE_ID}`)
      .send(KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'body',
          msg: 'Project resource does not exist.',
          param: 'projectId',
          value: MOCK_PROJECT_ID,
        },
      ],
    });
  });
  it('Update pipeline with no existed', async () => {
    projectExistedMock(ddbMock, true);
    pipelineExistedMock(ddbMock, false);
    const res = await request(app)
      .put(`/api/pipeline/${MOCK_PIPELINE_ID}`)
      .send(KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'Pipeline resource does not exist.',
    });
  });
  it('Update pipeline with error version', async () => {

    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock,
      ec2Mock, sfnMock, secretsManagerMock, quickSightMock, s3Mock, {
        publicAZContainPrivateAZ: true,
        subnetsCross3AZ: true,
        subnetsIsolated: true,
        update: true,
        updatePipeline: KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW,
      });
    cloudFormationMock.on(DescribeStacksCommand).resolves({
      Stacks: [
        {
          StackName: 'xxx',
          Outputs: [
            {
              OutputKey: 'IngestionServerC000IngestionServerURL',
              OutputValue: 'http://xxx/xxx',
            },
            {
              OutputKey: 'IngestionServerC000IngestionServerDNS',
              OutputValue: 'http://yyy/yyy',
            },
            {
              OutputKey: 'Dashboards',
              OutputValue: '[{"appId":"app1","dashboardId":"clickstream_dashboard_v1_notepad_mtzfsocy_app1"},{"appId":"app2","dashboardId":"clickstream_dashboard_v1_notepad_mtzfsocy_app2"}]',
            },
            {
              OutputKey: 'ObservabilityDashboardName',
              OutputValue: 'clickstream_dashboard_notepad_mtzfsocy',
            },
          ],
          StackStatus: StackStatus.CREATE_COMPLETE,
          CreationTime: new Date(),
        },
      ],
    });
    const mockError = new Error('TransactionCanceledException');
    mockError.name = 'TransactionCanceledException';
    ddbMock.on(TransactWriteItemsCommand).rejects(mockError);
    const res = await request(app)
      .put(`/api/pipeline/${MOCK_PIPELINE_ID}`)
      .send({
        ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW,
        version: '0',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Update error, check version and retry.',
    });
  });
  it('Upgrade pipeline', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    ddbMock.on(GetCommand, { Key: { id: MOCK_PROJECT_ID, type: `PIPELINE#${MOCK_PIPELINE_ID}#latest` }, TableName: clickStreamTableName }).resolves({
      Item: KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW_FOR_UPGRADE,
    });
    cloudFormationMock.on(DescribeStacksCommand).resolves({
      Stacks: [
        {
          StackName: 'xxx',
          StackStatus: StackStatus.CREATE_COMPLETE,
          CreationTime: new Date(),
        },
      ],
    });
    sfnMock.on(StartExecutionCommand).resolves({ executionArn: 'xxx' });
    ddbMock.on(TransactWriteItemsCommand).resolves({});
    let res = await request(app)
      .post(`/api/pipeline/${MOCK_PIPELINE_ID}/upgrade?pid=${MOCK_PROJECT_ID}`)
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.body).toEqual({
      data: {
        id: MOCK_PIPELINE_ID,
      },
      success: true,
      message: 'Pipeline upgraded.',
    });
  });
  it('Upgrade pipeline with error server size', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    ddbMock.on(GetCommand, { Key: { id: MOCK_PROJECT_ID, type: `PIPELINE#${MOCK_PIPELINE_ID}#latest` }, TableName: clickStreamTableName }).resolves({
      Item: {
        ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW_FOR_UPGRADE,
        ingestionServer: {
          ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW_FOR_UPGRADE.ingestionServer,
          size: {
            serverMax: 1,
            warmPoolSize: 1,
            serverMin: 1,
            scaleOnCpuUtilizationPercent: 50,
          },
        },
      },
    });
    cloudFormationMock.on(DescribeStacksCommand).resolves({
      Stacks: [
        {
          StackName: 'xxx',
          StackStatus: StackStatus.CREATE_COMPLETE,
          CreationTime: new Date(),
        },
      ],
    });
    sfnMock.on(StartExecutionCommand).resolves({ executionArn: 'xxx' });
    ddbMock.on(TransactWriteItemsCommand).resolves({});
    let res = await request(app)
      .post(`/api/pipeline/${MOCK_PIPELINE_ID}/upgrade?pid=${MOCK_PROJECT_ID}`)
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.body).toEqual({
      success: false,
      message: 'Validation error: this pipeline not allow to upgrade with the server size minimum and maximum are 1.',
    });
  });
  it('Upgrade pipeline with error status', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    ddbMock.on(GetCommand, { Key: { id: MOCK_PROJECT_ID, type: `PIPELINE#${MOCK_PIPELINE_ID}#latest` }, TableName: clickStreamTableName }).resolves({
      Item: KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW,
    });
    ddbMock.on(TransactWriteItemsCommand).resolves({});
    let res = await request(app)
      .post(`/api/pipeline/${MOCK_PIPELINE_ID}/upgrade?pid=${MOCK_PROJECT_ID}`)
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.body).toEqual({
      success: false,
      message: 'The pipeline current status does not allow upgrade.',
    });
  });
  it('Delete pipeline', async () => {
    projectExistedMock(ddbMock, true);
    pipelineExistedMock(ddbMock, true);
    ddbMock.on(GetCommand).resolves({
      Item: KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW,
    });
    sfnMock.on(StartExecutionCommand).resolves({ executionArn: 'xxx' });
    ddbMock.on(ScanCommand).resolves({
      Items: [],
    });
    ddbMock.on(UpdateCommand).resolves({});
    let res = await request(app)
      .delete(`/api/pipeline/${MOCK_PIPELINE_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      data: null,
      success: true,
      message: 'Pipeline deleted.',
    });

    // Mock DynamoDB error
    ddbMock.on(UpdateCommand).rejects(new Error('Mock DynamoDB error'));
    res = await request(app)
      .delete(`/api/pipeline/${MOCK_PIPELINE_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('Delete pipeline with no pid', async () => {
    projectExistedMock(ddbMock, true);
    pipelineExistedMock(ddbMock, true);
    const res = await request(app)
      .delete(`/api/pipeline/${MOCK_PIPELINE_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'params',
          msg: 'query.pid value is empty.',
          param: 'id',
          value: MOCK_PIPELINE_ID,
        },
        {
          location: 'query',
          msg: 'Value is empty.',
          param: 'pid',
        },
      ],
    });
  });
  it('Delete pipeline with no project existed', async () => {
    projectExistedMock(ddbMock, false);
    pipelineExistedMock(ddbMock, true);
    const res = await request(app)
      .delete(`/api/pipeline/${MOCK_PIPELINE_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'query',
          msg: 'Project resource does not exist.',
          param: 'pid',
          value: MOCK_PROJECT_ID,
        },
      ],
    });
  });
  it('Delete pipeline with no existed', async () => {
    projectExistedMock(ddbMock, true);
    pipelineExistedMock(ddbMock, false);
    const res = await request(app)
      .delete(`/api/pipeline/${MOCK_PIPELINE_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'params',
          msg: 'Pipeline resource does not exist.',
          param: 'id',
          value: MOCK_PIPELINE_ID,
        },
      ],
    });
  });
  afterAll((done) => {
    server.close();
    done();
  });
});