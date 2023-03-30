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

import { ExecutionStatus } from '@aws-sdk/client-sfn';
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { MOCK_PIPELINE_ID, MOCK_PROJECT_ID } from './ddb-mock';
import { server } from '../../index';
import { Pipeline } from '../../model/pipeline';
import { StackManager } from '../../service/stack';
import { KafkaClient, ListNodesCommand } from '@aws-sdk/client-kafka';

const ddbMock = mockClient(DynamoDBDocumentClient);
const kafkaMock = mockClient(KafkaClient);
const stackManager: StackManager = new StackManager();

describe('Pipeline test', () => {
  beforeEach(() => {
    ddbMock.reset();
    kafkaMock.reset();
  });
  it('Generate Workflow ingestion-server-s3', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        name: 'Templates',
        data: '{"ingestion_s3": "ingestion-server-s3-stack.template.json","ingestion_kafka": "ingestion-server-kafka-stack.template.json","ingestion_kinesis": "ingestion-server-kinesis-stack.template.json","kafka-s3-sink": "kafka-s3-sink-stack.template.json","data-pipeline": "data-pipeline-stack.template.json"}',
      },
    });
    ddbMock.on(ScanCommand).resolves({
      Items: [{ id: 1, appId: '1' }, { id: 2, appId: '2' }],
    });

    const pipeline1 = {
      id: MOCK_PROJECT_ID,
      prefix: 'PIPELINE',
      type: `PIPELINE#${MOCK_PIPELINE_ID}`,
      projectId: MOCK_PROJECT_ID,
      appIds: ['appId1', 'appId2'],
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
          domainName: 'click.example.com',
          certificateArn: 'arn:aws:acm:us-east-1:555555555555:certificate/E1WG1ZNPRXT0D4',
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
      },
      etl: undefined,
      dataModel: undefined,
      workflow: '',
      executionArn: '',
      version: '123',
      versionTag: 'latest',
      createAt: 162321434322,
      updateAt: 162321434322,
      operator: '',
      deleted: false,
    };
    const wf = await stackManager.generateWorkflow(pipeline1 as Pipeline, MOCK_PIPELINE_ID);

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
                    BucketPrefix: 'clickstream/workflow/6666-6666/clickstream-ingestion-s3-6666-6666',
                  },
                  Input: {
                    Action: 'Create',
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-0ba32b04ccc029088',
                      },
                      {
                        ParameterKey: 'PublicSubnetIds',
                        ParameterValue: 'subnet-09ae522e85bbee5c5,subnet-09ae522e85bbee5c5,subnet-09ae522e85bbee5c5',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-09ae522e85bbee5c5,subnet-09ae522e85bbee5c5,subnet-09ae522e85bbee5c5',
                      },
                      {
                        ParameterKey: 'DomainName',
                        ParameterValue: 'click.example.com',
                      },
                      {
                        ParameterKey: 'ACMCertificateArn',
                        ParameterValue: 'arn:aws:acm:us-east-1:555555555555:certificate/E1WG1ZNPRXT0D4',
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
                        ParameterValue: '*',
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
                        ParameterValue: 'test/',
                      },
                      {
                        ParameterKey: 'S3BatchMaxBytes',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'S3BatchTimeout',
                        ParameterValue: '30',
                      },
                    ],
                    StackName: 'clickstream-ingestion-s3-6666-6666',
                    TemplateURL: 'https://undefined.s3.us-east-1.amazonaws.com/undefined/undefined/ingestion-server-s3-stack.template.json',
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
  it('Generate Workflow ingestion-server-kafka', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        name: 'Templates',
        data: '{"ingestion_s3": "ingestion-server-s3-stack.template.json","ingestion_kafka": "ingestion-server-kafka-stack.template.json","ingestion_kinesis": "ingestion-server-kinesis-stack.template.json","kafka-s3-sink": "kafka-s3-sink-stack.template.json","data-pipeline": "data-pipeline-stack.template.json"}',
      },
    });
    ddbMock.on(ScanCommand).resolves({
      Items: [{ id: 1, appId: '1' }, { id: 2, appId: '2' }],
    });

    const pipeline1 = {
      id: MOCK_PROJECT_ID,
      prefix: 'PIPELINE',
      type: `PIPELINE#${MOCK_PIPELINE_ID}`,
      projectId: MOCK_PROJECT_ID,
      appIds: ['appId1', 'appId2'],
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
          domainName: 'click.example.com',
          certificateArn: 'arn:aws:acm:us-east-1:555555555555:certificate/E1WG1ZNPRXT0D4',
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
        sinkType: 'kafka',
        sinkKafka: {
          brokers: ['test1', 'test2', 'test3'],
          topic: 't1',
          mskCluster: {
            name: 'mskClusterName',
            arn: 'mskClusterArn',
            securityGroupId: 'sg-0000000000002',
          },
        },
      },
      workflow: '',
      executionArn: '',
      version: '123',
      versionTag: 'latest',
      createAt: 162321434322,
      updateAt: 162321434322,
      operator: '',
      deleted: false,
    };
    const wf = await stackManager.generateWorkflow(pipeline1 as Pipeline, MOCK_PIPELINE_ID);

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
                    BucketPrefix: 'clickstream/workflow/6666-6666/clickstream-ingestion-kafka-6666-6666',
                  },
                  Input: {
                    Action: 'Create',
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-0ba32b04ccc029088',
                      },
                      {
                        ParameterKey: 'PublicSubnetIds',
                        ParameterValue: 'subnet-09ae522e85bbee5c5,subnet-09ae522e85bbee5c5,subnet-09ae522e85bbee5c5',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-09ae522e85bbee5c5,subnet-09ae522e85bbee5c5,subnet-09ae522e85bbee5c5',
                      },
                      {
                        ParameterKey: 'DomainName',
                        ParameterValue: 'click.example.com',
                      },
                      {
                        ParameterKey: 'ACMCertificateArn',
                        ParameterValue: 'arn:aws:acm:us-east-1:555555555555:certificate/E1WG1ZNPRXT0D4',
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
                        ParameterValue: '*',
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
                        ParameterValue: 't1',
                      },
                      {
                        ParameterKey: 'KafkaBrokers',
                        ParameterValue: 'test1,test2,test3',
                      },
                    ],
                    StackName: 'clickstream-ingestion-kafka-6666-6666',
                    TemplateURL: 'https://undefined.s3.us-east-1.amazonaws.com/undefined/undefined/ingestion-server-kafka-stack.template.json',
                  },
                },
                End: true,
                Type: 'Stack',
              },
            },
          },
          {
            StartAt: 'KafkaConnector',
            States: {
              KafkaConnector: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/6666-6666/clickstream-kafka-connector-6666-6666',
                  },
                  Input: {
                    Action: 'Create',
                    Parameters: [
                      {
                        ParameterKey: 'DataS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'DataS3Prefix',
                        ParameterValue: 'clickstream/8888-8888/6666-6666/data/buffer/',
                      },
                      {
                        ParameterKey: 'LogS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LogS3Prefix',
                        ParameterValue: 'clickstream/8888-8888/6666-6666/logs/kafka-connector/',
                      },
                      {
                        ParameterKey: 'PluginS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'PluginS3Prefix',
                        ParameterValue: 'clickstream/8888-8888/6666-6666/runtime/ingestion/kafka-connector/plugins/',
                      },
                      {
                        ParameterKey: 'SubnetIds',
                        ParameterValue: 'subnet-09ae522e85bbee5c5,subnet-09ae522e85bbee5c5,subnet-09ae522e85bbee5c5',
                      },
                      {
                        ParameterKey: 'KafkaBrokers',
                        ParameterValue: 'test1,test2,test3',
                      },
                      {
                        ParameterKey: 'KafkaTopic',
                        ParameterValue: 't1',
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
                    StackName: 'clickstream-kafka-connector-6666-6666',
                    TemplateURL: 'https://undefined.s3.us-east-1.amazonaws.com/undefined/undefined/kafka-s3-sink-stack.template.json',
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
  it('Generate Workflow ingestion-server-kafka msk', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        name: 'Templates',
        data: '{"ingestion_s3": "ingestion-server-s3-stack.template.json","ingestion_kafka": "ingestion-server-kafka-stack.template.json","ingestion_kinesis": "ingestion-server-kinesis-stack.template.json","kafka-s3-sink": "kafka-s3-sink-stack.template.json","data-pipeline": "data-pipeline-stack.template.json"}',
      },
    });
    ddbMock.on(ScanCommand).resolves({
      Items: [{ id: 1, appId: '1' }, { id: 2, appId: '2' }],
    });
    kafkaMock.on(ListNodesCommand).resolves({
      NodeInfoList: [
        {
          BrokerNodeInfo: {
            Endpoints: ['test1', 'test2']
          }
        },
        {
          BrokerNodeInfo: {
            Endpoints: ['test3']
          }
        }
      ]
    });

    const pipeline1 = {
      id: MOCK_PROJECT_ID,
      prefix: 'PIPELINE',
      type: `PIPELINE#${MOCK_PIPELINE_ID}`,
      projectId: MOCK_PROJECT_ID,
      appIds: ['appId1', 'appId2'],
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
          domainName: 'click.example.com',
          certificateArn: 'arn:aws:acm:us-east-1:555555555555:certificate/E1WG1ZNPRXT0D4',
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
        sinkType: 'kafka',
        sinkKafka: {
          brokers: [],
          topic: 't1',
          mskCluster: {
            name: 'mskClusterName',
            arn: 'mskClusterArn',
            securityGroupId: 'sg-0000000000002',
          },
        },
      },
      workflow: '',
      executionArn: '',
      version: '123',
      versionTag: 'latest',
      createAt: 162321434322,
      updateAt: 162321434322,
      operator: '',
      deleted: false,
    };
    const wf = await stackManager.generateWorkflow(pipeline1 as Pipeline, MOCK_PIPELINE_ID);

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
                    BucketPrefix: 'clickstream/workflow/6666-6666/clickstream-ingestion-kafka-6666-6666',
                  },
                  Input: {
                    Action: 'Create',
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-0ba32b04ccc029088',
                      },
                      {
                        ParameterKey: 'PublicSubnetIds',
                        ParameterValue: 'subnet-09ae522e85bbee5c5,subnet-09ae522e85bbee5c5,subnet-09ae522e85bbee5c5',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-09ae522e85bbee5c5,subnet-09ae522e85bbee5c5,subnet-09ae522e85bbee5c5',
                      },
                      {
                        ParameterKey: 'DomainName',
                        ParameterValue: 'click.example.com',
                      },
                      {
                        ParameterKey: 'ACMCertificateArn',
                        ParameterValue: 'arn:aws:acm:us-east-1:555555555555:certificate/E1WG1ZNPRXT0D4',
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
                        ParameterValue: '*',
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
                        ParameterValue: 't1',
                      },
                      {
                        ParameterKey: 'KafkaBrokers',
                        ParameterValue: 'test1:9092,test2:9092,test3:9092',
                      },
                    ],
                    StackName: 'clickstream-ingestion-kafka-6666-6666',
                    TemplateURL: 'https://undefined.s3.us-east-1.amazonaws.com/undefined/undefined/ingestion-server-kafka-stack.template.json',
                  },
                },
                End: true,
                Type: 'Stack',
              },
            },
          },
          {
            StartAt: 'KafkaConnector',
            States: {
              KafkaConnector: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/6666-6666/clickstream-kafka-connector-6666-6666',
                  },
                  Input: {
                    Action: 'Create',
                    Parameters: [
                      {
                        ParameterKey: 'DataS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'DataS3Prefix',
                        ParameterValue: 'clickstream/8888-8888/6666-6666/data/buffer/',
                      },
                      {
                        ParameterKey: 'LogS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LogS3Prefix',
                        ParameterValue: 'clickstream/8888-8888/6666-6666/logs/kafka-connector/',
                      },
                      {
                        ParameterKey: 'PluginS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'PluginS3Prefix',
                        ParameterValue: 'clickstream/8888-8888/6666-6666/runtime/ingestion/kafka-connector/plugins/',
                      },
                      {
                        ParameterKey: 'SubnetIds',
                        ParameterValue: 'subnet-09ae522e85bbee5c5,subnet-09ae522e85bbee5c5,subnet-09ae522e85bbee5c5',
                      },
                      {
                        ParameterKey: 'KafkaBrokers',
                        ParameterValue: 'test1:9092,test2:9092,test3:9092',
                      },
                      {
                        ParameterKey: 'KafkaTopic',
                        ParameterValue: 't1',
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
                    StackName: 'clickstream-kafka-connector-6666-6666',
                    TemplateURL: 'https://undefined.s3.us-east-1.amazonaws.com/undefined/undefined/kafka-s3-sink-stack.template.json',
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
  it('Generate Workflow ingestion-server-kinesis', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        name: 'Templates',
        data: '{"ingestion_s3": "ingestion-server-s3-stack.template.json","ingestion_kafka": "ingestion-server-kafka-stack.template.json","ingestion_kinesis": "ingestion-server-kinesis-stack.template.json","kafka-s3-sink": "kafka-s3-sink-stack.template.json","data-pipeline": "data-pipeline-stack.template.json"}',
      },
    });
    ddbMock.on(ScanCommand).resolves({
      Items: [{ id: 1, appId: '1' }, { id: 2, appId: '2' }],
    });

    const pipeline1 = {
      id: MOCK_PROJECT_ID,
      prefix: 'PIPELINE',
      type: `PIPELINE#${MOCK_PIPELINE_ID}`,
      projectId: MOCK_PROJECT_ID,
      appIds: ['appId1', 'appId2'],
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
          domainName: 'click.example.com',
          certificateArn: 'arn:aws:acm:us-east-1:555555555555:certificate/E1WG1ZNPRXT0D4',
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
        sinkType: 'kinesis',
        sinkKinesis: {
          kinesisStreamMode: '',
          kinesisShardCount: 2,
          sinkBucket: {
            name: 'EXAMPLE_BUCKET',
            prefix: '',
          },
        },
      },
      workflow: '',
      executionArn: '',
      version: '123',
      versionTag: 'latest',
      createAt: 162321434322,
      updateAt: 162321434322,
      operator: '',
      deleted: false,
    };
    const wf = await stackManager.generateWorkflow(pipeline1 as Pipeline, MOCK_PIPELINE_ID);

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
                    BucketPrefix: 'clickstream/workflow/6666-6666/clickstream-ingestion-kinesis-6666-6666',
                  },
                  Input: {
                    Action: 'Create',
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-0ba32b04ccc029088',
                      },
                      {
                        ParameterKey: 'PublicSubnetIds',
                        ParameterValue: 'subnet-09ae522e85bbee5c5,subnet-09ae522e85bbee5c5,subnet-09ae522e85bbee5c5',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-09ae522e85bbee5c5,subnet-09ae522e85bbee5c5,subnet-09ae522e85bbee5c5',
                      },
                      {
                        ParameterKey: 'DomainName',
                        ParameterValue: 'click.example.com',
                      },
                      {
                        ParameterKey: 'ACMCertificateArn',
                        ParameterValue: 'arn:aws:acm:us-east-1:555555555555:certificate/E1WG1ZNPRXT0D4',
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
                        ParameterValue: '*',
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
                        ParameterValue: 'clickstream/8888-8888/6666-6666/data/buffer/',
                      },
                      {
                        ParameterKey: 'KinesisStreamMode',
                        ParameterValue: '',
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
                    StackName: 'clickstream-ingestion-kinesis-6666-6666',
                    TemplateURL: 'https://undefined.s3.us-east-1.amazonaws.com/undefined/undefined/ingestion-server-kinesis-stack.template.json',
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
    ddbMock.on(GetCommand).resolves({
      Item: {
        name: 'Templates',
        data: '{"ingestion_s3": "ingestion-server-s3-stack.template.json","ingestion_kafka": "ingestion-server-kafka-stack.template.json","ingestion_kinesis": "ingestion-server-kinesis-stack.template.json","kafka-s3-sink": "kafka-s3-sink-stack.template.json","data-pipeline": "data-pipeline-stack.template.json"}',
      },
    });
    ddbMock.on(ScanCommand).resolves({
      Items: [{ id: 1, appId: '1' }, { id: 2, appId: '2' }],
    });

    const pipeline1 = {
      id: MOCK_PROJECT_ID,
      prefix: 'PIPELINE',
      type: `PIPELINE#${MOCK_PIPELINE_ID}`,
      projectId: MOCK_PROJECT_ID,
      appIds: ['appId1', 'appId2'],
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
          domainName: 'click.example.com',
          certificateArn: 'arn:aws:acm:us-east-1:555555555555:certificate/E1WG1ZNPRXT0D4',
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
      },
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
        transformPlugin: '',
        enrichPlugin: [],
      },
      dataModel: undefined,
      workflow: '',
      executionArn: '',
      version: '123',
      versionTag: 'latest',
      createAt: 162321434322,
      updateAt: 162321434322,
      operator: '',
      deleted: false,
    };
    const wf = await stackManager.generateWorkflow(pipeline1 as Pipeline, MOCK_PIPELINE_ID);

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
                    BucketPrefix: 'clickstream/workflow/6666-6666/clickstream-ingestion-s3-6666-6666',
                  },
                  Input: {
                    Action: 'Create',
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-0ba32b04ccc029088',
                      },
                      {
                        ParameterKey: 'PublicSubnetIds',
                        ParameterValue: 'subnet-09ae522e85bbee5c5,subnet-09ae522e85bbee5c5,subnet-09ae522e85bbee5c5',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-09ae522e85bbee5c5,subnet-09ae522e85bbee5c5,subnet-09ae522e85bbee5c5',
                      },
                      {
                        ParameterKey: 'DomainName',
                        ParameterValue: 'click.example.com',
                      },
                      {
                        ParameterKey: 'ACMCertificateArn',
                        ParameterValue: 'arn:aws:acm:us-east-1:555555555555:certificate/E1WG1ZNPRXT0D4',
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
                        ParameterValue: '*',
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
                        ParameterValue: 'test/',
                      },
                      {
                        ParameterKey: 'S3BatchMaxBytes',
                        ParameterValue: '50',
                      },
                      {
                        ParameterKey: 'S3BatchTimeout',
                        ParameterValue: '30',
                      },
                    ],
                    StackName: 'clickstream-ingestion-s3-6666-6666',
                    TemplateURL: 'https://undefined.s3.us-east-1.amazonaws.com/undefined/undefined/ingestion-server-s3-stack.template.json',
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
                    BucketPrefix: 'clickstream/workflow/6666-6666/clickstream-etl-6666-6666',
                  },
                  Input: {
                    Action: 'Create',
                    Parameters: [
                      {
                        ParameterKey: 'VpcId',
                        ParameterValue: 'vpc-0ba32b04ccc029088',
                      },
                      {
                        ParameterKey: 'PrivateSubnetIds',
                        ParameterValue: 'subnet-09ae522e85bbee5c5,subnet-09ae522e85bbee5c5,subnet-09ae522e85bbee5c5',
                      },
                      {
                        ParameterKey: 'EntryPointJar',
                        ParameterValue: 's3://MOCK_BUCKET/MOCK.jar',
                      },
                      {
                        ParameterKey: 'ProjectId',
                        ParameterValue: '8888-8888',
                      },
                      {
                        ParameterKey: 'AppIds',
                        ParameterValue: '1,2',
                      },
                      {
                        ParameterKey: 'SourceS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'SourceS3Prefix',
                        ParameterValue: 'clickstream/8888-8888/6666-6666/data/buffer/',
                      },
                      {
                        ParameterKey: 'SinkS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'SinkS3Prefix',
                        ParameterValue: 'clickstream/8888-8888/6666-6666/data/ods/',
                      },
                      {
                        ParameterKey: 'PipelineS3Bucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'PipelineS3Prefix',
                        ParameterValue: 'clickstream/8888-8888/6666-6666/data/pipeline-temp/',
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
                        ParameterValue: '',
                      },
                      {
                        ParameterKey: 'S3PathPluginJars',
                        ParameterValue: '',
                      },
                      {
                        ParameterKey: 'S3PathPluginFiles',
                        ParameterValue: '',
                      },
                    ],
                    StackName: 'clickstream-etl-6666-6666',
                    TemplateURL: 'https://undefined.s3.us-east-1.amazonaws.com/undefined/undefined/data-pipeline-stack.template.json',
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
  it('Pipeline template url', async () => {
    ddbMock.on(GetCommand)
      .resolvesOnce({
        Item: {
          name: 'Solution',
          data: {
            name: 'clickstream',
            dist_output_bucket: 'EXAMPLE-BUCKET',
            prefix: 'feature/main/default',
          },
        },
      })
      .resolves({
        Item: {
          name: 'Templates',
          data: {
            ingestion_kafka: 'ingestion-server-kafka-stack.template.json',
            ingestion_kinesis: 'ingestion-server-kinesis-stack.template.json',
            ingestion_s3: 'ingestion-server-s3-stack.template.json',
          },
        },
      });
    let templateURL = await stackManager.getTemplateUrl('ingestion_s3');
    expect(templateURL).toEqual('https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream/feature/main/default/ingestion-server-s3-stack.template.json');
    templateURL = await stackManager.getTemplateUrl('ingestion_no');
    expect(templateURL).toEqual(undefined);

  });
  afterAll((done) => {
    server.close();
    done();
  });
});