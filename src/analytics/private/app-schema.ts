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

import { readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { Duration, CustomResource, Arn, ArnFormat, Stack } from 'aws-cdk-lib';
import { IRole, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { Runtime, Function, LayerVersion, Code } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { ExistingRedshiftServerlessProps, ProvisionedRedshiftProps, CreateDatabaseAndSchemas } from './model';
import { reportingViewsDef, schemaDefs } from './sql-def';
import { CUSTOM_RESOURCE_RESPONSE_REDSHIFT_BI_USER_NAME } from '../../common/constant';
import { createLambdaRole } from '../../common/lambda';
import { attachListTagsPolicyForFunction } from '../../common/lambda/tags';
import { SolutionNodejsFunction } from '../../private/function';
import { RedshiftOdsTables } from '../analytics-on-redshift';

export interface ApplicationSchemasProps {
  readonly projectId: string;
  readonly appIds: string;
  readonly serverlessRedshift?: ExistingRedshiftServerlessProps;
  readonly provisionedRedshift?: ProvisionedRedshiftProps;
  readonly databaseName: string;
  readonly odsTableNames: RedshiftOdsTables;
  readonly dataAPIRole: IRole;
}

export class ApplicationSchemas extends Construct {

  readonly crForCreateSchemas: CustomResource;
  readonly redshiftBIUserParameter: string;
  readonly redshiftBIUserName: string;

  constructor(scope: Construct, id: string, props: ApplicationSchemasProps) {
    super(scope, id);

    this.redshiftBIUserParameter = `/clickstream/reporting/user/${props.projectId}`;
    /**
     * Create database(projectId) and schemas(appIds) in Redshift using Redshift-Data API.
     */
    this.crForCreateSchemas = this.createRedshiftSchemasCustomResource(props);
    this.redshiftBIUserName = this.crForCreateSchemas.getAttString(CUSTOM_RESOURCE_RESPONSE_REDSHIFT_BI_USER_NAME);
  }

  private createRedshiftSchemasCustomResource(props: ApplicationSchemasProps): CustomResource {
    const fn = this.createRedshiftSchemasLambda();

    props.dataAPIRole.grantAssumeRole(fn.grantPrincipal);

    const provider = new Provider(
      this,
      'RedshiftSchemasCustomResourceProvider',
      {
        onEventHandler: fn,
        logRetention: RetentionDays.FIVE_DAYS,
      },
    );

    // get schemaDefs files last modify timestamp
    const lastTimestamp = this.getLatestModifyTimestamp();
    const customProps: CreateDatabaseAndSchemas = {
      projectId: props.projectId,
      appIds: props.appIds,
      odsTableNames: props.odsTableNames,
      databaseName: props.databaseName,
      dataAPIRole: props.dataAPIRole.roleArn,
      serverlessRedshiftProps: props.serverlessRedshift,
      provisionedRedshiftProps: props.provisionedRedshift,
      redshiftBIUserParameter: `${this.redshiftBIUserParameter}`,
      redshiftBIUsernamePrefix: 'clickstream_bi_',
      reportingViewsDef,
      schemaDefs,
      lastModifiedTime: lastTimestamp,
    };
    const cr = new CustomResource(this, 'RedshiftSchemasCustomResource', {
      serviceToken: provider.serviceToken,
      properties: customProps,
    });

    return cr;
  }

  private createRedshiftSchemasLambda(): Function {
    const lambdaRootPath = __dirname + '/../lambdas/custom-resource';

    const writeSecretPolicy: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [
        Arn.format(
          {
            resource: 'secret',
            service: 'secretsmanager',
            resourceName: `${this.redshiftBIUserParameter}*`,
            arnFormat: ArnFormat.COLON_RESOURCE_NAME,
          }, Stack.of(this),
        ),
      ],
      actions: [
        'secretsmanager:DescribeSecret',
        'secretsmanager:UpdateSecret',
        'secretsmanager:CreateSecret',
        'secretsmanager:DeleteSecret',
        'secretsmanager:TagResource',
      ],
    });

    const codePath = __dirname + '/sqls/redshift';
    const sqlLayer = new LayerVersion(this, 'SqlLayer', {
      compatibleRuntimes: [Runtime.NODEJS_18_X],
      code: Code.fromAsset(codePath),
      description: 'SQL layer',
    });

    const fn = new SolutionNodejsFunction(this, 'CreateSchemaForApplicationsFn', {
      entry: join(
        lambdaRootPath,
        'create-schemas.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      reservedConcurrentExecutions: 1,
      timeout: Duration.minutes(5),
      logRetention: RetentionDays.ONE_WEEK,
      role: createLambdaRole(this, 'CreateApplicationSchemaRole', false,
        [writeSecretPolicy]),
      layers: [sqlLayer],
    });

    attachListTagsPolicyForFunction(this, 'CreateSchemaForApplicationsFn', fn);

    return fn;
  }

  private getLatestModifyTimestamp(): number {
    const schemaPath = resolve(__dirname, 'sqls/redshift');
    const reportingViewsPath = resolve(__dirname, 'sqls/redshift/dashboard');

    // Get latest timestamp from both directories
    const latestSchemaTimestamp = this.getLatestTimestampForDirectory(schemaPath, schemaDefs);
    const latestReportingViewTimestamp = this.getLatestTimestampForDirectory(reportingViewsPath, reportingViewsDef);

    // Return the max of both timestamps
    const latestTimestamp = Math.max(latestSchemaTimestamp, latestReportingViewTimestamp);

    return latestTimestamp;
  }

  private getLatestTimestampForDirectory(directory: string, definitions: any[]): number {
    let latestTimestamp = 0;

    const updatableFiles = definitions
      .filter(def => def.updatable === 'true')
      .map(def => def.sqlFile || (def.viewName + '.sql'));
    const files = readdirSync(directory);
    files.forEach(file => {
      if (updatableFiles.includes(file)) {
        const filePath = join(directory, file);
        const stats = statSync(filePath);
        if (stats.isFile()) {
          latestTimestamp = Math.max(stats.mtime.getTime(), latestTimestamp);
        }
      }
    });

    return latestTimestamp;
  }
}
