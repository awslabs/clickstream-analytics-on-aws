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
import {
  RedshiftServerlessClient,
  GetWorkgroupCommand,
  GetNamespaceCommand,
} from '@aws-sdk/client-redshift-serverless';
import { DescribeExecutionCommand, ExecutionStatus, SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { DynamoDBDocumentClient, GetCommand, GetCommandInput, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import request from 'supertest';
import {
  dictionaryMock,
  MOCK_APP_ID,
  MOCK_PIPELINE_ID,
  MOCK_PROJECT_ID,
  MOCK_TOKEN,
  pipelineExistedMock,
  projectExistedMock,
  tokenMock,
} from './ddb-mock';
import { KINESIS_ETL_REDSHIFT_PIPELINE, KINESIS_ETL_REDSHIFT_PIPELINE_WITH_WORKFLOW, S3_INGESTION_PIPELINE } from './pipeline-mock';
import { clickStreamTableName, dictionaryTableName } from '../../common/constants';
import { app, server } from '../../index';
import 'aws-sdk-client-mock-jest';

const ddbMock = mockClient(DynamoDBDocumentClient);
const sfnMock = mockClient(SFNClient);
const cloudFormationClient = mockClient(CloudFormationClient);
const kafkaMock = mockClient(KafkaClient);
const redshiftServerlessClient = mockClient(RedshiftServerlessClient);


describe('Pipeline test', () => {
  beforeEach(() => {
    ddbMock.reset();
    sfnMock.reset();
    cloudFormationClient.reset();
    kafkaMock.reset();
    redshiftServerlessClient.reset();
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
    sfnMock.on(StartExecutionCommand).resolves({ executionArn: 'xxx' });
    redshiftServerlessClient.on(GetWorkgroupCommand).resolves({
      workgroup: {
        workgroupId: 'workgroupId',
        workgroupArn: 'workgroupArn',
        workgroupName: 'workgroupName',
      },
    });
    redshiftServerlessClient.on(GetNamespaceCommand).resolves({
      namespace: {
        namespaceId: 'namespaceId',
        namespaceArn: 'namespaceArn',
        namespaceName: 'namespaceName',
      },
    });
    ddbMock.on(PutCommand).resolves({});
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { id: 1, appId: `${MOCK_APP_ID}_1` },
        { id: 2, appId: `${MOCK_APP_ID}_2` },
      ],
    });
    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        ...KINESIS_ETL_REDSHIFT_PIPELINE,
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toEqual('Pipeline added.');
    expect(res.body.success).toEqual(true);
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 2);
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
    sfnMock.on(StartExecutionCommand).resolves({ executionArn: 'xxx' });
    const res = await request(app)
      .post('/api/pipeline')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send(S3_INGESTION_PIPELINE);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      error: 'Error',
      message: 'Unexpected error occurred at server.',
      success: false,
    });
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });
  it('Create pipeline with mock error', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    sfnMock.on(StartExecutionCommand).resolves({ executionArn: 'xxx' });
    // Mock DynamoDB error
    ddbMock.on(PutCommand).rejects(new Error('Mock DynamoDB error'));
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
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);
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
      Item: KINESIS_ETL_REDSHIFT_PIPELINE_WITH_WORKFLOW,
    });
    let res = await request(app)
      .get(`/api/pipeline/${MOCK_PIPELINE_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        ...KINESIS_ETL_REDSHIFT_PIPELINE_WITH_WORKFLOW,
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
      Items: [KINESIS_ETL_REDSHIFT_PIPELINE_WITH_WORKFLOW],
    });
    cloudFormationClient.on(DescribeStacksCommand)
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
          stackName: 'Clickstream-ETL-6666-6666',
          stackType: 'ETL',
          stackStatus: 'UPDATE_IN_PROGRESS',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-DataAnalytics-6666-6666',
          stackType: 'DataAnalytics',
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
      Items: [KINESIS_ETL_REDSHIFT_PIPELINE_WITH_WORKFLOW],
    });
    cloudFormationClient.on(DescribeStacksCommand)
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
          stackName: 'Clickstream-ETL-6666-6666',
          stackType: 'ETL',
          stackStatus: 'CREATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-DataAnalytics-6666-6666',
          stackType: 'DataAnalytics',
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
      Items: [KINESIS_ETL_REDSHIFT_PIPELINE_WITH_WORKFLOW],
    });
    cloudFormationClient.on(DescribeStacksCommand)
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
          stackName: 'Clickstream-ETL-6666-6666',
          stackType: 'ETL',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-DataAnalytics-6666-6666',
          stackType: 'DataAnalytics',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
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
      Items: [KINESIS_ETL_REDSHIFT_PIPELINE_WITH_WORKFLOW],
    });
    cloudFormationClient.on(DescribeStacksCommand)
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
          stackName: 'Clickstream-ETL-6666-6666',
          stackType: 'ETL',
          stackStatus: 'DELETE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-DataAnalytics-6666-6666',
          stackType: 'DataAnalytics',
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
      Items: [KINESIS_ETL_REDSHIFT_PIPELINE_WITH_WORKFLOW],
    });
    cloudFormationClient.on(DescribeStacksCommand)
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
          stackName: 'Clickstream-ETL-6666-6666',
          stackType: 'ETL',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-DataAnalytics-6666-6666',
          stackType: 'DataAnalytics',
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
      Items: [KINESIS_ETL_REDSHIFT_PIPELINE_WITH_WORKFLOW],
    });
    cloudFormationClient.on(DescribeStacksCommand)
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
          stackName: 'Clickstream-ETL-6666-6666',
          stackType: 'ETL',
          stackStatus: 'CREATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-DataAnalytics-6666-6666',
          stackType: 'DataAnalytics',
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
      Items: [KINESIS_ETL_REDSHIFT_PIPELINE_WITH_WORKFLOW],
    });
    cloudFormationClient.on(DescribeStacksCommand)
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
          stackName: 'Clickstream-ETL-6666-6666',
          stackType: 'ETL',
          stackStatus: 'CREATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-DataAnalytics-6666-6666',
          stackType: 'DataAnalytics',
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
      Items: [KINESIS_ETL_REDSHIFT_PIPELINE_WITH_WORKFLOW],
    });
    cloudFormationClient.on(DescribeStacksCommand)
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
          stackName: 'Clickstream-ETL-6666-6666',
          stackType: 'ETL',
          stackStatus: 'UPDATE_FAILED',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'Clickstream-DataAnalytics-6666-6666',
          stackType: 'DataAnalytics',
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
    projectExistedMock(ddbMock, true);
    pipelineExistedMock(ddbMock, true);
    ddbMock.on(GetCommand).resolves({
      Item: KINESIS_ETL_REDSHIFT_PIPELINE_WITH_WORKFLOW,
    });
    ddbMock.on(TransactWriteItemsCommand).resolves({});
    let res = await request(app)
      .put(`/api/pipeline/${MOCK_PIPELINE_ID}`)
      .send(KINESIS_ETL_REDSHIFT_PIPELINE_WITH_WORKFLOW);
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
      .send(KINESIS_ETL_REDSHIFT_PIPELINE_WITH_WORKFLOW);
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
      .send(KINESIS_ETL_REDSHIFT_PIPELINE_WITH_WORKFLOW);
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
      .send(KINESIS_ETL_REDSHIFT_PIPELINE_WITH_WORKFLOW);
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
      .send(KINESIS_ETL_REDSHIFT_PIPELINE_WITH_WORKFLOW);
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
      Item: KINESIS_ETL_REDSHIFT_PIPELINE_WITH_WORKFLOW,
    });
    const mockError = new Error('TransactionCanceledException');
    mockError.name = 'TransactionCanceledException';
    ddbMock.on(TransactWriteItemsCommand).rejects(mockError);
    const res = await request(app)
      .put(`/api/pipeline/${MOCK_PIPELINE_ID}`)
      .send({
        ...KINESIS_ETL_REDSHIFT_PIPELINE_WITH_WORKFLOW,
        version: '0',
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
    ddbMock.on(GetCommand).resolves({
      Item: KINESIS_ETL_REDSHIFT_PIPELINE_WITH_WORKFLOW,
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