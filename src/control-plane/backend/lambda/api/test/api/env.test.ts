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

import { FetchType } from '@aws/clickstream-base-lib';
import { ACMClient, CertificateStatus, KeyAlgorithm, ListCertificatesCommand } from '@aws-sdk/client-acm';
import { CloudFormationClient, DescribeTypeCommand } from '@aws-sdk/client-cloudformation';
import {
  CloudWatchClient,
  DescribeAlarmsCommand,
  DisableAlarmActionsCommand, EnableAlarmActionsCommand,
} from '@aws-sdk/client-cloudwatch';
import {
  EC2Client,
  DescribeRegionsCommand,
  DescribeVpcsCommand,
  DescribeSubnetsCommand,
  DescribeRouteTablesCommand,
  DescribeSecurityGroupsCommand,
} from '@aws-sdk/client-ec2';
import { IAMClient, ListRolesCommand } from '@aws-sdk/client-iam';
import { ClientBroker, KafkaClient, ListClustersV2Command } from '@aws-sdk/client-kafka';
import {
  QuickSightClient,
  DescribeAccountSubscriptionCommand,
  ListUsersCommand,
  ResourceNotFoundException,
} from '@aws-sdk/client-quicksight';
import { RedshiftClient, DescribeClustersCommand } from '@aws-sdk/client-redshift';
import { RedshiftServerlessClient, ListWorkgroupsCommand } from '@aws-sdk/client-redshift-serverless';
import { S3Client, ListBucketsCommand, GetBucketLocationCommand } from '@aws-sdk/client-s3';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import fetch, { Response } from 'node-fetch';
import request from 'supertest';
import { MOCK_PROJECT_ID, MOCK_TOKEN, projectExistedMock } from './ddb-mock';
import { KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW } from './pipeline-mock';
import { app, server } from '../../index';

jest.mock('node-fetch');
const ddbMock = mockClient(DynamoDBDocumentClient);
const ec2ClientMock = mockClient(EC2Client);
const s3Client = mockClient(S3Client);
const kafkaClient = mockClient(KafkaClient);
const redshiftClient = mockClient(RedshiftClient);
const redshiftServerlessClient = mockClient(RedshiftServerlessClient);
const quickSightClient = mockClient(QuickSightClient);
const iamClient = mockClient(IAMClient);
const acmClient = mockClient(ACMClient);
const cloudWatchClient = mockClient(CloudWatchClient);
const cloudFormationMock = mockClient(CloudFormationClient);

describe('Account Env test', () => {
  beforeEach(() => {
    ddbMock.reset();
    ec2ClientMock.reset();
    s3Client.reset();
    kafkaClient.reset();
    redshiftClient.reset();
    redshiftServerlessClient.reset();
    quickSightClient.reset();
    iamClient.reset();
    acmClient.reset();
    cloudWatchClient.reset();
    cloudFormationMock.reset();
  });
  it('Get regions', async () => {
    ec2ClientMock.on(DescribeRegionsCommand).resolves({
      Regions: [
        { RegionName: 'us-east-1' },
        { RegionName: 'ap-northeast-4' },
      ],
    });
    let res = await request(app).get('/api/env/regions');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          RegionName: 'us-east-1',
        },
      ],
    });
  });
  it('Get vpc from default region', async () => {
    ec2ClientMock.on(DescribeVpcsCommand).resolves({
      Vpcs: [
        {
          VpcId: 'vpc-0ba32b04ccc029088',
          CidrBlock: '10.255.0.0/16',
          IsDefault: false,
          Tags: [
            {
              Key: 'Name',
              Value: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC',
            },
          ],
        },
        {
          VpcId: 'vpc-0927cf9b0c5521882',
          CidrBlock: '172.31.0.0/16',
          IsDefault: true,
          Tags: [],
        },
      ],
    });
    let res = await request(app).get('/api/env/vpcs');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          VpcId: 'vpc-0ba32b04ccc029088',
          Name: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC',
          CidrBlock: '10.255.0.0/16',
          IsDefault: false,
        },
        {
          VpcId: 'vpc-0927cf9b0c5521882',
          Name: '',
          CidrBlock: '172.31.0.0/16',
          IsDefault: true,
        },
      ],
    });
  });
  it('Get vpc from specify region', async () => {
    ec2ClientMock.on(DescribeVpcsCommand).resolves({
      Vpcs: [
        {
          VpcId: 'vpc-0ba32b04ccc029088',
          CidrBlock: '10.255.0.0/16',
          IsDefault: false,
          Tags: [
            {
              Key: 'Name',
              Value: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC',
            },
          ],
        },
        {
          VpcId: 'vpc-0927cf9b0c5521882',
          CidrBlock: '172.31.0.0/16',
          IsDefault: true,
          Tags: [],
        },
      ],
    });
    let res = await request(app).get('/api/env/vpcs?region=us-east-1');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          VpcId: 'vpc-0ba32b04ccc029088',
          Name: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC',
          CidrBlock: '10.255.0.0/16',
          IsDefault: false,
        },
        {
          VpcId: 'vpc-0927cf9b0c5521882',
          Name: '',
          CidrBlock: '172.31.0.0/16',
          IsDefault: true,
        },
      ],
    });
  });
  it('Get securitygroups from default region', async () => {
    ec2ClientMock.on(DescribeSecurityGroupsCommand).resolves({
      SecurityGroups: [
        {
          GroupId: 'sg-043f6a0f412c93545',
          GroupName: 'msk',
          Description: 'msk',
        },
      ],
    });
    let res = await request(app).get('/api/env/vpc/vpc-0ba32b04ccc029088/securityGroups');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          GroupId: 'sg-043f6a0f412c93545',
          GroupName: 'msk',
          Description: 'msk',
        },
      ],
    });
  });
  it('Get subnet from default region', async () => {
    ec2ClientMock.on(DescribeSubnetsCommand).resolves({
      Subnets: [
        {
          SubnetId: 'subnet-09ae522e85bbee5c5',
          CidrBlock: '10.255.1.0/24',
          AvailabilityZone: 'us-east-1b',
          MapPublicIpOnLaunch: false,
          Tags: [
            {
              Key: 'Name',
              Value: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/publicSubnet2',
            },
          ],
        },
        {
          SubnetId: 'subnet-0b9fa05e061084b37',
          CidrBlock: '10.255.0.0/24',
          AvailabilityZone: 'us-east-1a',
          MapPublicIpOnLaunch: true,
          Tags: [
            {
              Key: 'Name',
              Value: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/publicSubnet1',
            },
          ],
        },
      ],
    });
    ec2ClientMock.on(DescribeRouteTablesCommand).resolves({
      RouteTables: [
        {
          Associations: [{
            Main: true,
          }],
          Routes: [
            { GatewayId: 'igw-xxxx' },
          ],
        },
      ],
    });
    let res = await request(app).get('/api/env/vpc/vpc-0ba32b04ccc029088/subnets');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          SubnetId: 'subnet-0b9fa05e061084b37',
          Name: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/publicSubnet1',
          CidrBlock: '10.255.0.0/24',
          AvailabilityZone: 'us-east-1a',
          Type: 'public',
        },
        {
          SubnetId: 'subnet-09ae522e85bbee5c5',
          Name: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/publicSubnet2',
          CidrBlock: '10.255.1.0/24',
          AvailabilityZone: 'us-east-1b',
          Type: 'public',
        },
      ],
    });
  });
  it('Get subnet from specify region', async () => {
    ec2ClientMock.on(DescribeSubnetsCommand).resolves({
      Subnets: [
        {
          SubnetId: 'subnet-0b9fa05e061084b37',
          CidrBlock: '10.255.0.0/24',
          AvailabilityZone: 'us-east-1a',
          MapPublicIpOnLaunch: true,
          Tags: [
            {
              Key: 'Name',
              Value: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/publicSubnet1',
            },
          ],
        },
        {
          SubnetId: 'subnet-09ae522e85bbee5c5',
          CidrBlock: '10.255.1.0/24',
          AvailabilityZone: 'us-east-1b',
          MapPublicIpOnLaunch: false,
          Tags: [
            {
              Key: 'Name',
              Value: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/publicSubnet2',
            },
          ],
        },
      ],
    });
    ec2ClientMock.on(DescribeRouteTablesCommand).resolves({
      RouteTables: [
        {
          Associations: [{
            Main: true,
          }],
          Routes: [
            { GatewayId: 'local' },
          ],
        },
      ],
    });
    let res = await request(app).get('/api/env/vpc/vpc-0ba32b04ccc029088/subnets?region=us-east-1');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          SubnetId: 'subnet-0b9fa05e061084b37',
          Name: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/publicSubnet1',
          CidrBlock: '10.255.0.0/24',
          AvailabilityZone: 'us-east-1a',
          Type: 'isolated',
        },
        {
          SubnetId: 'subnet-09ae522e85bbee5c5',
          Name: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/publicSubnet2',
          CidrBlock: '10.255.1.0/24',
          AvailabilityZone: 'us-east-1b',
          Type: 'isolated',
        },
      ],
    });
  });
  it('Get subnet route table', async () => {
    ec2ClientMock.on(DescribeSubnetsCommand).resolves({
      Subnets: [
        {
          SubnetId: 'subnet-0b9fa05e061084b37',
          CidrBlock: '10.255.0.0/24',
          AvailabilityZone: 'us-east-1a',
          MapPublicIpOnLaunch: true,
          Tags: [
            {
              Key: 'Name',
              Value: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/publicSubnet1',
            },
          ],
        },
      ],
    });
    ec2ClientMock.on(DescribeRouteTablesCommand).resolves({
      RouteTables: [
        {
          Associations: [{
            SubnetId: 'subnet-0b9fa05e061084b37',
          }],
          Routes: [
            { GatewayId: 'igw-xxxx' },
          ],
        },
      ],
    });
    let res = await request(app).get('/api/env/vpc/vpc-0ba32b04ccc029088/subnets?region=us-east-1');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          SubnetId: 'subnet-0b9fa05e061084b37',
          Name: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/publicSubnet1',
          CidrBlock: '10.255.0.0/24',
          AvailabilityZone: 'us-east-1a',
          Type: 'public',
        },
      ],
    });
  });
  it('Get subnet from type', async () => {
    ec2ClientMock.on(DescribeSubnetsCommand).resolves({
      Subnets: [
        {
          SubnetId: 'subnet-0b9fa05e061084b37',
          CidrBlock: '10.255.0.0/24',
          AvailabilityZone: 'us-east-1a',
          MapPublicIpOnLaunch: true,
          Tags: [
            {
              Key: 'Name',
              Value: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/publicSubnet1',
            },
          ],
        },
      ],
    });
    ec2ClientMock.on(DescribeRouteTablesCommand).resolves({
      RouteTables: [
        {
          Associations: [{
            Main: true,
          }],
          Routes: [
            { GatewayId: 'igw-xxxx' },
          ],
        },
      ],
    });
    let res = await request(app).get('/api/env/vpc/vpc-0ba32b04ccc029088/subnets?region=us-east-1&subnetType=public');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          SubnetId: 'subnet-0b9fa05e061084b37',
          Name: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/publicSubnet1',
          CidrBlock: '10.255.0.0/24',
          AvailabilityZone: 'us-east-1a',
          Type: 'public',
        },
      ],
    });
  });
  it('Get private subnet', async () => {
    ec2ClientMock.on(DescribeSubnetsCommand).resolves({
      Subnets: [
        {
          SubnetId: 'subnet-0b9fa05e061084b37',
          CidrBlock: '10.255.0.0/24',
          AvailabilityZone: 'us-east-1a',
          MapPublicIpOnLaunch: false,
          Tags: [
            {
              Key: 'Name',
              Value: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/isolatedSubnet1',
            },
          ],
        },
        {
          SubnetId: 'subnet-0b9fa05e061084b38',
          CidrBlock: '10.255.0.0/24',
          AvailabilityZone: 'us-east-1b',
          MapPublicIpOnLaunch: false,
          Tags: [
            {
              Key: 'Name',
              Value: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/privateSubnet1',
            },
          ],
        },
      ],
    });
    ec2ClientMock.on(DescribeRouteTablesCommand).resolves({
      RouteTables: [
        {
          Associations: [{
            Main: true,
          }],
          Routes: [
            {
              DestinationCidrBlock: '0.0.0.0/0',
              NatGatewayId: 'local',
            },
          ],
        },
      ],
    });
    let res = await request(app).get('/api/env/vpc/vpc-0ba32b04ccc029088/subnets?region=us-east-1&subnetType=private');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          SubnetId: 'subnet-0b9fa05e061084b37',
          Name: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/isolatedSubnet1',
          CidrBlock: '10.255.0.0/24',
          AvailabilityZone: 'us-east-1a',
          Type: 'private',
        },
        {
          AvailabilityZone: 'us-east-1b',
          CidrBlock: '10.255.0.0/24',
          SubnetId: 'subnet-0b9fa05e061084b38',
          Name: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/privateSubnet1',
          Type: 'private',
        },
      ],
    });
  });
  it('Get isolated subnet', async () => {
    ec2ClientMock.on(DescribeSubnetsCommand).resolves({
      Subnets: [
        {
          SubnetId: 'subnet-0b9fa05e061084b37',
          CidrBlock: '10.255.0.0/24',
          AvailabilityZone: 'us-east-1a',
          MapPublicIpOnLaunch: false,
          Tags: [
            {
              Key: 'Name',
              Value: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/isolatedSubnet1',
            },
          ],
        },
      ],
    });
    ec2ClientMock.on(DescribeRouteTablesCommand).resolves({
      RouteTables: [
        {
          Associations: [{
            Main: true,
          }],
          Routes: [
            { GatewayId: 'local' },
          ],
        },
      ],
    });
    let res = await request(app).get('/api/env/vpc/vpc-0ba32b04ccc029088/subnets?region=us-east-1&subnetType=isolated');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          SubnetId: 'subnet-0b9fa05e061084b37',
          Name: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/isolatedSubnet1',
          CidrBlock: '10.255.0.0/24',
          AvailabilityZone: 'us-east-1a',
          Type: 'isolated',
        },
      ],
    });
  });
  it('Get buckets', async () => {
    s3Client.on(ListBucketsCommand).resolves({
      Buckets: [
        {
          Name: 'sagemaker-us-*****-east-1',
        },
        {
          Name: 'ssm-onboarding-bucket-*****-us-east-2',
        },
      ],
    });
    s3Client.on(GetBucketLocationCommand)
      .resolvesOnce({
        LocationConstraint: undefined,
      })
      .resolves({
        LocationConstraint: 'us-east-2',
      });
    const res = await request(app).get('/api/env/buckets');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          Name: 'sagemaker-us-*****-east-1',
          Location: 'us-east-1',
        },
        {
          Name: 'ssm-onboarding-bucket-*****-us-east-2',
          Location: 'us-east-2',
        },
      ],
    });
  });
  it('Get buckets with region', async () => {
    s3Client.on(ListBucketsCommand).resolves({
      Buckets: [
        {
          Name: 'sagemaker-us-*****-east-1',
        },
        {
          Name: 'ssm-onboarding-bucket-*****-us-east-2',
        },
      ],
    });
    s3Client.on(GetBucketLocationCommand)
      .resolvesOnce({
        LocationConstraint: undefined,
      })
      .resolves({
        LocationConstraint: 'us-east-2',
      });
    const res = await request(app).get('/api/env/buckets?region=us-east-1');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          Name: 'sagemaker-us-*****-east-1',
          Location: 'us-east-1',
        },
      ],
    });
  });
  it('Get MSK cluster(Provisioned)', async () => {
    kafkaClient.on(ListClustersV2Command).resolves({
      ClusterInfoList: [
        {
          ClusterName: 'demo-cluster-1',
          ClusterArn: 'arn:aws:kafka:us-east-1:111122223333:cluster/demo-cluster-1/0adf12f7-12f2-4b05-8690-b2ccfc3bedd3-20',
          ClusterType: 'PROVISIONED',
          Provisioned: {
            BrokerNodeGroupInfo: {
              InstanceType: 'kafka.m5.large',
              SecurityGroups: ['sg-111'],
              ClientSubnets: ['subnet-111'],
            },
            ClientAuthentication: {
              Unauthenticated: { Enabled: true },
              Sasl: { Iam: { Enabled: true } },
            },
            NumberOfBrokerNodes: 1,
            EncryptionInfo: {
              EncryptionInTransit: {
                ClientBroker: ClientBroker.TLS_PLAINTEXT,
              },
            },
          },
          State: 'ACTIVE',
        },
      ],
    });
    ec2ClientMock.on(DescribeSubnetsCommand).resolves({
      Subnets: [
        {
          SubnetId: 'subnet-0b9fa05e061084b37',
          VpcId: 'vpc-111',
          CidrBlock: '10.255.0.0/24',
          AvailabilityZone: 'us-east-1a',
          MapPublicIpOnLaunch: false,
          Tags: [
            {
              Key: 'Name',
              Value: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/publicSubnet1',
            },
          ],
        },
      ],
    });
    let res = await request(app).get('/api/env/MSKClusters?vpcId=vpc-111');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          ClusterName: 'demo-cluster-1',
          Authentication: ['IAM', 'Unauthenticated'],
          ClusterArn: 'arn:aws:kafka:us-east-1:111122223333:cluster/demo-cluster-1/0adf12f7-12f2-4b05-8690-b2ccfc3bedd3-20',
          ClusterType: 'PROVISIONED',
          State: 'ACTIVE',
          SecurityGroupId: 'sg-111',
          ClientBroker: 'TLS_PLAINTEXT',
        },
      ],
    });
  });
  it('Get MSK cluster(Serverless)', async () => {
    kafkaClient.on(ListClustersV2Command).resolves({
      ClusterInfoList: [
        {
          ClusterName: 'demo-cluster-1',
          ClusterArn: 'arn:aws:kafka:us-east-1:111122223333:cluster/demo-cluster-1/0adf12f7-12f2-4b05-8690-b2ccfc3bedd3-20',
          ClusterType: 'SERVERLESS',
          Serverless: {
            VpcConfigs: [
              {
                SubnetIds: ['subnet-111'],
                SecurityGroupIds: ['sg-111'],
              },
            ],
          },
          State: 'ACTIVE',
        },
      ],
    });
    ec2ClientMock.on(DescribeSubnetsCommand).resolves({
      Subnets: [
        {
          SubnetId: 'subnet-0b9fa05e061084b37',
          VpcId: 'vpc-111',
          CidrBlock: '10.255.0.0/24',
          AvailabilityZone: 'us-east-1a',
          MapPublicIpOnLaunch: false,
          Tags: [
            {
              Key: 'Name',
              Value: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/publicSubnet1',
            },
          ],
        },
      ],
    });
    let res = await request(app).get('/api/env/MSKClusters?vpcId=vpc-111');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          ClusterName: 'demo-cluster-1',
          Authentication: [],
          ClusterArn: 'arn:aws:kafka:us-east-1:111122223333:cluster/demo-cluster-1/0adf12f7-12f2-4b05-8690-b2ccfc3bedd3-20',
          ClusterType: 'SERVERLESS',
          State: 'ACTIVE',
          SecurityGroupId: 'sg-111',
          ClientBroker: '',
        },
      ],
    });
  });
  it('Get MSK cluster no vpc', async () => {
    kafkaClient.on(ListClustersV2Command).resolves({
      ClusterInfoList: [
        {
          ClusterName: 'demo-cluster-1',
          ClusterArn: 'arn:aws:kafka:us-east-1:111122223333:cluster/demo-cluster-1/0adf12f7-12f2-4b05-8690-b2ccfc3bedd3-20',
          ClusterType: 'PROVISIONED',
          State: 'ACTIVE',
        },
      ],
    });
    let res = await request(app).get('/api/env/MSKClusters');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'query',
          msg: 'Value is empty.',
          param: 'vpcId',
        },
      ],
    });
  });
  it('Get Redshift cluster', async () => {
    redshiftClient.on(DescribeClustersCommand).resolves({
      Clusters: [
        {
          ClusterIdentifier: 'redshift-cluster-1',
          NodeType: 'dc2.large',
          Endpoint: {
            Address: 'redshift-cluster-1.cyivjhsbgo3m.us-east-1.redshift.amazonaws.com',
            Port: 5439,
          },
          ClusterStatus: 'available',
          VpcId: 'vpc-111',
          MasterUsername: 'click1',
        },
        {
          ClusterIdentifier: 'redshift-cluster-2',
          NodeType: 'dc2.large',
          Endpoint: {
            Address: 'redshift-cluster-2.cyivjhsbgo3m.us-east-1.redshift.amazonaws.com',
            Port: 5438,
          },
          ClusterStatus: 'available',
          VpcId: 'vpc-222',
          MasterUsername: 'click2',
        },
      ],
    });
    let res = await request(app).get('/api/env/redshiftClusters?vpcId=vpc-111');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          ClusterSubnetGroupName: '',
          Name: 'redshift-cluster-1',
          NodeType: 'dc2.large',
          Endpoint: {
            Address: 'redshift-cluster-1.cyivjhsbgo3m.us-east-1.redshift.amazonaws.com',
            Port: 5439,
          },
          PubliclyAccessible: false,
          MasterUsername: 'click1',
          Status: 'available',
          VpcId: 'vpc-111',
          VpcSecurityGroupIds: [],
        },
      ],
    });
    res = await request(app).get('/api/env/redshiftClusters');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          ClusterSubnetGroupName: '',
          Name: 'redshift-cluster-1',
          NodeType: 'dc2.large',
          Endpoint: {
            Address: 'redshift-cluster-1.cyivjhsbgo3m.us-east-1.redshift.amazonaws.com',
            Port: 5439,
          },
          PubliclyAccessible: false,
          MasterUsername: 'click1',
          Status: 'available',
          VpcId: 'vpc-111',
          VpcSecurityGroupIds: [],
        },
        {
          ClusterSubnetGroupName: '',
          Name: 'redshift-cluster-2',
          NodeType: 'dc2.large',
          Endpoint: {
            Address: 'redshift-cluster-2.cyivjhsbgo3m.us-east-1.redshift.amazonaws.com',
            Port: 5438,
          },
          PubliclyAccessible: false,
          MasterUsername: 'click2',
          Status: 'available',
          VpcId: 'vpc-222',
          VpcSecurityGroupIds: [],
        },
      ],
    });
  });
  it('Get Redshift cluster with region', async () => {
    redshiftClient.on(DescribeClustersCommand).resolves({
      Clusters: [
        {
          ClusterIdentifier: 'redshift-cluster-1',
          NodeType: 'dc2.large',
          Endpoint: {
            Address: 'redshift-cluster-1.cyivjhsbgo3m.us-east-1.redshift.amazonaws.com',
            Port: 5439,
          },
          ClusterStatus: 'available',
          VpcId: 'vpc-111',
          MasterUsername: 'click',
        },
      ],
    });
    let res = await request(app).get('/api/env/redshiftClusters?region=us-east-1&vpcId=vpc-111');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          ClusterSubnetGroupName: '',
          Name: 'redshift-cluster-1',
          NodeType: 'dc2.large',
          Endpoint: {
            Address: 'redshift-cluster-1.cyivjhsbgo3m.us-east-1.redshift.amazonaws.com',
            Port: 5439,
          },
          PubliclyAccessible: false,
          MasterUsername: 'click',
          Status: 'available',
          VpcId: 'vpc-111',
          VpcSecurityGroupIds: [],

        },
      ],
    });
  });
  it('Get Redshift workgroup', async () => {
    redshiftServerlessClient.on(ListWorkgroupsCommand).resolves({
      workgroups: [
        {
          baseCapacity: 32,
          enhancedVpcRouting: false,
          namespaceName: 'test-ns',
          publiclyAccessible: false,
          securityGroupIds: [
            'sg-111',
          ],
          status: 'AVAILABLE',
          subnetIds: [
            'subnet-111',
          ],
          workgroupArn: 'arn:aws:redshift-serverless:ap-southeast-1:555555555555:workgroup/d60f7989-f4ce-46c5-95da-2f9cc7a27725',
          workgroupId: 'd60f7989-f4ce-46c5-95da-2f9cc7a27725',
          workgroupName: 'test',
        },
      ],
    });
    let res = await request(app).get('/api/env/redshiftServerlessWorkGroups');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          Id: 'd60f7989-f4ce-46c5-95da-2f9cc7a27725',
          Arn: 'arn:aws:redshift-serverless:ap-southeast-1:555555555555:workgroup/d60f7989-f4ce-46c5-95da-2f9cc7a27725',
          Name: 'test',
          Namespace: 'test-ns',
          Status: 'AVAILABLE',
        },
      ],
    });
  });
  it('Describe QuickSight', async () => {
    quickSightClient.on(DescribeAccountSubscriptionCommand).resolves({
      AccountInfo: {
        AccountName: 'Clickstream-xsxs',
        Edition: 'ENTERPRISE',
        NotificationEmail: 'fake@example.com',
        AuthenticationType: 'IDENTITY_POOL',
        AccountSubscriptionStatus: 'ACCOUNT_CREATED',
      },
    });
    const res = await request(app).get('/api/env/quickSightSubscription');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        AccountName: 'Clickstream-xsxs',
        AccountSubscriptionStatus: 'ACCOUNT_CREATED',
        AuthenticationType: 'IDENTITY_POOL',
        Edition: 'ENTERPRISE',
        NotificationEmail: 'fake@example.com',
      },
    });
  });
  it('Describe QuickSight with already exists', async () => {
    quickSightClient.on(DescribeAccountSubscriptionCommand).resolves({
      AccountInfo: {
        AccountName: 'xxxx-xsxs',
        Edition: 'ENTERPRISE',
        NotificationEmail: 'fake@example.com',
        AuthenticationType: 'IDENTITY_POOL',
        AccountSubscriptionStatus: 'ACCOUNT_CREATED',
      },
    });
    const res = await request(app).get('/api/env/quickSightSubscription');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        AccountName: 'xxxx-xsxs',
        AccountSubscriptionStatus: 'ACCOUNT_CREATED',
        AuthenticationType: 'IDENTITY_POOL',
        Edition: 'ENTERPRISE',
        NotificationEmail: 'fake@example.com',
      },
    });
  });
  it('Ping QuickSight', async () => {
    quickSightClient.on(ListUsersCommand).resolves({
      UserList: [
        {
          Arn: 'arn:aws:quicksight:us-east-1:111122223333:user/default/xxxx',
          UserName: 'xxxx',
          Email: 'fake@example.com',
        },
      ],
    });
    quickSightClient.on(DescribeAccountSubscriptionCommand).resolves({});
    const res = await request(app).get('/api/env/quickSightSubscription');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        AccountSubscriptionStatus: 'UNSUBSCRIBED',
      },
    });
  });
  it('Ping QuickSight with ResourceNotFoundException', async () => {
    quickSightClient.on(ListUsersCommand).resolves({
      UserList: [
        {
          Arn: 'arn:aws:quicksight:us-east-1:111122223333:user/default/xxxx',
          UserName: 'xxxx',
          Email: 'fake@example.com',
        },
      ],
    });
    const mockError = new ResourceNotFoundException({
      $metadata: {
        requestId: 'xxxx',
        extendedRequestId: undefined,
        cfId: undefined,
        attempts: 1,
        totalRetryDelay: 0,
      },
      message: 'ResourceNotFoundException',
    });
    quickSightClient.on(DescribeAccountSubscriptionCommand).rejects(mockError);
    const res = await request(app).get('/api/env/quickSightSubscription');
    expect(quickSightClient).toHaveReceivedCommandTimes(DescribeAccountSubscriptionCommand, 1);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        AccountSubscriptionStatus: 'UNSUBSCRIBED',
      },
    });
  });
  it('Get All IAM roles', async () => {
    iamClient.on(ListRolesCommand).resolves({
      Roles: [
        {
          Path: '/',
          RoleName: 'test3-ClickStreamApiCloudWatchRole5F1F73C6-B0T7G7QTWEGB',
          RoleId: 'AROAY6VU67QTP62MJAQ3O',
          Arn: 'arn:aws:iam::111122223333:role/test3-ClickStreamApiCloudWatchRole5F1F73C6-B0T7G7QTWEGB',
          CreateDate: new Date(),
          AssumeRolePolicyDocument: '%7B%22Version%22%3A%222012-10-17%22%2C%22Statement%22%3A%5B%7B%22Effect%22%3A%22Allow%22%2C%22Principal%22%3A%7B%22Service%22%3A%22apigateway.amazonaws.com%22%7D%2C%22Action%22%3A%22sts%3AAssumeRole%22%7D%5D%7D',
          Description: '',
          MaxSessionDuration: 3600,
        },
        {
          Path: '/',
          RoleName: 'arole',
          RoleId: 'AROAY6VU67QTN6EXB2YM5',
          Arn: 'arn:aws:iam::111122223333:role/arole',
          CreateDate: new Date(),
          AssumeRolePolicyDocument: '%7B%22Version%22%3A%222012-10-17%22%2C%22Statement%22%3A%5B%7B%22Sid%22%3A%22%22%2C%22Effect%22%3A%22Allow%22%2C%22Principal%22%3A%7B%22AWS%22%3A%22arn%3Aaws%3Aiam%3A%3A691002153696%3Aroot%22%7D%2C%22Action%22%3A%22sts%3AAssumeRole%22%2C%22Condition%22%3A%7B%22StringEquals%22%3A%7B%22sts%3AExternalId%22%3A%22XenaAuditorRoleLkWDhzqUbFcZ%22%7D%7D%7D%5D%7D',
          MaxSessionDuration: 3600,
        },
      ],
    });
    let res = await request(app).get('/api/env/IAMRoles');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          Name: 'test3-ClickStreamApiCloudWatchRole5F1F73C6-B0T7G7QTWEGB',
          Id: 'AROAY6VU67QTP62MJAQ3O',
          Arn: 'arn:aws:iam::111122223333:role/test3-ClickStreamApiCloudWatchRole5F1F73C6-B0T7G7QTWEGB',
        },
        {
          Name: 'arole',
          Id: 'AROAY6VU67QTN6EXB2YM5',
          Arn: 'arn:aws:iam::111122223333:role/arole',
        },
      ],
    });
  });
  it('Get Service IAM roles', async () => {
    iamClient.on(ListRolesCommand).resolves({
      Roles: [
        {
          Path: '/',
          RoleName: 'test3-ClickStreamApiCloudWatchRole5F1F73C6-B0T7G7QTWEGB',
          RoleId: 'AROAY6VU67QTP62MJAQ3O',
          Arn: 'arn:aws:iam::111122223333:role/test3-ClickStreamApiCloudWatchRole5F1F73C6-B0T7G7QTWEGB',
          CreateDate: new Date(),
          AssumeRolePolicyDocument: '%7B%22Version%22%3A%222012-10-17%22%2C%22Statement%22%3A%5B%7B%22Effect%22%3A%22Allow%22%2C%22Principal%22%3A%7B%22Service%22%3A%22apigateway.amazonaws.com%22%7D%2C%22Action%22%3A%22sts%3AAssumeRole%22%7D%5D%7D',
          Description: '',
          MaxSessionDuration: 3600,
        },
        {
          Path: '/',
          RoleName: 'arole',
          RoleId: 'AROAY6VU67QTN6EXB2YM5',
          Arn: 'arn:aws:iam::111122223333:role/arole',
          CreateDate: new Date(),
          AssumeRolePolicyDocument: '%7B%22Version%22%3A%222012-10-17%22%2C%22Statement%22%3A%5B%7B%22Sid%22%3A%22%22%2C%22Effect%22%3A%22Allow%22%2C%22Principal%22%3A%7B%22AWS%22%3A%22arn%3Aaws%3Aiam%3A%3A691002153696%3Aroot%22%7D%2C%22Action%22%3A%22sts%3AAssumeRole%22%2C%22Condition%22%3A%7B%22StringEquals%22%3A%7B%22sts%3AExternalId%22%3A%22XenaAuditorRoleLkWDhzqUbFcZ%22%7D%7D%7D%5D%7D',
          MaxSessionDuration: 3600,
        },
      ],
    });
    let res = await request(app).get('/api/env/IAMRoles?service=apigateway');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          Name: 'test3-ClickStreamApiCloudWatchRole5F1F73C6-B0T7G7QTWEGB',
          Id: 'AROAY6VU67QTP62MJAQ3O',
          Arn: 'arn:aws:iam::111122223333:role/test3-ClickStreamApiCloudWatchRole5F1F73C6-B0T7G7QTWEGB',
        },
      ],
    });
  });
  it('Get Account IAM roles', async () => {
    iamClient.on(ListRolesCommand).resolves({
      Roles: [
        {
          Path: '/',
          RoleName: 'test3-ClickStreamApiCloudWatchRole5F1F73C6-B0T7G7QTWEGB',
          RoleId: 'AROAY6VU67QTP62MJAQ3O',
          Arn: 'arn:aws:iam::444455556666:role/test3-ClickStreamApiCloudWatchRole5F1F73C6-B0T7G7QTWEGB',
          CreateDate: new Date(),
          AssumeRolePolicyDocument: '%7B%22Version%22%3A%222012-10-17%22%2C%22Statement%22%3A%5B%7B%22Effect%22%3A%22Allow%22%2C%22Principal%22%3A%7B%22Service%22%3A%22apigateway.amazonaws.com%22%7D%2C%22Action%22%3A%22sts%3AAssumeRole%22%7D%5D%7D',
          Description: '',
          MaxSessionDuration: 3600,
        },
        {
          Path: '/',
          RoleName: 'arole',
          RoleId: 'AROAY6VU67QTN6EXB2YM5',
          Arn: 'arn:aws:iam::123:role/arole',
          CreateDate: new Date(),
          AssumeRolePolicyDocument: '%7B%22Version%22%3A%222012-10-17%22%2C%22Statement%22%3A%5B%7B%22Sid%22%3A%22%22%2C%22Effect%22%3A%22Allow%22%2C%22Principal%22%3A%7B%22AWS%22%3A%22arn%3Aaws%3Aiam%3A%3A123%3Aroot%22%7D%2C%22Action%22%3A%22sts%3AAssumeRole%22%2C%22Condition%22%3A%7B%22StringEquals%22%3A%7B%22sts%3AExternalId%22%3A%22XenaAuditorRoleLkWDhzqUbFcZ%22%7D%7D%7D%5D%7D',
          MaxSessionDuration: 3600,
        },
      ],
    });
    let res = await request(app).get('/api/env/IAMRoles?account=123');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          Name: 'arole',
          Id: 'AROAY6VU67QTN6EXB2YM5',
          Arn: 'arn:aws:iam::123:role/arole',
        },
      ],
    });
  });
  it('Ping Services', async () => {
    cloudFormationMock.on(DescribeTypeCommand, {
      Type: 'RESOURCE',
      TypeName: 'AWS::EMRServerless::Application',
    }).resolvesOnce({
      Type: 'RESOURCE',
      Arn: 'arn:aws:cloudformation:ap-northeast-1::type/resource/xxx',
    });
    cloudFormationMock.on(DescribeTypeCommand, {
      Type: 'RESOURCE',
      TypeName: 'AWS::KafkaConnect::Connector',
    }).resolvesOnce({
      Type: 'RESOURCE',
      Arn: 'arn:aws:cloudformation:ap-northeast-1::type/resource/xxx',
    });
    cloudFormationMock.on(DescribeTypeCommand, {
      Type: 'RESOURCE',
      TypeName: 'AWS::RedshiftServerless::Workgroup',
    }).resolvesOnce({
      Type: 'RESOURCE',
      Arn: 'arn:aws:cloudformation:ap-northeast-1::type/resource/xxx',
    });
    cloudFormationMock.on(DescribeTypeCommand, {
      Type: 'RESOURCE',
      TypeName: 'AWS::QuickSight::Dashboard',
    }).resolvesOnce({
      Type: 'RESOURCE',
      Arn: 'arn:aws:cloudformation:ap-northeast-1::type/resource/xxx',
    });
    cloudFormationMock.on(DescribeTypeCommand, {
      Type: 'RESOURCE',
      TypeName: 'AWS::Athena::WorkGroup',
    }).resolvesOnce({
      Type: 'RESOURCE',
      Arn: 'arn:aws:cloudformation:ap-northeast-1::type/resource/xxx',
    });
    cloudFormationMock.on(DescribeTypeCommand, {
      Type: 'RESOURCE',
      TypeName: 'AWS::GlobalAccelerator::Accelerator',
    }).resolvesOnce({});

    const res = await request(app).get(
      '/api/env/servicesAvailable?region=ap-northeast-1&services=emr-serverless,msk,quicksight,redshift-serverless,global-accelerator,athena');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toContainEqual({ service: 'global-accelerator', available: false });
    expect(res.body.data).toContainEqual({ service: 'quicksight', available: true });
    expect(res.body.data).toContainEqual({ service: 'emr-serverless', available: true });
    expect(res.body.data).toContainEqual({ service: 'redshift-serverless', available: true });
    expect(res.body.data).toContainEqual({ service: 'athena', available: true });
    expect(res.body.data).toContainEqual({ service: 'msk', available: true });
    expect(cloudFormationMock).toHaveReceivedCommandTimes(DescribeTypeCommand, 6);
  });
  it('Ping Services in China region', async () => {
    cloudFormationMock.on(DescribeTypeCommand, {
      Type: 'RESOURCE',
      TypeName: 'AWS::EMRServerless::Application',
    }).resolvesOnce({
      Type: 'RESOURCE',
      Arn: 'arn:aws:cloudformation:ap-northeast-1::type/resource/xxx',
    });
    cloudFormationMock.on(DescribeTypeCommand, {
      Type: 'RESOURCE',
      TypeName: 'AWS::KafkaConnect::Connector',
    }).resolvesOnce({
      Type: 'RESOURCE',
      Arn: 'arn:aws:cloudformation:ap-northeast-1::type/resource/xxx',
    });
    cloudFormationMock.on(DescribeTypeCommand, {
      Type: 'RESOURCE',
      TypeName: 'AWS::RedshiftServerless::Workgroup',
    }).resolvesOnce({
      Type: 'RESOURCE',
      Arn: 'arn:aws:cloudformation:ap-northeast-1::type/resource/xxx',
    });
    cloudFormationMock.on(DescribeTypeCommand, {
      Type: 'RESOURCE',
      TypeName: 'AWS::QuickSight::Dashboard',
    }).resolvesOnce({
      Type: 'RESOURCE',
      Arn: 'arn:aws:cloudformation:ap-northeast-1::type/resource/xxx',
    });
    cloudFormationMock.on(DescribeTypeCommand, {
      Type: 'RESOURCE',
      TypeName: 'AWS::Athena::WorkGroup',
    }).resolvesOnce({
      Type: 'RESOURCE',
      Arn: 'arn:aws:cloudformation:ap-northeast-1::type/resource/xxx',
    });
    cloudFormationMock.on(DescribeTypeCommand, {
      Type: 'RESOURCE',
      TypeName: 'AWS::GlobalAccelerator::Accelerator',
    }).resolvesOnce({});

    const res = await request(app).get(
      '/api/env/servicesAvailable?region=cn-north-1&services=emr-serverless,msk,quicksight,redshift-serverless,global-accelerator,athena');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toContainEqual({ service: 'global-accelerator', available: false });
    expect(res.body.data).toContainEqual({ service: 'quicksight', available: false });
    expect(res.body.data).toContainEqual({ service: 'emr-serverless', available: true });
    expect(res.body.data).toContainEqual({ service: 'redshift-serverless', available: true });
    expect(res.body.data).toContainEqual({ service: 'athena', available: true });
    expect(res.body.data).toContainEqual({ service: 'msk', available: true });
    expect(cloudFormationMock).toHaveReceivedCommandTimes(DescribeTypeCommand, 5);
  });
  it('Get ACM Certificates', async () => {
    acmClient.on(ListCertificatesCommand).resolves({
      CertificateSummaryList: [
        {
          CertificateArn: 'arn:aws:acm:ap-southeast-1:555555555555:certificate/398ce638-e522-40e8-b344-fad5a616e11b',
          DomainName: 'example0.com',
          ExtendedKeyUsages: [
            'TLS_WEB_SERVER_AUTHENTICATION',
            'TLS_WEB_CLIENT_AUTHENTICATION',
          ],
          HasAdditionalSubjectAlternativeNames: false,
          InUse: true,
          KeyAlgorithm: KeyAlgorithm.RSA_2048,
          KeyUsages: [
            'DIGITAL_SIGNATURE',
            'KEY_ENCIPHERMENT',
          ],
          RenewalEligibility: 'ELIGIBLE',
          Status: 'ISSUED',
          SubjectAlternativeNameSummaries: [
            'example0.com',
          ],
          Type: 'AMAZON_ISSUED',
        },
        {
          CertificateArn: 'arn:aws:acm:ap-southeast-1:555555555555:certificate/7215dafa-2014-40d8-804b-c89ac8f136b4',
          DomainName: 'example1.com',
          ExtendedKeyUsages: [
            'TLS_WEB_SERVER_AUTHENTICATION',
            'TLS_WEB_CLIENT_AUTHENTICATION',
          ],
          HasAdditionalSubjectAlternativeNames: false,
          InUse: false,
          KeyAlgorithm: KeyAlgorithm.EC_prime256v1,
          KeyUsages: [
            'DIGITAL_SIGNATURE',
          ],
          RenewalEligibility: 'INELIGIBLE',
          Status: 'ISSUED',
          SubjectAlternativeNameSummaries: [
            'example1.com',
          ],
          Type: 'AMAZON_ISSUED',
        },
      ],
    });
    let res = await request(app).get('/api/env/ACMCertificates?region=ap-southeast-1');
    expect(acmClient).toHaveReceivedCommandTimes(ListCertificatesCommand, 1);
    expect(acmClient).toHaveReceivedCommandWith(ListCertificatesCommand, {
      CertificateStatuses: [CertificateStatus.ISSUED],
      Includes: {
        keyTypes: [
          KeyAlgorithm.EC_prime256v1,
          KeyAlgorithm.EC_secp384r1,
          KeyAlgorithm.EC_prime256v1,
          KeyAlgorithm.RSA_1024,
          KeyAlgorithm.RSA_2048,
          KeyAlgorithm.RSA_3072,
          KeyAlgorithm.RSA_4096,
        ],
      },
    });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          Arn: 'arn:aws:acm:ap-southeast-1:555555555555:certificate/398ce638-e522-40e8-b344-fad5a616e11b',
          Domain: 'example0.com',
          Status: 'ISSUED',
        },
        {
          Arn: 'arn:aws:acm:ap-southeast-1:555555555555:certificate/7215dafa-2014-40d8-804b-c89ac8f136b4',
          Domain: 'example1.com',
          Status: 'ISSUED',
        },
      ],
    });

  });
  it('List alarms by project', async () => {
    cloudWatchClient.on(DescribeAlarmsCommand).resolves({
      MetricAlarms: [
        {
          AlarmName: 'Clickstream|isolated_ing_s3_zwan ECS Cluster CPUUtilization 80c4b520',
          AlarmArn: 'arn:aws:cloudwatch:ap-northeast-1:555555555555:alarm:Clickstream|isolated_ing_s3_zwan ECS Cluster CPUUtilization 80c4b520',
          AlarmDescription: 'ECS Cluster CPUUtilization more than 85%',
          ActionsEnabled: true,
          OKActions: [],
          AlarmActions: [],
          InsufficientDataActions: [],
          StateValue: 'OK',
          MetricName: 'CPUUtilization',
          Namespace: 'AWS/ECS',
          Statistic: 'Average',
          Period: 300,
          EvaluationPeriods: 1,
          Threshold: 85,
          ComparisonOperator: 'GreaterThanThreshold',
        },
      ],
    });
    ddbMock.on(QueryCommand)
      .resolves({
        Items: [{ region: 'us-east-1' }],
      });
    projectExistedMock(ddbMock, true);
    const res = await request(app).get(`/api/env/alarms?projectId=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        totalCount: 1,
        items: [{
          ActionsEnabled: true,
          AlarmActions: [],
          AlarmArn: 'arn:aws:cloudwatch:ap-northeast-1:555555555555:alarm:Clickstream|isolated_ing_s3_zwan ECS Cluster CPUUtilization 80c4b520',
          AlarmDescription: 'ECS Cluster CPUUtilization more than 85%',
          AlarmName: 'Clickstream|isolated_ing_s3_zwan ECS Cluster CPUUtilization 80c4b520',
          ComparisonOperator: 'GreaterThanThreshold',
          EvaluationPeriods: 1,
          InsufficientDataActions: [],
          MetricName: 'CPUUtilization',
          Namespace: 'AWS/ECS',
          OKActions: [],
          Period: 300,
          StateValue: 'OK',
          Statistic: 'Average',
          Threshold: 85,
        }],
      },
    });

  });
  it('List alarms by project without pipeline', async () => {
    cloudWatchClient.on(DescribeAlarmsCommand).resolves({
      MetricAlarms: [
        {
          AlarmName: 'Clickstream|isolated_ing_s3_zwan ECS Cluster CPUUtilization 80c4b520',
          AlarmArn: 'arn:aws:cloudwatch:ap-northeast-1:555555555555:alarm:Clickstream|isolated_ing_s3_zwan ECS Cluster CPUUtilization 80c4b520',
          AlarmDescription: 'ECS Cluster CPUUtilization more than 85%',
          ActionsEnabled: true,
          OKActions: [],
          AlarmActions: [],
          InsufficientDataActions: [],
          StateValue: 'OK',
          MetricName: 'CPUUtilization',
          Namespace: 'AWS/ECS',
          Statistic: 'Average',
          Period: 300,
          EvaluationPeriods: 1,
          Threshold: 85,
          ComparisonOperator: 'GreaterThanThreshold',
        },
      ],
    });
    ddbMock.on(QueryCommand)
      .resolves({
        Items: [],
      });
    projectExistedMock(ddbMock, true);
    const res = await request(app).get(`/api/env/alarms?projectId=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        totalCount: -1,
        items: [],
      },
    });

  });
  it('Disable alarms', async () => {
    cloudWatchClient.on(DisableAlarmActionsCommand).resolves({});
    projectExistedMock(ddbMock, true);
    const res = await request(app)
      .put('/api/env/alarm')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        region: 'us-east-1',
        alarmNames: [],
        enabled: false,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      data: 'Alarms disabled.',
      success: true,
      message: '',
    });
  });
  it('Enable alarms', async () => {
    cloudWatchClient.on(EnableAlarmActionsCommand).resolves({});
    projectExistedMock(ddbMock, true);
    const res = await request(app)
      .put('/api/env/alarm')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        region: 'us-east-1',
        alarmNames: [],
        enabled: true,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      data: 'Alarms enabled.',
      success: true,
      message: '',
    });
  });

  afterAll((done) => {
    server.close();
    done();
  });

});

describe('Fetch test', () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('Fetch Android SDK', async () => {
    const SDKInfo = {
      responseHeader: {
        status: 0,
        QTime: 2,
        params: {
          'q': 'g:"software.aws.solution" AND a:"clickstream"',
          'core': '',
          'indent': 'off',
          'spellcheck': 'true',
          'fl': 'id,g,a,latestVersion,p,ec,repositoryId,text,timestamp,versionCount',
          'start': '',
          'spellcheck.count': '5',
          'sort': 'score desc,timestamp desc,g asc,a asc',
          'rows': '20',
          'wt': 'json',
          'version': '2.2',
        },
      },
      response: {
        numFound: 1,
        start: 0,
        docs: [
          {
            id: 'software.aws.solution:clickstream',
            g: 'software.aws.solution',
            a: 'clickstream',
            latestVersion: '0.1.0',
            repositoryId: 'central',
            p: 'aar',
            timestamp: 1688888888000,
            versionCount: 7,
            text: [
              'software.aws.solution',
              'clickstream',
              '.pom.sha512',
              '.aar',
              '.aar.sha256',
              '.aar.sha512',
              '.pom',
              '.aar.asc.sha256',
              '.aar.asc.sha512',
              '.pom.asc.sha256',
              '.pom.asc.sha512',
              '.pom.sha256',
            ],
            ec: [
              '.pom.sha512',
              '.aar',
              '.aar.sha256',
              '.aar.sha512',
              '.pom',
              '.aar.asc.sha256',
              '.aar.asc.sha512',
              '.pom.asc.sha256',
              '.pom.asc.sha512',
              '.pom.sha256',
            ],
          },
        ],
      },
      spellcheck: {
        suggestions: [],
      },
    };
    const fn = jest.fn() as jest.MockedFunction<any>;
    fn.mockResolvedValue(JSON.stringify(SDKInfo));
    mockFetch.mockResolvedValue({ ok: true, status: 200, text: fn } as Response);
    const res = await request(app)
      .get(`/api/env/domainAvailable?type=${FetchType.ANDROIDSDK}`)
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        ok: true,
        status: 200,
        data: '{"responseHeader":{"status":0,"QTime":2,"params":{"q":"g:\\"software.aws.solution\\" AND a:\\"clickstream\\"","core":"","indent":"off","spellcheck":"true","fl":"id,g,a,latestVersion,p,ec,repositoryId,text,timestamp,versionCount","start":"","spellcheck.count":"5","sort":"score desc,timestamp desc,g asc,a asc","rows":"20","wt":"json","version":"2.2"}},"response":{"numFound":1,"start":0,"docs":[{"id":"software.aws.solution:clickstream","g":"software.aws.solution","a":"clickstream","latestVersion":"0.1.0","repositoryId":"central","p":"aar","timestamp":1688888888000,"versionCount":7,"text":["software.aws.solution","clickstream",".pom.sha512",".aar",".aar.sha256",".aar.sha512",".pom",".aar.asc.sha256",".aar.asc.sha512",".pom.asc.sha256",".pom.asc.sha512",".pom.sha256"],"ec":[".pom.sha512",".aar",".aar.sha256",".aar.sha512",".pom",".aar.asc.sha256",".aar.asc.sha512",".pom.asc.sha256",".pom.asc.sha512",".pom.sha256"]}]},"spellcheck":{"suggestions":[]}}',
      },
    });
  });

  it('Fetch Pipeline', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW },
      ],
    });
    const fn = jest.fn() as jest.MockedFunction<any>;
    fn.mockResolvedValue('OK');
    mockFetch.mockResolvedValue({ ok: true, status: 200, text: fn } as Response);
    const resPipelineEndpoint = await request(app)
      .get(`/api/env/domainAvailable?type=${FetchType.PIPELINE_ENDPOINT}&projectId=${MOCK_PROJECT_ID}`)
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN);
    expect(mockFetch.mock.calls.length).toBe(1);
    expect(mockFetch.mock.calls[0]).toEqual(['http://xxx/xxx', { method: 'GET' }]);
    expect(resPipelineEndpoint.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(resPipelineEndpoint.statusCode).toBe(200);
    expect(resPipelineEndpoint.body).toEqual({
      success: true,
      message: '',
      data: {
        ok: true,
        status: 200,
        data: 'OK',
      },
    });
    const resPipelineDNS = await request(app)
      .get(`/api/env/domainAvailable?type=${FetchType.PIPELINE_DNS}&projectId=${MOCK_PROJECT_ID}`)
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN);
    expect(mockFetch.mock.calls.length).toBe(2);
    expect(mockFetch.mock.calls[1]).toEqual(['http://yyy/yyy', { method: 'GET' }]);
    expect(resPipelineDNS.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(resPipelineDNS.statusCode).toBe(200);
    expect(resPipelineDNS.body).toEqual({
      success: true,
      message: '',
      data: {
        ok: true,
        status: 200,
        data: 'OK',
      },
    });
    const resPipelineDomain = await request(app)
      .get(`/api/env/domainAvailable?type=${FetchType.PIPELINE_DOMAIN}&projectId=${MOCK_PROJECT_ID}`)
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN);
    expect(mockFetch.mock.calls.length).toBe(3);
    expect(mockFetch.mock.calls[2]).toEqual(['https://fake.example.com', { method: 'GET' }]);
    expect(resPipelineDomain.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(resPipelineDomain.statusCode).toBe(200);
    expect(resPipelineDomain.body).toEqual({
      success: true,
      message: '',
      data: {
        ok: true,
        status: 200,
        data: 'OK',
      },
    });
  });

});
