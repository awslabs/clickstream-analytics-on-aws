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
  Stack,
  NestedStack,
  NestedStackProps,
  Arn, ArnFormat, Aws, Fn, CustomResource,
} from 'aws-cdk-lib';
import {
  SubnetSelection,
  IVpc,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import { PolicyStatement, Role, AccountPrincipal, Policy, IRole } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { ApplicationSchemas } from './private/app-schema';
import {
  REDSHIFT_ODS_TABLE_NAME,
} from './private/constant';
import { LoadODSEventToRedshiftWorkflow } from './private/load-ods-events-workflow';
import { ODSSource, LoadDataProps, ExistingRedshiftServerlessProps, ProvisionedRedshiftProps, LoadWorkflowData, NewRedshiftServerlessProps, UpsertUsersWorkflowData } from './private/model';
import { RedshiftServerless } from './private/redshift-serverless';
import { UpsertUsersWorkflow } from './private/upsert-users-workflow';
import { addCfnNagForCustomResourceProvider, addCfnNagForLogRetention, addCfnNagToStack, ruleRolePolicyWithWildcardResources, ruleForLambdaVPCAndReservedConcurrentExecutions } from '../common/cfn-nag';
import { SolutionInfo } from '../common/solution-info';

export interface RedshiftAnalyticsStackProps extends NestedStackProps {
  readonly vpc: IVpc;
  readonly subnetSelection: SubnetSelection;
  readonly projectId: string;
  readonly appIds: string;
  readonly odsSource: ODSSource;
  readonly loadWorkflowData: LoadWorkflowData;
  readonly newRedshiftServerlessProps?: NewRedshiftServerlessProps;
  readonly existingRedshiftServerlessProps?: ExistingRedshiftServerlessProps;
  readonly provisionedRedshiftProps?: ProvisionedRedshiftProps;
  readonly loadDataProps: LoadDataProps;
  readonly upsertUsersWorkflowData: UpsertUsersWorkflowData;
}

export class RedshiftAnalyticsStack extends NestedStack {

  readonly redshiftServerlessWorkgroup: RedshiftServerless | undefined;
  readonly applicationSchema: ApplicationSchemas;

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
      throw new Error('Must specify ONLY one of new Redshift Serverless, existing Redshift Serverless or Provioned Redshift.');
    }

    const featureName = `Analytics-${id}`;

    this.templateOptions.description = `(${SolutionInfo.SOLUTION_ID}) ${SolutionInfo.SOLUTION_NAME} - ${featureName} (Version ${SolutionInfo.SOLUTION_VERSION})`;

    var redshiftDataAPIExecRole: IRole;
    var existingRedshiftServerlessProps: ExistingRedshiftServerlessProps | undefined = props.existingRedshiftServerlessProps;

    const projectDatabaseName = props.projectId;
    var redshiftUserCR: CustomResource | undefined;
    if (props.newRedshiftServerlessProps) {
      const redshiftVpc = Vpc.fromVpcAttributes(scope, 'vpc-for-redshift-serverless-workgroup', {
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
      });
      redshiftDataAPIExecRole = this.redshiftServerlessWorkgroup.redshiftDataAPIExecRole;
      existingRedshiftServerlessProps = {
        createdInStack: true,
        workgroupId: this.redshiftServerlessWorkgroup.workgroup.attrWorkgroupWorkgroupId,
        workgroupName: this.redshiftServerlessWorkgroup.workgroup.attrWorkgroupWorkgroupName,
        namespaceId: this.redshiftServerlessWorkgroup.namespaceId,
        dataAPIRoleArn: redshiftDataAPIExecRole.roleArn,
        databaseName: this.redshiftServerlessWorkgroup.databaseName,
      };
      redshiftUserCR = this.redshiftServerlessWorkgroup.redshiftUserCR;
    } else if (props.existingRedshiftServerlessProps) {
      redshiftDataAPIExecRole = Role.fromRoleArn(this, 'RedshiftDataExecRole',
        props.existingRedshiftServerlessProps.dataAPIRoleArn, {
          mutable: true,
        });
    } else if (props.provisionedRedshiftProps) {
      redshiftDataAPIExecRole = new Role(this, 'RedshiftDataExecRole', {
        assumedBy: new AccountPrincipal(Aws.ACCOUNT_ID),
      });
      new Policy(this, 'RedshiftClusterPolicy', {
        roles: [redshiftDataAPIExecRole],
        statements: [
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
        ],
      });

      (redshiftDataAPIExecRole as Role).addToPolicy(new PolicyStatement({
        actions: ['redshift-data:DescribeStatement', 'redshift-data:GetStatementResult'],
        resources: ['*'],
      }));
    }

    const odsTableName = REDSHIFT_ODS_TABLE_NAME;
    this.applicationSchema = new ApplicationSchemas(this, 'CreateApplicationSchemas', {
      projectId: props.projectId,
      appIds: props.appIds,
      serverlessRedshift: existingRedshiftServerlessProps,
      provisionedRedshift: props.provisionedRedshiftProps,
      odsTableName,
      databaseName: projectDatabaseName,
      dataAPIRole: redshiftDataAPIExecRole!,
    });
    if (redshiftUserCR) {
      this.applicationSchema.crForCreateSchemas.node.addDependency(redshiftUserCR);
    }

    const loadEventsWorkflow = new LoadODSEventToRedshiftWorkflow(this, 'LoadODSEventToRedshiftWorkflow', {
      projectId: props.projectId,
      networkConfig: {
        vpc: props.vpc,
        vpcSubnets: props.subnetSelection,
      },
      odsSource: props.odsSource,
      loadDataProps: props.loadDataProps,
      loadWorkflowData: props.loadWorkflowData,
      serverlessRedshift: existingRedshiftServerlessProps,
      provisionedRedshift: props.provisionedRedshiftProps,
      odsTableName,
      databaseName: projectDatabaseName,
      dataAPIRole: redshiftDataAPIExecRole!,
    });

    loadEventsWorkflow.crForModifyClusterIAMRoles.node.addDependency(this.applicationSchema.crForCreateSchemas);

    new UpsertUsersWorkflow(this, 'UpsertUsersWorkflow', {
      appId: props.appIds,
      networkConfig: {
        vpc: props.vpc,
        vpcSubnets: props.subnetSelection,
      },
      serverlessRedshift: existingRedshiftServerlessProps,
      provisionedRedshift: props.provisionedRedshiftProps,
      databaseName: projectDatabaseName,
      dataAPIRole: redshiftDataAPIExecRole!,
      upsertUsersWorkflowData: props.upsertUsersWorkflowData,
    });

    addCfnNag(this);
  }
}

function addCfnNag(stack: Stack) {
  addCfnNagForLogRetention(stack);
  addCfnNagForCustomResourceProvider(stack, 'CDK built-in provider for RedshiftSchemasCustomResource', 'RedshiftDbSchemasCustomResourceProvider');
  addCfnNagForCustomResourceProvider(stack, 'CDK built-in custom resource provider for RedshiftSchemasCustomResourceProvider', 'RedshiftSchemasCustomResourceProvider');
  addCfnNagForCustomResourceProvider(stack, 'CDK built-in provider for RedshiftAssociateIAMRoleCustomResource', 'RedshiftAssociateIAMRoleCustomResourceProvider');
  addCfnNagToStack(stack, [
    ruleRolePolicyWithWildcardResources(
      'LoadODSEventToRedshiftWorkflow/LoadManifestStateMachine/Role/DefaultPolicy/Resource',
      'LoadODSEventToRedshiftWorkflow', 'logs/xray'),
    ruleRolePolicyWithWildcardResources(
      'UpsertUsersWorkflow/UpsertUsersStateMachine/Role/DefaultPolicy/Resource',
      'UpsertUsersWorkflow', 'logs/xray'),
    ruleRolePolicyWithWildcardResources(
      'RedshiftDataExecRole/DefaultPolicy/Resource',
      'RedshiftDataExecRole', 'redshift-data'),
    ruleForLambdaVPCAndReservedConcurrentExecutions(
      'CreateApplicationSchemas/CreateSchemaForApplicationsFn/Resource', 'CreateApplicationSchemas'),
    ruleForLambdaVPCAndReservedConcurrentExecutions(
      'AssociateIAMRoleToRedshiftFn/Resource', 'AssociateIAMRoleToRedshift'),
    {
      paths_endswith: ['LoadODSEventToRedshiftWorkflow/AssociateIAMRoleFnRole/DefaultPolicy/Resource'],
      rules_to_suppress: [
        {
          id: 'F39',
          reason:
          'When updating the IAM roles of namespace of Redshift Serverless, we have to PassRole to existing undeterministical roles associated on namespace.',
        },
        {
          id: 'W12',
          reason: 'When updating the IAM roles of namespace of Redshift Serverless, we have to PassRole to existing undeterministical roles associated on namespace.',
        },
      ],
    },
  ]);
}
