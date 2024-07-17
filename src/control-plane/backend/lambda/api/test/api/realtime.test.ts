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

import { OUTPUT_REPORT_DASHBOARDS_SUFFIX, OUTPUT_STREAMING_INGESTION_FLINK_APP_ARN } from '@aws/clickstream-base-lib';
import { DescribeStacksCommand, StackStatus } from '@aws-sdk/client-cloudformation';
import { ApplicationStatus, DescribeApplicationCommand, StartApplicationCommand, StopApplicationCommand, UpdateApplicationCommand } from '@aws-sdk/client-kinesis-analytics-v2';
import { GenerateEmbedUrlForRegisteredUserCommand } from '@aws-sdk/client-quicksight';
import {
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import request from 'supertest';
import { mockClients, resetAllMockClient } from './aws-sdk-mock-util';
import { MOCK_APP_ID, MOCK_PIPELINE_ID, MOCK_PROJECT_ID, MOCK_SOLUTION_VERSION, appExistedMock, projectExistedMock } from './ddb-mock';
import { BASE_PIPELINE_ATTRIBUTES } from './pipeline-mock';
import { awsAccountId } from '../../common/constants';
import { PipelineStackType, PipelineStatusType } from '../../common/model-ln';
import { KinesisStreamMode, PipelineSinkType } from '../../common/types';
import { app, server } from '../../index';
import 'aws-sdk-client-mock-jest';

describe('Realtime test', () => {
  beforeEach(() => {
    resetAllMockClient();
  });
  it('Check flink status', async () => {
    projectExistedMock(mockClients.ddbMock, true);
    appExistedMock(mockClients.ddbMock, true);
    mockClients.ddbMock.on(QueryCommand).resolvesOnce(
      {
        Items: [
          {
            name: 'Pipeline-01',
            pipelineId: MOCK_PROJECT_ID,
            status: {
              status: PipelineStatusType.ACTIVE,
            },
            streaming: {
              appIdStreamList: [MOCK_APP_ID],
              appIdRealtimeList: [],
            },
            reporting: {
              quickSight: {
                accountName: 'clickstream-acc-xxx',
              },
            },
            stackDetails: [
              {
                stackName: `Clickstream-Streaming-${MOCK_PIPELINE_ID}`,
                stackType: PipelineStackType.STREAMING,
                stackStatus: StackStatus.CREATE_COMPLETE,
                stackStatusReason: '',
                stackTemplateVersion: MOCK_SOLUTION_VERSION,
                outputs: [
                  {
                    OutputKey: OUTPUT_STREAMING_INGESTION_FLINK_APP_ARN,
                    OutputValue: 'arn:aws:kinesisanalytics:us-east-1:555555555555:application/ClickstreamStreamingIngestion204CC39E-F3mJRaAOKJaL',
                  },
                ],
              },
            ],
            executionArn: 'arn:aws:states:us-east-1:555555555555:execution:clickstream-stack-workflow:111-111-111',
          },
        ],
      },
    );
    mockClients.kinesisAnalyticsV2Mock.on(DescribeApplicationCommand).resolves({
      ApplicationDetail: {
        ApplicationARN: 'arn:aws:kinesisanalytics:us-east-1:555555555555:application/ClickstreamStreamingIngestion204CC39E-F3',
        ApplicationStatus: ApplicationStatus.RUNNING,
        ApplicationDescription: 'ClickstreamStreamingIngestion204CC39E-F3',
        ApplicationName: 'ClickstreamStreamingIngestion204CC39E-F3',
        ApplicationVersionId: 1,
        RuntimeEnvironment: 'FLINK-1_13',
        ApplicationConfigurationDescription: {
          EnvironmentPropertyDescriptions: {
            PropertyGroupDescriptions: [
              {
                PropertyGroupId: 'EnvironmentProperties',
                PropertyMap: {
                  'FlinkApplicationProperties::FlinkParallelism': '1',
                  'FlinkApplicationProperties::JobPlan': 'xxxx',
                  'FlinkApplicationProperties::RuntimeMode': 'STREAMING',
                  'FlinkApplicationProperties::SavepointConfiguration': 'xxxx',
                  'FlinkApplicationProperties::CheckpointConfiguration': 'xxxx',
                },
              },
            ],
          },
        },
      },
    });
    mockClients.kinesisAnalyticsV2Mock.on(UpdateApplicationCommand).resolves({
      ApplicationDetail: {
        ApplicationARN: 'arn:aws:kinesisanalytics:us-east-1:555555555555:application/ClickstreamStreamingIngestion204CC39E-F3',
        ApplicationStatus: ApplicationStatus.UPDATING,
        ApplicationDescription: 'ClickstreamStreamingIngestion204CC39E-F3',
        ApplicationName: 'ClickstreamStreamingIngestion204CC39E-F3',
        ApplicationVersionId: 1,
        RuntimeEnvironment: 'FLINK-1_13',
      },
    });
    const res = await request(app).get(`/api/reporting/${MOCK_PROJECT_ID}/${MOCK_APP_ID}/realtimeDryRun?enable=true`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toEqual('');
    expect(res.body.success).toEqual(true);
    expect(mockClients.kinesisAnalyticsV2Mock).toHaveReceivedCommandTimes(DescribeApplicationCommand, 1);
    expect(mockClients.kinesisAnalyticsV2Mock).toHaveReceivedCommandTimes(UpdateApplicationCommand, 1);
    expect(mockClients.kinesisAnalyticsV2Mock).toHaveReceivedCommandTimes(StartApplicationCommand, 0);
  });
  it('Check flink status when app is updating', async () => {
    projectExistedMock(mockClients.ddbMock, true);
    appExistedMock(mockClients.ddbMock, true);
    mockClients.ddbMock.on(QueryCommand).resolvesOnce(
      {
        Items: [
          {
            name: 'Pipeline-01',
            pipelineId: MOCK_PROJECT_ID,
            status: {
              status: PipelineStatusType.ACTIVE,
            },
            streaming: {
              appIdStreamList: [MOCK_APP_ID],
              appIdRealtimeList: [],
            },
            reporting: {
              quickSight: {
                accountName: 'clickstream-acc-xxx',
              },
            },
            stackDetails: [
              {
                stackName: `Clickstream-Streaming-${MOCK_PIPELINE_ID}`,
                stackType: PipelineStackType.STREAMING,
                stackStatus: StackStatus.CREATE_COMPLETE,
                stackStatusReason: '',
                stackTemplateVersion: MOCK_SOLUTION_VERSION,
                outputs: [
                  {
                    OutputKey: OUTPUT_STREAMING_INGESTION_FLINK_APP_ARN,
                    OutputValue: 'arn:aws:kinesisanalytics:us-east-1:555555555555:application/ClickstreamStreamingIngestion204CC39E-F3mJRaAOKJaL',
                  },
                ],
              },
            ],
            executionArn: 'arn:aws:states:us-east-1:555555555555:execution:clickstream-stack-workflow:111-111-111',
          },
        ],
      },
    );
    mockClients.kinesisAnalyticsV2Mock.on(DescribeApplicationCommand).resolves({
      ApplicationDetail: {
        ApplicationARN: 'arn:aws:kinesisanalytics:us-east-1:555555555555:application/ClickstreamStreamingIngestion204CC39E-F3',
        ApplicationStatus: ApplicationStatus.UPDATING,
        ApplicationDescription: 'ClickstreamStreamingIngestion204CC39E-F3',
        ApplicationName: 'ClickstreamStreamingIngestion204CC39E-F3',
        ApplicationVersionId: 1,
        RuntimeEnvironment: 'FLINK-1_13',
        ApplicationConfigurationDescription: {
          EnvironmentPropertyDescriptions: {
            PropertyGroupDescriptions: [
              {
                PropertyGroupId: 'EnvironmentProperties',
                PropertyMap: {
                  'FlinkApplicationProperties::FlinkParallelism': '1',
                  'FlinkApplicationProperties::JobPlan': 'xxxx',
                  'FlinkApplicationProperties::RuntimeMode': 'STREAMING',
                  'FlinkApplicationProperties::SavepointConfiguration': 'xxxx',
                  'FlinkApplicationProperties::CheckpointConfiguration': 'xxxx',
                },
              },
            ],
          },
        },
      },
    });
    const res = await request(app).get(`/api/reporting/${MOCK_PROJECT_ID}/${MOCK_APP_ID}/realtimeDryRun?enable=true`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toEqual('The flink application status not allow update, please try again later.');
    expect(res.body.success).toEqual(false);
    expect(mockClients.kinesisAnalyticsV2Mock).toHaveReceivedCommandTimes(DescribeApplicationCommand, 1);
    expect(mockClients.kinesisAnalyticsV2Mock).toHaveReceivedCommandTimes(UpdateApplicationCommand, 0);
  });
  it('Check flink status with appId upper case', async () => {
    projectExistedMock(mockClients.ddbMock, true);
    appExistedMock(mockClients.ddbMock, true);
    mockClients.ddbMock.on(QueryCommand).resolvesOnce(
      {
        Items: [
          {
            name: 'Pipeline-01',
            pipelineId: MOCK_PROJECT_ID,
            projectId: MOCK_PROJECT_ID,
            status: {
              status: PipelineStatusType.ACTIVE,
            },
            streaming: {
              appIdStreamList: ['APP_7777_7777'],
              appIdRealtimeList: [],
            },
            reporting: {
              quickSight: {
                accountName: 'clickstream-acc-xxx',
              },
            },
            stackDetails: [
              {
                stackName: `Clickstream-Streaming-${MOCK_PIPELINE_ID}`,
                stackType: PipelineStackType.STREAMING,
                stackStatus: StackStatus.CREATE_COMPLETE,
                stackStatusReason: '',
                stackTemplateVersion: MOCK_SOLUTION_VERSION,
                outputs: [
                  {
                    OutputKey: OUTPUT_STREAMING_INGESTION_FLINK_APP_ARN,
                    OutputValue: 'arn:aws:kinesisanalytics:us-east-1:555555555555:application/ClickstreamStreamingIngestion204CC39E-F3mJRaAOKJaL',
                  },
                ],
              },
            ],
            ingestionServer: {
              ...BASE_PIPELINE_ATTRIBUTES.ingestionServer,
              sinkType: PipelineSinkType.KINESIS,
              sinkBatch: {
                size: 10000,
                intervalSeconds: 180,
              },
              sinkKinesis: {
                kinesisStreamMode: KinesisStreamMode.ON_DEMAND,
                sinkBucket: {
                  name: 'EXAMPLE_BUCKET',
                  prefix: '',
                },
              },
            },
            executionArn: 'arn:aws:states:us-east-1:555555555555:execution:clickstream-stack-workflow:111-111-111',
          },
        ],
      },
    );
    mockClients.kinesisAnalyticsV2Mock.on(DescribeApplicationCommand).resolves({
      ApplicationDetail: {
        ApplicationARN: 'arn:aws:kinesisanalytics:us-east-1:555555555555:application/ClickstreamStreamingIngestion204CC39E-F3',
        ApplicationStatus: ApplicationStatus.RUNNING,
        ApplicationDescription: 'ClickstreamStreamingIngestion204CC39E-F3',
        ApplicationName: 'ClickstreamStreamingIngestion204CC39E-F3',
        ApplicationVersionId: 1,
        RuntimeEnvironment: 'FLINK-1_13',
        ApplicationConfigurationDescription: {
          EnvironmentPropertyDescriptions: {
            PropertyGroupDescriptions: [
              {
                PropertyGroupId: 'EnvironmentProperties',
                PropertyMap: {
                  'FlinkApplicationProperties::FlinkParallelism': '1',
                  'FlinkApplicationProperties::JobPlan': 'xxxx',
                  'FlinkApplicationProperties::RuntimeMode': 'STREAMING',
                  'FlinkApplicationProperties::SavepointConfiguration': 'xxxx',
                  'FlinkApplicationProperties::CheckpointConfiguration': 'xxxx',
                },
              },
            ],
          },
        },
      },
    });
    mockClients.kinesisAnalyticsV2Mock.on(UpdateApplicationCommand).resolves({
      ApplicationDetail: {
        ApplicationARN: 'arn:aws:kinesisanalytics:us-east-1:555555555555:application/ClickstreamStreamingIngestion204CC39E-F3',
        ApplicationStatus: ApplicationStatus.UPDATING,
        ApplicationDescription: 'ClickstreamStreamingIngestion204CC39E-F3',
        ApplicationName: 'ClickstreamStreamingIngestion204CC39E-F3',
        ApplicationVersionId: 1,
        RuntimeEnvironment: 'FLINK-1_13',
      },
    });
    mockClients.cloudFormationMock.on(DescribeStacksCommand).resolves({
      Stacks: [
        {
          StackName: 'ForceStackName',
          StackId: 'arn:aws:cloudformation:ap-southeast-1:123456789012:stack/ForceStackName/12345678-1234-1234-1234-123456789012',
          StackStatus: StackStatus.CREATE_COMPLETE,
          StackStatusReason: 'MockForceStackStatusReason',
          CreationTime: new Date(),
        },
      ],
    });
    const res = await request(app).get(`/api/reporting/${MOCK_PROJECT_ID}/APP_7777_7777/realtimeDryRun?enable=true`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toEqual('');
    expect(res.body.success).toEqual(true);
    expect(mockClients.kinesisAnalyticsV2Mock).toHaveReceivedCommandTimes(DescribeApplicationCommand, 1);
    expect(mockClients.kinesisAnalyticsV2Mock).toHaveReceivedNthSpecificCommandWith(1, UpdateApplicationCommand, {
      ApplicationConfigurationUpdate: {
        EnvironmentPropertyUpdates: {
          PropertyGroups: [
            {
              PropertyGroupId: 'EnvironmentProperties',
              PropertyMap: {
                'FlinkApplicationProperties::CheckpointConfiguration': 'xxxx',
                'FlinkApplicationProperties::FlinkParallelism': '1',
                'FlinkApplicationProperties::JobPlan': 'xxxx',
                'FlinkApplicationProperties::RuntimeMode': 'STREAMING',
                'FlinkApplicationProperties::SavepointConfiguration': 'xxxx',
                'appIdStreamConfig': '{\"appIdStreamList\":[{\"appId\":\"APP_7777_7777\",\"streamArn\":\"arn:aws:kinesis:undefined:555555555555:stream/clickstream_streaming_sink_project_8888_8888_app_7777_7777_12345678\"}]}',
              },
            },
          ],
        },
      },
      ApplicationName: 'ClickstreamStreamingIngestion204CC39E-F3mJRaAOKJaL',
      CurrentApplicationVersionId: 1,
    });
  });
  it('Enable realtime - the first app', async () => {
    projectExistedMock(mockClients.ddbMock, true);
    appExistedMock(mockClients.ddbMock, true);
    mockClients.ddbMock.on(QueryCommand).resolvesOnce(
      {
        Items: [
          {
            name: 'Pipeline-01',
            pipelineId: MOCK_PROJECT_ID,
            status: {
              status: PipelineStatusType.ACTIVE,
            },
            streaming: {
              appIdStreamList: [MOCK_APP_ID],
              appIdRealtimeList: [],
            },
            reporting: {
              quickSight: {
                accountName: 'clickstream-acc-xxx',
              },
            },
            stackDetails: [
              {
                stackName: `Clickstream-Streaming-${MOCK_PIPELINE_ID}`,
                stackType: PipelineStackType.STREAMING,
                stackStatus: StackStatus.CREATE_COMPLETE,
                stackStatusReason: '',
                stackTemplateVersion: MOCK_SOLUTION_VERSION,
                outputs: [
                  {
                    OutputKey: OUTPUT_STREAMING_INGESTION_FLINK_APP_ARN,
                    OutputValue: 'arn:aws:kinesisanalytics:us-east-1:555555555555:application/ClickstreamStreamingIngestion204CC39E-F3mJRaAOKJaL',
                  },
                ],
              },
            ],
            executionArn: 'arn:aws:states:us-east-1:555555555555:execution:clickstream-stack-workflow:111-111-111',
          },
        ],
      },
    );
    mockClients.kinesisAnalyticsV2Mock.on(DescribeApplicationCommand).resolves({
      ApplicationDetail: {
        ApplicationARN: 'arn:aws:kinesisanalytics:us-east-1:555555555555:application/ClickstreamStreamingIngestion204CC39E-F3',
        ApplicationStatus: ApplicationStatus.READY,
        ApplicationDescription: 'ClickstreamStreamingIngestion204CC39E-F3',
        ApplicationName: 'ClickstreamStreamingIngestion204CC39E-F3',
        ApplicationVersionId: 1,
        RuntimeEnvironment: 'FLINK-1_13',
        ApplicationConfigurationDescription: {
          EnvironmentPropertyDescriptions: {
            PropertyGroupDescriptions: [
              {
                PropertyGroupId: 'EnvironmentProperties',
                PropertyMap: {
                  'FlinkApplicationProperties::FlinkParallelism': '1',
                  'FlinkApplicationProperties::JobPlan': 'xxxx',
                  'FlinkApplicationProperties::RuntimeMode': 'STREAMING',
                  'FlinkApplicationProperties::SavepointConfiguration': 'xxxx',
                  'FlinkApplicationProperties::CheckpointConfiguration': 'xxxx',
                },
              },
            ],
          },
        },
      },
    });
    mockClients.kinesisAnalyticsV2Mock.on(UpdateApplicationCommand).resolves({
      ApplicationDetail: {
        ApplicationARN: 'arn:aws:kinesisanalytics:us-east-1:555555555555:application/ClickstreamStreamingIngestion204CC39E-F3',
        ApplicationStatus: ApplicationStatus.UPDATING,
        ApplicationDescription: 'ClickstreamStreamingIngestion204CC39E-F3',
        ApplicationName: 'ClickstreamStreamingIngestion204CC39E-F3',
        ApplicationVersionId: 1,
        RuntimeEnvironment: 'FLINK-1_13',
      },
    });
    mockClients.kinesisAnalyticsV2Mock.on(StartApplicationCommand).resolves({});
    const res = await request(app).get(`/api/reporting/${MOCK_PROJECT_ID}/${MOCK_APP_ID}/realtimeDryRun?enable=true`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toEqual('');
    expect(res.body.success).toEqual(true);
    expect(mockClients.kinesisAnalyticsV2Mock).toHaveReceivedCommandTimes(DescribeApplicationCommand, 1);
    expect(mockClients.kinesisAnalyticsV2Mock).toHaveReceivedCommandTimes(UpdateApplicationCommand, 1);
    expect(mockClients.kinesisAnalyticsV2Mock).toHaveReceivedCommandTimes(StartApplicationCommand, 1);
  });
  it('Disable realtime - the last app', async () => {
    projectExistedMock(mockClients.ddbMock, true);
    appExistedMock(mockClients.ddbMock, true);
    mockClients.ddbMock.on(QueryCommand).resolvesOnce(
      {
        Items: [
          {
            name: 'Pipeline-01',
            pipelineId: MOCK_PROJECT_ID,
            status: {
              status: PipelineStatusType.ACTIVE,
            },
            streaming: {
              appIdStreamList: [MOCK_APP_ID],
              appIdRealtimeList: [MOCK_APP_ID],
            },
            reporting: {
              quickSight: {
                accountName: 'clickstream-acc-xxx',
              },
            },
            stackDetails: [
              {
                stackName: `Clickstream-Streaming-${MOCK_PIPELINE_ID}`,
                stackType: PipelineStackType.STREAMING,
                stackStatus: StackStatus.CREATE_COMPLETE,
                stackStatusReason: '',
                stackTemplateVersion: MOCK_SOLUTION_VERSION,
                outputs: [
                  {
                    OutputKey: OUTPUT_STREAMING_INGESTION_FLINK_APP_ARN,
                    OutputValue: 'arn:aws:kinesisanalytics:us-east-1:555555555555:application/ClickstreamStreamingIngestion204CC39E-F3mJRaAOKJaL',
                  },
                ],
              },
            ],
            executionArn: 'arn:aws:states:us-east-1:555555555555:execution:clickstream-stack-workflow:111-111-111',
          },
        ],
      },
    );
    mockClients.kinesisAnalyticsV2Mock.on(DescribeApplicationCommand).resolves({
      ApplicationDetail: {
        ApplicationARN: 'arn:aws:kinesisanalytics:us-east-1:555555555555:application/ClickstreamStreamingIngestion204CC39E-F3',
        ApplicationStatus: ApplicationStatus.RUNNING,
        ApplicationDescription: 'ClickstreamStreamingIngestion204CC39E-F3',
        ApplicationName: 'ClickstreamStreamingIngestion204CC39E-F3',
        ApplicationVersionId: 1,
        RuntimeEnvironment: 'FLINK-1_13',
        ApplicationConfigurationDescription: {
          EnvironmentPropertyDescriptions: {
            PropertyGroupDescriptions: [
              {
                PropertyGroupId: 'EnvironmentProperties',
                PropertyMap: {
                  'FlinkApplicationProperties::FlinkParallelism': '1',
                  'FlinkApplicationProperties::JobPlan': 'xxxx',
                  'FlinkApplicationProperties::RuntimeMode': 'STREAMING',
                  'FlinkApplicationProperties::SavepointConfiguration': 'xxxx',
                  'FlinkApplicationProperties::CheckpointConfiguration': 'xxxx',
                },
              },
            ],
          },
        },
      },
    });
    mockClients.kinesisAnalyticsV2Mock.on(StopApplicationCommand).resolves({});
    const res = await request(app).get(`/api/reporting/${MOCK_PROJECT_ID}/${MOCK_APP_ID}/realtimeDryRun?enable=false`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toEqual('');
    expect(res.body.success).toEqual(true);
    expect(mockClients.kinesisAnalyticsV2Mock).toHaveReceivedCommandTimes(DescribeApplicationCommand, 1);
    expect(mockClients.kinesisAnalyticsV2Mock).toHaveReceivedCommandTimes(UpdateApplicationCommand, 0);
    expect(mockClients.kinesisAnalyticsV2Mock).toHaveReceivedCommandTimes(StopApplicationCommand, 1);
  });
  it('Embedding realtime', async () => {
    projectExistedMock(mockClients.ddbMock, true);
    appExistedMock(mockClients.ddbMock, true);
    mockClients.ddbMock.on(QueryCommand).resolvesOnce(
      {
        Items: [
          {
            name: 'Pipeline-01',
            pipelineId: MOCK_PROJECT_ID,
            status: {
              status: PipelineStatusType.ACTIVE,
            },
            streaming: {
              appIdStreamList: [MOCK_APP_ID],
              appIdRealtimeList: [MOCK_APP_ID],
            },
            reporting: {
              quickSight: {
                accountName: 'clickstream-acc-xxx',
              },
            },
            stackDetails: [
              {
                stackName: `Clickstream-Streaming-${MOCK_PIPELINE_ID}`,
                stackType: PipelineStackType.STREAMING,
                stackStatus: StackStatus.CREATE_COMPLETE,
                stackStatusReason: '',
                stackTemplateVersion: MOCK_SOLUTION_VERSION,
                outputs: [
                  {
                    OutputKey: OUTPUT_STREAMING_INGESTION_FLINK_APP_ARN,
                    OutputValue: 'arn:aws:kinesisanalytics:us-east-1:555555555555:application/ClickstreamStreamingIngestion204CC39E-F3mJRaAOKJaL',
                  },
                ],
              },
              {
                stackName: `Clickstream-Reporting-${MOCK_PIPELINE_ID}`,
                stackType: PipelineStackType.REPORTING,
                stackStatus: StackStatus.CREATE_COMPLETE,
                stackStatusReason: '',
                stackTemplateVersion: MOCK_SOLUTION_VERSION,
                outputs: [
                  {
                    OutputKey: OUTPUT_REPORT_DASHBOARDS_SUFFIX,
                    OutputValue: '[{"appId":"app_7777_7777","dashboardId":"clickstream_dashboard_v1_notepad_mtzfsocy_app1","realtimeDashboardId":"clickstream_dashboard_rt_v1_notepad_mtzfsocy_app1"}]',
                  },
                ],
              },
            ],
            executionArn: 'arn:aws:states:us-east-1:555555555555:execution:clickstream-stack-workflow:111-111-111',
          },
        ],
      },
    );
    mockClients.quickSightMock.on(GenerateEmbedUrlForRegisteredUserCommand).resolves({
      EmbedUrl: 'https://quicksight.aws.amazon.com/embed/4ui7xyvq73/studies/4a05631e-cbe6-477c-915d-1704aec9f101?isauthcode=true&identityprovider=quicksight&code=4a05631e-cbe6-477c-915d-1704aec9f101',
    });
    const res = await request(app).get(`/api/reporting/${MOCK_PROJECT_ID}/${MOCK_APP_ID}/realtime?allowedDomain=https://example.com`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toEqual('');
    expect(res.body.success).toEqual(true);
    expect(mockClients.quickSightMock).toHaveReceivedNthSpecificCommandWith(1, GenerateEmbedUrlForRegisteredUserCommand, {
      AllowedDomains: ['https://example.com'],
      AwsAccountId: awsAccountId,
      ExperienceConfiguration: {
        QuickSightConsole: {
          InitialPath: '/dashboards/clickstream_dashboard_rt_v1_notepad_mtzfsocy_app1',
        },
      },
      UserArn: 'arn:aws:quicksight:us-east-1:555555555555:user/default/QuickSightEmbeddingRole/ClickstreamPublishUser',
    });
  });
  afterAll((done) => {
    server.close();
    done();
  });
});