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

import { join } from 'path';
import { EVENT_SOURCE_LOAD_DATA_FLOW, SCAN_METADATA_WORKFLOW_PREFIX } from '@aws/clickstream-base-lib';
import {
  Stack,
  NestedStack,
  NestedStackProps,
  Arn, ArnFormat, Aws, Fn, CustomResource, RemovalPolicy, CfnResource,
} from 'aws-cdk-lib';
import { ITable, Table, AttributeType, BillingMode, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import {
  SubnetSelection,
  IVpc,
} from 'aws-cdk-lib/aws-ec2';
import { PolicyStatement, Role, AccountPrincipal, IRole, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { IStateMachine, TaskInput } from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import { ApplicationSchemasAndReporting } from './private/app-schema';
import { ClearExpiredEventsWorkflow } from './private/clear-expired-events-workflow';
import { DYNAMODB_TABLE_INDEX_NAME, REDSHIFT_EVENT_PARAMETER_TABLE_NAME, REDSHIFT_EVENT_TABLE_NAME, REDSHIFT_ITEM_TABLE_NAME, REDSHIFT_USER_TABLE_NAME } from './private/constant';
import { LoadOdsDataToRedshiftWorkflow } from './private/load-ods-data-workflow';
import { createMetricsWidgetForRedshiftCluster } from './private/metrics-redshift-cluster';
import { createMetricsWidgetForRedshiftServerless } from './private/metrics-redshift-serverless';
import { ExistingRedshiftServerlessProps, ProvisionedRedshiftProps, NewRedshiftServerlessProps, ScanMetadataWorkflowData, ClearExpiredEventsWorkflowData, TablesODSSource, WorkflowBucketInfo, LoadDataConfig } from './private/model';
import { RedshiftAssociateIAMRole } from './private/redshift-associate-iam-role';
import { RedshiftServerless } from './private/redshift-serverless';
import { ScanMetadataWorkflow } from './private/scan-metadata-workflow';
import { addCfnNagForCustomResourceProvider, addCfnNagForLogRetention, addCfnNagToStack, ruleRolePolicyWithWildcardResources, ruleForLambdaVPCAndReservedConcurrentExecutions, ruleToSuppressRolePolicyWithHighSPCM, ruleToSuppressRolePolicyWithWildcardResources } from '../common/cfn-nag';
import { createSGForEgressToAwsService } from '../common/sg';
import { SolutionInfo } from '../common/solution-info';
import { getExistVpc } from '../common/vpc-utils';

export interface RedshiftOdsTables {
  readonly event: string;
  readonly event_parameter: string;
  readonly user: string;
  readonly item: string;
}
export interface RedshiftAnalyticsStackProps extends NestedStackProps {
  readonly vpc: IVpc;
  readonly subnetSelection: SubnetSelection;
  readonly projectId: string;
  readonly appIds: string;
  readonly tablesOdsSource: TablesODSSource;
  readonly mvRefreshInterval: number;
  readonly loadDataConfig: LoadDataConfig;
  readonly newRedshiftServerlessProps?: NewRedshiftServerlessProps;
  readonly existingRedshiftServerlessProps?: ExistingRedshiftServerlessProps;
  readonly provisionedRedshiftProps?: ProvisionedRedshiftProps;
  readonly workflowBucketInfo: WorkflowBucketInfo;
  readonly scanMetadataWorkflowData: ScanMetadataWorkflowData;
  readonly clearExpiredEventsWorkflowData: ClearExpiredEventsWorkflowData;
  readonly emrServerlessApplicationId: string;
  readonly dataProcessingCronOrRateExpression: string;
  readonly dataSourceBucket: IBucket;
  readonly dataSourcePrefix: string;
}

export class RedshiftAnalyticsStack extends NestedStack {

  readonly redshiftServerlessWorkgroup: RedshiftServerless | undefined;
  readonly applicationSchema: ApplicationSchemasAndReporting;
  readonly redshiftDataAPIExecRole: IRole;
  readonly sqlExecutionWorkflow: IStateMachine;
  readonly scanMetadataWorkflowArn: string;

  constructor(
    scope: Construct,
    id: string,
    props: RedshiftAnalyticsStackProps,
  ) {
    super(scope, id, props);

    if ((props.existingRedshiftServerlessProps && props.provisionedRedshiftProps)
      || (props.existingRedshiftServerlessProps && props.newRedshiftServerlessProps)
      || (props.newRedshiftServerlessProps && props.provisionedRedshiftProps)
      || (!props.existingRedshiftServerlessProps && !props.provisionedRedshiftProps && !props.newRedshiftServerlessProps)) {
      throw new Error('Must specify ONLY one of new Redshift Serverless, existing Redshift Serverless or Provisioned Redshift.');
    }

    const featureName = `Analytics-${id}`;

    this.templateOptions.description = `(${SolutionInfo.SOLUTION_ID}-dmr) ${SolutionInfo.SOLUTION_NAME} - ${featureName} ${SolutionInfo.SOLUTION_VERSION_DETAIL}`;

    const securityGroupForLambda = createSGForEgressToAwsService(this, 'LambdaEgressToAWSServiceSG', props.vpc);

    let existingRedshiftServerlessProps: ExistingRedshiftServerlessProps | undefined = props.existingRedshiftServerlessProps;

    const projectDatabaseName = props.projectId;
    let redshiftUserCR: CustomResource | undefined;
    if (props.newRedshiftServerlessProps) {
      const redshiftVpc = getExistVpc(scope, 'vpc-for-redshift-serverless-workgroup', {
        vpcId: props.newRedshiftServerlessProps.vpcId,
        availabilityZones: Fn.getAzs(),
        privateSubnetIds: Fn.split(',', props.newRedshiftServerlessProps.subnetIds),
      });
      this.redshiftServerlessWorkgroup = new RedshiftServerless(this, 'RedshiftServerelssWorkgroup', {
        vpc: redshiftVpc,
        subnetSelection: {
          subnets: redshiftVpc.privateSubnets,
        },
        securityGroupIds: props.newRedshiftServerlessProps.securityGroupIds,
        baseCapacity: props.newRedshiftServerlessProps.baseCapacity,
        databaseName: props.newRedshiftServerlessProps.databaseName,
        workgroupName: props.newRedshiftServerlessProps.workgroupName,
        projectId: props.projectId,
      });
      this.redshiftDataAPIExecRole = this.redshiftServerlessWorkgroup.redshiftDataAPIExecRole;
      existingRedshiftServerlessProps = {
        createdInStack: true,
        workgroupId: this.redshiftServerlessWorkgroup.workgroup.attrWorkgroupWorkgroupId,
        workgroupName: this.redshiftServerlessWorkgroup.workgroup.attrWorkgroupWorkgroupName,
        namespaceId: this.redshiftServerlessWorkgroup.namespaceId,
        dataAPIRoleArn: this.redshiftDataAPIExecRole.roleArn,
        databaseName: this.redshiftServerlessWorkgroup.databaseName,
      };
      redshiftUserCR = this.redshiftServerlessWorkgroup.redshiftUserCR;

    } else if (props.existingRedshiftServerlessProps) {
      this.redshiftDataAPIExecRole = Role.fromRoleArn(this, 'RedshiftDataExecRole',
        props.existingRedshiftServerlessProps.dataAPIRoleArn, {
          mutable: true,
        });

    } else {
      this.redshiftDataAPIExecRole = new Role(this, 'RedshiftDataExecRole', {
        assumedBy: new AccountPrincipal(Aws.ACCOUNT_ID),
      });
      const policyStatements = [
        new PolicyStatement({
          actions: [
            'redshift-data:ExecuteStatement',
            'redshift-data:BatchExecuteStatement',
          ],
          resources: [
            Arn.format({
              service: 'redshift',
              resource: 'cluster',
              resourceName: props.provisionedRedshiftProps!.clusterIdentifier,
              arnFormat: ArnFormat.COLON_RESOURCE_NAME,
            }, Stack.of(this)),
          ],
        }),
        new PolicyStatement({
          actions: [
            'redshift:GetClusterCredentials',
          ],
          resources: [
            Arn.format(
              {
                resource: 'dbuser',
                resourceName: `${props.provisionedRedshiftProps!.clusterIdentifier}/${props.provisionedRedshiftProps!.dbUser}`,
                service: 'redshift',
                arnFormat: ArnFormat.COLON_RESOURCE_NAME,
              },
              Stack.of(this),
            ),
            Arn.format(
              {
                resource: 'dbname',
                resourceName: `${props.provisionedRedshiftProps!.clusterIdentifier}/${props.provisionedRedshiftProps!.databaseName}`,
                service: 'redshift',
                arnFormat: ArnFormat.COLON_RESOURCE_NAME,
              },
              Stack.of(this),
            ),
            Arn.format(
              {
                resource: 'dbname',
                resourceName: `${props.provisionedRedshiftProps!.clusterIdentifier}/${projectDatabaseName}`,
                service: 'redshift',
                arnFormat: ArnFormat.COLON_RESOURCE_NAME,
              },
              Stack.of(this),
            ),
          ],
          conditions: {
            StringEquals: {
              'redshift:DbUser': props.provisionedRedshiftProps!.dbUser,
              'redshift:DbName': [
                'dev',
                projectDatabaseName,
              ],
            },
          },
        }),
      ];
      policyStatements.forEach((ps) => (this.redshiftDataAPIExecRole as Role).addToPolicy(ps));
      (this.redshiftDataAPIExecRole as Role).addToPolicy(new PolicyStatement({
        actions: ['redshift-data:DescribeStatement', 'redshift-data:GetStatementResult'],
        resources: ['*'],
      }));

    }

    const redshiftTables: RedshiftOdsTables = {
      event: REDSHIFT_EVENT_TABLE_NAME,
      event_parameter: REDSHIFT_EVENT_PARAMETER_TABLE_NAME,
      user: REDSHIFT_USER_TABLE_NAME,
      item: REDSHIFT_ITEM_TABLE_NAME,
    };

    const functionEntry = join(
      __dirname + '/lambdas/custom-resource',
      'create-schemas.ts',
    );
    const codePath = __dirname + '/private/sqls/redshift';
    this.applicationSchema = new ApplicationSchemasAndReporting(this, 'CreateApplicationSchemas', {
      projectId: props.projectId,
      appIds: props.appIds,
      serverlessRedshift: existingRedshiftServerlessProps,
      provisionedRedshift: props.provisionedRedshiftProps,
      odsTableNames: redshiftTables,
      databaseName: projectDatabaseName,
      dataAPIRole: this.redshiftDataAPIExecRole,
      codePath,
      functionEntry,
      workflowBucketInfo: props.workflowBucketInfo,
    });

    this.sqlExecutionWorkflow =this.applicationSchema.sqlExecutionStepFunctions;

    // for upgrading backward compatibility
    (this.applicationSchema.crProvider.node.findChild('framework-onEvent').node.defaultChild as CfnResource)
      .overrideLogicalId('CreateApplicationSchemasRedshiftSchemasCustomResourceProviderframeworkonEventA11E8EDC');
    (this.applicationSchema.crForSQLExecution.node.defaultChild as CfnResource)
      .overrideLogicalId('CreateApplicationSchemasRedshiftSchemasCustomResource7AA8CC71');
    if (redshiftUserCR) {
      this.applicationSchema.crForSQLExecution.node.addDependency(redshiftUserCR);
    }

    // custom resource to associate the IAM role to redshift cluster
    const redshiftRoleForCopyFromS3 = new Role(this, 'CopyDataFromS3Role', {
      assumedBy: new ServicePrincipal('redshift.amazonaws.com'),
    });
    const crForModifyClusterIAMRoles = new RedshiftAssociateIAMRole(this, 'RedshiftAssociateS3CopyRole',
      {
        serverlessRedshift: existingRedshiftServerlessProps,
        provisionedRedshift: props.provisionedRedshiftProps,
        role: redshiftRoleForCopyFromS3,
      }).cr;
    crForModifyClusterIAMRoles.node.addDependency(this.applicationSchema.crForSQLExecution);

    const ddbStatusTable = createDDBStatusTable(this, 'FileStatus');

    const scanMetadataWorkflow = new ScanMetadataWorkflow(this, SCAN_METADATA_WORKFLOW_PREFIX, {
      appIds: props.appIds,
      projectId: props.projectId,
      networkConfig: {
        vpc: props.vpc,
        vpcSubnets: props.subnetSelection,
      },
      securityGroupForLambda,
      serverlessRedshift: existingRedshiftServerlessProps,
      provisionedRedshift: props.provisionedRedshiftProps,
      databaseName: projectDatabaseName,
      dataAPIRole: this.redshiftDataAPIExecRole,
      scanMetadataWorkflowData: props.scanMetadataWorkflowData,
    });

    this.scanMetadataWorkflowArn = scanMetadataWorkflow.scanMetadataWorkflow.stateMachineArn;

    const clearExpiredEventsWorkflow = new ClearExpiredEventsWorkflow(this, 'ClearExpiredEventsWorkflow', {
      appId: props.appIds,
      networkConfig: {
        vpc: props.vpc,
        vpcSubnets: props.subnetSelection,
      },
      securityGroupForLambda,
      serverlessRedshift: existingRedshiftServerlessProps,
      provisionedRedshift: props.provisionedRedshiftProps,
      databaseName: projectDatabaseName,
      dataAPIRole: this.redshiftDataAPIExecRole,
      clearExpiredEventsWorkflowData: props.clearExpiredEventsWorkflowData,
    });


    const loadDataProps = {
      projectId: props.projectId,
      appIds: props.appIds,
      networkConfig: {
        vpc: props.vpc,
        vpcSubnets: props.subnetSelection,
      },
      securityGroupForLambda,
      databaseName: projectDatabaseName,
      mvRefreshInterval: props.mvRefreshInterval,
      dataAPIRole: this.redshiftDataAPIExecRole,
      emrServerlessApplicationId: props.emrServerlessApplicationId,
      serverlessRedshift: existingRedshiftServerlessProps,
      provisionedRedshift: props.provisionedRedshiftProps,
      redshiftRoleForCopyFromS3,
      ddbStatusTable,
      tablesOdsSource: props.tablesOdsSource,
      workflowBucketInfo: props.workflowBucketInfo,
      loadDataConfig: props.loadDataConfig,
      odsSourceS3Bucket: props.dataSourceBucket,
      odsSourceS3Prefix: props.dataSourcePrefix,
      nextStateStateMachines: [
        {
          name: 'Scan Metadata Async',
          stateMachine: scanMetadataWorkflow.scanMetadataWorkflow,
          input: TaskInput.fromObject({ eventSource: EVENT_SOURCE_LOAD_DATA_FLOW }),
        },
      ],
    };

    const loadRedshiftTablesWorkflow = new LoadOdsDataToRedshiftWorkflow(this, 'LoadData', loadDataProps);
    (loadRedshiftTablesWorkflow.loadDataWorkflow.node.defaultChild as CfnResource).overrideLogicalId('ClickstreamLoadDataWorkflow');

    if (this.redshiftServerlessWorkgroup) {
      createMetricsWidgetForRedshiftServerless(this, 'newServerless', {
        projectId: props.projectId,
        dataProcessingCronOrRateExpression: props.dataProcessingCronOrRateExpression,
        redshiftServerlessNamespace: this.redshiftServerlessWorkgroup.workgroup.namespaceName,
        redshiftServerlessWorkgroupName: this.redshiftServerlessWorkgroup.workgroup.workgroupName,
        loadDataWorkflow: loadRedshiftTablesWorkflow.loadDataWorkflow,
        scanMetadataWorkflow: scanMetadataWorkflow.scanMetadataWorkflow,
        scanWorkflowMinInterval: props.scanMetadataWorkflowData.scanWorkflowMinInterval,
        clearExpiredEventsWorkflow: clearExpiredEventsWorkflow.clearExpiredEventsWorkflow,
        sqlExecutionWorkflow: this.sqlExecutionWorkflow,

      });
    }

    if (props.existingRedshiftServerlessProps) {
      createMetricsWidgetForRedshiftServerless(this, 'existingServerless', {
        projectId: props.projectId,
        dataProcessingCronOrRateExpression: props.dataProcessingCronOrRateExpression,
        redshiftServerlessNamespace: props.existingRedshiftServerlessProps.namespaceId,
        redshiftServerlessWorkgroupName: props.existingRedshiftServerlessProps.workgroupName,
        loadDataWorkflow: loadRedshiftTablesWorkflow.loadDataWorkflow,
        scanMetadataWorkflow: scanMetadataWorkflow.scanMetadataWorkflow,
        scanWorkflowMinInterval: props.scanMetadataWorkflowData.scanWorkflowMinInterval,
        clearExpiredEventsWorkflow: clearExpiredEventsWorkflow.clearExpiredEventsWorkflow,
        sqlExecutionWorkflow: this.sqlExecutionWorkflow,
      });
    }

    if (props.provisionedRedshiftProps) {
      createMetricsWidgetForRedshiftCluster(this, {
        projectId: props.projectId,
        dataProcessingCronOrRateExpression: props.dataProcessingCronOrRateExpression,
        redshiftClusterIdentifier: props.provisionedRedshiftProps.clusterIdentifier,
        loadDataWorkflow: loadRedshiftTablesWorkflow.loadDataWorkflow,
        scanMetadataWorkflow: scanMetadataWorkflow.scanMetadataWorkflow,
        scanWorkflowMinInterval: props.scanMetadataWorkflowData.scanWorkflowMinInterval,
        clearExpiredEventsWorkflow: clearExpiredEventsWorkflow.clearExpiredEventsWorkflow,
        sqlExecutionWorkflow: this.sqlExecutionWorkflow,
      });
    }

    addCfnNag(this);
  }
}

function createDDBStatusTable(scope: Construct, tableId: string): ITable {
  const itemsTable = new Table(scope, tableId, {
    partitionKey: {
      name: 's3_uri', //s3://s3Bucket/s3Object
      type: AttributeType.STRING,
    },
    billingMode: BillingMode.PAY_PER_REQUEST,
    pointInTimeRecovery: true,
    encryption: TableEncryption.AWS_MANAGED,
    // The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
    // the new table, and it will remain in your account until manually deleted. By setting the policy to
    // DESTROY, cdk destroy will delete the table (even if it has data in it)
    removalPolicy: RemovalPolicy.DESTROY,
  });

  // Add a global secondary index with a different partition key and sort key
  //GSI_PK=status, GSI_SK=timestamp
  itemsTable.addGlobalSecondaryIndex({
    indexName: DYNAMODB_TABLE_INDEX_NAME,
    partitionKey: { name: 'job_status', type: AttributeType.STRING },
    sortKey: { name: 'timestamp', type: AttributeType.NUMBER },
  });

  return itemsTable;
};


function addCfnNag(stack: Stack) {
  addCfnNagForLogRetention(stack);
  addCfnNagForCustomResourceProvider(stack, 'CDK built-in provider for RedshiftSchemasCustomResource', 'RedshiftDbSchemasCustomResourceProvider');
  addCfnNagForCustomResourceProvider(stack, 'CDK built-in custom resource provider for RedshiftSQLExecutionCustomResourceProvider', 'RedshiftSQLExecutionCustomResourceProvider');
  addCfnNagForCustomResourceProvider(stack, 'CDK built-in provider for RedshiftAssociateIAMRoleCustomResource', 'RedshiftAssociateIAMRoleCustomResourceProvider');
  addCfnNagForCustomResourceProvider(stack, 'Metrics', 'MetricsCustomResourceProvider', '');

  addCfnNagToStack(stack, [
    ruleRolePolicyWithWildcardResources(
      'ClearExpiredEventsWorkflow/ClearExpiredEventsStateMachine/Role/DefaultPolicy/Resource',
      'ClearExpiredEventsWorkflow', 'logs/xray'),
    ruleRolePolicyWithWildcardResources(
      'CreateApplicationSchemas/SQLExecutionStateMachine/Role/DefaultPolicy/Resource',
      'SQLExecutionStateMachine', 'redshift-data'),
    ruleRolePolicyWithWildcardResources(
      'RedshiftDataExecRole/DefaultPolicy/Resource',
      'RedshiftDataExecRole', 'redshift-data'),
    ruleForLambdaVPCAndReservedConcurrentExecutions(
      'CreateApplicationSchemas/RedshiftSQLExecutionFn/Resource', 'CreateApplicationSchemas'),
    ruleForLambdaVPCAndReservedConcurrentExecutions(
      'AssociateIAMRoleToRedshiftFn/Resource', 'AssociateIAMRoleToRedshift'),
    {
      paths_endswith: ['AssociateIAMRoleFnRole/DefaultPolicy/Resource'],
      rules_to_suppress: [
        {
          id: 'F39',
          reason:
            'When updating the IAM roles of namespace of Redshift Serverless, we have to PassRole to existing undeterministical roles associated on namespace.',
        },
        ruleToSuppressRolePolicyWithWildcardResources('Associate Role to Redshift', 'passRole'),
      ],
    },

    {
      paths_endswith: ['LoadDataStateMachine/Role/DefaultPolicy/Resource'],
      rules_to_suppress: [
        ...ruleRolePolicyWithWildcardResources(
          'LoadDataStateMachine/Role/DefaultPolicy/Resource',
          'loadDataFlow', 'logs/xray').rules_to_suppress,
        ruleToSuppressRolePolicyWithHighSPCM('LoadData'),
      ],
    },

    {
      paths_endswith: ['ScanMetadataStateMachine/Role/DefaultPolicy/Resource'],
      rules_to_suppress: [
        ...ruleRolePolicyWithWildcardResources(
          'ScanMetadataStateMachine/Role/DefaultPolicy/Resource',
          'ScanMetadataWorkflow', 'logs/xray').rules_to_suppress,
        ruleToSuppressRolePolicyWithHighSPCM('ScanMetadata'),
      ],
    },

    {
      paths_endswith: ['CopyDataFromS3Role/DefaultPolicy/Resource'],
      rules_to_suppress: [
        ruleToSuppressRolePolicyWithHighSPCM('CopyDataFromS3'),
      ],
    },

  ]);

}