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
import { Duration, Arn, Stack, ArnFormat, Token, CfnCondition, CfnResource, CustomResource } from 'aws-cdk-lib';

import { IRole, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { getOrCreateNoWorkgroupIdCondition, getOrCreateWithWorkgroupIdCondition, getOrCreateNoNamespaceIdCondition, getOrCreateWithNamespaceIdCondition } from './condition';
import { AssociateIAMRoleToRedshift, ExistingRedshiftServerlessProps, ProvisionedRedshiftProps } from './model';
import { createLambdaRole } from '../../common/lambda';
import { SolutionNodejsFunction } from '../../private/function';


export interface RedshiftAssociateIAMRoleProps {
  readonly serverlessRedshift?: ExistingRedshiftServerlessProps;
  readonly provisionedRedshift?: ProvisionedRedshiftProps;
  readonly role: IRole;
  /**
   * default 50 seconds
   */
  readonly timeoutInSeconds?: number;
}

export class RedshiftAssociateIAMRole extends Construct {

  public readonly cr: CustomResource;

  constructor(scope: Construct, id: string, props: RedshiftAssociateIAMRoleProps) {
    super(scope, id);

    if (!props.provisionedRedshift && !props.serverlessRedshift) {
      throw new Error('Must specify either provisioned Redshift or serverless Redshift.');
    }

    const fn = new SolutionNodejsFunction(scope, 'AssociateIAMRoleToRedshiftFn', {
      entry: join(
        __dirname + '/../lambdas/custom-resource',
        'redshift-associate-iam-role.ts',
      ),
      handler: 'handler',
      memorySize: 256,
      reservedConcurrentExecutions: 1,
      timeout: Duration.minutes(5),
      logRetention: RetentionDays.ONE_WEEK,
      role: createLambdaRole(scope, 'AssociateIAMRoleFnRole', false, [
        new PolicyStatement({
          actions: [
            'iam:PassRole',
          ],
          resources: ['*'], //NOSONAR have to use wildcard for keeping existing associated roles
          conditions: {
            StringEquals: {
              'iam:PassedToService': 'redshift.amazonaws.com',
            },
          },
        }),
      ]),
    });

    const provider = new Provider(
      scope,
      'RedshiftAssociateIAMRoleCustomResourceProvider',
      {
        onEventHandler: fn,
        logRetention: RetentionDays.FIVE_DAYS,
      },
    );

    const customProps: AssociateIAMRoleToRedshift = {
      roleArn: props.role.roleArn,
      timeoutInSeconds: props.timeoutInSeconds ?? 50,
      serverlessRedshiftProps: props.serverlessRedshift,
      provisionedRedshiftProps: props.provisionedRedshift,
    };

    this.cr = new CustomResource(scope, 'RedshiftAssociateIAMRoleCustomResource', {
      serviceToken: provider.serviceToken,
      properties: customProps,
    });

    if (props.serverlessRedshift) {
      if (props.serverlessRedshift.workgroupId && Token.isUnresolved(props.serverlessRedshift.workgroupId) &&
              !props.serverlessRedshift.createdInStack) {
        const noWorkgroupIdCondition = getOrCreateNoWorkgroupIdCondition(scope, props.serverlessRedshift.workgroupId);
        this.createRedshiftServerlessWorkgroupPolicy('RedshiftServerlessAllWorkgroupPolicy', '*',
          fn.role!, noWorkgroupIdCondition);

        const withWorkgroupIdCondition = getOrCreateWithWorkgroupIdCondition(scope, props.serverlessRedshift.workgroupId);
        this.createRedshiftServerlessWorkgroupPolicy('RedshiftServerlessSingleWorkgroupPolicy', props.serverlessRedshift.workgroupId,
          fn.role!, withWorkgroupIdCondition);
      } else {
        this.cr.node.addDependency(this.createRedshiftServerlessWorkgroupPolicy('RedshiftServerlessWorkgroupPolicy',
          props.serverlessRedshift.workgroupId ?? '*', fn.role!));
      }
      if (props.serverlessRedshift.namespaceId && Token.isUnresolved(props.serverlessRedshift.namespaceId) &&
              !props.serverlessRedshift.createdInStack) {
        const noNamespaceIdCondition = getOrCreateNoNamespaceIdCondition(scope, props.serverlessRedshift.namespaceId);
        this.createRedshiftServerlessNamespacePolicy('RedshiftServerlessAllNamespacePolicy', '*',
          fn.role!, noNamespaceIdCondition);

        const withNamespaceIdCondition = getOrCreateWithNamespaceIdCondition(scope, props.serverlessRedshift.namespaceId);
        this.createRedshiftServerlessNamespacePolicy('RedshiftServerlessSingleNamespacePolicy',
          props.serverlessRedshift.namespaceId, fn.role!, withNamespaceIdCondition);
      } else {
        this.cr.node.addDependency(this.createRedshiftServerlessNamespacePolicy('RedshiftServerlessNamespacePolicy',
          props.serverlessRedshift.namespaceId ?? '*', fn.role!));
      }
    } else {
      this.cr.node.addDependency(new Policy(scope, 'ProvisionedRedshiftIAMPolicy', {
        roles: [fn.role!],
        statements: [
          new PolicyStatement({
            actions: [
              'redshift:DescribeClusters',
            ],
            resources: [
              Arn.format({
                service: 'redshift',
                resource: '*',
              }, Stack.of(scope)),
            ],
          }),
          new PolicyStatement({
            actions: [
              'redshift:ModifyClusterIamRoles',
            ],
            resources: [
              Arn.format({
                service: 'redshift',
                resource: 'cluster',
                resourceName: props.provisionedRedshift!.clusterIdentifier,
                arnFormat: ArnFormat.COLON_RESOURCE_NAME,
              }, Stack.of(scope)),
            ],
          }),
        ],
      }));
    }
  }

  private createRedshiftServerlessWorkgroupPolicy(id: string, workgroupId: string, role: IRole, condition?: CfnCondition): Policy {
    const policy = new Policy(this, id, {
      roles: [role],
      statements: [
        new PolicyStatement({
          actions: [
            'redshift-serverless:GetWorkgroup',
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
    if (condition) { (policy.node.findChild('Resource') as CfnResource).cfnOptions.condition = condition; }
    return policy;
  }

  private createRedshiftServerlessNamespacePolicy(id: string, namespaceId: string, role: IRole, condition?: CfnCondition): Policy {
    const policy = new Policy(this, id, {
      roles: [role],
      statements: [
        new PolicyStatement({
          actions: [
            'redshift-serverless:GetNamespace',
            'redshift-serverless:UpdateNamespace',
          ],
          resources: [
            Arn.format({
              service: 'redshift-serverless',
              resource: 'namespace',
              resourceName: namespaceId,
              arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
            }, Stack.of(this)),
          ],
        }),
      ],
    });
    if (condition) { (policy.node.findChild('Resource') as CfnResource).cfnOptions.condition = condition; }
    return policy;
  }
}
