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

import { ListNodesCommand } from '@aws-sdk/client-kafka';
import { DescribeClustersCommand, DescribeClusterSubnetGroupsCommand } from '@aws-sdk/client-redshift';
import { GetNamespaceCommand, GetWorkgroupCommand } from '@aws-sdk/client-redshift-serverless';
import { GetCommand, GetCommandInput, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { clickStreamTableName, dictionaryTableName } from '../../common/constants';
import { ProjectEnvironment } from '../../common/types';

const MOCK_TOKEN = '0000-0000';
const MOCK_PROJECT_ID = 'project_8888_8888';
const MOCK_APP_NAME = 'app';
const MOCK_APP_ID = 'app_7777_7777';
const MOCK_PIPELINE_ID = '6666-6666';
const MOCK_PLUGIN_ID = '5555-5555';
const MOCK_EXECUTION_ID = 'main-3333-3333';
const MOCK_BUILDIN_PLUGIN_ID = 'BUILDIN-1';

function tokenMock(ddbMock: any, expect: boolean): any {
  if (!expect) {
    return ddbMock.on(GetCommand, {
      TableName: clickStreamTableName,
      Key: {
        id: MOCK_TOKEN,
        type: 'REQUESTID',
      },
    }, true).resolvesOnce({});
  }
  return ddbMock.on(GetCommand, {
    TableName: clickStreamTableName,
    Key: {
      id: MOCK_TOKEN,
      type: 'REQUESTID',
    },
  }, true).resolvesOnce({
    Item: {
      id: MOCK_TOKEN,
      type: 'REQUESTID',
    },
  });
}

function projectExistedMock(ddbMock: any, existed: boolean): any {
  const tokenInput: GetCommandInput = {
    TableName: clickStreamTableName,
    Key: {
      id: MOCK_PROJECT_ID,
      type: `METADATA#${MOCK_PROJECT_ID}`,
    },
  };
  return ddbMock.on(GetCommand, tokenInput).resolves({
    Item: {
      id: MOCK_PROJECT_ID,
      deleted: !existed,
    },
  });
}

function appExistedMock(ddbMock: any, existed: boolean): any {
  const tokenInput: GetCommandInput = {
    TableName: clickStreamTableName,
    Key: {
      id: MOCK_PROJECT_ID,
      type: `APP#${MOCK_APP_ID}`,
    },
  };
  return ddbMock.on(GetCommand, tokenInput).resolves({
    Item: {
      id: MOCK_PROJECT_ID,
      appId: MOCK_PROJECT_ID,
      deleted: !existed,
    },
  });
}

function pipelineExistedMock(ddbMock: any, existed: boolean): any {
  const tokenInput: GetCommandInput = {
    TableName: clickStreamTableName,
    Key: {
      id: MOCK_PROJECT_ID,
      type: `PIPELINE#${MOCK_PIPELINE_ID}#latest`,
    },
  };
  return ddbMock.on(GetCommand, tokenInput).resolves({
    Item: {
      id: MOCK_PROJECT_ID,
      type: `PIPELINE#${MOCK_PIPELINE_ID}#latest`,
      pipelineId: MOCK_PIPELINE_ID,
      deleted: !existed,
    },
  });
}

function pluginExistedMock(ddbMock: any, existed: boolean): any {
  const tokenInput: GetCommandInput = {
    TableName: clickStreamTableName,
    Key: {
      id: MOCK_PLUGIN_ID,
      type: `PLUGIN#${MOCK_PLUGIN_ID}`,
    },
  };
  return ddbMock.on(GetCommand, tokenInput).resolves({
    Item: {
      id: MOCK_PLUGIN_ID,
      type: `PLUGIN#${MOCK_PLUGIN_ID}`,
      deleted: !existed,
    },
  });
}

function dictionaryMock(ddbMock: any, name?: string): any {
  if (!name || name === 'BuildInPlugins') {
    ddbMock.on(GetCommand, {
      TableName: dictionaryTableName,
      Key: {
        name: 'BuildInPlugins',
      },
    }).resolves({
      Item: {
        name: 'BuildInPlugins',
        data: [
          {
            id: 'BUILDIN-1',
            type: 'PLUGIN#BUILDIN-1',
            prefix: 'PLUGIN',
            name: 'Transformer',
            description: 'Description of Transformer',
            builtIn: 'true',
            mainFunction: 'sofeware.aws.solution.clickstream.Transformer',
            jarFile: '',
            bindCount: '0',
            pluginType: 'Transform',
            dependencyFiles: [],
            operator: '',
            deleted: 'false',
            createAt: '1667355960000',
            updateAt: '1667355960000',
          },
          {
            id: 'BUILDIN-2',
            type: 'PLUGIN#BUILDIN-2',
            prefix: 'PLUGIN',
            name: 'UAEnrichment',
            description: 'Description of UAEnrichment',
            builtIn: 'true',
            mainFunction: 'sofeware.aws.solution.clickstream.UAEnrichment',
            jarFile: '',
            bindCount: '0',
            pluginType: 'Enrich',
            dependencyFiles: [],
            operator: '',
            deleted: 'false',
            createAt: '1667355960000',
            updateAt: '1667355960000',
          },
          {
            id: 'BUILDIN-3',
            type: 'PLUGIN#BUILDIN-3',
            prefix: 'PLUGIN',
            name: 'IPEnrichment',
            description: 'Description of IPEnrichment',
            builtIn: 'true',
            mainFunction: 'sofeware.aws.solution.clickstream.IPEnrichment',
            jarFile: '',
            bindCount: '0',
            pluginType: 'Enrich',
            dependencyFiles: [],
            operator: '',
            deleted: 'false',
            createAt: '1667355960000',
            updateAt: '1667355960000',
          },
        ],
      },
    });
  }
  if (!name || name === 'Templates') {
    ddbMock.on(GetCommand, {
      TableName: dictionaryTableName,
      Key: {
        name: 'Templates',
      },
    }).resolves({
      Item: {
        name: 'Templates',
        data: {
          'ingestion_s3': 'ingestion-server-s3-stack.template.json',
          'ingestion_kafka': 'ingestion-server-kafka-stack.template.json',
          'ingestion_kinesis': 'ingestion-server-kinesis-stack.template.json',
          'kafka-s3-sink': 'kafka-s3-sink-stack.template.json',
          'data-pipeline': 'data-pipeline-stack.template.json',
          'data-analytics': 'data-analytics-redshift-stack.template.json',
          'reporting': 'data-reporting-quicksight-stack.template.json',
        },
      },
    });
  }
  if (!name || name === 'Solution') {
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
          version: 'v1.0.0',
        },
      },
    });
  }
  if (!name || name === 'QuickSightTemplateArn') {
    ddbMock.on(GetCommand, {
      TableName: dictionaryTableName,
      Key: {
        name: 'QuickSightTemplateArn',
      },
    }).resolves({
      Item: {
        name: 'QuickSightTemplateArn',
        data: 'arn:aws:quicksight:us-east-1:555555555555:template/clickstream-quicksight-template-v1',
      },
    });
  }
}

function stackParameterMock(ddbMock: any, kafkaMock:any, redshiftServerlessClient: any, redshiftClient:any, props?: any): any {
  // project
  ddbMock.on(GetCommand, {
    TableName: clickStreamTableName,
    Key: {
      id: MOCK_PROJECT_ID,
      type: `METADATA#${MOCK_PROJECT_ID}`,
    },
  }).resolves({ Item: { id: MOCK_PROJECT_ID, environment: ProjectEnvironment.DEV } });
  // apps
  if (props?.noApp) {
    ddbMock.on(QueryCommand)
      .resolvesOnce({
        Items: [],
      })
      .resolves({
        Items: [
          {
            id: `${MOCK_PLUGIN_ID}_1`,
            pluginType: 'Transform',
            mainFunction: 'test.aws.solution.main',
            jarFile: 's3://example-bucket/pipeline/jars/test-transformer-0.1.0.jar',
            dependencyFiles: ['s3://example-bucket/pipeline/files/data1.mmdb', 's3://example-bucket/pipeline/files/data2.mmdb'],
          },
          {
            id: `${MOCK_PLUGIN_ID}_2`,
            pluginType: 'Enrich',
            mainFunction: 'test.aws.solution.main',
            jarFile: 's3://example-bucket/pipeline/jars/test-enrich-0.1.0.jar',
            dependencyFiles: ['s3://example-bucket/pipeline/files/data3.mmdb', 's3://example-bucket/pipeline/files/data4.mmdb'],
          },
        ],
      });
  } else {
    ddbMock.on(QueryCommand)
      .resolvesOnce({
        Items: [{
          id: 1,
          appId: `${MOCK_APP_ID}_1`,
        }, {
          id: 2,
          appId: `${MOCK_APP_ID}_2`,
        }],
      })
      .resolves({
        Items: [
          {
            id: `${MOCK_PLUGIN_ID}_1`,
            pluginType: 'Transform',
            mainFunction: 'test.aws.solution.main',
            jarFile: 's3://example-bucket/pipeline/jars/test-transformer-0.1.0.jar',
            dependencyFiles: ['s3://example-bucket/pipeline/files/data1.mmdb', 's3://example-bucket/pipeline/files/data2.mmdb'],
          },
          {
            id: `${MOCK_PLUGIN_ID}_2`,
            pluginType: 'Enrich',
            mainFunction: 'test.aws.solution.main',
            jarFile: 's3://example-bucket/pipeline/jars/test-enrich-0.1.0.jar',
            dependencyFiles: ['s3://example-bucket/pipeline/files/data3.mmdb', 's3://example-bucket/pipeline/files/data4.mmdb'],
          },
        ],
      });
  }
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
      endpoint: {
        address: 'https://redshift-serverless/xxx/yyy',
        port: 5001,
      },
      subnetIds: ['subnet-00000000000000021', 'subnet-00000000000000022'],
      securityGroupIds: ['sg-00000000000000031', 'sg-00000000000000032'],
    },
  });
  redshiftServerlessClient.on(GetNamespaceCommand).resolves({
    namespace: {
      namespaceId: '3fe99af1-0b02-4b43-b8d4-34ccfd52c865',
      namespaceArn: 'arn:aws:redshift-serverless:ap-southeast-1:111122223333:namespace/3fe99af1-0b02-4b43-b8d4-34ccfd52c865',
      namespaceName: 'test-ns',
    },
  });
  redshiftClient.on(DescribeClustersCommand).resolves({
    Clusters: [
      {
        ClusterIdentifier: 'cluster-1',
        NodeType: '',
        Endpoint: {
          Address: 'https://redshift/xxx/yyy',
          Port: 5002,
        },
        ClusterStatus: 'Active',
        MasterUsername: 'awsuser',
        publiclyAccessible: false,
        VpcSecurityGroups: [{ VpcSecurityGroupId: 'sg-00000000000000031' }],
      },
    ],
  });
  redshiftClient.on(DescribeClusterSubnetGroupsCommand).resolves({
    ClusterSubnetGroups: [
      {
        ClusterSubnetGroupName: 'group-1',
        Subnets: [{ SubnetIdentifier: 'subnet-00000000000000022' }],
      },
    ],
  });

}

export {
  MOCK_TOKEN,
  MOCK_PROJECT_ID,
  MOCK_APP_NAME,
  MOCK_APP_ID,
  MOCK_PIPELINE_ID,
  MOCK_PLUGIN_ID,
  MOCK_EXECUTION_ID,
  MOCK_BUILDIN_PLUGIN_ID,
  tokenMock,
  projectExistedMock,
  appExistedMock,
  pipelineExistedMock,
  pluginExistedMock,
  dictionaryMock,
  stackParameterMock,
};