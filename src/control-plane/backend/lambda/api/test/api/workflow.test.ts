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

import { EC2Client } from '@aws-sdk/client-ec2';
import { KafkaClient } from '@aws-sdk/client-kafka';
import {
  RedshiftClient,
} from '@aws-sdk/client-redshift';
import {
  RedshiftServerlessClient,
} from '@aws-sdk/client-redshift-serverless';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import {
  StartExecutionCommand,
  SFNClient,
} from '@aws-sdk/client-sfn';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import {
  createPipelineMock,
  dictionaryMock,
  MOCK_APP_ID,
  MOCK_EXECUTION_ID,
  MOCK_PROJECT_ID,
} from './ddb-mock';
import {
  KAFKA_INGESTION_PIPELINE,
  KAFKA_WITH_CONNECTOR_INGESTION_PIPELINE,
  KINESIS_ETL_NEW_REDSHIFT_QUICKSIGHT_PIPELINE,
  KINESIS_ETL_PROVISIONED_REDSHIFT_PIPELINE,
  KINESIS_ETL_PROVISIONED_REDSHIFT_QUICKSIGHT_PIPELINE,
  KINESIS_ETL_NEW_REDSHIFT_PIPELINE,
  KINESIS_ON_DEMAND_INGESTION_PIPELINE,
  KINESIS_PROVISIONED_INGESTION_PIPELINE,
  MSK_WITH_CONNECTOR_INGESTION_PIPELINE,
  RETRY_PIPELINE_WITH_WORKFLOW, RETRY_PIPELINE_WITH_WORKFLOW_AND_UNDEFINED_STATUS,
  S3_ETL_PIPELINE,
  S3_INGESTION_PIPELINE, MSK_ETL_NEW_SERVERLESS_PIPELINE,
} from './pipeline-mock';
import {
  BASE_KAFKACONNECTOR_BATCH_MSK_PARAMETERS,
  BASE_KAFKACONNECTOR_BATCH_PARAMETERS, BASE_METRICS_PARAMETERS,
  ETL_PLUGIN1_PARAMETERS,
  ETL_PLUGIN2_PARAMETERS,
  ETL_PLUGIN3_PARAMETERS,
  ETL_PLUGIN4_PARAMETERS,
  INGESTION_KAFKA_PARAMETERS,
  INGESTION_KINESIS_ON_DEMAND_PARAMETERS,
  INGESTION_KINESIS_PROVISIONED_PARAMETERS,
  INGESTION_MSK_PARAMETERS,
  INGESTION_S3_PARAMETERS,
  MSK_ETL_NEW_SERVERLESS_DATAANALYTICS_PARAMETERS,
  MSK_ETL_PROVISIONED_REDSHIFT_DATAANALYTICS_PARAMETERS,
  REPORT_WITH_NEW_REDSHIFT_PARAMETERS,
  REPORT_WITH_PROVISIONED_REDSHIFT_PARAMETERS,
  mergeParameters,
} from './workflow-mock';
import { dictionaryTableName } from '../../common/constants';
import { SolutionInfo } from '../../common/solution-info-ln';
import { WorkflowStateType, WorkflowTemplate } from '../../common/types';
import { server } from '../../index';
import { CPipeline } from '../../model/pipeline';
import { StackManager } from '../../service/stack';
import 'aws-sdk-client-mock-jest';

const ddbMock = mockClient(DynamoDBDocumentClient);
const kafkaMock = mockClient(KafkaClient);
const redshiftMock = mockClient(RedshiftClient);
const redshiftServerlessMock = mockClient(RedshiftServerlessClient);
const sfnMock = mockClient(SFNClient);
const secretsManagerMock = mockClient(SecretsManagerClient);
const ec2Mock = mockClient(EC2Client);

const Tags = [
  {
    Key: 'customerKey1',
    Value: 'tagValue1',
  },
  {
    Key: 'customerKey2',
    Value: 'tagValue2',
  },
  {
    Key: 'aws-solution/name',
    Value: SolutionInfo.SOLUTION_SHORT_NAME,
  },
  {
    Key: 'aws-solution/version',
    Value: SolutionInfo.SOLUTION_VERSION,
  },
  {
    Key: 'aws-solution/clickstream/project',
    Value: MOCK_PROJECT_ID,
  },
];

describe('Workflow test', () => {
  beforeEach(() => {
    ddbMock.reset();
    kafkaMock.reset();
    redshiftMock.reset();
    redshiftServerlessMock.reset();
    sfnMock.reset();
    secretsManagerMock.reset();
    ec2Mock.reset();
  });

  it('Generate Workflow ingestion-server-s3', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock, ec2Mock, sfnMock, secretsManagerMock, {
      publicAZContainPrivateAZ: true,
    });
    const pipeline: CPipeline = new CPipeline(S3_INGESTION_PIPELINE);
    const wf = await pipeline.generateWorkflow();
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
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: INGESTION_S3_PARAMETERS,
                    StackName: 'Clickstream-Ingestion-s3-6666-6666',
                    Tags: Tags,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-s3-stack.template.json',
                  },
                },
                End: true,
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
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: BASE_METRICS_PARAMETERS,
                    StackName: 'Clickstream-Metrics-6666-6666',
                    Tags: Tags,
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
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-kafka no connector', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock, ec2Mock, sfnMock, secretsManagerMock, {
      publicAZContainPrivateAZ: true,
    });
    const pipeline: CPipeline = new CPipeline(KAFKA_INGESTION_PIPELINE);
    const wf = await pipeline.generateWorkflow();
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
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: INGESTION_KAFKA_PARAMETERS,
                    StackName: 'Clickstream-Ingestion-kafka-6666-6666',
                    Tags: Tags,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kafka-stack.template.json',
                  },
                },
                Type: 'Stack',
                End: true,
              },
            },
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
                    Parameters: BASE_METRICS_PARAMETERS,
                    StackName: 'Clickstream-Metrics-6666-6666',
                    Tags: Tags,
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
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-kafka with connector', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock, ec2Mock, sfnMock, secretsManagerMock, {
      publicAZContainPrivateAZ: true,
    });
    const pipeline: CPipeline = new CPipeline(KAFKA_WITH_CONNECTOR_INGESTION_PIPELINE);
    const wf = await pipeline.generateWorkflow();
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
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: INGESTION_KAFKA_PARAMETERS,
                    StackName: 'Clickstream-Ingestion-kafka-6666-6666',
                    Tags: Tags,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kafka-stack.template.json',
                  },
                },
                Type: 'Stack',
                Next: 'KafkaConnector',
              },
              KafkaConnector: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: BASE_KAFKACONNECTOR_BATCH_PARAMETERS,
                    StackName: 'Clickstream-KafkaConnector-6666-6666',
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
                    Parameters: BASE_METRICS_PARAMETERS,
                    StackName: 'Clickstream-Metrics-6666-6666',
                    Tags: Tags,
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

    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-kafka msk with connector', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock, ec2Mock, sfnMock, secretsManagerMock, {
      publicAZContainPrivateAZ: true,
    });
    const pipeline: CPipeline = new CPipeline(MSK_WITH_CONNECTOR_INGESTION_PIPELINE);
    const wf = await pipeline.generateWorkflow();
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
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: INGESTION_MSK_PARAMETERS,
                    StackName: 'Clickstream-Ingestion-kafka-6666-6666',
                    Tags: Tags,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kafka-stack.template.json',
                  },
                },
                Next: 'KafkaConnector',
                Type: 'Stack',
              },
              KafkaConnector: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: BASE_KAFKACONNECTOR_BATCH_MSK_PARAMETERS,
                    StackName: 'Clickstream-KafkaConnector-6666-6666',
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
                    Parameters: BASE_METRICS_PARAMETERS,
                    StackName: 'Clickstream-Metrics-6666-6666',
                    Tags: Tags,
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

    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-kinesis ON_DEMAND', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock, ec2Mock, sfnMock, secretsManagerMock, {
      publicAZContainPrivateAZ: true,
    });
    const pipeline: CPipeline = new CPipeline(KINESIS_ON_DEMAND_INGESTION_PIPELINE);
    const wf = await pipeline.generateWorkflow();
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
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: INGESTION_KINESIS_ON_DEMAND_PARAMETERS,
                    StackName: 'Clickstream-Ingestion-kinesis-6666-6666',
                    Tags: Tags,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kinesis-stack.template.json',
                  },
                },
                End: true,
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
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: BASE_METRICS_PARAMETERS,
                    StackName: 'Clickstream-Metrics-6666-6666',
                    Tags: Tags,
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
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-kinesis PROVISIONED', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock, ec2Mock, sfnMock, secretsManagerMock, {
      publicAZContainPrivateAZ: true,
    });
    const pipeline: CPipeline = new CPipeline(KINESIS_PROVISIONED_INGESTION_PIPELINE);
    const wf = await pipeline.generateWorkflow();
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
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: INGESTION_KINESIS_PROVISIONED_PARAMETERS,
                    StackName: 'Clickstream-Ingestion-kinesis-6666-6666',
                    Tags: Tags,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kinesis-stack.template.json',
                  },
                },
                End: true,
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
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: BASE_METRICS_PARAMETERS,
                    StackName: 'Clickstream-Metrics-6666-6666',
                    Tags: Tags,
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
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-s3 + ETL', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock, ec2Mock, sfnMock, secretsManagerMock, {
      publicAZContainPrivateAZ: true,
    });
    const pipeline: CPipeline = new CPipeline(S3_ETL_PIPELINE);
    const wf = await pipeline.generateWorkflow();
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
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: INGESTION_S3_PARAMETERS,
                    StackName: 'Clickstream-Ingestion-s3-6666-6666',
                    Tags: Tags,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-s3-stack.template.json',
                  },
                },
                End: true,
                Type: 'Stack',
              },
            },
          },
          {
            StartAt: 'ETL',
            States: {
              ETL: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: ETL_PLUGIN1_PARAMETERS,
                    StackName: 'Clickstream-ETL-6666-6666',
                    Tags: Tags,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-pipeline-stack.template.json',
                  },
                },
                End: true,
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
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: BASE_METRICS_PARAMETERS,
                    StackName: 'Clickstream-Metrics-6666-6666',
                    Tags: Tags,
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
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow kafka msk + ETL + redshift', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock, ec2Mock, sfnMock, secretsManagerMock, {
      publicAZContainPrivateAZ: true,
      subnetsIsolated: true,
      subnetsCross3AZ: true,
    });
    const pipeline: CPipeline = new CPipeline(MSK_ETL_NEW_SERVERLESS_PIPELINE);
    const wf = await pipeline.generateWorkflow();
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
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: INGESTION_MSK_PARAMETERS,
                    StackName: 'Clickstream-Ingestion-kafka-6666-6666',
                    Tags: Tags,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kafka-stack.template.json',
                  },
                },
                Next: 'KafkaConnector',
                Type: 'Stack',
              },
              KafkaConnector: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: BASE_KAFKACONNECTOR_BATCH_MSK_PARAMETERS,
                    StackName: 'Clickstream-KafkaConnector-6666-6666',
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
            StartAt: 'ETL',
            States: {
              ETL: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: ETL_PLUGIN2_PARAMETERS,
                    StackName: 'Clickstream-ETL-6666-6666',
                    Tags: Tags,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-pipeline-stack.template.json',
                  },
                },
                End: true,
                Type: 'Stack',
              },
            },
          },
          {
            StartAt: 'DataAnalytics',
            States: {
              DataAnalytics: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: MSK_ETL_NEW_SERVERLESS_DATAANALYTICS_PARAMETERS,
                    StackName: 'Clickstream-DataAnalytics-6666-6666',
                    Tags: Tags,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-analytics-redshift-stack.template.json',
                  },
                },
                End: true,
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
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: BASE_METRICS_PARAMETERS,
                    StackName: 'Clickstream-Metrics-6666-6666',
                    Tags: Tags,
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
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-kinesis ON_DEMAND + ETL + new redshift', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock, ec2Mock, sfnMock, secretsManagerMock, {
      publicAZContainPrivateAZ: true,
      subnetsCross3AZ: true,
    });
    const pipeline: CPipeline = new CPipeline(KINESIS_ETL_NEW_REDSHIFT_PIPELINE);
    const wf = await pipeline.generateWorkflow();
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
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: INGESTION_KINESIS_ON_DEMAND_PARAMETERS,
                    StackName: 'Clickstream-Ingestion-kinesis-6666-6666',
                    Tags: Tags,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kinesis-stack.template.json',
                  },
                },
                End: true,
                Type: 'Stack',
              },
            },
          },
          {
            StartAt: 'ETL',
            States: {
              ETL: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: ETL_PLUGIN3_PARAMETERS,
                    StackName: 'Clickstream-ETL-6666-6666',
                    Tags: Tags,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-pipeline-stack.template.json',
                  },
                },
                End: true,
                Type: 'Stack',
              },
            },
          },
          {
            StartAt: 'DataAnalytics',
            States: {
              DataAnalytics: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: MSK_ETL_NEW_SERVERLESS_DATAANALYTICS_PARAMETERS,
                    StackName: 'Clickstream-DataAnalytics-6666-6666',
                    Tags: Tags,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-analytics-redshift-stack.template.json',
                  },
                },
                End: true,
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
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: BASE_METRICS_PARAMETERS,
                    StackName: 'Clickstream-Metrics-6666-6666',
                    Tags: Tags,
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
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-kinesis ON_DEMAND + ETL + provisioned redshift', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock, ec2Mock, sfnMock, secretsManagerMock, {
      publicAZContainPrivateAZ: true,
    });
    const pipeline: CPipeline = new CPipeline(KINESIS_ETL_PROVISIONED_REDSHIFT_PIPELINE);
    const wf = await pipeline.generateWorkflow();
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
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: INGESTION_KINESIS_ON_DEMAND_PARAMETERS,
                    StackName: 'Clickstream-Ingestion-kinesis-6666-6666',
                    Tags: Tags,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kinesis-stack.template.json',
                  },
                },
                End: true,
                Type: 'Stack',
              },
            },
          },
          {
            StartAt: 'ETL',
            States: {
              ETL: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: ETL_PLUGIN3_PARAMETERS,
                    StackName: 'Clickstream-ETL-6666-6666',
                    Tags: Tags,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-pipeline-stack.template.json',
                  },
                },
                End: true,
                Type: 'Stack',
              },
            },
          },
          {
            StartAt: 'DataAnalytics',
            States: {
              DataAnalytics: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: MSK_ETL_PROVISIONED_REDSHIFT_DATAANALYTICS_PARAMETERS,
                    StackName: 'Clickstream-DataAnalytics-6666-6666',
                    Tags: Tags,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-analytics-redshift-stack.template.json',
                  },
                },
                End: true,
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
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: BASE_METRICS_PARAMETERS,
                    StackName: 'Clickstream-Metrics-6666-6666',
                    Tags: Tags,
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
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-kinesis ON_DEMAND + ETL + provisioned redshift + quicksight', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock, ec2Mock, sfnMock, secretsManagerMock, {
      publicAZContainPrivateAZ: true,
    });
    const pipeline: CPipeline = new CPipeline(KINESIS_ETL_PROVISIONED_REDSHIFT_QUICKSIGHT_PIPELINE);
    const wf = await pipeline.generateWorkflow();
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
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: INGESTION_KINESIS_ON_DEMAND_PARAMETERS,
                    StackName: 'Clickstream-Ingestion-kinesis-6666-6666',
                    Tags: Tags,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kinesis-stack.template.json',
                  },
                },
                End: true,
                Type: 'Stack',
              },
            },
          },
          {
            StartAt: 'ETL',
            States: {
              ETL: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: ETL_PLUGIN3_PARAMETERS,
                    StackName: 'Clickstream-ETL-6666-6666',
                    Tags: Tags,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-pipeline-stack.template.json',
                  },
                },
                End: true,
                Type: 'Stack',
              },
            },
          },
          {
            StartAt: 'DataAnalytics',
            States: {
              DataAnalytics: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: MSK_ETL_PROVISIONED_REDSHIFT_DATAANALYTICS_PARAMETERS,
                    StackName: 'Clickstream-DataAnalytics-6666-6666',
                    Tags: Tags,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-analytics-redshift-stack.template.json',
                  },
                },
                Next: 'Report',
                Type: 'Stack',
              },
              Report: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: REPORT_WITH_PROVISIONED_REDSHIFT_PARAMETERS,
                    StackName: 'Clickstream-Report-6666-6666',
                    Tags: Tags,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-reporting-quicksight-stack.template.json',
                  },
                },
                End: true,
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
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: BASE_METRICS_PARAMETERS,
                    StackName: 'Clickstream-Metrics-6666-6666',
                    Tags: Tags,
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
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-kinesis ON_DEMAND + ETL + new redshift + quicksight', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock, ec2Mock, sfnMock, secretsManagerMock, {
      publicAZContainPrivateAZ: true,
      subnetsCross3AZ: true,
    });
    const pipeline: CPipeline = new CPipeline(KINESIS_ETL_NEW_REDSHIFT_QUICKSIGHT_PIPELINE);
    const wf = await pipeline.generateWorkflow();
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
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: INGESTION_KINESIS_ON_DEMAND_PARAMETERS,
                    StackName: 'Clickstream-Ingestion-kinesis-6666-6666',
                    Tags: Tags,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kinesis-stack.template.json',
                  },
                },
                End: true,
                Type: 'Stack',
              },
            },
          },
          {
            StartAt: 'ETL',
            States: {
              ETL: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: ETL_PLUGIN3_PARAMETERS,
                    StackName: 'Clickstream-ETL-6666-6666',
                    Tags: Tags,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-pipeline-stack.template.json',
                  },
                },
                End: true,
                Type: 'Stack',
              },
            },
          },
          {
            StartAt: 'DataAnalytics',
            States: {
              DataAnalytics: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: MSK_ETL_NEW_SERVERLESS_DATAANALYTICS_PARAMETERS,
                    StackName: 'Clickstream-DataAnalytics-6666-6666',
                    Tags: Tags,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-analytics-redshift-stack.template.json',
                  },
                },
                Next: 'Report',
                Type: 'Stack',
              },
              Report: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: REPORT_WITH_NEW_REDSHIFT_PARAMETERS,
                    StackName: 'Clickstream-Report-6666-6666',
                    Tags: Tags,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-reporting-quicksight-stack.template.json',
                  },
                },
                End: true,
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
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: BASE_METRICS_PARAMETERS,
                    StackName: 'Clickstream-Metrics-6666-6666',
                    Tags: Tags,
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
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow allow app id is empty', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock, ec2Mock, sfnMock, secretsManagerMock, {
      publicAZContainPrivateAZ: true,
      subnetsCross3AZ: true,
      subnetsIsolated: true,
      noApp: true,
    });
    const pipeline: CPipeline = new CPipeline(MSK_ETL_NEW_SERVERLESS_PIPELINE);
    const wf = await pipeline.generateWorkflow();
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
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: INGESTION_MSK_PARAMETERS,
                    StackName: 'Clickstream-Ingestion-kafka-6666-6666',
                    Tags: Tags,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kafka-stack.template.json',
                  },
                },
                Next: 'KafkaConnector',
                Type: 'Stack',
              },
              KafkaConnector: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: BASE_KAFKACONNECTOR_BATCH_MSK_PARAMETERS,
                    StackName: 'Clickstream-KafkaConnector-6666-6666',
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
            StartAt: 'ETL',
            States: {
              ETL: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: ETL_PLUGIN4_PARAMETERS,
                    StackName: 'Clickstream-ETL-6666-6666',
                    Tags: Tags,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-pipeline-stack.template.json',
                  },
                },
                End: true,
                Type: 'Stack',
              },
            },
          },
          {
            StartAt: 'DataAnalytics',
            States: {
              DataAnalytics: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: mergeParameters(
                      MSK_ETL_NEW_SERVERLESS_DATAANALYTICS_PARAMETERS,
                      [
                        {
                          ParameterKey: 'AppIds',
                          ParameterValue: '',
                        },
                      ],
                    ),
                    StackName: 'Clickstream-DataAnalytics-6666-6666',
                    Tags: Tags,
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-analytics-redshift-stack.template.json',
                  },
                },
                End: true,
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
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: BASE_METRICS_PARAMETERS,
                    StackName: 'Clickstream-Metrics-6666-6666',
                    Tags: Tags,
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

    expect(wf).toEqual(expected);
  });
  it('Generate Retry Workflow', async () => {
    dictionaryMock(ddbMock);
    sfnMock.on(StartExecutionCommand).resolves({ executionArn: MOCK_EXECUTION_ID });
    const stackManager: StackManager = new StackManager(RETRY_PIPELINE_WITH_WORKFLOW);
    await stackManager.retryWorkflow();
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
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: 'Clickstream-Ingestion-kafka-6666-6666',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/ingestion-server-kafka-stack.template.json',
                  },
                },
                Next: 'KafkaConnector',
                Type: 'Pass',
              },
              KafkaConnector: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Update',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: 'Clickstream-KafkaConnector-6666-6666',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/kafka-s3-sink-stack.template.json',
                  },
                },
                End: true,
                Type: 'Stack',
              },
            },
          },
          {
            StartAt: 'ETL',
            States: {
              ETL: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: 'Clickstream-ETL-6666-6666',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-pipeline-stack.template.json',
                  },
                },
                End: true,
                Type: 'Pass',
              },
            },
          },
          {
            StartAt: 'DataAnalytics',
            States: {
              Report: {
                Type: 'Pass',
                Data: {
                  Input: {
                    Region: 'ap-southeast-1',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-reporting-quicksight-stack.template.json',
                    Action: 'Create',
                    Parameters: [],
                    StackName: 'Clickstream-Report-6666-6666',
                  },
                  Callback: {
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                    BucketName: 'EXAMPLE_BUCKET',
                  },
                },
                End: true,
              },
              DataAnalytics: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: 'Clickstream-DataAnalytics-6666-6666',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-analytics-redshift-stack.template.json',
                  },
                },
                Next: 'Report',
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
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: BASE_METRICS_PARAMETERS,
                    StackName: 'Clickstream-Metrics-6666-6666',
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
  it('Generate Retry Workflow with undefined stack status', async () => {
    dictionaryMock(ddbMock);
    sfnMock.on(StartExecutionCommand).resolves({ executionArn: MOCK_EXECUTION_ID });
    const stackManager: StackManager = new StackManager(RETRY_PIPELINE_WITH_WORKFLOW_AND_UNDEFINED_STATUS);
    await stackManager.retryWorkflow();
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
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Parameters: [],
                    Region: 'ap-southeast-1',
                    StackName: 'Clickstream-Ingestion-kafka-6666-6666',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/ingestion-server-kafka-stack.template.json',
                  },
                },
                Next: 'KafkaConnector',
                Type: 'Pass',
              },
              KafkaConnector: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Update',
                    Parameters: [],
                    Region: 'ap-southeast-1',
                    StackName: 'Clickstream-KafkaConnector-6666-6666',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/kafka-s3-sink-stack.template.json',
                  },
                },
                End: true,
                Type: 'Stack',
              },
            },
          },
          {
            StartAt: 'ETL',
            States: {
              ETL: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Parameters: [],
                    Region: 'ap-southeast-1',
                    StackName: 'Clickstream-ETL-6666-6666',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-pipeline-stack.template.json',
                  },
                },
                End: true,
                Type: 'Pass',
              },
            },
          },
          {
            StartAt: 'DataAnalytics',
            States: {
              DataAnalytics: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Parameters: [],
                    Region: 'ap-southeast-1',
                    StackName: 'Clickstream-DataAnalytics-6666-6666',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-analytics-redshift-stack.template.json',
                  },
                },
                Next: 'Report',
                Type: 'Pass',
              },
              Report: {
                Data: {
                  Callback: {
                    BucketName: 'cloudfront-s3-control-pl-solutionbucketlogbucket3-1d45u2r5l3wkg',
                    BucketPrefix: 'clickstream/workflow/main-d6e73fc2-6211-4013-8c4d-a539c407f834',
                  },
                  Input: {
                    Action: 'Create',
                    Parameters: [],
                    Region: 'ap-southeast-1',
                    StackName: 'Clickstream-Report-e9a8f34fbf734ca4950787f1ad818989',
                    TemplateURL: 'https://aws-gcr-solutions.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-reporting-quicksight-stack.template.json',
                  },
                },
                End: true,
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
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Create',
                    Region: 'ap-southeast-1',
                    Parameters: BASE_METRICS_PARAMETERS,
                    StackName: 'Clickstream-Metrics-6666-6666',
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
  it('Generate Delete Workflow', async () => {
    dictionaryMock(ddbMock);
    sfnMock.on(StartExecutionCommand).resolves({ executionArn: MOCK_EXECUTION_ID });
    const stackManager: StackManager = new StackManager(RETRY_PIPELINE_WITH_WORKFLOW);
    await stackManager.deleteWorkflow();
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
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Delete',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: 'Clickstream-Ingestion-kafka-6666-6666',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/ingestion-server-kafka-stack.template.json',
                  },
                },
                Next: 'KafkaConnector',
                Type: 'Stack',
              },
              KafkaConnector: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Delete',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: 'Clickstream-KafkaConnector-6666-6666',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/kafka-s3-sink-stack.template.json',
                  },
                },
                End: true,
                Type: 'Stack',
              },
            },
          },
          {
            StartAt: 'ETL',
            States: {
              ETL: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Delete',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: 'Clickstream-ETL-6666-6666',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-pipeline-stack.template.json',
                  },
                },
                End: true,
                Type: 'Stack',
              },
            },
          },
          {
            StartAt: 'DataAnalytics',
            States: {
              Report: {
                Type: 'Stack',
                Data: {
                  Input: {
                    Region: 'ap-southeast-1',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-reporting-quicksight-stack.template.json',
                    Action: 'Delete',
                    Parameters: [],
                    StackName: 'Clickstream-Report-6666-6666',
                  },
                  Callback: {
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                    BucketName: 'EXAMPLE_BUCKET',
                  },
                },
                End: true,
              },
              DataAnalytics: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Delete',
                    Region: 'ap-southeast-1',
                    Parameters: [],
                    StackName: 'Clickstream-DataAnalytics-6666-6666',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-analytics-redshift-stack.template.json',
                  },
                },
                Next: 'Report',
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
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Delete',
                    Region: 'ap-southeast-1',
                    Parameters: BASE_METRICS_PARAMETERS,
                    StackName: 'Clickstream-Metrics-6666-6666',
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
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock, ec2Mock, sfnMock, secretsManagerMock, {
      publicAZContainPrivateAZ: true,
      subnetsCross3AZ: true,
    });
    const pipeline: CPipeline = new CPipeline(S3_INGESTION_PIPELINE);
    await pipeline.generateWorkflow();
    let templateURL = await pipeline.getTemplateUrl('ingestion_s3');
    expect(templateURL).toEqual('https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-s3-stack.template.json');
    templateURL = await pipeline.getTemplateUrl('ingestion_no');
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
          prefix: 'default',
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
    createPipelineMock(ddbMock, kafkaMock, redshiftServerlessMock, redshiftMock, ec2Mock, sfnMock, secretsManagerMock, {
      publicAZContainPrivateAZ: true,
      subnetsCross3AZ: true,
    });
    const pipeline: CPipeline = new CPipeline(S3_INGESTION_PIPELINE);
    await pipeline.generateWorkflow();
    let templateURL = await pipeline.getTemplateUrl('ingestion_s3');
    expect(templateURL).toEqual('https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/ingestion-server-s3-stack.template.json');
    templateURL = await pipeline.getTemplateUrl('ingestion_no');
    expect(templateURL).toEqual(undefined);
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
            StackName: 'clickstream-sigle-test2',
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
            BucketName: 'EXAMPLE_BUCKET',
            BucketPrefix: 'clickstream/workflow/000000',
          },
        },
      },
    };
    const stackManager: StackManager = new StackManager(S3_INGESTION_PIPELINE);
    let res = await stackManager.setWorkflowType(workflowTemplate.Workflow, WorkflowStateType.PASS);
    expect(res).toEqual({
      Data: {
        Callback: {
          BucketName: 'EXAMPLE_BUCKET',
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
          StackName: 'clickstream-sigle-test2',
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
                  BucketName: 'EXAMPLE_BUCKET',
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
                  BucketName: 'EXAMPLE_BUCKET',
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
                  BucketName: 'EXAMPLE_BUCKET',
                  BucketPrefix: 'clickstream/workflow/000000',
                },
              },
              Next: 'Stack33',
            },
          },
        }],
      },
    };
    res = await stackManager.setWorkflowType(workflowTemplate.Workflow, WorkflowStateType.PASS);
    expect(res).toEqual({
      Branches: [
        {
          StartAt: 'Stack11',
          States: {
            Stack11: {
              Data: {
                Callback: {
                  BucketName: 'EXAMPLE_BUCKET',
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
                  BucketName: 'EXAMPLE_BUCKET',
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
                  BucketName: 'EXAMPLE_BUCKET',
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
                    BucketName: 'EXAMPLE_BUCKET',
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
                    BucketName: 'EXAMPLE_BUCKET',
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
                    BucketName: 'EXAMPLE_BUCKET',
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
    res = await stackManager.setWorkflowType(workflowTemplate.Workflow, WorkflowStateType.PASS);
    expect(res).toEqual({
      Branches: [
        {
          StartAt: 'Stack11',
          States: {
            Stack11: {
              Data: {
                Callback: {
                  BucketName: 'EXAMPLE_BUCKET',
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
                  BucketName: 'EXAMPLE_BUCKET',
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
                  BucketName: 'EXAMPLE_BUCKET',
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
                    BucketName: 'EXAMPLE_BUCKET',
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
                    BucketName: 'EXAMPLE_BUCKET',
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
                    BucketName: 'EXAMPLE_BUCKET',
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
                    BucketName: 'EXAMPLE_BUCKET',
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
    res = await stackManager.setWorkflowType(workflowTemplate.Workflow, WorkflowStateType.PASS);
    expect(res).toEqual({
      Branches: [
        {
          StartAt: 'Stack11',
          States: {
            Stack11: {
              Data: {
                Callback: {
                  BucketName: 'EXAMPLE_BUCKET',
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
                  BucketName: 'EXAMPLE_BUCKET',
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
                  BucketName: 'EXAMPLE_BUCKET',
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
                  BucketName: 'EXAMPLE_BUCKET',
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

  afterAll((done) => {
    server.close();
    done();
  });
});