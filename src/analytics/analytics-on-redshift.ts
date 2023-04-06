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
  Arn, ArnFormat, Aws, Token, CfnResource, CfnCondition,
} from 'aws-cdk-lib';
import {
  SubnetSelection,
  IVpc,
} from 'aws-cdk-lib/aws-ec2';
import { PolicyStatement, Role, AccountPrincipal, Policy, IRole } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { ApplicationSchemas } from './private/app-schema';
import { getOrCreateNoWorkgroupIdCondition, getOrCreateWithWorkgroupIdCondition } from './private/condition';
import {
  REDSHIFT_ODS_TABLE_NAME,
} from './private/constant';
import { LoadODSEventToRedshiftWorkflow } from './private/load-ods-events-workflow';
import { ODSSource, LoadDataProps, ServerlessRedshiftProps, ProvisionedRedshiftProps, LoadWorkflowData } from './private/model';
import { addCfnNagForCustomResourceProvider, addCfnNagForLogRetention, addCfnNagToStack, ruleRolePolicyWithWildcardResources, ruleForLambdaVPCAndReservedConcurrentExecutions } from '../common/cfn-nag';
import { SolutionInfo } from '../common/solution-info';

interface RedshiftAnalyticsStackProps extends NestedStackProps {
  readonly vpc: IVpc;
  readonly subnetSelection: SubnetSelection;
  readonly projectId: string;
  readonly appIds: string;
  readonly odsSource: ODSSource;
  readonly loadWorkflowData: LoadWorkflowData;
  readonly serverlessRedshiftProps?: ServerlessRedshiftProps;
  readonly provisionedRedshiftProps?: ProvisionedRedshiftProps;
  readonly loadDataProps: LoadDataProps;
}

export class RedshiftAnalyticsStack extends NestedStack {
  constructor(
    scope: Construct,
    id: string,
    props: RedshiftAnalyticsStackProps,
  ) {
    super(scope, id, props);

    if ((props.serverlessRedshiftProps && props.provisionedRedshiftProps)
      || (!props.serverlessRedshiftProps && !props.provisionedRedshiftProps)) {
      throw new Error('Must specify either Serverless Redshift or Provioned Redshift');
    }

    const featureName = `Analytics-${id}`;

    this.templateOptions.description = `(${SolutionInfo.SOLUTION_ID}) ${SolutionInfo.SOLUTION_NAME} - ${featureName} (Version ${SolutionInfo.SOLUTION_VERSION})`;

    const redshiftDataAPIExecRole = new Role(this, 'RedshiftDataExecRole', {
      assumedBy: new AccountPrincipal(Aws.ACCOUNT_ID),
    });
    if (props.serverlessRedshiftProps) {
      if (props.serverlessRedshiftProps.workgroupId && Token.isUnresolved(props.serverlessRedshiftProps.workgroupId)) {
        const noWorkgroupIdCondition = getOrCreateNoWorkgroupIdCondition(this, props.serverlessRedshiftProps.workgroupId);
        this.createRedshiftServerlessPolicy('RedshiftServerlessPolicyForAllWorkgroup', '*',
          redshiftDataAPIExecRole, noWorkgroupIdCondition);

        const withWorkgroupIdCondition = getOrCreateWithWorkgroupIdCondition(this, props.serverlessRedshiftProps.workgroupId);
        this.createRedshiftServerlessPolicy('RedshiftServerlessPolicyForSingleWorkgroup', props.serverlessRedshiftProps.workgroupId,
          redshiftDataAPIExecRole, withWorkgroupIdCondition);
      } else {this.createRedshiftServerlessPolicy('RedshiftServerlessPolicyFor', props.serverlessRedshiftProps.workgroupId ?? '*', redshiftDataAPIExecRole);}
    } else {
      new Policy(this, 'RedshiftClusterPolicy', {
        roles: [redshiftDataAPIExecRole],
        statements: [
          new PolicyStatement({
            actions: ['redshift-data:ExecuteStatement'],
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
              'redshift:GetClusterCredentialsWithIAM',
              'redshift:GetClusterCredentials',
            ],
            resources: [
              Arn.format(
                {
                  resource: 'cluster',
                  resourceName: props.provisionedRedshiftProps!.clusterIdentifier,
                  service: 'redshift',
                  arnFormat: ArnFormat.COLON_RESOURCE_NAME,
                },
                Stack.of(this),
              ),
            ],
          }),
        ],
      });
    }

    redshiftDataAPIExecRole.addToPolicy(new PolicyStatement({
      actions: ['redshift-data:DescribeStatement'],
      resources: ['*'],
    }));

    const odsTableName = REDSHIFT_ODS_TABLE_NAME;
    const appSchemaConstruct = new ApplicationSchemas(this, 'CreateApplicationSchemas', {
      projectId: props.projectId,
      appIds: props.appIds,
      serverlessRedshift: props.serverlessRedshiftProps,
      provisionedRedshift: props.provisionedRedshiftProps,
      odsTableName,
      dataAPIRole: redshiftDataAPIExecRole,
    });

    new LoadODSEventToRedshiftWorkflow(this, 'LoadODSEventToRedshiftWorkflow', {
      projectId: props.projectId,
      networkConfig: {
        vpc: props.vpc,
        vpcSubnets: props.subnetSelection,
      },
      odsSource: props.odsSource,
      loadDataProps: props.loadDataProps,
      loadWorkflowData: props.loadWorkflowData,
      serverlessRedshift: props.serverlessRedshiftProps,
      provisionedRedshift: props.provisionedRedshiftProps,
      odsTableName,
      databaseName: appSchemaConstruct.databaseName,
      dataAPIRole: redshiftDataAPIExecRole,
    });

    addCfnNag(this);
  }

  private createRedshiftServerlessPolicy(id: string, workgroupId: string, role: IRole, condition?: CfnCondition) {
    const policy = new Policy(this, id, {
      roles: [role],
      statements: [
        new PolicyStatement({
          actions: [
            'redshift-data:ExecuteStatement',
            'redshift-serverless:GetCredentials',
          ],
          resources: [
            Arn.format({
              service: 'redshift-serverless',
              resource: 'workgroup',
              resourceName: workgroupId,
              arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
            }, Stack.of(this)),
          ],
        }),
      ],
    });
    if (condition) {(policy.node.findChild('Resource') as CfnResource).cfnOptions.condition = condition;}
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
