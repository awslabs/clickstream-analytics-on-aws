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
import { CloudWatchEventsClient } from '@aws-sdk/client-cloudwatch-events';
import { EC2Client } from '@aws-sdk/client-ec2';
import {
  IAMClient,
} from '@aws-sdk/client-iam';
import { KafkaClient } from '@aws-sdk/client-kafka';
import { KMSClient } from '@aws-sdk/client-kms';
import {
  QuickSightClient,
} from '@aws-sdk/client-quicksight';
import {
  RedshiftClient,
} from '@aws-sdk/client-redshift';
import {
  RedshiftServerlessClient,
} from '@aws-sdk/client-redshift-serverless';
import {
  BucketLocationConstraint,
  S3Client,
} from '@aws-sdk/client-s3';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import {
  SFNClient,
} from '@aws-sdk/client-sfn';
import { SNSClient } from '@aws-sdk/client-sns';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import cloneDeep from 'lodash/cloneDeep';
import 'aws-sdk-client-mock-jest';
import {
  MOCK_APP_ID,
  MOCK_SOLUTION_VERSION,
  createPipelineMock,
  createPipelineMockForBJSRegion,
  dictionaryMock,
} from './ddb-mock';
import {
  BASE_STATUS,
  KAFKA_INGESTION_PIPELINE,
  KAFKA_WITH_CONNECTOR_INGESTION_PIPELINE,
  KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE,
  KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW_FOR_UPGRADE,
  KINESIS_DATA_PROCESSING_NEW_REDSHIFT_QUICKSIGHT_PIPELINE,
  KINESIS_DATA_PROCESSING_PROVISIONED_REDSHIFT_PIPELINE,
  KINESIS_DATA_PROCESSING_PROVISIONED_REDSHIFT_QUICKSIGHT_PIPELINE,
  KINESIS_DATA_PROCESSING_PROVISIONED_REDSHIFT_THIRDPARTY_PIPELINE,
  KINESIS_ON_DEMAND_INGESTION_PIPELINE,
  KINESIS_PROVISIONED_INGESTION_PIPELINE,
  MSK_DATA_PROCESSING_ATHENA_PIPELINE,
  MSK_DATA_PROCESSING_NEW_SERVERLESS_PIPELINE,
  MSK_WITH_CONNECTOR_INGESTION_PIPELINE,
  RETRY_PIPELINE_WITH_WORKFLOW,
  RETRY_PIPELINE_WITH_WORKFLOW_AND_ROLLBACK_COMPLETE,
  RETRY_PIPELINE_WITH_WORKFLOW_FAILED,
  RETRY_PIPELINE_WITH_WORKFLOW_WHEN_UPDATE_EMPTY,
  RETRY_PIPELINE_WITH_WORKFLOW_WHEN_UPDATE_FAILED,
  S3_DATA_PROCESSING_PIPELINE,
  S3_DATA_PROCESSING_WITH_SPECIFY_PREFIX_PIPELINE,
  S3_INGESTION_PIPELINE,
} from './pipeline-mock';
import {
  APPREGISTRY_APPLICATION_ARN_PARAMETER,
  APPREGISTRY_APPLICATION_EMPTY_ARN_PARAMETER,
  BASE_ATHENA_PARAMETERS,
  BASE_KAFKACONNECTOR_BATCH_MSK_PARAMETERS,
  BASE_KAFKACONNECTOR_BATCH_PARAMETERS, BASE_METRICS_EMAILS_PARAMETERS, BASE_METRICS_PARAMETERS,
  BOUNDARY_ARN_PARAMETER,
  DATA_PROCESSING_NEW_SERVERLESS_WITH_SPECIFY_PREFIX_PARAMETERS,
  DATA_PROCESSING_PLUGIN1_PARAMETERS,
  DATA_PROCESSING_PLUGIN2_PARAMETERS,
  DATA_PROCESSING_PLUGIN3_PARAMETERS,
  DATA_PROCESSING_PLUGIN4_PARAMETERS,
  DATA_PROCESSING_THIRDPARTY_SDK_PLUGIN3_PARAMETERS,
  DATA_PROCESSING_WITH_SPECIFY_PREFIX_PLUGIN1_PARAMETERS,
  DataModelingAthenaStack,
  DataModelingRedshiftStack,
  DataProcessingStack,
  INGESTION_KAFKA_PARAMETERS,
  INGESTION_KINESIS_ON_DEMAND_PARAMETERS,
  INGESTION_KINESIS_PROVISIONED_PARAMETERS,
  INGESTION_MSK_PARAMETERS,
  INGESTION_MSK_WITHOUT_APP_PARAMETERS,
  INGESTION_S3_FARGATE_PARAMETERS,
  INGESTION_S3_PARAMETERS,
  INGESTION_S3_PRIVATE_PARAMETERS,
  INGESTION_S3_WITH_SPECIFY_PREFIX_PARAMETERS,
  INGESTION_THIRDPARTY_SDK_KINESIS_ON_DEMAND_PARAMETERS,
  IngestionStack,
  MSK_DATA_PROCESSING_NEW_SERVERLESS_DATAANALYTICS_PARAMETERS,
  MSK_DATA_PROCESSING_PROVISIONED_REDSHIFT_DATAANALYTICS_PARAMETERS,
  MetricsStack,
  REPORTING_WITH_NEW_REDSHIFT_PARAMETERS,
  REPORTING_WITH_PROVISIONED_REDSHIFT_PARAMETERS,
  ReportingStack,
  STREAMING_BASE_PARAMETERS,
  ServiceCatalogAppRegistryStack,
  StreamingStack,
  Tags,
  mergeParameters,
  removeParameters,
  replaceStackInputProps,
  replaceStackProps,
} from './workflow-mock';
import { FULL_SOLUTION_VERSION, LEVEL1, LEVEL2, LEVEL3, dictionaryTableName } from '../../common/constants';
// eslint-disable-next-line import/order
import { SINK_TYPE_MODE } from '../../common/model-ln';
import { ENetworkType, IngestionType, WorkflowStateType, WorkflowTemplate } from '../../common/types';
import { getStackPrefix } from '../../common/utils';
import { server } from '../../index';
import { CPipeline } from '../../model/pipeline';
import { StackManager } from '../../service/stack';
import { generateWorkflow } from '../../service/stack-excution';

const ddbMock = mockClient(DynamoDBDocumentClient);
const kafkaMock = mockClient(KafkaClient);
const redshiftMock = mockClient(RedshiftClient);
const redshiftServerlessMock = mockClient(RedshiftServerlessClient);
const sfnMock = mockClient(SFNClient);
const secretsManagerMock = mockClient(SecretsManagerClient);
const ec2Mock = mockClient(EC2Client);
const quickSightMock = mockClient(QuickSightClient);
const s3Mock = mockClient(S3Client);
const iamMock = mockClient(IAMClient);
const cloudWatchEventsMock = mockClient(CloudWatchEventsClient);
const snsMock = mockClient(SNSClient);
const kmsMock = mockClient(KMSClient);

const mockClients = {
  ddbMock,
  sfnMock,
  cloudFormationMock: null,
  kafkaMock,
  redshiftMock,
  redshiftServerlessMock,
  secretsManagerMock,
  ec2Mock,
  quickSightMock,
  s3Mock,
  iamMock,
  cloudWatchEventsMock,
  snsMock,
  kmsMock,
};

describe('Workflow test', () => {
  beforeEach(() => {
    ddbMock.reset();
    kafkaMock.reset();
    redshiftMock.reset();
    redshiftServerlessMock.reset();
    sfnMock.reset();
    secretsManagerMock.reset();
    ec2Mock.reset();
    quickSightMock.reset();
    s3Mock.reset();
    iamMock.reset();
    cloudWatchEventsMock.reset();
    snsMock.reset();
  });

  it('Generate Workflow ingestion-server-s3', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      noVpcEndpoint: true,
    });
    const pipeline: CPipeline = new CPipeline(cloneDeep({
      ...S3_INGESTION_PIPELINE,
      templateVersion: FULL_SOLUTION_VERSION,
    }));
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: ServiceCatalogAppRegistryStack,
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: replaceStackInputProps(MetricsStack,
                        {
                          Parameters: [
                            ...BASE_METRICS_EMAILS_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: replaceStackInputProps(IngestionStack,
                        {
                          StackName: `${getStackPrefix()}-Ingestion-s3-6666-6666`,
                          Parameters: [
                            ...INGESTION_S3_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-s3-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                Next: LEVEL2,
                Type: 'Parallel',
              },
              [LEVEL2]: {
                Branches: [],
                Next: LEVEL3,
                Type: 'Parallel',
              },
              [LEVEL3]: {
                Branches: [],
                End: true,
                Type: 'Parallel',
              },
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-s3 in private subnets', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      noVpcEndpoint: true,
    });
    const pipeline: CPipeline = new CPipeline({
      ...cloneDeep(S3_INGESTION_PIPELINE),
      network: {
        ...S3_INGESTION_PIPELINE.network,
        type: ENetworkType.Private,
      },
      templateVersion: FULL_SOLUTION_VERSION,
    });
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: ServiceCatalogAppRegistryStack,
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: replaceStackInputProps(MetricsStack,
                        {
                          Parameters: [
                            ...BASE_METRICS_EMAILS_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: replaceStackInputProps(IngestionStack,
                        {
                          StackName: `${getStackPrefix()}-Ingestion-s3-6666-6666`,
                          Parameters: [
                            ...INGESTION_S3_PRIVATE_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-s3-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                Next: LEVEL2,
                Type: 'Parallel',
              },
              [LEVEL2]: {
                Branches: [],
                Next: LEVEL3,
                Type: 'Parallel',
              },
              [LEVEL3]: {
                Branches: [],
                End: true,
                Type: 'Parallel',
              },
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-s3-fargate', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      noVpcEndpoint: true,
    });
    const pipeline: CPipeline = new CPipeline({
      ...cloneDeep(S3_INGESTION_PIPELINE),
      ingestionServer: {
        ...S3_INGESTION_PIPELINE.ingestionServer,
        ingestionType: IngestionType.Fargate,
      },
      templateVersion: FULL_SOLUTION_VERSION,
    });
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: ServiceCatalogAppRegistryStack,
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: replaceStackInputProps(MetricsStack,
                        {
                          Parameters: [
                            ...BASE_METRICS_EMAILS_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: replaceStackInputProps(IngestionStack,
                        {
                          StackName: `${getStackPrefix()}-Ingestion-s3-6666-6666`,
                          Parameters: [
                            ...INGESTION_S3_FARGATE_PARAMETERS,
                            {
                              ParameterKey: 'SinkType',
                              ParameterValue: SINK_TYPE_MODE.SINK_TYPE_S3,
                            },
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-v2-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                Next: LEVEL2,
                Type: 'Parallel',
              },
              [LEVEL2]: {
                Branches: [],
                Next: LEVEL3,
                Type: 'Parallel',
              },
              [LEVEL3]: {
                Branches: [],
                End: true,
                Type: 'Parallel',
              },
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-s3 without ServiceCatalogAppRegistry', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      noVpcEndpoint: true,
      bucket: {
        location: BucketLocationConstraint.cn_north_1,
      },
    });
    createPipelineMockForBJSRegion(s3Mock);
    const pipeline: CPipeline = new CPipeline({
      ...cloneDeep(S3_INGESTION_PIPELINE),
      region: 'cn-north-1',
      templateVersion: FULL_SOLUTION_VERSION,
    });
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: replaceStackInputProps(ServiceCatalogAppRegistryStack,
                {
                  Region: 'cn-north-1',
                },
              ),
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: replaceStackInputProps(MetricsStack,
                        {
                          Parameters: [
                            ...BASE_METRICS_EMAILS_PARAMETERS,
                            APPREGISTRY_APPLICATION_EMPTY_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          Region: 'cn-north-1',
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: replaceStackInputProps(IngestionStack,
                        {
                          StackName: `${getStackPrefix()}-Ingestion-s3-6666-6666`,
                          Parameters: [
                            ...INGESTION_S3_PARAMETERS,
                            APPREGISTRY_APPLICATION_EMPTY_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          Region: 'cn-north-1',
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-s3-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                Next: LEVEL2,
                Type: 'Parallel',
              },
              [LEVEL2]: {
                Branches: [],
                Next: LEVEL3,
                Type: 'Parallel',
              },
              [LEVEL3]: {
                Branches: [],
                End: true,
                Type: 'Parallel',
              },
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-kafka no connector', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      noVpcEndpoint: true,
    });
    const pipeline: CPipeline = new CPipeline(cloneDeep({
      ...KAFKA_INGESTION_PIPELINE,
      templateVersion: FULL_SOLUTION_VERSION,
    }));
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: ServiceCatalogAppRegistryStack,
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: replaceStackInputProps(MetricsStack,
                        {
                          Parameters: [
                            ...BASE_METRICS_EMAILS_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: replaceStackInputProps(IngestionStack,
                        {
                          StackName: `${getStackPrefix()}-Ingestion-kafka-6666-6666`,
                          Parameters: [
                            ...INGESTION_KAFKA_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kafka-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                Next: LEVEL2,
                Type: 'Parallel',
              },
              [LEVEL2]: {
                Branches: [],
                Next: LEVEL3,
                Type: 'Parallel',
              },
              [LEVEL3]: {
                Branches: [],
                End: true,
                Type: 'Parallel',
              },
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-kafka with connector', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      noVpcEndpoint: true,
    });
    const pipeline: CPipeline = new CPipeline(cloneDeep({
      ...KAFKA_WITH_CONNECTOR_INGESTION_PIPELINE,
      templateVersion: FULL_SOLUTION_VERSION,
    }));
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: ServiceCatalogAppRegistryStack,
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: replaceStackInputProps(MetricsStack,
                        {
                          Parameters: [
                            ...BASE_METRICS_EMAILS_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: replaceStackProps(
                        replaceStackInputProps(IngestionStack,
                          {
                            StackName: `${getStackPrefix()}-Ingestion-kafka-6666-6666`,
                            Parameters: [
                              ...INGESTION_KAFKA_PARAMETERS,
                              APPREGISTRY_APPLICATION_ARN_PARAMETER,
                            ],
                            Tags: Tags,
                            TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kafka-stack.template.json',
                          },
                        ),
                        {
                          Next: 'KafkaConnector',
                          End: undefined,
                        },
                      ),
                      KafkaConnector: {
                        Data: {
                          Callback: {
                            BucketName: 'TEST_EXAMPLE_BUCKET',
                            BucketPrefix: 'clickstream/workflow/main-3333-3333',
                          },
                          Input: {
                            Action: 'Create',
                            Region: 'ap-southeast-1',
                            Parameters: [
                              ...BASE_KAFKACONNECTOR_BATCH_PARAMETERS,
                              APPREGISTRY_APPLICATION_ARN_PARAMETER,
                            ],
                            StackName: `${getStackPrefix()}-KafkaConnector-6666-6666`,
                            Tags: Tags,
                            TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/kafka-s3-sink-stack.template.json',
                          },
                        },
                        End: true,
                        Type: 'Stack',
                      },
                    },
                  },
                ],
                Next: LEVEL2,
                Type: 'Parallel',
              },
              [LEVEL2]: {
                Branches: [],
                Next: LEVEL3,
                Type: 'Parallel',
              },
              [LEVEL3]: {
                Branches: [],
                End: true,
                Type: 'Parallel',
              },
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };

    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-kafka msk with connector', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      noVpcEndpoint: true,
      bucket: {
        location: BucketLocationConstraint.cn_north_1,
      },
    });
    createPipelineMockForBJSRegion(s3Mock);
    const pipeline: CPipeline = new CPipeline({
      ...cloneDeep(MSK_WITH_CONNECTOR_INGESTION_PIPELINE),
      region: 'cn-north-1',
      templateVersion: FULL_SOLUTION_VERSION,
    });
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: replaceStackInputProps(ServiceCatalogAppRegistryStack,
                {
                  Region: 'cn-north-1',
                },
              ),
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: replaceStackInputProps(MetricsStack,
                        {
                          Parameters: [
                            ...BASE_METRICS_EMAILS_PARAMETERS,
                            APPREGISTRY_APPLICATION_EMPTY_ARN_PARAMETER,
                          ],
                          Region: 'cn-north-1',
                          Tags: Tags,
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: replaceStackProps(
                        replaceStackInputProps(IngestionStack,
                          {
                            StackName: `${getStackPrefix()}-Ingestion-kafka-6666-6666`,
                            Parameters: [
                              ...INGESTION_MSK_PARAMETERS,
                              APPREGISTRY_APPLICATION_EMPTY_ARN_PARAMETER,
                            ],
                            Region: 'cn-north-1',
                            Tags: Tags,
                            TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kafka-stack.template.json',
                          },
                        ),
                        {
                          Next: 'KafkaConnector',
                          End: undefined,
                        },
                      ),
                      KafkaConnector: {
                        Data: {
                          Callback: {
                            BucketName: 'TEST_EXAMPLE_BUCKET',
                            BucketPrefix: 'clickstream/workflow/main-3333-3333',
                          },
                          Input: {
                            Action: 'Create',
                            Region: 'cn-north-1',
                            Parameters: [
                              ...BASE_KAFKACONNECTOR_BATCH_MSK_PARAMETERS,
                              APPREGISTRY_APPLICATION_EMPTY_ARN_PARAMETER,
                            ],
                            StackName: `${getStackPrefix()}-KafkaConnector-6666-6666`,
                            Tags: Tags,
                            TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/kafka-s3-sink-stack.template.json',
                          },
                        },
                        End: true,
                        Type: 'Stack',
                      },
                    },
                  },
                ],
                Next: LEVEL2,
                Type: 'Parallel',
              },
              [LEVEL2]: {
                Branches: [],
                Next: LEVEL3,
                Type: 'Parallel',
              },
              [LEVEL3]: {
                Branches: [],
                End: true,
                Type: 'Parallel',
              },
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };

    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-kinesis ON_DEMAND', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      noVpcEndpoint: true,
    });
    const pipeline: CPipeline = new CPipeline(cloneDeep({
      ...KINESIS_ON_DEMAND_INGESTION_PIPELINE,
      templateVersion: FULL_SOLUTION_VERSION,
    }));
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: ServiceCatalogAppRegistryStack,
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: replaceStackInputProps(MetricsStack,
                        {
                          Parameters: [
                            ...BASE_METRICS_EMAILS_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: replaceStackInputProps(IngestionStack,
                        {
                          StackName: `${getStackPrefix()}-Ingestion-kinesis-6666-6666`,
                          Parameters: [
                            ...INGESTION_KINESIS_ON_DEMAND_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kinesis-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                Next: LEVEL2,
                Type: 'Parallel',
              },
              [LEVEL2]: {
                Branches: [],
                Next: LEVEL3,
                Type: 'Parallel',
              },
              [LEVEL3]: {
                Branches: [],
                End: true,
                Type: 'Parallel',
              },
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-kinesis PROVISIONED', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      noVpcEndpoint: true,
      bucket: {
        location: BucketLocationConstraint.cn_north_1,
      },
    });
    createPipelineMockForBJSRegion(s3Mock);
    const pipeline: CPipeline = new CPipeline({
      ...cloneDeep(KINESIS_PROVISIONED_INGESTION_PIPELINE),
      region: 'cn-north-1',
      templateVersion: FULL_SOLUTION_VERSION,
    });
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: replaceStackInputProps(ServiceCatalogAppRegistryStack,
                {
                  Region: 'cn-north-1',
                },
              ),
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: replaceStackInputProps(MetricsStack,
                        {
                          Parameters: [
                            ...BASE_METRICS_EMAILS_PARAMETERS,
                            APPREGISTRY_APPLICATION_EMPTY_ARN_PARAMETER,
                          ],
                          Region: 'cn-north-1',
                          Tags: Tags,
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: replaceStackInputProps(IngestionStack,
                        {
                          StackName: `${getStackPrefix()}-Ingestion-kinesis-6666-6666`,
                          Parameters: [
                            ...INGESTION_KINESIS_PROVISIONED_PARAMETERS,
                            APPREGISTRY_APPLICATION_EMPTY_ARN_PARAMETER,
                          ],
                          Region: 'cn-north-1',
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kinesis-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                Next: LEVEL2,
                Type: 'Parallel',
              },
              [LEVEL2]: {
                Branches: [],
                Next: LEVEL3,
                Type: 'Parallel',
              },
              [LEVEL3]: {
                Branches: [],
                End: true,
                Type: 'Parallel',
              },
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-s3 + DataProcessing', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      noVpcEndpoint: true,
    });
    const pipeline: CPipeline = new CPipeline(cloneDeep({
      ...S3_DATA_PROCESSING_PIPELINE,
      templateVersion: FULL_SOLUTION_VERSION,
    }));
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: ServiceCatalogAppRegistryStack,
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: replaceStackInputProps(MetricsStack,
                        {
                          Parameters: [
                            ...BASE_METRICS_EMAILS_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: replaceStackInputProps(IngestionStack,
                        {
                          StackName: `${getStackPrefix()}-Ingestion-s3-6666-6666`,
                          Parameters: [
                            ...INGESTION_S3_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-s3-stack.template.json',
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'DataProcessing',
                    States: {
                      DataProcessing: replaceStackInputProps(DataProcessingStack,
                        {
                          Parameters: [
                            ...DATA_PROCESSING_PLUGIN1_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-pipeline-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                Next: LEVEL2,
                Type: 'Parallel',
              },
              [LEVEL2]: {
                Branches: [],
                Next: LEVEL3,
                Type: 'Parallel',
              },
              [LEVEL3]: {
                Branches: [],
                End: true,
                Type: 'Parallel',
              },
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-s3 with specify prefix + DataProcessing', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      subnetsIsolated: true,
      subnetsCross3AZ: true,
    });
    const pipeline: CPipeline = new CPipeline(cloneDeep({
      ...S3_DATA_PROCESSING_WITH_SPECIFY_PREFIX_PIPELINE,
      templateVersion: FULL_SOLUTION_VERSION,
    }));
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: ServiceCatalogAppRegistryStack,
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: replaceStackInputProps(MetricsStack,
                        {
                          Parameters: [
                            ...BASE_METRICS_EMAILS_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: replaceStackInputProps(IngestionStack,
                        {
                          StackName: `${getStackPrefix()}-Ingestion-s3-6666-6666`,
                          Parameters: [
                            ...INGESTION_S3_WITH_SPECIFY_PREFIX_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-s3-stack.template.json',
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'DataProcessing',
                    States: {
                      DataProcessing: replaceStackInputProps(DataProcessingStack,
                        {
                          Parameters: [
                            ...DATA_PROCESSING_WITH_SPECIFY_PREFIX_PLUGIN1_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-pipeline-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                Next: LEVEL2,
                Type: 'Parallel',
              },
              [LEVEL2]: {
                Branches: [
                  {
                    StartAt: 'DataModelingRedshift',
                    States: {
                      DataModelingRedshift: replaceStackInputProps(DataModelingRedshiftStack,
                        {
                          StackName: `${getStackPrefix()}-DataModelingRedshift-6666-6666`,
                          Parameters: [
                            ...DATA_PROCESSING_NEW_SERVERLESS_WITH_SPECIFY_PREFIX_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-analytics-redshift-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                Next: LEVEL3,
                Type: 'Parallel',
              },
              [LEVEL3]: {
                Branches: [],
                End: true,
                Type: 'Parallel',
              },
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow kafka msk + DataProcessing + Athena only', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      subnetsIsolated: true,
      subnetsCross3AZ: true,
    });
    const pipeline: CPipeline = new CPipeline({
      ...cloneDeep(MSK_DATA_PROCESSING_ATHENA_PIPELINE),
      templateVersion: FULL_SOLUTION_VERSION,
    });
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: ServiceCatalogAppRegistryStack,
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: replaceStackInputProps(MetricsStack,
                        {
                          Parameters: [
                            ...BASE_METRICS_EMAILS_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: replaceStackProps(
                        replaceStackInputProps(IngestionStack,
                          {
                            StackName: `${getStackPrefix()}-Ingestion-kafka-6666-6666`,
                            Parameters: [
                              ...INGESTION_MSK_PARAMETERS,
                              APPREGISTRY_APPLICATION_ARN_PARAMETER,
                            ],
                            Tags: Tags,
                            TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kafka-stack.template.json',
                          },
                        ),
                        {
                          Next: 'KafkaConnector',
                          End: undefined,
                        },
                      ),
                      KafkaConnector: {
                        Data: {
                          Callback: {
                            BucketName: 'TEST_EXAMPLE_BUCKET',
                            BucketPrefix: 'clickstream/workflow/main-3333-3333',
                          },
                          Input: {
                            Action: 'Create',
                            Region: 'ap-southeast-1',
                            Parameters: [
                              ...BASE_KAFKACONNECTOR_BATCH_MSK_PARAMETERS,
                              APPREGISTRY_APPLICATION_ARN_PARAMETER,
                            ],
                            StackName: `${getStackPrefix()}-KafkaConnector-6666-6666`,
                            Tags: Tags,
                            TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/kafka-s3-sink-stack.template.json',
                          },
                        },
                        End: true,
                        Type: 'Stack',
                      },
                    },
                  },
                  {
                    StartAt: 'DataProcessing',
                    States: {
                      DataProcessing: replaceStackInputProps(DataProcessingStack,
                        {
                          Parameters: [
                            ...DATA_PROCESSING_PLUGIN2_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-pipeline-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                Next: LEVEL2,
                Type: 'Parallel',
              },
              [LEVEL2]: {
                Branches: [
                  {
                    StartAt: 'DataModelingAthena',
                    States: {
                      DataModelingAthena: replaceStackInputProps(DataModelingAthenaStack,
                        {
                          StackName: `${getStackPrefix()}-DataModelingAthena-6666-6666`,
                          Parameters: [
                            ...BASE_ATHENA_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-modeling-athena-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                Next: LEVEL3,
                Type: 'Parallel',
              },
              [LEVEL3]: {
                Branches: [],
                End: true,
                Type: 'Parallel',
              },
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow kafka msk + DataProcessing + redshift', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      subnetsIsolated: true,
      subnetsCross3AZ: true,
    });
    const pipeline: CPipeline = new CPipeline({
      ...cloneDeep(MSK_DATA_PROCESSING_NEW_SERVERLESS_PIPELINE),
      templateVersion: FULL_SOLUTION_VERSION,
    });
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: ServiceCatalogAppRegistryStack,
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: replaceStackInputProps(MetricsStack,
                        {
                          Parameters: [
                            ...BASE_METRICS_EMAILS_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: replaceStackProps(
                        replaceStackInputProps(IngestionStack,
                          {
                            StackName: `${getStackPrefix()}-Ingestion-kafka-6666-6666`,
                            Parameters: [
                              ...INGESTION_MSK_PARAMETERS,
                              APPREGISTRY_APPLICATION_ARN_PARAMETER,
                            ],
                            Tags: Tags,
                            TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kafka-stack.template.json',
                          },
                        ),
                        {
                          Next: 'KafkaConnector',
                          End: undefined,
                        },
                      ),
                      KafkaConnector: {
                        Data: {
                          Callback: {
                            BucketName: 'TEST_EXAMPLE_BUCKET',
                            BucketPrefix: 'clickstream/workflow/main-3333-3333',
                          },
                          Input: {
                            Action: 'Create',
                            Region: 'ap-southeast-1',
                            Parameters: [
                              ...BASE_KAFKACONNECTOR_BATCH_MSK_PARAMETERS,
                              APPREGISTRY_APPLICATION_ARN_PARAMETER,
                            ],
                            StackName: `${getStackPrefix()}-KafkaConnector-6666-6666`,
                            Tags: Tags,
                            TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/kafka-s3-sink-stack.template.json',
                          },
                        },
                        End: true,
                        Type: 'Stack',
                      },
                    },
                  },
                  {
                    StartAt: 'DataProcessing',
                    States: {
                      DataProcessing: replaceStackInputProps(DataProcessingStack,
                        {
                          Parameters: [
                            ...DATA_PROCESSING_PLUGIN2_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-pipeline-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                Next: LEVEL2,
                Type: 'Parallel',
              },
              [LEVEL2]: {
                Branches: [
                  {
                    StartAt: 'DataModelingAthena',
                    States: {
                      DataModelingAthena: replaceStackInputProps(DataModelingAthenaStack,
                        {
                          StackName: `${getStackPrefix()}-DataModelingAthena-6666-6666`,
                          Parameters: [
                            ...BASE_ATHENA_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-modeling-athena-stack.template.json',
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'DataModelingRedshift',
                    States: {
                      DataModelingRedshift: replaceStackInputProps(DataModelingRedshiftStack,
                        {
                          StackName: `${getStackPrefix()}-DataModelingRedshift-6666-6666`,
                          Parameters: [
                            ...MSK_DATA_PROCESSING_NEW_SERVERLESS_DATAANALYTICS_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-analytics-redshift-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                Next: LEVEL3,
                Type: 'Parallel',
              },
              [LEVEL3]: {
                Branches: [],
                End: true,
                Type: 'Parallel',
              },
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-kinesis ON_DEMAND + DataProcessing + new redshift', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      subnetsCross3AZ: true,
      noVpcEndpoint: true,
    });
    const pipeline: CPipeline = new CPipeline({
      ...cloneDeep(KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE),
      templateVersion: FULL_SOLUTION_VERSION,
    });
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: ServiceCatalogAppRegistryStack,
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: replaceStackInputProps(MetricsStack,
                        {
                          Parameters: [
                            ...BASE_METRICS_EMAILS_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: replaceStackInputProps(IngestionStack,
                        {
                          StackName: `${getStackPrefix()}-Ingestion-kinesis-6666-6666`,
                          Parameters: [
                            ...INGESTION_KINESIS_ON_DEMAND_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kinesis-stack.template.json',
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'DataProcessing',
                    States: {
                      DataProcessing: replaceStackInputProps(DataProcessingStack,
                        {
                          Parameters: [
                            ...DATA_PROCESSING_PLUGIN3_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-pipeline-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                Next: LEVEL2,
                Type: 'Parallel',
              },
              [LEVEL2]: {
                Branches: [
                  {
                    StartAt: 'DataModelingRedshift',
                    States: {
                      DataModelingRedshift: replaceStackInputProps(DataModelingRedshiftStack,
                        {
                          StackName: `${getStackPrefix()}-DataModelingRedshift-6666-6666`,
                          Parameters: [
                            ...MSK_DATA_PROCESSING_NEW_SERVERLESS_DATAANALYTICS_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-analytics-redshift-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                Next: LEVEL3,
                Type: 'Parallel',
              },
              [LEVEL3]: {
                Branches: [],
                End: true,
                Type: 'Parallel',
              },
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-kinesis ON_DEMAND + DataProcessing + provisioned redshift', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      noVpcEndpoint: true,
    });
    const pipeline: CPipeline = new CPipeline({
      ...cloneDeep(KINESIS_DATA_PROCESSING_PROVISIONED_REDSHIFT_PIPELINE),
      templateVersion: FULL_SOLUTION_VERSION,
    });
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: ServiceCatalogAppRegistryStack,
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: replaceStackInputProps(MetricsStack,
                        {
                          Parameters: [
                            ...BASE_METRICS_EMAILS_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: replaceStackInputProps(IngestionStack,
                        {
                          StackName: `${getStackPrefix()}-Ingestion-kinesis-6666-6666`,
                          Parameters: [
                            ...INGESTION_KINESIS_ON_DEMAND_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kinesis-stack.template.json',
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'DataProcessing',
                    States: {
                      DataProcessing: replaceStackInputProps(DataProcessingStack,
                        {
                          Parameters: [
                            ...DATA_PROCESSING_PLUGIN3_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-pipeline-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                Next: LEVEL2,
                Type: 'Parallel',
              },
              [LEVEL2]: {
                Branches: [
                  {
                    StartAt: 'DataModelingAthena',
                    States: {
                      DataModelingAthena: replaceStackInputProps(DataModelingAthenaStack,
                        {
                          StackName: `${getStackPrefix()}-DataModelingAthena-6666-6666`,
                          Parameters: [
                            ...BASE_ATHENA_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-modeling-athena-stack.template.json',
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'DataModelingRedshift',
                    States: {
                      DataModelingRedshift: replaceStackInputProps(DataModelingRedshiftStack,
                        {
                          StackName: `${getStackPrefix()}-DataModelingRedshift-6666-6666`,
                          Parameters: [
                            ...MSK_DATA_PROCESSING_PROVISIONED_REDSHIFT_DATAANALYTICS_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-analytics-redshift-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                Next: LEVEL3,
                Type: 'Parallel',
              },
              [LEVEL3]: {
                Branches: [],
                End: true,
                Type: 'Parallel',
              },
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-kinesis ON_DEMAND + DataProcessing + provisioned redshift + quicksight', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      noVpcEndpoint: true,
    });
    const pipeline: CPipeline = new CPipeline({
      ...cloneDeep(KINESIS_DATA_PROCESSING_PROVISIONED_REDSHIFT_QUICKSIGHT_PIPELINE),
      templateVersion: FULL_SOLUTION_VERSION,
    });
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: ServiceCatalogAppRegistryStack,
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: replaceStackInputProps(MetricsStack,
                        {
                          Parameters: [
                            ...BASE_METRICS_EMAILS_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: replaceStackInputProps(IngestionStack,
                        {
                          StackName: `${getStackPrefix()}-Ingestion-kinesis-6666-6666`,
                          Parameters: [
                            ...INGESTION_KINESIS_ON_DEMAND_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kinesis-stack.template.json',
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'DataProcessing',
                    States: {
                      DataProcessing: replaceStackInputProps(DataProcessingStack,
                        {
                          Parameters: [
                            ...DATA_PROCESSING_PLUGIN3_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-pipeline-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                Next: LEVEL2,
                Type: 'Parallel',
              },
              [LEVEL2]: {
                Branches: [
                  {
                    StartAt: 'DataModelingAthena',
                    States: {
                      DataModelingAthena: replaceStackInputProps(DataModelingAthenaStack,
                        {
                          StackName: `${getStackPrefix()}-DataModelingAthena-6666-6666`,
                          Parameters: [
                            ...BASE_ATHENA_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-modeling-athena-stack.template.json',
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'DataModelingRedshift',
                    States: {
                      DataModelingRedshift: replaceStackInputProps(DataModelingRedshiftStack,
                        {
                          StackName: `${getStackPrefix()}-DataModelingRedshift-6666-6666`,
                          Parameters: [
                            ...MSK_DATA_PROCESSING_PROVISIONED_REDSHIFT_DATAANALYTICS_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-analytics-redshift-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                Next: LEVEL3,
                Type: 'Parallel',
              },
              [LEVEL3]: {
                Branches: [
                  {
                    StartAt: 'Reporting',
                    States: {
                      Reporting: replaceStackInputProps(ReportingStack,
                        {
                          StackName: `${getStackPrefix()}-Reporting-6666-6666`,
                          Parameters: removeParameters(
                            [
                              ...REPORTING_WITH_PROVISIONED_REDSHIFT_PARAMETERS,
                              APPREGISTRY_APPLICATION_ARN_PARAMETER,
                            ],
                            [
                              {
                                ParameterKey: 'QuickSightPrincipalParam',
                              },
                            ]),
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-reporting-quicksight-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                End: true,
                Type: 'Parallel',
              },
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-kinesis ON_DEMAND + DataProcessing + provisioned redshift (thirdparty sdk)', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      noVpcEndpoint: true,
    });
    const pipeline: CPipeline = new CPipeline(cloneDeep({
      ...KINESIS_DATA_PROCESSING_PROVISIONED_REDSHIFT_THIRDPARTY_PIPELINE,
      templateVersion: FULL_SOLUTION_VERSION,
    }));
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: ServiceCatalogAppRegistryStack,
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: replaceStackInputProps(MetricsStack,
                        {
                          Parameters: [
                            ...BASE_METRICS_EMAILS_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: replaceStackInputProps(IngestionStack,
                        {
                          StackName: `${getStackPrefix()}-Ingestion-kinesis-6666-6666`,
                          Parameters: [
                            ...INGESTION_THIRDPARTY_SDK_KINESIS_ON_DEMAND_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kinesis-stack.template.json',
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'DataProcessing',
                    States: {
                      DataProcessing: replaceStackInputProps(DataProcessingStack,
                        {
                          Parameters: [
                            ...DATA_PROCESSING_THIRDPARTY_SDK_PLUGIN3_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-pipeline-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                Next: LEVEL2,
                Type: 'Parallel',
              },
              [LEVEL2]: {
                Branches: [
                  {
                    StartAt: 'DataModelingAthena',
                    States: {
                      DataModelingAthena: replaceStackInputProps(DataModelingAthenaStack,
                        {
                          StackName: `${getStackPrefix()}-DataModelingAthena-6666-6666`,
                          Parameters: [
                            ...BASE_ATHENA_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-modeling-athena-stack.template.json',
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'DataModelingRedshift',
                    States: {
                      DataModelingRedshift: replaceStackInputProps(DataModelingRedshiftStack,
                        {
                          StackName: `${getStackPrefix()}-DataModelingRedshift-6666-6666`,
                          Parameters: [
                            ...MSK_DATA_PROCESSING_PROVISIONED_REDSHIFT_DATAANALYTICS_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-analytics-redshift-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                Next: LEVEL3,
                Type: 'Parallel',
              },
              [LEVEL3]: {
                Branches: [],
                End: true,
                Type: 'Parallel',
              },
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-kinesis ON_DEMAND + DataProcessing + new redshift + quicksight', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      subnetsCross3AZ: true,
      noVpcEndpoint: true,
    });
    const pipeline: CPipeline = new CPipeline({
      ...cloneDeep(KINESIS_DATA_PROCESSING_NEW_REDSHIFT_QUICKSIGHT_PIPELINE),
      templateVersion: FULL_SOLUTION_VERSION,
    });
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: ServiceCatalogAppRegistryStack,
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: replaceStackInputProps(MetricsStack,
                        {
                          Parameters: [
                            ...BASE_METRICS_EMAILS_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: replaceStackInputProps(IngestionStack,
                        {
                          StackName: `${getStackPrefix()}-Ingestion-kinesis-6666-6666`,
                          Parameters: [
                            ...INGESTION_KINESIS_ON_DEMAND_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kinesis-stack.template.json',
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'DataProcessing',
                    States: {
                      DataProcessing: replaceStackInputProps(DataProcessingStack,
                        {
                          Parameters: [
                            ...DATA_PROCESSING_PLUGIN3_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-pipeline-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                Next: LEVEL2,
                Type: 'Parallel',
              },
              [LEVEL2]: {
                Branches: [
                  {
                    StartAt: 'DataModelingRedshift',
                    States: {
                      DataModelingRedshift: replaceStackInputProps(DataModelingRedshiftStack,
                        {
                          StackName: `${getStackPrefix()}-DataModelingRedshift-6666-6666`,
                          Parameters: [
                            ...MSK_DATA_PROCESSING_NEW_SERVERLESS_DATAANALYTICS_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-analytics-redshift-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                Next: LEVEL3,
                Type: 'Parallel',
              },
              [LEVEL3]: {
                Branches: [
                  {
                    StartAt: 'Reporting',
                    States: {
                      Reporting: replaceStackInputProps(ReportingStack,
                        {
                          StackName: `${getStackPrefix()}-Reporting-6666-6666`,
                          Parameters: removeParameters(
                            [
                              ...REPORTING_WITH_NEW_REDSHIFT_PARAMETERS,
                              APPREGISTRY_APPLICATION_ARN_PARAMETER,
                            ],
                            [
                              {
                                ParameterKey: 'QuickSightPrincipalParam',
                              },
                            ]),
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-reporting-quicksight-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                End: true,
                Type: 'Parallel',
              },
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-kinesis ON_DEMAND + DataProcessing + new redshift + quicksight + streaming', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      subnetsCross3AZ: true,
      noVpcEndpoint: true,
    });
    const pipeline: CPipeline = new CPipeline({
      ...cloneDeep(KINESIS_DATA_PROCESSING_NEW_REDSHIFT_QUICKSIGHT_PIPELINE),
      templateVersion: FULL_SOLUTION_VERSION,
      streaming: {
        appIdStreamList: ['app1', 'app2'],
        bucket: {
          name: 'EXAMPLE_BUCKET',
          prefix: '',
        },
      },
    });
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: ServiceCatalogAppRegistryStack,
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: replaceStackInputProps(MetricsStack,
                        {
                          Parameters: [
                            ...BASE_METRICS_EMAILS_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: replaceStackInputProps(IngestionStack,
                        {
                          StackName: `${getStackPrefix()}-Ingestion-kinesis-6666-6666`,
                          Parameters: [
                            ...INGESTION_KINESIS_ON_DEMAND_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kinesis-stack.template.json',
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'DataProcessing',
                    States: {
                      DataProcessing: replaceStackInputProps(DataProcessingStack,
                        {
                          Parameters: [
                            ...DATA_PROCESSING_PLUGIN3_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-pipeline-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                Next: LEVEL2,
                Type: 'Parallel',
              },
              [LEVEL2]: {
                Branches: [
                  {
                    StartAt: 'DataModelingRedshift',
                    States: {
                      DataModelingRedshift: replaceStackInputProps(DataModelingRedshiftStack,
                        {
                          StackName: `${getStackPrefix()}-DataModelingRedshift-6666-6666`,
                          Parameters: [
                            ...MSK_DATA_PROCESSING_NEW_SERVERLESS_DATAANALYTICS_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-analytics-redshift-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                Next: LEVEL3,
                Type: 'Parallel',
              },
              [LEVEL3]: {
                Branches: [
                  {
                    StartAt: 'Streaming',
                    States: {
                      Streaming: replaceStackInputProps(StreamingStack,
                        {
                          StackName: `${getStackPrefix()}-Streaming-6666-6666`,
                          Parameters: [
                            ...STREAMING_BASE_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/streaming-ingestion-stack.template.json',
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'Reporting',
                    States: {
                      Reporting: replaceStackInputProps(ReportingStack,
                        {
                          StackName: `${getStackPrefix()}-Reporting-6666-6666`,
                          Parameters: removeParameters(
                            [
                              ...REPORTING_WITH_NEW_REDSHIFT_PARAMETERS,
                              APPREGISTRY_APPLICATION_ARN_PARAMETER,
                            ],
                            [
                              {
                                ParameterKey: 'QuickSightPrincipalParam',
                              },
                            ]),
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-reporting-quicksight-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                End: true,
                Type: 'Parallel',
              },
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow allow app id is empty', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      subnetsCross3AZ: true,
      subnetsIsolated: true,
      noApp: true,
    });
    const pipeline: CPipeline = new CPipeline({
      ...cloneDeep(MSK_DATA_PROCESSING_NEW_SERVERLESS_PIPELINE),
      templateVersion: FULL_SOLUTION_VERSION,
    });
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: ServiceCatalogAppRegistryStack,
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: replaceStackInputProps(MetricsStack,
                        {
                          Parameters: [
                            ...BASE_METRICS_EMAILS_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: replaceStackProps(
                        replaceStackInputProps(IngestionStack,
                          {
                            StackName: `${getStackPrefix()}-Ingestion-kafka-6666-6666`,
                            Parameters: [
                              ...INGESTION_MSK_WITHOUT_APP_PARAMETERS,
                              APPREGISTRY_APPLICATION_ARN_PARAMETER,
                            ],
                            Tags: Tags,
                            TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kafka-stack.template.json',
                          },
                        ),
                        {
                          Next: 'KafkaConnector',
                          End: undefined,
                        },
                      ),
                      KafkaConnector: {
                        Data: {
                          Callback: {
                            BucketName: 'TEST_EXAMPLE_BUCKET',
                            BucketPrefix: 'clickstream/workflow/main-3333-3333',
                          },
                          Input: {
                            Action: 'Create',
                            Region: 'ap-southeast-1',
                            Parameters: [
                              ...BASE_KAFKACONNECTOR_BATCH_MSK_PARAMETERS,
                              APPREGISTRY_APPLICATION_ARN_PARAMETER,
                            ],
                            StackName: `${getStackPrefix()}-KafkaConnector-6666-6666`,
                            Tags: Tags,
                            TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/kafka-s3-sink-stack.template.json',
                          },
                        },
                        End: true,
                        Type: 'Stack',
                      },
                    },
                  },
                  {
                    StartAt: 'DataProcessing',
                    States: {
                      DataProcessing: replaceStackInputProps(DataProcessingStack,
                        {
                          Parameters: [
                            ...DATA_PROCESSING_PLUGIN4_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-pipeline-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                Next: LEVEL2,
                Type: 'Parallel',
              },
              [LEVEL2]: {
                Branches: [
                  {
                    StartAt: 'DataModelingAthena',
                    States: {
                      DataModelingAthena: replaceStackInputProps(DataModelingAthenaStack,
                        {
                          StackName: `${getStackPrefix()}-DataModelingAthena-6666-6666`,
                          Parameters: [
                            ...BASE_ATHENA_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-modeling-athena-stack.template.json',
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'DataModelingRedshift',
                    States: {
                      DataModelingRedshift: replaceStackInputProps(DataModelingRedshiftStack,
                        {
                          StackName: `${getStackPrefix()}-DataModelingRedshift-6666-6666`,
                          Parameters: mergeParameters(
                            MSK_DATA_PROCESSING_NEW_SERVERLESS_DATAANALYTICS_PARAMETERS,
                            [
                              {
                                ParameterKey: 'AppIds',
                                ParameterValue: '',
                              },
                              APPREGISTRY_APPLICATION_ARN_PARAMETER,
                            ],
                          ),
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-analytics-redshift-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                Next: LEVEL3,
                Type: 'Parallel',
              },
              [LEVEL3]: {
                Branches: [],
                End: true,
                Type: 'Parallel',
              },
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };

    expect(wf).toEqual(expected);
  });
  it('Generate Retry Workflow when create failed', async () => {
    dictionaryMock(ddbMock);
    // KafkaConnector, DataModelingRedshift Failed
    // Reporting Miss
    const stackManager: StackManager = new StackManager({ ...RETRY_PIPELINE_WITH_WORKFLOW });
    stackManager.retryWorkflow();
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'Ingestion',
            States: {
              Ingestion: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-Ingestion-kafka-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/ingestion-server-kafka-stack.template.json',
                  },
                },
                Next: 'KafkaConnector',
                Type: 'Pass',
              },
              KafkaConnector: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Update',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-KafkaConnector-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/kafka-s3-sink-stack.template.json',
                  },
                },
                End: true,
                Type: 'Stack',
              },
            },
          },
          {
            StartAt: 'DataProcessing',
            States: {
              DataProcessing: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-DataProcessing-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-pipeline-stack.template.json',
                  },
                },
                Next: 'DataModelingRedshift',
                Type: 'Pass',
              },
              Reporting: {
                Type: 'Stack',
                Data: {
                  Input: {
                    Region: 'ap-southeast-1',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-reporting-quicksight-stack.template.json',
                    Action: 'Create',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-Reporting-6666-6666`,
                  },
                  Callback: {
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                  },
                },
                End: true,
              },
              DataModelingRedshift: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Update',
                    Region: 'ap-southeast-1',
                    Parameters: [
                      {
                        ParameterKey: 'DataProcessingCronOrRateExpression',
                        ParameterValue: 'rate(16 minutes)',
                      },
                    ],
                    StackName: `${getStackPrefix()}-DataModelingRedshift-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-analytics-redshift-stack.template.json',
                  },
                },
                Next: 'Reporting',
                Type: 'Stack',
              },
            },
          },
          {
            StartAt: 'Metrics',
            States: {
              Metrics: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
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
                Type: 'Pass',
              },
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(stackManager.getExecWorkflow()).toEqual(expected);
  });
  it('Generate Retry Workflow when update failed', async () => {
    dictionaryMock(ddbMock);
    const stackManager: StackManager = new StackManager({ ...RETRY_PIPELINE_WITH_WORKFLOW_WHEN_UPDATE_FAILED });
    stackManager.retryWorkflow();
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'Ingestion',
            States: {
              Ingestion: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Update',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-Ingestion-kafka-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/ingestion-server-kafka-stack.template.json',
                  },
                },
                Next: 'KafkaConnector',
                Type: 'Stack',
              },
              KafkaConnector: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Update',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-KafkaConnector-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/kafka-s3-sink-stack.template.json',
                  },
                },
                End: true,
                Type: 'Stack',
              },
            },
          },
          {
            StartAt: 'DataProcessing',
            States: {
              DataProcessing: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-DataProcessing-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-pipeline-stack.template.json',
                  },
                },
                Next: 'DataModelingRedshift',
                Type: 'Pass',
              },
              Reporting: {
                Type: 'Pass',
                Data: {
                  Input: {
                    Region: 'ap-southeast-1',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-reporting-quicksight-stack.template.json',
                    Action: 'Create',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-Reporting-6666-6666`,
                  },
                  Callback: {
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                  },
                },
                End: true,
              },
              DataModelingRedshift: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: [
                      {
                        ParameterKey: 'DataProcessingCronOrRateExpression',
                        ParameterValue: 'rate(16 minutes)',
                      },
                    ],
                    StackName: `${getStackPrefix()}-DataModelingRedshift-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-analytics-redshift-stack.template.json',
                  },
                },
                Next: 'Reporting',
                Type: 'Pass',
              },
            },
          },
          {
            StartAt: 'Metrics',
            States: {
              Metrics: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
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
                Type: 'Pass',
              },
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(stackManager.getExecWorkflow()).toEqual(expected);
  });
  it('Generate Retry Workflow when update stack empty', async () => {
    dictionaryMock(ddbMock);
    const stackManager: StackManager = new StackManager({ ...RETRY_PIPELINE_WITH_WORKFLOW_WHEN_UPDATE_EMPTY });
    stackManager.retryWorkflow();
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'Ingestion',
            States: {
              Ingestion: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-Ingestion-kafka-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/ingestion-server-kafka-stack.template.json',
                  },
                },
                Next: 'KafkaConnector',
                Type: 'Stack',
              },
              KafkaConnector: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Update',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-KafkaConnector-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/kafka-s3-sink-stack.template.json',
                  },
                },
                End: true,
                Type: 'Stack',
              },
            },
          },
          {
            StartAt: 'DataProcessing',
            States: {
              DataProcessing: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-DataProcessing-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-pipeline-stack.template.json',
                  },
                },
                Next: 'DataModelingRedshift',
                Type: 'Pass',
              },
              Reporting: {
                Type: 'Pass',
                Data: {
                  Input: {
                    Region: 'ap-southeast-1',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-reporting-quicksight-stack.template.json',
                    Action: 'Create',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-Reporting-6666-6666`,
                  },
                  Callback: {
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                  },
                },
                End: true,
              },
              DataModelingRedshift: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: [
                      {
                        ParameterKey: 'DataProcessingCronOrRateExpression',
                        ParameterValue: 'rate(16 minutes)',
                      },
                    ],
                    StackName: `${getStackPrefix()}-DataModelingRedshift-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-analytics-redshift-stack.template.json',
                  },
                },
                Next: 'Reporting',
                Type: 'Pass',
              },
            },
          },
          {
            StartAt: 'Metrics',
            States: {
              Metrics: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
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
                Type: 'Pass',
              },
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(stackManager.getExecWorkflow()).toEqual(expected);
  });
  it('Generate Retry Workflow when upgrade with rollback complete', async () => {
    dictionaryMock(ddbMock);
    // DataModelingRedshift Rollback
    const stackManager: StackManager = new StackManager({ ...RETRY_PIPELINE_WITH_WORKFLOW_AND_ROLLBACK_COMPLETE });
    stackManager.retryWorkflow();
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'Ingestion',
            States: {
              Ingestion: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-Ingestion-kafka-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/ingestion-server-kafka-stack.template.json',
                  },
                },
                Next: 'KafkaConnector',
                Type: 'Pass',
              },
              KafkaConnector: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-KafkaConnector-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/kafka-s3-sink-stack.template.json',
                  },
                },
                End: true,
                Type: 'Pass',
              },
            },
          },
          {
            StartAt: 'DataProcessing',
            States: {
              DataProcessing: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-DataProcessing-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-pipeline-stack.template.json',
                  },
                },
                Next: 'DataModelingRedshift',
                Type: 'Pass',
              },
              Reporting: {
                Type: 'Stack',
                Data: {
                  Input: {
                    Region: 'ap-southeast-1',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-reporting-quicksight-stack.template.json',
                    Action: 'Upgrade',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-Reporting-6666-6666`,
                  },
                  Callback: {
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                  },
                },
                End: true,
              },
              DataModelingRedshift: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Upgrade',
                    Region: 'ap-southeast-1',
                    Parameters: [
                      {
                        ParameterKey: 'DataProcessingCronOrRateExpression',
                        ParameterValue: 'rate(16 minutes)',
                      },
                    ],
                    StackName: `${getStackPrefix()}-DataModelingRedshift-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-analytics-redshift-stack.template.json',
                  },
                },
                Next: 'Reporting',
                Type: 'Stack',
              },
            },
          },
          {
            StartAt: 'Metrics',
            States: {
              Metrics: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
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
                Type: 'Pass',
              },
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(stackManager.getExecWorkflow()).toEqual(expected);
  });
  it('Generate Retry Workflow when upgrade failed', async () => {
    dictionaryMock(ddbMock);
    // DataModelingRedshift Rollback
    const stackManager: StackManager = new StackManager({
      ...RETRY_PIPELINE_WITH_WORKFLOW_FAILED,
    });
    stackManager.retryWorkflow();
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'Ingestion',
            States: {
              Ingestion: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-Ingestion-kafka-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/ingestion-server-kafka-stack.template.json',
                  },
                },
                Next: 'KafkaConnector',
                Type: 'Pass',
              },
              KafkaConnector: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-KafkaConnector-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/kafka-s3-sink-stack.template.json',
                  },
                },
                End: true,
                Type: 'Pass',
              },
            },
          },
          {
            StartAt: 'DataProcessing',
            States: {
              DataProcessing: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-DataProcessing-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-pipeline-stack.template.json',
                  },
                },
                Next: 'DataModelingRedshift',
                Type: 'Pass',
              },
              Reporting: {
                Type: 'Stack',
                Data: {
                  Input: {
                    Region: 'ap-southeast-1',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-reporting-quicksight-stack.template.json',
                    Action: 'Upgrade',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-Reporting-6666-6666`,
                  },
                  Callback: {
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                  },
                },
                End: true,
              },
              DataModelingRedshift: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: [
                      {
                        ParameterKey: 'DataProcessingCronOrRateExpression',
                        ParameterValue: 'rate(16 minutes)',
                      },
                    ],
                    StackName: `${getStackPrefix()}-DataModelingRedshift-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-analytics-redshift-stack.template.json',
                  },
                },
                Next: 'Reporting',
                Type: 'Pass',
              },
            },
          },
          {
            StartAt: 'Metrics',
            States: {
              Metrics: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
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
                Type: 'Pass',
              },
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(stackManager.getExecWorkflow()).toEqual(expected);
  });
  it('Generate Retry Workflow when delete failed', async () => {
    dictionaryMock(ddbMock);
    // KafkaConnector, DataModelingRedshift Failed
    // Reporting Miss
    const stackManager: StackManager = new StackManager({
      ...RETRY_PIPELINE_WITH_WORKFLOW,
      stackDetails: [
        {
          ...BASE_STATUS.stackDetails[0],
          stackStatus: StackStatus.DELETE_FAILED,
        },
        BASE_STATUS.stackDetails[1],
        BASE_STATUS.stackDetails[2],
        {
          ...BASE_STATUS.stackDetails[3],
          stackStatus: StackStatus.DELETE_FAILED,
        },
        BASE_STATUS.stackDetails[4],
        BASE_STATUS.stackDetails[5],
      ],
    });
    stackManager.retryWorkflow();
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'Ingestion',
            States: {
              Ingestion: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Delete',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-Ingestion-kafka-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/ingestion-server-kafka-stack.template.json',
                  },
                },
                Next: 'KafkaConnector',
                Type: 'Stack',
              },
              KafkaConnector: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Delete',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-KafkaConnector-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/kafka-s3-sink-stack.template.json',
                  },
                },
                End: true,
                Type: 'Stack',
              },
            },
          },
          {
            StartAt: 'DataProcessing',
            States: {
              DataProcessing: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Delete',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-DataProcessing-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-pipeline-stack.template.json',
                  },
                },
                Next: 'DataModelingRedshift',
                Type: 'Stack',
              },
              Reporting: {
                Type: 'Stack',
                Data: {
                  Input: {
                    Region: 'ap-southeast-1',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-reporting-quicksight-stack.template.json',
                    Action: 'Delete',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-Reporting-6666-6666`,
                  },
                  Callback: {
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                  },
                },
                End: true,
              },
              DataModelingRedshift: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Delete',
                    Region: 'ap-southeast-1',
                    Parameters: [
                      {
                        ParameterKey: 'DataProcessingCronOrRateExpression',
                        ParameterValue: 'rate(16 minutes)',
                      },
                    ],
                    StackName: `${getStackPrefix()}-DataModelingRedshift-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-analytics-redshift-stack.template.json',
                  },
                },
                Next: 'Reporting',
                Type: 'Stack',
              },
            },
          },
          {
            StartAt: 'Metrics',
            States: {
              Metrics: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Delete',
                    Region: 'ap-southeast-1',
                    Parameters: BASE_METRICS_PARAMETERS,
                    StackName: `${getStackPrefix()}-Metrics-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/metrics-stack.template.json',
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
    };
    expect(stackManager.getExecWorkflow()).toEqual(expected);
  });
  it('Generate Upgrade Workflow', async () => {
    dictionaryMock(ddbMock);
    const oldStackNames: string[] = [
      `${getStackPrefix()}-Ingestion-kafka-6666-6666`,
      `${getStackPrefix()}-KafkaConnector-6666-6666`,
      `${getStackPrefix()}-DataProcessing-6666-6666`,
      `${getStackPrefix()}-Reporting-6666-6666`,
      `${getStackPrefix()}-DataModelingRedshift-6666-6666`,
      `${getStackPrefix()}-Metrics-6666-6666`,
    ];
    const stackManager: StackManager = new StackManager({ ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW_FOR_UPGRADE });
    stackManager.upgradeWorkflow(oldStackNames);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'Ingestion',
            States: {
              Ingestion: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Upgrade',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-Ingestion-kafka-6666-6666`,
                    TemplateURL: `https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/${MOCK_SOLUTION_VERSION}/default/ingestion-server-kafka-stack.template.json`,
                  },
                },
                Next: 'KafkaConnector',
                Type: 'Stack',
              },
              KafkaConnector: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Upgrade',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-KafkaConnector-6666-6666`,
                    TemplateURL: `https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/${MOCK_SOLUTION_VERSION}/default/kafka-s3-sink-stack.template.json`,
                  },
                },
                End: true,
                Type: 'Stack',
              },
            },
          },
          {
            StartAt: 'DataProcessing',
            States: {
              DataProcessing: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Upgrade',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-DataProcessing-6666-6666`,
                    TemplateURL: `https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/${MOCK_SOLUTION_VERSION}/default/data-pipeline-stack.template.json`,
                  },
                },
                Next: 'DataModelingRedshift',
                Type: 'Stack',
              },
              Reporting: {
                Type: 'Stack',
                Data: {
                  Input: {
                    Region: 'ap-southeast-1',
                    TemplateURL: `https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/${MOCK_SOLUTION_VERSION}/default/data-reporting-quicksight-stack.template.json`,
                    Action: 'Upgrade',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-Reporting-6666-6666`,
                  },
                  Callback: {
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                  },
                },
                End: true,
              },
              DataModelingRedshift: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Upgrade',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-DataModelingRedshift-6666-6666`,
                    TemplateURL: `https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/${MOCK_SOLUTION_VERSION}/default/data-analytics-redshift-stack.template.json`,
                  },
                },
                Next: 'Reporting',
                Type: 'Stack',
              },
            },
          },
          {
            StartAt: 'Metrics',
            States: {
              Metrics: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Upgrade',
                    Region: 'ap-southeast-1',
                    Parameters: BASE_METRICS_PARAMETERS,
                    StackName: `${getStackPrefix()}-Metrics-6666-6666`,
                    TemplateURL: `https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/${MOCK_SOLUTION_VERSION}/default/metrics-stack.template.json`,
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
    };
    expect(stackManager.getExecWorkflow()).toEqual(expected);
  });
  it('Generate Upgrade Workflow with stack change', async () => {
    dictionaryMock(ddbMock);
    const oldStackNames: string[] = [
      `${getStackPrefix()}-Ingestion-kafka-6666-6666`,
      `${getStackPrefix()}-KafkaConnector-6666-6666`,
      `${getStackPrefix()}-DataProcessing-6666-6666`,
      `${getStackPrefix()}-Reporting-6666-6666`,
      `${getStackPrefix()}-DataModelingRedshift-6666-6666`,
    ];
    const stackManager: StackManager = new StackManager({ ...KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE_WITH_WORKFLOW_FOR_UPGRADE });
    stackManager.upgradeWorkflow(oldStackNames);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'Ingestion',
            States: {
              Ingestion: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Upgrade',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-Ingestion-kafka-6666-6666`,
                    TemplateURL: `https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/${MOCK_SOLUTION_VERSION}/default/ingestion-server-kafka-stack.template.json`,
                  },
                },
                Next: 'KafkaConnector',
                Type: 'Stack',
              },
              KafkaConnector: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Upgrade',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-KafkaConnector-6666-6666`,
                    TemplateURL: `https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/${MOCK_SOLUTION_VERSION}/default/kafka-s3-sink-stack.template.json`,
                  },
                },
                End: true,
                Type: 'Stack',
              },
            },
          },
          {
            StartAt: 'DataProcessing',
            States: {
              DataProcessing: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Upgrade',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-DataProcessing-6666-6666`,
                    TemplateURL: `https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/${MOCK_SOLUTION_VERSION}/default/data-pipeline-stack.template.json`,
                  },
                },
                Next: 'DataModelingRedshift',
                Type: 'Stack',
              },
              Reporting: {
                Type: 'Stack',
                Data: {
                  Input: {
                    Region: 'ap-southeast-1',
                    TemplateURL: `https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/${MOCK_SOLUTION_VERSION}/default/data-reporting-quicksight-stack.template.json`,
                    Action: 'Upgrade',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-Reporting-6666-6666`,
                  },
                  Callback: {
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                  },
                },
                End: true,
              },
              DataModelingRedshift: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Upgrade',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-DataModelingRedshift-6666-6666`,
                    TemplateURL: `https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/${MOCK_SOLUTION_VERSION}/default/data-analytics-redshift-stack.template.json`,
                  },
                },
                Next: 'Reporting',
                Type: 'Stack',
              },
            },
          },
          {
            StartAt: 'Metrics',
            States: {
              Metrics: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
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
                Type: 'Stack',
              },
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(stackManager.getExecWorkflow()).toEqual(expected);
  });
  it('Generate Delete Workflow', async () => {
    dictionaryMock(ddbMock);
    const stackManager: StackManager = new StackManager({ ...RETRY_PIPELINE_WITH_WORKFLOW });
    stackManager.deleteWorkflow();
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'KafkaConnector',
            States: {
              Ingestion: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Delete',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-Ingestion-kafka-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/ingestion-server-kafka-stack.template.json',
                  },
                },
                End: true,
                Type: 'Stack',
              },
              KafkaConnector: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Delete',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-KafkaConnector-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/kafka-s3-sink-stack.template.json',
                  },
                },
                Next: 'Ingestion',
                Type: 'Stack',
              },
            },
          },
          {
            StartAt: 'Reporting',
            States: {
              DataProcessing: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Delete',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-DataProcessing-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-pipeline-stack.template.json',
                  },
                },
                End: true,
                Type: 'Stack',
              },
              Reporting: {
                Type: 'Stack',
                Data: {
                  Input: {
                    Region: 'ap-southeast-1',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-reporting-quicksight-stack.template.json',
                    Action: 'Delete',
                    Parameters: [],
                    StackName: `${getStackPrefix()}-Reporting-6666-6666`,
                  },
                  Callback: {
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                  },
                },
                Next: 'DataModelingRedshift',
              },
              DataModelingRedshift: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Delete',
                    Region: 'ap-southeast-1',
                    Parameters: [
                      {
                        ParameterKey: 'DataProcessingCronOrRateExpression',
                        ParameterValue: 'rate(16 minutes)',
                      },
                    ],
                    StackName: `${getStackPrefix()}-DataModelingRedshift-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-analytics-redshift-stack.template.json',
                  },
                },
                Type: 'Stack',
                Next: 'DataProcessing',
              },
            },
          },
          {
            StartAt: 'Metrics',
            States: {
              Metrics: {
                Data: {
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Delete',
                    Region: 'ap-southeast-1',
                    Parameters: BASE_METRICS_PARAMETERS,
                    StackName: `${getStackPrefix()}-Metrics-6666-6666`,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/metrics-stack.template.json',
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
    };
    expect(stackManager.getExecWorkflow()).toEqual(expected);
  });
  it('Pipeline template url with version', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      subnetsCross3AZ: true,
      noVpcEndpoint: true,
    });
    const pipeline: CPipeline = new CPipeline({ ...S3_INGESTION_PIPELINE });
    await pipeline.resourcesCheck();
    await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    let templateURL = await pipeline.getTemplateUrl('Ingestion_s3');
    expect(templateURL).toEqual('https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-s3-stack.template.json');
    templateURL = await pipeline.getTemplateUrl('Ingestion_no');
    expect(templateURL).toEqual(undefined);
  });
  it('Pipeline template url in china region', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      subnetsCross3AZ: true,
      noVpcEndpoint: true,
    });
    ddbMock.on(GetCommand, {
      TableName: dictionaryTableName,
      Key: {
        name: 'Solution',
      },
    }).resolves({
      Item: {
        name: 'Solution',
        data: {
          name: 'clickstream-branch-main',
          dist_output_bucket: 'EXAMPLE-BUCKET',
          target: 'feature-rel/main',
          prefix: 'cn/',
          version: 'v1.0.0',
        },
      },
    });
    process.env.AWS_REGION='cn-northwest-1';
    const pipeline: CPipeline = new CPipeline({ ...S3_INGESTION_PIPELINE });
    await pipeline.resourcesCheck();
    await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    let templateURL = await pipeline.getTemplateUrl('Ingestion_s3');
    expect(templateURL).toEqual('https://EXAMPLE-BUCKET.s3.cn-north-1.amazonaws.com/clickstream-branch-main/v1.0.0/cn/ingestion-server-s3-stack.template.json');
    templateURL = await pipeline.getTemplateUrl('Ingestion_no');
    expect(templateURL).toEqual(undefined);
  });
  it('Pipeline template url with latest', async () => {
    dictionaryMock(ddbMock);
    ddbMock.on(GetCommand, {
      TableName: dictionaryTableName,
      Key: {
        name: 'Solution',
      },
    }).resolves({
      Item: {
        name: 'Solution',
        data: {
          name: 'clickstream-branch-main',
          dist_output_bucket: 'EXAMPLE-BUCKET',
          target: 'feature-rel/main',
          prefix: 'default/',
          version: 'latest',
        },
      },
    });
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          id: 1,
          appId: `${MOCK_APP_ID}_1`,
        },
        {
          id: 2,
          appId: `${MOCK_APP_ID}_2`,
        },
      ],
    });
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      subnetsCross3AZ: true,
      noVpcEndpoint: true,
    });
    process.env.AWS_REGION='us-east-1';
    const pipeline: CPipeline = new CPipeline({ ...S3_INGESTION_PIPELINE });
    await pipeline.resourcesCheck();
    await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    let templateURL = await pipeline.getTemplateUrl('Ingestion_s3');
    expect(templateURL).toEqual('https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/ingestion-server-s3-stack.template.json');
    templateURL = await pipeline.getTemplateUrl('Ingestion_no');
    expect(templateURL).toEqual(undefined);
  });
  it('Pipeline template url with prefix null string', async () => {
    dictionaryMock(ddbMock);
    ddbMock.on(GetCommand, {
      TableName: dictionaryTableName,
      Key: {
        name: 'Solution',
      },
    }).resolvesOnce({
      Item: {
        name: 'Solution',
        data: {
          name: 'clickstream-branch-main',
          dist_output_bucket: 'EXAMPLE-BUCKET',
          target: 'feature-rel/main',
          prefix: 'null',
          version: 'latest',
        },
      },
    });
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          id: 1,
          appId: `${MOCK_APP_ID}_1`,
        },
        {
          id: 2,
          appId: `${MOCK_APP_ID}_2`,
        },
      ],
    });
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      subnetsCross3AZ: true,
      noVpcEndpoint: true,
    });
    process.env.AWS_REGION='us-east-1';
    const pipeline: CPipeline = new CPipeline({ ...S3_INGESTION_PIPELINE });
    await pipeline.resourcesCheck();
    await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    let templateURL = await pipeline.getTemplateUrl('Ingestion_s3');
    expect(templateURL).toEqual('https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/ingestion-server-s3-stack.template.json');

    ddbMock.on(GetCommand, {
      TableName: dictionaryTableName,
      Key: {
        name: 'Solution',
      },
    }).resolves({
      Item: {
        name: 'Solution',
        data: {
          name: 'clickstream-branch-main',
          dist_output_bucket: 'EXAMPLE-BUCKET',
          target: 'feature-rel/main',
          prefix: '',
          version: 'latest',
        },
      },
    });
    const pipeline2: CPipeline = new CPipeline({ ...S3_INGESTION_PIPELINE });
    await pipeline2.resourcesCheck();
    await generateWorkflow(pipeline2.getPipeline(), pipeline2.getResources()!);
    templateURL = await pipeline2.getTemplateUrl('Ingestion_s3');
    expect(templateURL).toEqual('https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/ingestion-server-s3-stack.template.json');

    ddbMock.on(GetCommand, {
      TableName: dictionaryTableName,
      Key: {
        name: 'Solution',
      },
    }).resolves({
      Item: {
        name: 'Solution',
        data: {
          name: 'clickstream-branch-main',
          dist_output_bucket: 'EXAMPLE-BUCKET',
          target: 'feature-rel/main',
          prefix: null,
          version: 'latest',
        },
      },
    });
    const pipeline3: CPipeline = new CPipeline({ ...S3_INGESTION_PIPELINE });
    await pipeline3.resourcesCheck();
    await generateWorkflow(pipeline3.getPipeline(), pipeline3.getResources()!);
    templateURL = await pipeline3.getTemplateUrl('Ingestion_s3');
    expect(templateURL).toEqual('https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/ingestion-server-s3-stack.template.json');

  });
  it('Set Workflow Type', async () => {
    let workflowTemplate: WorkflowTemplate = {
      Version: '2022-03-15',
      Workflow: {
        Type: WorkflowStateType.STACK,
        Data: {
          Input: {
            Action: 'Create',
            Region: 'ap-southeast-1',
            StackName: 'clickstream-single-test2',
            Tags: Tags,
            TemplateURL: 'https://s3-us-west-2.amazonaws.com/cloudformation-templates-us-west-2/SQSWithQueueName.template',
            Parameters: [
              {
                ParameterKey: 'QueueName',
                ParameterValue: 'test1',
              },
            ],
          },
          Callback: {
            BucketName: 'TEST_EXAMPLE_BUCKET',
            BucketPrefix: 'clickstream/workflow/000000',
          },
        },
      },
    };
    const stackManager: StackManager = new StackManager({ ...S3_INGESTION_PIPELINE });
    let res = stackManager.setWorkflowType(workflowTemplate.Workflow, WorkflowStateType.PASS);
    expect(res).toEqual({
      Data: {
        Callback: {
          BucketName: 'TEST_EXAMPLE_BUCKET',
          BucketPrefix: 'clickstream/workflow/000000',
        },
        Input: {
          Action: 'Create',
          Region: 'ap-southeast-1',
          Parameters: [
            {
              ParameterKey: 'QueueName',
              ParameterValue: 'test1',
            },
          ],
          StackName: 'clickstream-single-test2',
          Tags: Tags,
          TemplateURL: 'https://s3-us-west-2.amazonaws.com/cloudformation-templates-us-west-2/SQSWithQueueName.template',
        },
      },
      Type: 'Pass',
    });

    workflowTemplate = {
      Version: '2022-03-15',
      Workflow: {
        Type: WorkflowStateType.PARALLEL,
        Branches: [{
          StartAt: 'Stack11',
          States: {
            Stack11: {
              Type: WorkflowStateType.STACK,
              Data: {
                Input: {
                  Action: 'Create',
                  Region: 'ap-southeast-1',
                  StackName: 'clickstream-test11',
                  Tags: Tags,
                  TemplateURL: 'https://s3-us-west-2.amazonaws.com/cloudformation-templates-us-west-2/SQSWithQueueName.template',
                  Parameters: [
                    {
                      ParameterKey: 'QueueName',
                      ParameterValue: 'clickstream-test11',
                    },
                  ],
                },
                Callback: {
                  BucketName: 'TEST_EXAMPLE_BUCKET',
                  BucketPrefix: 'clickstream/workflow/000000',
                },
              },
              Next: 'Stack22',
            },
            Stack33: {
              Type: WorkflowStateType.STACK,
              Data: {
                Input: {
                  Action: 'Create',
                  Region: 'ap-southeast-1',
                  StackName: 'clickstream-test33',
                  Tags: Tags,
                  TemplateURL: 'https://s3-us-west-2.amazonaws.com/cloudformation-templates-us-west-2/SQSWithQueueName.template',
                  Parameters: [
                    {
                      ParameterKey: 'QueueName',
                      ParameterValue: 'clickstream-test33',
                    },
                  ],
                },
                Callback: {
                  BucketName: 'TEST_EXAMPLE_BUCKET',
                  BucketPrefix: 'clickstream/workflow/000000',
                },
              },
              End: true,
            },
            Stack22: {
              Type: WorkflowStateType.STACK,
              Data: {
                Input: {
                  Action: 'Create',
                  Region: 'ap-southeast-1',
                  StackName: 'clickstream-test22',
                  Tags: Tags,
                  TemplateURL: 'https://s3-us-west-2.amazonaws.com/cloudformation-templates-us-west-2/SQSWithQueueName.template',
                  Parameters: [
                    {
                      ParameterKey: 'QueueName',
                      ParameterValue: 'clickstream-test22',
                    },
                  ],
                },
                Callback: {
                  BucketName: 'TEST_EXAMPLE_BUCKET',
                  BucketPrefix: 'clickstream/workflow/000000',
                },
              },
              Next: 'Stack33',
            },
          },
        }],
      },
    };
    res = stackManager.setWorkflowType(workflowTemplate.Workflow, WorkflowStateType.PASS);
    expect(res).toEqual({
      Branches: [
        {
          StartAt: 'Stack11',
          States: {
            Stack11: {
              Data: {
                Callback: {
                  BucketName: 'TEST_EXAMPLE_BUCKET',
                  BucketPrefix: 'clickstream/workflow/000000',
                },
                Input: {
                  Action: 'Create',
                  Region: 'ap-southeast-1',
                  Parameters: [
                    {
                      ParameterKey: 'QueueName',
                      ParameterValue: 'clickstream-test11',
                    },
                  ],
                  StackName: 'clickstream-test11',
                  Tags: Tags,
                  TemplateURL: 'https://s3-us-west-2.amazonaws.com/cloudformation-templates-us-west-2/SQSWithQueueName.template',
                },
              },
              Next: 'Stack22',
              Type: 'Pass',
            },
            Stack22: {
              Data: {
                Callback: {
                  BucketName: 'TEST_EXAMPLE_BUCKET',
                  BucketPrefix: 'clickstream/workflow/000000',
                },
                Input: {
                  Action: 'Create',
                  Region: 'ap-southeast-1',
                  Parameters: [
                    {
                      ParameterKey: 'QueueName',
                      ParameterValue: 'clickstream-test22',
                    },
                  ],
                  StackName: 'clickstream-test22',
                  Tags: Tags,
                  TemplateURL: 'https://s3-us-west-2.amazonaws.com/cloudformation-templates-us-west-2/SQSWithQueueName.template',
                },
              },
              Next: 'Stack33',
              Type: 'Pass',
            },
            Stack33: {
              Data: {
                Callback: {
                  BucketName: 'TEST_EXAMPLE_BUCKET',
                  BucketPrefix: 'clickstream/workflow/000000',
                },
                Input: {
                  Action: 'Create',
                  Region: 'ap-southeast-1',
                  Parameters: [
                    {
                      ParameterKey: 'QueueName',
                      ParameterValue: 'clickstream-test33',
                    },
                  ],
                  StackName: 'clickstream-test33',
                  Tags: Tags,
                  TemplateURL: 'https://s3-us-west-2.amazonaws.com/cloudformation-templates-us-west-2/SQSWithQueueName.template',
                },
              },
              End: true,
              Type: 'Pass',
            },
          },
        },
      ],
      Type: 'Parallel',
    });

    workflowTemplate = {
      Version: '2022-03-15',
      Workflow: {
        Type: WorkflowStateType.PARALLEL,
        Branches: [
          {
            StartAt: 'Stack11',
            States: {
              Stack11: {
                Type: WorkflowStateType.STACK,
                Data: {
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    StackName: 'clickstream-test11',
                    Tags: Tags,
                    TemplateURL: 'https://s3-us-west-2.amazonaws.com/cloudformation-templates-us-west-2/SQSWithQueueName.template',
                    Parameters: [
                      {
                        ParameterKey: 'QueueName',
                        ParameterValue: 'clickstream-test11',
                      },
                    ],
                  },
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/000000',
                  },
                },
                End: true,
              },
            },
          },
          {
            StartAt: 'Stack22',
            States: {
              Stack22: {
                Type: WorkflowStateType.STACK,
                Data: {
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    StackName: 'clickstream-test22',
                    Tags: Tags,
                    TemplateURL: 'https://s3-us-west-2.amazonaws.com/cloudformation-templates-us-west-2/SQSWithQueueName.template',
                    Parameters: [
                      {
                        ParameterKey: 'QueueName',
                        ParameterValue: 'clickstream-test22',
                      },
                    ],
                  },
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/000000',
                  },
                },
                End: true,
              },
            },
          },
          {
            StartAt: 'Stack33',
            States: {
              Stack33: {
                Type: WorkflowStateType.STACK,
                Data: {
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    StackName: 'clickstream-test33',
                    Tags: Tags,
                    TemplateURL: 'https://s3-us-west-2.amazonaws.com/cloudformation-templates-us-west-2/SQSWithQueueName.template',
                    Parameters: [
                      {
                        ParameterKey: 'QueueName',
                        ParameterValue: 'clickstream-test33',
                      },
                    ],
                  },
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/000000',
                  },
                },
                End: true,
              },
            },
          },
        ],
      },
    };
    res = stackManager.setWorkflowType(workflowTemplate.Workflow, WorkflowStateType.PASS);
    expect(res).toEqual({
      Branches: [
        {
          StartAt: 'Stack11',
          States: {
            Stack11: {
              Data: {
                Callback: {
                  BucketName: 'TEST_EXAMPLE_BUCKET',
                  BucketPrefix: 'clickstream/workflow/000000',
                },
                Input: {
                  Action: 'Create',
                  Region: 'ap-southeast-1',
                  Parameters: [
                    {
                      ParameterKey: 'QueueName',
                      ParameterValue: 'clickstream-test11',
                    },
                  ],
                  StackName: 'clickstream-test11',
                  Tags: Tags,
                  TemplateURL: 'https://s3-us-west-2.amazonaws.com/cloudformation-templates-us-west-2/SQSWithQueueName.template',
                },
              },
              End: true,
              Type: 'Pass',
            },
          },
        },
        {
          StartAt: 'Stack22',
          States: {
            Stack22: {
              Data: {
                Callback: {
                  BucketName: 'TEST_EXAMPLE_BUCKET',
                  BucketPrefix: 'clickstream/workflow/000000',
                },
                Input: {
                  Action: 'Create',
                  Region: 'ap-southeast-1',
                  Parameters: [
                    {
                      ParameterKey: 'QueueName',
                      ParameterValue: 'clickstream-test22',
                    },
                  ],
                  StackName: 'clickstream-test22',
                  Tags: Tags,
                  TemplateURL: 'https://s3-us-west-2.amazonaws.com/cloudformation-templates-us-west-2/SQSWithQueueName.template',
                },
              },
              End: true,
              Type: 'Pass',
            },
          },
        },
        {
          StartAt: 'Stack33',
          States: {
            Stack33: {
              Data: {
                Callback: {
                  BucketName: 'TEST_EXAMPLE_BUCKET',
                  BucketPrefix: 'clickstream/workflow/000000',
                },
                Input: {
                  Action: 'Create',
                  Region: 'ap-southeast-1',
                  Parameters: [
                    {
                      ParameterKey: 'QueueName',
                      ParameterValue: 'clickstream-test33',
                    },
                  ],
                  StackName: 'clickstream-test33',
                  Tags: Tags,
                  TemplateURL: 'https://s3-us-west-2.amazonaws.com/cloudformation-templates-us-west-2/SQSWithQueueName.template',
                },
              },
              End: true,
              Type: 'Pass',
            },
          },
        },
      ],
      Type: 'Parallel',
    });

    workflowTemplate = {
      Version: '2022-03-15',
      Workflow: {
        Type: WorkflowStateType.PARALLEL,
        Branches: [
          {
            StartAt: 'Stack11',
            States: {
              Stack11: {
                Type: WorkflowStateType.STACK,
                Data: {
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    StackName: 'clickstream-test11',
                    Tags: Tags,
                    TemplateURL: 'https://s3-us-west-2.amazonaws.com/cloudformation-templates-us-west-2/SQSWithQueueName.template',
                    Parameters: [
                      {
                        ParameterKey: 'QueueName',
                        ParameterValue: 'clickstream-test11',
                      },
                    ],
                  },
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/000000',
                  },
                },
                Next: 'Stack12',
              },
              Stack12: {
                Type: WorkflowStateType.STACK,
                Data: {
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    StackName: 'clickstream-test11',
                    Tags: Tags,
                    TemplateURL: 'https://s3-us-west-2.amazonaws.com/cloudformation-templates-us-west-2/SQSWithQueueName.template',
                    Parameters: [
                      {
                        ParameterKey: 'QueueName',
                        ParameterValue: 'clickstream-test11',
                      },
                    ],
                  },
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/000000',
                  },
                },
                End: true,
              },
            },
          },
          {
            StartAt: 'Stack22',
            States: {
              Stack22: {
                Type: WorkflowStateType.STACK,
                Data: {
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    StackName: 'clickstream-test22',
                    Tags: Tags,
                    TemplateURL: 'https://s3-us-west-2.amazonaws.com/cloudformation-templates-us-west-2/SQSWithQueueName.template',
                    Parameters: [
                      {
                        ParameterKey: 'QueueName',
                        ParameterValue: 'clickstream-test22',
                      },
                    ],
                  },
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/000000',
                  },
                },
                End: true,
              },
            },
          },
          {
            StartAt: 'Stack33',
            States: {
              Stack33: {
                Type: WorkflowStateType.STACK,
                Data: {
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    StackName: 'clickstream-test33',
                    Tags: Tags,
                    TemplateURL: 'https://s3-us-west-2.amazonaws.com/cloudformation-templates-us-west-2/SQSWithQueueName.template',
                    Parameters: [
                      {
                        ParameterKey: 'QueueName',
                        ParameterValue: 'clickstream-test33',
                      },
                    ],
                  },
                  Callback: {
                    BucketName: 'TEST_EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/000000',
                  },
                },
                End: true,
              },
            },
          },
        ],
      },
    };
    res = stackManager.setWorkflowType(workflowTemplate.Workflow, WorkflowStateType.PASS);
    expect(res).toEqual({
      Branches: [
        {
          StartAt: 'Stack11',
          States: {
            Stack11: {
              Data: {
                Callback: {
                  BucketName: 'TEST_EXAMPLE_BUCKET',
                  BucketPrefix: 'clickstream/workflow/000000',
                },
                Input: {
                  Action: 'Create',
                  Region: 'ap-southeast-1',
                  Parameters: [
                    {
                      ParameterKey: 'QueueName',
                      ParameterValue: 'clickstream-test11',
                    },
                  ],
                  StackName: 'clickstream-test11',
                  Tags: Tags,
                  TemplateURL: 'https://s3-us-west-2.amazonaws.com/cloudformation-templates-us-west-2/SQSWithQueueName.template',
                },
              },
              Next: 'Stack12',
              Type: 'Pass',
            },
            Stack12: {
              Data: {
                Callback: {
                  BucketName: 'TEST_EXAMPLE_BUCKET',
                  BucketPrefix: 'clickstream/workflow/000000',
                },
                Input: {
                  Action: 'Create',
                  Region: 'ap-southeast-1',
                  Parameters: [
                    {
                      ParameterKey: 'QueueName',
                      ParameterValue: 'clickstream-test11',
                    },
                  ],
                  StackName: 'clickstream-test11',
                  Tags: Tags,
                  TemplateURL: 'https://s3-us-west-2.amazonaws.com/cloudformation-templates-us-west-2/SQSWithQueueName.template',
                },
              },
              End: true,
              Type: 'Pass',
            },
          },
        },
        {
          StartAt: 'Stack22',
          States: {
            Stack22: {
              Data: {
                Callback: {
                  BucketName: 'TEST_EXAMPLE_BUCKET',
                  BucketPrefix: 'clickstream/workflow/000000',
                },
                Input: {
                  Action: 'Create',
                  Region: 'ap-southeast-1',
                  Parameters: [
                    {
                      ParameterKey: 'QueueName',
                      ParameterValue: 'clickstream-test22',
                    },
                  ],
                  StackName: 'clickstream-test22',
                  Tags: Tags,
                  TemplateURL: 'https://s3-us-west-2.amazonaws.com/cloudformation-templates-us-west-2/SQSWithQueueName.template',
                },
              },
              End: true,
              Type: 'Pass',
            },
          },
        },
        {
          StartAt: 'Stack33',
          States: {
            Stack33: {
              Data: {
                Callback: {
                  BucketName: 'TEST_EXAMPLE_BUCKET',
                  BucketPrefix: 'clickstream/workflow/000000',
                },
                Input: {
                  Action: 'Create',
                  Region: 'ap-southeast-1',
                  Parameters: [
                    {
                      ParameterKey: 'QueueName',
                      ParameterValue: 'clickstream-test33',
                    },
                  ],
                  StackName: 'clickstream-test33',
                  Tags: Tags,
                  TemplateURL: 'https://s3-us-west-2.amazonaws.com/cloudformation-templates-us-west-2/SQSWithQueueName.template',
                },
              },
              End: true,
              Type: 'Pass',
            },
          },
        },
      ],
      Type: 'Parallel',
    });

  });
  it('Get workflow action', async () => {
    let workflowTemplate: WorkflowTemplate = {
      Version: '2022-03-15',
      Workflow: {
        Type: WorkflowStateType.PARALLEL,
        End: true,
        Branches: [
          {
            StartAt: 'Ingestion',
            States: {
              Ingestion: {
                Type: WorkflowStateType.STACK,
                Data: {
                  Input: {
                    Action: 'Create',
                    Region: 'ap-northeast-1',
                    StackName: 'Clickstream-Ingestion-kinesis-80a00964678e487d8425bca0000f5d08',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main-express/v0.8.0-main-202305281546-dc6d410d/default/ingestion-server-kinesis-stack.template.json',
                    Parameters: [],
                    Tags: [],
                  },
                  Callback: {
                    BucketName: 'clickstream-develop-ap-n-clickstreamsolutiondatab-1mebxa8xtn32h',
                    BucketPrefix: 'clickstream/workflow/main-bbaff5ef-dfaa-49b0-86b3-4ea12842669d',
                  },
                },
                End: true,
              },
            },
          },
          {
            StartAt: 'DataProcessing',
            States: {
              DataProcessing: {
                Type: WorkflowStateType.STACK,
                Data: {
                  Input: {
                    Action: 'Create',
                    Region: 'ap-northeast-1',
                    StackName: 'Clickstream-DataProcessing-80a00964678e487d8425bca0000f5d08',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main-express/v0.8.0-main-202305281546-dc6d410d/default/data-pipeline-stack.template.json',
                    Parameters: [],
                    Tags: [],
                  },
                  Callback: {
                    BucketName: 'clickstream-develop-ap-n-clickstreamsolutiondatab-1mebxa8xtn32h',
                    BucketPrefix: 'clickstream/workflow/main-bbaff5ef-dfaa-49b0-86b3-4ea12842669d',
                  },
                },
                End: true,
              },
            },
          },
          {
            StartAt: 'DataModelingRedshift',
            States: {
              DataModelingRedshift: {
                Type: WorkflowStateType.STACK,
                Data: {
                  Input: {
                    Action: 'Create',
                    Region: 'ap-northeast-1',
                    StackName: 'Clickstream-DataModelingRedshift-80a00964678e487d8425bca0000f5d08',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main-express/v0.8.0-main-202305281546-dc6d410d/default/data-analytics-redshift-stack.template.json',
                    Parameters: [],
                    Tags: [],
                  },
                  Callback: {
                    BucketName: 'clickstream-develop-ap-n-clickstreamsolutiondatab-1mebxa8xtn32h',
                    BucketPrefix: 'clickstream/workflow/main-bbaff5ef-dfaa-49b0-86b3-4ea12842669d',
                  },
                },
                Next: 'Reporting',
              },
              Reporting: {
                Type: WorkflowStateType.STACK,
                Data: {
                  Input: {
                    Action: 'Create',
                    Region: 'ap-northeast-1',
                    StackName: 'Clickstream-Reporting-80a00964678e487d8425bca0000f5d08',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main-express/v0.8.0-main-202305281546-dc6d410d/default/data-reporting-quicksight-stack.template.json',
                    Parameters: [],
                    Tags: [],
                  },
                  Callback: {
                    BucketName: 'clickstream-develop-ap-n-clickstreamsolutiondatab-1mebxa8xtn32h',
                    BucketPrefix: 'clickstream/workflow/main-bbaff5ef-dfaa-49b0-86b3-4ea12842669d',
                  },
                },
                End: true,
              },
            },
          },
          {
            StartAt: 'Metrics',
            States: {
              Metrics: {
                Type: WorkflowStateType.STACK,
                Data: {
                  Input: {
                    Action: 'Create',
                    Region: 'ap-northeast-1',
                    StackName: 'Clickstream-Metrics-80a00964678e487d8425bca0000f5d08',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main-express/v0.8.0-main-202305281546-dc6d410d/default/metrics-stack.template.json',
                    Parameters: [],
                    Tags: [],
                  },
                  Callback: {
                    BucketName: 'clickstream-develop-ap-n-clickstreamsolutiondatab-1mebxa8xtn32h',
                    BucketPrefix: 'clickstream/workflow/main-bbaff5ef-dfaa-49b0-86b3-4ea12842669d',
                  },
                },
                End: true,
              },
            },
          },
        ],
      },
    };
    const stackManager: StackManager = new StackManager({ ...S3_INGESTION_PIPELINE });
    const res = stackManager.getWorkflowCurrentAction(workflowTemplate.Workflow);
    expect(res).toEqual('CREATE');
  });

  afterAll((done) => {
    server.close();
    done();
  });
});

describe('Workflow test with boundary', () => {
  beforeEach(() => {
    ddbMock.reset();
    kafkaMock.reset();
    redshiftMock.reset();
    redshiftServerlessMock.reset();
    sfnMock.reset();
    secretsManagerMock.reset();
    ec2Mock.reset();
    quickSightMock.reset();
    s3Mock.reset();
    iamMock.reset();
    cloudWatchEventsMock.reset();
    snsMock.reset();
  });

  afterAll((done) => {
    server.close();
    done();
  });

  it('Generate Workflow ingestion-server-s3 with boundary', async () => {
    process.env.IAM_ROLE_BOUNDARY_ARN = 'arn:aws:iam::555555555555:policy/test-boundary-policy';
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      noVpcEndpoint: true,
    });
    const pipeline: CPipeline = new CPipeline({
      ...S3_INGESTION_PIPELINE,
      templateVersion: FULL_SOLUTION_VERSION,
    });
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: ServiceCatalogAppRegistryStack,
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: replaceStackInputProps(MetricsStack,
                        {
                          Parameters: [
                            ...BASE_METRICS_EMAILS_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                            BOUNDARY_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: replaceStackInputProps(IngestionStack,
                        {
                          StackName: `${getStackPrefix()}-Ingestion-s3-6666-6666`,
                          Parameters: [
                            ...INGESTION_S3_PARAMETERS,
                            APPREGISTRY_APPLICATION_ARN_PARAMETER,
                            BOUNDARY_ARN_PARAMETER,
                          ],
                          Tags: Tags,
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-s3-stack.template.json',
                        },
                      ),
                    },
                  },
                ],
                Next: LEVEL2,
                Type: 'Parallel',
              },
              [LEVEL2]: {
                Branches: [],
                Next: LEVEL3,
                Type: 'Parallel',
              },
              [LEVEL3]: {
                Branches: [],
                End: true,
                Type: 'Parallel',
              },
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
    process.env.IAM_ROLE_BOUNDARY_ARN = '';
  });
});
