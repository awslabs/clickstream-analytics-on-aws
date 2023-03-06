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

import { Arn, ArnFormat, Stack } from 'aws-cdk-lib';
import { IRole, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export function createRoleForS3SinkConnectorCustomResourceLambda(
  scope: Construct,
  props: { logS3BucketName: string; pluginS3BucketName: string; connectorRole: IRole },
) {
  const stackName = Stack.of(scope).stackName;
  const connectorName = `${stackName}-Connector-*`;
  const pluginName = `${stackName}-Plugin-*`;

  const role = new Role(scope, 'S3SinkConnectorCustomResourceLambdaRole', {
    assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
  });

  const policyStatements = [
    new PolicyStatement({
      resources: [
        props.connectorRole.roleArn,
      ],
      actions: [
        'iam:PassRole',
        'iam:CreateServiceLinkedRole',
        'iam:AttachRolePolicy',
        'iam:PutRolePolicy',
        'iam:UpdateRoleDescription',
        'iam:DeleteServiceLinkedRole',
        'iam:GetServiceLinkedRoleDeletionStatus',
      ],
    }),
    new PolicyStatement({
      resources: [
        //`arn:aws:s3:::${props.logS3BucketName}`
        Arn.format(
          {
            resource: `${props.logS3BucketName}`,
            region: '',
            account: '',
            service: 's3',
            arnFormat: ArnFormat.COLON_RESOURCE_NAME,
          },
          Stack.of(scope),
        ),
      ],
      actions: [
        's3:GetBucketLocation',
        's3:DeleteBucketPolicy',
        's3:PutBucketPolicy',
        's3:GetBucketPolicy',
      ],
    }),

    new PolicyStatement({
      resources: [
        //`arn:aws:s3:::${props.pluginS3BucketName}`,
        Arn.format(
          {
            resource: `${props.pluginS3BucketName}/*`,
            region: '',
            account: '',
            service: 's3',
            arnFormat: ArnFormat.COLON_RESOURCE_NAME,
          },
          Stack.of(scope),
        ),
      ],
      actions: [
        's3:GetObject',
        's3:PutObject',
        's3:DeleteObject',
      ],
    }),

    new PolicyStatement({
      resources: [
        //`arn:aws:kafkaconnect:*:*:connector/${props.clusterName}-s3-sink-connector/*`,
        Arn.format(
          {
            resource: `connector/${connectorName}/*`,
            service: 'kafkaconnect',
            arnFormat: ArnFormat.COLON_RESOURCE_NAME,
          },
          Stack.of(scope),
        ),
        // `arn:aws:kafkaconnect:*:*:custom-plugin/${props.clusterName}-connector-s3-plugin/*`,
        Arn.format(
          {
            resource: `custom-plugin/${pluginName}/*`,
            service: 'kafkaconnect',
            arnFormat: ArnFormat.COLON_RESOURCE_NAME,
          },
          Stack.of(scope),
        ),
      ],
      actions: [
        'kafkaconnect:DescribeCustomPlugin',
        'kafkaconnect:DescribeConnector',
      ],
    }),
    new PolicyStatement({
      resources: [
        '*',
      ],
      actions: [
        'kafkaconnect:ListConnectors',
        'kafkaconnect:CreateCustomPlugin',
        'kafkaconnect:CreateConnector',
        'kafkaconnect:DeleteConnector',
        'kafkaconnect:ListCustomPlugins',
        'kafkaconnect:DeleteCustomPlugin',
        'kafkaconnect:UpdateConnector',
      ],
      conditions: {
        StringEquals: {
          'aws:RequestedRegion': Stack.of(scope).region,
        },
      },
    }),

    new PolicyStatement({
      resources: [
        '*',
      ],
      actions: [
        'ec2:DescribeVpcs',
        'ec2:DescribeSubnets',
        'ec2:DescribeSecurityGroups',
        'ec2:CreateNetworkInterface',
        'ec2:DescribeNetworkInterfaces',
        'ec2:DeleteNetworkInterface',
        'ec2:AssignPrivateIpAddresses',
        'ec2:UnassignPrivateIpAddresses',
      ],
      conditions: {
        StringEquals: {
          'aws:RequestedRegion': Stack.of(scope).region,
        },
      },
    }),

    new PolicyStatement({
      resources: [
        '*',
      ],
      actions: [
        'logs:ListLogDeliveries',
        'logs:CreateLogDelivery',
        'logs:CreateLogStream',
        'logs:CreateLogGroup',
        'logs:PutDestinationPolicy',
        'logs:PutDestination',
        'logs:PutLogEvents',
        'logs:DeleteLogDelivery',
        'logs:DeleteLogGroup',
        'logs:DeleteLogStream',
        'logs:DeleteDestination',
        'logs:DeleteRetentionPolicy',
      ],
      conditions: {
        StringEquals: {
          'aws:RequestedRegion': Stack.of(scope).region,
        },
      },
    }),

    new PolicyStatement({
      resources: [Arn.format(
        {
          resource: '*',
          region: '',
          account: '',
          service: 'iam',
          arnFormat: ArnFormat.COLON_RESOURCE_NAME,
        },
        Stack.of(scope),
      )],
      actions: [
        'iam:ListRoles',
      ],
      conditions: {
        StringEquals: {
          'aws:RequestedRegion': Stack.of(scope).region,
        },
      },
    }),
  ];
  policyStatements.forEach((ps) => role.addToPolicy(ps));
  return role;
}

export function createS3SinkConnectorRole(
  scope: Construct,
  props: { mskClusterName: string; s3BucketName: string },
) {
  const role = new Role(scope, 's3-kafkaconnect-role', {
    assumedBy: new ServicePrincipal('kafkaconnect.amazonaws.com'),
  });

  const policyStatements = [
    new PolicyStatement({
      resources: [
      //`arn:aws:kafka:*:*:cluster/${props.mskClusterName}/*`
        Arn.format(
          {
            resource: `cluster/${props.mskClusterName}/*`,
            service: 'kafka',
            arnFormat: ArnFormat.COLON_RESOURCE_NAME,
          },
          Stack.of(scope),
        ),
      ],
      actions: ['kafka-cluster:Connect', 'kafka-cluster:DescribeCluster'],
    }),

    new PolicyStatement({
      resources: [
        //`arn:aws:kafka:*:*:topic/${props.mskClusterName}/*/*`
        Arn.format(
          {
            resource: `topic/${props.mskClusterName}/*/*`,
            service: 'kafka',
            arnFormat: ArnFormat.COLON_RESOURCE_NAME,
          },
          Stack.of(scope),
        ),
      ],
      actions: [
        'kafka-cluster:ReadData',
        'kafka-cluster:DescribeTopic',
        'kafka-cluster:CreateTopic',
        'kafka-cluster:WriteData',
      ],
    }),

    new PolicyStatement({
      resources: [
        //`arn:aws:kafka:*:*:group/${props.mskClusterName}/*/*`
        Arn.format(
          {
            resource: `group/${props.mskClusterName}/*/*`,
            service: 'kafka',
            arnFormat: ArnFormat.COLON_RESOURCE_NAME,
          },
          Stack.of(scope),
        ),
      ],
      actions: ['kafka-cluster:AlterGroup', 'kafka-cluster:DescribeGroup'],
    }),

    new PolicyStatement({
      resources: ['*'],
      actions: [
        'logs:ListLogDeliveries',
        'logs:CreateLogDelivery',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'logs:CreateLogGroup',
      ],
      conditions: {
        StringEquals: {
          'aws:RequestedRegion': Stack.of(scope).region,
        },
      },
    }),

    new PolicyStatement({
      resources: ['*'],
      actions: [
        'ec2:DescribeVpcs',
        'ec2:DescribeSubnets',
        'ec2:DescribeSecurityGroups',
        'ec2:CreateNetworkInterface',
        'ec2:DescribeNetworkInterfaces',
        'ec2:DeleteNetworkInterface',
        'ec2:AssignPrivateIpAddresses',
        'ec2:UnassignPrivateIpAddresses',
      ],
      conditions: {
        StringEquals: {
          'aws:RequestedRegion': Stack.of(scope).region,
        },
      },
    }),
    new PolicyStatement({
      resources: [
        //`arn:aws:s3:::*`
        Arn.format(
          {
            resource: '*',
            region: '',
            account: '',
            service: 's3',
            arnFormat: ArnFormat.COLON_RESOURCE_NAME,
          },
          Stack.of(scope),
        ),
      ],
      actions: ['s3:ListAllMyBuckets'],
    }),

    new PolicyStatement({
      resources: [
        //`arn:aws:s3:::${props.s3BucketName}/*`
        Arn.format(
          {
            resource: `${props.s3BucketName}/*`,
            region: '',
            account: '',
            service: 's3',
            arnFormat: ArnFormat.COLON_RESOURCE_NAME,
          },
          Stack.of(scope),
        ),
      ],
      actions: [
        's3:PutObject',
        's3:GetObject',
        's3:AbortMultipartUpload',
        's3:ListMultipartUploadParts',
        's3:ListBucketMultipartUploads',
        's3:ListBucket',
        's3:GetBucketLocation',
      ],
    }),
  ];
  policyStatements.forEach((ps) => role.addToPolicy(ps));
  return role;
}
