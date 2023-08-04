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
} from 'aws-cdk-lib/aws-ec2';
import { PolicyStatement, Role, AccountPrincipal, IRole } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { ApplicationSchemas } from './private/app-schema';
import { ClearExpiredEventsWorkflow } from './private/clear-expired-events-workflow';
import {
  REDSHIFT_ODS_TABLE_NAME,
} from './private/constant';
import { LoadODSEventToRedshiftWorkflow } from './private/load-ods-events-workflow';
import { createMetricsWidgetForRedshiftCluster } from './private/metircs-redshift-cluster';
import { createMetricsWidgetForRedshiftServerless } from './private/metircs-redshift-serverless';
import { ODSSource, LoadDataProps, ExistingRedshiftServerlessProps, ProvisionedRedshiftProps, LoadWorkflowData, NewRedshiftServerlessProps, UpsertUsersWorkflowData, ClearExpiredEventsWorkflowData } from './private/model';
import { RedshiftServerless } from './private/redshift-serverless';
import { UpsertUsersWorkflow } from './private/upsert-users-workflow';
import { addCfnNagForCustomResourceProvider, addCfnNagForLogRetention, addCfnNagToStack, ruleRolePolicyWithWildcardResources, ruleForLambdaVPCAndReservedConcurrentExecutions } from '../common/cfn-nag';
import { SolutionInfo } from '../common/solution-info';
import { getExistVpc } from '../common/vpc-utils';

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
  readonly clearExpiredEventsWorkflowData: ClearExpiredEventsWorkflowData;
  readonly emrServerlessApplicationId: string;
  readonly dataProcessingCronOrRateExpression: string;
}

export class RedshiftAnalyticsStack extends NestedStack {

  readonly redshiftServerlessWorkgroup: RedshiftServerless | undefined;
  readonly applicationSchema: ApplicationSchemas;
  readonly redshiftDataAPIExecRole: IRole;

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

    if (!props.newRedshiftServerlessProps && !props.existingRedshiftServerlessProps && !props.provisionedRedshiftProps ) {
      throw new Error('Wrong Redshift cluster type.');
    }

    const featureName = `Analytics-${id}`;

    this.templateOptions.description = `(${SolutionInfo.SOLUTION_ID}-dmr) ${SolutionInfo.SOLUTION_NAME} - ${featureName} ${SolutionInfo.SOLUTION_VERSION_DETAIL}`;

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

    const odsTableName = REDSHIFT_ODS_TABLE_NAME;
    this.applicationSchema = new ApplicationSchemas(this, 'CreateApplicationSchemas', {
      projectId: props.projectId,
      appIds: props.appIds,
      serverlessRedshift: existingRedshiftServerlessProps,
      provisionedRedshift: props.provisionedRedshiftProps,
      odsTableName,
      databaseName: projectDatabaseName,
      dataAPIRole: this.redshiftDataAPIExecRole,
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
      dataAPIRole: this.redshiftDataAPIExecRole,
      emrServerlessApplicationId: props.emrServerlessApplicationId,
    });

    loadEventsWorkflow.crForModifyClusterIAMRoles.node.addDependency(this.applicationSchema.crForCreateSchemas);

    const upsertUsersWorkflow = new UpsertUsersWorkflow(this, 'UpsertUsersWorkflow', {
      appId: props.appIds,
      networkConfig: {
        vpc: props.vpc,
        vpcSubnets: props.subnetSelection,
      },
      serverlessRedshift: existingRedshiftServerlessProps,
      provisionedRedshift: props.provisionedRedshiftProps,
      databaseName: projectDatabaseName,
      dataAPIRole: this.redshiftDataAPIExecRole,
      upsertUsersWorkflowData: props.upsertUsersWorkflowData,
    });

    const clearExpiredEventsWorkflow = new ClearExpiredEventsWorkflow(this, 'ClearExpiredEventsWorkflow', {
      appId: props.appIds,
      networkConfig: {
        vpc: props.vpc,
        vpcSubnets: props.subnetSelection,
      },
      serverlessRedshift: existingRedshiftServerlessProps,
      provisionedRedshift: props.provisionedRedshiftProps,
      databaseName: projectDatabaseName,
      dataAPIRole: this.redshiftDataAPIExecRole,
      clearExpiredEventsWorkflowData: props.clearExpiredEventsWorkflowData,
    });

    if (this.redshiftServerlessWorkgroup) {
      createMetricsWidgetForRedshiftServerless(this, 'newServerless', {
        projectId: props.projectId,
        dataProcessingCronOrRateExpression: props.dataProcessingCronOrRateExpression,
        upsertUsersCronOrRateExpression: props.upsertUsersWorkflowData.scheduleExpression,
        redshiftServerlessNamespace: this.redshiftServerlessWorkgroup.workgroup.namespaceName,
        redshiftServerlessWorkgroupName: this.redshiftServerlessWorkgroup.workgroup.workgroupName,
        loadEventsWorkflow: loadEventsWorkflow.loadEventWorkflow,
        upsertUsersWorkflow: upsertUsersWorkflow.upsertUsersWorkflow,
        clearExpiredEventsWorkflow: clearExpiredEventsWorkflow.clearExpiredEventsWorkflow,

      });
    }

    if (props.existingRedshiftServerlessProps) {
      createMetricsWidgetForRedshiftServerless(this, 'existingServerless', {
        projectId: props.projectId,
        dataProcessingCronOrRateExpression: props.dataProcessingCronOrRateExpression,
        upsertUsersCronOrRateExpression: props.upsertUsersWorkflowData.scheduleExpression,
        redshiftServerlessNamespace: props.existingRedshiftServerlessProps.namespaceId,
        redshiftServerlessWorkgroupName: props.existingRedshiftServerlessProps.workgroupName,
        loadEventsWorkflow: loadEventsWorkflow.loadEventWorkflow,
        upsertUsersWorkflow: upsertUsersWorkflow.upsertUsersWorkflow,
        clearExpiredEventsWorkflow: clearExpiredEventsWorkflow.clearExpiredEventsWorkflow,
      });
    }

    if (props.provisionedRedshiftProps) {
      createMetricsWidgetForRedshiftCluster(this, {
        projectId: props.projectId,
        dataProcessingCronOrRateExpression: props.dataProcessingCronOrRateExpression,
        upsertUsersCronOrRateExpression: props.upsertUsersWorkflowData.scheduleExpression,
        redshiftClusterIdentifier: props.provisionedRedshiftProps.clusterIdentifier,
        loadEventsWorkflow: loadEventsWorkflow.loadEventWorkflow,
        upsertUsersWorkflow: upsertUsersWorkflow.upsertUsersWorkflow,
        clearExpiredEventsWorkflow: clearExpiredEventsWorkflow.clearExpiredEventsWorkflow,

      });
    }

    addCfnNag(this);
  }
}

function addCfnNag(stack: Stack) {
  addCfnNagForLogRetention(stack);
  addCfnNagForCustomResourceProvider(stack, 'CDK built-in provider for RedshiftSchemasCustomResource', 'RedshiftDbSchemasCustomResourceProvider');
  addCfnNagForCustomResourceProvider(stack, 'CDK built-in custom resource provider for RedshiftSchemasCustomResourceProvider', 'RedshiftSchemasCustomResourceProvider');
  addCfnNagForCustomResourceProvider(stack, 'CDK built-in provider for RedshiftAssociateIAMRoleCustomResource', 'RedshiftAssociateIAMRoleCustomResourceProvider');
  addCfnNagForCustomResourceProvider(stack, 'Metrics', 'MetricsCustomResourceProvider', '');

  addCfnNagToStack(stack, [

    ruleRolePolicyWithWildcardResources(
      'UpsertUsersWorkflow/UpsertUsersStateMachine/Role/DefaultPolicy/Resource',
      'UpsertUsersWorkflow', 'logs/xray'),
    ruleRolePolicyWithWildcardResources(
      'ClearExpiredEventsWorkflow/ClearExpiredEventsStateMachine/Role/DefaultPolicy/Resource',
      'ClearExpiredEventsWorkflow', 'logs/xray'),
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

    {
      paths_endswith: ['LoadODSEventToRedshiftWorkflow/LoadManifestStateMachine/Role/DefaultPolicy/Resource'],
      rules_to_suppress: [
        ...ruleRolePolicyWithWildcardResources(
          'LoadODSEventToRedshiftWorkflow/LoadManifestStateMachine/Role/DefaultPolicy/Resource',
          'LoadODSEventToRedshiftWorkflow', 'logs/xray').rules_to_suppress,
        {
          id: 'W76',
          reason: 'ACK: SPCM for IAM policy document is higher than 25',
        },
      ],
    },

  ]);

}
