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
import { Function, LayerVersion, Code, IFunction } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { ExistingRedshiftServerlessProps, ProvisionedRedshiftProps, WorkflowBucketInfo } from './model';
import { reportingViewsDef, schemaDefs } from './sql-def';
import { CUSTOM_RESOURCE_RESPONSE_REDSHIFT_BI_USER_NAME } from '../../common/constant';
import { createLambdaRole } from '../../common/lambda';
import { attachListTagsPolicyForFunction } from '../../common/lambda/tags';
import { SolutionNodejsFunction } from '../../private/function';
import { RedshiftOdsTables } from '../analytics-on-redshift';
import { createSQLExecutionStepFunctions } from './sql-exectution-stepfuncs';
import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';

export interface RedshiftSQLExecutionProps {
  readonly serverlessRedshift?: ExistingRedshiftServerlessProps;
  readonly provisionedRedshift?: ProvisionedRedshiftProps;
  readonly dataAPIRole: IRole;
  readonly codePath: string;
  readonly functionEntry: string;
  readonly workflowBucketInfo: WorkflowBucketInfo;
  readonly projectId: string;
}

export abstract class RedshiftSQLExecution extends Construct {

  readonly crForSQLExecution: CustomResource;
  readonly crFunction: IFunction;
  readonly crProvider: Provider;
  readonly stateMachine: StateMachine;
  protected readonly props: RedshiftSQLExecutionProps;

  constructor(scope: Construct, id: string, props: RedshiftSQLExecutionProps) {
    super(scope, id);

    this.stateMachine = createSQLExecutionStepFunctions(this, {
      dataAPIRole: props.dataAPIRole,
      serverlessRedshift: props.serverlessRedshift,
      provisionedRedshift: props.provisionedRedshift,
      workflowBucketInfo: props.workflowBucketInfo,
    });

    this.props = props;
    /**
     * Create custom resource to execute SQLs in Redshift using Redshift-Data API.
     */
    const resource = this.createRedshiftSQLExecutionCustomResource(props);
    this.crForSQLExecution = resource.cr;
    this.crFunction = resource.fn;
    this.crProvider = resource.provider;

    this.stateMachine.grantStartExecution(this.crFunction);
    resource.cr.node.addDependency(this.stateMachine);

  }

  protected abstract getCustomResourceProperties(props: RedshiftSQLExecutionProps): { [key: string]: any };
  protected abstract additionalPolicies(): PolicyStatement[];

  private createRedshiftSQLExecutionCustomResource(props: RedshiftSQLExecutionProps): {
    cr: CustomResource;
    fn: IFunction;
    provider: Provider;
  } {
    const fn = this.createRedshiftSchemasLambda(props);

    props.dataAPIRole.grantAssumeRole(fn.grantPrincipal);

    const provider = new Provider(
      this,
      'RedshiftSQLExecutionCustomResourceProvider',
      {
        onEventHandler: fn,
        logRetention: RetentionDays.FIVE_DAYS,
      },
    );

    const customProps: { [key: string]: any } = {
      dataAPIRole: props.dataAPIRole.roleArn,
      serverlessRedshiftProps: props.serverlessRedshift,
      provisionedRedshiftProps: props.provisionedRedshift,
      ...this.getCustomResourceProperties(props),
    };
    const cr = new CustomResource(this, 'RedshiftSQLExecutionCustomResource', {
      serviceToken: provider.serviceToken,
      properties: customProps,
    });

    return {
      cr,
      fn,
      provider,
    };
  }

  private createRedshiftSchemasLambda(props: RedshiftSQLExecutionProps): Function {
    const sqlLayer = new LayerVersion(this, 'SqlLayer', {
      code: Code.fromAsset(props.codePath),
      description: 'SQL layer',
    });

    const fnId = 'RedshiftSQLExecutionFn';
    const fn = new SolutionNodejsFunction(this, fnId, {
      entry: props.functionEntry,
      handler: 'handler',
      memorySize: 256,
      reservedConcurrentExecutions: 1,
      timeout: Duration.minutes(15),
      logRetention: RetentionDays.ONE_WEEK,
      environment: {
        SUPPRESS_ALL_ERROR: 'false',
        APPLY_ALL_APP_SQL: 'true',
        STATE_MACHINE_ARN: this.stateMachine.stateMachineArn,
        S3_BUCKET: props.workflowBucketInfo.s3Bucket.bucketName,
        S3_PREFIX: props.workflowBucketInfo.prefix,
        PROJECT_ID: props.projectId,
      },
      role: createLambdaRole(this, 'RedshiftSQLExecutionRole', false,
        this.additionalPolicies()),
      layers: [sqlLayer],
    });

    attachListTagsPolicyForFunction(this, fnId, fn);
    props.workflowBucketInfo.s3Bucket.grantWrite(fn);

    return fn;
  }
}

export interface ApplicationSchemasAndReportingProps extends RedshiftSQLExecutionProps {
  readonly projectId: string;
  readonly appIds: string;
  readonly databaseName: string;
  readonly odsTableNames: RedshiftOdsTables;
}

export class ApplicationSchemasAndReporting extends RedshiftSQLExecution {

  readonly redshiftBIUserName: string;

  constructor(scope: Construct, id: string, props: ApplicationSchemasAndReportingProps) {
    super(scope, id, props);

    this.redshiftBIUserName = this.crForSQLExecution.getAttString(CUSTOM_RESOURCE_RESPONSE_REDSHIFT_BI_USER_NAME);
  }

  public getRedshiftBIUserParameter(): string {
    return `/clickstream/reporting/user/${(this.props as ApplicationSchemasAndReportingProps).projectId}`;
  }

  protected additionalPolicies(): PolicyStatement[] {

    const writeSecretPolicy: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [
        Arn.format(
          {
            resource: 'secret',
            service: 'secretsmanager',
            resourceName: `${this.getRedshiftBIUserParameter()}*`,
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

    return [writeSecretPolicy];
  }

  protected getCustomResourceProperties(props: RedshiftSQLExecutionProps) {
    const properties = props as ApplicationSchemasAndReportingProps;
    // get schemaDefs files last modify timestamp
    return {
      projectId: properties.projectId,
      appIds: properties.appIds,
      odsTableNames: properties.odsTableNames,
      databaseName: properties.databaseName,
      redshiftBIUserParameter: this.getRedshiftBIUserParameter(),
      redshiftBIUsernamePrefix: 'clickstream_bi_',
      reportingViewsDef,
      schemaDefs,
      lastModifiedTime: this.getLatestModifyTimestamp(),
    };
  }

  private getLatestModifyTimestamp(): number {
    const schemaPath = resolve(__dirname, 'sqls/redshift');
    const reportingViewsPath = resolve(__dirname, 'sqls/redshift/dashboard');

    // Get latest timestamp from both directories
    const latestSchemaTimestamp = this.getLatestTimestampForDirectory(schemaPath);
    const latestReportingViewTimestamp = this.getLatestTimestampForDirectory(reportingViewsPath);

    // Return the max of both timestamps
    const latestTimestamp = Math.max(latestSchemaTimestamp, latestReportingViewTimestamp);

    return latestTimestamp;
  }

  private getLatestTimestampForDirectory(directory: string): number {
    let latestTimestamp = 0;

    const files = readdirSync(directory);
    files.forEach(file => {
      const filePath = join(directory, file);
      const stats = statSync(filePath);
      if (stats.isFile()) {
        latestTimestamp = Math.max(stats.mtime.getTime(), latestTimestamp);
      }
    });

    return latestTimestamp;
  }
}
