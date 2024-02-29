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

import { DeleteRuleCommand, ListTargetsByRuleCommand, PutRuleCommand, PutTargetsCommand, RemoveTargetsCommand, TagResourceCommand as EventTagResourceCommand } from '@aws-sdk/client-cloudwatch-events';
import { ConditionalCheckFailedException, TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
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
import { DescribeAccountSubscriptionCommand, Edition, RegisterUserCommand, ResourceExistsException } from '@aws-sdk/client-quicksight';
import { DescribeClustersCommand, DescribeClusterSubnetGroupsCommand } from '@aws-sdk/client-redshift';
import { GetNamespaceCommand, GetWorkgroupCommand } from '@aws-sdk/client-redshift-serverless';
import { BucketLocationConstraint, GetBucketLocationCommand, GetBucketPolicyCommand } from '@aws-sdk/client-s3';
import { GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { StartExecutionCommand } from '@aws-sdk/client-sfn';
import { CreateTopicCommand, SetTopicAttributesCommand, SubscribeCommand, TagResourceCommand as SNSTagResourceCommand } from '@aws-sdk/client-sns';
import { DynamoDBDocumentClient, GetCommand, GetCommandInput, PutCommand, PutCommandOutput, QueryCommand, QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import { AwsClientStub } from 'aws-sdk-client-mock';
import { analyticsMetadataTable, clickStreamTableName, dictionaryTableName, prefixTimeGSIName } from '../../common/constants';
import { IUserRole, ProjectEnvironment } from '../../common/types';
import dictionary from '../../config/dictionary.json';
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
const MOCK_EVENT_NAME = '_first_open';
const MOCK_EVENT_PARAMETER_NAME = 'install_source';
const MOCK_USER_ATTRIBUTE_NAME = '_user_id';
const MOCK_DASHBOARD_ID = 'dash_6666_6666';
const MOCK_USER_ID = 'fake@example.com';

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


function userMock(ddbMock: any, userId: string, roles: IUserRole[], existed?: boolean): any {
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
      roles: roles,
      deleted: false,
    },
  });
}

function tokenMock(ddbMock: AwsClientStub<DynamoDBDocumentClient>, existed: boolean): any {
  if (existed) {
    return ddbMock.on(PutCommand).callsFakeOnce(input => {
      if (
        input.TableName === clickStreamTableName &&
        input.Item.id === MOCK_TOKEN &&
        input.Item.type === 'REQUESTID' &&
        input.ConditionExpression === 'attribute_not_exists(#id)'
      ) {
        throw new ConditionalCheckFailedException(
          {
            message: 'ConditionalCheckFailedException',
            $metadata: {},
          },
        );
      }
    });
  }
  return ddbMock.on(PutCommand).callsFakeOnce(input => {
    if (
      input.TableName === clickStreamTableName &&
      input.Item.id === MOCK_TOKEN &&
      input.Item.type === 'REQUESTID' &&
      input.ConditionExpression === 'attribute_not_exists(#id)'
    ) {
      return {} as PutCommandOutput;
    } else {
      throw new Error('mocked token id rejection');
    }
  });
}

function quickSightUserMock(ddbMock: AwsClientStub<DynamoDBDocumentClient>, inGCR: boolean): any {
  if (inGCR) {
    return ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          id: MOCK_PROJECT_ID,
          region: 'cn-north-1',
          reporting: {
            quickSight: {
              user: 'arn:aws-cn:quicksight:cn-north-1:55555555555555:user/default/user1',
            },
          },
        },
      ],
    });
  } else {
    return ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          id: MOCK_PROJECT_ID,
          region: 'us-east-1',
        },
      ],
    });
  }
}

function tokenMockTwice(ddbMock: AwsClientStub<DynamoDBDocumentClient>): any {
  return ddbMock.on(PutCommand).callsFakeOnce(input => {
    if (
      input.TableName === clickStreamTableName &&
      input.Item.id === MOCK_TOKEN &&
      input.Item.type === 'REQUESTID' &&
      input.ConditionExpression === 'attribute_not_exists(#id)'
    ) {
      return {} as PutCommandOutput;
    } else {
      throw new Error('mocked token id rejection');
    }
  }).callsFake(input => {
    if (
      input.TableName === clickStreamTableName &&
      input.Item.id === MOCK_TOKEN &&
      input.Item.type === 'REQUESTID' &&
      input.ConditionExpression === 'attribute_not_exists(#id)'
    ) {
      throw new ConditionalCheckFailedException(
        {
          message: 'ConditionalCheckFailedException',
          $metadata: {},
        },
      );
    }
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
      Item: dictionary.find(item => item.name === 'BuiltInPlugins'),
    });
  }
  if (!name || name === 'Templates') {
    ddbMock.on(GetCommand, {
      TableName: dictionaryTableName,
      Key: {
        name: 'Templates',
      },
    }).resolves({
      Item: dictionary.find(item => item.name === 'Templates'),
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
  if (!name || name === 'MetadataBuiltInList') {
    ddbMock.on(GetCommand, {
      TableName: dictionaryTableName,
      Key: {
        name: 'MetadataBuiltInList',
      },
    }).resolves({
      Item: dictionary.find(item => item.name === 'MetadataBuiltInList'),
    });
  }
}

function createPipelineMock(
  mockClients: {
    ddbMock: any;
    kafkaMock: any;
    redshiftServerlessMock: any;
    redshiftMock: any;
    ec2Mock: any;
    sfnMock: any;
    secretsManagerMock: any;
    quickSightMock: any;
    s3Mock: any;
    iamMock: any;
    cloudWatchEventsMock: any;
    snsMock: any;
  },
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
    ecsEndpointSGAllowOneSubnet?: boolean;
    ecsEndpointSGAllowAllSubnets?: boolean;
    sgError?: boolean;
    vpcEndpointSubnetErr?: boolean;
    twoAZsInRegion?: boolean;
    quickSightStandard?: boolean;
    quickSightUserExisted?: boolean;
    albPolicyDisable?: boolean;
    bucket?: {
      notExist?: boolean;
      location?: BucketLocationConstraint;
    };
  }): any {
  mockClients.iamMock.on(SimulateCustomPolicyCommand).resolves({
    EvaluationResults: [
      {
        EvalActionName: '',
        EvalDecision: PolicyEvaluationDecisionType.ALLOWED,
      },
    ],
  });
  // project
  mockClients.ddbMock.on(GetCommand, {
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
  mockClients.ddbMock.on(TransactWriteItemsCommand).resolves({});
  // pipeline
  mockClients.ddbMock.on(QueryCommand, {
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
    mockClients.ddbMock.on(GetCommand, {
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
  mockClients.ddbMock.on(QueryCommand, {
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
  mockClients.ddbMock.on(QueryCommand, {
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
  mockClients.kafkaMock.on(ListNodesCommand).resolves({
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
  mockClients.redshiftServerlessMock.on(GetWorkgroupCommand).resolves({
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
  mockClients.redshiftServerlessMock.on(GetNamespaceCommand).resolves({
    namespace: {
      namespaceId: '3fe99af1-0b02-4b43-b8d4-34ccfd52c865',
      namespaceArn: 'arn:aws:redshift-serverless:ap-southeast-1:111122223333:namespace/3fe99af1-0b02-4b43-b8d4-34ccfd52c865',
      namespaceName: 'test-ns',
    },
  });
  mockClients.redshiftMock.on(DescribeClustersCommand).resolves({
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
  mockClients.redshiftMock.on(DescribeClusterSubnetGroupsCommand).resolves({
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
  const mockSecurityGroupRules = [
    {
      GroupId: 'sg-00000000000000030',
      IsEgress: false,
      IpProtocol: '-1',
      FromPort: -1,
      ToPort: -1,
      CidrIpv4: '10.0.0.0/16',
    },
    {
      GroupId: 'sg-00000000000000031',
      IsEgress: false,
      IpProtocol: '-1',
      FromPort: -1,
      ToPort: -1,
      CidrIpv4: '10.0.0.0/16',
    },
    {
      GroupId: 'sg-00000000000000032',
      IsEgress: false,
      IpProtocol: '-1',
      FromPort: -1,
      ToPort: -1,
      CidrIpv4: '10.0.0.0/16',
    },
  ];
  if (props?.sgError) {
    mockSecurityGroupRules[0].CidrIpv4 = '11.11.11.11/32';
    mockSecurityGroupRules[1].CidrIpv4 = '11.11.11.11/32';
    mockSecurityGroupRules[2].CidrIpv4 = '11.11.11.11/32';
  } else if (props?.glueEndpointSGError) {
    mockSecurityGroupRules[1].CidrIpv4 = '11.11.11.11/32';
  } else if (props?.ecsEndpointSGAllowOneSubnet) {
    mockSecurityGroupRules[2] = {
      GroupId: 'sg-00000000000000032',
      IsEgress: false,
      IpProtocol: '-1',
      FromPort: -1,
      ToPort: -1,
      CidrIpv4: '10.0.32.0/20',
    };
  } else if (props?.ecsEndpointSGAllowAllSubnets) {
    mockSecurityGroupRules[2] = {
      GroupId: 'sg-00000000000000032',
      IsEgress: false,
      IpProtocol: '-1',
      FromPort: -1,
      ToPort: -1,
      CidrIpv4: '10.0.32.0/20',
    };
    mockSecurityGroupRules.push({
      GroupId: 'sg-00000000000000032',
      IsEgress: false,
      IpProtocol: '-1',
      FromPort: -1,
      ToPort: -1,
      CidrIpv4: '10.0.48.0/20',
    });
    mockSecurityGroupRules.push({
      GroupId: 'sg-00000000000000032',
      IsEgress: false,
      IpProtocol: '-1',
      FromPort: -1,
      ToPort: -1,
      CidrIpv4: '10.0.64.0/20',
    });
  };
  mockClients.ec2Mock.on(DescribeSecurityGroupRulesCommand).
    resolves({
      SecurityGroupRules: mockSecurityGroupRules,
    });
  mockClients.ec2Mock.on(DescribeAvailabilityZonesCommand).
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

  mockClients.ec2Mock.on(DescribeNatGatewaysCommand).
    resolves({
      NatGateways: [
        {
          NatGatewayId: 'NatGatewayId1',
          SubnetId: 'subnet-00000000000000010',
          ConnectivityType: ConnectivityType.PUBLIC,
        },
      ],
    });


  const vpcEndpointsGroups = [{ GroupId: 'sg-00000000000000030' }];

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
      Groups: [{ GroupId: 'sg-00000000000000032' }],
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
  mockClients.ec2Mock.on(DescribeSubnetsCommand)
    .resolves({
      Subnets: mockSubnets,
    });
  mockClients.ec2Mock.on(DescribeRouteTablesCommand).resolves({
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
  mockClients.ec2Mock.on(DescribeVpcEndpointsCommand).resolves({
    VpcEndpoints: mockVpcEndpoints,
  });
  mockClients.secretsManagerMock.on(GetSecretValueCommand).resolves({
    SecretString: '{"issuer":"1","userEndpoint":"2","authorizationEndpoint":"3","tokenEndpoint":"4","appClientId":"5","appClientSecret":"6"}',
  });
  mockClients.sfnMock.on(StartExecutionCommand).resolves({ executionArn: MOCK_EXECUTION_ID });
  mockClients.s3Mock.on(GetBucketPolicyCommand).resolves({
    Policy: props?.albPolicyDisable ? AllowIAMUserPutObejectPolicyWithErrorService
      :AllowIAMUserPutObejectPolicyInApSouthEast1,
  });
  if (props?.bucket?.notExist) {
    const mockNoSuchBucketError = new Error('NoSuchBucket');
    mockNoSuchBucketError.name = 'NoSuchBucket';
    mockClients.s3Mock.on(GetBucketLocationCommand).rejects(mockNoSuchBucketError);
  } else {
    mockClients.s3Mock.on(GetBucketLocationCommand).resolves({
      LocationConstraint: props?.bucket?.location ?? BucketLocationConstraint.ap_southeast_1,
    });
  }
  createEventRuleMock(mockClients.cloudWatchEventsMock);
  createSNSTopicMock(mockClients.snsMock);
  mockQuickSight(mockClients.quickSightMock, props?.quickSightStandard, props?.quickSightUserExisted);
}

function mockQuickSight(quickSightMock: any, standard?: boolean, userExisted?: boolean): any {
  quickSightMock.on(DescribeAccountSubscriptionCommand).resolves({
    AccountInfo: {
      AccountName: 'ck',
      Edition: standard ? Edition.STANDARD : Edition.ENTERPRISE,
    },
  });
  if (userExisted) {
    quickSightMock.on(RegisterUserCommand).rejects(
      new ResourceExistsException(
        {
          message: 'ResourceExistsException',
          $metadata: {},
        },
      ),
    );
  } else {
    quickSightMock.on(RegisterUserCommand).resolves({});
  }
}

function createPipelineMockForBJSRegion(s3Mock: any) {
  s3Mock.on(GetBucketPolicyCommand).resolves({ Policy: AllowIAMUserPutObjectPolicyInCnNorth1 });
}

function createEventRuleMock(cloudWatchEventsMock: any): any {
  cloudWatchEventsMock.on(PutRuleCommand).resolves({
    RuleArn: 'arn:aws:events:ap-southeast-1:111122223333:rule/ck-clickstream-branch-main',
  });
  cloudWatchEventsMock.on(EventTagResourceCommand).resolves({});
  cloudWatchEventsMock.on(PutTargetsCommand).resolves({});
}

function deleteEventRuleMock(cloudWatchEventsMock: any): any {
  cloudWatchEventsMock.on(ListTargetsByRuleCommand).resolves({
    Targets: [{
      Id: '1',
      Arn: 'arn:aws:states:ap-southeast-1:111122223333:stateMachine:ck-clickstream-branch-main',
    }],
  });
  cloudWatchEventsMock.on(RemoveTargetsCommand).resolves({});
  cloudWatchEventsMock.on(DeleteRuleCommand).resolves({});
}

function createSNSTopicMock(snsMock: any): any {
  snsMock.on(CreateTopicCommand).resolves({
    TopicArn: 'arn:aws:sns:ap-southeast-1:111122223333:ck-clickstream-branch-main',
  });
  snsMock.on(SNSTagResourceCommand).resolves({});
  snsMock.on(SetTopicAttributesCommand).resolves({});
  snsMock.on(SubscribeCommand).resolves({});
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
  tokenMockTwice,
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
  deleteEventRuleMock,
  createEventRuleMock,
  createSNSTopicMock,
  quickSightUserMock,
};
