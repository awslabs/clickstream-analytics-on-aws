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
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import cloneDeep from 'lodash/cloneDeep';
import 'aws-sdk-client-mock-jest';
import {
  createPipelineMock,
  createPipelineMockForBJSRegion,
  dictionaryMock,
} from './ddb-mock';
import {
  KINESIS_DATA_PROCESSING_NEW_REDSHIFT_PIPELINE,
  KINESIS_DATA_PROCESSING_NEW_REDSHIFT_QUICKSIGHT_PIPELINE, KINESIS_DATA_PROCESSING_NEW_REDSHIFT_QUICKSIGHT_PIPELINE_CN,
} from './pipeline-mock';
import {
  DataModelingRedshiftStack,
  DataModelingRedshiftStackCn,
  DataProcessingStack,
  DataProcessingStackCn,
  IngestionStack,
  IngestionStackCn,
  MetricsStack,
  MetricsStackCn,
  ReportingStack,
  ReportingStackCn,
  ServiceCatalogAppRegistryStack,
  ServiceCatalogAppRegistryStackCn,
  Tags,
  insertAfterParametersInStack,
  mergeParametersFromStack,
  removeParametersFromStack,
  replaceStackInputProps,
  setTagsToStack,
  setTagsWithVersion,
} from './workflow-mock';
import { FULL_SOLUTION_VERSION, LEVEL1, LEVEL2, LEVEL3 } from '../../common/constants';
// eslint-disable-next-line import/order
import { SolutionVersion } from '@aws/clickstream-base-lib';
import { server } from '../../index';
import { CPipeline } from '../../model/pipeline';
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
                      Metrics: setTagsToStack(MetricsStack, Tags),
                    },
                  },
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
                      DataModelingRedshift: setTagsToStack(DataModelingRedshiftStack, Tags),
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
                      Reporting: removeParametersFromStack(setTagsToStack(ReportingStack, Tags), [
                        {
                          ParameterKey: 'QuickSightPrincipalParam',
                        },
                      ]),
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
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: setTagsWithVersion(ServiceCatalogAppRegistryStack, SolutionVersion.V_1_0_0),
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: removeParametersFromStack(
                        setTagsWithVersion(MetricsStack, SolutionVersion.V_1_0_0), [
                          {
                            ParameterKey: 'AppRegistryApplicationArn.#',
                          },
                        ]),
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: replaceStackInputProps(
                        insertAfterParametersInStack(
                          removeParametersFromStack(
                            setTagsWithVersion(IngestionStack, SolutionVersion.V_1_0_0),
                            [
                              {
                                ParameterKey: 'EcsInfraType',
                              },
                              {
                                ParameterKey: 'AppRegistryApplicationArn.#',
                              },
                            ],
                          ), 'ScaleOnCpuUtilizationPercent', [
                            {
                              ParameterKey: 'NotificationsTopicArn',
                              ParameterValue: 'arn:aws:sns:us-east-1:111122223333:test',
                            },
                          ]),
                        {
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kinesis-stack.template.json',
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'DataProcessing',
                    States: {
                      DataProcessing: removeParametersFromStack(
                        mergeParametersFromStack(
                          setTagsWithVersion(DataProcessingStack, SolutionVersion.V_1_0_0), [
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
                      DataModelingRedshift: removeParametersFromStack(
                        setTagsWithVersion(DataModelingRedshiftStack, SolutionVersion.V_1_0_0),
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
                          {
                            ParameterKey: 'DataFreshnessInHour',
                          },
                        ],
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
                      Reporting: removeParametersFromStack(
                        setTagsWithVersion(ReportingStack, SolutionVersion.V_1_0_0), [
                          {
                            ParameterKey: 'QuickSightOwnerPrincipalParam',
                          },
                          {
                            ParameterKey: 'AppRegistryApplicationArn.#',
                          },
                          {
                            ParameterKey: 'QuickSightTimezoneParam',
                          },
                          {
                            ParameterKey: 'RedshiftIAMRoleParam.#',
                          },
                          {
                            ParameterKey: 'RedshiftDefaultDBParam',
                          },
                        ],
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
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: setTagsWithVersion(ServiceCatalogAppRegistryStack, SolutionVersion.V_1_1_0),
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: setTagsWithVersion(MetricsStack, SolutionVersion.V_1_1_0),
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: replaceStackInputProps(
                        insertAfterParametersInStack(
                          removeParametersFromStack(
                            setTagsWithVersion(IngestionStack, SolutionVersion.V_1_1_0),
                            [
                              {
                                ParameterKey: 'EcsInfraType',
                              },
                            ],
                          ), 'ScaleOnCpuUtilizationPercent', [
                            {
                              ParameterKey: 'NotificationsTopicArn',
                              ParameterValue: 'arn:aws:sns:us-east-1:111122223333:test',
                            },
                          ]),
                        {
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kinesis-stack.template.json',
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'DataProcessing',
                    States: {
                      DataProcessing: mergeParametersFromStack(
                        setTagsWithVersion(DataProcessingStack, SolutionVersion.V_1_1_0), [
                          {
                            ParameterKey: 'TransformerAndEnrichClassNames',
                            ParameterValue: 'software.aws.solution.clickstream.TransformerV2,software.aws.solution.clickstream.UAEnrichment,software.aws.solution.clickstream.IPEnrichment,test.aws.solution.main',
                          },
                        ],
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
                      DataModelingRedshift: removeParametersFromStack(
                        setTagsWithVersion(DataModelingRedshiftStack, SolutionVersion.V_1_1_0),
                        [
                          {
                            ParameterKey: 'SegmentsS3Prefix',
                          },
                          {
                            ParameterKey: 'TimeZoneWithAppId',
                          },
                          {
                            ParameterKey: 'DataFreshnessInHour',
                          },
                        ],
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
                      Reporting: removeParametersFromStack(
                        mergeParametersFromStack(
                          setTagsWithVersion(ReportingStack, SolutionVersion.V_1_1_0), [
                            {
                              ParameterKey: 'QuickSightOwnerPrincipalParam',
                              ParameterValue: 'arn:aws:quicksight:us-east-1:555555555555:user/default/QuickSightEmbeddingRole/ClickstreamExploreUser',
                            },
                          ],
                        ), [
                          {
                            ParameterKey: 'QuickSightTimezoneParam',
                          },
                          {
                            ParameterKey: 'RedshiftIAMRoleParam.#',
                          },
                          {
                            ParameterKey: 'RedshiftDefaultDBParam',
                          },
                        ]),
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
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: setTagsWithVersion(ServiceCatalogAppRegistryStack, SolutionVersion.V_1_1_5),
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: setTagsWithVersion(MetricsStack, SolutionVersion.V_1_1_5),
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: replaceStackInputProps(
                        insertAfterParametersInStack(
                          removeParametersFromStack(
                            setTagsWithVersion(IngestionStack, SolutionVersion.V_1_1_5),
                            [
                              {
                                ParameterKey: 'EcsInfraType',
                              },
                            ],
                          ), 'ScaleOnCpuUtilizationPercent', [
                            {
                              ParameterKey: 'NotificationsTopicArn',
                              ParameterValue: 'arn:aws:sns:us-east-1:111122223333:test',
                            },
                          ]),
                        {
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kinesis-stack.template.json',
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'DataProcessing',
                    States: {
                      DataProcessing: mergeParametersFromStack(setTagsWithVersion(DataProcessingStack, SolutionVersion.V_1_1_5), [
                        {
                          ParameterKey: 'TransformerAndEnrichClassNames',
                          ParameterValue: 'software.aws.solution.clickstream.TransformerV2,software.aws.solution.clickstream.UAEnrichment,software.aws.solution.clickstream.IPEnrichment,test.aws.solution.main',
                        },
                      ],
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
                      DataModelingRedshift: removeParametersFromStack(
                        setTagsWithVersion(DataModelingRedshiftStack, SolutionVersion.V_1_1_5),
                        [
                          {
                            ParameterKey: 'SegmentsS3Prefix',
                          },
                          {
                            ParameterKey: 'TimeZoneWithAppId',
                          },
                          {
                            ParameterKey: 'DataFreshnessInHour',
                          },
                        ],
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
                      Reporting: removeParametersFromStack(
                        setTagsWithVersion(ReportingStack, SolutionVersion.V_1_1_5),
                        [
                          {
                            ParameterKey: 'QuickSightTimezoneParam',
                          },
                          {
                            ParameterKey: 'RedshiftIAMRoleParam.#',
                          },
                          {
                            ParameterKey: 'RedshiftDefaultDBParam',
                          },
                        ],
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
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: setTagsWithVersion(ServiceCatalogAppRegistryStack, SolutionVersion.V_1_1_6),
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: setTagsWithVersion(MetricsStack, SolutionVersion.V_1_1_6),
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: replaceStackInputProps(
                        insertAfterParametersInStack(
                          removeParametersFromStack(
                            setTagsWithVersion(IngestionStack, SolutionVersion.V_1_1_6),
                            [
                              {
                                ParameterKey: 'EcsInfraType',
                              },
                            ],
                          ), 'ScaleOnCpuUtilizationPercent', [
                            {
                              ParameterKey: 'NotificationsTopicArn',
                              ParameterValue: 'arn:aws:sns:us-east-1:111122223333:test',
                            },
                          ]),
                        {
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kinesis-stack.template.json',
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'DataProcessing',
                    States: {
                      DataProcessing: setTagsWithVersion(DataProcessingStack, SolutionVersion.V_1_1_6),
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
                      DataModelingRedshift: setTagsWithVersion(DataModelingRedshiftStack, SolutionVersion.V_1_1_6),
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
                      Reporting: removeParametersFromStack(
                        setTagsWithVersion(ReportingStack, SolutionVersion.V_1_1_6), [
                          {
                            ParameterKey: 'QuickSightPrincipalParam',
                          },
                        ]),
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
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const reportingStackCn = mergeParametersFromStack(
      setTagsToStack(ReportingStackCn, Tags),
      [
        {
          ParameterKey: 'QuickSightUserParam',
          ParameterValue: 'GCRUser',
        },
        {
          ParameterKey: 'QuickSightOwnerPrincipalParam',
          ParameterValue: 'arn:aws-cn:quicksight:cn-north-1:555555555555:user/default/GCRUser',
        },
      ]);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: ServiceCatalogAppRegistryStackCn,
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: setTagsToStack(MetricsStackCn, Tags),
                    },
                  },
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
                      DataModelingRedshift: setTagsToStack(DataModelingRedshiftStackCn, Tags),
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
                      Reporting: removeParametersFromStack(
                        setTagsToStack(reportingStackCn, Tags),
                        [
                          {
                            ParameterKey: 'QuickSightPrincipalParam',
                          },
                        ],
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
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: setTagsWithVersion(ServiceCatalogAppRegistryStackCn, SolutionVersion.V_1_0_0),
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: removeParametersFromStack(
                        setTagsWithVersion(MetricsStackCn, SolutionVersion.V_1_0_0), [
                          {
                            ParameterKey: 'AppRegistryApplicationArn',
                          },
                        ]),
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: replaceStackInputProps(
                        insertAfterParametersInStack(
                          removeParametersFromStack(
                            setTagsWithVersion(IngestionStackCn, SolutionVersion.V_1_0_0),
                            [
                              {
                                ParameterKey: 'EcsInfraType',
                              },
                              {
                                ParameterKey: 'AppRegistryApplicationArn',
                              },
                            ],
                          ), 'ScaleOnCpuUtilizationPercent', [
                            {
                              ParameterKey: 'NotificationsTopicArn',
                              ParameterValue: 'arn:aws:sns:us-east-1:111122223333:test',
                            },
                          ]),
                        {
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.cn-north-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kinesis-stack.template.json',
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'DataProcessing',
                    States: {
                      DataProcessing: removeParametersFromStack(
                        mergeParametersFromStack(
                          setTagsWithVersion(DataProcessingStackCn, SolutionVersion.V_1_0_0), [
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
                      DataModelingRedshift: removeParametersFromStack(
                        setTagsWithVersion({
                          Data: DataModelingRedshiftStackCn.Data,
                          End: true,
                          Type: 'Stack',
                        }, SolutionVersion.V_1_0_0),
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
                          {
                            ParameterKey: 'DataFreshnessInHour',
                          },
                        ],
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
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: setTagsWithVersion(ServiceCatalogAppRegistryStackCn, SolutionVersion.V_1_1_0),
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: setTagsWithVersion(MetricsStackCn, SolutionVersion.V_1_1_0),
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: replaceStackInputProps(
                        insertAfterParametersInStack(
                          removeParametersFromStack(
                            setTagsWithVersion(IngestionStackCn, SolutionVersion.V_1_1_0),
                            [
                              {
                                ParameterKey: 'EcsInfraType',
                              },
                            ],
                          ), 'ScaleOnCpuUtilizationPercent', [
                            {
                              ParameterKey: 'NotificationsTopicArn',
                              ParameterValue: 'arn:aws:sns:us-east-1:111122223333:test',
                            },
                          ]),
                        {
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.cn-north-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kinesis-stack.template.json',
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'DataProcessing',
                    States: {
                      DataProcessing: mergeParametersFromStack(
                        setTagsWithVersion(DataProcessingStackCn, SolutionVersion.V_1_1_0), [
                          {
                            ParameterKey: 'TransformerAndEnrichClassNames',
                            ParameterValue: 'software.aws.solution.clickstream.TransformerV2,software.aws.solution.clickstream.UAEnrichment,software.aws.solution.clickstream.IPEnrichment,test.aws.solution.main',
                          },
                        ],
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
                      DataModelingRedshift: removeParametersFromStack(
                        setTagsWithVersion({
                          Data: DataModelingRedshiftStackCn.Data,
                          End: true,
                          Type: 'Stack',
                        }, SolutionVersion.V_1_1_0),
                        [
                          {
                            ParameterKey: 'SegmentsS3Prefix',
                          },
                          {
                            ParameterKey: 'TimeZoneWithAppId',
                          },
                          {
                            ParameterKey: 'DataFreshnessInHour',
                          },
                        ],
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
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: setTagsWithVersion(ServiceCatalogAppRegistryStackCn, SolutionVersion.V_1_1_5),
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: setTagsWithVersion(MetricsStackCn, SolutionVersion.V_1_1_5),
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: replaceStackInputProps(
                        insertAfterParametersInStack(
                          removeParametersFromStack(
                            setTagsWithVersion(IngestionStackCn, SolutionVersion.V_1_1_5),
                            [
                              {
                                ParameterKey: 'EcsInfraType',
                              },
                            ],
                          ), 'ScaleOnCpuUtilizationPercent', [
                            {
                              ParameterKey: 'NotificationsTopicArn',
                              ParameterValue: 'arn:aws:sns:us-east-1:111122223333:test',
                            },
                          ]),
                        {
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.cn-north-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kinesis-stack.template.json',
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'DataProcessing',
                    States: {
                      DataProcessing: mergeParametersFromStack(
                        setTagsWithVersion(DataProcessingStackCn, SolutionVersion.V_1_1_5), [
                          {
                            ParameterKey: 'TransformerAndEnrichClassNames',
                            ParameterValue: 'software.aws.solution.clickstream.TransformerV2,software.aws.solution.clickstream.UAEnrichment,software.aws.solution.clickstream.IPEnrichment,test.aws.solution.main',
                          },
                        ],
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
                      DataModelingRedshift: removeParametersFromStack(
                        setTagsWithVersion(DataModelingRedshiftStackCn, SolutionVersion.V_1_1_5),
                        [
                          {
                            ParameterKey: 'SegmentsS3Prefix',
                          },
                          {
                            ParameterKey: 'TimeZoneWithAppId',
                          },
                          {
                            ParameterKey: 'DataFreshnessInHour',
                          },
                        ],
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
                      Reporting: removeParametersFromStack(
                        mergeParametersFromStack(
                          setTagsWithVersion(ReportingStackCn, SolutionVersion.V_1_1_5), [
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
                          {
                            ParameterKey: 'RedshiftIAMRoleParam.#',
                          },
                          {
                            ParameterKey: 'RedshiftDefaultDBParam',
                          },
                        ],
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
    await pipeline.resourcesCheck();
    const wf = await generateWorkflow(pipeline.getPipeline(), pipeline.getResources()!);
    const reportingStackCn = mergeParametersFromStack(
      ReportingStackCn,
      [
        {
          ParameterKey: 'QuickSightUserParam',
          ParameterValue: 'GCRUser',
        },
        {
          ParameterKey: 'QuickSightOwnerPrincipalParam',
          ParameterValue: 'arn:aws-cn:quicksight:cn-north-1:555555555555:user/default/GCRUser',
        },
      ]);
    const expected = {
      Version: '2022-03-15',
      Workflow: {
        Branches: [
          {
            StartAt: 'ServiceCatalogAppRegistry',
            States: {
              ServiceCatalogAppRegistry: setTagsWithVersion(ServiceCatalogAppRegistryStackCn, SolutionVersion.V_1_1_6),
              [LEVEL1]: {
                Branches: [
                  {
                    StartAt: 'Metrics',
                    States: {
                      Metrics: setTagsWithVersion(MetricsStackCn, SolutionVersion.V_1_1_6),
                    },
                  },
                  {
                    StartAt: 'Ingestion',
                    States: {
                      Ingestion: replaceStackInputProps(
                        insertAfterParametersInStack(
                          removeParametersFromStack(
                            setTagsWithVersion(IngestionStackCn, SolutionVersion.V_1_1_6),
                            [
                              {
                                ParameterKey: 'EcsInfraType',
                              },
                            ],
                          ), 'ScaleOnCpuUtilizationPercent', [
                            {
                              ParameterKey: 'NotificationsTopicArn',
                              ParameterValue: 'arn:aws:sns:us-east-1:111122223333:test',
                            },
                          ]),
                        {
                          TemplateURL: 'https://EXAMPLE-BUCKET.s3.cn-north-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-kinesis-stack.template.json',
                        },
                      ),
                    },
                  },
                  {
                    StartAt: 'DataProcessing',
                    States: {
                      DataProcessing: setTagsWithVersion(DataProcessingStackCn, SolutionVersion.V_1_1_6),
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
                      DataModelingRedshift: setTagsWithVersion(DataModelingRedshiftStackCn, SolutionVersion.V_1_1_6),
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
                      Reporting: removeParametersFromStack(
                        setTagsWithVersion(reportingStackCn, SolutionVersion.V_1_1_6), [
                          {
                            ParameterKey: 'QuickSightPrincipalParam',
                          },
                        ]),
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
});
