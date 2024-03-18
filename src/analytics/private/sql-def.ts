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

import { CLICKSTREAM_DEVICE_VIEW_NAME, CLICKSTREAM_EVENT_ATTR_VIEW_NAME, CLICKSTREAM_EVENT_PARAMETER_VIEW_NAME, CLICKSTREAM_EVENT_VIEW_NAME, CLICKSTREAM_LIFECYCLE_DAILY_VIEW_NAME, CLICKSTREAM_LIFECYCLE_VIEW_NAME, CLICKSTREAM_LIFECYCLE_WEEKLY_VIEW_NAME, CLICKSTREAM_RETENTION_VIEW_NAME, CLICKSTREAM_SESSION_DURATION_ATTR_VIEW_NAME, CLICKSTREAM_SESSION_PAGE_ATTR_VIEW_NAME, CLICKSTREAM_SESSION_VIEW_NAME, CLICKSTREAM_USER_ATTR_VIEW_NAME, CLICKSTREAM_USER_DIM_VIEW_NAME, CLICKSTREAM_USER_FIRST_ATTR_VIEW_NAME } from '@aws/clickstream-base-lib';
import { SQLDef, SQLViewDef } from './model';

export const reportingViewsDef: SQLViewDef[] = [
  {
    viewName: CLICKSTREAM_EVENT_ATTR_VIEW_NAME,
  },
  {
    viewName: CLICKSTREAM_EVENT_VIEW_NAME,
  },
  {
    viewName: CLICKSTREAM_EVENT_PARAMETER_VIEW_NAME,
  },
  {
    viewName: CLICKSTREAM_LIFECYCLE_VIEW_NAME,
  },
  {
    viewName: CLICKSTREAM_LIFECYCLE_DAILY_VIEW_NAME,
  },
  {
    viewName: CLICKSTREAM_LIFECYCLE_WEEKLY_VIEW_NAME,
  },
  {
    viewName: CLICKSTREAM_USER_FIRST_ATTR_VIEW_NAME,
  },
  {
    viewName: CLICKSTREAM_USER_DIM_VIEW_NAME,
  },
  {
    viewName: CLICKSTREAM_SESSION_DURATION_ATTR_VIEW_NAME,
  },
  {
    viewName: CLICKSTREAM_SESSION_PAGE_ATTR_VIEW_NAME,
  },
  {
    viewName: CLICKSTREAM_SESSION_VIEW_NAME,
  },
  {
    viewName: CLICKSTREAM_DEVICE_VIEW_NAME,
  },
  {
    viewName: CLICKSTREAM_RETENTION_VIEW_NAME,
  },
  {
    viewName: CLICKSTREAM_USER_ATTR_VIEW_NAME,
  },
];


// keep order
export const schemaDefs: SQLDef[] = [
  {
    sqlFile: 'clickstream-log.sql',
  },
  {
    sqlFile: 'event.sql',
  },
  {
    sqlFile: 'event-parameter.sql',
  },
  {
    sqlFile: 'user.sql',
  },
  {
    sqlFile: 'item.sql',
  },
  {
    sqlFile: 'item-m-view.sql',
  },
  {
    sqlFile: 'user-m-view.sql',
  },
  {
    sqlFile: 'sp-clickstream-log.sql',
  },
  {
    sqlFile: 'sp-clickstream-log-non-atomic.sql',
  },
  {
    sqlFile: 'grant-permissions-to-bi-user-1.sql',
  },
  {
    sqlFile: 'grant-permissions-to-bi-user-2.sql',
  },
  {
    sqlFile: 'sp-scan-metadata.sql',
  },
  {
    sqlFile: 'sp-clear-expired-events.sql',
  },
  {
    sqlFile: 'sp-clear-item-and-user.sql',
  },
  {
    sqlFile: 'sp-migrate-ods-events-1.0-to-1.1.sql',
  },
  {
    sqlFile: 'event-v2.sql',
  },
  {
    sqlFile: 'item-v2.sql',
  },
  {
    sqlFile: 'session.sql',
  },
  {
    sqlFile: 'user-v2.sql',
  },
  {
    sqlFile: 'user-m-max-view-v2.sql',
  },
  {
    sqlFile: 'user-m-view-v2.sql',
  },
  {
    sqlFile: 'session-m-max-view.sql',
  },
  {
    sqlFile: 'session-m-view.sql',
  },

];