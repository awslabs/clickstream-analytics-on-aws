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
  clickstream_ods_events_view_columns,
  clickstream_ods_flattened_view_columns,
  clickstream_session_view_columns,
  clickstream_user_dim_view_columns,
} from './lambda/custom-resource/quicksight/resources-def';
import {
  CLICKSTREAM_ODS_EVENT_VIEW_PLACEHOLDER,
  CLICKSTREAM_ODS_FLATTENED_VIEW_PLACEHOLDER,
  CLICKSTREAM_SESSION_VIEW_PLACEHOLDER,
  CLICKSTREAM_USER_DIM_VIEW_PLACEHOLDER,
  QuickSightDashboardDefProps,
  QuicksightCustomResourceProps,
} from './private/dashboard';
import { createRoleForQuicksightCustomResourceLambda } from './private/iam';
import { POWERTOOLS_ENVS } from '../common/powertools';

export function createQuicksightCustomResource(
  scope: Construct,
  props: QuicksightCustomResourceProps,
): CustomResource {
  const fn = createQuicksightLambda(scope, props.templateArn);
  const provider = new Provider(
    scope,
    'QuicksightCustomResourceProvider',
    {
      onEventHandler: fn,
      logRetention: RetentionDays.ONE_WEEK,
    },
  );

  const databaseName = props.databaseName;
  const dashboardDefProps: QuickSightDashboardDefProps = {
    analysisName: `Clickstream Analysis ${databaseName}`,
    dashboardName: `Clickstream Dashboard ${databaseName}`,
    templateArn: props.templateArn,
    dataSourceArn: props.dataSourceArn,
    databaseName: databaseName,
    dataSets: [
      {
        name: 'User Dim Data Set',
        tableName: CLICKSTREAM_USER_DIM_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        columns: clickstream_user_dim_view_columns,
        columnGroups: [
          {
            geoSpatialColumnGroupName: 'geo',
            geoSpatialColumnGroupColumns: [
              'first_visit_country',
              'first_visit_city',
            ],
          },
        ],
        projectedColumns: [
          'user_pseudo_id',
          'user_id',
          'first_visit_date',
          'first_visit_install_source',
          'first_visit_device_language',
          'first_platform',
          'first_visit_country',
          'first_visit_city',
          'first_traffic_source_source',
          'first_traffic_source_medium',
          'first_traffic_source_name',
          'custom_attr_key',
          'custom_attr_value',
          'is_registered',
        ],
        tagColumnOperations: [
          {
            columnName: 'first_visit_city',
            columnGeographicRoles: ['CITY'],
          },
          {
            columnName: 'first_visit_country',
            columnGeographicRoles: ['COUNTRY'],
          },
        ],
      },
      {
        name: 'ODS Flattened Data Set',
        tableName: CLICKSTREAM_ODS_FLATTENED_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        columns: clickstream_ods_flattened_view_columns,
      },
      {
        name: 'Session Data Set',
        tableName: CLICKSTREAM_SESSION_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        columns: clickstream_session_view_columns,
      },
      {
        name: 'ODS Event Data Set',
        tableName: CLICKSTREAM_ODS_EVENT_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        columns: clickstream_ods_events_view_columns,
      },
    ],
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
  templateArn: string,
): NodejsFunction {
  const role = createRoleForQuicksightCustomResourceLambda(scope, templateArn);
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
