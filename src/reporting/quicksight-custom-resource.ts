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
import { Aws, CustomResource, Duration } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import {
  clickstream_daily_active_user_view_columns,
  clickstream_dau_wau_view_columns,
  clickstream_ods_flattened_view_columns,
  clickstream_retention_view_columns,
  clickstream_session_view_columns,
} from './lambda/custom-resource/quicksight/resources-def';
import {
  CLICKSTREAM_DAILY_ACTIVE_USER_VIEW_PLACEHOLDER,
  CLICKSTREAM_DAU_WAU_VIEW_PLACEHOLDER,
  CLICKSTREAM_ODS_FLATTENED_VIEW_PLACEHOLDER,
  CLICKSTREAM_RETENTION_VIEW_PLACEHOLDER,
  CLICKSTREAM_SESSION_VIEW_PLACEHOLDER,
  QuickSightDashboardDefProps,
  QuicksightCustomResourceProps,
} from './private/dashboard';
import { createRoleForQuicksightCustomResourceLambda } from './private/iam';
import { POWERTOOLS_ENVS } from '../common/powertools';

export function createQuicksightCustomResource(
  scope: Construct,
  props: QuicksightCustomResourceProps,
): CustomResource {
  const fn = createQuicksightLambda(scope, props);
  const provider = new Provider(
    scope,
    'QuicksightDatasourceCustomResourceProvider',
    {
      onEventHandler: fn,
      logRetention: RetentionDays.ONE_WEEK,
    },
  );

  const awsAccountId: string = Aws.ACCOUNT_ID;
  const arnPrefix = `arn:${Aws.PARTITION}:quicksight:${Aws.REGION}:${awsAccountId}:`;

  const databaseName = props.redshiftProps.databaseName;

  const suffix = `${databaseName}`;
  const dashboardDefProps: QuickSightDashboardDefProps = {
    analysisId: `clickstream_analysis_v1_${suffix}_##SCHEMA##`,
    analysisName: `Clickstream Analysis ${suffix}_##SCHEMA##`,
    dashboardId: `clickstream_dashboard_v1_${suffix}_##SCHEMA##`,
    dashboardName: `Clickstream Dashboard ${suffix}_##SCHEMA##`,
    template: {
      id: `clickstream_quicksight_template_v1_${suffix}_##SCHEMA##`,
      name: `Clickstream Quicksight Template ${suffix}_##SCHEMA##`,
      templateArn: props.quickSightProps.templateArn,
      // templateDefinition?: templeteDef, //keep for future use.
    },
    data: {
      dataSource: {
        id: `clickstream_quicksight_data_source_v1_${suffix}_##SCHEMA##`,
        name: `Clickstream Quicksight Data Source ${suffix}_##SCHEMA##`,
        endpoint: props.redshiftProps.host,
        port: props.redshiftProps.port,
        databaseName: databaseName,
        credentialParameter: props.redshiftProps.ssmParameterName,
        vpcConnectionArn: props.quickSightProps.vpcConnectionArn,
      },
      dataSets: [
        {
          id: `dataset_${CLICKSTREAM_DAILY_ACTIVE_USER_VIEW_PLACEHOLDER}_v1_${suffix}_##SCHEMA##`,
          name: `Daily Active User Dataset ${suffix}_##SCHEMA##`,
          importMode: 'DIRECT_QUERY',
          physicalTableMap: {
            DailyActiveUserTable: {
              CustomSql: {
                DataSourceArn: `${arnPrefix}datasource/clickstream_quicksight_data_source_v1_${suffix}_##SCHEMA##`,
                Name: CLICKSTREAM_DAILY_ACTIVE_USER_VIEW_PLACEHOLDER,
                SqlQuery: `SELECT * FROM ##SCHEMA##.${CLICKSTREAM_DAILY_ACTIVE_USER_VIEW_PLACEHOLDER}`,
                Columns: clickstream_daily_active_user_view_columns,
              },
            },
          },
          logicalTableMap: {
            DailyActiveUserLogicTable: {
              Alias: 'DailyActiveUserTableAlias',
              Source: {
                PhysicalTableId: 'DailyActiveUserTable',
              },
              DataTransforms: [{
                TagColumnOperation: {
                  ColumnName: 'country',
                  Tags: [
                    {
                      ColumnGeographicRole: 'COUNTRY',
                    },
                  ],
                },
              }],
            },
          },
        },
        {
          id: `dataset_${CLICKSTREAM_ODS_FLATTENED_VIEW_PLACEHOLDER}_v1_${suffix}_##SCHEMA##`,
          name: `ODS Flattened Dataset ${suffix}_##SCHEMA##`,
          importMode: 'DIRECT_QUERY',
          physicalTableMap: {
            ODSFalttenedTable: {
              CustomSql: {
                DataSourceArn: `${arnPrefix}datasource/clickstream_quicksight_data_source_v1_${suffix}_##SCHEMA##`,
                Name: CLICKSTREAM_ODS_FLATTENED_VIEW_PLACEHOLDER,
                SqlQuery: `SELECT * FROM ##SCHEMA##.${CLICKSTREAM_ODS_FLATTENED_VIEW_PLACEHOLDER}`,
                Columns: clickstream_ods_flattened_view_columns,
              },
            },
          },
        },
        {
          id: `dataset_${CLICKSTREAM_SESSION_VIEW_PLACEHOLDER}_v1_${suffix}_##SCHEMA##`,
          name: `Session Dataset ${suffix}_##SCHEMA##`,
          importMode: 'DIRECT_QUERY',
          physicalTableMap: {
            SessionTable: {
              CustomSql: {
                DataSourceArn: `${arnPrefix}datasource/clickstream_quicksight_data_source_v1_${suffix}_##SCHEMA##`,
                Name: CLICKSTREAM_SESSION_VIEW_PLACEHOLDER,
                SqlQuery: `SELECT * FROM ##SCHEMA##.${CLICKSTREAM_SESSION_VIEW_PLACEHOLDER}`,
                Columns: clickstream_session_view_columns,
              },
            },
          },
        },
        {
          id: `dataset_${CLICKSTREAM_RETENTION_VIEW_PLACEHOLDER}_v1_${suffix}_##SCHEMA##`,
          name: `Retention Dataset ${suffix}_##SCHEMA##`,
          importMode: 'DIRECT_QUERY',
          physicalTableMap: {
            RetentionTable: {
              CustomSql: {
                DataSourceArn: `${arnPrefix}datasource/clickstream_quicksight_data_source_v1_${suffix}_##SCHEMA##`,
                Name: CLICKSTREAM_RETENTION_VIEW_PLACEHOLDER,
                SqlQuery: `SELECT * FROM ##SCHEMA##.${CLICKSTREAM_RETENTION_VIEW_PLACEHOLDER}`,
                Columns: clickstream_retention_view_columns,
              },
            },
          },
        },
        {
          id: `dataset_${CLICKSTREAM_DAU_WAU_VIEW_PLACEHOLDER}_v1_${suffix}_##SCHEMA##`,
          name: `Dau Wau Dataset ${suffix}_##SCHEMA##`,
          importMode: 'DIRECT_QUERY',
          physicalTableMap: {
            DauWauTable: {
              CustomSql: {
                DataSourceArn: `${arnPrefix}datasource/clickstream_quicksight_data_source_v1_${suffix}_##SCHEMA##`,
                Name: CLICKSTREAM_DAU_WAU_VIEW_PLACEHOLDER,
                SqlQuery: `SELECT * FROM ##SCHEMA##.${CLICKSTREAM_DAU_WAU_VIEW_PLACEHOLDER}`,
                Columns: clickstream_dau_wau_view_columns,
              },
            },
          },
        },
      ],
      dataSetReferences: [
        {
          DataSetPlaceholder: CLICKSTREAM_DAILY_ACTIVE_USER_VIEW_PLACEHOLDER,
          DataSetArn: `${arnPrefix}dataset/dataset_${CLICKSTREAM_DAILY_ACTIVE_USER_VIEW_PLACEHOLDER}_v1_${suffix}_##SCHEMA##`,
        },
        {
          DataSetPlaceholder: CLICKSTREAM_ODS_FLATTENED_VIEW_PLACEHOLDER,
          DataSetArn: `${arnPrefix}dataset/dataset_${CLICKSTREAM_ODS_FLATTENED_VIEW_PLACEHOLDER}_v1_${suffix}_##SCHEMA##`,
        },
        {
          DataSetPlaceholder: CLICKSTREAM_DAU_WAU_VIEW_PLACEHOLDER,
          DataSetArn: `${arnPrefix}dataset/dataset_${CLICKSTREAM_DAU_WAU_VIEW_PLACEHOLDER}_v1_${suffix}_##SCHEMA##`,
        },
        {
          DataSetPlaceholder: CLICKSTREAM_SESSION_VIEW_PLACEHOLDER,
          DataSetArn: `${arnPrefix}dataset/dataset_${CLICKSTREAM_SESSION_VIEW_PLACEHOLDER}_v1_${suffix}_##SCHEMA##`,
        },
        {
          DataSetPlaceholder: CLICKSTREAM_RETENTION_VIEW_PLACEHOLDER,
          DataSetArn: `${arnPrefix}dataset/dataset_${CLICKSTREAM_RETENTION_VIEW_PLACEHOLDER}_v1_${suffix}_##SCHEMA##`,
        },
      ],


    },
  };

  const cr = new CustomResource(scope, 'QuicksightCustomResource', {
    serviceToken: provider.serviceToken,
    properties: {
      awsAccountId: Aws.ACCOUNT_ID,
      awsRegion: Aws.REGION,
      awsPartition: Aws.PARTITION,
      quickSightNamespace: props.quickSightProps.namespace,
      quickSightUser: props.quickSightProps.userName,
      quickSightPrincipalArn: props.quickSightProps.principalArn,
      schemas: props.redshiftProps.databaseSchemaNames,
      dashboardDefProps,
    },
  });
  return cr;
}

function createQuicksightLambda(
  scope: Construct,
  props: QuicksightCustomResourceProps,
): NodejsFunction {
  const role = createRoleForQuicksightCustomResourceLambda(scope, props.redshiftProps.ssmParameterName, props.quickSightProps.templateArn);
  const fn = new NodejsFunction(scope, 'QuicksightCustomResourceLambda', {
    runtime: Runtime.NODEJS_18_X,
    entry: join(
      __dirname,
      'lambda',
      'custom-resource/quicksight',
      'index.ts',
    ),
    handler: 'handler',
    memorySize: 256,
    timeout: Duration.minutes(15),
    logRetention: RetentionDays.ONE_WEEK,
    role,
    environment: {
      ...POWERTOOLS_ENVS,
    },
  });

  return fn;
}
