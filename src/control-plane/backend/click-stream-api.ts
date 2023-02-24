/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import path from 'path';
import {
  aws_dynamodb,
  aws_iam as iam,
  aws_lambda,
  CfnResource,
  Duration,
  IgnoreMode,
  RemovalPolicy,
  Stack,
} from 'aws-cdk-lib';
import { TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { Connections, ISecurityGroup, Port, SecurityGroup, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { Architecture, DockerImageCode, DockerImageFunction } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { addCfnNagToSecurityGroup } from '../../common/cfn-nag';
import { cloudWatchSendLogs, createENI } from '../../common/lambda';
import { NetworkProps } from '../alb-lambda-portal';

export interface DicItem {
  readonly name: string;
  readonly data: any;
}

export interface ClickStreamApiProps {
  readonly dictionaryItems: DicItem[];
  readonly existingVpc: boolean | undefined;
  readonly networkProps: NetworkProps;
  readonly ALBSecurityGroup: ISecurityGroup;
}

export class ClickStreamApiConstruct extends Construct {
  public readonly clickStreamApiFunction: DockerImageFunction;

  constructor(scope: Construct, id: string, props: ClickStreamApiProps) {
    super(scope, id);

    const dictionaryTable = new aws_dynamodb.Table(this, 'ClickstreamDictionary', {
      partitionKey: {
        name: 'name',
        type: aws_dynamodb.AttributeType.STRING,
      },
      billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
      encryption: TableEncryption.AWS_MANAGED,
    });

    const clickStreamTable = new aws_dynamodb.Table(this, 'ClickstreamMetadata', {
      partitionKey: {
        name: 'projectId',
        type: aws_dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'type',
        type: aws_dynamodb.AttributeType.STRING,
      },
      billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
      encryption: TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'ttl',
    });

    const apiLambdaSG = new SecurityGroup(this, 'ClickStreamApiFunctionSG', {
      vpc: props.networkProps.vpc,
      allowAllOutbound: true,
    });
    apiLambdaSG.connections.allowFrom(
      new Connections({
        securityGroups: [props.ALBSecurityGroup],
      }),
      Port.allTcp(),
      'allow all traffic from application load balancer',
    );

    addCfnNagToSecurityGroup(apiLambdaSG, ['W29', 'W27', 'W40', 'W5']);

    // Create a role for lambda
    const clickStreamApiFunctionRole = new iam.Role(this, 'ClickStreamApiFunctionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    this.clickStreamApiFunction = new DockerImageFunction(this, 'ClickStreamApiFunction', {
      description: 'Lambda function for api of solution Click Stream Analytics on AWS',
      code: DockerImageCode.fromImageAsset(path.join(__dirname, './lambda/api'), {
        file: 'Dockerfile',
        ignoreMode: IgnoreMode.DOCKER,
      }),
      environment: {
        CLICK_STREAM_TABLE_NAME: clickStreamTable.tableName,
        DICTIONARY_TABLE_NAME: dictionaryTable.tableName,
        AWS_ACCOUNT_ID: Stack.of(this).account,
        POWERTOOLS_SERVICE_NAME: 'click-stream',
        POWERTOOLS_LOGGER_LOG_LEVEL: 'WARN',
        POWERTOOLS_LOGGER_SAMPLE_RATE: '0.01',
        POWERTOOLS_LOGGER_LOG_EVENT: 'true',
        POWERTOOLS_METRICS_NAMESPACE: 'click-stream',
      },
      vpc: props.networkProps.vpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [apiLambdaSG],
      reservedConcurrentExecutions: 3,
      tracing: aws_lambda.Tracing.ACTIVE,
      role: clickStreamApiFunctionRole,
      architecture: Architecture.X86_64,
      timeout: Duration.seconds(30),
      memorySize: 512,
    });

    dictionaryTable.grantReadWriteData(this.clickStreamApiFunction);
    clickStreamTable.grantReadWriteData(this.clickStreamApiFunction);
    cloudWatchSendLogs('api-func-logs', this.clickStreamApiFunction);
    createENI('api-func-eni', this.clickStreamApiFunction);
    (clickStreamApiFunctionRole.node.findChild('DefaultPolicy')
      .node.defaultChild as CfnResource).addMetadata('cfn_nag', {
      rules_to_suppress: [
        {
          id: 'W12',
          reason: 'wildcard in policy is used for x-ray and logs',
        },
      ],
    });
  }
}
