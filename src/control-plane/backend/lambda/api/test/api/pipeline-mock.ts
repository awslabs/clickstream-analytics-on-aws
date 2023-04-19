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
import { ExecutionStatus } from '@aws-sdk/client-sfn';
import { MOCK_EXECUTION_ID, MOCK_PIPELINE_ID, MOCK_PROJECT_ID } from './ddb-mock';
import {
  KinesisStreamMode,
  PipelineServerProtocol,
  PipelineSinkType,
  PipelineStackType,
  PipelineStatusType,
  WorkflowStateType,
} from '../../common/types';
import { IPipeline } from '../../model/pipeline';

const BASE_PIPELINE_ATTRIBUTES = {
  id: MOCK_PROJECT_ID,
  projectId: MOCK_PROJECT_ID,
  prefix: 'PIPELINE',
  name: 'Pipeline01',
  description: 'Pipeline01 Description',
  pipelineId: MOCK_PIPELINE_ID,
  region: 'ap-southeast-1',
  versionTag: 'latest',
  dataCollectionSDK: 'clickstream',
  status: {
    status: PipelineStatusType.ACTIVE,
    stackDetails: [],
    executionDetail: {
      name: MOCK_EXECUTION_ID,
      status: 'SUCCEEDED',
    },
  },
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
  tags: [],
  bucket: {
    name: 'EXAMPLE_BUCKET',
    prefix: 'example/',
  },
  ingestionServer: {
    size: {
      serverMax: 4,
      warmPoolSize: 1,
      serverMin: 2,
      scaleOnCpuUtilizationPercent: 50,
    },
    domain: {
      certificateArn: 'arn:aws:acm:ap-southeast-1:01234567890:certificate/398ce638-e522-40e8-b344-fad5a616e11b',
      domainName: 'fake.example.com',
    },
    loadBalancer: {
      protocol: PipelineServerProtocol.HTTPS,
      enableApplicationLoadBalancerAccessLog: true,
      logS3Bucket: {
        name: 'EXAMPLE_BUCKET',
        prefix: 'logs/',
      },
      notificationsTopicArn: 'arn:aws:sns:us-east-1:111122223333:test',
      enableGlobalAccelerator: true,
      serverCorsOrigin: '',
      serverEndpointPath: '/collect',
    },
  },
  workflow: {
    Version: '2022-03-15',
    Workflow: {
      Type: WorkflowStateType.PARALLEL,
      End: true,
      Branches: [],
    },
  },
  executionName: MOCK_EXECUTION_ID,
  type: `PIPELINE#${MOCK_PIPELINE_ID}#latest`,
  deleted: false,
  createAt: 1681353806173,
  updateAt: 1681353806173,
  version: '1681353806172',
  operator: '',
};

export const S3_INGESTION_PIPELINE: IPipeline = {
  ...BASE_PIPELINE_ATTRIBUTES,
  ingestionServer: {
    ...BASE_PIPELINE_ATTRIBUTES.ingestionServer,
    sinkType: PipelineSinkType.S3,
    sinkS3: {
      sinkBucket: {
        name: 'EXAMPLE_BUCKET',
        prefix: '',
      },
      s3BatchMaxBytes: 500,
      s3BatchTimeout: 60,
    },
  },
};

export const KAFKA_INGESTION_PIPELINE: IPipeline = {
  ...BASE_PIPELINE_ATTRIBUTES,
  ingestionServer: {
    ...BASE_PIPELINE_ATTRIBUTES.ingestionServer,
    sinkType: PipelineSinkType.KAFKA,
    sinkKafka: {
      brokers: ['test1.com:9092', 'test2.com:9092', 'test3.com:9092'],
      topic: 't1',
      mskCluster: {
        name: 'mskClusterName',
        arn: 'mskClusterArn',
        securityGroupId: 'sg-0000000000002',
      },
      kafkaConnector: {
        enable: false,
      },
    },
  },
};

export const KAFKA_WITH_CONNECTOR_INGESTION_PIPELINE: IPipeline = {
  ...KAFKA_INGESTION_PIPELINE,
  ingestionServer: {
    ...KAFKA_INGESTION_PIPELINE.ingestionServer,
    sinkKafka: {
      ...KAFKA_INGESTION_PIPELINE.ingestionServer.sinkKafka!,
      kafkaConnector: {
        enable: true,
      },
    },
  },
};

export const MSK_WITH_CONNECTOR_INGESTION_PIPELINE: IPipeline = {
  ...BASE_PIPELINE_ATTRIBUTES,
  ingestionServer: {
    ...BASE_PIPELINE_ATTRIBUTES.ingestionServer,
    sinkType: PipelineSinkType.KAFKA,
    sinkKafka: {
      brokers: [],
      topic: 't1',
      mskCluster: {
        name: 'mskClusterName',
        arn: 'mskClusterArn',
        securityGroupId: 'sg-0000000000002',
      },
      kafkaConnector: {
        enable: true,
      },
    },
  },
};

export const KINESIS_ON_DEMAND_INGESTION_PIPELINE: IPipeline = {
  ...BASE_PIPELINE_ATTRIBUTES,
  ingestionServer: {
    ...BASE_PIPELINE_ATTRIBUTES.ingestionServer,
    sinkType: PipelineSinkType.KINESIS,
    sinkKinesis: {
      kinesisStreamMode: KinesisStreamMode.ON_DEMAND,
      sinkBucket: {
        name: 'EXAMPLE_BUCKET',
        prefix: '',
      },
    },
  },
};

export const KINESIS_PROVISIONED_INGESTION_PIPELINE: IPipeline = {
  ...BASE_PIPELINE_ATTRIBUTES,
  ingestionServer: {
    ...BASE_PIPELINE_ATTRIBUTES.ingestionServer,
    sinkType: PipelineSinkType.KINESIS,
    sinkKinesis: {
      kinesisStreamMode: KinesisStreamMode.PROVISIONED,
      kinesisShardCount: 2,
      sinkBucket: {
        name: 'EXAMPLE_BUCKET',
        prefix: '',
      },
    },
  },
};

export const S3_ETL_PIPELINE: IPipeline = {
  ...S3_INGESTION_PIPELINE,
  etl: {
    dataFreshnessInHour: 7,
    scheduleExpression: 'hour',
    sourceS3Bucket: {
      name: 'EXAMPLE_BUCKET',
      prefix: '',
    },
    sinkS3Bucket: {
      name: 'EXAMPLE_BUCKET',
      prefix: '',
    },
    pipelineBucket: {
      name: 'EXAMPLE_BUCKET',
      prefix: '',
    },
    transformPlugin: undefined,
    enrichPlugin: ['a', 'b'],
  },
};

export const MSK_ETL_REDSHIFT_PIPELINE: IPipeline = {
  ...MSK_WITH_CONNECTOR_INGESTION_PIPELINE,
  etl: {
    dataFreshnessInHour: 7,
    scheduleExpression: 'hour',
    sourceS3Bucket: {
      name: 'EXAMPLE_BUCKET',
      prefix: '',
    },
    sinkS3Bucket: {
      name: 'EXAMPLE_BUCKET',
      prefix: '',
    },
    pipelineBucket: {
      name: 'EXAMPLE_BUCKET',
      prefix: '',
    },
    transformPlugin: undefined,
    enrichPlugin: ['a', 'b'],
  },
  dataAnalytics: {
    ods: {
      bucket: {
        name: 'EXAMPLE_BUCKET',
        prefix: '',
      },
      fileSuffix: '.snappy.parquet',
    },
    redshift: {
      serverless: {
        workgroupName: 'test',
        iamRoleArn: 'arn:aws:iam::555555555555:role/data-analytics-redshift',
      },
    },
    loadWorkflow: {
      bucket: {
        name: 'EXAMPLE_BUCKET',
        prefix: '',
      },
      scheduleInterval: 180,
      maxFilesLimit: 50,
      processingFilesLimit: 50,
    },
  },
};

export const KINESIS_ETL_REDSHIFT_PIPELINE: IPipeline = {
  ...KINESIS_ON_DEMAND_INGESTION_PIPELINE,
  etl: {
    dataFreshnessInHour: 7,
    scheduleExpression: 'hour',
    sourceS3Bucket: {
      name: 'EXAMPLE_BUCKET',
      prefix: '',
    },
    sinkS3Bucket: {
      name: 'EXAMPLE_BUCKET',
      prefix: '',
    },
    pipelineBucket: {
      name: 'EXAMPLE_BUCKET',
      prefix: '',
    },
    transformPlugin: undefined,
    enrichPlugin: ['a', 'b'],
  },
  dataAnalytics: {
    ods: {
      bucket: {
        name: 'EXAMPLE_BUCKET',
        prefix: '',
      },
      fileSuffix: '.snappy.parquet',
    },
    redshift: {
      serverless: {
        workgroupName: 'test',
        iamRoleArn: 'arn:aws:iam::555555555555:role/data-analytics-redshift',
      },
    },
    loadWorkflow: {
      bucket: {
        name: 'EXAMPLE_BUCKET',
        prefix: '',
      },
      scheduleInterval: 180,
      maxFilesLimit: 50,
      processingFilesLimit: 50,
    },
  },
};

const BASE_STATUS = {
  status: PipelineStatusType.ACTIVE,
  stackDetails: [
    {
      stackName: `Clickstream-KafkaConnector-${MOCK_PIPELINE_ID}`,
      stackType: PipelineStackType.KAFKA_CONNECTOR,
      stackStatus: StackStatus.CREATE_COMPLETE,
      stackStatusReason: '',
      url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
    },
    {
      stackName: `Clickstream-Ingestion-kafka-${MOCK_PIPELINE_ID}`,
      stackType: PipelineStackType.INGESTION,
      stackStatus: StackStatus.CREATE_COMPLETE,
      stackStatusReason: '',
      url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
    },
    {
      stackName: `Clickstream-ETL-${MOCK_PIPELINE_ID}`,
      stackType: PipelineStackType.ETL,
      stackStatus: StackStatus.CREATE_COMPLETE,
      stackStatusReason: '',
      url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
    },
    {
      stackName: `Clickstream-DataAnalytics-${MOCK_PIPELINE_ID}`,
      stackType: PipelineStackType.DATA_ANALYTICS,
      stackStatus: StackStatus.CREATE_COMPLETE,
      stackStatusReason: '',
      url: 'https://ap-southeast-1.console.aws.amazon.com/cloudformation/home?region=ap-southeast-1#/stacks/stackinfo?stackId=undefined',
    },
  ],
  executionDetail: {
    name: MOCK_EXECUTION_ID,
    status: ExecutionStatus.SUCCEEDED,
  },
};

export const KINESIS_ETL_REDSHIFT_PIPELINE_WITH_WORKFLOW: IPipeline = {
  ...KINESIS_ETL_REDSHIFT_PIPELINE,
  status: {
    ...BASE_STATUS,
  },
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
                  TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/kafka-s3-sink-stack.template.json',
                  Action: 'Create',
                  Parameters: [
                    {
                      ParameterValue: 'EXAMPLE_BUCKET',
                      ParameterKey: 'DataS3Bucket',
                    },
                    {
                      ParameterValue: `clickstream/${MOCK_PROJECT_ID}/${MOCK_PIPELINE_ID}/data/buffer/`,
                      ParameterKey: 'DataS3Prefix',
                    },
                    {
                      ParameterValue: 'EXAMPLE_BUCKET',
                      ParameterKey: 'LogS3Bucket',
                    },
                    {
                      ParameterValue: `clickstream/${MOCK_PROJECT_ID}/${MOCK_PIPELINE_ID}/logs/kafka-connector/`,
                      ParameterKey: 'LogS3Prefix',
                    },
                    {
                      ParameterValue: 'EXAMPLE_BUCKET',
                      ParameterKey: 'PluginS3Bucket',
                    },
                    {
                      ParameterValue: `clickstream/${MOCK_PROJECT_ID}/${MOCK_PIPELINE_ID}/runtime/ingestion/kafka-connector/plugins/`,
                      ParameterKey: 'PluginS3Prefix',
                    },
                    {
                      ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      ParameterKey: 'SubnetIds',
                    },
                    {
                      ParameterValue: 'test1.com:9092,test2.com:9092,test3.com:9092',
                      ParameterKey: 'KafkaBrokers',
                    },
                    {
                      ParameterValue: 't1',
                      ParameterKey: 'KafkaTopic',
                    },
                    {
                      ParameterValue: 'test',
                      ParameterKey: 'MskClusterName',
                    },
                    {
                      ParameterValue: 'sg-0000000000002',
                      ParameterKey: 'SecurityGroupId',
                    },
                  ],
                  StackName: `Clickstream-KafkaConnector-${MOCK_PIPELINE_ID}`,
                },
                Callback: {
                  BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID}/Clickstream-KafkaConnector-${MOCK_PIPELINE_ID}`,
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
                  TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/ingestion-server-kafka-stack.template.json',
                  Action: 'Create',
                  Parameters: [
                    {
                      ParameterValue: 'vpc-00000000000000001',
                      ParameterKey: 'VpcId',
                    },
                    {
                      ParameterValue: 'subnet-00000000000000021,subnet-00000000000000022,subnet-00000000000000023',
                      ParameterKey: 'PublicSubnetIds',
                    },
                    {
                      ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      ParameterKey: 'PrivateSubnetIds',
                    },
                    {
                      ParameterValue: 'fake.example.com',
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
                      ParameterValue: 'arn:aws:sns:us-east-1:111122223333:test',
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
                      ParameterValue: `clickstream/${MOCK_PROJECT_ID}/${MOCK_PIPELINE_ID}/logs/alb/`,
                      ParameterKey: 'LogS3Prefix',
                    },
                    {
                      ParameterValue: 'test',
                      ParameterKey: 'MskClusterName',
                    },
                    {
                      ParameterValue: 'sg-0000000000002',
                      ParameterKey: 'MskSecurityGroupId',
                    },
                    {
                      ParameterValue: 't1',
                      ParameterKey: 'KafkaTopic',
                    },
                    {
                      ParameterValue: 'test1.com:9092,test2.com:9092,test3.com:9092',
                      ParameterKey: 'KafkaBrokers',
                    },
                  ],
                  StackName: `Clickstream-Ingestion-kafka-${MOCK_PIPELINE_ID}`,
                },
                Callback: {
                  BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID}/Clickstream-Ingestion-kafka-${MOCK_PIPELINE_ID}`,
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
                  TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-pipeline-stack.template.json',
                  Action: 'Create',
                  Parameters: [
                    {
                      ParameterValue: 'vpc-00000000000000001',
                      ParameterKey: 'VpcId',
                    },
                    {
                      ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      ParameterKey: 'PrivateSubnetIds',
                    },
                    {
                      ParameterValue: `${MOCK_PROJECT_ID}`,
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
                      ParameterValue: `clickstream/${MOCK_PROJECT_ID}/${MOCK_PIPELINE_ID}/data/buffer/t1/`,
                      ParameterKey: 'SourceS3Prefix',
                    },
                    {
                      ParameterValue: 'EXAMPLE_BUCKET',
                      ParameterKey: 'SinkS3Bucket',
                    },
                    {
                      ParameterValue: `clickstream/${MOCK_PROJECT_ID}/${MOCK_PIPELINE_ID}/data/ods/`,
                      ParameterKey: 'SinkS3Prefix',
                    },
                    {
                      ParameterValue: 'EXAMPLE_BUCKET',
                      ParameterKey: 'PipelineS3Bucket',
                    },
                    {
                      ParameterValue: `clickstream/${MOCK_PROJECT_ID}/${MOCK_PIPELINE_ID}/data/pipeline-temp/`,
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
                  StackName: `Clickstream-ETL-${MOCK_PIPELINE_ID}`,
                },
                Callback: {
                  BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID}/Clickstream-ETL-${MOCK_PIPELINE_ID}`,
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
                  TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-analytics-redshift-stack.template.json',
                  Action: 'Create',
                  Parameters: [
                    {
                      ParameterValue: 'vpc-00000000000000001',
                      ParameterKey: 'VpcId',
                    },
                    {
                      ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      ParameterKey: 'PrivateSubnetIds',
                    },
                    {
                      ParameterValue: `${MOCK_PROJECT_ID}`,
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
                      ParameterValue: `clickstream/${MOCK_PROJECT_ID}/${MOCK_PIPELINE_ID}/data/ods/`,
                      ParameterKey: 'ODSEventPrefix',
                    },
                    {
                      ParameterValue: '.snappy.parquet',
                      ParameterKey: 'ODSEventFileSuffix',
                    },
                    {
                      ParameterValue: 'EXAMPLE_BUCKET',
                      ParameterKey: 'LoadWorkflowBucket',
                    },
                    {
                      ParameterValue: `clickstream/${MOCK_PROJECT_ID}/${MOCK_PIPELINE_ID}/data/ods/`,
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
                  StackName: `Clickstream-DataAnalytics-${MOCK_PIPELINE_ID}`,
                },
                Callback: {
                  BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID}/Clickstream-DataAnalytics-${MOCK_PIPELINE_ID}`,
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
};

export const RETRY_PIPELINE_WITH_WORKFLOW: IPipeline = {
  ...KINESIS_ETL_REDSHIFT_PIPELINE_WITH_WORKFLOW,
  status: {
    ...BASE_STATUS,
    status: PipelineStatusType.FAILED,
    stackDetails: [
      {
        ...BASE_STATUS.stackDetails[0],
        stackStatus: StackStatus.CREATE_FAILED,
      },
      BASE_STATUS.stackDetails[1],
      BASE_STATUS.stackDetails[2],
      BASE_STATUS.stackDetails[3],
    ],
    executionDetail: {
      name: MOCK_EXECUTION_ID,
      status: ExecutionStatus.FAILED,
    },
  },
};

