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

import { ACMClient, CertificateStatus, KeyAlgorithm, ListCertificatesCommand } from '@aws-sdk/client-acm';
import { AthenaClient, ListWorkGroupsCommand } from '@aws-sdk/client-athena';
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
import { EMRServerlessClient, ListApplicationsCommand } from '@aws-sdk/client-emr-serverless';
import { IAMClient, ListRolesCommand } from '@aws-sdk/client-iam';
import { ClientBroker, KafkaClient, ListClustersV2Command } from '@aws-sdk/client-kafka';
import { KafkaConnectClient, ListConnectorsCommand } from '@aws-sdk/client-kafkaconnect';
import {
  QuickSightClient,
  ListUsersCommand,
  RegisterUserCommand,
  DescribeAccountSubscriptionCommand,
} from '@aws-sdk/client-quicksight';
import { RedshiftClient, DescribeClustersCommand } from '@aws-sdk/client-redshift';
import { RedshiftServerlessClient, ListWorkgroupsCommand } from '@aws-sdk/client-redshift-serverless';
import { Route53Client, ListHostedZonesCommand } from '@aws-sdk/client-route-53';
import { S3Client, ListBucketsCommand, GetBucketLocationCommand } from '@aws-sdk/client-s3';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import request from 'supertest';
import { MOCK_PROJECT_ID, MOCK_TOKEN, projectExistedMock, tokenMock } from './ddb-mock';
import { app, server } from '../../index';


const ddbMock = mockClient(DynamoDBDocumentClient);
const ec2ClientMock = mockClient(EC2Client);
const s3Client = mockClient(S3Client);
const kafkaClient = mockClient(KafkaClient);
const redshiftClient = mockClient(RedshiftClient);
const redshiftServerlessClient = mockClient(RedshiftServerlessClient);
const quickSightClient = mockClient(QuickSightClient);
const route53Client = mockClient(Route53Client);
const athenaClient = mockClient(AthenaClient);
const iamClient = mockClient(IAMClient);
const acmClient = mockClient(ACMClient);
const cloudWatchClient = mockClient(CloudWatchClient);
const emrServerlessClient = mockClient(EMRServerlessClient);
const kafkaConnectClient = mockClient(KafkaConnectClient);

describe('Account Env test', () => {
  beforeEach(() => {
    ddbMock.reset();
    ec2ClientMock.reset();
    s3Client.reset();
    kafkaClient.reset();
    redshiftClient.reset();
    quickSightClient.reset();
    route53Client.reset();
    athenaClient.reset();
    iamClient.reset();
    acmClient.reset();
    cloudWatchClient.reset();
    emrServerlessClient.reset();
    kafkaConnectClient.reset();
  });
  it('Get regions', async () => {
    ec2ClientMock.on(DescribeRegionsCommand).resolves({
      Regions: [
        { RegionName: 'us-east-1' },
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
          id: 'us-east-1',
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
    let res = await request(app).get('/api/env/vpc');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          id: 'vpc-0ba32b04ccc029088',
          name: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC',
          cidr: '10.255.0.0/16',
          isDefault: false,
        },
        {
          id: 'vpc-0927cf9b0c5521882',
          name: '',
          cidr: '172.31.0.0/16',
          isDefault: true,
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
    let res = await request(app).get('/api/env/vpc?region=us-east-1');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          id: 'vpc-0ba32b04ccc029088',
          name: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC',
          cidr: '10.255.0.0/16',
          isDefault: false,
        },
        {
          id: 'vpc-0927cf9b0c5521882',
          name: '',
          cidr: '172.31.0.0/16',
          isDefault: true,
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
    let res = await request(app).get('/api/env/vpc/securitygroups?vpcId=vpc-0ba32b04ccc029088');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          id: 'sg-043f6a0f412c93545',
          name: 'msk',
          description: 'msk',
        },
      ],
    });
  });
  it('Get subnet from default region', async () => {
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
            { GatewayId: 'igw-xxxx' },
          ],
        },
      ],
    });
    let res = await request(app).get('/api/env/vpc/subnet?vpcId=vpc-0ba32b04ccc029088');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          id: 'subnet-0b9fa05e061084b37',
          name: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/publicSubnet1',
          cidr: '10.255.0.0/24',
          availabilityZone: 'us-east-1a',
          type: 'public',
          routeTable: {
            Associations: [
              {
                Main: true,
              },
            ],
            Routes: [
              {
                GatewayId: 'igw-xxxx',
              },
            ],
          },
        },
        {
          id: 'subnet-09ae522e85bbee5c5',
          name: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/publicSubnet2',
          cidr: '10.255.1.0/24',
          availabilityZone: 'us-east-1b',
          type: 'public',
          routeTable: {
            Associations: [
              {
                Main: true,
              },
            ],
            Routes: [
              {
                GatewayId: 'igw-xxxx',
              },
            ],
          },
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
    let res = await request(app).get('/api/env/vpc/subnet?region=us-east-1&vpcId=vpc-0ba32b04ccc029088');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          id: 'subnet-0b9fa05e061084b37',
          name: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/publicSubnet1',
          cidr: '10.255.0.0/24',
          availabilityZone: 'us-east-1a',
          type: 'isolated',
          routeTable: {
            Associations: [
              {
                Main: true,
              },
            ],
            Routes: [
              {
                GatewayId: 'local',
              },
            ],
          },
        },
        {
          id: 'subnet-09ae522e85bbee5c5',
          name: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/publicSubnet2',
          cidr: '10.255.1.0/24',
          availabilityZone: 'us-east-1b',
          type: 'isolated',
          routeTable: {
            Associations: [
              {
                Main: true,
              },
            ],
            Routes: [
              {
                GatewayId: 'local',
              },
            ],
          },
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
    let res = await request(app).get('/api/env/vpc/subnet?region=us-east-1&vpcId=vpc-0ba32b04ccc029088');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          id: 'subnet-0b9fa05e061084b37',
          name: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/publicSubnet1',
          cidr: '10.255.0.0/24',
          availabilityZone: 'us-east-1a',
          type: 'public',
          routeTable: {
            Associations: [
              {
                SubnetId: 'subnet-0b9fa05e061084b37',
              },
            ],
            Routes: [
              {
                GatewayId: 'igw-xxxx',
              },
            ],
          },
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
    let res = await request(app).get('/api/env/vpc/subnet?region=us-east-1&vpcId=vpc-0ba32b04ccc029088&subnetType=public');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          id: 'subnet-0b9fa05e061084b37',
          name: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/publicSubnet1',
          cidr: '10.255.0.0/24',
          availabilityZone: 'us-east-1a',
          type: 'public',
          routeTable: {
            Associations: [
              {
                Main: true,
              },
            ],
            Routes: [
              {
                GatewayId: 'igw-xxxx',
              },
            ],
          },
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
    let res = await request(app).get('/api/env/vpc/subnet?region=us-east-1&vpcId=vpc-0ba32b04ccc029088&subnetType=private');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          id: 'subnet-0b9fa05e061084b37',
          name: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/isolatedSubnet1',
          cidr: '10.255.0.0/24',
          availabilityZone: 'us-east-1a',
          type: 'private',
          routeTable: {
            Associations: [
              {
                Main: true,
              },
            ],
            Routes: [
              {
                DestinationCidrBlock: '0.0.0.0/0',
                NatGatewayId: 'local',
              },
            ],
          },
        },
        {
          availabilityZone: 'us-east-1b',
          cidr: '10.255.0.0/24',
          id: 'subnet-0b9fa05e061084b38',
          name: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/privateSubnet1',
          type: 'private',
          routeTable: {
            Associations: [
              {
                Main: true,
              },
            ],
            Routes: [
              {
                DestinationCidrBlock: '0.0.0.0/0',
                NatGatewayId: 'local',
              },
            ],
          },
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
    let res = await request(app).get('/api/env/vpc/subnet?region=us-east-1&vpcId=vpc-0ba32b04ccc029088&subnetType=isolated');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          id: 'subnet-0b9fa05e061084b37',
          name: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/isolatedSubnet1',
          cidr: '10.255.0.0/24',
          availabilityZone: 'us-east-1a',
          type: 'isolated',
          routeTable: {
            Associations: [
              {
                Main: true,
              },
            ],
            Routes: [
              {
                GatewayId: 'local',
              },
            ],
          },
        },
      ],
    });
  });
  it('Get subnet with no vpc', async () => {
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
    let res = await request(app).get('/api/env/vpc/subnet');
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
        LocationConstraint: 'us-east-1',
      })
      .resolves({
        LocationConstraint: 'us-east-2',
      });
    const res = await request(app).get('/api/env/s3/buckets');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          name: 'sagemaker-us-*****-east-1',
          location: 'us-east-1',
        },
        {
          name: 'ssm-onboarding-bucket-*****-us-east-2',
          location: 'us-east-2',
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
        LocationConstraint: 'us-east-1',
      })
      .resolves({
        LocationConstraint: 'us-east-2',
      });
    const res = await request(app).get('/api/env/s3/buckets?region=us-east-1');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          name: 'sagemaker-us-*****-east-1',
          location: 'us-east-1',
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
    let res = await request(app).get('/api/env/msk/clusters?vpcId=vpc-111');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          name: 'demo-cluster-1',
          authentication: ['IAM', 'Unauthenticated'],
          arn: 'arn:aws:kafka:us-east-1:111122223333:cluster/demo-cluster-1/0adf12f7-12f2-4b05-8690-b2ccfc3bedd3-20',
          type: 'PROVISIONED',
          state: 'ACTIVE',
          securityGroupId: 'sg-111',
          clientBroker: 'TLS_PLAINTEXT',
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
    let res = await request(app).get('/api/env/msk/clusters?vpcId=vpc-111');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          name: 'demo-cluster-1',
          authentication: [],
          arn: 'arn:aws:kafka:us-east-1:111122223333:cluster/demo-cluster-1/0adf12f7-12f2-4b05-8690-b2ccfc3bedd3-20',
          type: 'SERVERLESS',
          state: 'ACTIVE',
          securityGroupId: 'sg-111',
          clientBroker: '',
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
    let res = await request(app).get('/api/env/msk/clusters');
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
    let res = await request(app).get('/api/env/redshift/clusters?vpcId=vpc-111');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          clusterSubnetGroupName: '',
          name: 'redshift-cluster-1',
          nodeType: 'dc2.large',
          endpoint: {
            Address: 'redshift-cluster-1.cyivjhsbgo3m.us-east-1.redshift.amazonaws.com',
            Port: 5439,
          },
          publiclyAccessible: false,
          masterUsername: 'click1',
          status: 'available',
          vpcId: 'vpc-111',
          vpcSecurityGroups: [],
        },
      ],
    });
    res = await request(app).get('/api/env/redshift/clusters');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          clusterSubnetGroupName: '',
          name: 'redshift-cluster-1',
          nodeType: 'dc2.large',
          endpoint: {
            Address: 'redshift-cluster-1.cyivjhsbgo3m.us-east-1.redshift.amazonaws.com',
            Port: 5439,
          },
          publiclyAccessible: false,
          masterUsername: 'click1',
          status: 'available',
          vpcId: 'vpc-111',
          vpcSecurityGroups: [],
        },
        {
          clusterSubnetGroupName: '',
          name: 'redshift-cluster-2',
          nodeType: 'dc2.large',
          endpoint: {
            Address: 'redshift-cluster-2.cyivjhsbgo3m.us-east-1.redshift.amazonaws.com',
            Port: 5438,
          },
          publiclyAccessible: false,
          masterUsername: 'click2',
          status: 'available',
          vpcId: 'vpc-222',
          vpcSecurityGroups: [],
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
    let res = await request(app).get('/api/env/redshift/clusters?region=us-east-1&vpcId=vpc-111');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          clusterSubnetGroupName: '',
          name: 'redshift-cluster-1',
          nodeType: 'dc2.large',
          endpoint: {
            Address: 'redshift-cluster-1.cyivjhsbgo3m.us-east-1.redshift.amazonaws.com',
            Port: 5439,
          },
          publiclyAccessible: false,
          masterUsername: 'click',
          status: 'available',
          vpcId: 'vpc-111',
          vpcSecurityGroups: [],

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
    let res = await request(app).get('/api/env/redshift-serverless/workgroups');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          id: 'd60f7989-f4ce-46c5-95da-2f9cc7a27725',
          arn: 'arn:aws:redshift-serverless:ap-southeast-1:555555555555:workgroup/d60f7989-f4ce-46c5-95da-2f9cc7a27725',
          name: 'test',
          namespace: 'test-ns',
          status: 'AVAILABLE',
        },
      ],
    });
  });
  it('List QuickSight Users', async () => {
    quickSightClient.on(ListUsersCommand).resolves({
      UserList: [
        {
          UserName: 'Admin/fake',
          Arn: 'arn:aws:quicksight:us-east-1:111122223333:user/default/Admin/fake',
          Email: 'fake@example.com',
          Role: 'ADMIN',
          Active: true,
        },
        {
          UserName: 'api-role-name/fake',
          Arn: 'arn:aws:quicksight:us-east-1:111122223333:user/default/api-role-name/fake',
          Email: 'fake@example.com',
          Role: 'ADMIN',
          Active: true,
        },
      ],
    });
    let res = await request(app).get('/api/env/quicksight/users');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          userName: 'Admin/fake',
          arn: 'arn:aws:quicksight:us-east-1:111122223333:user/default/Admin/fake',
          email: 'fake@example.com',
          role: 'ADMIN',
          active: true,
        },
      ],
    });
  });
  it('Create QuickSight User', async () => {
    tokenMock(ddbMock, false);
    quickSightClient.on(RegisterUserCommand).resolves({
      UserInvitationUrl: 'http://xxx',
    });
    let res = await request(app)
      .post('/api/env/quicksight/user')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        email: 'fake@example.com',
        username: 'Clickstream-User-xxx',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: 'http://xxx',
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
    const res = await request(app).get('/api/env/quicksight/describe');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        accountName: 'Clickstream-xsxs',
        accountSubscriptionStatus: 'ACCOUNT_CREATED',
        authenticationType: 'IDENTITY_POOL',
        edition: 'ENTERPRISE',
        notificationEmail: 'fake@example.com',
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
    const res = await request(app).get('/api/env/quicksight/describe');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        accountName: 'xxxx-xsxs',
        accountSubscriptionStatus: 'ACCOUNT_CREATED',
        authenticationType: 'IDENTITY_POOL',
        edition: 'ENTERPRISE',
        notificationEmail: 'fake@example.com',
      },
    });
  });
  it('Ping QuickSight', async () => {
    quickSightClient.on(DescribeAccountSubscriptionCommand).resolves({});
    let res = await request(app).get('/api/env/quicksight/ping');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: true,
    });
    const mockError = new Error('Mock DynamoDB error');
    mockError.name = 'ResourceNotFoundException';
    quickSightClient.on(DescribeAccountSubscriptionCommand).rejects(mockError);
    res = await request(app).get('/api/env/quicksight/ping');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: false,
    });
  });
  it('Get Athena Work Groups', async () => {
    athenaClient.on(ListWorkGroupsCommand).resolves({
      WorkGroups: [
        {
          CreationTime: new Date(),
          Description: '',
          EngineVersion: {
            EffectiveEngineVersion: 'Athena engine version 2',
            SelectedEngineVersion: 'AUTO',
          },
          Name: 'primary',
          State: 'ENABLED',
        },
      ],
    });
    let res = await request(app).get('/api/env/athena/workgroups');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          description: '',
          engineVersion: 'Athena engine version 2',
          name: 'primary',
          state: 'ENABLED',
        },
      ],
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
    let res = await request(app).get('/api/env/iam/roles');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          name: 'test3-ClickStreamApiCloudWatchRole5F1F73C6-B0T7G7QTWEGB',
          id: 'AROAY6VU67QTP62MJAQ3O',
          arn: 'arn:aws:iam::111122223333:role/test3-ClickStreamApiCloudWatchRole5F1F73C6-B0T7G7QTWEGB',
        },
        {
          name: 'arole',
          id: 'AROAY6VU67QTN6EXB2YM5',
          arn: 'arn:aws:iam::111122223333:role/arole',
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
    let res = await request(app).get('/api/env/iam/roles?service=apigateway');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          name: 'test3-ClickStreamApiCloudWatchRole5F1F73C6-B0T7G7QTWEGB',
          id: 'AROAY6VU67QTP62MJAQ3O',
          arn: 'arn:aws:iam::111122223333:role/test3-ClickStreamApiCloudWatchRole5F1F73C6-B0T7G7QTWEGB',
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
    let res = await request(app).get('/api/env/iam/roles?account=123');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          name: 'arole',
          id: 'AROAY6VU67QTN6EXB2YM5',
          arn: 'arn:aws:iam::123:role/arole',
        },
      ],
    });
  });
  it('Ping Services', async () => {
    emrServerlessClient.on(ListApplicationsCommand).resolves({
      applications: [],
    });
    kafkaClient.on(ListClustersV2Command).resolves({
      ClusterInfoList: [],
    });
    kafkaConnectClient.on(ListConnectorsCommand).resolves({
      connectors: [],
    });
    redshiftServerlessClient.on(ListWorkgroupsCommand).resolves({
      workgroups: [],
    });
    athenaClient.on(ListWorkGroupsCommand).resolves({
      WorkGroups: [],
    });
    quickSightClient.on(DescribeAccountSubscriptionCommand).resolves({
      AccountInfo: {
        AccountName: '',
      },
    });
    const res = await request(app).get(
      '/api/env/ping?region=cn-north-1&services=emr-serverless,msk,quicksight,redshift-serverless,global-accelerator,athena');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          service: 'global-accelerator',
          available: false,
        },
        {
          service: 'redshift-serverless',
          available: false,
        },
        {
          service: 'emr-serverless',
          available: true,
        },
        {
          service: 'quicksight',
          available: true,
        },
        {
          service: 'athena',
          available: true,
        },
        {
          service: 'msk',
          available: true,
        },
      ],
    });
  });
  it('Ping Services with ENOTFOUND', async () => {
    const mockError = new Error('Mock ENOTFOUND error');
    mockError.message = 'Error: getaddrinfo ENOTFOUND xxx.sa-east-1.amazonaws.com';
    emrServerlessClient.on(ListApplicationsCommand).rejects(mockError);
    kafkaClient.on(ListClustersV2Command).rejects(mockError);
    kafkaConnectClient.on(ListConnectorsCommand).rejects(mockError);
    redshiftServerlessClient.on(ListWorkgroupsCommand).rejects(mockError);
    athenaClient.on(ListWorkGroupsCommand).rejects(mockError);
    quickSightClient.on(DescribeAccountSubscriptionCommand).rejects(mockError);
    let res = await request(app).get(
      '/api/env/ping?region=cn-north-1&services=emr-serverless,msk,quicksight,redshift-serverless,global-accelerator,athena');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          service: 'global-accelerator',
          available: false,
        },
        {
          service: 'redshift-serverless',
          available: false,
        },
        {
          service: 'emr-serverless',
          available: false,
        },
        {
          service: 'msk',
          available: false,
        },
        {
          service: 'quicksight',
          available: false,
        },
        {
          service: 'athena',
          available: false,
        },
      ],
    });
  });
  it('Get Host Zones', async () => {
    route53Client.on(ListHostedZonesCommand).resolves({
      HostedZones: [
        {
          Id: '/hostedzone/Z000000000000000000E',
          Name: 'fake.example.com.',
          CallerReference: '',
        },
      ],
    });
    let res = await request(app).get('/api/env/route53/hostedzones');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          id: 'Z000000000000000000E',
          name: 'fake.example.com.',
        },
      ],
    });
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
          KeyAlgorithm: 'RSA-2048',
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
          KeyAlgorithm: 'EC-prime256v1',
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
    let res = await request(app).get('/api/env/acm/certificates?region=ap-southeast-1');
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
          arn: 'arn:aws:acm:ap-southeast-1:555555555555:certificate/398ce638-e522-40e8-b344-fad5a616e11b',
          domain: 'example0.com',
          status: 'ISSUED',
        },
        {
          arn: 'arn:aws:acm:ap-southeast-1:555555555555:certificate/7215dafa-2014-40d8-804b-c89ac8f136b4',
          domain: 'example1.com',
          status: 'ISSUED',
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
    const res = await request(app).get(`/api/env/cloudwatch/alarms?pid=${MOCK_PROJECT_ID}`);
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
    const res = await request(app).get(`/api/env/cloudwatch/alarms?pid=${MOCK_PROJECT_ID}`);
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
      .post('/api/env/cloudwatch/alarms/disable')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        region: 'us-east-1',
        alarmNames: [],
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
    });
  });
  it('Enable alarms', async () => {
    cloudWatchClient.on(EnableAlarmActionsCommand).resolves({});
    projectExistedMock(ddbMock, true);
    const res = await request(app)
      .post('/api/env/cloudwatch/alarms/enable')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        region: 'us-east-1',
        alarmNames: [],
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
    });
  });

  afterAll((done) => {
    server.close();
    done();
  });

});