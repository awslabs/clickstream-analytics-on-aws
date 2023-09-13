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
import { Role, IRole } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { StreamingIngestionSchemas } from './redshift/streaming-ingestion-schema';
import { BasicRedshiftServerlessProps, ProvisionedRedshiftProps, WorkflowBucketInfo } from '../analytics/private/model';
import { RedshiftAssociateIAMRole } from '../analytics/private/redshift-associate-iam-role';
import { RedshiftServerless } from '../analytics/private/redshift-serverless';
import { addCfnNagForCustomResourceProvider, addCfnNagForLogRetention } from '../common/cfn-nag';
import { SolutionInfo } from '../common/solution-info';

export interface StreamingIngestionRedshiftStackProps extends NestedStackProps {
  readonly projectId: string;
  readonly appIds: string;
  readonly dataAPIRoleArn: string;
  readonly existingRedshiftServerlessProps?: BasicRedshiftServerlessProps;
  readonly existingProvisionedRedshiftProps?: ProvisionedRedshiftProps;
  readonly associateRoleTimeout: number;
  readonly workflowBucketInfo: WorkflowBucketInfo;
  readonly redshiftIngestionRole: IRole;
}

export class StreamingIngestionRedshiftStack extends NestedStack {

  readonly redshiftServerlessWorkgroup: RedshiftServerless | undefined;
  readonly streamingIngestionSchema: StreamingIngestionSchemas;
  readonly redshiftDataAPIExecRole: IRole;

  constructor(
    scope: Construct,
    id: string,
    props: StreamingIngestionRedshiftStackProps,
  ) {
    super(scope, id, props);

    if (props.existingRedshiftServerlessProps && props.existingProvisionedRedshiftProps) {
      throw new Error('Must specify ONLY one of existing Redshift Serverless or Provisioned Redshift.');
    }

    const featureName = `Streaming-Ingestion-Redshift-${id}`;

    this.templateOptions.description = `(${SolutionInfo.SOLUTION_ID}-sir) ${SolutionInfo.SOLUTION_NAME} - ${featureName} ${SolutionInfo.SOLUTION_VERSION_DETAIL}`;

    const projectDatabaseName = props.projectId;
    this.redshiftDataAPIExecRole = Role.fromRoleArn(this, 'StreamingIngestionDataExecRole',
      props.dataAPIRoleArn, {
        mutable: false,
      });

    const crForModifyClusterIAMRoles = new RedshiftAssociateIAMRole(this, 'RedshiftAssociateKDSIngestionRole',
      {
        serverlessRedshift: props.existingRedshiftServerlessProps ? {
          ...props.existingRedshiftServerlessProps,
          dataAPIRoleArn: props.dataAPIRoleArn,
        } : undefined,
        provisionedRedshift: props.existingProvisionedRedshiftProps,
        role: props.redshiftIngestionRole,
        timeoutInSeconds: props.associateRoleTimeout,
      }).cr;

    const functionEntry = join(
      __dirname + '/lambdas/custom-resource',
      'create-schemas.ts',
    );
    const codePath = __dirname + '/redshift/sqls';
    this.streamingIngestionSchema = new StreamingIngestionSchemas(this, 'CreateStreamingIngestionSchemas', {
      projectId: props.projectId,
      appIds: props.appIds,
      serverlessRedshift: props.existingRedshiftServerlessProps,
      provisionedRedshift: props.existingProvisionedRedshiftProps,
      databaseName: projectDatabaseName,
      dataAPIRole: this.redshiftDataAPIExecRole,
      streamingIngestionRole: props.redshiftIngestionRole,
      codePath,
      functionEntry,
      workflowBucketInfo: props.workflowBucketInfo,
    });
    this.streamingIngestionSchema.crForSQLExecution.node.addDependency(crForModifyClusterIAMRoles);

    addCfnNag(this);
  }
}

function addCfnNag(stack: Stack) {
  addCfnNagForLogRetention(stack);
  addCfnNagForCustomResourceProvider(stack, 'CDK built-in provider for StreamingIngestionSchemasCustomResourceProvider', 'StreamingIngestionSchemasCustomResourceProvider');
  addCfnNagForCustomResourceProvider(stack, 'CDK built-in custom resource provider for StreamingIngestionSchemasCustomResourceProvider', 'StreamingIngestionSchemasCustomResourceProvider');
  addCfnNagForCustomResourceProvider(stack, 'Metrics', 'MetricsCustomResourceProvider', '');
}
