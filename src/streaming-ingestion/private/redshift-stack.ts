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
import {
  Stack,
  NestedStack,
  NestedStackProps,
} from 'aws-cdk-lib';
import { Role, IRole, ServicePrincipal, PolicyDocument, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { BasicRedshiftServerlessProps, ProvisionedRedshiftProps, WorkflowBucketInfo } from '../../analytics/private/model';
import { RedshiftAssociateIAMRole } from '../../analytics/private/redshift-associate-iam-role';
import { addCfnNagForCustomResourceProvider, addCfnNagToStack, ruleForLambdaVPCAndReservedConcurrentExecutions, ruleRolePolicyWithWildcardResources, ruleToSuppressRolePolicyWithWildcardResources } from '../../common/cfn-nag';
import { SolutionInfo } from '../../common/solution-info';
import { StreamingIngestionSchemas } from '../redshift/streaming-ingestion-schema';

export interface StreamingIngestionToRedshiftStackProps extends NestedStackProps {
  readonly projectId: string;
  readonly appIds: string;
  readonly dataAPIRole: IRole;
  readonly existingRedshiftServerlessProps?: BasicRedshiftServerlessProps;
  readonly existingProvisionedRedshiftProps?: ProvisionedRedshiftProps;
  readonly workflowBucketInfo: WorkflowBucketInfo;
  readonly streamArnPattern: string;
  readonly streamEncryptionKeyArn: string;
  readonly biUser: string;
  readonly identifier: string;
}

export class StreamingIngestionRedshiftStack extends NestedStack {

  constructor(
    scope: Construct,
    id: string,
    props: StreamingIngestionToRedshiftStackProps,
  ) {
    super(scope, id, props);

    if (props.existingRedshiftServerlessProps && props.existingProvisionedRedshiftProps) {
      throw new Error('Must specify ONLY one of existing Redshift Serverless or Provisioned Redshift.');
    }

    const featureName = 'Streaming Ingestion to Redshift';

    this.templateOptions.description = `(${SolutionInfo.SOLUTION_ID}-sir) ${SolutionInfo.SOLUTION_NAME} - ${featureName} ${SolutionInfo.SOLUTION_VERSION_DETAIL}`;

    const streamingIngestionRole = new Role(this, 'StreamingIngestionFromKDS', {
      assumedBy: new ServicePrincipal('redshift.amazonaws.com'),
      inlinePolicies: {
        kinesis: new PolicyDocument({
          statements: [
            new PolicyStatement({
              sid: 'ReadStream',
              actions: [
                'kinesis:DescribeStreamSummary',
                'kinesis:GetShardIterator',
                'kinesis:GetRecords',
                'kinesis:DescribeStream',
              ],
              resources: [
                props.streamArnPattern,
              ],
            },
            ),
            new PolicyStatement({
              sid: 'ListStream',
              actions: [
                'kinesis:ListStreams',
                'kinesis:ListShards',
              ],
              resources: ['*'],
            }),
            new PolicyStatement({
              sid: 'DecryptStream',
              actions: [
                'kms:Decrypt',
              ],
              resources: [
                props.streamEncryptionKeyArn,
              ],
            }),
          ],
        }),
      },
    });

    const crForModifyClusterIAMRoles = new RedshiftAssociateIAMRole(this, 'RedshiftAssociateKDSIngestionRole',
      {
        serverlessRedshift: props.existingRedshiftServerlessProps ? {
          ...props.existingRedshiftServerlessProps,
          dataAPIRoleArn: props.dataAPIRole.roleArn,
        } : undefined,
        provisionedRedshift: props.existingProvisionedRedshiftProps,
        role: streamingIngestionRole,
        timeoutInSeconds: 180,
      }).cr;

    // provisioning schema and tables
    const functionEntry = join(
      __dirname + '/../lambdas/custom-resource',
      'streaming-schemas.ts',
    );
    const codePath = __dirname + '/../redshift/sqls';
    const streamingIngestionSchema = new StreamingIngestionSchemas(this, 'StreamingIngestionSchemas', {
      projectId: props.projectId,
      appIds: props.appIds,
      serverlessRedshift: props.existingRedshiftServerlessProps,
      provisionedRedshift: props.existingProvisionedRedshiftProps,
      databaseName: props.projectId,
      dataAPIRole: props.dataAPIRole,
      streamingIngestionRole: streamingIngestionRole,
      codePath,
      functionEntry,
      workflowBucketInfo: props.workflowBucketInfo,
      biUsername: props.biUser,
      identifier: props.identifier,
    });
    streamingIngestionSchema.crForSQLExecution.node.addDependency(crForModifyClusterIAMRoles);

    addCfnNag(this);
  }
}

function addCfnNag(stack: Stack) {
  addCfnNagToStack(stack, [
    {
      paths_endswith: [
        'StreamingIngestionFromKDS/Resource',
      ],
      rules_to_suppress: [
        {
          id: 'W11',
          reason: 'Kinesis\'s listStreams and listShards actions do not support resources.',
        },
      ],
    },
    {
      paths_endswith: [
        'AssociateIAMRoleFnRole/DefaultPolicy/Resource',
      ],
      rules_to_suppress: [
        {
          id: 'F39',
          reason: 'Updating IAM roles of existing Redshift required pass existing roles, which requires undetermined role names.',
        },
        ruleToSuppressRolePolicyWithWildcardResources('logs', 'logs'),
      ],
    },
    ruleRolePolicyWithWildcardResources('RedshiftSQLExecutionCustomResource/Default', 'xray', 'xray'),
    ruleRolePolicyWithWildcardResources('SQLExecutionStateMachine/Role/DefaultPolicy/Resource', 'xray and logs', 'xray/logs'),
    ruleForLambdaVPCAndReservedConcurrentExecutions('AssociateIAMRoleToRedshiftFn/Resource', 'AssociateIAMRoleToRedshiftFn'),
    ruleForLambdaVPCAndReservedConcurrentExecutions('StreamingIngestionSchemas/RedshiftSQLExecutionFn/Resource', 'RedshiftSQLExecutionFn'),
  ]);

  addCfnNagForCustomResourceProvider(stack, 'CDK built-in provider for RedshiftAssociateIAMRoleCustomResourceProvider', 'RedshiftAssociateIAMRoleCustomResourceProvider');
  addCfnNagForCustomResourceProvider(stack, 'CDK built-in provider for RedshiftSQLExecutionCustomResourceProvider', 'RedshiftSQLExecutionCustomResourceProvider');
}
