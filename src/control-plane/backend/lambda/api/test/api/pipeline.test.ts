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
import { KafkaClient, ListNodesCommand } from '@aws-sdk/client-kafka';
import { ExecutionStatus, SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { DynamoDBDocumentClient, GetCommand, GetCommandInput, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import request from 'supertest';
import { dictionaryMock, MOCK_PIPELINE_ID, MOCK_PROJECT_ID, MOCK_TOKEN, pipelineExistedMock, projectExistedMock, tokenMock } from './ddb-mock';
import { clickStreamTableName, dictionaryTableName } from '../../common/constants';
import { WorkflowStateType } from '../../common/types';
import { app, server } from '../../index';

const ddbMock = mockClient(DynamoDBDocumentClient);
const sfnMock = mockClient(SFNClient);
const cloudFormationClient = mockClient(CloudFormationClient);
const kafkaMock = mockClient(KafkaClient);

describe('Pipeline test', () => {
  beforeEach(() => {
    ddbMock.reset();
    sfnMock.reset();
    cloudFormationClient.reset();
    kafkaMock.reset();
  });
  it('Create pipeline', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    kafkaMock.on(ListNodesCommand).resolves({
      NextToken: 'token01',
      NodeInfoList: [{
        BrokerNodeInfo: {
          Endpoints: ['node1,node2'],
        },
      }],
      $metadata: {},
    });
    sfnMock.on(StartExecutionCommand).resolves({});
    ddbMock.on(PutCommand).resolves({});
    ddbMock.on(QueryCommand).resolves({
      Items: [{ id: 1 }, { id: 2 }],
    });

    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        id: MOCK_PROJECT_ID,
        prefix: 'PIPELINE',
        type: `PIPELINE#${MOCK_PIPELINE_ID}`,
        projectId: MOCK_PROJECT_ID,
        appIds: ['appId1', 'appId2'],
        pipelineId: MOCK_PIPELINE_ID,
        name: 'Pipeline-01',
        description: 'Description of Pipeline-01',
        region: 'us-east-1',
        dataCollectionSDK: 'Clickstream SDK',
        status: ExecutionStatus.RUNNING,
        tags: [
          {
            key: 'name',
            value: 'clickstream',
          },
        ],
        network: {
          vpcId: 'vpc-0ba32b04ccc029088',
          publicSubnetIds: ['subnet-09ae522e85bbee5c5', 'subnet-09ae522e85bbee5c5', 'subnet-09ae522e85bbee5c5'],
          privateSubnetIds: ['subnet-09ae522e85bbee5c5', 'subnet-09ae522e85bbee5c5', 'subnet-09ae522e85bbee5c5'],
        },
        bucket: {
          name: 'EXAMPLE_BUCKET',
          prefix: 'test',
        },
        ingestionServer: {
          size: {
            serverMin: 2,
            serverMax: 4,
            warmPoolSize: 1,
            scaleOnCpuUtilizationPercent: 50,
          },
          domain: {
            domainName: 'fake.example.com',
            certificateArn: 'arn:aws:acm:us-east-1:111122223333:certificate/96d69c0d-fb79-4586-a8d0-0ae1e25c44e5',
          },
          loadBalancer: {
            serverEndpointPath: '/collect',
            serverCorsOrigin: '*',
            protocol: 'HTTPS',
            enableApplicationLoadBalancerAccessLog: true,
            logS3Bucket: {
              name: 'EXAMPLE_BUCKET',
              prefix: 'logs',
            },
            notificationsTopicArn: 'arn:aws:sns:us-east-1:111122223333:test',
          },
          sinkType: 's3',
          sinkS3: {
            sinkBucket: {
              name: 'EXAMPLE_BUCKET',
              prefix: 'test',
            },
            s3BatchMaxBytes: 50,
            s3BatchTimeout: 30,
          },
          sinkKafka: {
            brokers: ['test1', 'test2', 'test3'],
            topic: 't1',
            mskCluster: {
              name: 'mskClusterName',
              arn: 'mskClusterArn',
              securityGroupId: 'sg-0000000000002',
            },
            kafkaConnector: {
              sinkBucket: {
                name: 'EXAMPLE-BUCKET',
                prefix: 'kinesis',
              },
            },
          },
          sinkKinesis: {
            kinesisStreamMode: 'ON_DEMAND',
            kinesisShardCount: 3,
            sinkBucket: {
              name: 'EXAMPLE_BUCKET',
              prefix: 'kinesis',
            },
          },
        },
        dataAnalytics: {},
        workflow: {
          Version: '2022-03-15',
          Workflow: {
            Type: WorkflowStateType.PASS,
            End: true,
            Branches: [],
          },
        },
        executionArn: '',
        version: '123',
        versionTag: 'latest',
        createAt: 162321434322,
        updateAt: 162321434322,
        operator: '',
        deleted: false,

      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toEqual('Pipeline added.');
    expect(res.body.success).toEqual(true);
  });
  it('Create pipeline with dictionary no found', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    ddbMock.on(GetCommand, {
      TableName: dictionaryTableName,
      Key: {
        name: 'Templates',
      },
    }).resolves({
      Item: undefined,
    });
    ddbMock.on(GetCommand, {
      TableName: dictionaryTableName,
      Key: {
        name: 'Solution',
      },
    }).resolves({
      Item: undefined,
    });
    sfnMock.on(StartExecutionCommand).resolves({});
    ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        name: 'Pipeline-01',
        description: 'Description of Pipeline-01',
        region: 'us-east-1',
        dataCollectionSDK: 'Clickstream SDK',
        tags: [
          {
            key: 'name',
            value: 'clickstream',
          },
        ],
        ingestionServer: {
          network: {
            vpcId: 'vpc-0000',
            publicSubnetIds: ['subnet-1111', 'subnet-2222', 'subnet-3333'],
            privateSubnetIds: ['subnet-44444', 'subnet-55555', 'subnet-6666'],
          },
          size: {
            serverMin: 2,
            serverMax: 4,
            warmPoolSize: 1,
            scaleOnCpuUtilizationPercent: 50,
          },
          domain: {
            hostedZoneId: 'Z000000000000000000E',
            hostedZoneName: 'example.com',
            recordName: 'click',
          },
          loadBalancer: {
            serverEndpointPath: '/collect',
            serverCorsOrigin: '*',
            protocol: 'HTTPS',
            enableApplicationLoadBalancerAccessLog: true,
            logS3Bucket: 'Pipeline-01-log',
            logS3Prefix: 'logs',
            notificationsTopicArn: 'arn:aws:sns:us-east-1:111122223333:test',
          },
          sinkType: 's3',
          sinkS3: {
            s3Uri: 's3://DOC-EXAMPLE-BUCKET',
            sinkType: 's3',
            s3prefix: 'test',
            s3BufferSize: 50,
            s3BufferInterval: 30,
          },
        },
        etl: {},
        dataAnalytics: {},
        workflow: {
          Version: '2022-03-15',
          Workflow: {
            Type: WorkflowStateType.PASS,
            End: true,
            Branches: [],
          },
        },
        executionArn: '',
        version: '123',
        versionTag: 'latest',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      error: 'Error',
      message: 'Unexpected error occurred at server.',
      success: false,
    });
  });
  it('Create pipeline with mock error', async () => {
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    sfnMock.on(StartExecutionCommand).resolves({});
    // Mock DynamoDB error
    ddbMock.on(PutCommand).resolvesOnce({})
      .rejects(new Error('Mock DynamoDB error'));
    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        name: 'Pipeline-01',
        description: 'Description of Pipeline-01',
        region: 'us-east-1',
        dataCollectionSDK: 'Clickstream SDK',
        tags: [
          {
            key: 'name',
            value: 'clickstream',
          },
        ],
        network: {
          vpcId: 'vpc-0000',
          publicSubnetIds: ['subnet-1111', 'subnet-2222', 'subnet-3333'],
          privateSubnetIds: ['subnet-44444', 'subnet-55555', 'subnet-6666'],
        },
        bucket: {
          name: 'EXAMPLE_BUCKET',
          prefix: '',
        },
        ingestionServer: {
          size: {
            serverMin: 2,
            serverMax: 4,
            warmPoolSize: 1,
            scaleOnCpuUtilizationPercent: 50,
          },
          domain: {
            domainName: 'fake.example.com',
            certificateArn: 'arn:aws:acm:us-east-1:111122223333:certificate/96d69c0d-fb79-4586-a8d0-0ae1e25c44e5',
          },
          loadBalancer: {
            serverEndpointPath: '/collect',
            serverCorsOrigin: '*',
            protocol: 'HTTPS',
            enableApplicationLoadBalancerAccessLog: true,
            logS3Bucket: {
              name: 'EXAMPLE_BUCKET',
              prefix: 'logs',
            },
            notificationsTopicArn: 'arn:aws:sns:us-east-1:111122223333:test',
          },
          sinkType: 's3',
          sinkS3: {
            sinkBucket: {
              name: 'EXAMPLE_BUCKET',
              prefix: 'test',
            },
            s3BufferSize: 50,
            s3BufferInterval: 30,
          },
        },
        etl: {},
        dataAnalytics: {},
        workflow: {
          Version: '2022-03-15',
          Workflow: {
            Type: WorkflowStateType.PASS,
            End: true,
            Branches: [],
          },
        },
        executionArn: '',
        version: '123',
        versionTag: 'latest',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
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
  });
  it('Create pipeline Not Modified', async () => {
    tokenMock(ddbMock, true);
    projectExistedMock(ddbMock, true);
    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        name: 'Pipeline-01',
        description: 'Description of Pipeline-01',
        base: {},
        runtime: {},
        ingestion: {},
        etl: {},
        dataAnalytics: {},
      });
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
  });
  it('Create pipeline with non-existent project', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, false);
    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        name: 'Pipeline-01',
        description: 'Description of Pipeline-01',
        base: {},
        runtime: {},
        ingestion: {},
        etl: {},
        dataAnalytics: {},
      });
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
  it('Get pipeline by ID', async () => {
    projectExistedMock(ddbMock, true);
    ddbMock.on(GetCommand).resolves({
      Item: {
        id: MOCK_PROJECT_ID,
        name: 'Pipeline-01',
        description: 'Description of Pipeline-01',
        status: 'RUNNING',
        ingestionServer: {
          network: {
            vpcId: 'vpc-0ba32b04ccc029088',
            publicSubnetIds: ['subnet-09ae522e85bbee5c5', 'subnet-09ae522e85bbee5c5', 'subnet-09ae522e85bbee5c5'],
            privateSubnetIds: ['subnet-09ae522e85bbee5c5', 'subnet-09ae522e85bbee5c5', 'subnet-09ae522e85bbee5c5'],
          },
          size: {
            serverMin: 2,
            serverMax: 4,
            warmPoolSize: 1,
            scaleOnCpuUtilizationPercent: 50,
          },
          domain: {
            hostedZoneId: 'Z000000000000000000E',
            hostedZoneName: 'fake.example.com',
            recordName: 'click',
          },
          loadBalancer: {
            serverEndpointPath: '/collect',
            serverCorsOrigin: '*',
            protocol: 'HTTPS',
            enableApplicationLoadBalancerAccessLog: true,
            logS3Bucket: {
              name: 'EXAMPLE-BUCKET',
              prefix: 'logs',
            },
            notificationsTopicArn: 'arn:aws:sns:us-east-1:1111111111111111:test',
          },
          sinkType: 's3',
          sinkS3: {
            s3DataBucket: {
              name: 'EXAMPLE-BUCKET',
              prefix: 'test',
            },
            s3BatchMaxBytes: 50,
            s3BatchTimeout: 30,
          },
          sinkKafka: {
            selfHost: false,
            kafkaBrokers: 'test1,test2,test3',
            kafkaTopic: 't1',
            mskClusterName: 'mskClusterName',
            mskTopic: 'mskTopic',
            mskSecurityGroupId: 'sg-0000000000002',
          },
          sinkKinesis: {
            kinesisStreamMode: 'ON_DEMAND',
            kinesisShardCount: 3,
            kinesisDataS3Bucket: {
              name: 'EXAMPLE-BUCKET',
              prefix: 'kinesis',
            },
          },
        },
        etl: {
          appIds: ['appId1', 'appId2'],
          sourceS3Bucket: {
            name: 'EXAMPLE-BUCKET',
            prefix: 'source',
          },
          sinkS3Bucket: {
            name: 'EXAMPLE-BUCKET',
            prefix: 'sink',
          },
        },
        dataAnalytics: {},
      },
    });
    let res = await request(app)
      .get(`/api/pipeline/${MOCK_PIPELINE_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        id: MOCK_PROJECT_ID,
        name: 'Pipeline-01',
        description: 'Description of Pipeline-01',
        status: {
          status: 'Active',
          details: [],
        },
        ingestionServer: {
          network: {
            vpcId: 'vpc-0ba32b04ccc029088',
            publicSubnetIds: ['subnet-09ae522e85bbee5c5', 'subnet-09ae522e85bbee5c5', 'subnet-09ae522e85bbee5c5'],
            privateSubnetIds: ['subnet-09ae522e85bbee5c5', 'subnet-09ae522e85bbee5c5', 'subnet-09ae522e85bbee5c5'],
          },
          size: {
            serverMin: 2,
            serverMax: 4,
            warmPoolSize: 1,
            scaleOnCpuUtilizationPercent: 50,
          },
          domain: {
            hostedZoneId: 'Z000000000000000000E',
            hostedZoneName: 'fake.example.com',
            recordName: 'click',
          },
          loadBalancer: {
            serverEndpointPath: '/collect',
            serverCorsOrigin: '*',
            protocol: 'HTTPS',
            enableApplicationLoadBalancerAccessLog: true,
            logS3Bucket: {
              name: 'EXAMPLE-BUCKET',
              prefix: 'logs',
            },
            notificationsTopicArn: 'arn:aws:sns:us-east-1:1111111111111111:test',
          },
          sinkType: 's3',
          sinkS3: {
            s3DataBucket: {
              name: 'EXAMPLE-BUCKET',
              prefix: 'test',
            },
            s3BatchMaxBytes: 50,
            s3BatchTimeout: 30,
          },
          sinkKafka: {
            selfHost: false,
            kafkaBrokers: 'test1,test2,test3',
            kafkaTopic: 't1',
            mskClusterName: 'mskClusterName',
            mskTopic: 'mskTopic',
            mskSecurityGroupId: 'sg-0000000000002',
          },
          sinkKinesis: {
            kinesisStreamMode: 'ON_DEMAND',
            kinesisShardCount: 3,
            kinesisDataS3Bucket: {
              name: 'EXAMPLE-BUCKET',
              prefix: 'kinesis',
            },
          },
        },
        etl: {
          appIds: ['appId1', 'appId2'],
          sourceS3Bucket: {
            name: 'EXAMPLE-BUCKET',
            prefix: 'source',
          },
          sinkS3Bucket: {
            name: 'EXAMPLE-BUCKET',
            prefix: 'sink',
          },
        },
        dataAnalytics: {},
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
              details: [],
            },
          },
          {
            name: 'Pipeline-02',
            status: {
              status: 'Active',
              details: [],
            },
          },
          {
            name: 'Pipeline-03',
            status: {
              status: 'Active',
              details: [],
            },
          },
          {
            name: 'Pipeline-04',
            status: {
              status: 'Active',
              details: [],
            },
          },
          {
            name: 'Pipeline-05',
            status: {
              status: 'Active',
              details: [],
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
      .get(`/api/pipeline?pid=${MOCK_PROJECT_ID}`);
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
              details: [],
            },
          },
          {
            name: 'Pipeline-02',
            status: {
              status: 'Active',
              details: [],
            },
          },
          {
            name: 'Pipeline-03',
            status: {
              status: 'Active',
              details: [],
            },
          },
          {
            name: 'Pipeline-04',
            status: {
              status: 'Active',
              details: [],
            },
          },
          {
            name: 'Pipeline-05',
            status: {
              status: 'Active',
              details: [],
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
              details: [],
            },
          },
          {
            name: 'Pipeline-02',
            status: {
              status: 'Active',
              details: [],
            },
          },
          {
            name: 'Pipeline-03',
            status: {
              status: 'Active',
              details: [],
            },
          },
          {
            name: 'Pipeline-04',
            status: {
              status: 'Active',
              details: [],
            },
          },
          {
            name: 'Pipeline-05',
            status: {
              status: 'Active',
              details: [],
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
              details: [],
            },
          },
          {
            name: 'Pipeline-04',
            status: {
              status: 'Active',
              details: [],
            },
          },
        ],
        totalCount: 5,
      },
    });
  });
  it('Get pipeline list with fail status', async () => {
    projectExistedMock(ddbMock, true);
    pipelineExistedMock(ddbMock, true);
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          name: 'Pipeline-01',
          executionArn: 'executionArn',
          region: 'us-east-1',
          workflow: {
            Version: '2022-03-15',
            Workflow: {
              Branches: [
                {
                  StartAt: 'Ingestion',
                  States: {
                    Ingestion: {
                      Data: {
                        Callback: {
                          BucketName: 'EXAMPLE_BUCKET',
                          BucketPrefix: '/ingestion',
                        },
                        Input: {
                          Action: 'Create',
                          Parameters: [],
                          StackName: 'clickstream-ingestion1',
                          TemplateURL: 'https://xxx.com',
                        },
                      },
                      End: true,
                      Type: 'Stack',
                    },
                  },
                },
                {
                  StartAt: 'Ingestion',
                  States: {
                    Ingestion: {
                      Data: {
                        Callback: {
                          BucketName: 'EXAMPLE_BUCKET',
                          BucketPrefix: '/ingestion',
                        },
                        Input: {
                          Action: 'Create',
                          Parameters: [],
                          StackName: 'clickstream-ingestion2',
                          TemplateURL: 'https://xxx.com',
                        },
                      },
                      End: true,
                      Type: 'Stack',
                    },
                  },
                },
              ],
              End: true,
              Type: 'Parallel',
            },
          },
        },
      ],
    });
    cloudFormationClient.on(DescribeStacksCommand).resolvesOnce({
      Stacks: [{
        StackName: 'test',
        StackStatus: StackStatus.UPDATE_IN_PROGRESS,
        StackStatusReason: '',
        CreationTime: undefined,
      }],
    }).resolves({
      Stacks: [{
        StackName: 'test',
        StackStatus: StackStatus.UPDATE_FAILED,
        StackStatusReason: '',
        CreationTime: undefined,
      }],
    });
    ddbMock.on(UpdateCommand).resolves({});
    const res = await request(app)
      .get(`/api/pipeline?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        items: [
          {
            name: 'Pipeline-01',
            executionArn: 'executionArn',
            region: 'us-east-1',
            status: {
              details: [
                {
                  stackName: 'clickstream-ingestion1',
                  stackStatus: 'UPDATE_IN_PROGRESS',
                  stackStatusReason: '',
                  url: 'https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/stackinfo?stackId=undefined',
                },
                {
                  stackName: 'clickstream-ingestion2',
                  stackStatus: 'UPDATE_FAILED',
                  stackStatusReason: '',
                  url: 'https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/stackinfo?stackId=undefined',
                },
              ],
              status: 'Failed',
            },
            workflow: {
              Version: '2022-03-15',
              Workflow: {
                Branches: [
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: {
                        Data: {
                          Callback: {
                            BucketName: 'EXAMPLE_BUCKET',
                            BucketPrefix: '/ingestion',
                          },
                          Input: {
                            Action: 'Create',
                            Parameters: [],
                            StackName: 'clickstream-ingestion1',
                            TemplateURL: 'https://xxx.com',
                          },
                        },
                        End: true,
                        Type: 'Stack',
                      },
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: {
                        Data: {
                          Callback: {
                            BucketName: 'EXAMPLE_BUCKET',
                            BucketPrefix: '/ingestion',
                          },
                          Input: {
                            Action: 'Create',
                            Parameters: [],
                            StackName: 'clickstream-ingestion2',
                            TemplateURL: 'https://xxx.com',
                          },
                        },
                        End: true,
                        Type: 'Stack',
                      },
                    },
                  },
                ],
                End: true,
                Type: 'Parallel',
              },
            },
          },
        ],
        totalCount: 1,
      },
    });
  });
  it('Get pipeline list with updating status', async () => {
    projectExistedMock(ddbMock, true);
    pipelineExistedMock(ddbMock, true);
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          name: 'Pipeline-01',
          executionArn: 'executionArn',
          region: 'us-east-1',
          workflow: {
            Version: '2022-03-15',
            Workflow: {
              Branches: [
                {
                  StartAt: 'Ingestion',
                  States: {
                    Ingestion: {
                      Data: {
                        Callback: {
                          BucketName: 'EXAMPLE_BUCKET',
                          BucketPrefix: '/ingestion',
                        },
                        Input: {
                          Action: 'Create',
                          Parameters: [],
                          StackName: 'clickstream-ingestion1',
                          TemplateURL: 'https://xxx.com',
                        },
                      },
                      End: true,
                      Type: 'Stack',
                    },
                  },
                },
                {
                  StartAt: 'Ingestion',
                  States: {
                    Ingestion: {
                      Data: {
                        Callback: {
                          BucketName: 'EXAMPLE_BUCKET',
                          BucketPrefix: '/ingestion',
                        },
                        Input: {
                          Action: 'Create',
                          Parameters: [],
                          StackName: 'clickstream-ingestion2',
                          TemplateURL: 'https://xxx.com',
                        },
                      },
                      End: true,
                      Type: 'Stack',
                    },
                  },
                },
              ],
              End: true,
              Type: 'Parallel',
            },
          },
        },
      ],
    });
    cloudFormationClient.on(DescribeStacksCommand).resolvesOnce({
      Stacks: [{
        StackName: 'test',
        StackStatus: StackStatus.UPDATE_IN_PROGRESS,
        StackStatusReason: '',
        CreationTime: undefined,
      }],
    }).resolves({
      Stacks: [{
        StackName: 'test',
        StackStatus: StackStatus.UPDATE_COMPLETE,
        StackStatusReason: '',
        CreationTime: undefined,
      }],
    });
    ddbMock.on(UpdateCommand).resolves({});
    const res = await request(app)
      .get(`/api/pipeline?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        items: [
          {
            name: 'Pipeline-01',
            executionArn: 'executionArn',
            region: 'us-east-1',
            status: {
              details: [
                {
                  stackName: 'clickstream-ingestion1',
                  stackStatus: 'UPDATE_IN_PROGRESS',
                  stackStatusReason: '',
                  url: 'https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/stackinfo?stackId=undefined',
                },
                {
                  stackName: 'clickstream-ingestion2',
                  stackStatus: 'UPDATE_COMPLETE',
                  stackStatusReason: '',
                  url: 'https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/stackinfo?stackId=undefined',
                },
              ],
              status: 'Updating',
            },
            workflow: {
              Version: '2022-03-15',
              Workflow: {
                Branches: [
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: {
                        Data: {
                          Callback: {
                            BucketName: 'EXAMPLE_BUCKET',
                            BucketPrefix: '/ingestion',
                          },
                          Input: {
                            Action: 'Create',
                            Parameters: [],
                            StackName: 'clickstream-ingestion1',
                            TemplateURL: 'https://xxx.com',
                          },
                        },
                        End: true,
                        Type: 'Stack',
                      },
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: {
                        Data: {
                          Callback: {
                            BucketName: 'EXAMPLE_BUCKET',
                            BucketPrefix: '/ingestion',
                          },
                          Input: {
                            Action: 'Create',
                            Parameters: [],
                            StackName: 'clickstream-ingestion2',
                            TemplateURL: 'https://xxx.com',
                          },
                        },
                        End: true,
                        Type: 'Stack',
                      },
                    },
                  },
                ],
                End: true,
                Type: 'Parallel',
              },
            },
          },
        ],
        totalCount: 1,
      },
    });
  });
  it('Get pipeline list with deleting status', async () => {
    projectExistedMock(ddbMock, true);
    pipelineExistedMock(ddbMock, true);
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          name: 'Pipeline-01',
          executionArn: 'executionArn',
          region: 'us-east-1',
          workflow: {
            Version: '2022-03-15',
            Workflow: {
              Branches: [
                {
                  StartAt: 'Ingestion',
                  States: {
                    Ingestion: {
                      Data: {
                        Callback: {
                          BucketName: 'EXAMPLE_BUCKET',
                          BucketPrefix: '/ingestion',
                        },
                        Input: {
                          Action: 'Create',
                          Parameters: [],
                          StackName: 'clickstream-ingestion1',
                          TemplateURL: 'https://xxx.com',
                        },
                      },
                      End: true,
                      Type: 'Stack',
                    },
                  },
                },
                {
                  StartAt: 'Ingestion',
                  States: {
                    Ingestion: {
                      Data: {
                        Callback: {
                          BucketName: 'EXAMPLE_BUCKET',
                          BucketPrefix: '/ingestion',
                        },
                        Input: {
                          Action: 'Create',
                          Parameters: [],
                          StackName: 'clickstream-ingestion2',
                          TemplateURL: 'https://xxx.com',
                        },
                      },
                      End: true,
                      Type: 'Stack',
                    },
                  },
                },
              ],
              End: true,
              Type: 'Parallel',
            },
          },
        },
      ],
    });
    cloudFormationClient.on(DescribeStacksCommand).resolvesOnce({
      Stacks: [{
        StackName: 'test',
        StackStatus: StackStatus.DELETE_IN_PROGRESS,
        StackStatusReason: '',
        CreationTime: undefined,
      }],
    }).resolves({
      Stacks: [{
        StackName: 'test',
        StackStatus: StackStatus.DELETE_COMPLETE,
        StackStatusReason: '',
        CreationTime: undefined,
      }],
    });
    ddbMock.on(UpdateCommand).resolves({});
    const res = await request(app)
      .get(`/api/pipeline?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        items: [
          {
            name: 'Pipeline-01',
            executionArn: 'executionArn',
            region: 'us-east-1',
            status: {
              details: [
                {
                  stackName: 'clickstream-ingestion1',
                  stackStatus: 'DELETE_IN_PROGRESS',
                  stackStatusReason: '',
                  url: 'https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/stackinfo?stackId=undefined',
                },
                {
                  stackName: 'clickstream-ingestion2',
                  stackStatus: 'DELETE_COMPLETE',
                  stackStatusReason: '',
                  url: 'https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/stackinfo?stackId=undefined',
                },
              ],
              status: 'Deleting',
            },
            workflow: {
              Version: '2022-03-15',
              Workflow: {
                Branches: [
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: {
                        Data: {
                          Callback: {
                            BucketName: 'EXAMPLE_BUCKET',
                            BucketPrefix: '/ingestion',
                          },
                          Input: {
                            Action: 'Create',
                            Parameters: [],
                            StackName: 'clickstream-ingestion1',
                            TemplateURL: 'https://xxx.com',
                          },
                        },
                        End: true,
                        Type: 'Stack',
                      },
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: {
                        Data: {
                          Callback: {
                            BucketName: 'EXAMPLE_BUCKET',
                            BucketPrefix: '/ingestion',
                          },
                          Input: {
                            Action: 'Create',
                            Parameters: [],
                            StackName: 'clickstream-ingestion2',
                            TemplateURL: 'https://xxx.com',
                          },
                        },
                        End: true,
                        Type: 'Stack',
                      },
                    },
                  },
                ],
                End: true,
                Type: 'Parallel',
              },
            },
          },
        ],
        totalCount: 1,
      },
    });
  });
  it('Get pipeline list with active status', async () => {
    projectExistedMock(ddbMock, true);
    pipelineExistedMock(ddbMock, true);
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          name: 'Pipeline-01',
          executionArn: 'executionArn',
          region: 'us-east-1',
          workflow: {
            Version: '2022-03-15',
            Workflow: {
              Branches: [
                {
                  StartAt: 'Ingestion',
                  States: {
                    Ingestion: {
                      Data: {
                        Callback: {
                          BucketName: 'EXAMPLE_BUCKET',
                          BucketPrefix: '/ingestion',
                        },
                        Input: {
                          Action: 'Create',
                          Parameters: [],
                          StackName: 'clickstream-ingestion1',
                          TemplateURL: 'https://xxx.com',
                        },
                      },
                      End: true,
                      Type: 'Stack',
                    },
                  },
                },
                {
                  StartAt: 'Ingestion',
                  States: {
                    Ingestion: {
                      Data: {
                        Callback: {
                          BucketName: 'EXAMPLE_BUCKET',
                          BucketPrefix: '/ingestion',
                        },
                        Input: {
                          Action: 'Create',
                          Parameters: [],
                          StackName: 'clickstream-ingestion2',
                          TemplateURL: 'https://xxx.com',
                        },
                      },
                      End: true,
                      Type: 'Stack',
                    },
                  },
                },
              ],
              End: true,
              Type: 'Parallel',
            },
          },
        },
      ],
    });
    cloudFormationClient.on(DescribeStacksCommand).resolvesOnce({
      Stacks: [{
        StackName: 'test',
        StackStatus: StackStatus.CREATE_COMPLETE,
        StackStatusReason: '',
        CreationTime: undefined,
      }],
    }).resolves({
      Stacks: [{
        StackName: 'test',
        StackStatus: StackStatus.CREATE_COMPLETE,
        StackStatusReason: '',
        CreationTime: undefined,
      }],
    });
    ddbMock.on(UpdateCommand).resolves({});
    const res = await request(app)
      .get(`/api/pipeline?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        items: [
          {
            name: 'Pipeline-01',
            executionArn: 'executionArn',
            region: 'us-east-1',
            status: {
              details: [
                {
                  stackName: 'clickstream-ingestion1',
                  stackStatus: 'CREATE_COMPLETE',
                  stackStatusReason: '',
                  url: 'https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/stackinfo?stackId=undefined',
                },
                {
                  stackName: 'clickstream-ingestion2',
                  stackStatus: 'CREATE_COMPLETE',
                  stackStatusReason: '',
                  url: 'https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/stackinfo?stackId=undefined',
                },
              ],
              status: 'Active',
            },
            workflow: {
              Version: '2022-03-15',
              Workflow: {
                Branches: [
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: {
                        Data: {
                          Callback: {
                            BucketName: 'EXAMPLE_BUCKET',
                            BucketPrefix: '/ingestion',
                          },
                          Input: {
                            Action: 'Create',
                            Parameters: [],
                            StackName: 'clickstream-ingestion1',
                            TemplateURL: 'https://xxx.com',
                          },
                        },
                        End: true,
                        Type: 'Stack',
                      },
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: {
                        Data: {
                          Callback: {
                            BucketName: 'EXAMPLE_BUCKET',
                            BucketPrefix: '/ingestion',
                          },
                          Input: {
                            Action: 'Create',
                            Parameters: [],
                            StackName: 'clickstream-ingestion2',
                            TemplateURL: 'https://xxx.com',
                          },
                        },
                        End: true,
                        Type: 'Stack',
                      },
                    },
                  },
                ],
                End: true,
                Type: 'Parallel',
              },
            },
          },
        ],
        totalCount: 1,
      },
    });
  });
  it('Update pipeline', async () => {
    projectExistedMock(ddbMock, true);
    pipelineExistedMock(ddbMock, true);
    ddbMock.on(GetCommand).resolves({
      Item: {
        pipelineId: MOCK_PIPELINE_ID,
        projectId: MOCK_PROJECT_ID,
        version: '1674988290400',
        ingestion: {},
        updateAt: 1674988290400,
        runtime: {},
        operator: '',
        name: 'Pipeline-01',
        base: {},
        deleted: false,
        createAt: 1674988290400,
        type: 'PIPELINE#1625439a-2ba8-4c10-8b21-40da07d7b121#latest',
        description: 'Update 2 Description of Pipeline-01',
        etl: {},
        dataAnalytics: {},
      },
    });
    ddbMock.on(TransactWriteItemsCommand).resolves({});
    let res = await request(app)
      .put(`/api/pipeline/${MOCK_PIPELINE_ID}`)
      .send({
        pipelineId: MOCK_PIPELINE_ID,
        projectId: MOCK_PROJECT_ID,
        description: 'Update Description of Pipeline-01',
        version: '1674988290400',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      data: null,
      success: true,
      message: 'Pipeline updated.',
    });

    // Mock DynamoDB error
    ddbMock.on(TransactWriteItemsCommand).rejects(new Error('Mock DynamoDB error'));
    res = await request(app)
      .put(`/api/pipeline/${MOCK_PIPELINE_ID}`)
      .send({
        pipelineId: MOCK_PIPELINE_ID,
        projectId: MOCK_PROJECT_ID,
        description: 'Update Description of Pipeline-01',
        version: '1674988290400',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('Update pipeline with not match id', async () => {
    projectExistedMock(ddbMock, true);
    pipelineExistedMock(ddbMock, true);
    const res = await request(app)
      .put(`/api/pipeline/${MOCK_PIPELINE_ID}1`)
      .send({
        pipelineId: MOCK_PIPELINE_ID,
        projectId: MOCK_PROJECT_ID,
        description: 'Update Description of Pipeline-01',
        version: '1674988290401',
      });
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
      .send({
        pipelineId: MOCK_PIPELINE_ID,
        projectId: MOCK_PROJECT_ID,
        description: 'Update Description of Pipeline-01',
        version: '1674988290401',
      });
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
      .send({
        pipelineId: MOCK_PIPELINE_ID,
        projectId: MOCK_PROJECT_ID,
        description: 'Update Description of Pipeline-01',
        version: '1674988290401',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'Pipeline resource does not exist.',
    });
  });
  it('Update pipeline with error version', async () => {
    projectExistedMock(ddbMock, true);
    pipelineExistedMock(ddbMock, true);
    ddbMock.on(GetCommand).resolves({
      Item: {
        id: '1625439a-2ba8-4c10-8b21-40da07d7b121',
        projectId: '99e48cf4-23a7-428f-938a-2359f3963787',
        version: '1674988290400',
        ingestion: {},
        updateAt: 1674988290400,
        runtime: {},
        operator: '',
        name: 'Pipeline-01',
        base: {},
        deleted: false,
        createAt: 1674988290400,
        type: 'PIPELINE#1625439a-2ba8-4c10-8b21-40da07d7b121#latest',
        description: 'Update 2 Description of Pipeline-01',
        etl: {},
        dataAnalytics: {},
      },
    });
    const mockError = new Error('TransactionCanceledException');
    mockError.name = 'TransactionCanceledException';
    ddbMock.on(TransactWriteItemsCommand).rejects(mockError);
    const res = await request(app)
      .put(`/api/pipeline/${MOCK_PIPELINE_ID}`)
      .send({
        pipelineId: MOCK_PIPELINE_ID,
        projectId: MOCK_PROJECT_ID,
        description: 'Update Description of Pipeline-01',
        version: '1674988290401',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Update error, check version and retry.',
    });
  });
  it('Delete pipeline', async () => {
    projectExistedMock(ddbMock, true);
    pipelineExistedMock(ddbMock, true);
    ddbMock.on(ScanCommand).resolves({
      Items: [
        { sk: 'Pipeline-01' },
        { sk: 'Pipeline-02' },
      ],
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