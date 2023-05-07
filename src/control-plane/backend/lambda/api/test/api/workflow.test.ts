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

import { DescribeSubnetsCommand, EC2Client } from '@aws-sdk/client-ec2';
import { KafkaClient } from '@aws-sdk/client-kafka';
import {
  RedshiftClient,
} from '@aws-sdk/client-redshift';
import {
  RedshiftServerlessClient,
} from '@aws-sdk/client-redshift-serverless';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import {
  StartExecutionCommand,
  SFNClient,
} from '@aws-sdk/client-sfn';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { dictionaryMock, MOCK_APP_ID, MOCK_EXECUTION_ID, MOCK_PROJECT_ID, projectExistedMock, stackParameterMock } from './ddb-mock';
import {
  KAFKA_INGESTION_PIPELINE,
  KAFKA_WITH_CONNECTOR_INGESTION_PIPELINE,
  KINESIS_ETL_NEW_REDSHIFT_QUICKSIGHT_PIPELINE,
  KINESIS_ETL_PROVISIONED_REDSHIFT_PIPELINE,
  KINESIS_ETL_PROVISIONED_REDSHIFT_QUICKSIGHT_PIPELINE,
  KINESIS_ETL_REDSHIFT_PIPELINE,
  KINESIS_ON_DEMAND_INGESTION_PIPELINE,
  KINESIS_PROVISIONED_INGESTION_PIPELINE,
  MSK_ETL_REDSHIFT_PIPELINE,
  MSK_WITH_CONNECTOR_INGESTION_PIPELINE,
  RETRY_PIPELINE_WITH_WORKFLOW,
  S3_ETL_PIPELINE,
  S3_INGESTION_PIPELINE,
} from './pipeline-mock';
import { dictionaryTableName } from '../../common/constants';
import { WorkflowStateType, WorkflowTemplate } from '../../common/types';
import { server } from '../../index';
import { CPipeline } from '../../model/pipeline';
import { StackManager } from '../../service/stack';
import 'aws-sdk-client-mock-jest';

const ddbMock = mockClient(DynamoDBDocumentClient);
const kafkaMock = mockClient(KafkaClient);
const redshiftClient = mockClient(RedshiftClient);
const redshiftServerlessClient = mockClient(RedshiftServerlessClient);
const sfnClient = mockClient(SFNClient);
const secretsManagerClient = mockClient(SecretsManagerClient);
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
    Value: 'clickstream',
  },
  {
    Key: 'aws-solution/version',
    Value: 'v1.0.0',
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
    redshiftClient.reset();
    redshiftServerlessClient.reset();
    sfnClient.reset();
    secretsManagerClient.reset();
    ec2Mock.reset();
  });

  it('Generate Workflow ingestion-server-s3', async () => {
    dictionaryMock(ddbMock);
    stackParameterMock(ddbMock, kafkaMock, redshiftServerlessClient, redshiftClient);
    secretsManagerClient.on(GetSecretValueCommand).resolves({
      SecretString: '{"issuer":"1","userEndpoint":"2","authorizationEndpoint":"3","tokenEndpoint":"4","appClientId":"5","appClientSecret":"6"}',
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PublicSubnetIds',
                        ParameterValue: 'subnet-00000000000000021,subnet-00000000000000022,subnet-00000000000000023',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'DomainName',
                        ParameterValue: 'fake.example.com',
                      },
                      {
                        ParameterKey: 'ACMCertificateArn',
                        ParameterValue: 'arn:aws:acm:ap-southeast-1:111122223333:certificate/398ce638-e522-40e8-b344-fad5a616e11b',
                      },
                      {
                        ParameterKey: 'Protocol',
                        ParameterValue: 'HTTPS',
                      },
                      {
                        ParameterKey: 'ServerEndpointPath',
                        ParameterValue: '/collect',
                      },
                      {
                        ParameterKey: 'ServerCorsOrigin',
                        ParameterValue: '',
                      },
                      {
                        ParameterKey: 'ServerMax',
                        ParameterValue: '4',
                      },
                      {
                        ParameterKey: 'ServerMin',
                        ParameterValue: '2',
                      },
                      {
                        ParameterKey: 'ScaleOnCpuUtilizationPercent',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'WarmPoolSize',
                        ParameterValue: '1',
                      },
                      {
                        ParameterKey: 'NotificationsTopicArn',
                        ParameterValue: 'arn:aws:sns:us-east-1:111122223333:test',
                      },
                      {
                        ParameterKey: 'EnableGlobalAccelerator',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'DevMode',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'AuthenticationSecretArn',
                        ParameterValue: 'arn:aws:secretsmanager:ap-southeast-1:111122223333:secret:test-bxjEaf',
                      },
                      {
                        ParameterKey: 'EnableAuthentication',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'EnableApplicationLoadBalancerAccessLog',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'LogS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LogS3Prefix',
                        ParameterValue: 'logs/',
                      },
                      {
                        ParameterKey: 'S3DataBucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'S3DataPrefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/buffer/',
                      },
                      {
                        ParameterKey: 'S3BatchMaxBytes',
                        ParameterValue: '500',
                      },
                      {
                        ParameterKey: 'S3BatchTimeout',
                        ParameterValue: '60',
                      },
                    ],
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
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-kafka no connector', async () => {
    dictionaryMock(ddbMock);
    stackParameterMock(ddbMock, kafkaMock, redshiftServerlessClient, redshiftClient);
    secretsManagerClient.on(GetSecretValueCommand).resolves({
      SecretString: '{"issuer":"1","userEndpoint":"2","authorizationEndpoint":"3","tokenEndpoint":"4","appClientId":"5","appClientSecret":"6"}',
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PublicSubnetIds',
                        ParameterValue: 'subnet-00000000000000021,subnet-00000000000000022,subnet-00000000000000023',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'DomainName',
                        ParameterValue: 'fake.example.com',
                      },
                      {
                        ParameterKey: 'ACMCertificateArn',
                        ParameterValue: 'arn:aws:acm:ap-southeast-1:111122223333:certificate/398ce638-e522-40e8-b344-fad5a616e11b',
                      },
                      {
                        ParameterKey: 'Protocol',
                        ParameterValue: 'HTTPS',
                      },
                      {
                        ParameterKey: 'ServerEndpointPath',
                        ParameterValue: '/collect',
                      },
                      {
                        ParameterKey: 'ServerCorsOrigin',
                        ParameterValue: '',
                      },
                      {
                        ParameterKey: 'ServerMax',
                        ParameterValue: '4',
                      },
                      {
                        ParameterKey: 'ServerMin',
                        ParameterValue: '2',
                      },
                      {
                        ParameterKey: 'ScaleOnCpuUtilizationPercent',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'WarmPoolSize',
                        ParameterValue: '1',
                      },
                      {
                        ParameterKey: 'NotificationsTopicArn',
                        ParameterValue: 'arn:aws:sns:us-east-1:111122223333:test',
                      },
                      {
                        ParameterKey: 'EnableGlobalAccelerator',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'DevMode',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'EnableAuthentication',
                        ParameterValue: 'No',
                      },
                      {
                        ParameterKey: 'EnableApplicationLoadBalancerAccessLog',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'LogS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LogS3Prefix',
                        ParameterValue: 'logs/',
                      },
                      {
                        ParameterKey: 'KafkaBrokers',
                        ParameterValue: 'test1.com:9092,test2.com:9092,test3.com:9092',
                      },
                      {
                        ParameterKey: 'KafkaTopic',
                        ParameterValue: 't1',
                      },
                      {
                        ParameterKey: 'MskSecurityGroupId',
                        ParameterValue: 'sg-0000000000002',
                      },
                    ],
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
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-kafka with connector', async () => {
    dictionaryMock(ddbMock);
    stackParameterMock(ddbMock, kafkaMock, redshiftServerlessClient, redshiftClient);
    secretsManagerClient.on(GetSecretValueCommand).resolves({
      SecretString: '{"issuer":"1","userEndpoint":"2","authorizationEndpoint":"3","tokenEndpoint":"4","appClientId":"5","appClientSecret":"6"}',
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PublicSubnetIds',
                        ParameterValue: 'subnet-00000000000000021,subnet-00000000000000022,subnet-00000000000000023',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'DomainName',
                        ParameterValue: 'fake.example.com',
                      },
                      {
                        ParameterKey: 'ACMCertificateArn',
                        ParameterValue: 'arn:aws:acm:ap-southeast-1:111122223333:certificate/398ce638-e522-40e8-b344-fad5a616e11b',
                      },
                      {
                        ParameterKey: 'Protocol',
                        ParameterValue: 'HTTPS',
                      },
                      {
                        ParameterKey: 'ServerEndpointPath',
                        ParameterValue: '/collect',
                      },
                      {
                        ParameterKey: 'ServerCorsOrigin',
                        ParameterValue: '',
                      },
                      {
                        ParameterKey: 'ServerMax',
                        ParameterValue: '4',
                      },
                      {
                        ParameterKey: 'ServerMin',
                        ParameterValue: '2',
                      },
                      {
                        ParameterKey: 'ScaleOnCpuUtilizationPercent',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'WarmPoolSize',
                        ParameterValue: '1',
                      },
                      {
                        ParameterKey: 'NotificationsTopicArn',
                        ParameterValue: 'arn:aws:sns:us-east-1:111122223333:test',
                      },
                      {
                        ParameterKey: 'EnableGlobalAccelerator',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'DevMode',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'EnableAuthentication',
                        ParameterValue: 'No',
                      },
                      {
                        ParameterKey: 'EnableApplicationLoadBalancerAccessLog',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'LogS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LogS3Prefix',
                        ParameterValue: 'logs/',
                      },
                      {
                        ParameterKey: 'KafkaBrokers',
                        ParameterValue: 'test1.com:9092,test2.com:9092,test3.com:9092',
                      },
                      {
                        ParameterKey: 'KafkaTopic',
                        ParameterValue: 't1',
                      },
                      {
                        ParameterKey: 'MskSecurityGroupId',
                        ParameterValue: 'sg-0000000000002',
                      },
                    ],
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
                    Parameters: [
                      {
                        ParameterKey: 'DataS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'DataS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/buffer/',
                      },
                      {
                        ParameterKey: 'LogS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LogS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/logs/kafka-connector/',
                      },
                      {
                        ParameterKey: 'PluginS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'PluginS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/runtime/ingestion/kafka-connector/plugins/',
                      },
                      {
                        ParameterKey: 'SubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'KafkaBrokers',
                        ParameterValue: 'test1.com:9092,test2.com:9092,test3.com:9092',
                      },
                      {
                        ParameterKey: 'KafkaTopic',
                        ParameterValue: 't1',
                      },
                      {
                        ParameterKey: 'SecurityGroupId',
                        ParameterValue: 'sg-0000000000002',
                      },
                    ],
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
        ],
        End: true,
        Type: 'Parallel',
      },
    };

    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-kafka msk with connector', async () => {
    dictionaryMock(ddbMock);
    stackParameterMock(ddbMock, kafkaMock, redshiftServerlessClient, redshiftClient);
    secretsManagerClient.on(GetSecretValueCommand).resolves({
      SecretString: '{"issuer":"1","userEndpoint":"2","authorizationEndpoint":"3","tokenEndpoint":"4","appClientId":"5","appClientSecret":"6"}',
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PublicSubnetIds',
                        ParameterValue: 'subnet-00000000000000021,subnet-00000000000000022,subnet-00000000000000023',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'DomainName',
                        ParameterValue: 'fake.example.com',
                      },
                      {
                        ParameterKey: 'ACMCertificateArn',
                        ParameterValue: 'arn:aws:acm:ap-southeast-1:111122223333:certificate/398ce638-e522-40e8-b344-fad5a616e11b',
                      },
                      {
                        ParameterKey: 'Protocol',
                        ParameterValue: 'HTTPS',
                      },
                      {
                        ParameterKey: 'ServerEndpointPath',
                        ParameterValue: '/collect',
                      },
                      {
                        ParameterKey: 'ServerCorsOrigin',
                        ParameterValue: '',
                      },
                      {
                        ParameterKey: 'ServerMax',
                        ParameterValue: '4',
                      },
                      {
                        ParameterKey: 'ServerMin',
                        ParameterValue: '2',
                      },
                      {
                        ParameterKey: 'ScaleOnCpuUtilizationPercent',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'WarmPoolSize',
                        ParameterValue: '1',
                      },
                      {
                        ParameterKey: 'NotificationsTopicArn',
                        ParameterValue: 'arn:aws:sns:us-east-1:111122223333:test',
                      },
                      {
                        ParameterKey: 'EnableGlobalAccelerator',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'DevMode',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'EnableAuthentication',
                        ParameterValue: 'No',
                      },
                      {
                        ParameterKey: 'EnableApplicationLoadBalancerAccessLog',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'LogS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LogS3Prefix',
                        ParameterValue: 'logs/',
                      },
                      {
                        ParameterKey: 'MskClusterName',
                        ParameterValue: 'mskClusterName',
                      },
                      {
                        ParameterKey: 'MskSecurityGroupId',
                        ParameterValue: 'sg-0000000000002',
                      },
                      {
                        ParameterKey: 'KafkaTopic',
                        ParameterValue: 'project_8888_8888',
                      },
                      {
                        ParameterKey: 'KafkaBrokers',
                        ParameterValue: 'test1.com:9092,test2.com:9092,test3.com:9092',
                      },
                    ],
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
                    Parameters: [
                      {
                        ParameterKey: 'DataS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'DataS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/buffer/',
                      },
                      {
                        ParameterKey: 'LogS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LogS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/logs/kafka-connector/',
                      },
                      {
                        ParameterKey: 'PluginS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'PluginS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/runtime/ingestion/kafka-connector/plugins/',
                      },
                      {
                        ParameterKey: 'SubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'KafkaBrokers',
                        ParameterValue: 'test1.com:9092,test2.com:9092,test3.com:9092',
                      },
                      {
                        ParameterKey: 'KafkaTopic',
                        ParameterValue: 'project_8888_8888',
                      },
                      {
                        ParameterKey: 'MskClusterName',
                        ParameterValue: 'mskClusterName',
                      },
                      {
                        ParameterKey: 'SecurityGroupId',
                        ParameterValue: 'sg-0000000000002',
                      },
                    ],
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
        ],
        End: true,
        Type: 'Parallel',
      },
    };

    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-kinesis ON_DEMAND', async () => {
    dictionaryMock(ddbMock);
    stackParameterMock(ddbMock, kafkaMock, redshiftServerlessClient, redshiftClient);
    secretsManagerClient.on(GetSecretValueCommand).resolves({
      SecretString: '{"issuer":"1","userEndpoint":"2","authorizationEndpoint":"3","tokenEndpoint":"4","appClientId":"5","appClientSecret":"6"}',
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PublicSubnetIds',
                        ParameterValue: 'subnet-00000000000000021,subnet-00000000000000022,subnet-00000000000000023',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'DomainName',
                        ParameterValue: 'fake.example.com',
                      },
                      {
                        ParameterKey: 'ACMCertificateArn',
                        ParameterValue: 'arn:aws:acm:ap-southeast-1:111122223333:certificate/398ce638-e522-40e8-b344-fad5a616e11b',
                      },
                      {
                        ParameterKey: 'Protocol',
                        ParameterValue: 'HTTPS',
                      },
                      {
                        ParameterKey: 'ServerEndpointPath',
                        ParameterValue: '/collect',
                      },
                      {
                        ParameterKey: 'ServerCorsOrigin',
                        ParameterValue: '',
                      },
                      {
                        ParameterKey: 'ServerMax',
                        ParameterValue: '4',
                      },
                      {
                        ParameterKey: 'ServerMin',
                        ParameterValue: '2',
                      },
                      {
                        ParameterKey: 'ScaleOnCpuUtilizationPercent',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'WarmPoolSize',
                        ParameterValue: '1',
                      },
                      {
                        ParameterKey: 'NotificationsTopicArn',
                        ParameterValue: 'arn:aws:sns:us-east-1:111122223333:test',
                      },
                      {
                        ParameterKey: 'EnableGlobalAccelerator',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'DevMode',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'EnableAuthentication',
                        ParameterValue: 'No',
                      },
                      {
                        ParameterKey: 'EnableApplicationLoadBalancerAccessLog',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'LogS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LogS3Prefix',
                        ParameterValue: 'logs/',
                      },
                      {
                        ParameterKey: 'KinesisDataS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'KinesisDataS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/buffer/',
                      },
                      {
                        ParameterKey: 'KinesisStreamMode',
                        ParameterValue: 'ON_DEMAND',
                      },
                      {
                        ParameterKey: 'KinesisShardCount',
                        ParameterValue: '3',
                      },
                      {
                        ParameterKey: 'KinesisDataRetentionHours',
                        ParameterValue: '24',
                      },
                      {
                        ParameterKey: 'KinesisBatchSize',
                        ParameterValue: '10000',
                      },
                      {
                        ParameterKey: 'KinesisMaxBatchingWindowSeconds',
                        ParameterValue: '300',
                      },
                    ],
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
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-kinesis PROVISIONED', async () => {
    dictionaryMock(ddbMock);
    stackParameterMock(ddbMock, kafkaMock, redshiftServerlessClient, redshiftClient);
    secretsManagerClient.on(GetSecretValueCommand).resolves({
      SecretString: '{"issuer":"1","userEndpoint":"2","authorizationEndpoint":"3","tokenEndpoint":"4","appClientId":"5","appClientSecret":"6"}',
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PublicSubnetIds',
                        ParameterValue: 'subnet-00000000000000021,subnet-00000000000000022,subnet-00000000000000023',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'DomainName',
                        ParameterValue: 'fake.example.com',
                      },
                      {
                        ParameterKey: 'ACMCertificateArn',
                        ParameterValue: 'arn:aws:acm:ap-southeast-1:111122223333:certificate/398ce638-e522-40e8-b344-fad5a616e11b',
                      },
                      {
                        ParameterKey: 'Protocol',
                        ParameterValue: 'HTTPS',
                      },
                      {
                        ParameterKey: 'ServerEndpointPath',
                        ParameterValue: '/collect',
                      },
                      {
                        ParameterKey: 'ServerCorsOrigin',
                        ParameterValue: '',
                      },
                      {
                        ParameterKey: 'ServerMax',
                        ParameterValue: '4',
                      },
                      {
                        ParameterKey: 'ServerMin',
                        ParameterValue: '2',
                      },
                      {
                        ParameterKey: 'ScaleOnCpuUtilizationPercent',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'WarmPoolSize',
                        ParameterValue: '1',
                      },
                      {
                        ParameterKey: 'NotificationsTopicArn',
                        ParameterValue: 'arn:aws:sns:us-east-1:111122223333:test',
                      },
                      {
                        ParameterKey: 'EnableGlobalAccelerator',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'DevMode',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'EnableAuthentication',
                        ParameterValue: 'No',
                      },
                      {
                        ParameterKey: 'EnableApplicationLoadBalancerAccessLog',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'LogS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LogS3Prefix',
                        ParameterValue: 'logs/',
                      },
                      {
                        ParameterKey: 'KinesisDataS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'KinesisDataS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/buffer/',
                      },
                      {
                        ParameterKey: 'KinesisStreamMode',
                        ParameterValue: 'PROVISIONED',
                      },
                      {
                        ParameterKey: 'KinesisShardCount',
                        ParameterValue: '2',
                      },
                      {
                        ParameterKey: 'KinesisDataRetentionHours',
                        ParameterValue: '24',
                      },
                      {
                        ParameterKey: 'KinesisBatchSize',
                        ParameterValue: '10000',
                      },
                      {
                        ParameterKey: 'KinesisMaxBatchingWindowSeconds',
                        ParameterValue: '300',
                      },
                    ],
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
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-s3 + ETL', async () => {
    dictionaryMock(ddbMock);
    stackParameterMock(ddbMock, kafkaMock, redshiftServerlessClient, redshiftClient);
    secretsManagerClient.on(GetSecretValueCommand).resolves({
      SecretString: '{"issuer":"1","userEndpoint":"2","authorizationEndpoint":"3","tokenEndpoint":"4","appClientId":"5","appClientSecret":"6"}',
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PublicSubnetIds',
                        ParameterValue: 'subnet-00000000000000021,subnet-00000000000000022,subnet-00000000000000023',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'DomainName',
                        ParameterValue: 'fake.example.com',
                      },
                      {
                        ParameterKey: 'ACMCertificateArn',
                        ParameterValue: 'arn:aws:acm:ap-southeast-1:111122223333:certificate/398ce638-e522-40e8-b344-fad5a616e11b',
                      },
                      {
                        ParameterKey: 'Protocol',
                        ParameterValue: 'HTTPS',
                      },
                      {
                        ParameterKey: 'ServerEndpointPath',
                        ParameterValue: '/collect',
                      },
                      {
                        ParameterKey: 'ServerCorsOrigin',
                        ParameterValue: '',
                      },
                      {
                        ParameterKey: 'ServerMax',
                        ParameterValue: '4',
                      },
                      {
                        ParameterKey: 'ServerMin',
                        ParameterValue: '2',
                      },
                      {
                        ParameterKey: 'ScaleOnCpuUtilizationPercent',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'WarmPoolSize',
                        ParameterValue: '1',
                      },
                      {
                        ParameterKey: 'NotificationsTopicArn',
                        ParameterValue: 'arn:aws:sns:us-east-1:111122223333:test',
                      },
                      {
                        ParameterKey: 'EnableGlobalAccelerator',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'DevMode',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'AuthenticationSecretArn',
                        ParameterValue: 'arn:aws:secretsmanager:ap-southeast-1:111122223333:secret:test-bxjEaf',
                      },
                      {
                        ParameterKey: 'EnableAuthentication',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'EnableApplicationLoadBalancerAccessLog',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'LogS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LogS3Prefix',
                        ParameterValue: 'logs/',
                      },
                      {
                        ParameterKey: 'S3DataBucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'S3DataPrefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/buffer/',
                      },
                      {
                        ParameterKey: 'S3BatchMaxBytes',
                        ParameterValue: '500',
                      },
                      {
                        ParameterKey: 'S3BatchTimeout',
                        ParameterValue: '60',
                      },
                    ],
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'ProjectId',
                        ParameterValue: MOCK_PROJECT_ID,
                      },
                      {
                        ParameterKey: 'AppIds',
                        ParameterValue: `${MOCK_APP_ID}_1,${MOCK_APP_ID}_2`,
                      },
                      {
                        ParameterKey: 'SourceS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'SourceS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/buffer/',
                      },
                      {
                        ParameterKey: 'SinkS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'SinkS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/ods/',
                      },
                      {
                        ParameterKey: 'PipelineS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'PipelineS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/pipeline-temp/',
                      },
                      {
                        ParameterKey: 'DataFreshnessInHour',
                        ParameterValue: '7',
                      },
                      {
                        ParameterKey: 'ScheduleExpression',
                        ParameterValue: 'hour',
                      },
                      {
                        ParameterKey: 'TransformerAndEnrichClassNames',
                        ParameterValue: 'test.aws.solution.main,sofeware.aws.solution.clickstream.UAEnrichment,sofeware.aws.solution.clickstream.IPEnrichment,test.aws.solution.main',
                      },
                      {
                        ParameterKey: 'S3PathPluginJars',
                        ParameterValue: 's3://example-bucket/pipeline/jars/test-transformer-0.1.0.jar,s3://example-bucket/pipeline/jars/test-enrich-0.1.0.jar',
                      },
                      {
                        ParameterKey: 'S3PathPluginFiles',
                        ParameterValue: 's3://example-bucket/pipeline/files/data1.mmdb,s3://example-bucket/pipeline/files/data2.mmdb,s3://example-bucket/pipeline/files/data3.mmdb,s3://example-bucket/pipeline/files/data4.mmdb',
                      },
                      {
                        ParameterKey: 'OutputFormat',
                        ParameterValue: 'parquet',
                      },
                    ],
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
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow kafka msk + ETL + redshift', async () => {
    dictionaryMock(ddbMock);
    stackParameterMock(ddbMock, kafkaMock, redshiftServerlessClient, redshiftClient);
    secretsManagerClient.on(GetSecretValueCommand).resolves({
      SecretString: '{"issuer":"1","userEndpoint":"2","authorizationEndpoint":"3","tokenEndpoint":"4","appClientId":"5","appClientSecret":"6"}',
    });
    const pipeline: CPipeline = new CPipeline(MSK_ETL_REDSHIFT_PIPELINE);
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PublicSubnetIds',
                        ParameterValue: 'subnet-00000000000000021,subnet-00000000000000022,subnet-00000000000000023',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'DomainName',
                        ParameterValue: 'fake.example.com',
                      },
                      {
                        ParameterKey: 'ACMCertificateArn',
                        ParameterValue: 'arn:aws:acm:ap-southeast-1:111122223333:certificate/398ce638-e522-40e8-b344-fad5a616e11b',
                      },
                      {
                        ParameterKey: 'Protocol',
                        ParameterValue: 'HTTPS',
                      },
                      {
                        ParameterKey: 'ServerEndpointPath',
                        ParameterValue: '/collect',
                      },
                      {
                        ParameterKey: 'ServerCorsOrigin',
                        ParameterValue: '',
                      },
                      {
                        ParameterKey: 'ServerMax',
                        ParameterValue: '4',
                      },
                      {
                        ParameterKey: 'ServerMin',
                        ParameterValue: '2',
                      },
                      {
                        ParameterKey: 'ScaleOnCpuUtilizationPercent',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'WarmPoolSize',
                        ParameterValue: '1',
                      },
                      {
                        ParameterKey: 'NotificationsTopicArn',
                        ParameterValue: 'arn:aws:sns:us-east-1:111122223333:test',
                      },
                      {
                        ParameterKey: 'EnableGlobalAccelerator',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'DevMode',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'EnableAuthentication',
                        ParameterValue: 'No',
                      },
                      {
                        ParameterKey: 'EnableApplicationLoadBalancerAccessLog',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'LogS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LogS3Prefix',
                        ParameterValue: 'logs/',
                      },
                      {
                        ParameterKey: 'MskClusterName',
                        ParameterValue: 'mskClusterName',
                      },
                      {
                        ParameterKey: 'MskSecurityGroupId',
                        ParameterValue: 'sg-0000000000002',
                      },
                      {
                        ParameterKey: 'KafkaTopic',
                        ParameterValue: 'project_8888_8888',
                      },
                      {
                        ParameterKey: 'KafkaBrokers',
                        ParameterValue: 'test1.com:9092,test2.com:9092,test3.com:9092',
                      },
                    ],
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
                    Parameters: [
                      {
                        ParameterKey: 'DataS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'DataS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/buffer/',
                      },
                      {
                        ParameterKey: 'LogS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LogS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/logs/kafka-connector/',
                      },
                      {
                        ParameterKey: 'PluginS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'PluginS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/runtime/ingestion/kafka-connector/plugins/',
                      },
                      {
                        ParameterKey: 'SubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'KafkaBrokers',
                        ParameterValue: 'test1.com:9092,test2.com:9092,test3.com:9092',
                      },
                      {
                        ParameterKey: 'KafkaTopic',
                        ParameterValue: 'project_8888_8888',
                      },
                      {
                        ParameterKey: 'MskClusterName',
                        ParameterValue: 'mskClusterName',
                      },
                      {
                        ParameterKey: 'SecurityGroupId',
                        ParameterValue: 'sg-0000000000002',
                      },
                    ],
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'ProjectId',
                        ParameterValue: MOCK_PROJECT_ID,
                      },
                      {
                        ParameterKey: 'AppIds',
                        ParameterValue: `${MOCK_APP_ID}_1,${MOCK_APP_ID}_2`,
                      },
                      {
                        ParameterKey: 'SourceS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'SourceS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/buffer/project_8888_8888/',
                      },
                      {
                        ParameterKey: 'SinkS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'SinkS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/ods/',
                      },
                      {
                        ParameterKey: 'PipelineS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'PipelineS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/pipeline-temp/',
                      },
                      {
                        ParameterKey: 'DataFreshnessInHour',
                        ParameterValue: '7',
                      },
                      {
                        ParameterKey: 'ScheduleExpression',
                        ParameterValue: 'hour',
                      },
                      {
                        ParameterKey: 'TransformerAndEnrichClassNames',
                        ParameterValue: 'sofeware.aws.solution.clickstream.Transformer,sofeware.aws.solution.clickstream.UAEnrichment,sofeware.aws.solution.clickstream.IPEnrichment,test.aws.solution.main',
                      },
                      {
                        ParameterKey: 'S3PathPluginJars',
                        ParameterValue: 's3://example-bucket/pipeline/jars/test-enrich-0.1.0.jar',
                      },
                      {
                        ParameterKey: 'S3PathPluginFiles',
                        ParameterValue: 's3://example-bucket/pipeline/files/data3.mmdb,s3://example-bucket/pipeline/files/data4.mmdb',
                      },
                      {
                        ParameterKey: 'OutputFormat',
                        ParameterValue: 'parquet',
                      },
                    ],
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'ProjectId',
                        ParameterValue: MOCK_PROJECT_ID,
                      },
                      {
                        ParameterKey: 'AppIds',
                        ParameterValue: `${MOCK_APP_ID}_1,${MOCK_APP_ID}_2`,
                      },
                      {
                        ParameterKey: 'ODSEventBucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'ODSEventPrefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/ods/',
                      },
                      {
                        ParameterKey: 'ODSEventFileSuffix',
                        ParameterValue: '.snappy.parquet',
                      },
                      {
                        ParameterKey: 'LoadWorkflowBucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LoadWorkflowBucketPrefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/ods/',
                      },
                      {
                        ParameterKey: 'MaxFilesLimit',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'ProcessingFilesLimit',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'LoadJobScheduleInterval',
                        ParameterValue: '180',
                      },
                      {
                        ParameterKey: 'RedshiftMode',
                        ParameterValue: 'Serverless',
                      },
                      {
                        ParameterKey: 'RedshiftServerlessNamespaceId',
                        ParameterValue: '3fe99af1-0b02-4b43-b8d4-34ccfd52c865',
                      },
                      {
                        ParameterKey: 'RedshiftServerlessWorkgroupId',
                        ParameterValue: 'd60f7989-f4ce-46c5-95da-2f9cc7a27725',
                      },
                      {
                        ParameterKey: 'RedshiftServerlessWorkgroupName',
                        ParameterValue: 'test-wg',
                      },
                      {
                        ParameterKey: 'RedshiftServerlessIAMRole',
                        ParameterValue: 'arn:aws:iam::555555555555:role/data-analytics-redshift',
                      },
                    ],
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
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-kinesis ON_DEMAND + ETL + redshift', async () => {
    dictionaryMock(ddbMock);
    stackParameterMock(ddbMock, kafkaMock, redshiftServerlessClient, redshiftClient);
    ec2Mock.on(DescribeSubnetsCommand)
      .resolvesOnce({
        Subnets: [{ AvailabilityZone: 'us-east-1a' }],
      })
      .resolvesOnce({
        Subnets: [{ AvailabilityZone: 'us-east-1b' }],
      })
      .resolvesOnce({
        Subnets: [{ AvailabilityZone: 'us-east-1c' }],
      });
    secretsManagerClient.on(GetSecretValueCommand).resolves({
      SecretString: '{"issuer":"1","userEndpoint":"2","authorizationEndpoint":"3","tokenEndpoint":"4","appClientId":"5","appClientSecret":"6"}',
    });
    const pipeline: CPipeline = new CPipeline(KINESIS_ETL_REDSHIFT_PIPELINE);
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PublicSubnetIds',
                        ParameterValue: 'subnet-00000000000000021,subnet-00000000000000022,subnet-00000000000000023',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'DomainName',
                        ParameterValue: 'fake.example.com',
                      },
                      {
                        ParameterKey: 'ACMCertificateArn',
                        ParameterValue: 'arn:aws:acm:ap-southeast-1:111122223333:certificate/398ce638-e522-40e8-b344-fad5a616e11b',
                      },
                      {
                        ParameterKey: 'Protocol',
                        ParameterValue: 'HTTPS',
                      },
                      {
                        ParameterKey: 'ServerEndpointPath',
                        ParameterValue: '/collect',
                      },
                      {
                        ParameterKey: 'ServerCorsOrigin',
                        ParameterValue: '',
                      },
                      {
                        ParameterKey: 'ServerMax',
                        ParameterValue: '4',
                      },
                      {
                        ParameterKey: 'ServerMin',
                        ParameterValue: '2',
                      },
                      {
                        ParameterKey: 'ScaleOnCpuUtilizationPercent',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'WarmPoolSize',
                        ParameterValue: '1',
                      },
                      {
                        ParameterKey: 'NotificationsTopicArn',
                        ParameterValue: 'arn:aws:sns:us-east-1:111122223333:test',
                      },
                      {
                        ParameterKey: 'EnableGlobalAccelerator',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'DevMode',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'EnableAuthentication',
                        ParameterValue: 'No',
                      },
                      {
                        ParameterKey: 'EnableApplicationLoadBalancerAccessLog',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'LogS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LogS3Prefix',
                        ParameterValue: 'logs/',
                      },
                      {
                        ParameterKey: 'KinesisDataS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'KinesisDataS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/buffer/',
                      },
                      {
                        ParameterKey: 'KinesisStreamMode',
                        ParameterValue: 'ON_DEMAND',
                      },
                      {
                        ParameterKey: 'KinesisShardCount',
                        ParameterValue: '3',
                      },
                      {
                        ParameterKey: 'KinesisDataRetentionHours',
                        ParameterValue: '24',
                      },
                      {
                        ParameterKey: 'KinesisBatchSize',
                        ParameterValue: '10000',
                      },
                      {
                        ParameterKey: 'KinesisMaxBatchingWindowSeconds',
                        ParameterValue: '300',
                      },
                    ],
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'ProjectId',
                        ParameterValue: MOCK_PROJECT_ID,
                      },
                      {
                        ParameterKey: 'AppIds',
                        ParameterValue: `${MOCK_APP_ID}_1,${MOCK_APP_ID}_2`,
                      },
                      {
                        ParameterKey: 'SourceS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'SourceS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/buffer/',
                      },
                      {
                        ParameterKey: 'SinkS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'SinkS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/ods/',
                      },
                      {
                        ParameterKey: 'PipelineS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'PipelineS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/pipeline-temp/',
                      },
                      {
                        ParameterKey: 'DataFreshnessInHour',
                        ParameterValue: '7',
                      },
                      {
                        ParameterKey: 'ScheduleExpression',
                        ParameterValue: 'hour',
                      },
                      {
                        ParameterKey: 'TransformerAndEnrichClassNames',
                        ParameterValue: 'sofeware.aws.solution.clickstream.Transformer,sofeware.aws.solution.clickstream.UAEnrichment,sofeware.aws.solution.clickstream.IPEnrichment,test.aws.solution.main',
                      },
                      {
                        ParameterKey: 'S3PathPluginJars',
                        ParameterValue: 's3://example-bucket/pipeline/jars/test-enrich-0.1.0.jar',
                      },
                      {
                        ParameterKey: 'S3PathPluginFiles',
                        ParameterValue: 's3://example-bucket/pipeline/files/data3.mmdb,s3://example-bucket/pipeline/files/data4.mmdb',
                      },
                      {
                        ParameterKey: 'OutputFormat',
                        ParameterValue: 'parquet',
                      },
                    ],
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'ProjectId',
                        ParameterValue: MOCK_PROJECT_ID,
                      },
                      {
                        ParameterKey: 'AppIds',
                        ParameterValue: `${MOCK_APP_ID}_1,${MOCK_APP_ID}_2`,
                      },
                      {
                        ParameterKey: 'ODSEventBucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'ODSEventPrefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/ods/',
                      },
                      {
                        ParameterKey: 'ODSEventFileSuffix',
                        ParameterValue: '.snappy.parquet',
                      },
                      {
                        ParameterKey: 'LoadWorkflowBucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LoadWorkflowBucketPrefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/ods/',
                      },
                      {
                        ParameterKey: 'MaxFilesLimit',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'ProcessingFilesLimit',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'LoadJobScheduleInterval',
                        ParameterValue: '180',
                      },
                      {
                        ParameterKey: 'RedshiftMode',
                        ParameterValue: 'New_Serverless',
                      },
                      {
                        ParameterKey: 'NewRedshiftServerlessWorkgroupName',
                        ParameterValue: 'clickstream-project-8888-8888',
                      },
                      {
                        ParameterKey: 'RedshiftServerlessVPCId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'RedshiftServerlessSubnets',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'RedshiftServerlessSGs',
                        ParameterValue: 'sg-00000000000000030,sg-00000000000000031',
                      },
                      {
                        ParameterKey: 'RedshiftServerlessRPU',
                        ParameterValue: '8',
                      },
                    ],
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
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-kinesis ON_DEMAND + ETL + provisioned redshift', async () => {
    dictionaryMock(ddbMock);
    stackParameterMock(ddbMock, kafkaMock, redshiftServerlessClient, redshiftClient);
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PublicSubnetIds',
                        ParameterValue: 'subnet-00000000000000021,subnet-00000000000000022,subnet-00000000000000023',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'DomainName',
                        ParameterValue: 'fake.example.com',
                      },
                      {
                        ParameterKey: 'ACMCertificateArn',
                        ParameterValue: 'arn:aws:acm:ap-southeast-1:111122223333:certificate/398ce638-e522-40e8-b344-fad5a616e11b',
                      },
                      {
                        ParameterKey: 'Protocol',
                        ParameterValue: 'HTTPS',
                      },
                      {
                        ParameterKey: 'ServerEndpointPath',
                        ParameterValue: '/collect',
                      },
                      {
                        ParameterKey: 'ServerCorsOrigin',
                        ParameterValue: '',
                      },
                      {
                        ParameterKey: 'ServerMax',
                        ParameterValue: '4',
                      },
                      {
                        ParameterKey: 'ServerMin',
                        ParameterValue: '2',
                      },
                      {
                        ParameterKey: 'ScaleOnCpuUtilizationPercent',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'WarmPoolSize',
                        ParameterValue: '1',
                      },
                      {
                        ParameterKey: 'NotificationsTopicArn',
                        ParameterValue: 'arn:aws:sns:us-east-1:111122223333:test',
                      },
                      {
                        ParameterKey: 'EnableGlobalAccelerator',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'DevMode',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'EnableAuthentication',
                        ParameterValue: 'No',
                      },
                      {
                        ParameterKey: 'EnableApplicationLoadBalancerAccessLog',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'LogS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LogS3Prefix',
                        ParameterValue: 'logs/',
                      },
                      {
                        ParameterKey: 'KinesisDataS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'KinesisDataS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/buffer/',
                      },
                      {
                        ParameterKey: 'KinesisStreamMode',
                        ParameterValue: 'ON_DEMAND',
                      },
                      {
                        ParameterKey: 'KinesisShardCount',
                        ParameterValue: '3',
                      },
                      {
                        ParameterKey: 'KinesisDataRetentionHours',
                        ParameterValue: '24',
                      },
                      {
                        ParameterKey: 'KinesisBatchSize',
                        ParameterValue: '10000',
                      },
                      {
                        ParameterKey: 'KinesisMaxBatchingWindowSeconds',
                        ParameterValue: '300',
                      },
                    ],
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'ProjectId',
                        ParameterValue: MOCK_PROJECT_ID,
                      },
                      {
                        ParameterKey: 'AppIds',
                        ParameterValue: `${MOCK_APP_ID}_1,${MOCK_APP_ID}_2`,
                      },
                      {
                        ParameterKey: 'SourceS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'SourceS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/buffer/',
                      },
                      {
                        ParameterKey: 'SinkS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'SinkS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/ods/',
                      },
                      {
                        ParameterKey: 'PipelineS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'PipelineS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/pipeline-temp/',
                      },
                      {
                        ParameterKey: 'DataFreshnessInHour',
                        ParameterValue: '7',
                      },
                      {
                        ParameterKey: 'ScheduleExpression',
                        ParameterValue: 'hour',
                      },
                      {
                        ParameterKey: 'TransformerAndEnrichClassNames',
                        ParameterValue: 'sofeware.aws.solution.clickstream.Transformer,sofeware.aws.solution.clickstream.UAEnrichment,sofeware.aws.solution.clickstream.IPEnrichment,test.aws.solution.main',
                      },
                      {
                        ParameterKey: 'S3PathPluginJars',
                        ParameterValue: 's3://example-bucket/pipeline/jars/test-enrich-0.1.0.jar',
                      },
                      {
                        ParameterKey: 'S3PathPluginFiles',
                        ParameterValue: 's3://example-bucket/pipeline/files/data3.mmdb,s3://example-bucket/pipeline/files/data4.mmdb',
                      },
                      {
                        ParameterKey: 'OutputFormat',
                        ParameterValue: 'parquet',
                      },
                    ],
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'ProjectId',
                        ParameterValue: MOCK_PROJECT_ID,
                      },
                      {
                        ParameterKey: 'AppIds',
                        ParameterValue: `${MOCK_APP_ID}_1,${MOCK_APP_ID}_2`,
                      },
                      {
                        ParameterKey: 'ODSEventBucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'ODSEventPrefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/ods/',
                      },
                      {
                        ParameterKey: 'ODSEventFileSuffix',
                        ParameterValue: '.snappy.parquet',
                      },
                      {
                        ParameterKey: 'LoadWorkflowBucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LoadWorkflowBucketPrefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/ods/',
                      },
                      {
                        ParameterKey: 'MaxFilesLimit',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'ProcessingFilesLimit',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'LoadJobScheduleInterval',
                        ParameterValue: '180',
                      },
                      {
                        ParameterKey: 'RedshiftMode',
                        ParameterValue: 'Provisioned',
                      },
                      {
                        ParameterKey: 'RedshiftClusterIdentifier',
                        ParameterValue: 'redshift-cluster-1',
                      },
                      {
                        ParameterKey: 'RedshiftDbUser',
                        ParameterValue: 'clickstream',
                      },
                    ],
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
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-kinesis ON_DEMAND + ETL + provisioned redshift + quicksight', async () => {
    dictionaryMock(ddbMock);
    stackParameterMock(ddbMock, kafkaMock, redshiftServerlessClient, redshiftClient);
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PublicSubnetIds',
                        ParameterValue: 'subnet-00000000000000021,subnet-00000000000000022,subnet-00000000000000023',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'DomainName',
                        ParameterValue: 'fake.example.com',
                      },
                      {
                        ParameterKey: 'ACMCertificateArn',
                        ParameterValue: 'arn:aws:acm:ap-southeast-1:111122223333:certificate/398ce638-e522-40e8-b344-fad5a616e11b',
                      },
                      {
                        ParameterKey: 'Protocol',
                        ParameterValue: 'HTTPS',
                      },
                      {
                        ParameterKey: 'ServerEndpointPath',
                        ParameterValue: '/collect',
                      },
                      {
                        ParameterKey: 'ServerCorsOrigin',
                        ParameterValue: '',
                      },
                      {
                        ParameterKey: 'ServerMax',
                        ParameterValue: '4',
                      },
                      {
                        ParameterKey: 'ServerMin',
                        ParameterValue: '2',
                      },
                      {
                        ParameterKey: 'ScaleOnCpuUtilizationPercent',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'WarmPoolSize',
                        ParameterValue: '1',
                      },
                      {
                        ParameterKey: 'NotificationsTopicArn',
                        ParameterValue: 'arn:aws:sns:us-east-1:111122223333:test',
                      },
                      {
                        ParameterKey: 'EnableGlobalAccelerator',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'DevMode',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'EnableAuthentication',
                        ParameterValue: 'No',
                      },
                      {
                        ParameterKey: 'EnableApplicationLoadBalancerAccessLog',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'LogS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LogS3Prefix',
                        ParameterValue: 'logs/',
                      },
                      {
                        ParameterKey: 'KinesisDataS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'KinesisDataS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/buffer/',
                      },
                      {
                        ParameterKey: 'KinesisStreamMode',
                        ParameterValue: 'ON_DEMAND',
                      },
                      {
                        ParameterKey: 'KinesisShardCount',
                        ParameterValue: '3',
                      },
                      {
                        ParameterKey: 'KinesisDataRetentionHours',
                        ParameterValue: '24',
                      },
                      {
                        ParameterKey: 'KinesisBatchSize',
                        ParameterValue: '10000',
                      },
                      {
                        ParameterKey: 'KinesisMaxBatchingWindowSeconds',
                        ParameterValue: '300',
                      },
                    ],
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'ProjectId',
                        ParameterValue: MOCK_PROJECT_ID,
                      },
                      {
                        ParameterKey: 'AppIds',
                        ParameterValue: `${MOCK_APP_ID}_1,${MOCK_APP_ID}_2`,
                      },
                      {
                        ParameterKey: 'SourceS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'SourceS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/buffer/',
                      },
                      {
                        ParameterKey: 'SinkS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'SinkS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/ods/',
                      },
                      {
                        ParameterKey: 'PipelineS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'PipelineS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/pipeline-temp/',
                      },
                      {
                        ParameterKey: 'DataFreshnessInHour',
                        ParameterValue: '7',
                      },
                      {
                        ParameterKey: 'ScheduleExpression',
                        ParameterValue: 'hour',
                      },
                      {
                        ParameterKey: 'TransformerAndEnrichClassNames',
                        ParameterValue: 'sofeware.aws.solution.clickstream.Transformer,sofeware.aws.solution.clickstream.UAEnrichment,sofeware.aws.solution.clickstream.IPEnrichment,test.aws.solution.main',
                      },
                      {
                        ParameterKey: 'S3PathPluginJars',
                        ParameterValue: 's3://example-bucket/pipeline/jars/test-enrich-0.1.0.jar',
                      },
                      {
                        ParameterKey: 'S3PathPluginFiles',
                        ParameterValue: 's3://example-bucket/pipeline/files/data3.mmdb,s3://example-bucket/pipeline/files/data4.mmdb',
                      },
                      {
                        ParameterKey: 'OutputFormat',
                        ParameterValue: 'parquet',
                      },
                    ],
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'ProjectId',
                        ParameterValue: MOCK_PROJECT_ID,
                      },
                      {
                        ParameterKey: 'AppIds',
                        ParameterValue: `${MOCK_APP_ID}_1,${MOCK_APP_ID}_2`,
                      },
                      {
                        ParameterKey: 'ODSEventBucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'ODSEventPrefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/ods/',
                      },
                      {
                        ParameterKey: 'ODSEventFileSuffix',
                        ParameterValue: '.snappy.parquet',
                      },
                      {
                        ParameterKey: 'LoadWorkflowBucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LoadWorkflowBucketPrefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/ods/',
                      },
                      {
                        ParameterKey: 'MaxFilesLimit',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'ProcessingFilesLimit',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'LoadJobScheduleInterval',
                        ParameterValue: '180',
                      },
                      {
                        ParameterKey: 'RedshiftMode',
                        ParameterValue: 'Provisioned',
                      },
                      {
                        ParameterKey: 'RedshiftClusterIdentifier',
                        ParameterValue: 'redshift-cluster-1',
                      },
                      {
                        ParameterKey: 'RedshiftDbUser',
                        ParameterValue: 'clickstream',
                      },
                    ],
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
                    Parameters: [
                      {
                        ParameterKey: 'QuickSightUserParam',
                        ParameterValue: 'clickstream-user-xxx',
                      },
                      {
                        ParameterKey: 'QuickSightNamespaceParam',
                        ParameterValue: 'default',
                      },
                      {
                        ParameterKey: 'RedshiftDBParam',
                        ParameterValue: 'project_8888_8888',
                      },
                      {
                        ParameterKey: 'RedShiftDBSchemaParam',
                        ParameterValue: 'app_7777_7777_1,app_7777_7777_2',
                      },
                      {
                        ParameterKey: 'QuickSightTemplateArnParam',
                        ParameterValue: 'arn:aws:quicksight:us-east-1:555555555555:template/clickstream-quicksight-template-v1',
                      },
                      {
                        ParameterKey: 'RedshiftEndpointParam',
                        ParameterValue: 'https://redshift/xxx/yyy',
                      },
                      {
                        ParameterKey: 'RedshiftPortParam',
                        ParameterValue: '5002',
                      },
                      {
                        ParameterKey: 'RedshiftParameterKeyParam.#',
                        ParameterValue: '#.Clickstream-DataAnalytics-6666-6666.BIUserCredentialParameterName',
                      },
                    ],
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
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow ingestion-server-kinesis ON_DEMAND + ETL + new redshift + quicksight', async () => {
    dictionaryMock(ddbMock);
    stackParameterMock(ddbMock, kafkaMock, redshiftServerlessClient, redshiftClient);
    ec2Mock.on(DescribeSubnetsCommand)
      .resolvesOnce({
        Subnets: [{ AvailabilityZone: 'us-east-1a' }],
      })
      .resolvesOnce({
        Subnets: [{ AvailabilityZone: 'us-east-1b' }],
      })
      .resolvesOnce({
        Subnets: [{ AvailabilityZone: 'us-east-1c' }],
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PublicSubnetIds',
                        ParameterValue: 'subnet-00000000000000021,subnet-00000000000000022,subnet-00000000000000023',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'DomainName',
                        ParameterValue: 'fake.example.com',
                      },
                      {
                        ParameterKey: 'ACMCertificateArn',
                        ParameterValue: 'arn:aws:acm:ap-southeast-1:111122223333:certificate/398ce638-e522-40e8-b344-fad5a616e11b',
                      },
                      {
                        ParameterKey: 'Protocol',
                        ParameterValue: 'HTTPS',
                      },
                      {
                        ParameterKey: 'ServerEndpointPath',
                        ParameterValue: '/collect',
                      },
                      {
                        ParameterKey: 'ServerCorsOrigin',
                        ParameterValue: '',
                      },
                      {
                        ParameterKey: 'ServerMax',
                        ParameterValue: '4',
                      },
                      {
                        ParameterKey: 'ServerMin',
                        ParameterValue: '2',
                      },
                      {
                        ParameterKey: 'ScaleOnCpuUtilizationPercent',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'WarmPoolSize',
                        ParameterValue: '1',
                      },
                      {
                        ParameterKey: 'NotificationsTopicArn',
                        ParameterValue: 'arn:aws:sns:us-east-1:111122223333:test',
                      },
                      {
                        ParameterKey: 'EnableGlobalAccelerator',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'DevMode',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'EnableAuthentication',
                        ParameterValue: 'No',
                      },
                      {
                        ParameterKey: 'EnableApplicationLoadBalancerAccessLog',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'LogS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LogS3Prefix',
                        ParameterValue: 'logs/',
                      },
                      {
                        ParameterKey: 'KinesisDataS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'KinesisDataS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/buffer/',
                      },
                      {
                        ParameterKey: 'KinesisStreamMode',
                        ParameterValue: 'ON_DEMAND',
                      },
                      {
                        ParameterKey: 'KinesisShardCount',
                        ParameterValue: '3',
                      },
                      {
                        ParameterKey: 'KinesisDataRetentionHours',
                        ParameterValue: '24',
                      },
                      {
                        ParameterKey: 'KinesisBatchSize',
                        ParameterValue: '10000',
                      },
                      {
                        ParameterKey: 'KinesisMaxBatchingWindowSeconds',
                        ParameterValue: '300',
                      },
                    ],
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'ProjectId',
                        ParameterValue: MOCK_PROJECT_ID,
                      },
                      {
                        ParameterKey: 'AppIds',
                        ParameterValue: `${MOCK_APP_ID}_1,${MOCK_APP_ID}_2`,
                      },
                      {
                        ParameterKey: 'SourceS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'SourceS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/buffer/',
                      },
                      {
                        ParameterKey: 'SinkS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'SinkS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/ods/',
                      },
                      {
                        ParameterKey: 'PipelineS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'PipelineS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/pipeline-temp/',
                      },
                      {
                        ParameterKey: 'DataFreshnessInHour',
                        ParameterValue: '7',
                      },
                      {
                        ParameterKey: 'ScheduleExpression',
                        ParameterValue: 'hour',
                      },
                      {
                        ParameterKey: 'TransformerAndEnrichClassNames',
                        ParameterValue: 'sofeware.aws.solution.clickstream.Transformer,sofeware.aws.solution.clickstream.UAEnrichment,sofeware.aws.solution.clickstream.IPEnrichment,test.aws.solution.main',
                      },
                      {
                        ParameterKey: 'S3PathPluginJars',
                        ParameterValue: 's3://example-bucket/pipeline/jars/test-enrich-0.1.0.jar',
                      },
                      {
                        ParameterKey: 'S3PathPluginFiles',
                        ParameterValue: 's3://example-bucket/pipeline/files/data3.mmdb,s3://example-bucket/pipeline/files/data4.mmdb',
                      },
                      {
                        ParameterKey: 'OutputFormat',
                        ParameterValue: 'parquet',
                      },
                    ],
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'ProjectId',
                        ParameterValue: MOCK_PROJECT_ID,
                      },
                      {
                        ParameterKey: 'AppIds',
                        ParameterValue: `${MOCK_APP_ID}_1,${MOCK_APP_ID}_2`,
                      },
                      {
                        ParameterKey: 'ODSEventBucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'ODSEventPrefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/ods/',
                      },
                      {
                        ParameterKey: 'ODSEventFileSuffix',
                        ParameterValue: '.snappy.parquet',
                      },
                      {
                        ParameterKey: 'LoadWorkflowBucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LoadWorkflowBucketPrefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/ods/',
                      },
                      {
                        ParameterKey: 'MaxFilesLimit',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'ProcessingFilesLimit',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'LoadJobScheduleInterval',
                        ParameterValue: '180',
                      },
                      {
                        ParameterKey: 'RedshiftMode',
                        ParameterValue: 'New_Serverless',
                      },
                      {
                        ParameterKey: 'NewRedshiftServerlessWorkgroupName',
                        ParameterValue: 'clickstream-project-8888-8888',
                      },
                      {
                        ParameterKey: 'RedshiftServerlessVPCId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'RedshiftServerlessSubnets',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'RedshiftServerlessSGs',
                        ParameterValue: 'sg-00000000000000030,sg-00000000000000031',
                      },
                      {
                        ParameterKey: 'RedshiftServerlessRPU',
                        ParameterValue: '8',
                      },
                    ],
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
                    Parameters: [
                      {
                        ParameterKey: 'QuickSightUserParam',
                        ParameterValue: 'clickstream-user-xxx',
                      },
                      {
                        ParameterKey: 'QuickSightNamespaceParam',
                        ParameterValue: 'default',
                      },
                      {
                        ParameterKey: 'RedshiftDBParam',
                        ParameterValue: 'project_8888_8888',
                      },
                      {
                        ParameterKey: 'RedShiftDBSchemaParam',
                        ParameterValue: 'app_7777_7777_1,app_7777_7777_2',
                      },
                      {
                        ParameterKey: 'QuickSightTemplateArnParam',
                        ParameterValue: 'arn:aws:quicksight:us-east-1:555555555555:template/clickstream-quicksight-template-v1',
                      },
                      {
                        ParameterKey: 'RedshiftEndpointParam.#',
                        ParameterValue: '#.Clickstream-DataAnalytics-6666-6666.StackCreatedRedshiftServerlessWorkgroupEndpointAddress',
                      },
                      {
                        ParameterKey: 'RedshiftPortParam.#',
                        ParameterValue: '#.Clickstream-DataAnalytics-6666-6666.StackCreatedRedshiftServerlessWorkgroupEndpointPort',
                      },
                      {
                        ParameterKey: 'RedshiftParameterKeyParam.#',
                        ParameterValue: '#.Clickstream-DataAnalytics-6666-6666.BIUserCredentialParameterName',
                      },
                    ],
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
        ],
        End: true,
        Type: 'Parallel',
      },
    };
    expect(wf).toEqual(expected);
  });
  it('Generate Workflow allow app id is empty', async () => {
    dictionaryMock(ddbMock);
    stackParameterMock(ddbMock, kafkaMock, redshiftServerlessClient, redshiftClient, { noApp: true });
    secretsManagerClient.on(GetSecretValueCommand).resolves({
      SecretString: '{"issuer":"1","userEndpoint":"2","authorizationEndpoint":"3","tokenEndpoint":"4","appClientId":"5","appClientSecret":"6"}',
    });
    const pipeline: CPipeline = new CPipeline(MSK_ETL_REDSHIFT_PIPELINE);
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PublicSubnetIds',
                        ParameterValue: 'subnet-00000000000000021,subnet-00000000000000022,subnet-00000000000000023',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'DomainName',
                        ParameterValue: 'fake.example.com',
                      },
                      {
                        ParameterKey: 'ACMCertificateArn',
                        ParameterValue: 'arn:aws:acm:ap-southeast-1:111122223333:certificate/398ce638-e522-40e8-b344-fad5a616e11b',
                      },
                      {
                        ParameterKey: 'Protocol',
                        ParameterValue: 'HTTPS',
                      },
                      {
                        ParameterKey: 'ServerEndpointPath',
                        ParameterValue: '/collect',
                      },
                      {
                        ParameterKey: 'ServerCorsOrigin',
                        ParameterValue: '',
                      },
                      {
                        ParameterKey: 'ServerMax',
                        ParameterValue: '4',
                      },
                      {
                        ParameterKey: 'ServerMin',
                        ParameterValue: '2',
                      },
                      {
                        ParameterKey: 'ScaleOnCpuUtilizationPercent',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'WarmPoolSize',
                        ParameterValue: '1',
                      },
                      {
                        ParameterKey: 'NotificationsTopicArn',
                        ParameterValue: 'arn:aws:sns:us-east-1:111122223333:test',
                      },
                      {
                        ParameterKey: 'EnableGlobalAccelerator',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'DevMode',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'EnableAuthentication',
                        ParameterValue: 'No',
                      },
                      {
                        ParameterKey: 'EnableApplicationLoadBalancerAccessLog',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'LogS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LogS3Prefix',
                        ParameterValue: 'logs/',
                      },
                      {
                        ParameterKey: 'MskClusterName',
                        ParameterValue: 'mskClusterName',
                      },
                      {
                        ParameterKey: 'MskSecurityGroupId',
                        ParameterValue: 'sg-0000000000002',
                      },
                      {
                        ParameterKey: 'KafkaTopic',
                        ParameterValue: 'project_8888_8888',
                      },
                      {
                        ParameterKey: 'KafkaBrokers',
                        ParameterValue: 'test1.com:9092,test2.com:9092,test3.com:9092',
                      },
                    ],
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
                    Parameters: [
                      {
                        ParameterKey: 'DataS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'DataS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/buffer/',
                      },
                      {
                        ParameterKey: 'LogS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LogS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/logs/kafka-connector/',
                      },
                      {
                        ParameterKey: 'PluginS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'PluginS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/runtime/ingestion/kafka-connector/plugins/',
                      },
                      {
                        ParameterKey: 'SubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'KafkaBrokers',
                        ParameterValue: 'test1.com:9092,test2.com:9092,test3.com:9092',
                      },
                      {
                        ParameterKey: 'KafkaTopic',
                        ParameterValue: 'project_8888_8888',
                      },
                      {
                        ParameterKey: 'MskClusterName',
                        ParameterValue: 'mskClusterName',
                      },
                      {
                        ParameterKey: 'SecurityGroupId',
                        ParameterValue: 'sg-0000000000002',
                      },
                    ],
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'ProjectId',
                        ParameterValue: MOCK_PROJECT_ID,
                      },
                      {
                        ParameterKey: 'AppIds',
                        ParameterValue: '',
                      },
                      {
                        ParameterKey: 'SourceS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'SourceS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/buffer/project_8888_8888/',
                      },
                      {
                        ParameterKey: 'SinkS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'SinkS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/ods/',
                      },
                      {
                        ParameterKey: 'PipelineS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'PipelineS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/pipeline-temp/',
                      },
                      {
                        ParameterKey: 'DataFreshnessInHour',
                        ParameterValue: '7',
                      },
                      {
                        ParameterKey: 'ScheduleExpression',
                        ParameterValue: 'hour',
                      },
                      {
                        ParameterKey: 'TransformerAndEnrichClassNames',
                        ParameterValue: 'sofeware.aws.solution.clickstream.Transformer,sofeware.aws.solution.clickstream.UAEnrichment,sofeware.aws.solution.clickstream.IPEnrichment,test.aws.solution.main',
                      },
                      {
                        ParameterKey: 'S3PathPluginJars',
                        ParameterValue: 's3://example-bucket/pipeline/jars/test-enrich-0.1.0.jar',
                      },
                      {
                        ParameterKey: 'S3PathPluginFiles',
                        ParameterValue: 's3://example-bucket/pipeline/files/data3.mmdb,s3://example-bucket/pipeline/files/data4.mmdb',
                      },
                      {
                        ParameterKey: 'OutputFormat',
                        ParameterValue: 'parquet',
                      },
                    ],
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'ProjectId',
                        ParameterValue: MOCK_PROJECT_ID,
                      },
                      {
                        ParameterKey: 'AppIds',
                        ParameterValue: '',
                      },
                      {
                        ParameterKey: 'ODSEventBucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'ODSEventPrefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/ods/',
                      },
                      {
                        ParameterKey: 'ODSEventFileSuffix',
                        ParameterValue: '.snappy.parquet',
                      },
                      {
                        ParameterKey: 'LoadWorkflowBucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LoadWorkflowBucketPrefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/ods/',
                      },
                      {
                        ParameterKey: 'MaxFilesLimit',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'ProcessingFilesLimit',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'LoadJobScheduleInterval',
                        ParameterValue: '180',
                      },
                      {
                        ParameterKey: 'RedshiftMode',
                        ParameterValue: 'Serverless',
                      },
                      {
                        ParameterKey: 'RedshiftServerlessNamespaceId',
                        ParameterValue: '3fe99af1-0b02-4b43-b8d4-34ccfd52c865',
                      },
                      {
                        ParameterKey: 'RedshiftServerlessWorkgroupId',
                        ParameterValue: 'd60f7989-f4ce-46c5-95da-2f9cc7a27725',
                      },
                      {
                        ParameterKey: 'RedshiftServerlessWorkgroupName',
                        ParameterValue: 'test-wg',
                      },
                      {
                        ParameterKey: 'RedshiftServerlessIAMRole',
                        ParameterValue: 'arn:aws:iam::555555555555:role/data-analytics-redshift',
                      },
                    ],
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
        ],
        End: true,
        Type: 'Parallel',
      },
    };

    expect(wf).toEqual(expected);
  });
  it('Generate Retry Workflow', async () => {
    dictionaryMock(ddbMock);
    sfnClient.on(StartExecutionCommand).resolves({ executionArn: MOCK_EXECUTION_ID });
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PublicSubnetIds',
                        ParameterValue: 'subnet-00000000000000021,subnet-00000000000000022,subnet-00000000000000023',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'DomainName',
                        ParameterValue: 'fake.example.com',
                      },
                      {
                        ParameterKey: 'ACMCertificateArn',
                        ParameterValue: 'arn:aws:acm:ap-southeast-1:111122223333:certificate/398ce638-e522-40e8-b344-fad5a616e11b',
                      },
                      {
                        ParameterKey: 'Protocol',
                        ParameterValue: 'HTTPS',
                      },
                      {
                        ParameterKey: 'ServerEndpointPath',
                        ParameterValue: '/collect',
                      },
                      {
                        ParameterKey: 'ServerCorsOrigin',
                        ParameterValue: '',
                      },
                      {
                        ParameterKey: 'ServerMax',
                        ParameterValue: '4',
                      },
                      {
                        ParameterKey: 'ServerMin',
                        ParameterValue: '2',
                      },
                      {
                        ParameterKey: 'ScaleOnCpuUtilizationPercent',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'WarmPoolSize',
                        ParameterValue: '1',
                      },
                      {
                        ParameterKey: 'NotificationsTopicArn',
                        ParameterValue: 'arn:aws:sns:us-east-1:111122223333:test',
                      },
                      {
                        ParameterKey: 'EnableGlobalAccelerator',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'EnableApplicationLoadBalancerAccessLog',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'LogS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LogS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/logs/alb/',
                      },
                      {
                        ParameterKey: 'MskClusterName',
                        ParameterValue: 'test',
                      },
                      {
                        ParameterKey: 'MskSecurityGroupId',
                        ParameterValue: 'sg-0000000000002',
                      },
                      {
                        ParameterKey: 'KafkaTopic',
                        ParameterValue: 't1',
                      },
                      {
                        ParameterKey: 'KafkaBrokers',
                        ParameterValue: 'test1.com:9092,test2.com:9092,test3.com:9092',
                      },
                    ],
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
                    Parameters: [
                      {
                        ParameterKey: 'DataS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'DataS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/buffer/',
                      },
                      {
                        ParameterKey: 'LogS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LogS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/logs/kafka-connector/',
                      },
                      {
                        ParameterKey: 'PluginS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'PluginS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/runtime/ingestion/kafka-connector/plugins/',
                      },
                      {
                        ParameterKey: 'SubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'KafkaBrokers',
                        ParameterValue: 'test1.com:9092,test2.com:9092,test3.com:9092',
                      },
                      {
                        ParameterKey: 'KafkaTopic',
                        ParameterValue: 't1',
                      },
                      {
                        ParameterKey: 'MskClusterName',
                        ParameterValue: 'test',
                      },
                      {
                        ParameterKey: 'SecurityGroupId',
                        ParameterValue: 'sg-0000000000002',
                      },
                    ],
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'ProjectId',
                        ParameterValue: MOCK_PROJECT_ID,
                      },
                      {
                        ParameterKey: 'AppIds',
                        ParameterValue: '',
                      },
                      {
                        ParameterKey: 'SourceS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'SourceS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/buffer/t1/',
                      },
                      {
                        ParameterKey: 'SinkS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'SinkS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/ods/',
                      },
                      {
                        ParameterKey: 'PipelineS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'PipelineS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/pipeline-temp/',
                      },
                      {
                        ParameterKey: 'DataFreshnessInHour',
                        ParameterValue: '72',
                      },
                      {
                        ParameterKey: 'ScheduleExpression',
                        ParameterValue: 'rate(1 hour)',
                      },
                      {
                        ParameterKey: 'TransformerAndEnrichClassNames',
                        ParameterValue: 'sofeware.aws.solution.clickstream.Transformer,sofeware.aws.solution.clickstream.UAEnrichment,sofeware.aws.solution.clickstream.IPEnrichment',
                      },
                      {
                        ParameterKey: 'OutputFormat',
                        ParameterValue: 'parquet',
                      },
                    ],
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
                    Region: 'ap-southeast-1',
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'ProjectId',
                        ParameterValue: MOCK_PROJECT_ID,
                      },
                      {
                        ParameterKey: 'AppIds',
                        ParameterValue: '',
                      },
                      {
                        ParameterKey: 'ODSEventBucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'ODSEventPrefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/ods/',
                      },
                      {
                        ParameterKey: 'ODSEventFileSuffix',
                        ParameterValue: '.snappy.parquet',
                      },
                      {
                        ParameterKey: 'LoadWorkflowBucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LoadWorkflowBucketPrefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/ods/',
                      },
                      {
                        ParameterKey: 'MaxFilesLimit',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'ProcessingFilesLimit',
                        ParameterValue: '100',
                      },
                      {
                        ParameterKey: 'RedshiftServerlessNamespaceId',
                        ParameterValue: '3fe99af1-0b02-4b43-b8d4-34ccfd52c865',
                      },
                      {
                        ParameterKey: 'RedshiftServerlessWorkgroupId',
                        ParameterValue: 'd60f7989-f4ce-46c5-95da-2f9cc7a27725',
                      },
                      {
                        ParameterKey: 'RedshiftServerlessWorkgroupName',
                        ParameterValue: 'test',
                      },
                      {
                        ParameterKey: 'RedshiftServerlessIAMRole',
                        ParameterValue: 'arn:aws:iam::111122223333:role/MyRedshiftServerlessDataRole',
                      },
                    ],
                    StackName: 'Clickstream-DataAnalytics-6666-6666',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-analytics-redshift-stack.template.json',
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
  it('Generate Delete Workflow', async () => {
    dictionaryMock(ddbMock);
    sfnClient.on(StartExecutionCommand).resolves({ executionArn: MOCK_EXECUTION_ID });
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PublicSubnetIds',
                        ParameterValue: 'subnet-00000000000000021,subnet-00000000000000022,subnet-00000000000000023',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'DomainName',
                        ParameterValue: 'fake.example.com',
                      },
                      {
                        ParameterKey: 'ACMCertificateArn',
                        ParameterValue: 'arn:aws:acm:ap-southeast-1:111122223333:certificate/398ce638-e522-40e8-b344-fad5a616e11b',
                      },
                      {
                        ParameterKey: 'Protocol',
                        ParameterValue: 'HTTPS',
                      },
                      {
                        ParameterKey: 'ServerEndpointPath',
                        ParameterValue: '/collect',
                      },
                      {
                        ParameterKey: 'ServerCorsOrigin',
                        ParameterValue: '',
                      },
                      {
                        ParameterKey: 'ServerMax',
                        ParameterValue: '4',
                      },
                      {
                        ParameterKey: 'ServerMin',
                        ParameterValue: '2',
                      },
                      {
                        ParameterKey: 'ScaleOnCpuUtilizationPercent',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'WarmPoolSize',
                        ParameterValue: '1',
                      },
                      {
                        ParameterKey: 'NotificationsTopicArn',
                        ParameterValue: 'arn:aws:sns:us-east-1:111122223333:test',
                      },
                      {
                        ParameterKey: 'EnableGlobalAccelerator',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'EnableApplicationLoadBalancerAccessLog',
                        ParameterValue: 'Yes',
                      },
                      {
                        ParameterKey: 'LogS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LogS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/logs/alb/',
                      },
                      {
                        ParameterKey: 'MskClusterName',
                        ParameterValue: 'test',
                      },
                      {
                        ParameterKey: 'MskSecurityGroupId',
                        ParameterValue: 'sg-0000000000002',
                      },
                      {
                        ParameterKey: 'KafkaTopic',
                        ParameterValue: 't1',
                      },
                      {
                        ParameterKey: 'KafkaBrokers',
                        ParameterValue: 'test1.com:9092,test2.com:9092,test3.com:9092',
                      },
                    ],
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
                    Parameters: [
                      {
                        ParameterKey: 'DataS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'DataS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/buffer/',
                      },
                      {
                        ParameterKey: 'LogS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LogS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/logs/kafka-connector/',
                      },
                      {
                        ParameterKey: 'PluginS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'PluginS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/runtime/ingestion/kafka-connector/plugins/',
                      },
                      {
                        ParameterKey: 'SubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'KafkaBrokers',
                        ParameterValue: 'test1.com:9092,test2.com:9092,test3.com:9092',
                      },
                      {
                        ParameterKey: 'KafkaTopic',
                        ParameterValue: 't1',
                      },
                      {
                        ParameterKey: 'MskClusterName',
                        ParameterValue: 'test',
                      },
                      {
                        ParameterKey: 'SecurityGroupId',
                        ParameterValue: 'sg-0000000000002',
                      },
                    ],
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
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'ProjectId',
                        ParameterValue: MOCK_PROJECT_ID,
                      },
                      {
                        ParameterKey: 'AppIds',
                        ParameterValue: '',
                      },
                      {
                        ParameterKey: 'SourceS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'SourceS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/buffer/t1/',
                      },
                      {
                        ParameterKey: 'SinkS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'SinkS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/ods/',
                      },
                      {
                        ParameterKey: 'PipelineS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'PipelineS3Prefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/pipeline-temp/',
                      },
                      {
                        ParameterKey: 'DataFreshnessInHour',
                        ParameterValue: '72',
                      },
                      {
                        ParameterKey: 'ScheduleExpression',
                        ParameterValue: 'rate(1 hour)',
                      },
                      {
                        ParameterKey: 'TransformerAndEnrichClassNames',
                        ParameterValue: 'sofeware.aws.solution.clickstream.Transformer,sofeware.aws.solution.clickstream.UAEnrichment,sofeware.aws.solution.clickstream.IPEnrichment',
                      },
                      {
                        ParameterKey: 'OutputFormat',
                        ParameterValue: 'parquet',
                      },
                    ],
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
              DataAnalytics: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/main-3333-3333',
                  },
                  Input: {
                    Action: 'Delete',
                    Region: 'ap-southeast-1',
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-00000000000000001',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-00000000000000011,subnet-00000000000000012,subnet-00000000000000013',
                      },
                      {
                        ParameterKey: 'ProjectId',
                        ParameterValue: MOCK_PROJECT_ID,
                      },
                      {
                        ParameterKey: 'AppIds',
                        ParameterValue: '',
                      },
                      {
                        ParameterKey: 'ODSEventBucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'ODSEventPrefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/ods/',
                      },
                      {
                        ParameterKey: 'ODSEventFileSuffix',
                        ParameterValue: '.snappy.parquet',
                      },
                      {
                        ParameterKey: 'LoadWorkflowBucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LoadWorkflowBucketPrefix',
                        ParameterValue: 'clickstream/project_8888_8888/data/ods/',
                      },
                      {
                        ParameterKey: 'MaxFilesLimit',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'ProcessingFilesLimit',
                        ParameterValue: '100',
                      },
                      {
                        ParameterKey: 'RedshiftServerlessNamespaceId',
                        ParameterValue: '3fe99af1-0b02-4b43-b8d4-34ccfd52c865',
                      },
                      {
                        ParameterKey: 'RedshiftServerlessWorkgroupId',
                        ParameterValue: 'd60f7989-f4ce-46c5-95da-2f9cc7a27725',
                      },
                      {
                        ParameterKey: 'RedshiftServerlessWorkgroupName',
                        ParameterValue: 'test',
                      },
                      {
                        ParameterKey: 'RedshiftServerlessIAMRole',
                        ParameterValue: 'arn:aws:iam::111122223333:role/MyRedshiftServerlessDataRole',
                      },
                    ],
                    StackName: 'Clickstream-DataAnalytics-6666-6666',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-analytics-redshift-stack.template.json',
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
    projectExistedMock(ddbMock, true);
    dictionaryMock(ddbMock);
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
    secretsManagerClient.on(GetSecretValueCommand).resolves({
      SecretString: '{"issuer":"1","userEndpoint":"2","authorizationEndpoint":"3","tokenEndpoint":"4","appClientId":"5","appClientSecret":"6"}',
    });
    const pipeline: CPipeline = new CPipeline(S3_INGESTION_PIPELINE);
    await pipeline.generateWorkflow();
    let templateURL = await pipeline.getTemplateUrl('ingestion_s3');
    expect(templateURL).toEqual('https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.0.0/default/ingestion-server-s3-stack.template.json');
    templateURL = await pipeline.getTemplateUrl('ingestion_no');
    expect(templateURL).toEqual(undefined);
  });
  it('Pipeline template url with latest', async () => {
    projectExistedMock(ddbMock, true);
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
    secretsManagerClient.on(GetSecretValueCommand).resolves({
      SecretString: '{"issuer":"1","userEndpoint":"2","authorizationEndpoint":"3","tokenEndpoint":"4","appClientId":"5","appClientSecret":"6"}',
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