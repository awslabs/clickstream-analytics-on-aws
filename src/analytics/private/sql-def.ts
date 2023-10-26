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

import { SQLDef } from './model';

export const reportingViewsDef: SQLDef[] = [
  {
    updatable: 'false',
    sqlFile: 'clickstream_event_view.sql',
  },
  {
    updatable: 'false',
    sqlFile: 'clickstream_event_parameter_view.sql',
  },
  {
    updatable: 'false',
    sqlFile: 'clickstream_lifecycle_daily_view.sql',
  },
  {
    updatable: 'false',
    sqlFile: 'clickstream_lifecycle_weekly_view.sql',
  },
  {
    updatable: 'false',
    sqlFile: 'clickstream_user_dim_mv_1.sql',
  },
  {
    updatable: 'false',
    sqlFile: 'clickstream_user_dim_mv_2.sql',
  },
  {
    updatable: 'true',
    sqlFile: 'clickstream_user_dim_view.sql',
  },
  {
    updatable: 'false',
    sqlFile: 'clickstream_session_view.sql',
  },
  {
    updatable: 'false',
    sqlFile: 'clickstream_device_view.sql',
  },
  {
    updatable: 'false',
    sqlFile: 'clickstream_retention_view.sql',
  },
  {
    updatable: 'false',
    sqlFile: 'clickstream_user_attr_view.sql',
  },
];


// keep order
export const schemaDefs: SQLDef[] = [
  {
    updatable: 'true',
    sqlFile: 'clickstream-log.sql',
  },
  {
    updatable: 'true',
    sqlFile: 'ods-events.sql',
  },
  {
    updatable: 'true',
    sqlFile: 'event.sql',
  },
  {
    updatable: 'true',
    sqlFile: 'event-parameter.sql',
  },
  {
    updatable: 'true',
    sqlFile: 'user.sql',
  },
  {
    updatable: 'true',
    sqlFile: 'item.sql',
  },
  {
    updatable: 'false',
    sqlFile: 'item-m-view.sql',
  },
  {
    updatable: 'false',
    sqlFile: 'user-m-view.sql',
  },
  {
    updatable: 'true',
    sqlFile: 'sp-clickstream-log.sql',
  },
  {
    updatable: 'true',
    sqlFile: 'sp-clickstream-log-non-atomic.sql',
  },
  {
    updatable: 'true',
    sqlFile: 'grant-permissions-to-bi-user.sql',
    multipleLine: 'true',
  },
  {
    updatable: 'true',
    sqlFile: 'sp-upsert-users.sql',
  },
  {
    updatable: 'true',
    sqlFile: 'sp-scan-metadata.sql',
  },
  {
    updatable: 'true',
    sqlFile: 'sp-clear-expired-events.sql',
  },
  {
    updatable: 'true',
    sqlFile: 'sp-clear-item-and-user.sql',
  },

];