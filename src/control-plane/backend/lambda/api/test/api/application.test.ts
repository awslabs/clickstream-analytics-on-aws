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

import { StackStatus } from '@aws-sdk/client-cloudformation';
import { ExecutionStatus, StartExecutionCommand } from '@aws-sdk/client-sfn';
import {
  PutCommand,
  ScanCommand,
  GetCommand, GetCommandInput, UpdateCommand, QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import request from 'supertest';
import { mockClients, resetAllMockClient } from './aws-sdk-mock-util';
import { appExistedMock, MOCK_APP_NAME, MOCK_APP_ID, MOCK_PROJECT_ID, MOCK_TOKEN, projectExistedMock, tokenMock, MOCK_EXECUTION_ID, MOCK_PIPELINE_ID, MOCK_SOLUTION_VERSION, createEventRuleMock, createSNSTopicMock, MOCK_EXECUTION_ID_OLD } from './ddb-mock';
import { KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW } from './pipeline-mock';
import { clickStreamTableName } from '../../common/constants';
import { PipelineStackType, PipelineStatusType } from '../../common/model-ln';
import { WorkflowStateType } from '../../common/types';
import { getStackPrefix } from '../../common/utils';
import { app, server } from '../../index';
import 'aws-sdk-client-mock-jest';

describe('Application test', () => {
  beforeEach(() => {
    resetAllMockClient();
  });
  it('Create application', async () => {
    tokenMock(mockClients.ddbMock, false);
    projectExistedMock(mockClients.ddbMock, true);
    createEventRuleMock(mockClients.cloudWatchEventsMock);
    createSNSTopicMock(mockClients.snsMock);
    mockClients.ddbMock.on(QueryCommand)
      .resolvesOnce({
        Items: [
          {
            ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW,
            workflow: {
              Version: '2022-03-15',
              Workflow: {
                Type: WorkflowStateType.PARALLEL,
                End: true,
                Branches: [
                  {
                    States: {
                      Ingestion: {
                        Type: WorkflowStateType.STACK,
                        Data: {
                          Input: {
                            Region: 'ap-southeast-1',
                            TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/ingestion-server-kafka-stack.template.json',
                            Action: 'Create',
                            Parameters: [
                              {
                                ParameterKey: 'AppIds',
                                ParameterValue: '',
                              },
                            ],
                            StackName: `${getStackPrefix()}-Ingestion-kinesis-${MOCK_PIPELINE_ID}`,
                          },
                          Callback: {
                            BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID_OLD}`,
                            BucketName: 'EXAMPLE_BUCKET',
                          },
                        },
                        End: true,
                      },
                    },
                    StartAt: 'Ingestion',
                  },
                  {
                    States: {
                      DataProcessing: {
                        Type: WorkflowStateType.STACK,
                        Data: {
                          Input: {
                            Region: 'ap-southeast-1',
                            TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-pipeline-stack.template.json',
                            Action: 'Create',
                            Parameters: [
                              {
                                ParameterKey: 'AppIds',
                                ParameterValue: '',
                              },
                            ],
                            StackName: `${getStackPrefix()}-DataProcessing-${MOCK_PIPELINE_ID}`,
                          },
                          Callback: {
                            BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID_OLD}`,
                            BucketName: 'EXAMPLE_BUCKET',
                          },
                        },
                        Next: 'DataModeling',
                      },
                      Reporting: {
                        Type: WorkflowStateType.STACK,
                        Data: {
                          Input: {
                            Region: 'ap-southeast-1',
                            TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-reporting-quicksight-stack.template.json',
                            Action: 'Create',
                            Parameters: [
                              {
                                ParameterKey: 'RedShiftDBSchemaParam',
                                ParameterValue: '',
                              },
                            ],
                            StackName: `${getStackPrefix()}-Reporting-${MOCK_PIPELINE_ID}`,
                          },
                          Callback: {
                            BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID_OLD}`,
                            BucketName: 'EXAMPLE_BUCKET',
                          },
                        },
                        End: true,
                      },
                      DataModeling: {
                        Type: WorkflowStateType.STACK,
                        Data: {
                          Input: {
                            Region: 'ap-southeast-1',
                            TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-analytics-redshift-stack.template.json',
                            Action: 'Create',
                            Parameters: [
                              {
                                ParameterKey: 'AppIds',
                                ParameterValue: '',
                              },
                            ],
                            StackName: `${getStackPrefix()}-DataModelingRedshift-${MOCK_PIPELINE_ID}`,
                          },
                          Callback: {
                            BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID_OLD}`,
                            BucketName: 'EXAMPLE_BUCKET',
                          },
                        },
                        Next: 'Reporting',
                      },
                    },
                    StartAt: 'DataProcessing',
                  },
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: {
                        Data: {
                          Callback: {
                            BucketName: 'EXAMPLE_BUCKET',
                            BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID_OLD}`,
                          },
                          Input: {
                            Action: 'Create',
                            Region: 'ap-southeast-1',
                            Parameters: [],
                            StackName: `${getStackPrefix()}-Metrics-6666-6666`,
                            TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/metrics-stack.template.json',
                          },
                        },
                        End: true,
                        Type: WorkflowStateType.STACK,
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
      })
      .resolvesOnce({
        Items: [
          {
            name: MOCK_APP_NAME,
            appId: `${MOCK_APP_ID}_0`,
          },
        ],
      });

    mockClients.sfnMock.on(StartExecutionCommand).callsFake(input => {
      const executionInput = JSON.parse(input.input);
      const ingestionInput = executionInput.Branches[0].States.Ingestion;
      const dataProcessingInput = executionInput.Branches[1].States.DataProcessing;
      const dataModelingInput = executionInput.Branches[1].States.DataModeling;
      const reportingInput = executionInput.Branches[1].States.Reporting;
      const metricsInput = executionInput.Branches[2].States.Metrics;
      if (
        ingestionInput.Type === WorkflowStateType.STACK && ingestionInput.Data.Input.Action === 'Update' &&
        dataProcessingInput.Type === WorkflowStateType.STACK && dataProcessingInput.Data.Input.Action === 'Update' &&
        dataModelingInput.Type === WorkflowStateType.STACK && dataModelingInput.Data.Input.Action === 'Update' &&
        reportingInput.Type === WorkflowStateType.STACK && reportingInput.Data.Input.Action === 'Update' &&
        metricsInput.Type === WorkflowStateType.PASS && metricsInput.Data.Input.Action === 'Create'
      ) {
        return {
          executionArn: 'arn:aws:states:us-east-1:555555555555:execution:clickstream-stack-workflow:111-111-111',
        };
      } else {
        throw new Error('mocked StartExecutionCommand rejection');
      }
    });
    mockClients.ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .post('/api/app')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        name: MOCK_APP_NAME,
        appId: MOCK_APP_ID,
        description: 'Description of App-01',
        platform: 'Web',
        sdk: 'Clickstream SDK',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toEqual('Application created.');
    expect(res.body.success).toEqual(true);
    expect(mockClients.sfnMock).toHaveReceivedCommandTimes(StartExecutionCommand, 1);
    expect(mockClients.ddbMock).toHaveReceivedCommandTimes(PutCommand, 2);
  });
  it('Create application with mock ddb error', async () => {
    tokenMock(mockClients.ddbMock, false).rejectsOnce(new Error('Mock DynamoDB error'));
    projectExistedMock(mockClients.ddbMock, true);
    createEventRuleMock(mockClients.cloudWatchEventsMock);
    createSNSTopicMock(mockClients.snsMock);
    mockClients.ddbMock.on(QueryCommand)
      .resolvesOnce({
        Items: [
          {
            name: 'Pipeline-01',
            pipelineId: MOCK_PROJECT_ID,
            status: {
              status: PipelineStatusType.ACTIVE,
            },
            ingestionServer: {
              sinkType: 's3',
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
                            TemplateURL: 'https://example.com',
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
            executionArn: 'arn:aws:states:us-east-1:555555555555:execution:clickstream-stack-workflow:111-111-111',
          },
        ],
      })
      .resolvesOnce({
        Items: [
          {
            name: MOCK_APP_NAME,
            appId: `${MOCK_APP_ID}_0`,
          },
        ],
      });
    mockClients.sfnMock.on(StartExecutionCommand).resolves({});
    const res = await request(app)
      .post('/api/app')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        name: MOCK_APP_NAME,
        appId: MOCK_APP_ID,
        description: 'Description of App-01',
        platform: 'Web',
        sdk: 'Clickstream SDK',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
    expect(mockClients.ddbMock).toHaveReceivedCommandTimes(PutCommand, 2);
  });
  it('Create application with mock stack status error', async () => {
    tokenMock(mockClients.ddbMock, false);
    projectExistedMock(mockClients.ddbMock, true);
    mockClients.ddbMock.on(QueryCommand)
      .resolvesOnce({
        Items: [
          {
            name: 'Pipeline-01',
            pipelineId: MOCK_PROJECT_ID,
            status: {
              status: PipelineStatusType.ACTIVE,
              stackDetails: [],
              executionDetail: {
                name: MOCK_EXECUTION_ID,
                status: ExecutionStatus.RUNNING,
              },
            },
            ingestionServer: {
              sinkType: 's3',
            },
            executionArn: 'arn:aws:states:us-east-1:555555555555:execution:clickstream-stack-workflow:111-111-111',
          },
        ],
      })
      .resolvesOnce({
        Items: [
          {
            name: 'App-01',
            appId: MOCK_APP_ID,
          },
        ],
      });
    const res = await request(app)
      .post('/api/app')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        name: MOCK_APP_NAME,
        appId: MOCK_APP_ID,
        description: 'Description of App-01',
        platform: 'Web',
        sdk: 'Clickstream SDK',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'The pipeline current status does not allow update.',
    });
    expect(mockClients.ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);
  });
  it('Create application with mock pipeline error', async () => {
    tokenMock(mockClients.ddbMock, false);
    projectExistedMock(mockClients.ddbMock, true);
    mockClients.ddbMock.on(QueryCommand).resolves({
      Items: [],
    });
    const res = await request(app)
      .post('/api/app')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        name: MOCK_APP_NAME,
        appId: MOCK_APP_ID,
        description: 'Description of App-01',
        platform: 'Web',
        sdk: 'Clickstream SDK',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'The latest pipeline not found.',
    });
    expect(mockClients.ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);
  });
  it('Create application 400', async () => {
    tokenMock(mockClients.ddbMock, false);
    projectExistedMock(mockClients.ddbMock, true);
    mockClients.ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .post('/api/app');
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'body',
          msg: 'Value is empty.',
          param: 'projectId',
        },
        {
          location: 'body',
          msg: 'Value is empty.',
          param: 'appId',
        },
        {
          location: 'headers',
          msg: 'Value is empty.',
          param: 'x-click-stream-request-id',
        },
        {
          location: 'body',
          msg: 'Value is empty.',
          param: '',
          value: {},
        },
      ],
    });
    expect(mockClients.ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });
  it('Create application Not Modified', async () => {
    tokenMock(mockClients.ddbMock, true);
    projectExistedMock(mockClients.ddbMock, true);
    const res = await request(app)
      .post('/api/app')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        name: MOCK_APP_NAME,
        appId: MOCK_APP_ID,
        description: 'Description of App-01',
        platform: 'Web',
        sdk: 'Clickstream SDK',
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
    expect(mockClients.ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);
  });
  it('Create application with non-existent project', async () => {
    tokenMock(mockClients.ddbMock, false);
    projectExistedMock(mockClients.ddbMock, false);
    mockClients.ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .post('/api/app')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        name: MOCK_APP_NAME,
        appId: MOCK_APP_ID,
        description: 'Description of App-01',
        platform: 'Web',
        sdk: 'Clickstream SDK',
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
    expect(mockClients.ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);
  });
  it('Create application with error id', async () => {
    tokenMock(mockClients.ddbMock, false);
    projectExistedMock(mockClients.ddbMock, true);
    mockClients.ddbMock.on(QueryCommand)
      .resolvesOnce({
        Items: [
          {
            name: 'Pipeline-01',
            pipelineId: MOCK_PROJECT_ID,
            status: {
              status: PipelineStatusType.ACTIVE,
            },
            ingestionServer: {
              sinkType: 's3',
            },
            executionArn: 'arn:aws:states:us-east-1:555555555555:execution:clickstream-stack-workflow:111-111-111',
          },
        ],
      })
      .resolvesOnce({
        Items: [
          {
            name: MOCK_APP_NAME,
            appId: MOCK_APP_ID,
          },
        ],
      });
    mockClients.sfnMock.on(StartExecutionCommand).resolves({});
    mockClients.ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .post('/api/app')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        name: MOCK_APP_NAME,
        appId: `${MOCK_APP_ID}-1`,
        description: 'Description of App-01',
        platform: 'Web',
        sdk: 'Clickstream SDK',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'body',
          msg: 'Validation error: app name: app_7777_7777-1 not match [a-zA-Z][a-zA-Z0-9_]{0,126}. Please check and try again.',
          param: 'appId',
          value: 'app_7777_7777-1',
        },
      ],
    });
  });
  it('Create application with error mutil id', async () => {
    tokenMock(mockClients.ddbMock, false);
    projectExistedMock(mockClients.ddbMock, true);
    mockClients.ddbMock.on(QueryCommand)
      .resolvesOnce({
        Items: [
          {
            name: 'Pipeline-01',
            pipelineId: MOCK_PROJECT_ID,
            status: {
              status: PipelineStatusType.ACTIVE,
            },
            ingestionServer: {
              sinkType: 's3',
            },
            executionArn: 'arn:aws:states:us-east-1:555555555555:execution:clickstream-stack-workflow:111-111-111',
          },
        ],
      })
      .resolvesOnce({
        Items: [
          {
            name: MOCK_APP_NAME,
            appId: `${MOCK_APP_ID}-1`,
          },
        ],
      });
    mockClients.sfnMock.on(StartExecutionCommand).resolves({});
    mockClients.ddbMock.on(PutCommand).resolves({});
    const res = await request(app)
      .post('/api/app')
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        name: MOCK_APP_NAME,
        appId: MOCK_APP_ID,
        description: 'Description of App-01',
        platform: 'Web',
        sdk: 'Clickstream SDK',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Validation error: AppId: app_7777_7777-1,app_7777_7777 not match ^(([a-zA-Z][a-zA-Z0-9_]{0,126})(,[a-zA-Z][a-zA-Z0-9_]{0,126}){0,})?$. Please check and try again.',
    });
  });
  it('Get application by ID', async () => {
    projectExistedMock(mockClients.ddbMock, true);
    mockClients.ddbMock.on(GetCommand).resolves({
      Item: {
        deleted: false,
        updateAt: 1674202173912,
        createAt: 1674202173912,
        type: 'APP#e250bc17-405f-4473-862d-2346d6cefb49',
        sdk: 'Clickstream SDK',
        operator: '',
        description: 'Description of App-01',
        appId: MOCK_APP_ID,
        projectId: MOCK_PROJECT_ID,
        id: MOCK_PROJECT_ID,
        name: MOCK_APP_NAME,
        androidPackage: 'androidPackage',
        iosBundleId: 'iosBundleId',
        iosAppStoreId: 'iosAppStoreId',
      },
    });
    mockClients.ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          pipelineId: MOCK_PROJECT_ID,
          status: {
            status: PipelineStatusType.ACTIVE,
            stackDetails: [
              {
                stackName: `${getStackPrefix()}-Ingestion-kafka-${MOCK_PIPELINE_ID}`,
                stackType: PipelineStackType.INGESTION,
                stackStatus: StackStatus.CREATE_COMPLETE,
                stackStatusReason: '',
                stackTemplateVersion: MOCK_SOLUTION_VERSION,
                outputs: [
                  {
                    OutputKey: 'IngestionServerC000IngestionServerURL',
                    OutputValue: 'http://xxx/xxx',
                  },
                  {
                    OutputKey: 'IngestionServerC000IngestionServerDNS',
                    OutputValue: 'yyy/yyy',
                  },
                ],
              },
            ],
            executionDetail: {
              name: MOCK_EXECUTION_ID,
              status: ExecutionStatus.RUNNING,
            },
          },
          timezone: [
            {
              appId: MOCK_APP_ID,
              timezone: 'America/New_York',
            },
          ],
          ingestionServer: {
            sinkType: 's3',
          },
          executionArn: 'arn:aws:states:us-east-1:555555555555:execution:clickstream-stack-workflow:111-111-111',
        },
      ],
    });
    const res = await request(app)
      .get(`/api/app/${MOCK_APP_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        description: 'Description of App-01',
        appId: MOCK_APP_ID,
        projectId: MOCK_PROJECT_ID,
        name: MOCK_APP_NAME,
        androidPackage: 'androidPackage',
        iosAppStoreId: 'iosAppStoreId',
        iosBundleId: 'iosBundleId',
        createAt: 1674202173912,
        timezone: 'America/New_York',
        pipeline: {
          customDomain: '',
          endpoint: 'http://xxx/xxx',
          dns: 'yyy/yyy',
          id: MOCK_PROJECT_ID,
          statusType: PipelineStatusType.CREATING,
          stackDetails: [
            {
              stackName: `${getStackPrefix()}-Ingestion-kafka-${MOCK_PIPELINE_ID}`,
              stackType: PipelineStackType.INGESTION,
              stackStatus: StackStatus.CREATE_COMPLETE,
              stackStatusReason: '',
              stackTemplateVersion: MOCK_SOLUTION_VERSION,
              outputs: [
                {
                  OutputKey: 'IngestionServerC000IngestionServerURL',
                  OutputValue: 'http://xxx/xxx',
                },
                {
                  OutputKey: 'IngestionServerC000IngestionServerDNS',
                  OutputValue: 'yyy/yyy',
                },
              ],
            },
          ],
          executionDetail: {
            name: MOCK_EXECUTION_ID,
            status: ExecutionStatus.RUNNING,
          },
        },
      },
    });
  });
  it('Get application by ID with mock error', async () => {
    projectExistedMock(mockClients.ddbMock, true);
    // Mock DynamoDB error
    const input: GetCommandInput = {
      TableName: clickStreamTableName,
      Key: {
        id: MOCK_PROJECT_ID,
        type: `APP#${MOCK_APP_ID}`,
      },
    };
    // Mock DynamoDB error
    mockClients.ddbMock.on(GetCommand, input).rejects(new Error('Mock DynamoDB error'));
    const res = await request(app)
      .get(`/api/app/${MOCK_APP_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('Get application with no pid', async () => {
    projectExistedMock(mockClients.ddbMock, true);
    const res = await request(app)
      .get(`/api/app/${MOCK_APP_ID}`);
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
  it('Get non-existent application', async () => {
    projectExistedMock(mockClients.ddbMock, true);
    appExistedMock(mockClients.ddbMock, false);
    const res = await request(app)
      .get(`/api/app/${MOCK_APP_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'Application not found',
    });
  });
  it('Get application list', async () => {
    projectExistedMock(mockClients.ddbMock, true);
    mockClients.ddbMock.on(QueryCommand).resolves({
      Items: [
        { name: 'Application-01' },
        { name: 'Application-02' },
        { name: 'Application-03' },
        { name: 'Application-04' },
        { name: 'Application-05' },
      ],
    });
    let res = await request(app)
      .get(`/api/app?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        items: [
          { name: 'Application-01' },
          { name: 'Application-02' },
          { name: 'Application-03' },
          { name: 'Application-04' },
          { name: 'Application-05' },
        ],
        totalCount: 5,
      },
    });

    // Mock DynamoDB error
    mockClients.ddbMock.on(QueryCommand).rejects(new Error('Mock DynamoDB error'));
    res = await request(app)
      .get(`/api/app?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('Get application list with page', async () => {
    projectExistedMock(mockClients.ddbMock, true);
    mockClients.ddbMock.on(QueryCommand).resolves({
      Items: [
        { name: 'Application-01' },
        { name: 'Application-02' },
        { name: 'Application-03' },
        { name: 'Application-04' },
        { name: 'Application-05' },
      ],
    });
    const res = await request(app)
      .get(`/api/app?pid=${MOCK_PROJECT_ID}&pageNumber=2&pageSize=2`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        items: [
          { name: 'Application-03' },
          { name: 'Application-04' },
        ],
        totalCount: 5,
      },
    });
  });
  it('Get application list with no pid', async () => {
    projectExistedMock(mockClients.ddbMock, true);
    mockClients.ddbMock.on(ScanCommand).resolves({});
    const res = await request(app)
      .get('/api/app');
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
  it('Delete application', async () => {
    projectExistedMock(mockClients.ddbMock, true);
    appExistedMock(mockClients.ddbMock, true);
    createEventRuleMock(mockClients.cloudWatchEventsMock);
    createSNSTopicMock(mockClients.snsMock);
    mockClients.ddbMock.on(QueryCommand)
      .resolvesOnce({
        Items: [
          {
            name: 'Pipeline-01',
            pipelineId: MOCK_PROJECT_ID,
            appIds: [MOCK_APP_ID],
            status: {
              status: PipelineStatusType.ACTIVE,
            },
            ingestionServer: {
              sinkType: 's3',
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
                            TemplateURL: 'https://example.com',
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
            executionArn: 'arn:aws:states:us-east-1:555555555555:execution:clickstream-stack-workflow:111-111-111',
          },
        ],
      })
      .resolvesOnce({
        Items: [
          {
            name: MOCK_APP_NAME,
            appId: MOCK_APP_ID,
          },
        ],
      });
    mockClients.ddbMock.on(UpdateCommand).resolves({});
    mockClients.sfnMock.on(StartExecutionCommand).resolves({ executionArn: 'xxx' });
    let res = await request(app)
      .delete(`/api/app/${MOCK_APP_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      data: null,
      success: true,
      message: 'Application deleted.',
    });
  });
  it('Delete application with mock ddb error', async () => {
    projectExistedMock(mockClients.ddbMock, true);
    appExistedMock(mockClients.ddbMock, true);
    createEventRuleMock(mockClients.cloudWatchEventsMock);
    createSNSTopicMock(mockClients.snsMock);
    mockClients.ddbMock.on(QueryCommand)
      .resolvesOnce({
        Items: [
          {
            name: 'Pipeline-01',
            pipelineId: MOCK_PROJECT_ID,
            appIds: [MOCK_APP_ID],
            status: {
              status: PipelineStatusType.ACTIVE,
            },
            ingestionServer: {
              sinkType: 's3',
            },
            executionArn: 'arn:aws:states:us-east-1:555555555555:execution:clickstream-stack-workflow:111-111-111',
          },
        ],
      })
      .resolvesOnce({
        Items: [
          {
            name: MOCK_APP_NAME,
            appId: MOCK_APP_ID,
          },
        ],
      });
    // Mock DynamoDB error
    mockClients.ddbMock.on(UpdateCommand).rejects(new Error('Mock DynamoDB error'));
    const res = await request(app)
      .delete(`/api/app/${MOCK_APP_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Unexpected error occurred at server.',
      error: 'Error',
    });
  });
  it('Delete application that not belonging to pipeline', async () => {
    projectExistedMock(mockClients.ddbMock, true);
    appExistedMock(mockClients.ddbMock, true);
    mockClients.ddbMock.on(QueryCommand)
      .resolvesOnce({
        Items: [
          {
            name: 'Pipeline-01',
            pipelineId: MOCK_PROJECT_ID,
            appIds: [MOCK_APP_ID],
            status: {
              status: PipelineStatusType.ACTIVE,
            },
            ingestionServer: {
              sinkType: 's3',
            },
            executionArn: 'arn:aws:states:us-east-1:555555555555:execution:clickstream-stack-workflow:111-111-111',
          },
        ],
      })
      .resolvesOnce({
        Items: [
          {
            name: MOCK_APP_NAME,
            appId: `${MOCK_APP_ID}_1`,
          },
        ],
      });
    mockClients.ddbMock.on(UpdateCommand).resolves({});
    let res = await request(app)
      .delete(`/api/app/${MOCK_APP_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'The app not belonging to pipeline or it is deleted.',
    });
  });
  it('Delete application with error app id', async () => {
    projectExistedMock(mockClients.ddbMock, true);
    appExistedMock(mockClients.ddbMock, true);
    mockClients.ddbMock.on(QueryCommand)
      .resolvesOnce({
        Items: [
          {
            name: 'Pipeline-01',
            pipelineId: MOCK_PROJECT_ID,
            appIds: [MOCK_APP_ID],
            status: {
              status: PipelineStatusType.ACTIVE,
            },
            ingestionServer: {
              sinkType: 's3',
            },
            executionArn: 'arn:aws:states:us-east-1:555555555555:execution:clickstream-stack-workflow:111-111-111',
          },
        ],
      })
      .resolvesOnce({
        Items: [
          {
            name: MOCK_APP_NAME,
            appId: `${MOCK_APP_ID}`,
          },
          {
            name: MOCK_APP_NAME,
            appId: `${MOCK_APP_ID}-1`,
          },
        ],
      });
    mockClients.ddbMock.on(UpdateCommand).resolves({});
    let res = await request(app)
      .delete(`/api/app/${MOCK_APP_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Validation error: AppId: app_7777_7777-1 not match ^(([a-zA-Z][a-zA-Z0-9_]{0,126})(,[a-zA-Z][a-zA-Z0-9_]{0,126}){0,})?$. Please check and try again.',
    });
  });
  it('Delete application with error pipeline status', async () => {
    projectExistedMock(mockClients.ddbMock, true);
    appExistedMock(mockClients.ddbMock, true);
    mockClients.ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          name: 'Pipeline-01',
          pipelineId: MOCK_PROJECT_ID,
          status: {
            status: PipelineStatusType.ACTIVE,
            stackDetails: [],
            executionDetail: {
              name: MOCK_EXECUTION_ID,
              status: ExecutionStatus.RUNNING,
            },
          },
          ingestionServer: {
            sinkType: 's3',
          },
          executionArn: 'arn:aws:states:us-east-1:555555555555:execution:clickstream-stack-workflow:111-111-111',
        },
      ],
    });
    let res = await request(app)
      .delete(`/api/app/${MOCK_APP_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'The pipeline current status does not allow update.',
    });
  });
  it('Delete application with no pid', async () => {
    projectExistedMock(mockClients.ddbMock, true);
    appExistedMock(mockClients.ddbMock, true);
    const res = await request(app)
      .delete(`/api/app/${MOCK_APP_ID}`);
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
          value: MOCK_APP_ID,
        },
        {
          location: 'query',
          msg: 'Value is empty.',
          param: 'pid',
        },
      ],
    });
  });
  it('Delete application with no existed', async () => {
    projectExistedMock(mockClients.ddbMock, true);
    appExistedMock(mockClients.ddbMock, false);
    const res = await request(app)
      .delete(`/api/app/${MOCK_APP_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: 'Parameter verification failed.',
      error: [
        {
          location: 'params',
          msg: 'Application resource does not exist.',
          param: 'id',
          value: MOCK_APP_ID,
        },
      ],
    });
  });
  it('Set application timezone', async () => {
    projectExistedMock(mockClients.ddbMock, true);
    createEventRuleMock(mockClients.cloudWatchEventsMock);
    createSNSTopicMock(mockClients.snsMock);
    mockClients.ddbMock.on(QueryCommand)
      .resolvesOnce({
        Items: [
          {
            name: 'Pipeline-01',
            pipelineId: MOCK_PROJECT_ID,
            status: {
              status: PipelineStatusType.ACTIVE,
            },
            ingestionServer: {
              sinkType: 's3',
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
                            TemplateURL: 'https://example.com',
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
            executionArn: 'arn:aws:states:us-east-1:555555555555:execution:clickstream-stack-workflow:111-111-111',
          },
        ],
      });
    mockClients.sfnMock.on(StartExecutionCommand).resolves({});
    mockClients.ddbMock.on(UpdateCommand).resolves({});
    const res = await request(app)
      .put(`/api/app/${MOCK_APP_ID}/timezone`)
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        timezone: 'America/New_York',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toEqual('Application timezone updated.');
    expect(res.body.success).toEqual(true);
    expect(mockClients.ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);
    expect(mockClients.ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 1);
  });
  it('Update application timezone when the application timezone has been set', async () => {
    projectExistedMock(mockClients.ddbMock, true);
    createEventRuleMock(mockClients.cloudWatchEventsMock);
    createSNSTopicMock(mockClients.snsMock);
    mockClients.ddbMock.on(QueryCommand)
      .resolvesOnce({
        Items: [
          {
            name: 'Pipeline-01',
            pipelineId: MOCK_PROJECT_ID,
            status: {
              status: PipelineStatusType.ACTIVE,
            },
            ingestionServer: {
              sinkType: 's3',
            },
            timezone: [
              {
                appId: MOCK_APP_ID,
                timezone: 'America/New_York',
              },
            ],
          },
        ],
      });
    mockClients.sfnMock.on(StartExecutionCommand).resolves({});
    mockClients.ddbMock.on(UpdateCommand).resolves({});
    const res = await request(app)
      .put(`/api/app/${MOCK_APP_ID}/timezone`)
      .set('X-Click-Stream-Request-Id', MOCK_TOKEN)
      .send({
        projectId: MOCK_PROJECT_ID,
        timezone: 'America/New_York',
      });
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toEqual('Timezone not allowed to be modified.');
    expect(res.body.success).toEqual(true);
    expect(mockClients.ddbMock).toHaveReceivedCommandTimes(PutCommand, 1);
    expect(mockClients.ddbMock).toHaveReceivedCommandTimes(UpdateCommand, 0);
  });
  afterAll((done) => {
    server.close();
    done();
  });
});