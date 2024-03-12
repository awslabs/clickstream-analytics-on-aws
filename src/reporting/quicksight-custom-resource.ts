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
  CLICKSTREAM_EVENT_VIEW_PLACEHOLDER,
  CLICKSTREAM_EVENT_VIEW_NAME,
  CLICKSTREAM_ITEM_VIEW_PLACEHOLDER,
  CLICKSTREAM_ITEM_VIEW_NAME,
  CLICKSTREAM_EVENT_ATTR_VIEW_NAME,
  CLICKSTREAM_EVENT_ATTR_VIEW_PLACEHOLDER,
} from '@aws/clickstream-base-lib';
import { TimeGranularity } from '@aws-sdk/client-quicksight';
import { Aws, CustomResource, Duration } from 'aws-cdk-lib';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { QuickSightDashboardDefProps, QuicksightCustomResourceProps } from './private/dashboard';
import {
  clickstream_event_attr_view_columns,
  clickstream_event_view_columns,
  clickstream_item_view_columns,
} from './private/dataset-col-def';
import { createRoleForQuicksightCustomResourceLambda } from './private/iam';

import { SolutionNodejsFunction } from '../private/function';

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

  const currentDate = new Date();
  const tenYearsAgo = new Date(currentDate);
  tenYearsAgo.setFullYear(currentDate.getFullYear() - 10);
  const futureDate = new Date(currentDate);
  futureDate.setFullYear(currentDate.getFullYear() + 10);

  const databaseName = props.databaseName;
  const eventViewProjectedColumns: string[] = [];
  const eventAttrViewProjectedColumns: string[] = [];
  const itemViewProjectedColumns: string[] = [];
  clickstream_event_view_columns.map( item => eventViewProjectedColumns.push(item.Name!));
  clickstream_event_attr_view_columns.map( item => eventAttrViewProjectedColumns.push(item.Name!));
  clickstream_item_view_columns.map( item => itemViewProjectedColumns.push(item.Name!));
  
  const dashboardDefProps: QuickSightDashboardDefProps = {
    analysisName: 'Clickstream Analysis',
    dashboardName: 'Clickstream Dashboard',
    templateArn: props.templateArn,
    templateId: props.templateId,
    dataSourceArn: props.dataSourceArn,
    databaseName: databaseName,
    dataSets: [
      {
        tableName: CLICKSTREAM_EVENT_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_EVENT_VIEW_NAME} where event_timestamp >= <<$startDate>> and event_timestamp < DATEADD(DAY, 1, date_trunc('day', <<$endDate>>))`,
        columns: clickstream_event_view_columns,
        dateTimeDatasetParameter: [
          {
            name: 'startDate',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: tenYearsAgo,
          },
          {
            name: 'endDate',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
        ],
        tagColumnOperations: [
          {
            columnName: 'geo_country',
            columnGeographicRoles: ['COUNTRY'],
          },
          {
            columnName: 'geo_city',
            columnGeographicRoles: ['CITY'],
          },
          {
            columnName: 'geo_region',
            columnGeographicRoles: ['STATE'],
          },
        ],
        projectedColumns: eventViewProjectedColumns,
      },
      {
        tableName: CLICKSTREAM_EVENT_ATTR_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_EVENT_ATTR_VIEW_NAME} where event_timestamp >= <<$startDate>> and event_timestamp < DATEADD(DAY, 1, date_trunc('day', <<$endDate>>))`,
        columns: clickstream_event_attr_view_columns,
        dateTimeDatasetParameter: [
          {
            name: 'startDate',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: tenYearsAgo,
          },
          {
            name: 'endDate',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
        ],
        tagColumnOperations: [
          {
            columnName: 'geo_country',
            columnGeographicRoles: ['COUNTRY'],
          },
          {
            columnName: 'geo_city',
            columnGeographicRoles: ['CITY'],
          },
          {
            columnName: 'geo_region',
            columnGeographicRoles: ['STATE'],
          },
        ],
        projectedColumns: eventAttrViewProjectedColumns,
      },
      {
        tableName: CLICKSTREAM_ITEM_VIEW_PLACEHOLDER,
        importMode: 'DIRECT_QUERY',
        customSql: `SELECT * FROM {{schema}}.${CLICKSTREAM_ITEM_VIEW_NAME}`,
        columns: clickstream_item_view_columns,
        dateTimeDatasetParameter: [
          {
            name: 'startDate',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: tenYearsAgo,
          },
          {
            name: 'endDate',
            timeGranularity: TimeGranularity.DAY,
            defaultValue: futureDate,
          },
        ],
        projectedColumns: itemViewProjectedColumns,
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
      quickSightSharePrincipalArn: props.quickSightProps.sharePrincipalArn,
      quickSightOwnerPrincipalArn: props.quickSightProps.ownerPrincipalArn,
      schemas: props.redshiftProps.databaseSchemaNames,
      dashboardDefProps,
    },
  });
  return cr;
}

function createQuicksightLambda(
  scope: Construct,
  templateArn: string,
): SolutionNodejsFunction {
  const role = createRoleForQuicksightCustomResourceLambda(scope, templateArn);
  const fn = new SolutionNodejsFunction(scope, 'QuicksightCustomResourceLambda', {
    entry: join(
      __dirname,
      'lambda',
      'custom-resource/quicksight',
      'index.ts',
    ),
    handler: 'handler',
    memorySize: 256,
    timeout: Duration.minutes(15),
    logConf: {
      retention: RetentionDays.ONE_WEEK,
    },
    role,
  });

  return fn;
}
