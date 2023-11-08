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

import { TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
import {
  ConnectivityType,
  DescribeAvailabilityZonesCommand,
  DescribeNatGatewaysCommand,
  DescribeRouteTablesCommand, DescribeSecurityGroupRulesCommand,
  DescribeSubnetsCommand,
  DescribeVpcEndpointsCommand,
  VpcEndpointType,
} from '@aws-sdk/client-ec2';
import { PolicyEvaluationDecisionType, SimulateCustomPolicyCommand } from '@aws-sdk/client-iam';
import { ListNodesCommand } from '@aws-sdk/client-kafka';
import { DescribeAccountSubscriptionCommand, Edition, ListUsersCommand, RegisterUserCommand } from '@aws-sdk/client-quicksight';
import { DescribeClustersCommand, DescribeClusterSubnetGroupsCommand } from '@aws-sdk/client-redshift';
import { GetNamespaceCommand, GetWorkgroupCommand } from '@aws-sdk/client-redshift-serverless';
import { GetBucketPolicyCommand } from '@aws-sdk/client-s3';
import { GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { StartExecutionCommand } from '@aws-sdk/client-sfn';
import { GetCommand, GetCommandInput, QueryCommand, QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import { analyticsMetadataTable, clickStreamTableName, dictionaryTableName, prefixTimeGSIName } from '../../common/constants';
import { IUserRole, ProjectEnvironment } from '../../common/types';
import { IPipeline } from '../../model/pipeline';

const MOCK_TOKEN = '0000-0000';
const MOCK_PROJECT_ID = 'project_8888_8888';
const MOCK_APP_NAME = 'app';
const MOCK_APP_ID = 'app_7777_7777';
const MOCK_PIPELINE_ID = '6666-6666';
const MOCK_PLUGIN_ID = '5555-5555';
const MOCK_EXECUTION_ID_OLD = 'main-0000-0000';
const MOCK_EXECUTION_ID = 'main-3333-3333';
const MOCK_BUILT_IN_PLUGIN_ID = 'BUILT-IN-1';
const MOCK_NEW_TEMPLATE_VERSION = '1.0.0-main-sdjes12';
const MOCK_SOLUTION_VERSION = 'v1.0.0';
const MOCK_EVENT_NAME = 'event-mock';
const MOCK_EVENT_PARAMETER_NAME = 'event-attribute-mock';
const MOCK_USER_ATTRIBUTE_NAME = 'user-attribute-mock';
const MOCK_DASHBOARD_ID = 'dash_6666_6666';
const MOCK_USER_ID = 'user-0000';

export const AllowIAMUserPutObejectPolicy = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::127311923021:root"},"Action":["s3:PutObject","s3:PutObjectLegalHold","s3:PutObjectRetention","s3:PutObjectTagging","s3:PutObjectVersionTagging","s3:Abort*"],"Resource":"arn:aws:s3:::EXAMPLE_BUCKET/clickstream/*"}]}';
export const AllowLogDeliveryPutObejectPolicy = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"logdelivery.elasticloadbalancing.amazonaws.com"},"Action":["s3:PutObject","s3:PutObjectLegalHold","s3:PutObjectRetention","s3:PutObjectTagging","s3:PutObjectVersionTagging","s3:Abort*"],"Resource":"arn:aws:s3:::EXAMPLE_BUCKET/clickstream/*"}]}';
export const AllowIAMUserPutObejectPolicyInCN = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":"arn:aws-cn:iam::638102146993:root"},"Action":["s3:PutObject","s3:PutObjectLegalHold","s3:PutObjectRetention","s3:PutObjectTagging","s3:PutObjectVersionTagging","s3:Abort*"],"Resource":"arn:aws-cn:s3:::EXAMPLE_BUCKET/clickstream/*"}]}';
export const AllowIAMUserPutObejectPolicyWithErrorUserId = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::555555555555:root"},"Action":["s3:PutObject","s3:PutObjectLegalHold","s3:PutObjectRetention","s3:PutObjectTagging","s3:PutObjectVersionTagging","s3:Abort*"],"Resource":"arn:aws:s3:::EXAMPLE_BUCKET/clickstream/*"},{"Effect":"Allow","Principal":{"Service":"logdelivery.elasticloadbalancing.amazonaws.com"},"Action":["s3:PutObject","s3:PutObjectLegalHold","s3:PutObjectRetention","s3:PutObjectTagging","s3:PutObjectVersionTagging","s3:Abort*"],"Resource":"arn:aws:s3:::EXAMPLE_BUCKET/clickstream/*"}]}';
export const AllowIAMUserPutObejectPolicyWithErrorPartition = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::127311923021:root"},"Action":["s3:PutObject","s3:PutObjectLegalHold","s3:PutObjectRetention","s3:PutObjectTagging","s3:PutObjectVersionTagging","s3:Abort*"],"Resource":"arn:aws-cn:s3:::EXAMPLE_BUCKET/clickstream/*"}]}';
export const AllowIAMUserPutObejectPolicyWithErrorBucket = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::127311923021:root"},"Action":["s3:PutObject","s3:PutObjectLegalHold","s3:PutObjectRetention","s3:PutObjectTagging","s3:PutObjectVersionTagging","s3:Abort*"],"Resource":"arn:aws:s3:::EXAMPLE_BUCKET1/clickstream/*"}]}';
export const AllowIAMUserPutObejectPolicyWithErrorBucketPrefix = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::127311923021:root"},"Action":["s3:PutObject","s3:PutObjectLegalHold","s3:PutObjectRetention","s3:PutObjectTagging","s3:PutObjectVersionTagging","s3:Abort*"],"Resource":"arn:aws:s3:::EXAMPLE_BUCKET/*"}]}';
export const AllowIAMUserPutObejectPolicyWithErrorService = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"errorservice.elasticloadbalancing.amazonaws.com"},"Action":["s3:PutObject","s3:PutObjectLegalHold","s3:PutObjectRetention","s3:PutObjectTagging","s3:PutObjectVersionTagging","s3:Abort*"],"Resource":"arn:aws:s3:::EXAMPLE_BUCKET/clickstream/*"}]}';
export const AllowIAMUserPutObejectPolicyInApSouthEast1 = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::027434742980:root"},"Action":["s3:PutObject","s3:PutObjectLegalHold","s3:PutObjectRetention","s3:PutObjectTagging","s3:PutObjectVersionTagging","s3:Abort*"],"Resource":"arn:aws:s3:::EXAMPLE_BUCKET/clickstream/*"},{"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::114774131450:root"},"Action":["s3:PutObject","s3:PutObjectLegalHold","s3:PutObjectRetention","s3:PutObjectTagging","s3:PutObjectVersionTagging","s3:Abort*"],"Resource":"arn:aws:s3:::EXAMPLE_BUCKET/clickstream/*"}]}';
export const AllowIAMUserPutObjectPolicyInCnNorth1 = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":"arn:aws-cn:iam::638102146993:root"},"Action":["s3:PutObject","s3:PutObjectLegalHold","s3:PutObjectRetention","s3:PutObjectTagging","s3:PutObjectVersionTagging","s3:Abort*"],"Resource":"arn:aws-cn:s3:::EXAMPLE_BUCKET/clickstream/*"}]}';

function userMock(ddbMock: any, userId: string, role: IUserRole, existed?: boolean): any {
  if (!existed) {
    return ddbMock.on(GetCommand, {
      TableName: clickStreamTableName,
      Key: {
        id: userId,
        type: 'USER',
      },
    }, true).resolves({});
  }

  return ddbMock.on(GetCommand, {
    TableName: clickStreamTableName,
    Key: {
      id: userId,
      type: 'USER',
    },
  }, true).resolves({
    Item: {
      id: userId,
      role: role,
      deleted: false,
    },
  });
}

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

function metadataEventExistedMock(ddbMock: any, projectId:string, appId: string, existed: boolean): any {
  const tokenInput: GetCommandInput = {
    TableName: analyticsMetadataTable,
    Key: {
      id: `${projectId}#${appId}#${MOCK_EVENT_NAME}`,
      type: `EVENT#${projectId}#${appId}#${MOCK_EVENT_NAME}`,
    },
  };
  return ddbMock.on(GetCommand, tokenInput).resolvesOnce({
    Item: {
      id: `${projectId}#${appId}#${MOCK_EVENT_NAME}#${MOCK_EVENT_NAME}`,
      type: `EVENT#${projectId}#${appId}#${MOCK_EVENT_NAME}`,
      deleted: !existed,
    },
  });
}

function metadataEventAttributeExistedMock(ddbMock: any, projectId:string, appId: string, existed: boolean): any {
  const tokenInput: QueryCommandInput = {
    TableName: analyticsMetadataTable,
    IndexName: prefixTimeGSIName,
    KeyConditionExpression: '#prefix = :prefix',
    FilterExpression: 'deleted = :d AND #name = :name',
    ExpressionAttributeNames: {
      '#prefix': 'prefix',
      '#name': 'name',
    },
    ExpressionAttributeValues: {
      ':d': false,
      ':prefix': `EVENT_PARAMETER#${projectId}#${appId}`,
      ':name': MOCK_EVENT_PARAMETER_NAME,
    },
  };
  return ddbMock.on(QueryCommand, tokenInput).resolvesOnce({
    Items: [{
      id: `${projectId}#${appId}#${MOCK_EVENT_NAME}`,
      type: `EVENT#${projectId}#${appId}#${MOCK_EVENT_NAME}`,
      prefix: `EVENT_PARAMETER#${projectId}#${appId}`,
      deleted: !existed,
    }],
  });
}

function metadataUserAttributeExistedMock(ddbMock: any, projectId:string, appId: string, existed: boolean): any {
  const tokenInput: GetCommandInput = {
    TableName: analyticsMetadataTable,
    Key: {
      id: `${projectId}#${appId}#${MOCK_USER_ATTRIBUTE_NAME}`,
      type: `USER_ATTRIBUTE#${projectId}#${appId}#${MOCK_USER_ATTRIBUTE_NAME}`,
    },
  };
  return ddbMock.on(GetCommand, tokenInput).resolvesOnce({
    Item: {
      id: `${projectId}#${appId}#${MOCK_USER_ATTRIBUTE_NAME}`,
      type: `USER_ATTRIBUTE#${projectId}#${appId}#${MOCK_USER_ATTRIBUTE_NAME}`,
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
            mainFunction: 'software.aws.solution.clickstream.TransformerV2',
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
          Ingestion_s3: 'ingestion-server-s3-stack.template.json',
          Ingestion_kafka: 'ingestion-server-kafka-stack.template.json',
          Ingestion_kinesis: 'ingestion-server-kinesis-stack.template.json',
          KafkaConnector: 'kafka-s3-sink-stack.template.json',
          DataProcessing: 'data-pipeline-stack.template.json',
          DataModelingRedshift: 'data-analytics-redshift-stack.template.json',
          Reporting: 'data-reporting-quicksight-stack.template.json',
          Metrics: 'metrics-stack.template.json',
          DataModelingAthena: 'data-modeling-athena-stack.template.json',
          ServiceCatalogAppRegistry: 'service-catalog-appregistry-stack.template.json',
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
          version: MOCK_SOLUTION_VERSION,
        },
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
  quickSightMock: any,
  s3Mock: any,
  iamMock: any,
  props?: {
    noApp?: boolean;
    update?: boolean;
    updatePipeline?: IPipeline;
    publicAZContainPrivateAZ?: boolean;
    subnetsCross3AZ?: boolean;
    subnetsIsolated?: boolean;
    missVpcEndpoint?: boolean;
    noVpcEndpoint?: boolean;
    azHasTwoSubnets?: boolean;
    s3EndpointRouteError?: boolean;
    glueEndpointSGError?: boolean;
    sgError?: boolean;
    vpcEndpointSubnetErr?: boolean;
    twoAZsInRegion?: boolean;
    quickSightStandard?: boolean;
    albPolicyDisable?: boolean;
  }): any {
  iamMock.on(SimulateCustomPolicyCommand).resolves({
    EvaluationResults: [
      {
        EvalActionName: '',
        EvalDecision: PolicyEvaluationDecisionType.ALLOWED,
      },
    ],
  });
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
      emails: 'u1@example.com,u2@example.com,u2@example.com,u3@example.com',
    },
  });
  ddbMock.on(TransactWriteItemsCommand).resolves({});
  // pipeline
  ddbMock.on(QueryCommand, {
    ExclusiveStartKey: undefined,
    ExpressionAttributeNames: { '#prefix': 'prefix' },
    ExpressionAttributeValues: {
      ':d': false,
      ':prefix': 'PIPELINE',
      ':vt': 'latest',
      ':p': MOCK_PROJECT_ID,
    },
    FilterExpression: 'deleted = :d AND versionTag=:vt AND id = :p',
    IndexName: prefixTimeGSIName,
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
    IndexName: prefixTimeGSIName,
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
    ExpressionAttributeValues: {
      ':d': false,
      ':prefix': 'PLUGIN',
    },
    FilterExpression: 'deleted = :d',
    IndexName: prefixTimeGSIName,
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
  ec2Mock.on(DescribeAvailabilityZonesCommand).
    resolves({
      AvailabilityZones: props?.twoAZsInRegion ? [
        {
          ZoneName: 'us-east-1a',
        },
        {
          ZoneName: 'us-east-1b',
        },
      ] : [
        {
          ZoneName: 'us-east-1a',
        },
        {
          ZoneName: 'us-east-1b',
        },
        {
          ZoneName: 'us-east-1c',
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

  ec2Mock.on(DescribeNatGatewaysCommand).
    resolves({
      NatGateways: [
        {
          NatGatewayId: 'NatGatewayId1',
          SubnetId: 'subnet-00000000000000010',
          ConnectivityType: ConnectivityType.PUBLIC,
        },
      ],
    });

  let mockSubnets = defaultSubnets;
  if (!props?.publicAZContainPrivateAZ) {
    mockSubnets = [
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
    ];
  } else if (!props?.subnetsCross3AZ) {
    mockSubnets = [
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
    ];
  } else if (props.azHasTwoSubnets) {
    mockSubnets = [
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
    ];
  }
  ec2Mock.on(DescribeSubnetsCommand)
    .resolves({
      Subnets: mockSubnets,
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
      VpcEndpointId: 'vpce-error',
      ServiceName: 'com.amazonaws.ap-southeast-1.error',
      VpcEndpointType: VpcEndpointType.Interface,
      Groups: vpcEndpointsGroups,
      SubnetIds: [],
    },
    {
      VpcEndpointId: 'vpce-emr-serverless',
      ServiceName: 'com.amazonaws.ap-southeast-1.emr-serverless',
      VpcEndpointType: VpcEndpointType.Interface,
      Groups: vpcEndpointsGroups,
      SubnetIds: defaultSubnets.map(subnet => subnet.SubnetId),
    },
    {
      VpcEndpointId: 'vpce-states',
      ServiceName: 'com.amazonaws.ap-southeast-1.states',
      VpcEndpointType: VpcEndpointType.Interface,
      Groups: vpcEndpointsGroups,
      SubnetIds: defaultSubnets.map(subnet => subnet.SubnetId),
    },
    {
      VpcEndpointId: 'vpce-logs',
      ServiceName: 'com.amazonaws.ap-southeast-1.logs',
      VpcEndpointType: VpcEndpointType.Interface,
      Groups: vpcEndpointsGroups,
      SubnetIds: defaultSubnets.map(subnet => subnet.SubnetId),
    },
    {
      VpcEndpointId: 'vpce-redshift-data',
      ServiceName: 'com.amazonaws.ap-southeast-1.redshift-data',
      VpcEndpointType: VpcEndpointType.Interface,
      Groups: vpcEndpointsGroups,
      SubnetIds: defaultSubnets.map(subnet => subnet.SubnetId),
    },
    {
      VpcEndpointId: 'vpce-sts',
      ServiceName: 'com.amazonaws.ap-southeast-1.sts',
      VpcEndpointType: VpcEndpointType.Interface,
      Groups: vpcEndpointsGroups,
      SubnetIds: defaultSubnets.map(subnet => subnet.SubnetId),
    },
    {
      VpcEndpointId: 'vpce-ecr-dkr',
      ServiceName: 'com.amazonaws.ap-southeast-1.ecr.dkr',
      VpcEndpointType: VpcEndpointType.Interface,
      Groups: vpcEndpointsGroups,
      SubnetIds: defaultSubnets.map(subnet => subnet.SubnetId),
    },
    {
      VpcEndpointId: 'vpce-ecr-api',
      ServiceName: 'com.amazonaws.ap-southeast-1.ecr.api',
      VpcEndpointType: VpcEndpointType.Interface,
      Groups: vpcEndpointsGroups,
      SubnetIds: defaultSubnets.map(subnet => subnet.SubnetId),
    },
    {
      VpcEndpointId: 'vpce-ecs',
      ServiceName: 'com.amazonaws.ap-southeast-1.ecs',
      VpcEndpointType: VpcEndpointType.Interface,
      Groups: vpcEndpointsGroups,
      SubnetIds: defaultSubnets.map(subnet => subnet.SubnetId),
    },
    {
      VpcEndpointId: 'vpce-ecs-agent',
      ServiceName: 'com.amazonaws.ap-southeast-1.ecs-agent',
      VpcEndpointType: VpcEndpointType.Interface,
      Groups: vpcEndpointsGroups,
      SubnetIds: defaultSubnets.map(subnet => subnet.SubnetId),
    },
    {
      VpcEndpointId: 'vpce-ecs-telemetry',
      ServiceName: 'com.amazonaws.ap-southeast-1.ecs-telemetry',
      VpcEndpointType: VpcEndpointType.Interface,
      Groups: vpcEndpointsGroups,
      SubnetIds: defaultSubnets.map(subnet => subnet.SubnetId),
    },
    {
      VpcEndpointId: 'vpce-kinesis-streams',
      ServiceName: 'com.amazonaws.ap-southeast-1.kinesis-streams',
      VpcEndpointType: VpcEndpointType.Interface,
      Groups: vpcEndpointsGroups,
      SubnetIds: defaultSubnets.map(subnet => subnet.SubnetId),
    },
  ];
  let mockVpcEndpoints: any[] = [];
  if (!props?.noVpcEndpoint && props?.missVpcEndpoint) {
    mockVpcEndpoints = vpcEndpoints;
  } else if (!props?.noVpcEndpoint && !props?.missVpcEndpoint) {
    mockVpcEndpoints = [
      {
        VpcEndpointId: 'vpce-s3',
        ServiceName: 'com.amazonaws.ap-southeast-1.s3',
        VpcEndpointType: VpcEndpointType.Gateway,
        Groups: vpcEndpointsGroups,
        SubnetIds: defaultSubnets.map(subnet => subnet.SubnetId),
      },
      {
        VpcEndpointId: 'vpce-dynamodb',
        ServiceName: 'com.amazonaws.ap-southeast-1.dynamodb',
        VpcEndpointType: VpcEndpointType.Gateway,
        Groups: vpcEndpointsGroups,
        SubnetIds: defaultSubnets.map(subnet => subnet.SubnetId),
      },
      {
        VpcEndpointId: 'vpce-glue',
        ServiceName: 'com.amazonaws.ap-southeast-1.glue',
        VpcEndpointType: VpcEndpointType.Interface,
        Groups: [{ GroupId: 'sg-00000000000000031' }],
        SubnetIds: props?.vpcEndpointSubnetErr ? [] : defaultSubnets.map(subnet => subnet.SubnetId),
      },
    ].concat(vpcEndpoints);
  }
  ec2Mock.on(DescribeVpcEndpointsCommand).resolves({
    VpcEndpoints: mockVpcEndpoints,
  });
  secretsManagerMock.on(GetSecretValueCommand).resolves({
    SecretString: '{"issuer":"1","userEndpoint":"2","authorizationEndpoint":"3","tokenEndpoint":"4","appClientId":"5","appClientSecret":"6"}',
  });
  sfnMock.on(StartExecutionCommand).resolves({ executionArn: MOCK_EXECUTION_ID });
  quickSightMock.on(DescribeAccountSubscriptionCommand).resolves({
    AccountInfo: {
      AccountName: 'ck',
      Edition: props?.quickSightStandard ? Edition.STANDARD : Edition.ENTERPRISE,
    },
  });
  quickSightMock.on(ListUsersCommand).resolves({
    UserList: [],
  });
  quickSightMock.on(RegisterUserCommand).resolves({
    User: {},
    UserInvitationUrl: '',
  });
  s3Mock.on(GetBucketPolicyCommand).resolves({
    Policy: props?.albPolicyDisable ? AllowIAMUserPutObejectPolicyWithErrorService
      :AllowIAMUserPutObejectPolicyInApSouthEast1,
  });
}

function createPipelineMockForBJSRegion(ec2Mock: any, s3Mock: any) {
  const defaultSubnets = [
    {
      SubnetId: 'subnet-00000000000000010',
      AvailabilityZone: 'cn-north-1a',
      CidrBlock: '10.0.16.0/20',
    },
    {
      SubnetId: 'subnet-00000000000000011',
      AvailabilityZone: 'cn-north-1b',
      CidrBlock: '10.0.32.0/20',
    },
    {
      SubnetId: 'subnet-00000000000000012',
      AvailabilityZone: 'cn-north-1c',
      CidrBlock: '10.0.48.0/20',
    },
    {
      SubnetId: 'subnet-00000000000000013',
      AvailabilityZone: 'cn-north-1d',
      CidrBlock: '10.0.64.0/20',
    },
    {
      SubnetId: 'subnet-00000000000000021',
      AvailabilityZone: 'cn-north-1b',
      CidrBlock: '10.0.64.0/20',
    },
    {
      SubnetId: 'subnet-00000000000000022',
      AvailabilityZone: 'cn-north-1c',
      CidrBlock: '10.0.64.0/20',
    },
    {
      SubnetId: 'subnet-00000000000000023',
      AvailabilityZone: 'cn-north-1d',
      CidrBlock: '10.0.64.0/20',
    },
  ];
  ec2Mock.on(DescribeSubnetsCommand)
    .resolves({
      Subnets: defaultSubnets,
    });
  const vpcEndpointsGroups = [{ GroupId: 'sg-00000000000000030' }];
  ec2Mock.on(DescribeVpcEndpointsCommand).resolves({
    VpcEndpoints: [
      {
        VpcEndpointId: 'vpce-s3',
        ServiceName: 'cn.com.amazonaws.cn-northwest-1.s3',
        VpcEndpointType: VpcEndpointType.Gateway,
        Groups: vpcEndpointsGroups,
        SubnetIds: defaultSubnets.map(subnet => subnet.SubnetId),
      },
      {
        VpcEndpointId: 'vpce-dynamodb',
        ServiceName: 'cn.com.amazonaws.cn-northwest-1.dynamodb',
        VpcEndpointType: VpcEndpointType.Gateway,
        Groups: vpcEndpointsGroups,
        SubnetIds: defaultSubnets.map(subnet => subnet.SubnetId),
      },
      {
        VpcEndpointId: 'vpce-glue',
        ServiceName: 'cn.com.amazonaws.cn-northwest-1.glue',
        VpcEndpointType: VpcEndpointType.Interface,
        Groups: [{ GroupId: 'sg-00000000000000031' }],
        SubnetIds: defaultSubnets.map(subnet => subnet.SubnetId),
      },
      {
        VpcEndpointId: 'vpce-error',
        ServiceName: 'cn.com.amazonaws.cn-northwest-1.error',
        VpcEndpointType: VpcEndpointType.Interface,
        Groups: vpcEndpointsGroups,
        SubnetIds: [],
      },
      {
        VpcEndpointId: 'vpce-emr-serverless',
        ServiceName: 'cn.com.amazonaws.cn-northwest-1.emr-serverless',
        VpcEndpointType: VpcEndpointType.Interface,
        Groups: vpcEndpointsGroups,
        SubnetIds: defaultSubnets.map(subnet => subnet.SubnetId),
      },
      {
        VpcEndpointId: 'vpce-states',
        ServiceName: 'cn.com.amazonaws.cn-northwest-1.states',
        VpcEndpointType: VpcEndpointType.Interface,
        Groups: vpcEndpointsGroups,
        SubnetIds: defaultSubnets.map(subnet => subnet.SubnetId),
      },
      {
        VpcEndpointId: 'vpce-logs',
        ServiceName: 'cn.com.amazonaws.cn-northwest-1.logs',
        VpcEndpointType: VpcEndpointType.Interface,
        Groups: vpcEndpointsGroups,
        SubnetIds: defaultSubnets.map(subnet => subnet.SubnetId),
      },
      {
        VpcEndpointId: 'vpce-redshift-data',
        ServiceName: 'cn.com.amazonaws.cn-northwest-1.redshift-data',
        VpcEndpointType: VpcEndpointType.Interface,
        Groups: vpcEndpointsGroups,
        SubnetIds: defaultSubnets.map(subnet => subnet.SubnetId),
      },
      {
        VpcEndpointId: 'vpce-sts',
        ServiceName: 'cn.com.amazonaws.cn-northwest-1.sts',
        VpcEndpointType: VpcEndpointType.Interface,
        Groups: vpcEndpointsGroups,
        SubnetIds: defaultSubnets.map(subnet => subnet.SubnetId),
      },
      {
        VpcEndpointId: 'vpce-ecr-dkr',
        ServiceName: 'cn.com.amazonaws.cn-northwest-1.ecr.dkr',
        VpcEndpointType: VpcEndpointType.Interface,
        Groups: vpcEndpointsGroups,
        SubnetIds: defaultSubnets.map(subnet => subnet.SubnetId),
      },
      {
        VpcEndpointId: 'vpce-ecr-api',
        ServiceName: 'cn.com.amazonaws.cn-northwest-1.ecr.api',
        VpcEndpointType: VpcEndpointType.Interface,
        Groups: vpcEndpointsGroups,
        SubnetIds: defaultSubnets.map(subnet => subnet.SubnetId),
      },
      {
        VpcEndpointId: 'vpce-ecs',
        ServiceName: 'cn.com.amazonaws.cn-northwest-1.ecs',
        VpcEndpointType: VpcEndpointType.Interface,
        Groups: vpcEndpointsGroups,
        SubnetIds: defaultSubnets.map(subnet => subnet.SubnetId),
      },
      {
        VpcEndpointId: 'vpce-ecs-agent',
        ServiceName: 'cn.com.amazonaws.cn-northwest-1.ecs-agent',
        VpcEndpointType: VpcEndpointType.Interface,
        Groups: vpcEndpointsGroups,
        SubnetIds: defaultSubnets.map(subnet => subnet.SubnetId),
      },
      {
        VpcEndpointId: 'vpce-ecs-telemetry',
        ServiceName: 'cn.com.amazonaws.cn-northwest-1.ecs-telemetry',
        VpcEndpointType: VpcEndpointType.Interface,
        Groups: vpcEndpointsGroups,
        SubnetIds: defaultSubnets.map(subnet => subnet.SubnetId),
      },
      {
        VpcEndpointId: 'vpce-kinesis-streams',
        ServiceName: 'cn.com.amazonaws.cn-northwest-1.kinesis-streams',
        VpcEndpointType: VpcEndpointType.Interface,
        Groups: vpcEndpointsGroups,
        SubnetIds: defaultSubnets.map(subnet => subnet.SubnetId),
      },
    ],
  });
  s3Mock.on(GetBucketPolicyCommand).resolves({ Policy: AllowIAMUserPutObjectPolicyInCnNorth1 });
}

export {
  MOCK_TOKEN,
  MOCK_PROJECT_ID,
  MOCK_APP_NAME,
  MOCK_APP_ID,
  MOCK_PIPELINE_ID,
  MOCK_PLUGIN_ID,
  MOCK_EXECUTION_ID_OLD,
  MOCK_EXECUTION_ID,
  MOCK_BUILT_IN_PLUGIN_ID,
  MOCK_NEW_TEMPLATE_VERSION,
  MOCK_SOLUTION_VERSION,
  MOCK_EVENT_NAME,
  MOCK_EVENT_PARAMETER_NAME,
  MOCK_USER_ATTRIBUTE_NAME,
  MOCK_DASHBOARD_ID,
  MOCK_USER_ID,
  tokenMock,
  userMock,
  projectExistedMock,
  appExistedMock,
  pipelineExistedMock,
  pluginExistedMock,
  dictionaryMock,
  createPipelineMock,
  createPipelineMockForBJSRegion,
  metadataEventExistedMock,
  metadataEventAttributeExistedMock,
  metadataUserAttributeExistedMock,
};
