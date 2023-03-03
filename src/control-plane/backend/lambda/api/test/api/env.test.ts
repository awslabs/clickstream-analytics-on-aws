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

import { AccountClient, ListRegionsCommand } from '@aws-sdk/client-account';
import { EC2Client, DescribeVpcsCommand, DescribeSubnetsCommand, DescribeRouteTablesCommand } from '@aws-sdk/client-ec2';
import { KafkaClient, ListClustersV2Command } from '@aws-sdk/client-kafka';
import { QuickSightClient, ListUsersCommand } from '@aws-sdk/client-quicksight';
import { RedshiftClient, DescribeClustersCommand } from '@aws-sdk/client-redshift';
import { Route53Client, ListHostedZonesCommand } from '@aws-sdk/client-route-53';
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import request from 'supertest';
import { app, server } from '../../index';

const accountClientMock = mockClient(AccountClient);
const ec2ClientMock = mockClient(EC2Client);
const s3Client = mockClient(S3Client);
const kafkaClient = mockClient(KafkaClient);
const redshiftClient = mockClient(RedshiftClient);
const quickSightClient = mockClient(QuickSightClient);
const route53Client = mockClient(Route53Client);

describe('Account Env test', () => {

  it('Get regions', async () => {
    accountClientMock.on(ListRegionsCommand).resolves({
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
            { Key: 'Name', Value: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC' },
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
            { Key: 'Name', Value: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC' },
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
        },
        {
          id: 'subnet-09ae522e85bbee5c5',
          name: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/publicSubnet2',
          cidr: '10.255.1.0/24',
          availabilityZone: 'us-east-1b',
          type: 'isolated',
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
            { NatGatewayId: 'igw-xxxx' },
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
        },
        {
          id: 'subnet-09ae522e85bbee5c5',
          name: 'public-new-vpc-control-plane-stack/Clickstream Analytics on AWSVpc/DefaultVPC/publicSubnet2',
          cidr: '10.255.1.0/24',
          availabilityZone: 'us-east-1b',
          type: 'private',
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
            { NatGatewayId: 'igw-xxxx' },
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
          Name: 'sagemaker-us-*****-west-2',
        },
        {
          Name: 'ssm-onboarding-bucket-*****-us-west-2',
        },
      ],
    });
    let res = await request(app).get('/api/env/s3/buckets');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: [
        {
          name: 'sagemaker-us-*****-west-2',
        },
        {
          name: 'ssm-onboarding-bucket-*****-us-west-2',
        },
      ],
    });
  });
  it('Get MSK cluster(Provisioned)', async () => {
    kafkaClient.on(ListClustersV2Command).resolves({
      ClusterInfoList: [
        {
          ClusterName: 'demo-cluster-1',
          ClusterArn: 'arn:aws:kafka:us-east-1:012345678912:cluster/demo-cluster-1/0adf12f7-12f2-4b05-8690-b2ccfc3bedd3-20',
          ClusterType: 'PROVISIONED',
          Provisioned: {
            BrokerNodeGroupInfo: {
              InstanceType: 'kafka.m5.large',
              SecurityGroups: ['sg-111'],
              ClientSubnets: ['subnet-111'],
            },
            NumberOfBrokerNodes: 1,
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
          arn: 'arn:aws:kafka:us-east-1:012345678912:cluster/demo-cluster-1/0adf12f7-12f2-4b05-8690-b2ccfc3bedd3-20',
          type: 'PROVISIONED',
          state: 'ACTIVE',
          securityGroupId: 'sg-111',
        },
      ],
    });
  });
  it('Get MSK cluster(Serverless)', async () => {
    kafkaClient.on(ListClustersV2Command).resolves({
      ClusterInfoList: [
        {
          ClusterName: 'demo-cluster-1',
          ClusterArn: 'arn:aws:kafka:us-east-1:012345678912:cluster/demo-cluster-1/0adf12f7-12f2-4b05-8690-b2ccfc3bedd3-20',
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
          arn: 'arn:aws:kafka:us-east-1:012345678912:cluster/demo-cluster-1/0adf12f7-12f2-4b05-8690-b2ccfc3bedd3-20',
          type: 'SERVERLESS',
          state: 'ACTIVE',
          securityGroupId: 'sg-111',
        },
      ],
    });
  });
  it('Get MSK cluster no vpc', async () => {
    kafkaClient.on(ListClustersV2Command).resolves({
      ClusterInfoList: [
        {
          ClusterName: 'demo-cluster-1',
          ClusterArn: 'arn:aws:kafka:us-east-1:012345678912:cluster/demo-cluster-1/0adf12f7-12f2-4b05-8690-b2ccfc3bedd3-20',
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
        },
        {
          ClusterIdentifier: 'redshift-cluster-1',
          NodeType: 'dc2.large',
          Endpoint: {
            Address: 'redshift-cluster-1.cyivjhsbgo3m.us-east-1.redshift.amazonaws.com',
            Port: 5439,
          },
          ClusterStatus: 'available',
          VpcId: 'vpc-222',
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
          name: 'redshift-cluster-1',
          nodeType: 'dc2.large',
          endpoint: {
            Address: 'redshift-cluster-1.cyivjhsbgo3m.us-east-1.redshift.amazonaws.com',
            Port: 5439,
          },
          status: 'available',
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
          name: 'redshift-cluster-1',
          nodeType: 'dc2.large',
          endpoint: {
            Address: 'redshift-cluster-1.cyivjhsbgo3m.us-east-1.redshift.amazonaws.com',
            Port: 5439,
          },
          status: 'available',
        },
      ],
    });
  });
  it('Get QuickSight Account', async () => {
    quickSightClient.on(ListUsersCommand).resolves({
      UserList: [
        {
          UserName: 'Admin/fake-Isengard',
          Arn: 'arn:aws:quicksight:us-east-1:012345678912:user/default/Admin/fake-Isengard',
          Email: 'fake@amazon.com',
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
          userName: 'Admin/fake-Isengard',
          arn: 'arn:aws:quicksight:us-east-1:012345678912:user/default/Admin/fake-Isengard',
          email: 'fake@amazon.com',
          role: 'ADMIN',
          active: true,
        },
      ],
    });
  });
  it('Get Host Zones', async () => {
    route53Client.on(ListHostedZonesCommand).resolves({
      HostedZones: [
        {
          Id: '/hostedzone/Z000000000000000000E',
          Name: 'fake.test.dev.com.',
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
          name: 'fake.test.dev.com.',
        },
      ],
    });
  });

  afterAll((done) => {
    server.close();
    done();
  });

});