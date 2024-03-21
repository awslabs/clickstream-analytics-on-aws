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
  CLICKSTREAM_SEGMENTS_CRON_JOB_RULE_PREFIX,
  CLICKSTREAM_SEGMENTS_WORKFLOW_PREFIX,
  QUICKSIGHT_RESOURCE_NAME_PREFIX,
  SCAN_METADATA_WORKFLOW_PREFIX,
} from '@aws/clickstream-base-lib';
import {
  CfnResource,
  Duration,
  RemovalPolicy,
  Stack,
  Aws,
  Arn,
  ArnFormat,
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
import { ArnPrincipal, Effect, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Architecture, Code, Function as LambdaFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { BatchInsertDDBCustomResource } from './batch-insert-ddb-custom-resource-construct';
import { BackendEventBus } from './event-bus-construct';
import { AddAdminUser } from './insert-admin-user';
import { LambdaAdapterLayer } from './layer/lambda-web-adapter/layer';
import { StackActionStateMachine } from './stack-action-state-machine-construct';
import { StackWorkflowStateMachine } from './stack-workflow-state-machine-construct';
import { addCfnNagSuppressRules, addCfnNagToSecurityGroup, rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions } from '../../common/cfn-nag';
import { createLambdaRole } from '../../common/lambda';
import { createLogGroup } from '../../common/logs';
import { POWERTOOLS_ENVS } from '../../common/powertools';
import { SolutionInfo } from '../../common/solution-info';

export interface ApplicationLoadBalancerProps {
  readonly vpc: IVpc;
  readonly subnets: SubnetSelection;
  readonly securityGroup: ISecurityGroup;
}

export interface AuthProps {
  readonly issuer: string;
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
  readonly adminUserEmail: string;
  readonly iamRolePrefix: string;
  readonly iamRoleBoundaryArn: string;
  readonly conditionStringRolePrefix: string;
  readonly conditionStringStackPrefix: string;
}

export interface LambdaFunctionNetworkProps {
  readonly vpc?: IVpc;
  readonly vpcSubnets?: SubnetSelection;
  readonly securityGroups?: ISecurityGroup[];
}

export class ClickStreamApiConstruct extends Construct {
  public readonly apiFunction: LambdaFunction;
  public readonly lambdaRestApi?: RestApi;
  public readonly batchInsertDDBCustomResource: BatchInsertDDBCustomResource;
  public readonly addAdminUserCustomResource: AddAdminUser;

  private readonly dictionaryTable: Table;
  private readonly metadataTable: Table;
  private readonly analyticsMetadataTable: Table;
  private readonly stackActionStateMachine: StackActionStateMachine;
  private readonly stackWorkflowStateMachine: StackWorkflowStateMachine;
  private readonly backendEventBus: BackendEventBus;
  private readonly uploadRole: Role;

  private readonly prefixTimeGSIName: string;
  private readonly prefixMonthGSIName: string;

  private readonly lambdaFunctionNetwork: any;

  constructor(scope: Construct, id: string, props: ClickStreamApiProps) {
    super(scope, id);

    this.prefixTimeGSIName = 'prefix-time-index';
    this.prefixMonthGSIName = 'prefix-month-index';

    this.dictionaryTable = new Table(this, 'ClickstreamDictionary', {
      partitionKey: {
        name: 'name',
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
      encryption: TableEncryption.AWS_MANAGED,
    });

    this.metadataTable = new Table(this, 'ClickstreamMetadata', {
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
    this.metadataTable.addGlobalSecondaryIndex({
      indexName: this.prefixTimeGSIName,
      partitionKey: {
        name: 'prefix',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'createAt',
        type: AttributeType.NUMBER,
      },
    });

    this.analyticsMetadataTable = new Table(this, 'AnalyticsMetadata', {
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'month',
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
      encryption: TableEncryption.AWS_MANAGED,
    });
    this.analyticsMetadataTable.addGlobalSecondaryIndex({
      indexName: this.prefixMonthGSIName,
      partitionKey: {
        name: 'prefix',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'month',
        type: AttributeType.STRING,
      },
    });

    // Dictionary data init
    this.batchInsertDDBCustomResource = new BatchInsertDDBCustomResource(this, 'BatchInsertDDBCustomResource', {
      table: this.dictionaryTable,
      targetToCNRegions: props.targetToCNRegions ?? false,
    });

    // Add admin user
    this.addAdminUserCustomResource = new AddAdminUser(this, 'AddAdminUserCustomResource', {
      uid: props.adminUserEmail,
      userTable: this.metadataTable,
    });

    this.lambdaFunctionNetwork = this.getLambdaNetworkConfig(props);

    // Create stack action StateMachine
    this.stackActionStateMachine = new StackActionStateMachine(this, 'StackActionStateMachine', {
      lambdaFunctionNetwork: this.lambdaFunctionNetwork,
      targetToCNRegions: props.targetToCNRegions ?? false,
      workflowBucket: props.stackWorkflowS3Bucket,
      iamRolePrefix: props.iamRolePrefix ?? '',
      conditionStringRolePrefix: props.conditionStringRolePrefix,
      conditionStringStackPrefix: props.conditionStringStackPrefix,
    });

    // Create stack workflow StateMachine
    this.stackWorkflowStateMachine = new StackWorkflowStateMachine(this, 'StackWorkflowStateMachine', {
      stateActionMachine: this.stackActionStateMachine.stateMachine,
      lambdaFunctionNetwork: this.lambdaFunctionNetwork,
      targetToCNRegions: props.targetToCNRegions ?? false,
      workflowBucket: props.stackWorkflowS3Bucket,
      iamRolePrefix: props.iamRolePrefix ?? '',
      conditionStringRolePrefix: props.conditionStringRolePrefix,
      conditionStringStackPrefix: props.conditionStringStackPrefix,
    });
    this.stackActionStateMachine.stateMachine.grantStartExecution(this.stackWorkflowStateMachine.stackWorkflowMachine);

    // Create event bus to listen stack status
    this.backendEventBus = new BackendEventBus(this, 'BackendEventBus', {
      clickStreamTable: this.metadataTable,
      prefixTimeGSIName: this.prefixTimeGSIName,
      lambdaFunctionNetwork: this.lambdaFunctionNetwork,
      listenStateMachine: this.stackWorkflowStateMachine.stackWorkflowMachine,
      iamRolePrefix: props.iamRolePrefix ?? '',
      conditionStringRolePrefix: props.conditionStringRolePrefix,
      conditionStringStackPrefix: props.conditionStringStackPrefix,
    });

    // Create a role for api function
    const apiFunctionRole = this.createApiFunctionRole(props);
    // Create a role for upload object to S3
    this.uploadRole = new Role(this, 'UploadRole', {
      assumedBy: new ArnPrincipal(apiFunctionRole.roleArn),
    });
    props.stackWorkflowS3Bucket.grantPut(this.uploadRole, `${props.pluginPrefix}*`);

    // Create api function
    this.apiFunction = this.createApiFunction(props, this.lambdaFunctionNetwork, apiFunctionRole);

    if (props.fronting === 'cloudfront') {
      if (!props.apiGateway) {
        throw new Error('Cloudfront fronting backend api must be have Api Gateway parameters.');
      }

      const apiGatewayAccessLogGroup = createLogGroup(this, {});

      this.lambdaRestApi = new LambdaRestApi(this, 'ClickStreamApi', {
        handler: this.apiFunction,
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
    }
  }

  private getQuickSightEmbedRoleArn(targetToCNRegions: boolean|undefined): string {
    if (targetToCNRegions) {
      return '';
    }
    const quickSightEmbedRole = new Role(this, 'QuickSightEmbedRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        quickSightEmbedPolicy: new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              resources: [
                `arn:${Aws.PARTITION}:quicksight:*:${Aws.ACCOUNT_ID}:dashboard/${QUICKSIGHT_RESOURCE_NAME_PREFIX}*`,
                `arn:${Aws.PARTITION}:quicksight:*:${Aws.ACCOUNT_ID}:user/*`,
              ],
              actions: [
                'quicksight:GenerateEmbedUrlForRegisteredUser',
              ],
            }),
          ],
        }),
      },
    });
    return quickSightEmbedRole.roleArn;
  }

  private createApiFunction(props: ClickStreamApiProps, lambdaFunctionNetwork: any, role: Role): LambdaFunction {
    const fn = new LambdaFunction(this, 'ApiFunction', {
      description: 'Lambda function for api of solution Clickstream Analytics on AWS',
      code: Code.fromDockerBuild(path.join(__dirname, '../../../'), {
        file: './src/control-plane/backend/Dockerfile',
      }),
      handler: 'run.sh',
      runtime: Runtime.NODEJS_18_X,
      architecture: Architecture.ARM_64,
      layers: [new LambdaAdapterLayer(this, 'LambdaAdapterLayer')],
      environment: {
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
        CLICK_STREAM_TABLE_NAME: this.metadataTable.tableName,
        DICTIONARY_TABLE_NAME: this.dictionaryTable.tableName,
        ANALYTICS_METADATA_TABLE_NAME: this.analyticsMetadataTable.tableName,
        STACK_ACTION_STATE_MACHINE: this.stackActionStateMachine.stateMachine.stateMachineArn,
        STACK_WORKFLOW_STATE_MACHINE: this.stackWorkflowStateMachine.stackWorkflowMachine.stateMachineArn,
        STACK_WORKFLOW_S3_BUCKET: props.stackWorkflowS3Bucket.bucketName,
        PREFIX_TIME_GSI_NAME: this.prefixTimeGSIName,
        PREFIX_MONTH_GSI_NAME: this.prefixMonthGSIName,
        AWS_ACCOUNT_ID: Stack.of(this).account,
        AWS_PARTITION: Aws.PARTITION,
        AWS_URL_SUFFIX: Aws.URL_SUFFIX,
        WITH_AUTH_MIDDLEWARE: props.fronting === 'alb' ? 'true' : 'false',
        ISSUER: props.authProps?.issuer ?? '',
        STS_UPLOAD_ROLE_ARN: this.uploadRole.roleArn,
        QUICKSIGHT_EMBED_ROLE_ARN: this.getQuickSightEmbedRoleArn(props.targetToCNRegions),
        HEALTH_CHECK_PATH: props.healthCheckPath,
        WITH_VALIDATE_ROLE: 'true',
        FULL_SOLUTION_VERSION: SolutionInfo.SOLUTION_VERSION,
        LISTEN_STACK_QUEUE_ARN: this.backendEventBus.listenStackQueue.queueArn,
        IAM_ROLE_BOUNDARY_ARN: props.iamRoleBoundaryArn,
        API_FUNCTION_LAMBDA_ROLE: role.roleArn,
        ...POWERTOOLS_ENVS,
      },
      timeout: Duration.seconds(30),
      memorySize: 512,
      role,
      logRetention: RetentionDays.ONE_MONTH,
      logFormat: 'JSON',
      applicationLogLevel: 'WARN',
      ...lambdaFunctionNetwork,
    });

    this.dictionaryTable.grantReadWriteData(fn);
    this.metadataTable.grantReadWriteData(fn);
    this.analyticsMetadataTable.grantReadWriteData(fn);

    addCfnNagSuppressRules(fn.node.defaultChild as CfnResource, [
      ...rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions('ApiFunction'),
    ]);

    return fn;
  }

  private getLambdaNetworkConfig(props: ClickStreamApiProps) {
    let lambdaFunctionNetwork = {};
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

      lambdaFunctionNetwork = {
        vpc: props.applicationLoadBalancer.vpc,
        vpcSubnets: [{ subnetType: SubnetType.PRIVATE_WITH_EGRESS }],
        securityGroups: [apiLambdaSG],
      };
    }
    return lambdaFunctionNetwork;
  }

  private createApiFunctionRole(props: ClickStreamApiProps): Role {
    const deployInVpc = props.fronting === 'alb';
    const apiFunctionPolicyStatements: PolicyStatement[] = [
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [
          this.stackActionStateMachine.stateMachine.stateMachineArn,
          this.stackWorkflowStateMachine.stackWorkflowMachine.stateMachineArn,
          Arn.format(
            {
              resource: 'stateMachine',
              service: 'states',
              region: '*',
              resourceName: `${SCAN_METADATA_WORKFLOW_PREFIX}*`,
              arnFormat: ArnFormat.COLON_RESOURCE_NAME,
            }, Stack.of(this),
          ),
          Arn.format(
            {
              resource: 'stateMachine',
              service: 'states',
              region: '*',
              resourceName: `${CLICKSTREAM_SEGMENTS_WORKFLOW_PREFIX}*`,
              arnFormat: ArnFormat.COLON_RESOURCE_NAME,
            }, Stack.of(this),
          ),
        ],
        actions: [
          'states:StartExecution',
        ],
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
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
          'ec2:DescribeNatGateways',
          'kafka:ListClustersV2',
          'kafka:ListClusters',
          'kafka:ListNodes',
          's3:ListAllMyBuckets',
          'redshift:DescribeClusters',
          'redshift:DescribeClusterSubnetGroups',
          'redshift-serverless:ListWorkgroups',
          'redshift-serverless:GetWorkgroup',
          'redshift-serverless:GetNamespace',
          'redshift-data:BatchExecuteStatement',
          's3:ListBucket',
          's3:GetObject',
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
          'iam:ListRoles',
          'iam:PassRole',
          'iam:ListServerCertificates',
          'iam:GetContextKeysForCustomPolicy',
          'iam:SimulateCustomPolicy',
          'states:DescribeExecution',
          'states:ListExecutions',
          'acm:ListCertificates',
          'cloudformation:DescribeStacks',
          'cloudformation:DescribeType',
          'secretsmanager:ListSecrets',
          'secretsmanager:GetSecretValue',
          'cloudwatch:DescribeAlarms',
          'cloudwatch:EnableAlarmActions',
          'cloudwatch:DisableAlarmActions',
          'events:PutRule',
          'events:ListTargetsByRule',
          'events:PutTargets',
          'events:TagResource',
          'events:UntagResource',
          'sns:CreateTopic',
          'sns:Subscribe',
          'sns:SetTopicAttributes',
          'sns:TagResource',
          'sns:UntagResource',
        ],
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [
          `arn:${Aws.PARTITION}:quicksight:*:${Aws.ACCOUNT_ID}:analysis/*`,
          `arn:${Aws.PARTITION}:quicksight:*:${Aws.ACCOUNT_ID}:dashboard/*`,
          `arn:${Aws.PARTITION}:quicksight:*:${Aws.ACCOUNT_ID}:dataset/*`,
          `arn:${Aws.PARTITION}:quicksight:*:${Aws.ACCOUNT_ID}:datasource/*`,
          `arn:${Aws.PARTITION}:quicksight:*:${Aws.ACCOUNT_ID}:folder/${QUICKSIGHT_RESOURCE_NAME_PREFIX}*`,
        ],
        actions: [
          'quicksight:UpdateDashboardPermissions',
          'quicksight:CreateDataSet',
          'quicksight:DeleteDataSet',
          'quicksight:PassDataSet',
          'quicksight:PassDataSource',
          'quicksight:CreateDashboard',
          'quicksight:DeleteDashboard',
          'quicksight:UpdateDashboard',
          'quicksight:DescribeDashboard',
          'quicksight:UpdateDashboardPublishedVersion',
          'quicksight:CreateAnalysis',
          'quicksight:UpdateAnalysis',
          'quicksight:DeleteAnalysis',
          'quicksight:CreateFolderMembership',
          'quicksight:ListFolderMembers',
          'quicksight:DescribeFolder',
          'quicksight:CreateFolder',
        ],
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [
          `arn:${Aws.PARTITION}:quicksight:*:${Aws.ACCOUNT_ID}:analysis/*`,
          `arn:${Aws.PARTITION}:quicksight:*:${Aws.ACCOUNT_ID}:dashboard/*`,
          `arn:${Aws.PARTITION}:quicksight:*:${Aws.ACCOUNT_ID}:dataset/*`,
          `arn:${Aws.PARTITION}:quicksight:*:${Aws.ACCOUNT_ID}:user/*`,
        ],
        actions: [
          'quicksight:GenerateEmbedUrlForRegisteredUser',
          'quicksight:RegisterUser',
          'quicksight:DeleteUser',
          'quicksight:ListUsers',
          'quicksight:ListDataSets',
          'quicksight:ListDashboards',
          'quicksight:ListAnalyses',
        ],
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [
          `arn:${Aws.PARTITION}:quicksight:*:${Aws.ACCOUNT_ID}:*`,
        ],
        actions: [
          'quicksight:DescribeAccountSubscription',
        ],
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [
          `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/${props.conditionStringRolePrefix}*`,
        ],
        actions: [
          'sts:AssumeRole',
        ],
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [
          `arn:${Aws.PARTITION}:events:*:${Aws.ACCOUNT_ID}:rule/${CLICKSTREAM_SEGMENTS_CRON_JOB_RULE_PREFIX}*`,
        ],
        actions: [
          'events:RemoveTargets',
          'events:DeleteRule',
        ],
      }),
    ];
    return createLambdaRole(this, 'ApiFunctionRole', deployInVpc, apiFunctionPolicyStatements);
  }
}
