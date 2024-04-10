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

import { Parameter } from '@aws-sdk/client-cloudformation';
import { CloudWatchEventsClient } from '@aws-sdk/client-cloudwatch-events';
import { EC2Client } from '@aws-sdk/client-ec2';
import {
  IAMClient,
} from '@aws-sdk/client-iam';
import { KafkaClient } from '@aws-sdk/client-kafka';
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
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import cloneDeep from 'lodash/cloneDeep';
import 'aws-sdk-client-mock-jest';
import {
  MOCK_PROJECT_ID,
  createPipelineMock,
  createPipelineMockForBJSRegion,
  dictionaryMock,
} from './ddb-mock';
import {
  KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE,
  KINESIS_DATA_PROCESSING_NEW_REDSHIFT_QUICKSIGHT_PIPELINE, KINESIS_DATA_PROCESSING_NEW_REDSHIFT_QUICKSIGHT_PIPELINE_CN,
} from './pipeline-mock';
import {
  APPREGISTRY_APPLICATION_ARN_PARAMETER,
  APPREGISTRY_APPLICATION_EMPTY_ARN_PARAMETER,
  BASE_METRICS_PARAMETERS,
  DATA_PROCESSING_PLUGIN3_PARAMETERS,
  INGESTION_KINESIS_ON_DEMAND_PARAMETERS,
  MSK_DATA_PROCESSING_NEW_SERVERLESS_DATAANALYTICS_PARAMETERS,
  REPORTING_WITH_NEW_REDSHIFT_PARAMETERS,
  mergeParameters,
  removeParameters,
} from './workflow-mock';
import { FULL_SOLUTION_VERSION } from '../../common/constants';
// eslint-disable-next-line import/order
import { OUTPUT_SERVICE_CATALOG_APPREGISTRY_APPLICATION_TAG_KEY, OUTPUT_SERVICE_CATALOG_APPREGISTRY_APPLICATION_TAG_VALUE } from '@aws/clickstream-base-lib';
import { BuiltInTagKeys } from '../../common/model-ln';
import { SolutionInfo, SolutionVersion } from '../../common/solution-info-ln';
import { getStackPrefix } from '../../common/utils';
import { server } from '../../index';
import { CPipeline } from '../../model/pipeline';

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
};

const InitTags = [
  {
    Key: BuiltInTagKeys.AWS_SOLUTION,
    Value: SolutionInfo.SOLUTION_SHORT_NAME,
  },
  {
    Key: BuiltInTagKeys.AWS_SOLUTION_VERSION,
    Value: FULL_SOLUTION_VERSION,
  },
  {
    Key: BuiltInTagKeys.CLICKSTREAM_PROJECT,
    Value: MOCK_PROJECT_ID,
  },
  {
    Key: 'customerKey1',
    Value: 'tagValue1',
  },
  {
    Key: 'customerKey2',
    Value: 'tagValue2',
  },
];

const appRegistryApplicationTag = {
  Key: `#.Clickstream-ServiceCatalogAppRegistry-6666-6666.${OUTPUT_SERVICE_CATALOG_APPREGISTRY_APPLICATION_TAG_KEY}`,
  Value: `#.Clickstream-ServiceCatalogAppRegistry-6666-6666.${OUTPUT_SERVICE_CATALOG_APPREGISTRY_APPLICATION_TAG_VALUE}`,
};

const Tags = [
  ...InitTags,
  appRegistryApplicationTag,
];

const IngestionStack = {
  Data: {
    Callback: {
      BucketName: 'TEST_EXAMPLE_BUCKET',
      BucketPrefix: 'clickstream/workflow/main-3333-3333',
    },
    Input: {
      Action: 'Create',
      Region: 'ap-southeast-1',
      Parameters: [
        ...INGESTION_KINESIS_ON_DEMAND_PARAMETERS,
        APPREGISTRY_APPLICATION_ARN_PARAMETER,
      ],
      StackName: `${getStackPrefix()}-Ingestion-kinesis-6666-6666`,
      Tags: InitTags,
      TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kinesis-stack.template.json',
    },
  },
  End: true,
  Type: 'Stack',
};

const IngestionStackCn = {
  Data: {
    Callback: {
      BucketName: 'TEST_EXAMPLE_BUCKET',
      BucketPrefix: 'clickstream/workflow/main-3333-3333',
    },
    Input: {
      Action: 'Create',
      Region: 'cn-north-1',
      Parameters: [
        ...INGESTION_KINESIS_ON_DEMAND_PARAMETERS,
        APPREGISTRY_APPLICATION_EMPTY_ARN_PARAMETER,
      ],
      StackName: `${getStackPrefix()}-Ingestion-kinesis-6666-6666`,
      Tags: InitTags,
      TemplateURL: 'https://EXAMPLE-BUCKET.s3.cn-north-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kinesis-stack.template.json',
    },
  },
  End: true,
  Type: 'Stack',
};

const DataProcessingStack = {
  Data: {
    Callback: {
      BucketName: 'TEST_EXAMPLE_BUCKET',
      BucketPrefix: 'clickstream/workflow/main-3333-3333',
    },
    Input: {
      Action: 'Create',
      Region: 'ap-southeast-1',
      Parameters: [
        ...DATA_PROCESSING_PLUGIN3_PARAMETERS,
        APPREGISTRY_APPLICATION_ARN_PARAMETER,
      ],
      StackName: `${getStackPrefix()}-DataProcessing-6666-6666`,
      Tags: InitTags,
      TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-pipeline-stack.template.json',
    },
  },
  Next: 'DataModelingRedshift',
  Type: 'Stack',
};

const DataProcessingStackCn = {
  Data: {
    Callback: {
      BucketName: 'TEST_EXAMPLE_BUCKET',
      BucketPrefix: 'clickstream/workflow/main-3333-3333',
    },
    Input: {
      Action: 'Create',
      Region: 'cn-north-1',
      Parameters: [
        ...DATA_PROCESSING_PLUGIN3_PARAMETERS,
        APPREGISTRY_APPLICATION_EMPTY_ARN_PARAMETER,
      ],
      StackName: `${getStackPrefix()}-DataProcessing-6666-6666`,
      Tags: InitTags,
      TemplateURL: 'https://EXAMPLE-BUCKET.s3.cn-north-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-pipeline-stack.template.json',
    },
  },
  Next: 'DataModelingRedshift',
  Type: 'Stack',
};

const DataModelingRedshiftStack = {
  Data: {
    Callback: {
      BucketName: 'TEST_EXAMPLE_BUCKET',
      BucketPrefix: 'clickstream/workflow/main-3333-3333',
    },
    Input: {
      Action: 'Create',
      Region: 'ap-southeast-1',
      Parameters: [
        ...MSK_DATA_PROCESSING_NEW_SERVERLESS_DATAANALYTICS_PARAMETERS,
        APPREGISTRY_APPLICATION_ARN_PARAMETER,
      ],
      StackName: `${getStackPrefix()}-DataModelingRedshift-6666-6666`,
      Tags: InitTags,
      TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-analytics-redshift-stack.template.json',
    },
  },
  Next: 'Reporting',
  Type: 'Stack',
};

const DataModelingRedshiftStackCn = {
  Data: {
    Callback: {
      BucketName: 'TEST_EXAMPLE_BUCKET',
      BucketPrefix: 'clickstream/workflow/main-3333-3333',
    },
    Input: {
      Action: 'Create',
      Region: 'cn-north-1',
      Parameters: [
        ...MSK_DATA_PROCESSING_NEW_SERVERLESS_DATAANALYTICS_PARAMETERS,
        APPREGISTRY_APPLICATION_EMPTY_ARN_PARAMETER,
      ],
      StackName: `${getStackPrefix()}-DataModelingRedshift-6666-6666`,
      Tags: InitTags,
      TemplateURL: 'https://EXAMPLE-BUCKET.s3.cn-north-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-analytics-redshift-stack.template.json',
    },
  },
  Next: 'Reporting',
  Type: 'Stack',
};

const ReportingStack = {
  Data: {
    Callback: {
      BucketName: 'TEST_EXAMPLE_BUCKET',
      BucketPrefix: 'clickstream/workflow/main-3333-3333',
    },
    Input: {
      Action: 'Create',
      Region: 'ap-southeast-1',
      Parameters: [
        ...REPORTING_WITH_NEW_REDSHIFT_PARAMETERS,
        APPREGISTRY_APPLICATION_ARN_PARAMETER,
      ],
      StackName: `${getStackPrefix()}-Reporting-6666-6666`,
      Tags: InitTags,
      TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-reporting-quicksight-stack.template.json',
    },
  },
  End: true,
  Type: 'Stack',
};

const ReportingStackCn = {
  Data: {
    Callback: {
      BucketName: 'TEST_EXAMPLE_BUCKET',
      BucketPrefix: 'clickstream/workflow/main-3333-3333',
    },
    Input: {
      Action: 'Create',
      Region: 'cn-north-1',
      Parameters: [
        ...REPORTING_WITH_NEW_REDSHIFT_PARAMETERS,
        APPREGISTRY_APPLICATION_EMPTY_ARN_PARAMETER,
      ],
      StackName: `${getStackPrefix()}-Reporting-6666-6666`,
      Tags: InitTags,
      TemplateURL: 'https://EXAMPLE-BUCKET.s3.cn-north-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/data-reporting-quicksight-stack.template.json',
    },
  },
  End: true,
  Type: 'Stack',
};

const MetricsStack = {
  Data: {
    Callback: {
      BucketName: 'TEST_EXAMPLE_BUCKET',
      BucketPrefix: 'clickstream/workflow/main-3333-3333',
    },
    Input: {
      Action: 'Create',
      Region: 'ap-southeast-1',
      Parameters: [
        ...BASE_METRICS_PARAMETERS,
        APPREGISTRY_APPLICATION_ARN_PARAMETER,
      ],
      StackName: `${getStackPrefix()}-Metrics-6666-6666`,
      Tags: InitTags,
      TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/metrics-stack.template.json',
    },
  },
  End: true,
  Type: 'Stack',
};

const MetricsStackCn = {
  Data: {
    Callback: {
      BucketName: 'TEST_EXAMPLE_BUCKET',
      BucketPrefix: 'clickstream/workflow/main-3333-3333',
    },
    Input: {
      Action: 'Create',
      Region: 'cn-north-1',
      Parameters: [
        ...BASE_METRICS_PARAMETERS,
        APPREGISTRY_APPLICATION_EMPTY_ARN_PARAMETER,
      ],
      StackName: `${getStackPrefix()}-Metrics-6666-6666`,
      Tags: InitTags,
      TemplateURL: 'https://EXAMPLE-BUCKET.s3.cn-north-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/metrics-stack.template.json',
    },
  },
  End: true,
  Type: 'Stack',
};

const ServiceCatalogAppRegistryStack = {
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
          ParameterKey: 'ProjectId',
          ParameterValue: 'project_8888_8888',
        },
      ],
      StackName: `${getStackPrefix()}-ServiceCatalogAppRegistry-6666-6666`,
      Tags: InitTags,
      TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/service-catalog-appregistry-stack.template.json',
    },
  },
  Next: 'PipelineStacks',
  Type: 'Stack',
};

const ServiceCatalogAppRegistryStackCn = {
  Data: {
    Callback: {
      BucketName: 'TEST_EXAMPLE_BUCKET',
      BucketPrefix: 'clickstream/workflow/main-3333-3333',
    },
    Input: {
      Action: 'Create',
      Region: 'cn-north-1',
      Parameters: [
        {
          ParameterKey: 'ProjectId',
          ParameterValue: 'project_8888_8888',
        },
      ],
      StackName: `${getStackPrefix()}-ServiceCatalogAppRegistry-6666-6666`,
      Tags: InitTags,
      TemplateURL: 'https://EXAMPLE-BUCKET.s3.cn-north-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/service-catalog-appregistry-stack.template.json',
    },
  },
  Next: 'PipelineStacks',
  Type: 'Stack',
};

function removeParametersFromStack(stack: any, parameters: Parameter[]) {
  const newStack = cloneDeep(stack);
  newStack.Data.Input.Parameters = removeParameters(newStack.Data.Input.Parameters, parameters);
  return newStack;
}

function mergeParametersFromStack(stack: any, parameters: Parameter[]) {
  const newStack = cloneDeep(stack);
  newStack.Data.Input.Parameters = mergeParameters(newStack.Data.Input.Parameters, parameters);
  return newStack;
}

function setTagsToStack(stack: any, tags: any[]) {
  const newStack = cloneDeep(stack);
  newStack.Data.Input.Tags = tags;
  return newStack;
}

describe('Workflow test with pipeline version', () => {
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

  it('Generate workflow current version', async () => {
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
    const wf = await pipeline.generateWorkflow();
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              PipelineStacks: {
                Branches: [
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: setTagsToStack(IngestionStack, Tags),
                    },
                  },
                  {
                    StartAt: 'DataProcessing',
                    States: {
                      DataProcessing: setTagsToStack(DataProcessingStack, Tags),
                      DataModelingRedshift: setTagsToStack(DataModelingRedshiftStack, Tags),
                      Reporting: setTagsToStack(ReportingStack, Tags),
                    },
                  },
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: setTagsToStack(MetricsStack, Tags),
                    },
                  },
                ],
                End: true,
                Type: 'Parallel',
              },
              ServiceCatalogAppRegistry: ServiceCatalogAppRegistryStack,
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });

  it('Generate workflow v1.0.0', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      subnetsCross3AZ: true,
      noVpcEndpoint: true,
    });
    const pipeline: CPipeline = new CPipeline({
      ...cloneDeep(KINESIS_DATA_PROCESSING_NEW_REDSHIFT_QUICKSIGHT_PIPELINE),
      templateVersion: SolutionVersion.V_1_0_0.fullVersion,
    });
    const wf = await pipeline.generateWorkflow();
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              PipelineStacks: {
                Branches: [
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: removeParametersFromStack(IngestionStack, [
                        {
                          ParameterKey: 'AppRegistryApplicationArn.#',
                        },
                      ],
                      ),
                    },
                  },
                  {
                    StartAt: 'DataProcessing',
                    States: {
                      DataProcessing: removeParametersFromStack(
                        mergeParametersFromStack(
                          DataProcessingStack, [
                            {
                              ParameterKey: 'TransformerAndEnrichClassNames',
                              ParameterValue: 'software.aws.solution.clickstream.Transformer,software.aws.solution.clickstream.UAEnrichment,software.aws.solution.clickstream.IPEnrichment,test.aws.solution.main',
                            },
                          ],
                        ),
                        [
                          {
                            ParameterKey: 'AppRegistryApplicationArn.#',
                          },
                        ],
                      ),
                      DataModelingRedshift: removeParametersFromStack(
                        DataModelingRedshiftStack,
                        [
                          {
                            ParameterKey: 'PipelineS3Bucket',
                          },
                          {
                            ParameterKey: 'PipelineS3Prefix',
                          },
                          {
                            ParameterKey: 'SegmentsS3Prefix',
                          },
                          {
                            ParameterKey: 'ClickstreamAnalyticsMetadataDdbArn',
                          },
                          {
                            ParameterKey: 'ClickstreamMetadataDdbArn',
                          },
                          {
                            ParameterKey: 'AppRegistryApplicationArn.#',
                          },
                          {
                            ParameterKey: 'TimeZoneWithAppId',
                          },
                        ],
                      ),
                      Reporting: removeParametersFromStack(ReportingStack, [
                        {
                          ParameterKey: 'QuickSightOwnerPrincipalParam',
                        },
                        {
                          ParameterKey: 'AppRegistryApplicationArn.#',
                        },
                        {
                          ParameterKey: 'QuickSightTimezoneParam',
                        },
                      ],
                      ),
                    },
                  },
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: removeParametersFromStack(MetricsStack, [
                        {
                          ParameterKey: 'AppRegistryApplicationArn.#',
                        },
                      ]),
                    },
                  },
                ],
                End: true,
                Type: 'Parallel',
              },
              ServiceCatalogAppRegistry: ServiceCatalogAppRegistryStack,
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });

  it('Generate workflow v1.1.0', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      subnetsCross3AZ: true,
      noVpcEndpoint: true,
    });
    const pipeline: CPipeline = new CPipeline({
      ...cloneDeep(KINESIS_DATA_PROCESSING_NEW_REDSHIFT_QUICKSIGHT_PIPELINE),
      templateVersion: SolutionVersion.V_1_1_0.fullVersion,
    });
    const wf = await pipeline.generateWorkflow();
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              PipelineStacks: {
                Branches: [
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: IngestionStack,
                    },
                  },
                  {
                    StartAt: 'DataProcessing',
                    States: {
                      DataProcessing: mergeParametersFromStack(DataProcessingStack, [
                        {
                          ParameterKey: 'TransformerAndEnrichClassNames',
                          ParameterValue: 'software.aws.solution.clickstream.TransformerV2,software.aws.solution.clickstream.UAEnrichment,software.aws.solution.clickstream.IPEnrichment,test.aws.solution.main',
                        },
                      ],
                      ),
                      DataModelingRedshift: removeParametersFromStack(
                        DataModelingRedshiftStack,
                        [
                          {
                            ParameterKey: 'ClickstreamMetadataDdbArn',
                          },
                          {
                            ParameterKey: 'SegmentsS3Prefix',
                          },
                          {
                            ParameterKey: 'TimeZoneWithAppId',
                          },
                        ],
                      ),
                      Reporting: removeParametersFromStack(
                        mergeParametersFromStack(ReportingStack, [
                          {
                            ParameterKey: 'QuickSightOwnerPrincipalParam',
                            ParameterValue: 'arn:aws:quicksight:us-east-1:555555555555:user/default/QuickSightEmbeddingRole/ClickstreamExploreUser',
                          },
                        ],
                        ), [
                          {
                            ParameterKey: 'QuickSightTimezoneParam',
                          },
                        ]),
                    },
                  },
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: MetricsStack,
                    },
                  },
                ],
                End: true,
                Type: 'Parallel',
              },
              ServiceCatalogAppRegistry: ServiceCatalogAppRegistryStack,
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });

  it('Generate workflow v1.1.5', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      subnetsCross3AZ: true,
      noVpcEndpoint: true,
    });
    const pipeline: CPipeline = new CPipeline({
      ...cloneDeep(KINESIS_DATA_PROCESSING_NEW_REDSHIFT_QUICKSIGHT_PIPELINE),
      templateVersion: SolutionVersion.V_1_1_5.fullVersion,
    });
    const wf = await pipeline.generateWorkflow();
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              PipelineStacks: {
                Branches: [
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: IngestionStack,
                    },
                  },
                  {
                    StartAt: 'DataProcessing',
                    States: {
                      DataProcessing: mergeParametersFromStack(DataProcessingStack, [
                        {
                          ParameterKey: 'TransformerAndEnrichClassNames',
                          ParameterValue: 'software.aws.solution.clickstream.TransformerV2,software.aws.solution.clickstream.UAEnrichment,software.aws.solution.clickstream.IPEnrichment,test.aws.solution.main',
                        },
                      ],
                      ),
                      DataModelingRedshift: removeParametersFromStack(
                        DataModelingRedshiftStack,
                        [
                          {
                            ParameterKey: 'ClickstreamMetadataDdbArn',
                          },
                          {
                            ParameterKey: 'SegmentsS3Prefix',
                          },
                          {
                            ParameterKey: 'TimeZoneWithAppId',
                          },
                        ],
                      ),
                      Reporting: removeParametersFromStack(
                        ReportingStack,
                        [
                          {
                            ParameterKey: 'QuickSightTimezoneParam',
                          },
                        ],
                      ),
                    },
                  },
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: MetricsStack,
                    },
                  },
                ],
                End: true,
                Type: 'Parallel',
              },
              ServiceCatalogAppRegistry: ServiceCatalogAppRegistryStack,
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });

  it('Generate workflow v1.1.6', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      subnetsCross3AZ: true,
      noVpcEndpoint: true,
    });
    const pipeline: CPipeline = new CPipeline({
      ...cloneDeep(KINESIS_DATA_PROCESSING_NEW_REDSHIFT_QUICKSIGHT_PIPELINE),
      templateVersion: SolutionVersion.V_1_1_6.fullVersion,
    });
    const wf = await pipeline.generateWorkflow();
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              PipelineStacks: {
                Branches: [
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: IngestionStack,
                    },
                  },
                  {
                    StartAt: 'DataProcessing',
                    States: {
                      DataProcessing: DataProcessingStack,
                      DataModelingRedshift: DataModelingRedshiftStack,
                      Reporting: ReportingStack,
                    },
                  },
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: MetricsStack,
                    },
                  },
                ],
                End: true,
                Type: 'Parallel',
              },
              ServiceCatalogAppRegistry: ServiceCatalogAppRegistryStack,
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });
});

describe('Workflow test with pipeline version in China region', () => {
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
    process.env.AWS_REGION='cn-north-1';
  });

  afterEach(() => {
    process.env.AWS_REGION=undefined;
  });

  afterAll((done) => {
    server.close();
    done();
  });

  it('Generate workflow current version in China region', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      subnetsCross3AZ: true,
      noVpcEndpoint: true,
      bucket: {
        location: BucketLocationConstraint.cn_north_1,
      },
    });
    createPipelineMockForBJSRegion(s3Mock);
    const pipeline: CPipeline = new CPipeline({
      ...cloneDeep(KINESIS_DATA_PROCESSING_NEW_REDSHIFT_QUICKSIGHT_PIPELINE_CN),
      templateVersion: FULL_SOLUTION_VERSION,
      region: 'cn-north-1',
    });
    const wf = await pipeline.generateWorkflow();
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              PipelineStacks: {
                Branches: [
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: setTagsToStack(IngestionStackCn, Tags),
                    },
                  },
                  {
                    StartAt: 'DataProcessing',
                    States: {
                      DataProcessing: setTagsToStack(DataProcessingStackCn, Tags),
                      DataModelingRedshift: setTagsToStack(DataModelingRedshiftStackCn, Tags),
                      Reporting: mergeParametersFromStack(
                        setTagsToStack(ReportingStackCn, Tags),
                        [
                          {
                            ParameterKey: 'QuickSightUserParam',
                            ParameterValue: 'GCRUser',
                          },
                          {
                            ParameterKey: 'QuickSightPrincipalParam',
                            ParameterValue: 'arn:aws-cn:quicksight:cn-north-1:555555555555:user/default/GCRUser',
                          },
                          {
                            ParameterKey: 'QuickSightOwnerPrincipalParam',
                            ParameterValue: 'arn:aws-cn:quicksight:cn-north-1:555555555555:user/default/GCRUser',
                          },
                        ]),
                    },
                  },
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: setTagsToStack(MetricsStackCn, Tags),
                    },
                  },
                ],
                End: true,
                Type: 'Parallel',
              },
              ServiceCatalogAppRegistry: ServiceCatalogAppRegistryStackCn,
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });

  it('Generate workflow v1.0.0 in China region', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      subnetsCross3AZ: true,
      noVpcEndpoint: true,
      bucket: {
        location: BucketLocationConstraint.cn_north_1,
      },
    });
    createPipelineMockForBJSRegion(s3Mock);
    const pipeline: CPipeline = new CPipeline({
      ...cloneDeep(KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE),
      templateVersion: SolutionVersion.V_1_0_0.fullVersion,
      region: 'cn-north-1',
    });
    const wf = await pipeline.generateWorkflow();
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              PipelineStacks: {
                Branches: [
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: removeParametersFromStack(IngestionStackCn, [
                        {
                          ParameterKey: 'AppRegistryApplicationArn',
                        },
                      ],
                      ),
                    },
                  },
                  {
                    StartAt: 'DataProcessing',
                    States: {
                      DataProcessing: removeParametersFromStack(
                        mergeParametersFromStack(
                          DataProcessingStackCn, [
                            {
                              ParameterKey: 'TransformerAndEnrichClassNames',
                              ParameterValue: 'software.aws.solution.clickstream.Transformer,software.aws.solution.clickstream.UAEnrichment,software.aws.solution.clickstream.IPEnrichment,test.aws.solution.main',
                            },
                          ],
                        ),
                        [
                          {
                            ParameterKey: 'AppRegistryApplicationArn',
                          },
                        ],
                      ),
                      DataModelingRedshift: removeParametersFromStack(
                        {
                          Data: DataModelingRedshiftStackCn.Data,
                          End: true,
                          Type: 'Stack',
                        },
                        [
                          {
                            ParameterKey: 'PipelineS3Bucket',
                          },
                          {
                            ParameterKey: 'PipelineS3Prefix',
                          },
                          {
                            ParameterKey: 'SegmentsS3Prefix',
                          },
                          {
                            ParameterKey: 'ClickstreamAnalyticsMetadataDdbArn',
                          },
                          {
                            ParameterKey: 'ClickstreamMetadataDdbArn',
                          },
                          {
                            ParameterKey: 'AppRegistryApplicationArn',
                          },
                          {
                            ParameterKey: 'TimeZoneWithAppId',
                          },
                        ],
                      ),
                    },
                  },
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: removeParametersFromStack(MetricsStackCn, [
                        {
                          ParameterKey: 'AppRegistryApplicationArn',
                        },
                      ]),
                    },
                  },
                ],
                End: true,
                Type: 'Parallel',
              },
              ServiceCatalogAppRegistry: ServiceCatalogAppRegistryStackCn,
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });

  it('Generate workflow v1.1.0 in China region', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      subnetsCross3AZ: true,
      noVpcEndpoint: true,
      bucket: {
        location: BucketLocationConstraint.cn_north_1,
      },
    });
    createPipelineMockForBJSRegion(s3Mock);
    const pipeline: CPipeline = new CPipeline({
      ...cloneDeep(KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE),
      templateVersion: SolutionVersion.V_1_1_0.fullVersion,
      region: 'cn-north-1',
    });
    const wf = await pipeline.generateWorkflow();
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              PipelineStacks: {
                Branches: [
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: IngestionStackCn,
                    },
                  },
                  {
                    StartAt: 'DataProcessing',
                    States: {
                      DataProcessing: mergeParametersFromStack(DataProcessingStackCn, [
                        {
                          ParameterKey: 'TransformerAndEnrichClassNames',
                          ParameterValue: 'software.aws.solution.clickstream.TransformerV2,software.aws.solution.clickstream.UAEnrichment,software.aws.solution.clickstream.IPEnrichment,test.aws.solution.main',
                        },
                      ],
                      ),
                      DataModelingRedshift: removeParametersFromStack(
                        {
                          Data: DataModelingRedshiftStackCn.Data,
                          End: true,
                          Type: 'Stack',
                        },
                        [
                          {
                            ParameterKey: 'SegmentsS3Prefix',
                          },
                          {
                            ParameterKey: 'ClickstreamMetadataDdbArn',
                          },
                          {
                            ParameterKey: 'TimeZoneWithAppId',
                          },
                        ],
                      ),
                    },
                  },
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: MetricsStackCn,
                    },
                  },
                ],
                End: true,
                Type: 'Parallel',
              },
              ServiceCatalogAppRegistry: ServiceCatalogAppRegistryStackCn,
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });

  it('Generate workflow v1.1.5 in China region', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      subnetsCross3AZ: true,
      noVpcEndpoint: true,
      bucket: {
        location: BucketLocationConstraint.cn_north_1,
      },
    });
    createPipelineMockForBJSRegion(s3Mock);
    const pipeline: CPipeline = new CPipeline({
      ...cloneDeep(KINESIS_DATA_PROCESSING_NEW_REDSHIFT_QUICKSIGHT_PIPELINE_CN),
      templateVersion: SolutionVersion.V_1_1_5.fullVersion,
      region: 'cn-north-1',
    });
    const wf = await pipeline.generateWorkflow();
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              PipelineStacks: {
                Branches: [
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: IngestionStackCn,
                    },
                  },
                  {
                    StartAt: 'DataProcessing',
                    States: {
                      DataProcessing: mergeParametersFromStack(DataProcessingStackCn, [
                        {
                          ParameterKey: 'TransformerAndEnrichClassNames',
                          ParameterValue: 'software.aws.solution.clickstream.TransformerV2,software.aws.solution.clickstream.UAEnrichment,software.aws.solution.clickstream.IPEnrichment,test.aws.solution.main',
                        },
                      ],
                      ),
                      DataModelingRedshift: removeParametersFromStack(
                        DataModelingRedshiftStackCn,
                        [
                          {
                            ParameterKey: 'SegmentsS3Prefix',
                          },
                          {
                            ParameterKey: 'ClickstreamMetadataDdbArn',
                          },
                          {
                            ParameterKey: 'TimeZoneWithAppId',
                          },
                        ],
                      ),
                      Reporting: removeParametersFromStack(
                        mergeParametersFromStack(ReportingStackCn, [
                          {
                            ParameterKey: 'QuickSightUserParam',
                            ParameterValue: 'GCRUser',
                          },
                          {
                            ParameterKey: 'QuickSightPrincipalParam',
                            ParameterValue: 'arn:aws-cn:quicksight:cn-north-1:555555555555:user/default/GCRUser',
                          },
                          {
                            ParameterKey: 'QuickSightOwnerPrincipalParam',
                            ParameterValue: 'arn:aws-cn:quicksight:cn-north-1:555555555555:user/default/GCRUser',
                          },
                        ]),
                        [
                          {
                            ParameterKey: 'QuickSightTimezoneParam',
                          },
                        ],
                      ),
                    },
                  },
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: MetricsStackCn,
                    },
                  },
                ],
                End: true,
                Type: 'Parallel',
              },
              ServiceCatalogAppRegistry: ServiceCatalogAppRegistryStackCn,
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });

  it('Generate workflow v1.1.6 in China region', async () => {
    dictionaryMock(ddbMock);
    createPipelineMock(mockClients, {
      publicAZContainPrivateAZ: true,
      subnetsCross3AZ: true,
      noVpcEndpoint: true,
      bucket: {
        location: BucketLocationConstraint.cn_north_1,
      },
    });
    createPipelineMockForBJSRegion(s3Mock);
    const pipeline: CPipeline = new CPipeline({
      ...cloneDeep(KINESIS_DATA_PROCESSING_NEW_REDSHIFT_QUICKSIGHT_PIPELINE_CN),
      templateVersion: SolutionVersion.V_1_1_6.fullVersion,
      region: 'cn-north-1',
    });
    const wf = await pipeline.generateWorkflow();
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              PipelineStacks: {
                Branches: [
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: IngestionStackCn,
                    },
                  },
                  {
                    StartAt: 'DataProcessing',
                    States: {
                      DataProcessing: DataProcessingStackCn,
                      DataModelingRedshift: DataModelingRedshiftStackCn,
                      Reporting: mergeParametersFromStack(ReportingStackCn, [
                        {
                          ParameterKey: 'QuickSightUserParam',
                          ParameterValue: 'GCRUser',
                        },
                        {
                          ParameterKey: 'QuickSightPrincipalParam',
                          ParameterValue: 'arn:aws-cn:quicksight:cn-north-1:555555555555:user/default/GCRUser',
                        },
                        {
                          ParameterKey: 'QuickSightOwnerPrincipalParam',
                          ParameterValue: 'arn:aws-cn:quicksight:cn-north-1:555555555555:user/default/GCRUser',
                        },
                      ]),
                    },
                  },
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: MetricsStackCn,
                    },
                  },
                ],
                End: true,
                Type: 'Parallel',
              },
              ServiceCatalogAppRegistry: ServiceCatalogAppRegistryStackCn,
            },
          },
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });
});
