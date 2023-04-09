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

import { KafkaClient, ListNodesCommand } from '@aws-sdk/client-kafka';
import {
  GetNamespaceCommand,
  GetWorkgroupCommand,
  RedshiftServerlessClient,
} from '@aws-sdk/client-redshift-serverless';
import { ExecutionStatus } from '@aws-sdk/client-sfn';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { dictionaryMock, MOCK_EXECUTION_ID, MOCK_PIPELINE_ID, MOCK_PROJECT_ID } from './ddb-mock';
import { WorkflowStateType, WorkflowTemplate } from '../../common/types';
import { server } from '../../index';
import { Pipeline } from '../../model/pipeline';
import { StackManager } from '../../service/stack';

const ddbMock = mockClient(DynamoDBDocumentClient);
const kafkaMock = mockClient(KafkaClient);
const redshiftServerlessClient = mockClient(RedshiftServerlessClient);
const stackManager: StackManager = new StackManager();

describe('Workflow test', () => {
  beforeEach(() => {
    ddbMock.reset();
    kafkaMock.reset();
    redshiftServerlessClient.reset();
  });
  it('Generate Workflow ingestion-server-s3', async () => {
    dictionaryMock(ddbMock);
    ddbMock.on(QueryCommand).resolves({
      Items: [{
        id: 1,
        appId: '1',
      }, {
        id: 2,
        appId: '2',
      }],
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
      dataAnalytics: undefined,
      executionArn: '',
      executionName: 'executionName',
      version: '123',
      versionTag: 'latest',
      createAt: 162321434322,
      updateAt: 162321434322,
      operator: '',
      deleted: false,
    };
    const wf = await stackManager.generateWorkflow(pipeline1 as Pipeline);

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
                    BucketPrefix: 'clickstream/workflow/executionName/clickstream-ingestion-s3-6666-6666',
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
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/ingestion-server-s3-stack.template.json',
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
    dictionaryMock(ddbMock);
    ddbMock.on(QueryCommand).resolves({
      Items: [{
        id: 1,
        appId: '1',
      }, {
        id: 2,
        appId: '2',
      }],
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
          brokers: ['test1.com:9092', 'test2.com:9092', 'test3.com:9092'],
          topic: 't1',
          mskCluster: {
            name: 'mskClusterName',
            arn: 'mskClusterArn',
            securityGroupId: 'sg-0000000000002',
          },
        },
      },
      executionArn: '',
      executionName: 'executionName',
      version: '123',
      versionTag: 'latest',
      createAt: 162321434322,
      updateAt: 162321434322,
      operator: '',
      deleted: false,
    };
    const wf = await stackManager.generateWorkflow(pipeline1 as Pipeline);

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
                    BucketPrefix: 'clickstream/workflow/executionName/clickstream-ingestion-kafka-6666-6666',
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
                        ParameterValue: 'test1.com:9092,test2.com:9092,test3.com:9092',
                      },
                    ],
                    StackName: 'clickstream-ingestion-kafka-6666-6666',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/ingestion-server-kafka-stack.template.json',
                  },
                },
                Type: 'Stack',
                Next: 'KafkaConnector',
              },
              KafkaConnector: {
                Data: {
                  Callback: {
                    BucketName: 'EXAMPLE_BUCKET',
                    BucketPrefix: 'clickstream/workflow/executionName/clickstream-kafka-connector-6666-6666',
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
                        ParameterValue: 'test1.com:9092,test2.com:9092,test3.com:9092',
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
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/kafka-s3-sink-stack.template.json',
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
    dictionaryMock(ddbMock);
    ddbMock.on(QueryCommand).resolves({
      Items: [{
        id: 1,
        appId: '1',
      }, {
        id: 2,
        appId: '2',
      }],
    });
    kafkaMock.on(ListNodesCommand).resolves({
      NodeInfoList: [
        {
          BrokerNodeInfo: {
            Endpoints: ['test1.com', 'test2.com'],
          },
        },
        {
          BrokerNodeInfo: {
            Endpoints: ['test3.com'],
          },
        },
      ],
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
      workflow: {
        Version: '2022-03-15',
        Workflow: {
          Type: WorkflowStateType.PASS,
          End: true,
          Branches: [],
        },
      },
      executionArn: '',
      executionName: MOCK_EXECUTION_ID,
      version: '123',
      versionTag: 'latest',
      createAt: 162321434322,
      updateAt: 162321434322,
      operator: '',
      deleted: false,
    };
    const wf = await stackManager.generateWorkflow(pipeline1 as Pipeline);

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
                    BucketPrefix: 'clickstream/workflow/3333-3333/clickstream-ingestion-kafka-6666-6666',
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
                        ParameterValue: 'test1.com:9092,test2.com:9092,test3.com:9092',
                      },
                    ],
                    StackName: 'clickstream-ingestion-kafka-6666-6666',
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
                    BucketPrefix: 'clickstream/workflow/3333-3333/clickstream-kafka-connector-6666-6666',
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
                        ParameterValue: 'test1.com:9092,test2.com:9092,test3.com:9092',
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
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/kafka-s3-sink-stack.template.json',
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
    dictionaryMock(ddbMock);
    ddbMock.on(QueryCommand).resolves({
      Items: [{
        id: 1,
        appId: '1',
      }, {
        id: 2,
        appId: '2',
      }],
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
      executionArn: '',
      executionName: MOCK_EXECUTION_ID,
      version: '123',
      versionTag: 'latest',
      createAt: 162321434322,
      updateAt: 162321434322,
      operator: '',
      deleted: false,
    };
    const wf = await stackManager.generateWorkflow(pipeline1 as Pipeline);

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
                    BucketPrefix: 'clickstream/workflow/3333-3333/clickstream-ingestion-kinesis-6666-6666',
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
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/ingestion-server-kinesis-stack.template.json',
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
    ddbMock.on(QueryCommand).resolves({
      Items: [{
        id: 1,
        appId: '1',
      }, {
        id: 2,
        appId: '2',
      }],
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
        transformPlugin: undefined,
        enrichPlugin: ['a', 'b'],
      },
      dataAnalytics: undefined,
      executionArn: '',
      executionName: MOCK_EXECUTION_ID,
      version: '123',
      versionTag: 'latest',
      createAt: 162321434322,
      updateAt: 162321434322,
      operator: '',
      deleted: false,
    };
    const wf = await stackManager.generateWorkflow(pipeline1 as Pipeline);

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
                    BucketPrefix: 'clickstream/workflow/3333-3333/clickstream-ingestion-s3-6666-6666',
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
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/ingestion-server-s3-stack.template.json',
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
                    BucketPrefix: 'clickstream/workflow/3333-3333/clickstream-etl-6666-6666',
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
                        ParameterValue: 'sofeware.aws.solution.clickstream.Transformer,a,b',
                      },
                      {
                        ParameterKey: 'OutputFormat',
                        ParameterValue: 'parquet',
                      },
                    ],
                    StackName: 'clickstream-etl-6666-6666',
                    TemplateURL: 'https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-pipeline-stack.template.json',
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
    ddbMock.on(QueryCommand).resolves({
      Items: [{
        id: 1,
        appId: '1',
      }, {
        id: 2,
        appId: '2',
      }],
    });
    kafkaMock.on(ListNodesCommand).resolves({
      NodeInfoList: [
        {
          BrokerNodeInfo: {
            Endpoints: ['test1.com', 'test2.com'],
          },
        },
        {
          BrokerNodeInfo: {
            Endpoints: ['test3.com'],
          },
        },
      ],
    });
    redshiftServerlessClient.on(GetWorkgroupCommand).resolves({
      workgroup: {
        workgroupId: 'd60f7989-f4ce-46c5-95da-2f9cc7a27725',
        workgroupArn: 'arn:aws:redshift-serverless:ap-southeast-1:555555555555:workgroup/d60f7989-f4ce-46c5-95da-2f9cc7a27725',
        workgroupName: 'test-wg',
      },
    });
    redshiftServerlessClient.on(GetNamespaceCommand).resolves({
      namespace: {
        namespaceId: '3fe99af1-0b02-4b43-b8d4-34ccfd52c865',
        namespaceArn: 'arn:aws:redshift-serverless:ap-southeast-1:111122223333:namespace/3fe99af1-0b02-4b43-b8d4-34ccfd52c865',
        namespaceName: 'test-ns',
      },
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
        transformPlugin: 'transform',
        enrichPlugin: ['enrich1', 'enrich2'],
      },
      dataAnalytics: {
        ods: {
          bucket: {
            name: 'EXAMPLE_BUCKET',
            prefix: '',
          },
          fileSuffix: '.snappy',
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
      workflow: {
        Version: '2022-03-15',
        Workflow: {
          Type: WorkflowStateType.PASS,
          End: true,
          Branches: [],
        },
      },
      executionArn: '',
      executionName: MOCK_EXECUTION_ID,
      version: '123',
      versionTag: 'latest',
      createAt: 162321434322,
      updateAt: 162321434322,
      operator: '',
      deleted: false,
    };
    const wf = await stackManager.generateWorkflow(pipeline1 as Pipeline);

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
                    BucketPrefix: 'clickstream/workflow/3333-3333/clickstream-ingestion-kafka-6666-6666',
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
                        ParameterValue: 'test1.com:9092,test2.com:9092,test3.com:9092',
                      },
                    ],
                    StackName: 'clickstream-ingestion-kafka-6666-6666',
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
                    BucketPrefix: 'clickstream/workflow/3333-3333/clickstream-kafka-connector-6666-6666',
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
                        ParameterValue: 'test1.com:9092,test2.com:9092,test3.com:9092',
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
                    BucketPrefix: 'clickstream/workflow/3333-3333/clickstream-etl-6666-6666',
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
                        ParameterValue: 'transform,enrich1,enrich2',
                      },
                      {
                        ParameterKey: 'OutputFormat',
                        ParameterValue: 'parquet',
                      },
                    ],
                    StackName: 'clickstream-etl-6666-6666',
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
                    BucketPrefix: 'clickstream/workflow/3333-3333/clickstream-data-analytics-6666-6666',
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
                        ParameterKey: 'ProjectId',
                        ParameterValue: '8888-8888',
                      },
                      {
                        ParameterKey: 'AppIds',
                        ParameterValue: '1,2',
                      },
                      {
                        ParameterKey: 'ODSEventBucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'ODSEventPrefix',
                        ParameterValue: 'clickstream/8888-8888/6666-6666/data/ods/',
                      },
                      {
                        ParameterKey: 'ODSEventFileSuffix',
                        ParameterValue: '.snappy',
                      },
                      {
                        ParameterKey: 'LoadWorkflowBucket',
                        ParameterValue: 'EXAMPLE_BUCKET',
                      },
                      {
                        ParameterKey: 'LoadWorkflowBucketPrefix',
                        ParameterValue: 'clickstream/8888-8888/6666-6666/data/ods/',
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
                        ParameterValue: 'arn:aws:iam::555555555555:role/data-analytics-redshift',
                      },
                    ],
                    StackName: 'clickstream-data-analytics-6666-6666',
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

    expect(wf).toEqual(expected);
  });
  it('Pipeline template url', async () => {
    dictionaryMock(ddbMock);
    let templateURL = await stackManager.getTemplateUrl('ingestion_s3');
    expect(templateURL).toEqual('https://EXAMPLE-BUCKET.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/ingestion-server-s3-stack.template.json');
    templateURL = await stackManager.getTemplateUrl('ingestion_no');
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
            StackName: 'clickstream-sigle-test2',
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
    let res = await stackManager.setWorkflowType(workflowTemplate.Workflow, WorkflowStateType.PASS);
    expect(res).toEqual({
      Data: {
        Callback: {
          BucketName: 'EXAMPLE_BUCKET',
          BucketPrefix: 'clickstream/workflow/000000',
        },
        Input: {
          Action: 'Create',
          Parameters: [
            {
              ParameterKey: 'QueueName',
              ParameterValue: 'test1',
            },
          ],
          StackName: 'clickstream-sigle-test2',
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
                  StackName: 'clickstream-test11',
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
                  StackName: 'clickstream-test33',
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
                  StackName: 'clickstream-test22',
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
                  Parameters: [
                    {
                      ParameterKey: 'QueueName',
                      ParameterValue: 'clickstream-test11',
                    },
                  ],
                  StackName: 'clickstream-test11',
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
                  Parameters: [
                    {
                      ParameterKey: 'QueueName',
                      ParameterValue: 'clickstream-test22',
                    },
                  ],
                  StackName: 'clickstream-test22',
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
                  Parameters: [
                    {
                      ParameterKey: 'QueueName',
                      ParameterValue: 'clickstream-test33',
                    },
                  ],
                  StackName: 'clickstream-test33',
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
                    StackName: 'clickstream-test11',
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
                    StackName: 'clickstream-test22',
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
                    StackName: 'clickstream-test33',
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
                  Parameters: [
                    {
                      ParameterKey: 'QueueName',
                      ParameterValue: 'clickstream-test11',
                    },
                  ],
                  StackName: 'clickstream-test11',
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
                  Parameters: [
                    {
                      ParameterKey: 'QueueName',
                      ParameterValue: 'clickstream-test22',
                    },
                  ],
                  StackName: 'clickstream-test22',
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
                  Parameters: [
                    {
                      ParameterKey: 'QueueName',
                      ParameterValue: 'clickstream-test33',
                    },
                  ],
                  StackName: 'clickstream-test33',
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
                    StackName: 'clickstream-test11',
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
                    StackName: 'clickstream-test11',
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
                    StackName: 'clickstream-test22',
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
                    StackName: 'clickstream-test33',
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
                  Parameters: [
                    {
                      ParameterKey: 'QueueName',
                      ParameterValue: 'clickstream-test11',
                    },
                  ],
                  StackName: 'clickstream-test11',
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
                  Parameters: [
                    {
                      ParameterKey: 'QueueName',
                      ParameterValue: 'clickstream-test11',
                    },
                  ],
                  StackName: 'clickstream-test11',
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
                  Parameters: [
                    {
                      ParameterKey: 'QueueName',
                      ParameterValue: 'clickstream-test22',
                    },
                  ],
                  StackName: 'clickstream-test22',
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
                  Parameters: [
                    {
                      ParameterKey: 'QueueName',
                      ParameterValue: 'clickstream-test33',
                    },
                  ],
                  StackName: 'clickstream-test33',
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