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

import {
  DescribeRouteTablesCommand, DescribeSecurityGroupRulesCommand,
  DescribeSubnetsCommand,
  DescribeVpcEndpointsCommand,
  VpcEndpointType,
} from '@aws-sdk/client-ec2';
import { ListNodesCommand } from '@aws-sdk/client-kafka';
import { DescribeClustersCommand, DescribeClusterSubnetGroupsCommand } from '@aws-sdk/client-redshift';
import { GetNamespaceCommand, GetWorkgroupCommand } from '@aws-sdk/client-redshift-serverless';
import { GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { StartExecutionCommand } from '@aws-sdk/client-sfn';
import { GetCommand, GetCommandInput, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { clickStreamTableName, dictionaryTableName } from '../../common/constants';
import { ProjectEnvironment } from '../../common/types';
import { IPipeline } from '../../model/pipeline';

const MOCK_TOKEN = '0000-0000';
const MOCK_PROJECT_ID = 'project_8888_8888';
const MOCK_APP_NAME = 'app';
const MOCK_APP_ID = 'app_7777_7777';
const MOCK_PIPELINE_ID = '6666-6666';
const MOCK_PLUGIN_ID = '5555-5555';
const MOCK_EXECUTION_ID = 'main-3333-3333';
const MOCK_BUILT_IN_PLUGIN_ID = 'BUILT-IN-1';

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
  if (!name || name === 'BuiltInPlugins') {
    ddbMock.on(GetCommand, {
      TableName: dictionaryTableName,
      Key: {
        name: 'BuiltInPlugins',
      },
    }).resolves({
      Item: {
        name: 'BuiltInPlugins',
        data: [
          {
            id: 'BUILT-IN-1',
            type: 'PLUGIN#BUILT-IN-1',
            prefix: 'PLUGIN',
            name: 'Transformer',
            description: 'Description of Transformer',
            builtIn: 'true',
            mainFunction: 'software.aws.solution.clickstream.Transformer',
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
            id: 'BUILT-IN-2',
            type: 'PLUGIN#BUILT-IN-2',
            prefix: 'PLUGIN',
            name: 'UAEnrichment',
            description: 'Description of UAEnrichment',
            builtIn: 'true',
            mainFunction: 'software.aws.solution.clickstream.UAEnrichment',
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
            id: 'BUILT-IN-3',
            type: 'PLUGIN#BUILT-IN-3',
            prefix: 'PLUGIN',
            name: 'IPEnrichment',
            description: 'Description of IPEnrichment',
            builtIn: 'true',
            mainFunction: 'software.aws.solution.clickstream.IPEnrichment',
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
          'metrics': 'metrics-stack.template.json',
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
          prefix: 'default/',
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

function createPipelineMock(
  ddbMock: any,
  kafkaMock: any,
  redshiftServerlessMock: any,
  redshiftMock: any,
  ec2Mock: any,
  sfnMock: any,
  secretsManagerMock: any,
  props?: {
    noApp?: boolean;
    update?: boolean;
    updatePipeline?: IPipeline;
    publicAZContainPrivateAZ?: boolean;
    subnetsCross3AZ?: boolean;
    subnetsIsolated?: boolean;
    missVpcEndpoint?: boolean;
    azHasTwoSubnets?: boolean;
    s3EndpointRouteError?: boolean;
    glueEndpointSGError?: boolean;
    sgError?: boolean;
  }): any {
  // project
  ddbMock.on(GetCommand, {
    TableName: clickStreamTableName,
    Key: {
      id: MOCK_PROJECT_ID,
      type: `METADATA#${MOCK_PROJECT_ID}`,
    },
  }).resolves({
    Item: {
      id: MOCK_PROJECT_ID,
      environment: ProjectEnvironment.DEV,
      emails: 'u1@example.com,u2@example.com',
    },
  });
  // pipeline
  ddbMock.on(QueryCommand, {
    ExclusiveStartKey: undefined,
    ExpressionAttributeNames: { '#prefix': 'prefix' },
    ExpressionAttributeValues: new Map<string, any>([
      [':d', false],
      [':prefix', 'PIPELINE'],
      [':vt', 'latest'],
      [':p', MOCK_PROJECT_ID],
    ]),
    FilterExpression: 'deleted = :d AND versionTag=:vt AND id = :p',
    IndexName: undefined,
    KeyConditionExpression: '#prefix= :prefix',
    Limit: undefined,
    ScanIndexForward: true,
    TableName: clickStreamTableName,
  })
    .resolves({
      Items: [],
    });
  if (props?.update) {
    ddbMock.on(GetCommand, {
      TableName: clickStreamTableName,
      Key: {
        id: MOCK_PROJECT_ID,
        type: `PIPELINE#${MOCK_PIPELINE_ID}#latest`,
      },
    }).resolves({
      Item: props.updatePipeline,
    });
  }
  //app
  ddbMock.on(QueryCommand, {
    ExclusiveStartKey: undefined,
    ExpressionAttributeNames: { '#prefix': 'prefix' },
    ExpressionAttributeValues: {
      ':d': false,
      ':p': MOCK_PROJECT_ID,
      ':prefix': 'APP',
    },
    FilterExpression: 'projectId = :p AND deleted = :d',
    IndexName: undefined,
    KeyConditionExpression: '#prefix= :prefix',
    Limit: undefined,
    ScanIndexForward: true,
    TableName: clickStreamTableName,
  }).resolves({
    Items: props?.noApp ? [] : [{
      id: 1,
      appId: `${MOCK_APP_ID}_1`,
    }, {
      id: 2,
      appId: `${MOCK_APP_ID}_2`,
    }],
  });
  //plugin
  ddbMock.on(QueryCommand, {
    ExclusiveStartKey: undefined,
    ExpressionAttributeNames: { '#prefix': 'prefix' },
    ExpressionAttributeValues: new Map<string, any>([
      [':d', false],
      [':prefix', 'PLUGIN'],
    ]),
    FilterExpression: 'deleted = :d',
    IndexName: undefined,
    KeyConditionExpression: '#prefix= :prefix',
    Limit: undefined,
    ScanIndexForward: true,
    TableName: clickStreamTableName,
  }).resolves({
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
  redshiftServerlessMock.on(GetWorkgroupCommand).resolves({
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
  redshiftServerlessMock.on(GetNamespaceCommand).resolves({
    namespace: {
      namespaceId: '3fe99af1-0b02-4b43-b8d4-34ccfd52c865',
      namespaceArn: 'arn:aws:redshift-serverless:ap-southeast-1:111122223333:namespace/3fe99af1-0b02-4b43-b8d4-34ccfd52c865',
      namespaceName: 'test-ns',
    },
  });
  redshiftMock.on(DescribeClustersCommand).resolves({
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
        PubliclyAccessible: false,
        VpcId: 'vpc-00000000000000001',
        VpcSecurityGroups: [{ VpcSecurityGroupId: 'sg-00000000000000031' }],
      },
    ],
  });
  redshiftMock.on(DescribeClusterSubnetGroupsCommand).resolves({
    ClusterSubnetGroups: [
      {
        ClusterSubnetGroupName: 'group-1',
        Subnets: [
          { SubnetIdentifier: 'subnet-00000000000000010' },
          { SubnetIdentifier: 'subnet-00000000000000011' },
          { SubnetIdentifier: 'subnet-00000000000000012' },
        ],
      },
    ],
  });
  ec2Mock.on(DescribeSecurityGroupRulesCommand).
    resolves({
      SecurityGroupRules: [
        {
          GroupId: 'sg-00000000000000030',
          IsEgress: false,
          IpProtocol: '-1',
          FromPort: -1,
          ToPort: -1,
          CidrIpv4: props?.sgError ? '11.11.11.11/32' : '0.0.0.0/0',
        },
        {
          GroupId: 'sg-00000000000000031',
          IsEgress: false,
          IpProtocol: '-1',
          FromPort: -1,
          ToPort: -1,
          CidrIpv4: props?.glueEndpointSGError || props?.sgError ? '11.11.11.11/32' : '0.0.0.0/0',
        },
      ],
    });
  const defaultSubnets = [
    {
      SubnetId: 'subnet-00000000000000010',
      AvailabilityZone: 'us-east-1a',
      CidrBlock: '10.0.16.0/20',
    },
    {
      SubnetId: 'subnet-00000000000000011',
      AvailabilityZone: 'us-east-1b',
      CidrBlock: '10.0.32.0/20',
    },
    {
      SubnetId: 'subnet-00000000000000012',
      AvailabilityZone: 'us-east-1c',
      CidrBlock: '10.0.48.0/20',
    },
    {
      SubnetId: 'subnet-00000000000000013',
      AvailabilityZone: 'us-east-1d',
      CidrBlock: '10.0.64.0/20',
    },
    {
      SubnetId: 'subnet-00000000000000021',
      AvailabilityZone: 'us-east-1b',
      CidrBlock: '10.0.64.0/20',
    },
    {
      SubnetId: 'subnet-00000000000000022',
      AvailabilityZone: 'us-east-1c',
      CidrBlock: '10.0.64.0/20',
    },
    {
      SubnetId: 'subnet-00000000000000023',
      AvailabilityZone: 'us-east-1d',
      CidrBlock: '10.0.64.0/20',
    },
  ];

  ec2Mock.on(DescribeSubnetsCommand)
    .resolves({
      Subnets: !props?.publicAZContainPrivateAZ ? [
        defaultSubnets[0],
        defaultSubnets[1],
        defaultSubnets[2],
        defaultSubnets[3],
        {
          SubnetId: 'subnet-00000000000000021',
          AvailabilityZone: 'us-east-1a',
          CidrBlock: '10.0.48.0/20',
        },
        defaultSubnets[5],
        defaultSubnets[6],
      ] : !props?.subnetsCross3AZ ? [
        defaultSubnets[0],
        defaultSubnets[1],
        {
          SubnetId: 'subnet-00000000000000012',
          AvailabilityZone: 'us-east-1a',
          CidrBlock: '10.0.48.0/20',
        },
        {
          SubnetId: 'subnet-00000000000000013',
          AvailabilityZone: 'us-east-1a',
          CidrBlock: '10.0.64.0/20',
        },
        defaultSubnets[4],
        {
          SubnetId: 'subnet-00000000000000022',
          AvailabilityZone: 'us-east-1a',
          CidrBlock: '10.0.64.0/20',
        },
        {
          SubnetId: 'subnet-00000000000000023',
          AvailabilityZone: 'us-east-1a',
          CidrBlock: '10.0.64.0/20',
        },
      ] : props.azHasTwoSubnets ? [
        defaultSubnets[0],
        defaultSubnets[1],
        defaultSubnets[2],
        {
          SubnetId: 'subnet-00000000000000013',
          AvailabilityZone: 'us-east-1a',
          CidrBlock: '10.0.64.0/20',
        },
        defaultSubnets[4],
        defaultSubnets[5],
        defaultSubnets[6],
      ] : defaultSubnets,
    });
  ec2Mock.on(DescribeRouteTablesCommand).resolves({
    RouteTables: [
      {
        Associations: [{
          Main: true,
        }],
        Routes: [{ GatewayId: 'igw-xxxx' }],
      },
      {
        Associations: [
          {
            Main: false,
            SubnetId: 'subnet-00000000000000010',
          },
          {
            Main: false,
            SubnetId: 'subnet-00000000000000011',
          },
          {
            Main: false,
            SubnetId: 'subnet-00000000000000012',
          },
          {
            Main: false,
            SubnetId: 'subnet-00000000000000013',
          },
        ],
        Routes: props?.subnetsIsolated ? [
          { GatewayId: 'vpce-dynamodb' },
          { GatewayId: props?.s3EndpointRouteError ? 'vpce-s3-error' : 'vpce-s3' },
        ] : [
          { DestinationCidrBlock: '0.0.0.0/0' },
          { GatewayId: 'vpce-dynamodb' },
          { GatewayId: props?.s3EndpointRouteError ? 'vpce-s3-error' : 'vpce-s3' },
        ],
      },
    ],
  });
  const vpcEndpointsGroups = [{ GroupId: 'sg-00000000000000030' }];
  const vpcEndpoints = [
    {
      VpcEndpointId: 'vpce-emr-serverless',
      ServiceName: 'com.amazonaws.ap-southeast-1.emr-serverless',
      VpcEndpointType: VpcEndpointType.Interface,
      Groups: vpcEndpointsGroups,
    },
    {
      VpcEndpointId: 'vpce-logs',
      ServiceName: 'com.amazonaws.ap-southeast-1.logs',
      VpcEndpointType: VpcEndpointType.Interface,
      Groups: vpcEndpointsGroups,
    },
    {
      VpcEndpointId: 'vpce-redshift-data',
      ServiceName: 'com.amazonaws.ap-southeast-1.redshift-data',
      VpcEndpointType: VpcEndpointType.Interface,
      Groups: vpcEndpointsGroups,
    },
    {
      VpcEndpointId: 'vpce-sts',
      ServiceName: 'com.amazonaws.ap-southeast-1.sts',
      VpcEndpointType: VpcEndpointType.Interface,
      Groups: vpcEndpointsGroups,
    },
    {
      VpcEndpointId: 'vpce-ecr-dkr',
      ServiceName: 'com.amazonaws.ap-southeast-1.ecr.dkr',
      VpcEndpointType: VpcEndpointType.Interface,
      Groups: vpcEndpointsGroups,
    },
    {
      VpcEndpointId: 'vpce-ecr-api',
      ServiceName: 'com.amazonaws.ap-southeast-1.ecr.api',
      VpcEndpointType: VpcEndpointType.Interface,
      Groups: vpcEndpointsGroups,
    },
    {
      VpcEndpointId: 'vpce-ecs',
      ServiceName: 'com.amazonaws.ap-southeast-1.ecs',
      VpcEndpointType: VpcEndpointType.Interface,
      Groups: vpcEndpointsGroups,
    },
    {
      VpcEndpointId: 'vpce-ecs-agent',
      ServiceName: 'com.amazonaws.ap-southeast-1.ecs-agent',
      VpcEndpointType: VpcEndpointType.Interface,
      Groups: vpcEndpointsGroups,
    },
    {
      VpcEndpointId: 'vpce-ecs-telemetry',
      ServiceName: 'com.amazonaws.ap-southeast-1.ecs-telemetry',
      VpcEndpointType: VpcEndpointType.Interface,
      Groups: vpcEndpointsGroups,
    },
    {
      VpcEndpointId: 'vpce-kinesis-streams',
      ServiceName: 'com.amazonaws.ap-southeast-1.kinesis-streams',
      VpcEndpointType: VpcEndpointType.Interface,
      Groups: vpcEndpointsGroups,
    },
  ];
  ec2Mock.on(DescribeVpcEndpointsCommand).resolves({
    VpcEndpoints: props?.missVpcEndpoint ? vpcEndpoints : [
      {
        VpcEndpointId: 'vpce-s3',
        ServiceName: 'com.amazonaws.ap-southeast-1.s3',
        VpcEndpointType: VpcEndpointType.Gateway,
        Groups: vpcEndpointsGroups,
      },
      {
        VpcEndpointId: 'vpce-dynamodb',
        ServiceName: 'com.amazonaws.ap-southeast-1.dynamodb',
        VpcEndpointType: VpcEndpointType.Gateway,
        Groups: vpcEndpointsGroups,
      },
      {
        VpcEndpointId: 'vpce-glue',
        ServiceName: 'com.amazonaws.ap-southeast-1.glue',
        VpcEndpointType: VpcEndpointType.Interface,
        Groups: [{ GroupId: 'sg-00000000000000031' }],
      },
    ].concat(vpcEndpoints),
  });
  secretsManagerMock.on(GetSecretValueCommand).resolves({
    SecretString: '{"issuer":"1","userEndpoint":"2","authorizationEndpoint":"3","tokenEndpoint":"4","appClientId":"5","appClientSecret":"6"}',
  });
  sfnMock.on(StartExecutionCommand).resolves({ executionArn: MOCK_EXECUTION_ID });

}

export {
  MOCK_TOKEN,
  MOCK_PROJECT_ID,
  MOCK_APP_NAME,
  MOCK_APP_ID,
  MOCK_PIPELINE_ID,
  MOCK_PLUGIN_ID,
  MOCK_EXECUTION_ID,
  MOCK_BUILT_IN_PLUGIN_ID,
  tokenMock,
  projectExistedMock,
  appExistedMock,
  pipelineExistedMock,
  pluginExistedMock,
  dictionaryMock,
  createPipelineMock,
};