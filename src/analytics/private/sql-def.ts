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

import { CLICKSTREAM_DEVICE_VIEW_NAME, CLICKSTREAM_EVENT_PARAMETER_VIEW_NAME, CLICKSTREAM_EVENT_VIEW_NAME, CLICKSTREAM_LIFECYCLE_DAILY_VIEW_NAME, CLICKSTREAM_LIFECYCLE_WEEKLY_VIEW_NAME, CLICKSTREAM_RETENTION_VIEW_NAME, CLICKSTREAM_SESSION_VIEW_NAME, CLICKSTREAM_USER_ATTR_VIEW_NAME, CLICKSTREAM_USER_DIM_VIEW_NAME } from '../../common/constant';
import { SQLDef } from './model';

export const reportingViewsDef: SQLDef[] = [
  {
    updatable: 'false',
    sqlFile: `${CLICKSTREAM_EVENT_VIEW_NAME}.sql`,
  },
  {
    updatable: 'false',
    sqlFile: `${CLICKSTREAM_EVENT_PARAMETER_VIEW_NAME}.sql`,
  },
  {
    updatable: 'false',
    sqlFile: `${CLICKSTREAM_LIFECYCLE_DAILY_VIEW_NAME}.sql`,
  },
  {
    updatable: 'false',
    sqlFile: `${CLICKSTREAM_LIFECYCLE_WEEKLY_VIEW_NAME}.sql`,
  },
  {
    updatable: 'false',
    sqlFile: `${CLICKSTREAM_USER_DIM_VIEW_NAME}.sql`,
  },
  {
    updatable: 'false',
    sqlFile: `${CLICKSTREAM_SESSION_VIEW_NAME}.sql`,
  },
  {
    updatable: 'false',
    sqlFile: `${CLICKSTREAM_DEVICE_VIEW_NAME}.sql`,
  },
  {
    updatable: 'false',
    sqlFile: `${CLICKSTREAM_RETENTION_VIEW_NAME}.sql`,
  },
  {
    updatable: 'false',
    sqlFile: `${CLICKSTREAM_USER_ATTR_VIEW_NAME}.sql`,
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
    sqlFile: 'grant-permissions-to-bi-user-1.sql',
  },
  {
    updatable: 'true',
    sqlFile: 'grant-permissions-to-bi-user-2.sql',
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
  {
    updatable: 'true',
    sqlFile: 'sp-migrate-ods-events-1.0-to-1.1.sql',
  },
];