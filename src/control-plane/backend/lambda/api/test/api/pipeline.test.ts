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
import { DescribeExecutionCommand, ExecutionStatus, SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { DynamoDBDocumentClient, GetCommand, GetCommandInput, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import request from 'supertest';
import { dictionaryMock, MOCK_PIPELINE_ID, MOCK_PROJECT_ID, MOCK_TOKEN, pipelineExistedMock, projectExistedMock, tokenMock } from './ddb-mock';
import { clickStreamTableName, dictionaryTableName } from '../../common/constants';
import { KinesisStreamMode, PipelineStatusType, WorkflowStateType } from '../../common/types';
import { app, server } from '../../index';
import 'aws-sdk-client-mock-jest';
import { Pipeline } from '../../model/pipeline';

const ddbMock = mockClient(DynamoDBDocumentClient);
const sfnMock = mockClient(SFNClient);
const cloudFormationClient = mockClient(CloudFormationClient);
const kafkaMock = mockClient(KafkaClient);

const DDB_PIPELINE: Pipeline = {
  projectId: MOCK_PROJECT_ID,
  dataAnalytics: {
    redshift: {
      serverless: {
        workgroupName: 'test',
        iamRoleArn: 'arn:aws:iam::01234567890:role/MyRedshiftServerlessDataRole',
      },
    },
    loadWorkflow: {
      scheduleInterval: 60,
    },
  },
  dataCollectionSDK: 'clickstream',
  updateAt: 1681353806173,
  status: {
    status: PipelineStatusType.ACTIVE,
    stackDetails: [
      {
        stackName: 'clickstream-kafka-connector-e09deecdc47f4c9e92c50be225446acc',
        stackStatus: 'CREATE_COMPLETE',
        stackStatusReason: '',
        url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
      },
      {
        stackName: 'clickstream-ingestion-kafka-e09deecdc47f4c9e92c50be225446acc',
        stackStatus: 'CREATE_COMPLETE',
        stackStatusReason: '',
        url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
      },
      {
        stackName: 'clickstream-etl-e09deecdc47f4c9e92c50be225446acc',
        stackStatus: 'CREATE_COMPLETE',
        stackStatusReason: '',
        url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
      },
      {
        stackName: 'clickstream-data-analytics-e09deecdc47f4c9e92c50be225446acc',
        stackStatus: 'CREATE_COMPLETE',
        stackStatusReason: '',
        url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
      },
    ],
    executionDetail: {
      name: 'main-5ab07c6e-b6ac-47ea-bf3a-02ede7391807',
      status: 'SUCCEEDED',
    },
  },
  operator: '',
  name: 'Pipeline01',
  versionTag: 'latest',
  network: {
    publicSubnetIds: [
      'subnet-00000000000000021',
      'subnet-00000000000000022',
      'subnet-00000000000000023',
    ],
    vpcId: 'vpc-00000000000000001',
    privateSubnetIds: [
      'subnet-00000000000000011',
      'subnet-00000000000000012',
      'subnet-00000000000000013',
    ],
  },
  executionArn: 'arn:aws:states:us-east-1:01234567890:execution:MyPipelineStateMachine:main-5ab07c6e-b6ac-47ea-bf3a-02ede7391807',
  ingestionServer: {
    size: {
      serverMax: 4,
      warmPoolSize: 1,
      serverMin: 2,
      scaleOnCpuUtilizationPercent: 50,
    },
    loadBalancer: {
      protocol: 'HTTPS',
      enableApplicationLoadBalancerAccessLog: true,
      logS3Bucket: {
        name: 'EXAMPLE_BUCKET',
        prefix: '',
      },
      notificationsTopicArn: '',
      enableGlobalAccelerator: true,
      serverCorsOrigin: '',
      serverEndpointPath: '/collect',
    },
    domain: {
      certificateArn: 'arn:aws:acm:ap-southeast-1:01234567890:certificate/398ce638-e522-40e8-b344-fad5a616e11b',
      domainName: 'fake.example.com',
    },
    sinkKafka: {
      kafkaConnector: {
        enable: true,
      },
      topic: 'asdasd',
      mskCluster: {
        name: 'test',
        arn: 'arn:aws:kafka:ap-southeast-1:01234567890:cluster/test/4665c061-166b-4de1-9d08-cf5e34146add-5',
        securityGroupId: 'sg-0518278177ebeec12',
      },
      brokers: [],
    },
    sinkKinesis: {
      kinesisStreamMode: KinesisStreamMode.PROVISIONED,
      kinesisShardCount: 2,
      sinkBucket: {
        name: 'EXAMPLE_BUCKET',
        prefix: '',
      },
    },
    sinkType: 'kafka',
    sinkS3: {
      sinkBucket: {
        name: 'EXAMPLE_BUCKET',
        prefix: '',
      },
      s3BatchMaxBytes: 500,
      s3BatchTimeout: 60,
    },
  },
  createAt: 1681353806173,
  region: 'ap-southeast-1',
  id: MOCK_PROJECT_ID,
  tags: [],
  workflow: {
    Version: '2022-03-15',
    Workflow: {
      Type: WorkflowStateType.PARALLEL,
      End: true,
      Branches: [
        {
          States: {
            KafkaConnector: {
              Type: WorkflowStateType.STACK,
              Data: {
                Input: {
                  Region: 'ap-southeast-1',
                  TemplateURL: 'https://aws-gcr-solutions.s3.undefined.undefined/clickstream-branch-main/feature-rel/main/default/kafka-s3-sink-stack.template.json',
                  Action: 'Create',
                  Parameters: [
                    {
                      ParameterValue: 'EXAMPLE_BUCKET',
                      ParameterKey: 'DataS3Bucket',
                    },
                    {
                      ParameterValue: 'clickstream/dfsd_asddfs/e09deecdc47f4c9e92c50be225446acc/data/buffer/',
                      ParameterKey: 'DataS3Prefix',
                    },
                    {
                      ParameterValue: 'EXAMPLE_BUCKET',
                      ParameterKey: 'LogS3Bucket',
                    },
                    {
                      ParameterValue: 'clickstream/dfsd_asddfs/e09deecdc47f4c9e92c50be225446acc/logs/kafka-connector/',
                      ParameterKey: 'LogS3Prefix',
                    },
                    {
                      ParameterValue: 'EXAMPLE_BUCKET',
                      ParameterKey: 'PluginS3Bucket',
                    },
                    {
                      ParameterValue: 'clickstream/dfsd_asddfs/e09deecdc47f4c9e92c50be225446acc/runtime/ingestion/kafka-connector/plugins/',
                      ParameterKey: 'PluginS3Prefix',
                    },
                    {
                      ParameterValue: 'subnet-077db9f4580234f6d,subnet-0fb3a453ca32d502a,subnet-0de87e35c44c21d25',
                      ParameterKey: 'SubnetIds',
                    },
                    {
                      ParameterValue: 'b-3.test.3k264h.c5.kafka.ap-southeast-1.amazonaws.com:9092,b-1.test.3k264h.c5.kafka.ap-southeast-1.amazonaws.com:9092,b-2.test.3k264h.c5.kafka.ap-southeast-1.amazonaws.com:9092',
                      ParameterKey: 'KafkaBrokers',
                    },
                    {
                      ParameterValue: 'asdasd',
                      ParameterKey: 'KafkaTopic',
                    },
                    {
                      ParameterValue: 'test',
                      ParameterKey: 'MskClusterName',
                    },
                    {
                      ParameterValue: 'sg-0518278177ebeec12',
                      ParameterKey: 'SecurityGroupId',
                    },
                  ],
                  StackName: 'clickstream-kafka-connector-e09deecdc47f4c9e92c50be225446acc',
                },
                Callback: {
                  BucketPrefix: 'clickstream/workflow/main-5ab07c6e-b6ac-47ea-bf3a-02ede7391807/clickstream-kafka-connector-e09deecdc47f4c9e92c50be225446acc',
                  BucketName: 'EXAMPLE_BUCKET',
                },
              },
              End: true,
            },
            Ingestion: {
              Type: WorkflowStateType.STACK,
              Data: {
                Input: {
                  Region: 'ap-southeast-1',
                  TemplateURL: 'https://aws-gcr-solutions.s3.undefined.undefined/clickstream-branch-main/feature-rel/main/default/ingestion-server-kafka-stack.template.json',
                  Action: 'Create',
                  Parameters: [
                    {
                      ParameterValue: 'vpc-0d2619f249ded4511',
                      ParameterKey: 'VpcId',
                    },
                    {
                      ParameterValue: 'subnet-0f573cd921a8717eb,subnet-0a8e1d58f97c7ed21,subnet-09bb7e97b38566417',
                      ParameterKey: 'PublicSubnetIds',
                    },
                    {
                      ParameterValue: 'subnet-077db9f4580234f6d,subnet-0fb3a453ca32d502a,subnet-0de87e35c44c21d25',
                      ParameterKey: 'PrivateSubnetIds',
                    },
                    {
                      ParameterValue: 'asdas.mingfeiq.people.aws.dev',
                      ParameterKey: 'DomainName',
                    },
                    {
                      ParameterValue: 'arn:aws:acm:ap-southeast-1:01234567890:certificate/398ce638-e522-40e8-b344-fad5a616e11b',
                      ParameterKey: 'ACMCertificateArn',
                    },
                    {
                      ParameterValue: 'HTTPS',
                      ParameterKey: 'Protocol',
                    },
                    {
                      ParameterValue: '/collect',
                      ParameterKey: 'ServerEndpointPath',
                    },
                    {
                      ParameterValue: '',
                      ParameterKey: 'ServerCorsOrigin',
                    },
                    {
                      ParameterValue: '4',
                      ParameterKey: 'ServerMax',
                    },
                    {
                      ParameterValue: '2',
                      ParameterKey: 'ServerMin',
                    },
                    {
                      ParameterValue: '50',
                      ParameterKey: 'ScaleOnCpuUtilizationPercent',
                    },
                    {
                      ParameterValue: '1',
                      ParameterKey: 'WarmPoolSize',
                    },
                    {
                      ParameterValue: '',
                      ParameterKey: 'NotificationsTopicArn',
                    },
                    {
                      ParameterValue: 'Yes',
                      ParameterKey: 'EnableGlobalAccelerator',
                    },
                    {
                      ParameterValue: 'Yes',
                      ParameterKey: 'EnableApplicationLoadBalancerAccessLog',
                    },
                    {
                      ParameterValue: 'EXAMPLE_BUCKET',
                      ParameterKey: 'LogS3Bucket',
                    },
                    {
                      ParameterValue: 'clickstream/dfsd_asddfs/e09deecdc47f4c9e92c50be225446acc/logs/alb/',
                      ParameterKey: 'LogS3Prefix',
                    },
                    {
                      ParameterValue: 'test',
                      ParameterKey: 'MskClusterName',
                    },
                    {
                      ParameterValue: 'sg-0518278177ebeec12',
                      ParameterKey: 'MskSecurityGroupId',
                    },
                    {
                      ParameterValue: 'asdasd',
                      ParameterKey: 'KafkaTopic',
                    },
                    {
                      ParameterValue: 'b-3.test.3k264h.c5.kafka.ap-southeast-1.amazonaws.com:9092,b-1.test.3k264h.c5.kafka.ap-southeast-1.amazonaws.com:9092,b-2.test.3k264h.c5.kafka.ap-southeast-1.amazonaws.com:9092',
                      ParameterKey: 'KafkaBrokers',
                    },
                  ],
                  StackName: 'clickstream-ingestion-kafka-e09deecdc47f4c9e92c50be225446acc',
                },
                Callback: {
                  BucketPrefix: 'clickstream/workflow/main-5ab07c6e-b6ac-47ea-bf3a-02ede7391807/clickstream-ingestion-kafka-e09deecdc47f4c9e92c50be225446acc',
                  BucketName: 'EXAMPLE_BUCKET',
                },
              },
              Next: 'KafkaConnector',
            },
          },
          StartAt: 'Ingestion',
        },
        {
          States: {
            ETL: {
              Type: WorkflowStateType.STACK,
              Data: {
                Input: {
                  Region: 'ap-southeast-1',
                  TemplateURL: 'https://aws-gcr-solutions.s3.undefined.undefined/clickstream-branch-main/feature-rel/main/default/data-pipeline-stack.template.json',
                  Action: 'Create',
                  Parameters: [
                    {
                      ParameterValue: 'vpc-0d2619f249ded4511',
                      ParameterKey: 'VpcId',
                    },
                    {
                      ParameterValue: 'subnet-077db9f4580234f6d,subnet-0fb3a453ca32d502a,subnet-0de87e35c44c21d25',
                      ParameterKey: 'PrivateSubnetIds',
                    },
                    {
                      ParameterValue: 'dfsd_asddfs',
                      ParameterKey: 'ProjectId',
                    },
                    {
                      ParameterValue: '',
                      ParameterKey: 'AppIds',
                    },
                    {
                      ParameterValue: 'EXAMPLE_BUCKET',
                      ParameterKey: 'SourceS3Bucket',
                    },
                    {
                      ParameterValue: 'clickstream/dfsd_asddfs/e09deecdc47f4c9e92c50be225446acc/data/buffer/asdasd/',
                      ParameterKey: 'SourceS3Prefix',
                    },
                    {
                      ParameterValue: 'EXAMPLE_BUCKET',
                      ParameterKey: 'SinkS3Bucket',
                    },
                    {
                      ParameterValue: 'clickstream/dfsd_asddfs/e09deecdc47f4c9e92c50be225446acc/data/ods/',
                      ParameterKey: 'SinkS3Prefix',
                    },
                    {
                      ParameterValue: 'EXAMPLE_BUCKET',
                      ParameterKey: 'PipelineS3Bucket',
                    },
                    {
                      ParameterValue: 'clickstream/dfsd_asddfs/e09deecdc47f4c9e92c50be225446acc/data/pipeline-temp/',
                      ParameterKey: 'PipelineS3Prefix',
                    },
                    {
                      ParameterValue: '72',
                      ParameterKey: 'DataFreshnessInHour',
                    },
                    {
                      ParameterValue: 'rate(1 hour)',
                      ParameterKey: 'ScheduleExpression',
                    },
                    {
                      ParameterValue: 'sofeware.aws.solution.clickstream.Transformer,sofeware.aws.solution.clickstream.UAEnrichment,sofeware.aws.solution.clickstream.IPEnrichment',
                      ParameterKey: 'TransformerAndEnrichClassNames',
                    },
                    {
                      ParameterValue: 'parquet',
                      ParameterKey: 'OutputFormat',
                    },
                  ],
                  StackName: 'clickstream-etl-e09deecdc47f4c9e92c50be225446acc',
                },
                Callback: {
                  BucketPrefix: 'clickstream/workflow/main-5ab07c6e-b6ac-47ea-bf3a-02ede7391807/clickstream-etl-e09deecdc47f4c9e92c50be225446acc',
                  BucketName: 'EXAMPLE_BUCKET',
                },
              },
              End: true,
            },
          },
          StartAt: 'ETL',
        },
        {
          States: {
            DataAnalytics: {
              Type: WorkflowStateType.STACK,
              Data: {
                Input: {
                  Region: 'ap-southeast-1',
                  TemplateURL: 'https://aws-gcr-solutions.s3.undefined.undefined/clickstream-branch-main/feature-rel/main/default/data-analytics-redshift-stack.template.json',
                  Action: 'Create',
                  Parameters: [
                    {
                      ParameterValue: 'vpc-0d2619f249ded4511',
                      ParameterKey: 'VpcId',
                    },
                    {
                      ParameterValue: 'subnet-077db9f4580234f6d,subnet-0fb3a453ca32d502a,subnet-0de87e35c44c21d25',
                      ParameterKey: 'PrivateSubnetIds',
                    },
                    {
                      ParameterValue: 'dfsd_asddfs',
                      ParameterKey: 'ProjectId',
                    },
                    {
                      ParameterValue: '',
                      ParameterKey: 'AppIds',
                    },
                    {
                      ParameterValue: 'EXAMPLE_BUCKET',
                      ParameterKey: 'ODSEventBucket',
                    },
                    {
                      ParameterValue: 'clickstream/dfsd_asddfs/e09deecdc47f4c9e92c50be225446acc/data/ods/',
                      ParameterKey: 'ODSEventPrefix',
                    },
                    {
                      ParameterValue: '.snappy',
                      ParameterKey: 'ODSEventFileSuffix',
                    },
                    {
                      ParameterValue: 'EXAMPLE_BUCKET',
                      ParameterKey: 'LoadWorkflowBucket',
                    },
                    {
                      ParameterValue: 'clickstream/dfsd_asddfs/e09deecdc47f4c9e92c50be225446acc/data/ods/',
                      ParameterKey: 'LoadWorkflowBucketPrefix',
                    },
                    {
                      ParameterValue: '50',
                      ParameterKey: 'MaxFilesLimit',
                    },
                    {
                      ParameterValue: '100',
                      ParameterKey: 'ProcessingFilesLimit',
                    },
                    {
                      ParameterValue: '3fe99af1-0b02-4b43-b8d4-34ccfd52c865',
                      ParameterKey: 'RedshiftServerlessNamespaceId',
                    },
                    {
                      ParameterValue: 'd60f7989-f4ce-46c5-95da-2f9cc7a27725',
                      ParameterKey: 'RedshiftServerlessWorkgroupId',
                    },
                    {
                      ParameterValue: 'test',
                      ParameterKey: 'RedshiftServerlessWorkgroupName',
                    },
                    {
                      ParameterValue: 'arn:aws:iam::01234567890:role/MyRedshiftServerlessDataRole',
                      ParameterKey: 'RedshiftServerlessIAMRole',
                    },
                  ],
                  StackName: 'clickstream-data-analytics-e09deecdc47f4c9e92c50be225446acc',
                },
                Callback: {
                  BucketPrefix: 'clickstream/workflow/main-5ab07c6e-b6ac-47ea-bf3a-02ede7391807/clickstream-data-analytics-e09deecdc47f4c9e92c50be225446acc',
                  BucketName: 'EXAMPLE_BUCKET',
                },
              },
              End: true,
            },
          },
          StartAt: 'DataAnalytics',
        },
      ],
    },
  },
  version: '1681353806172',
  prefix: 'PIPELINE',
  pipelineId: 'e09deecdc47f4c9e92c50be225446acc',
  bucket: {
    name: 'EXAMPLE_BUCKET',
    prefix: '',
  },
  executionName: 'main-5ab07c6e-b6ac-47ea-bf3a-02ede7391807',
  deleted: false,
  description: '',
  etl: {
    transformPlugin: '',
    enrichPlugin: [
      'sofeware.aws.solution.clickstream.UAEnrichment',
      'sofeware.aws.solution.clickstream.IPEnrichment',
    ],
    dataFreshnessInHour: 72,
    scheduleExpression: 'rate(1 hour)',
    pipelineBucket: {
      name: 'EXAMPLE_BUCKET',
      prefix: '',
    },
    sourceS3Bucket: {
      name: 'EXAMPLE_BUCKET',
      prefix: '',
    },
    sinkS3Bucket: {
      name: 'EXAMPLE_BUCKET',
      prefix: '',
    },
  },
  type: 'PIPELINE#e09deecdc47f4c9e92c50be225446acc#latest',
};

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
    sfnMock.on(StartExecutionCommand).resolves({});
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
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });
  it('Create pipeline with mock error', async () => {
    tokenMock(ddbMock, false);
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
    sfnMock.on(StartExecutionCommand).resolves({});
    // Mock DynamoDB error
    ddbMock.on(PutCommand).rejects(new Error('Mock DynamoDB error'));
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
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
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
    expect(ddbMock).toHaveReceivedCommandTimes(PutCommand, 0);
  });
  it('Get pipeline by ID', async () => {
    projectExistedMock(ddbMock, true);
    ddbMock.on(GetCommand).resolves({
      Item: DDB_PIPELINE,
    });
    let res = await request(app)
      .get(`/api/pipeline/${MOCK_PIPELINE_ID}?pid=${MOCK_PROJECT_ID}`);
    expect(res.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: '',
      data: {
        ...DDB_PIPELINE,
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
      Items: [DDB_PIPELINE],
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
          stackName: 'clickstream-kafka-connector-e09deecdc47f4c9e92c50be225446acc',
          stackStatus: 'UPDATE_FAILED',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'clickstream-ingestion-kafka-e09deecdc47f4c9e92c50be225446acc',
          stackStatus: 'UPDATE_IN_PROGRESS',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'clickstream-etl-e09deecdc47f4c9e92c50be225446acc',
          stackStatus: 'UPDATE_IN_PROGRESS',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'clickstream-data-analytics-e09deecdc47f4c9e92c50be225446acc',
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
      Items: [DDB_PIPELINE],
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
          stackName: 'clickstream-kafka-connector-e09deecdc47f4c9e92c50be225446acc',
          stackStatus: 'CREATE_IN_PROGRESS',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'clickstream-ingestion-kafka-e09deecdc47f4c9e92c50be225446acc',
          stackStatus: 'CREATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'clickstream-etl-e09deecdc47f4c9e92c50be225446acc',
          stackStatus: 'CREATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'clickstream-data-analytics-e09deecdc47f4c9e92c50be225446acc',
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
      Items: [DDB_PIPELINE],
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
          stackName: 'clickstream-kafka-connector-e09deecdc47f4c9e92c50be225446acc',
          stackStatus: 'UPDATE_IN_PROGRESS',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'clickstream-ingestion-kafka-e09deecdc47f4c9e92c50be225446acc',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'clickstream-etl-e09deecdc47f4c9e92c50be225446acc',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'clickstream-data-analytics-e09deecdc47f4c9e92c50be225446acc',
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
      Items: [DDB_PIPELINE],
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
          stackName: 'clickstream-kafka-connector-e09deecdc47f4c9e92c50be225446acc',
          stackStatus: 'DELETE_IN_PROGRESS',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'clickstream-ingestion-kafka-e09deecdc47f4c9e92c50be225446acc',
          stackStatus: 'DELETE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'clickstream-etl-e09deecdc47f4c9e92c50be225446acc',
          stackStatus: 'DELETE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'clickstream-data-analytics-e09deecdc47f4c9e92c50be225446acc',
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
      Items: [DDB_PIPELINE],
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
          stackName: 'clickstream-kafka-connector-e09deecdc47f4c9e92c50be225446acc',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'clickstream-ingestion-kafka-e09deecdc47f4c9e92c50be225446acc',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'clickstream-etl-e09deecdc47f4c9e92c50be225446acc',
          stackStatus: 'UPDATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'clickstream-data-analytics-e09deecdc47f4c9e92c50be225446acc',
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
      Items: [DDB_PIPELINE],
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
          stackName: 'clickstream-kafka-connector-e09deecdc47f4c9e92c50be225446acc',
          stackStatus: 'CREATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'clickstream-ingestion-kafka-e09deecdc47f4c9e92c50be225446acc',
          stackStatus: 'CREATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'clickstream-etl-e09deecdc47f4c9e92c50be225446acc',
          stackStatus: 'CREATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'clickstream-data-analytics-e09deecdc47f4c9e92c50be225446acc',
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
      Items: [DDB_PIPELINE],
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
          stackName: 'clickstream-kafka-connector-e09deecdc47f4c9e92c50be225446acc',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'clickstream-ingestion-kafka-e09deecdc47f4c9e92c50be225446acc',
          stackStatus: 'CREATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'clickstream-etl-e09deecdc47f4c9e92c50be225446acc',
          stackStatus: 'CREATE_COMPLETE',
          stackStatusReason: '',
          url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
        },
        {
          stackName: 'clickstream-data-analytics-e09deecdc47f4c9e92c50be225446acc',
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
              stackDetails: [
                {
                  stackName: 'clickstream-ingestion1',
                  stackStatus: 'CREATE_COMPLETE',
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
              executionDetail: {
                name: 'exec1',
                status: 'SUCCEEDED',
                output: 'SUCCEEDED',
              },
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