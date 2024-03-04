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
import { MOCK_EXECUTION_ID, MOCK_EXECUTION_ID_OLD, MOCK_PIPELINE_ID, MOCK_PLUGIN_ID, MOCK_PROJECT_ID, MOCK_SOLUTION_VERSION } from './ddb-mock';
import { BASE_METRICS_EMAILS_PARAMETERS, BASE_METRICS_PARAMETERS } from './workflow-mock';
import { BuiltInTagKeys, PipelineStackType, PipelineStatusType } from '../../common/model-ln';
import {
  KinesisStreamMode,
  PipelineServerProtocol,
  PipelineSinkType,
  WorkflowStateType,
} from '../../common/types';
import { getStackPrefix } from '../../common/utils';
import { IPipeline } from '../../model/pipeline';

export const BASE_PIPELINE_ATTRIBUTES = {
  id: MOCK_PROJECT_ID,
  projectId: MOCK_PROJECT_ID,
  prefix: 'PIPELINE',
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
  statusType: PipelineStatusType.ACTIVE,
  stackDetails: [],
  executionDetail: {
    name: MOCK_EXECUTION_ID,
    executionArn: 'arn:aws:states:us-east-1:111122223333:execution:MyPipelineStateMachine:main-5ab07c6e-b6ac-47ea-bf3a-02ede7391807',
    status: ExecutionStatus.SUCCEEDED,
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
  executionArn: 'arn:aws:states:us-east-1:111122223333:execution:MyPipelineStateMachine:main-5ab07c6e-b6ac-47ea-bf3a-02ede7391807',
  tags: [
    { key: 'customerKey1', value: 'tagValue1' },
    { key: 'customerKey2', value: 'tagValue2' },
    { key: BuiltInTagKeys.AWS_SOLUTION_VERSION, value: MOCK_SOLUTION_VERSION },
  ],
  templateVersion: MOCK_SOLUTION_VERSION,
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
      certificateArn: 'arn:aws:acm:ap-southeast-1:111122223333:certificate/398ce638-e522-40e8-b344-fad5a616e11b',
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
    size: {
      serverMax: 2,
      warmPoolSize: 0,
      serverMin: 1,
      scaleOnCpuUtilizationPercent: 50,
    },
    sinkType: PipelineSinkType.S3,
    sinkS3: {
      sinkBucket: {
        name: 'EXAMPLE_BUCKET',
        prefix: '',
      },
      s3BufferSize: 1000000,
      s3BufferInterval: 60,
    },
    loadBalancer: {
      ...BASE_PIPELINE_ATTRIBUTES.ingestionServer.loadBalancer,
      authenticationSecretArn: 'arn:aws:secretsmanager:ap-southeast-1:111122223333:secret:test-bxjEaf',
    },
  },
  operator: 'u3@example.com',
};

export const S3_INGESTION_HTTP_AUTHENTICATION_PIPELINE: IPipeline = {
  ...BASE_PIPELINE_ATTRIBUTES,
  ingestionServer: {
    ...BASE_PIPELINE_ATTRIBUTES.ingestionServer,
    size: {
      serverMax: 2,
      warmPoolSize: 0,
      serverMin: 1,
      scaleOnCpuUtilizationPercent: 50,
    },
    sinkType: PipelineSinkType.S3,
    sinkS3: {
      sinkBucket: {
        name: 'EXAMPLE_BUCKET',
        prefix: '',
      },
      s3BufferSize: 1000000,
      s3BufferInterval: 60,
    },
    loadBalancer: {
      ...BASE_PIPELINE_ATTRIBUTES.ingestionServer.loadBalancer,
      protocol: PipelineServerProtocol.HTTP,
      authenticationSecretArn: 'arn:aws:secretsmanager:ap-southeast-1:111122223333:secret:test-bxjEaf',
    },
  },
  operator: 'u3@example.com',
};

export const KAFKA_INGESTION_PIPELINE: IPipeline = {
  ...BASE_PIPELINE_ATTRIBUTES,
  ingestionServer: {
    ...BASE_PIPELINE_ATTRIBUTES.ingestionServer,
    sinkType: PipelineSinkType.KAFKA,
    sinkBatch: {
      size: 10000,
      intervalSeconds: 120,
    },
    sinkKafka: {
      brokers: ['test1.com:9092', 'test2.com:9092', 'test3.com:9092'],
      topic: 't1',
      securityGroupId: 'sg-0000000000002',
      kafkaConnector: {
        enable: false,
      },
    },
  },
  operator: 'unknown',
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
      topic: '',
      securityGroupId: 'sg-0000000000002',
      mskCluster: {
        name: 'mskClusterName',
        arn: 'mskClusterArn',
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

export const S3_DATA_PROCESSING_PIPELINE: IPipeline = {
  ...S3_INGESTION_PIPELINE,
  dataProcessing: {
    dataFreshnessInHour: 7,
    scheduleExpression: 'rate(6 minutes)',
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
    transformPlugin: `${MOCK_PLUGIN_ID}_1`,
    enrichPlugin: ['BUILT-IN-2', 'BUILT-IN-3', `${MOCK_PLUGIN_ID}_2`],
  },
};

export const S3_DATA_PROCESSING_WITH_ERROR_PREFIX_PIPELINE: IPipeline = {
  ...S3_INGESTION_PIPELINE,
  ingestionServer: {
    ...BASE_PIPELINE_ATTRIBUTES.ingestionServer,
    size: {
      serverMax: 2,
      warmPoolSize: 0,
      serverMin: 1,
      scaleOnCpuUtilizationPercent: 50,
    },
    sinkType: PipelineSinkType.S3,
    sinkS3: {
      sinkBucket: {
        name: 'EXAMPLE_BUCKET',
        prefix: 'EXAMPLE_PREFIX_ERROR',
      },
      s3BufferSize: 1000000,
      s3BufferInterval: 60,
    },
    loadBalancer: {
      ...BASE_PIPELINE_ATTRIBUTES.ingestionServer.loadBalancer,
      authenticationSecretArn: 'arn:aws:secretsmanager:ap-southeast-1:111122223333:secret:test-bxjEaf',
    },
  },
  dataProcessing: {
    dataFreshnessInHour: 7,
    scheduleExpression: 'rate(6 minutes)',
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
    transformPlugin: `${MOCK_PLUGIN_ID}_1`,
    enrichPlugin: ['BUILT-IN-2', 'BUILT-IN-3', `${MOCK_PLUGIN_ID}_2`],
  },
};

export const S3_DATA_PROCESSING_WITH_SPECIFY_PREFIX_PIPELINE: IPipeline = {
  ...S3_INGESTION_PIPELINE,
  bucket: {
    name: 'EXAMPLE_BUCKET_NEW',
    prefix: '',
  },
  ingestionServer: {
    ...BASE_PIPELINE_ATTRIBUTES.ingestionServer,
    size: {
      serverMax: 2,
      warmPoolSize: 0,
      serverMin: 1,
      scaleOnCpuUtilizationPercent: 50,
    },
    sinkType: PipelineSinkType.S3,
    sinkS3: {
      sinkBucket: {
        name: 'EXAMPLE_BUCKET_NEW',
        prefix: '',
      },
      s3BufferSize: 1000000,
      s3BufferInterval: 60,
    },
    loadBalancer: {
      ...BASE_PIPELINE_ATTRIBUTES.ingestionServer.loadBalancer,
      authenticationSecretArn: 'arn:aws:secretsmanager:ap-southeast-1:111122223333:secret:test-bxjEaf',
    },
  },
  dataProcessing: {
    dataFreshnessInHour: 7,
    scheduleExpression: 'rate(6 minutes)',
    sourceS3Bucket: {
      name: 'EXAMPLE_BUCKET_NEW',
      prefix: '',
    },
    sinkS3Bucket: {
      name: 'EXAMPLE_BUCKET_NEW',
      prefix: '',
    },
    pipelineBucket: {
      name: 'EXAMPLE_BUCKET_NEW',
      prefix: '',
    },
    transformPlugin: `${MOCK_PLUGIN_ID}_1`,
    enrichPlugin: ['BUILT-IN-2', 'BUILT-IN-3', `${MOCK_PLUGIN_ID}_2`],
  },
  dataModeling: {
    athena: false,
    redshift: {
      dataRange: 'rate(6 months)',
      newServerless: {
        network: {
          vpcId: 'vpc-00000000000000001',
          subnetIds: [
            'subnet-00000000000000010',
            'subnet-00000000000000011',
            'subnet-00000000000000012',
            'subnet-00000000000000013',
          ],
          securityGroups: [
            'sg-00000000000000030',
            'sg-00000000000000031',
          ],
        },
        baseCapacity: 8,
      },
    },
  },
};

export const MSK_DATA_PROCESSING_ATHENA_PIPELINE: IPipeline = {
  ...MSK_WITH_CONNECTOR_INGESTION_PIPELINE,
  dataProcessing: {
    dataFreshnessInHour: 7,
    scheduleExpression: 'rate(6 minutes)',
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
    enrichPlugin: ['BUILT-IN-2', 'BUILT-IN-3', `${MOCK_PLUGIN_ID}_2`],
  },
  dataModeling: {
    athena: true,
  },
};

export const MSK_DATA_PROCESSING_NEW_SERVERLESS_PIPELINE: IPipeline = {
  ...MSK_WITH_CONNECTOR_INGESTION_PIPELINE,
  dataProcessing: {
    dataFreshnessInHour: 7,
    scheduleExpression: 'rate(6 minutes)',
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
    enrichPlugin: ['BUILT-IN-2', 'BUILT-IN-3', `${MOCK_PLUGIN_ID}_2`],
  },
  dataModeling: {
    ods: {
      bucket: {
        name: 'EXAMPLE_BUCKET',
        prefix: '',
      },
      fileSuffix: '.snappy.parquet',
    },
    athena: true,
    redshift: {
      dataRange: 'rate(6 months)',
      newServerless: {
        network: {
          vpcId: 'vpc-00000000000000001',
          subnetIds: [
            'subnet-00000000000000010',
            'subnet-00000000000000011',
            'subnet-00000000000000012',
            'subnet-00000000000000013',
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
      maxFilesLimit: 50,
    },
  },
};

export const MSK_DATA_PROCESSING_NEW_SERVERLESS_PIPELINE_WITH_WORKFLOW: IPipeline = {
  ...MSK_WITH_CONNECTOR_INGESTION_PIPELINE,
  dataProcessing: {
    dataFreshnessInHour: 7,
    scheduleExpression: 'rate(6 minutes)',
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
    enrichPlugin: ['BUILT-IN-2', 'BUILT-IN-3', `${MOCK_PLUGIN_ID}_2`],
  },
  dataModeling: {
    ods: {
      bucket: {
        name: 'EXAMPLE_BUCKET',
        prefix: '',
      },
      fileSuffix: '.snappy.parquet',
    },
    athena: true,
    redshift: {
      dataRange: 'rate(6 months)',
      newServerless: {
        network: {
          vpcId: 'vpc-00000000000000001',
          subnetIds: [
            'subnet-00000000000000010',
            'subnet-00000000000000011',
            'subnet-00000000000000012',
            'subnet-00000000000000013',
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
      maxFilesLimit: 50,
    },
  },
  reporting: {
    quickSight: {
      accountName: 'clickstream-acc-xxx',
    },
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
                  Parameters: [],
                  StackName: `${getStackPrefix()}-KafkaConnector-${MOCK_PIPELINE_ID}`,
                },
                Callback: {
                  BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID_OLD}`,
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
                      ParameterKey: 'Protocol',
                      ParameterValue: 'HTTPS',
                    },
                  ],
                  StackName: `${getStackPrefix()}-Ingestion-kafka-${MOCK_PIPELINE_ID}`,
                },
                Callback: {
                  BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID_OLD}`,
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
            DataProcessing: {
              Type: WorkflowStateType.STACK,
              Data: {
                Input: {
                  Region: 'ap-southeast-1',
                  TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-pipeline-stack.template.json',
                  Action: 'Create',
                  Parameters: [],
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
                  Parameters: [],
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
                      ParameterKey: 'DataProcessingCronOrRateExpression',
                      ParameterValue: 'rate(16 minutes)',
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
                  Parameters: BASE_METRICS_PARAMETERS,
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
};

export const KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE: IPipeline = {
  ...KINESIS_ON_DEMAND_INGESTION_PIPELINE,
  dataProcessing: {
    dataFreshnessInHour: 7,
    scheduleExpression: 'rate(6 minutes)',
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
    transformPlugin: 'BUILT-IN-1',
    enrichPlugin: ['BUILT-IN-2', 'BUILT-IN-3', `${MOCK_PLUGIN_ID}_2`],
  },
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
            'subnet-00000000000000012',
            'subnet-00000000000000013',
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
      maxFilesLimit: 50,
    },
  },
};

export const KINESIS_DATA_PROCESSING_NEW_REDSHIFT_WITH_ERROR_RPU_PIPELINE: IPipeline = {
  ...KINESIS_ON_DEMAND_INGESTION_PIPELINE,
  dataProcessing: {
    dataFreshnessInHour: 7,
    scheduleExpression: 'rate(6 minutes)',
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
    transformPlugin: 'BUILT-IN-1',
    enrichPlugin: ['BUILT-IN-2', 'BUILT-IN-3', `${MOCK_PLUGIN_ID}_2`],
  },
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
            'subnet-00000000000000012',
            'subnet-00000000000000013',
          ],
          securityGroups: [
            'sg-00000000000000030',
            'sg-00000000000000031',
          ],
        },
        baseCapacity: 18,
      },
    },
    loadWorkflow: {
      bucket: {
        name: 'EXAMPLE_BUCKET',
        prefix: '',
      },
      maxFilesLimit: 50,
    },
  },
};

export const KINESIS_DATA_PROCESSING_PROVISIONED_REDSHIFT_PIPELINE: IPipeline = {
  ...KINESIS_ON_DEMAND_INGESTION_PIPELINE,
  dataProcessing: {
    dataFreshnessInHour: 7,
    scheduleExpression: 'rate(6 minutes)',
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
    transformPlugin: 'BUILT-IN-1',
    enrichPlugin: ['BUILT-IN-2', 'BUILT-IN-3', `${MOCK_PLUGIN_ID}_2`],
  },
  dataModeling: {
    ods: {
      bucket: {
        name: 'EXAMPLE_BUCKET',
        prefix: '',
      },
      fileSuffix: '.snappy.parquet',
    },
    athena: true,
    redshift: {
      dataRange: 'rate(6 months)',
      provisioned: {
        clusterIdentifier: 'redshift-cluster-1',
        dbUser: 'clickstream',
      },
    },
    loadWorkflow: {
      bucket: {
        name: 'EXAMPLE_BUCKET',
        prefix: '',
      },
      maxFilesLimit: 50,
    },
  },
};

export const KINESIS_DATA_PROCESSING_PROVISIONED_REDSHIFT_THIRDPARTY_PIPELINE: IPipeline = {
  ...KINESIS_ON_DEMAND_INGESTION_PIPELINE,
  dataCollectionSDK: 'thirdparty',
  dataProcessing: {
    dataFreshnessInHour: 7,
    scheduleExpression: 'rate(6 minutes)',
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
    transformPlugin: 'BUILT-IN-4',
    enrichPlugin: ['BUILT-IN-2', 'BUILT-IN-3', `${MOCK_PLUGIN_ID}_2`],
  },
  dataModeling: {
    ods: {
      bucket: {
        name: 'EXAMPLE_BUCKET',
        prefix: '',
      },
      fileSuffix: '.snappy.parquet',
    },
    athena: true,
    redshift: {
      dataRange: 'rate(6 months)',
      provisioned: {
        clusterIdentifier: 'redshift-cluster-1',
        dbUser: 'clickstream',
      },
    },
    loadWorkflow: {
      bucket: {
        name: 'EXAMPLE_BUCKET',
        prefix: '',
      },
      maxFilesLimit: 50,
    },
  },
};

export const KINESIS_DATA_PROCESSING_PROVISIONED_REDSHIFT_QUICKSIGHT_PIPELINE: IPipeline = {
  ...KINESIS_DATA_PROCESSING_PROVISIONED_REDSHIFT_PIPELINE,
  reporting: {
    quickSight: {
      accountName: 'clickstream-acc-xxx',
    },
  },
};

export const KINESIS_DATA_PROCESSING_PROVISIONED_REDSHIFT_EMPTY_DBUSER_QUICKSIGHT_PIPELINE: IPipeline = {
  ...KINESIS_DATA_PROCESSING_PROVISIONED_REDSHIFT_PIPELINE,
  dataModeling: {
    ...KINESIS_DATA_PROCESSING_PROVISIONED_REDSHIFT_PIPELINE.dataModeling,
    athena: true,
    redshift: {
      dataRange: 'rate(6 months)',
      provisioned: {
        clusterIdentifier: 'redshift-cluster-1',
        dbUser: '',
      },
    },
  },
};

export const KINESIS_DATA_PROCESSING_PROVISIONED_REDSHIFT_ERROR_DBUSER_QUICKSIGHT_PIPELINE: IPipeline = {
  ...KINESIS_DATA_PROCESSING_PROVISIONED_REDSHIFT_PIPELINE,
  dataModeling: {
    ...KINESIS_DATA_PROCESSING_PROVISIONED_REDSHIFT_PIPELINE.dataModeling,
    athena: true,
    redshift: {
      dataRange: 'rate(6 months)',
      provisioned: {
        clusterIdentifier: 'redshift-cluster-1',
        dbUser: 'HGF%$#@BHHGF',
      },
    },
  },
};

export const KINESIS_DATA_PROCESSING_NEW_REDSHIFT_QUICKSIGHT_PIPELINE: IPipeline = {
  ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE,
  reporting: {
    quickSight: {
      accountName: 'clickstream-acc-xxx',
    },
  },
};

export const BASE_STATUS = {
  status: PipelineStatusType.ACTIVE,
  stackDetails: [
    {
      stackId: `arn:aws:cloudformation:ap-southeast-1:111122223333:stack/Clickstream-KafkaConnector-${MOCK_PIPELINE_ID}/00000000-0000-0000-0000-000000000000`,
      stackName: `${getStackPrefix()}-KafkaConnector-${MOCK_PIPELINE_ID}`,
      stackType: PipelineStackType.KAFKA_CONNECTOR,
      stackStatus: StackStatus.CREATE_COMPLETE,
      stackStatusReason: '',
      stackTemplateVersion: MOCK_SOLUTION_VERSION,
      outputs: [],
    },
    {
      stackId: `arn:aws:cloudformation:ap-southeast-1:111122223333:stack/Clickstream-Ingestion-kafka-${MOCK_PIPELINE_ID}/00000000-0000-0000-0000-000000000000`,
      stackName: `${getStackPrefix()}-Ingestion-kafka-${MOCK_PIPELINE_ID}`,
      stackType: PipelineStackType.INGESTION,
      stackStatus: StackStatus.CREATE_COMPLETE,
      stackStatusReason: '',
      stackTemplateVersion: MOCK_SOLUTION_VERSION,
      outputs: [],
    },
    {
      stackId: `arn:aws:cloudformation:ap-southeast-1:111122223333:stack/Clickstream-DataProcessing-${MOCK_PIPELINE_ID}/00000000-0000-0000-0000-000000000000`,
      stackName: `${getStackPrefix()}-DataProcessing-${MOCK_PIPELINE_ID}`,
      stackType: PipelineStackType.DATA_PROCESSING,
      stackStatus: StackStatus.CREATE_COMPLETE,
      stackStatusReason: '',
      stackTemplateVersion: MOCK_SOLUTION_VERSION,
      outputs: [],
    },
    {
      stackId: `arn:aws:cloudformation:ap-southeast-1:111122223333:stack/Clickstream-DataModelingRedshift-${MOCK_PIPELINE_ID}/00000000-0000-0000-0000-000000000000`,
      stackName: `${getStackPrefix()}-DataModelingRedshift-${MOCK_PIPELINE_ID}`,
      stackType: PipelineStackType.DATA_MODELING_REDSHIFT,
      stackStatus: StackStatus.CREATE_COMPLETE,
      stackStatusReason: '',
      stackTemplateVersion: MOCK_SOLUTION_VERSION,
      outputs: [],
    },
    {
      stackId: `arn:aws:cloudformation:ap-southeast-1:111122223333:stack/Clickstream-Reporting-${MOCK_PIPELINE_ID}/00000000-0000-0000-0000-000000000000`,
      stackName: `${getStackPrefix()}-Reporting-${MOCK_PIPELINE_ID}`,
      stackType: PipelineStackType.REPORTING,
      stackStatus: StackStatus.CREATE_COMPLETE,
      stackStatusReason: '',
      stackTemplateVersion: MOCK_SOLUTION_VERSION,
      outputs: [
        {
          OutputKey: 'DataSourceArn',
          OutputValue: 'arn:aws:quicksight:ap-northeast-1:555555555555:datasource/clickstream_datasource_adfsd_uqqk_d84e29f0',
        },
        {
          OutputKey: 'Dashboards',
          OutputValue: '[{"appId":"app1","dashboardId":"clickstream_dashboard_v1_notepad_mtzfsocy_app1"},{"appId":"app2","dashboardId":"clickstream_dashboard_v1_notepad_mtzfsocy_app2"}]',
        },
      ],
    },
    {
      stackId: `arn:aws:cloudformation:ap-southeast-1:111122223333:stack/Clickstream-Metrics-${MOCK_PIPELINE_ID}/00000000-0000-0000-0000-000000000000`,
      stackName: `${getStackPrefix()}-Metrics-${MOCK_PIPELINE_ID}`,
      stackType: PipelineStackType.METRICS,
      stackStatus: StackStatus.CREATE_COMPLETE,
      stackStatusReason: '',
      stackTemplateVersion: MOCK_SOLUTION_VERSION,
      outputs: [],
    },
  ],
  executionDetail: {
    name: MOCK_EXECUTION_ID,
    status: ExecutionStatus.SUCCEEDED,
  },
};

export const stackDetailsWithOutputs = [
  BASE_STATUS.stackDetails[0],
  {
    ...BASE_STATUS.stackDetails[1],
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
  BASE_STATUS.stackDetails[2],
  BASE_STATUS.stackDetails[3],
  BASE_STATUS.stackDetails[4],
  {
    ...BASE_STATUS.stackDetails[5],
    Tags: [{ Key: BuiltInTagKeys.AWS_SOLUTION_VERSION, Value: MOCK_SOLUTION_VERSION }],
    outputs: [
      {
        OutputKey: 'ObservabilityDashboardName',
        OutputValue: 'clickstream_dashboard_notepad_mtzfsocy',
      },
    ],
  },
];

export const KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW: IPipeline = {
  ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE,
  status: {
    ...BASE_STATUS,
  },
  stackDetails: stackDetailsWithOutputs,
  executionDetail: {
    name: MOCK_EXECUTION_ID,
    executionArn: 'arn:aws:states:us-east-1:111122223333:execution:MyPipelineStateMachine:main-5ab07c6e-b6ac-47ea-bf3a-02ede7391807',
    status: ExecutionStatus.SUCCEEDED,
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
                  Parameters: [],
                  StackName: `${getStackPrefix()}-KafkaConnector-${MOCK_PIPELINE_ID}`,
                },
                Callback: {
                  BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID_OLD}`,
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
                      ParameterKey: 'Protocol',
                      ParameterValue: 'HTTPS',
                    },
                  ],
                  StackName: `${getStackPrefix()}-Ingestion-kafka-${MOCK_PIPELINE_ID}`,
                },
                Callback: {
                  BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID_OLD}`,
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
            DataProcessing: {
              Type: WorkflowStateType.STACK,
              Data: {
                Input: {
                  Region: 'ap-southeast-1',
                  TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-pipeline-stack.template.json',
                  Action: 'Create',
                  Parameters: [],
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
                  Parameters: [],
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
                      ParameterKey: 'DataProcessingCronOrRateExpression',
                      ParameterValue: 'rate(16 minutes)',
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
                  Parameters: BASE_METRICS_PARAMETERS,
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
};

export const KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW_AND_EXPRESSION_UPDATE: IPipeline = {
  ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE,
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
                  Parameters: [],
                  StackName: `${getStackPrefix()}-KafkaConnector-${MOCK_PIPELINE_ID}`,
                },
                Callback: {
                  BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID_OLD}`,
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
                  Parameters: [],
                  StackName: `${getStackPrefix()}-Ingestion-kafka-${MOCK_PIPELINE_ID}`,
                },
                Callback: {
                  BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID_OLD}`,
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
            DataProcessing: {
              Type: WorkflowStateType.STACK,
              Data: {
                Input: {
                  Region: 'ap-southeast-1',
                  TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-pipeline-stack.template.json',
                  Action: 'Create',
                  Parameters: [],
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
                  Parameters: [],
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
                      ParameterKey: 'DataProcessingCronOrRateExpression',
                      ParameterValue: 'rate(6 minutes)',
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
          States: {
          },
          StartAt: 'DataModeling',
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
                  Parameters: BASE_METRICS_PARAMETERS,
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
};

export const KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW_FOR_UPGRADE: IPipeline = {
  ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE,
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
                  TemplateURL: `https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/${MOCK_SOLUTION_VERSION}/default/kafka-s3-sink-stack.template.json`,
                  Action: 'Create',
                  Parameters: [],
                  StackName: `${getStackPrefix()}-KafkaConnector-${MOCK_PIPELINE_ID}`,
                },
                Callback: {
                  BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID_OLD}`,
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
                  TemplateURL: `https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/${MOCK_SOLUTION_VERSION}/default/ingestion-server-kafka-stack.template.json`,
                  Action: 'Create',
                  Parameters: [],
                  StackName: `${getStackPrefix()}-Ingestion-kafka-${MOCK_PIPELINE_ID}`,
                },
                Callback: {
                  BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID_OLD}`,
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
            DataProcessing: {
              Type: WorkflowStateType.STACK,
              Data: {
                Input: {
                  Region: 'ap-southeast-1',
                  TemplateURL: `https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/${MOCK_SOLUTION_VERSION}/default/data-pipeline-stack.template.json`,
                  Action: 'Create',
                  Parameters: [],
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
                  TemplateURL: `https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/${MOCK_SOLUTION_VERSION}/default/data-reporting-quicksight-stack.template.json`,
                  Action: 'Create',
                  Parameters: [],
                  StackName: `${getStackPrefix()}-Reporting-${MOCK_PIPELINE_ID}`,
                },
                Callback: {
                  BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID}`,
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
                  TemplateURL: `https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/${MOCK_SOLUTION_VERSION}/default/data-analytics-redshift-stack.template.json`,
                  Action: 'Create',
                  Parameters: [],
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
                  Parameters: BASE_METRICS_PARAMETERS,
                  StackName: `${getStackPrefix()}-Metrics-6666-6666`,
                  TemplateURL: `https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/${MOCK_SOLUTION_VERSION}/default/metrics-stack.template.json`,
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
};

export const KINESIS_DATA_PROCESSING_NEW_REDSHIFT_UPDATE_PIPELINE_WITH_WORKFLOW: IPipeline = {
  ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW,
  operator: 'u4@example.com',
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
                  Parameters: [],
                  StackName: `${getStackPrefix()}-KafkaConnector-${MOCK_PIPELINE_ID}`,
                },
                Callback: {
                  BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID}`,
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
                  Parameters: [],
                  StackName: `${getStackPrefix()}-Ingestion-kafka-${MOCK_PIPELINE_ID}`,
                },
                Callback: {
                  BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID}`,
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
            DataProcessing: {
              Type: WorkflowStateType.STACK,
              Data: {
                Input: {
                  Region: 'ap-southeast-1',
                  TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-pipeline-stack.template.json',
                  Action: 'Create',
                  Parameters: [
                    {
                      ParameterKey: 'TransformerAndEnrichClassNames',
                      ParameterValue: 'software.aws.solution.clickstream.Transformer,software.aws.solution.clickstream.UAEnrichment,software.aws.solution.clickstream.IPEnrichment',
                    },
                  ],
                  StackName: `${getStackPrefix()}-DataProcessing-${MOCK_PIPELINE_ID}`,
                },
                Callback: {
                  BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID}`,
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
                      ParameterKey: 'QuickSightUserParam',
                      ParameterValue: 'Admin/fakeUser',
                    },
                    {
                      ParameterKey: 'QuickSightPrincipalParam',
                      ParameterValue: 'arn:aws:quicksight:us-west-2:555555555555:user/default/Admin/fakeUser',
                    },
                  ],
                  StackName: `${getStackPrefix()}-Reporting-${MOCK_PIPELINE_ID}`,
                },
                Callback: {
                  BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID}`,
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
                  Parameters: [],
                  StackName: `${getStackPrefix()}-DataModelingRedshift-${MOCK_PIPELINE_ID}`,
                },
                Callback: {
                  BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID}`,
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
                  BucketPrefix: 'clickstream/workflow/main-3333-3333',
                },
                Input: {
                  Action: 'Create',
                  Region: 'ap-southeast-1',
                  Parameters: BASE_METRICS_EMAILS_PARAMETERS,
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
};

const BASE_RETRY_PIPELINE: IPipeline = {
  ...BASE_PIPELINE_ATTRIBUTES,
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
  dataProcessing: {
    dataFreshnessInHour: 7,
    scheduleExpression: 'rate(6 minutes)',
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
    transformPlugin: 'BUILT-IN-1',
    enrichPlugin: ['BUILT-IN-2', 'BUILT-IN-3', `${MOCK_PLUGIN_ID}_2`],
  },
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
            'subnet-00000000000000012',
            'subnet-00000000000000013',
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
      maxFilesLimit: 50,
    },
  },
  reporting: {
    quickSight: {
      accountName: 'clickstream-acc-xxx',
    },
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
                  Parameters: [],
                  StackName: `${getStackPrefix()}-KafkaConnector-${MOCK_PIPELINE_ID}`,
                },
                Callback: {
                  BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID_OLD}`,
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
                  Parameters: [],
                  StackName: `${getStackPrefix()}-Ingestion-kafka-${MOCK_PIPELINE_ID}`,
                },
                Callback: {
                  BucketPrefix: `clickstream/workflow/${MOCK_EXECUTION_ID_OLD}`,
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
            DataProcessing: {
              Type: WorkflowStateType.STACK,
              Data: {
                Input: {
                  Region: 'ap-southeast-1',
                  TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-pipeline-stack.template.json',
                  Action: 'Create',
                  Parameters: [],
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
                  Parameters: [],
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
                      ParameterKey: 'DataProcessingCronOrRateExpression',
                      ParameterValue: 'rate(16 minutes)',
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
                  Parameters: BASE_METRICS_PARAMETERS,
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
};

export const RETRY_PIPELINE_WITH_WORKFLOW: IPipeline = {
  ...BASE_RETRY_PIPELINE,
  stackDetails: [
    {
      ...BASE_STATUS.stackDetails[0],
      stackStatus: StackStatus.CREATE_FAILED,
    },
    BASE_STATUS.stackDetails[1],
    BASE_STATUS.stackDetails[2],
    {
      ...BASE_STATUS.stackDetails[3],
      stackStatus: StackStatus.CREATE_FAILED,
    },
    {
      ...BASE_STATUS.stackDetails[4],
      stackStatus: undefined,
    },
    BASE_STATUS.stackDetails[5],
  ],
  executionDetail: {
    name: MOCK_EXECUTION_ID,
    status: ExecutionStatus.FAILED,
    executionArn: 'arn:aws:states:us-east-1:111122223333:execution:MyPipelineStateMachine:main-5ab07c6e-b6ac-47ea-bf3a-02ede7391807',
  },
};

export const RETRY_PIPELINE_WITH_WORKFLOW_WHEN_UPDATE_FAILED: IPipeline = {
  ...BASE_RETRY_PIPELINE,
  lastAction: 'Update',
  stackDetails: [
    BASE_STATUS.stackDetails[0],
    {
      ...BASE_STATUS.stackDetails[1],
      stackStatus: StackStatus.UPDATE_FAILED,
    },
    BASE_STATUS.stackDetails[2],
    BASE_STATUS.stackDetails[3],
    BASE_STATUS.stackDetails[4],
    BASE_STATUS.stackDetails[5],
  ],
  executionDetail: {
    name: MOCK_EXECUTION_ID,
    status: ExecutionStatus.FAILED,
    executionArn: 'arn:aws:states:us-east-1:111122223333:execution:MyPipelineStateMachine:main-5ab07c6e-b6ac-47ea-bf3a-02ede7391807',
  },
};

export const RETRY_PIPELINE_WITH_WORKFLOW_AND_ROLLBACK_COMPLETE: IPipeline = {
  ...BASE_RETRY_PIPELINE,
  lastAction: 'Upgrade',
  stackDetails: [
    BASE_STATUS.stackDetails[0],
    BASE_STATUS.stackDetails[1],
    BASE_STATUS.stackDetails[2],
    {
      ...BASE_STATUS.stackDetails[3],
      stackStatus: StackStatus.UPDATE_ROLLBACK_COMPLETE,
    },
    BASE_STATUS.stackDetails[4],
    BASE_STATUS.stackDetails[5],
  ],
  executionDetail: {
    name: MOCK_EXECUTION_ID,
    status: ExecutionStatus.FAILED,
    executionArn: 'arn:aws:states:us-east-1:111122223333:execution:MyPipelineStateMachine:main-5ab07c6e-b6ac-47ea-bf3a-02ede7391807',
  },
};

