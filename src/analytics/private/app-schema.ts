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
import { Duration, Resource, CustomResource } from 'aws-cdk-lib';
import { IRole, Role } from 'aws-cdk-lib/aws-iam';
import { Runtime, Function } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { ServerlessRedshiftProps, ProvisionedRedshiftProps, CreateDatabaseAndSchemas } from './model';
import { createLambdaRole } from '../../common/lambda';
import { POWERTOOLS_ENVS } from '../../common/powertools';

export interface ApplicationSchemasProps {
  readonly projectId: string;
  readonly appIds: string;
  readonly serverlessRedshift?: ServerlessRedshiftProps;
  readonly provisionedRedshift?: ProvisionedRedshiftProps;
  readonly odsTableName: string;
  readonly dataAPIRole: IRole;
}

export class ApplicationSchemas extends Construct {
  readonly databaseName: string;

  constructor(scope: Construct, id: string, props: ApplicationSchemasProps) {
    super(scope, id);

    this.databaseName = `clickstream_${props.projectId}`;
    /**
     * Create database(projectId) and schemas(appIds) in Redshift using Redshift-Data API.
     */
    this.createRedshiftSchemasCustomResource(props);
  }

  private createRedshiftSchemasCustomResource(props: ApplicationSchemasProps): Resource {
    const fn = this.createRedshiftSchemasLambda();

    props.dataAPIRole.grantAssumeRole(fn.grantPrincipal);
    if (props.serverlessRedshift) {
      Role.fromRoleArn(this, 'SuperUserRole', props.serverlessRedshift.superUserIAMRoleArn!).grantAssumeRole(fn.grantPrincipal);
    }

    const provider = new Provider(
      this,
      'RedshiftSchemasCustomResourceProvider',
      {
        onEventHandler: fn,
        logRetention: RetentionDays.FIVE_DAYS,
      },
    );

    const customProps: CreateDatabaseAndSchemas = {
      projectId: props.projectId,
      appIds: props.appIds,
      odsTableName: props.odsTableName,
      databaseName: this.databaseName,
      userRoleArn: props.dataAPIRole.roleArn,
      serverlessRedshiftProps: props.serverlessRedshift ? {
        workgroupName: props.serverlessRedshift.workgroupName,
        superUserIAMRoleArn: props.serverlessRedshift.superUserIAMRoleArn,
        defaultDatabaseName: 'dev',
      } : undefined,
      provisionedRedshiftProps: props.provisionedRedshift ? {
        clusterIdentifier: props.provisionedRedshift.clusterIdentifier,
        dbUser: props.provisionedRedshift.dbUser,
      } : undefined,
    };
    const cr = new CustomResource(this, 'RedshiftSchemasCustomResource', {
      serviceToken: provider.serviceToken,
      properties: customProps,
    });

    return cr;
  }

  private createRedshiftSchemasLambda(): Function {
    const lambdaRootPath = __dirname + '/../lambdas/custom-resource';
    const fn = new NodejsFunction(this, 'CreateSchemaForApplicationsFn', {
      runtime: Runtime.NODEJS_16_X,
      entry: join(
        lambdaRootPath,
        'create-schemas.ts',
      ),
      handler: 'handler',
      memorySize: 256,
      reservedConcurrentExecutions: 1,
      timeout: Duration.minutes(15),
      logRetention: RetentionDays.ONE_WEEK,
      role: createLambdaRole(this, 'CreateApplicationSchemaRole', false, []),
      environment: {
        ... POWERTOOLS_ENVS,
      },
    });
    return fn;
  }
}
