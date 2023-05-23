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
import { Arn, ArnFormat, Aws, CustomResource, Duration, Fn, Stack } from 'aws-cdk-lib';
import { AccountPrincipal, IRole, PolicyDocument, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { CfnWorkgroup } from 'aws-cdk-lib/aws-redshiftserverless';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { CreateMappingRoleUser, NewNamespaceCustomProperties, RedshiftServerlessWorkgroupProps } from './model';
import { addCfnNagForCustomResourceProvider, addCfnNagToStack, ruleRolePolicyWithWildcardResources } from '../../common/cfn-nag';
import { createLambdaRole } from '../../common/lambda';
import { attachListTagsPolicyForFunction } from '../../common/lambda/tags';
import { BuiltInTagKeys } from '../../common/model';
import { POWERTOOLS_ENVS } from '../../common/powertools';
import { SolutionInfo } from '../../common/solution-info';

export class RedshiftServerless extends Construct {

  readonly namespaceName: string;
  readonly namespaceId: string;
  readonly databaseName: string;
  readonly workgroupDefaultAdminRole: IRole;
  readonly redshiftDataAPIExecRole: IRole;
  readonly redshiftUserCR: CustomResource;
  readonly workgroup: CfnWorkgroup;
  readonly workgroupPort = '5439';

  constructor(scope: Construct, id: string, props: RedshiftServerlessWorkgroupProps) {
    super(scope, id);

    this.workgroupDefaultAdminRole = new Role(this, 'RedshiftServerlessClickstreamWorkgroupAdminRole', {
      assumedBy: new AccountPrincipal(Aws.ACCOUNT_ID),
      inlinePolicies: {
        'redshift-serverless-create-namespace': new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: [
                'redshift-serverless:CreateNamespace',
                'redshift-serverless:DeleteNamespace',
                'redshift-serverless:GetNamespace',
              ],
              resources: ['*'],
            }),
            new PolicyStatement({
              actions: [
                'redshift-serverless:TagResource',
                'redshift-serverless:UntagResource',
              ],
              resources: [
                Arn.format({
                  service: 'redshift-serverless',
                  resource: 'namespace',
                  resourceName: '*',
                  arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
                }, Stack.of(this)),
              ],
            }),
          ],
        }),
        'redshift-service-role': new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: [
                'iam:CreateServiceLinkedRole',
              ],
              resources: [
                // arn:aws:iam::<AWS-account-ID>:role/aws-service-role/redshift.amazonaws.com/AWSServiceRoleForRedshift
                // https://docs.aws.amazon.com/redshift/latest/mgmt/using-service-linked-roles.html
                Arn.format(
                  {
                    resource: 'role',
                    region: '', // region be empty for IAM resources
                    resourceName: 'aws-service-role/redshift.amazonaws.com/AWSServiceRoleForRedshift',
                    service: 'iam',
                    arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
                  },
                  Stack.of(this)),
              ],
              conditions: {
                StringLike: { 'iam:AWSServiceName': 'redshift.amazonaws.com' },
              },
            }),
          ],
        }),
      },
      description: `Managed by ${Stack.of(this).templateOptions.description} to manage the lifecycle of Redshift namespace.`,
    });
    this.grantDataAPIExecutePolicy(this.workgroupDefaultAdminRole as Role);

    this.redshiftDataAPIExecRole = new Role(this, 'RedshiftServerlessDataAPIRole', {
      assumedBy: new AccountPrincipal(Aws.ACCOUNT_ID),
      description: `Managed by ${Stack.of(this).templateOptions.description} to load data into Redshift workgroup.`,
    });
    this.grantDataAPIExecutePolicy(this.redshiftDataAPIExecRole as Role);

    const namespaceCR = this.createRedshiftNamespaceCustomResource(props);
    this.namespaceName = namespaceCR.getAttString('NamespaceName');
    this.namespaceId = namespaceCR.getAttString('NamespaceId');
    this.databaseName = namespaceCR.getAttString('DatabaseName');

    this.workgroup = new CfnWorkgroup(this, 'ClickstreamWorkgroup', {
      workgroupName: props.workgroupName,
      baseCapacity: props.baseCapacity,
      enhancedVpcRouting: false,
      namespaceName: this.namespaceName,
      publiclyAccessible: false,
      port: Number(this.workgroupPort),
      securityGroupIds: Fn.split(',', props.securityGroupIds),
      subnetIds: props.vpc.selectSubnets(props.subnetSelection).subnetIds,
      tags: [
        {
          key: BuiltInTagKeys.AWS_SOLUTION,
          value: SolutionInfo.SOLUTION_SHORT_NAME,
        },
        {
          key: BuiltInTagKeys.AWS_SOLUTION_VERSION,
          value: SolutionInfo.SOLUTION_VERSION,
        },
        {
          key: BuiltInTagKeys.CLICKSTREAM_PROJECT,
          value: props.projectId,
        },
      ],
    });
    this.redshiftUserCR = this.createRedshiftMappingUserCustomResource();

    this.addCfnNagSuppression();
  }

  private addCfnNagSuppression() {
    const stack = Stack.of(this);
    addCfnNagForCustomResourceProvider(stack, 'CDK built-in provider for CreateRedshiftServerlessNamespaceCustomResourceProvider', 'CreateRedshiftServerlessNamespaceCustomResourceProvider');
    addCfnNagForCustomResourceProvider(stack, 'CDK built-in custom resource provider for CreateRedshiftServerlessMappingUserCustomResource', 'CreateRedshiftServerlessMappingUserCustomResourceProvider');
    addCfnNagForCustomResourceProvider(stack, 'Metrics', 'MetricsCustomResourceProvider', '');

    addCfnNagToStack(stack, [
      ruleRolePolicyWithWildcardResources(
        'DataAPIRole/DefaultPolicy/Resource',
        'Redshift serverless data API role', 'redshift-data'),
      ruleRolePolicyWithWildcardResources(
        'ClickstreamWorkgroupAdminRole/DefaultPolicy/Resource',
        'RedshiftServerlessNamespaceAdmin', 'redshift-data'),
      {
        paths_endswith: [
          'ClickstreamWorkgroupAdminRole/DefaultPolicy/Resource',
          'RedshiftServerlessClickstreamWorkgroupAdminRole/Resource',
        ],
        rules_to_suppress: [
          {
            id: 'W11',
            reason: 'Have to using wildcard resources for creating undetermined Redshift Serverless namespace.',
          },
        ],
      },
      {
        paths_endswith: [
          'ClickstreamWorkgroupAdminRole/DefaultPolicy/Resource',
        ],
        rules_to_suppress: [
          {
            id: 'W12',
            reason: 'Have to using wildcard resources for creating undetermined Redshift Serverless workgroup / data api to get query result',
          },
        ],
      },
      {
        paths_endswith: [
          'CreateUserFn/Resource',
          'CreateNamespaceFn/Resource',
        ],
        rules_to_suppress: [
          {
            id: 'W89',
            reason: 'Custom resource function without VPC is by design.',
          },
        ],
      },
    ]);
  }

  private createRedshiftMappingUserCustomResource(): CustomResource {
    const eventHandler = this.createCreateMappingUserFunction();
    this.workgroupDefaultAdminRole.grantAssumeRole(eventHandler.grantPrincipal);

    const provider = new Provider(
      this,
      'CreateRedshiftServerlessMappingUserCustomResourceProvider',
      {
        onEventHandler: eventHandler,
        logRetention: RetentionDays.ONE_WEEK,
      },
    );

    const customProps: CreateMappingRoleUser = {
      dataRoleName: this.redshiftDataAPIExecRole.roleName,
      serverlessRedshiftProps: {
        workgroupName: this.workgroup.attrWorkgroupWorkgroupName,
        workgroupId: this.workgroup.attrWorkgroupWorkgroupId,
        dataAPIRoleArn: this.workgroupDefaultAdminRole.roleArn,
        databaseName: this.databaseName,
      },
    };
    const cr = new CustomResource(this, 'CreateRedshiftServerlessMappingUserCustomResource', {
      serviceToken: provider.serviceToken,
      properties: customProps,
    });

    return cr;
  }
  createCreateMappingUserFunction() {
    const lambdaRootPath = __dirname + '/../lambdas/custom-resource';
    const fn = new NodejsFunction(this, 'CreateUserFn', {
      runtime: Runtime.NODEJS_18_X,
      entry: join(
        lambdaRootPath,
        'create-redshift-user.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      reservedConcurrentExecutions: 1,
      timeout: Duration.minutes(3),
      logRetention: RetentionDays.ONE_WEEK,
      role: createLambdaRole(this, 'CreateRedshiftUserRole', false, []),
      environment: {
        ... POWERTOOLS_ENVS,
      },
    });
    return fn;
  }

  private createRedshiftNamespaceCustomResource(props: RedshiftServerlessWorkgroupProps): CustomResource {
    const eventHandler = this.createCreateNamespaceFunction();
    const policy = attachListTagsPolicyForFunction(this, 'CreateNamespaceFunc', eventHandler);
    this.workgroupDefaultAdminRole.grantAssumeRole(eventHandler.grantPrincipal);

    const provider = new Provider(
      this,
      'CreateRedshiftServerlessNamespaceCustomResourceProvider',
      {
        onEventHandler: eventHandler,
        logRetention: RetentionDays.ONE_WEEK,
      },
    );

    const customProps: NewNamespaceCustomProperties = {
      adminRoleArn: this.workgroupDefaultAdminRole.roleArn,
      namespaceName: props.workgroupName,
      databaseName: props.databaseName,
    };
    const cr = new CustomResource(this, 'CreateRedshiftServerlessNamespaceCustomResource', {
      serviceToken: provider.serviceToken,
      properties: customProps,
    });

    cr.node.addDependency(policy!);

    return cr;
  }

  private createCreateNamespaceFunction(): IFunction {
    const lambdaRootPath = __dirname + '/../lambdas/custom-resource';
    const fn = new NodejsFunction(this, 'CreateNamespaceFn', {
      runtime: Runtime.NODEJS_18_X,
      entry: join(
        lambdaRootPath,
        'create-redshift-namespace.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      reservedConcurrentExecutions: 1,
      timeout: Duration.minutes(3),
      logRetention: RetentionDays.ONE_WEEK,
      role: createLambdaRole(this, 'CreateRedshiftNamespaceRole', false, []),
      environment: {
        ... POWERTOOLS_ENVS,
      },
    });
    return fn;
  }

  private grantDataAPIExecutePolicy(role: Role) {
    role.addToPolicy(new PolicyStatement({
      actions: [
        'redshift-data:ExecuteStatement',
        'redshift-data:BatchExecuteStatement',
      ],
      resources: [
        Arn.format({
          service: 'redshift-serverless',
          resource: 'workgroup',
          resourceName: '*',
          arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
        }, Stack.of(this)),
      ],
    }));
    role.addToPolicy(new PolicyStatement({
      actions: [
        'redshift-data:DescribeStatement',
        'redshift-data:GetStatementResult',
      ],
      resources: ['*'],
    }));
    role.addToPolicy( new PolicyStatement({
      actions: [
        'redshift-serverless:GetCredentials',
      ],
      resources: [
        Arn.format({
          service: 'redshift-serverless',
          resource: 'workgroup',
          resourceName: '*',
          arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
        }, Stack.of(this)),
      ],
    }));
  }
}