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

import path from 'path';
import {
  aws_iam as iam,
  CfnResource,
  Duration,
  RemovalPolicy,
  Stack,
  Aws,
} from 'aws-cdk-lib';
import {
  EndpointType,
  RestApi,
  LambdaRestApi,
  MethodLoggingLevel,
  LogGroupLogDestination,
  AuthorizationType,
  IAuthorizer,
} from 'aws-cdk-lib/aws-apigateway';
import { AttributeType, BillingMode, Table, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import {
  Connections,
  ISecurityGroup,
  Port,
  SecurityGroup,
  SubnetSelection,
  IVpc, SubnetType,
} from 'aws-cdk-lib/aws-ec2';
import { ArnPrincipal } from 'aws-cdk-lib/aws-iam';
import { Architecture, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { BatchInsertDDBCustomResource } from './batch-insert-ddb-custom-resource-construct';
import dictionary from './config/dictionary.json';
import { LambdaAdapterLayer } from './layer/lambda-web-adapter/layer';
import { StackActionStateMachine } from './stack-action-state-machine-construct';
import { StackWorkflowStateMachine } from './stack-workflow-state-machine-construct';
import { addCfnNagSuppressRules, addCfnNagToSecurityGroup } from '../../common/cfn-nag';
import { cloudWatchSendLogs, createENI } from '../../common/lambda';
import { createLogGroup } from '../../common/logs';
import { POWERTOOLS_ENVS } from '../../common/powertools';

export interface DicItem {
  readonly name: string;
  readonly data: any;
}

export interface ApplicationLoadBalancerProps {
  readonly vpc: IVpc;
  readonly subnets: SubnetSelection;
  readonly securityGroup: ISecurityGroup;
}

export interface AuthProps {
  readonly issuer: string;
  readonly authorizerTable: Table;
}

export interface ApiGatewayProps {
  readonly stageName: string;
  readonly authorizer: IAuthorizer;
}

export interface ClickStreamApiProps {
  readonly fronting: 'alb' | 'cloudfront';
  readonly applicationLoadBalancer?: ApplicationLoadBalancerProps;
  readonly apiGateway?: ApiGatewayProps;
  readonly targetToCNRegions?: boolean;
  readonly stackWorkflowS3Bucket: IBucket;
  readonly pluginPrefix: string;
  readonly authProps?: AuthProps;
  readonly healthCheckPath: string;
}

export class ClickStreamApiConstruct extends Construct {
  public readonly clickStreamApiFunction: Function;
  public readonly lambdaRestApi?: RestApi;
  public readonly batchInsertDDBCustomResource: BatchInsertDDBCustomResource;

  constructor(scope: Construct, id: string, props: ClickStreamApiProps) {
    super(scope, id);

    const dictionaryTable = new Table(this, 'ClickstreamDictionary', {
      partitionKey: {
        name: 'name',
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
      encryption: TableEncryption.AWS_MANAGED,
    });

    const clickStreamTable = new Table(this, 'ClickstreamMetadata', {
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'type',
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
      encryption: TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'ttl',
    });
    const prefixTimeGSIName = 'prefix-time-index';
    clickStreamTable.addGlobalSecondaryIndex({
      indexName: prefixTimeGSIName,
      partitionKey: {
        name: 'prefix',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'createAt',
        type: AttributeType.NUMBER,
      },
    });

    const analyticsMetadataTable = new Table(this, 'ClickstreamAnalyticsMetadata', {
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'type',
        type: AttributeType.STRING,
      },

      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
      encryption: TableEncryption.AWS_MANAGED,
    });
    analyticsMetadataTable.addGlobalSecondaryIndex({
      indexName: prefixTimeGSIName,
      partitionKey: {
        name: 'prefix',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'createAt',
        type: AttributeType.NUMBER,
      },
    });
    const invertedGSIName = 'inverted-index';
    analyticsMetadataTable.addGlobalSecondaryIndex({
      indexName: invertedGSIName,
      partitionKey: {
        name: 'type',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
    });

    // Dictionary data init
    this.batchInsertDDBCustomResource = new BatchInsertDDBCustomResource(this, 'BatchInsertDDBCustomResource', {
      table: dictionaryTable,
      items: dictionary,
      targetToCNRegions: props.targetToCNRegions ?? false,
    });

    let apiFunctionProps = {};
    if (props.fronting === 'alb') {
      if (!props.applicationLoadBalancer) {
        throw new Error('Application Load Balancer fronting backend api must be have applicationLoadBalancer parameters.');
      }
      const apiLambdaSG = new SecurityGroup(this, 'ClickStreamApiFunctionSG', {
        vpc: props.applicationLoadBalancer.vpc,
        allowAllOutbound: true,
      });
      apiLambdaSG.connections.allowFrom(
        new Connections({
          securityGroups: [props.applicationLoadBalancer.securityGroup],
        }),
        Port.allTcp(),
        'allow all traffic from application load balancer',
      );
      addCfnNagToSecurityGroup(apiLambdaSG, ['W29', 'W27', 'W40', 'W5']);

      apiFunctionProps = {
        vpc: props.applicationLoadBalancer.vpc,
        vpcSubnets: [{ subnetType: SubnetType.PRIVATE_WITH_EGRESS }],
        securityGroups: [apiLambdaSG],
      };
    }

    // Create stack action StateMachine
    const stackActionStateMachine = new StackActionStateMachine(this, 'StackActionStateMachine', {
      clickStreamTable,
      lambdaFuncProps: apiFunctionProps,
      targetToCNRegions: props.targetToCNRegions ?? false,
      workflowBucket: props.stackWorkflowS3Bucket,
    });

    // Create stack workflow StateMachine
    const stackWorkflowStateMachine = new StackWorkflowStateMachine(this, 'StackWorkflowStateMachine', {
      stateActionMachine: stackActionStateMachine.stateMachine,
      lambdaFuncProps: apiFunctionProps,
      targetToCNRegions: props.targetToCNRegions ?? false,
      workflowBucket: props.stackWorkflowS3Bucket,
    });
    stackActionStateMachine.stateMachine.grantStartExecution(stackWorkflowStateMachine.stackWorkflowMachine);

    // Create a role for lambda
    const clickStreamApiFunctionRole = new iam.Role(this, 'ClickStreamApiFunctionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });
    const stepFunctionPolicy = new iam.Policy(this, 'ClickStreamApiStepFunctionPolicy', {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: [
            stackActionStateMachine.stateMachine.stateMachineArn,
            stackWorkflowStateMachine.stackWorkflowMachine.stateMachineArn,
          ],
          actions: [
            'states:StartExecution',
          ],
        }),
      ],
    });
    stepFunctionPolicy.attachToRole(clickStreamApiFunctionRole);
    const awsSdkPolicy = new iam.Policy(this, 'ClickStreamApiAWSSdkPolicy', {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          resources: ['*'],
          actions: [
            'ec2:DescribeRegions',
            'ec2:DescribeVpcs',
            'ec2:DescribeSecurityGroups',
            'ec2:DescribeSubnets',
            'ec2:DescribeRouteTables',
            'ec2:DescribeVpcEndpoints',
            'ec2:DescribeSecurityGroupRules',
            'ec2:DescribeAvailabilityZones',
            'kafka:ListClustersV2',
            'kafka:ListClusters',
            'kafka:ListNodes',
            's3:ListAllMyBuckets',
            'redshift:DescribeClusters',
            'redshift:DescribeClusterSubnetGroups',
            'redshift-serverless:ListWorkgroups',
            'redshift-serverless:GetWorkgroup',
            'redshift-serverless:GetNamespace',
            's3:ListBucket',
            'quicksight:ListUsers',
            'quicksight:DescribeAccountSubscription',
            'quicksight:RegisterUser',
            'quicksight:GenerateEmbedUrlForRegisteredUser',
            'quicksight:UpdateDashboardPermissions',
            'ds:AuthorizeApplication',
            'ds:UnauthorizeApplication',
            'ds:CheckAlias',
            'ds:CreateAlias',
            'ds:DescribeDirectories',
            'ds:DescribeTrusts',
            'ds:DeleteDirectory',
            'ds:CreateIdentityPoolDirectory',
            's3:GetBucketLocation',
            's3:GetBucketPolicy',
            'route53:ListHostedZones',
            'athena:ListWorkGroups',
            'iam:ListRoles',
            'iam:ListServerCertificates',
            'iam:GetContextKeysForCustomPolicy',
            'iam:SimulateCustomPolicy',
            'states:DescribeExecution',
            'acm:ListCertificates',
            'cloudformation:DescribeStacks',
            'secretsmanager:ListSecrets',
            'secretsmanager:GetSecretValue',
            'cloudwatch:DescribeAlarms',
            'cloudwatch:EnableAlarmActions',
            'cloudwatch:DisableAlarmActions',
            'emr-serverless:ListApplications',
          ],
        }),
      ],
    });
    awsSdkPolicy.attachToRole(clickStreamApiFunctionRole);
    addCfnNagSuppressRules(awsSdkPolicy.node.defaultChild as iam.CfnPolicy, [
      {
        id: 'W12',
        reason:
          'The lambda need to be queried all resources under the current account by design',
      },
      {
        id: 'W76',
        reason:
          'This policy needs to be able to call other AWS service by design',
      },
    ]);

    // Create a role for upload object to S3
    const uploadRole = new iam.Role(this, 'UploadRole', {
      assumedBy: new ArnPrincipal(clickStreamApiFunctionRole.roleArn),
    });
    props.stackWorkflowS3Bucket.grantPut(uploadRole, `${props.pluginPrefix}*`);

    this.clickStreamApiFunction = new Function(this, 'ApiFunction', {
      description: 'Lambda function for api of solution Clickstream Analytics on AWS',
      code: Code.fromDockerBuild(path.join(__dirname, '../../../'), {
        file: './src/control-plane/backend/Dockerfile',
      }),
      handler: 'run.sh',
      runtime: Runtime.NODEJS_18_X,
      architecture: Architecture.X86_64,
      layers: [new LambdaAdapterLayer(this, 'LambdaAdapterLayerX86')],
      environment: {
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
        CLICK_STREAM_TABLE_NAME: clickStreamTable.tableName,
        DICTIONARY_TABLE_NAME: dictionaryTable.tableName,
        ANALYTICS_METADATA_TABLE_NAME: analyticsMetadataTable.tableName,
        STACK_ACTION_SATE_MACHINE: stackActionStateMachine.stateMachine.stateMachineArn,
        STACK_WORKFLOW_SATE_MACHINE: stackWorkflowStateMachine.stackWorkflowMachine.stateMachineArn,
        STACK_WORKFLOW_S3_BUCKET: props.stackWorkflowS3Bucket.bucketName,
        PREFIX_TIME_GSI_NAME: prefixTimeGSIName,
        INVERTED_GSI_NAME: invertedGSIName,
        AWS_ACCOUNT_ID: Stack.of(this).account,
        AWS_URL_SUFFIX: Aws.URL_SUFFIX,
        WITH_AUTH_MIDDLEWARE: props.fronting === 'alb' ? 'true' : 'false',
        ISSUER: props.authProps?.issuer ?? '',
        AUTHORIZER_TABLE_NAME: props.authProps?.authorizerTable.tableName ?? '',
        STS_UPLOAD_ROLE_ARN: uploadRole.roleArn,
        API_ROLE_NAME: clickStreamApiFunctionRole.roleName,
        HEALTH_CHECK_PATH: props.healthCheckPath,
        QUICKSIGHT_CONTROL_PLANE_REGION: props.targetToCNRegions ? 'cn-north-1' : 'us-east-1',
        ... POWERTOOLS_ENVS,
      },
      timeout: Duration.seconds(30),
      memorySize: 512,
      role: clickStreamApiFunctionRole,
      ...apiFunctionProps,
    });

    dictionaryTable.grantReadWriteData(this.clickStreamApiFunction);
    clickStreamTable.grantReadWriteData(this.clickStreamApiFunction);
    if (props.authProps?.authorizerTable) {
      props.authProps?.authorizerTable.grantReadWriteData(this.clickStreamApiFunction);
    }
    cloudWatchSendLogs('api-func-logs', this.clickStreamApiFunction);
    createENI('api-func-eni', this.clickStreamApiFunction);

    addCfnNagSuppressRules(this.clickStreamApiFunction.node.defaultChild as CfnResource, [
      {
        id: 'W92',
        reason: 'Lambda function is only used by ClickStreamApiFunction for deployment as cloudformation custom resources or per product design, no need to set ReservedConcurrentExecutions',
      },
    ]);

    if (props.fronting === 'cloudfront') {
      if (!props.apiGateway) {
        throw new Error('Cloudfront fronting backend api must be have Api Gateway parameters.');
      }

      const apiGatewayAccessLogGroup = createLogGroup(this, {});

      this.lambdaRestApi = new LambdaRestApi(this, 'ClickStreamApi', {
        handler: this.clickStreamApiFunction,
        proxy: true,
        defaultMethodOptions: {
          authorizationType: AuthorizationType.CUSTOM,
          authorizer: props.apiGateway.authorizer,
        },
        endpointConfiguration: {
          types: [EndpointType.REGIONAL],
        },
        deployOptions: {
          stageName: props.apiGateway.stageName,
          tracingEnabled: true,
          dataTraceEnabled: false,
          loggingLevel: MethodLoggingLevel.ERROR,
          accessLogDestination: new LogGroupLogDestination(apiGatewayAccessLogGroup),
          metricsEnabled: true,
        },
      });
      // Configure Usage Plan
      this.lambdaRestApi.addUsagePlan('ClickStreamApiUsagePlan', {
        apiStages: [{
          api: this.lambdaRestApi,
          stage: this.lambdaRestApi.deploymentStage,
        }],
        throttle: {
          rateLimit: 50,
          burstLimit: 100,
        },
      });

      addCfnNagSuppressRules(
        this.clickStreamApiFunction.node.defaultChild as CfnResource,
        [
          {
            id: 'W89', //Lambda functions should be deployed inside a VPC
            reason: 'Lambda functions deployed outside VPC when cloudfront fronting backend api.',
          },
          {
            id: 'W92',
            reason: 'Lambda function is only used by ClickStreamApiFunction for deployment as cloudformation custom resources or per product design, no need to set ReservedConcurrentExecutions',
          },
        ],
      );
      addCfnNagSuppressRules(
        stackActionStateMachine.actionFunction.node.defaultChild as CfnResource,
        [
          {
            id: 'W89', //Lambda functions should be deployed inside a VPC
            reason: 'Lambda functions deployed outside VPC when cloudfront fronting backend api.',
          },
        ],
      );
    }
  }
}
