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

import {
  CLICKSTREAM_ACQUISITION_COUNTRY_NEW_USER,
  CLICKSTREAM_ACQUISITION_COUNTRY_NEW_USER_SP,
  CLICKSTREAM_ACQUISITION_DAY_TRAFFIC_SOURCE_USER,
  CLICKSTREAM_ACQUISITION_DAY_TRAFFIC_SOURCE_USER_SP,
  CLICKSTREAM_ACQUISITION_DAY_USER_ACQUISITION,
  CLICKSTREAM_ACQUISITION_DAY_USER_ACQUISITION_SP,
  CLICKSTREAM_ACQUISITION_DAY_USER_VIEW_CNT,
  CLICKSTREAM_ACQUISITION_DAY_USER_VIEW_CNT_SP,
  CLICKSTREAM_ACQUISITION_INTRA_DAY_USER_MV,
  CLICKSTREAM_DEVICE_CRASH_RATE,
  CLICKSTREAM_DEVICE_CRASH_RATE_SP,
  CLICKSTREAM_DEVICE_USER_DEVICE,
  CLICKSTREAM_DEVICE_USER_DEVICE_SP,
  CLICKSTREAM_ENGAGEMENT_DAY_EVENT_VIEW,
  CLICKSTREAM_ENGAGEMENT_DAY_EVENT_VIEW_SP,
  CLICKSTREAM_ENGAGEMENT_ENTRANCE,
  CLICKSTREAM_ENGAGEMENT_ENTRANCE_SP,
  CLICKSTREAM_ENGAGEMENT_EVENT_NAME,
  CLICKSTREAM_ENGAGEMENT_EVENT_NAME_SP,
  CLICKSTREAM_ENGAGEMENT_EXIT,
  CLICKSTREAM_ENGAGEMENT_EXIT_SP,
  CLICKSTREAM_ENGAGEMENT_KPI,
  CLICKSTREAM_ENGAGEMENT_KPI_SP,
  CLICKSTREAM_ENGAGEMENT_PAGE_SCREEN_VIEW,
  CLICKSTREAM_ENGAGEMENT_PAGE_SCREEN_VIEW_DETAIL,
  CLICKSTREAM_ENGAGEMENT_PAGE_SCREEN_VIEW_DETAIL_SP,
  CLICKSTREAM_ENGAGEMENT_PAGE_SCREEN_VIEW_SP,
  CLICKSTREAM_EVENT_BASE_VIEW_NAME,
  CLICKSTREAM_EVENT_BASE_VIEW_SP_NAME,
  CLICKSTREAM_EVENT_VIEW_NAME,
  CLICKSTREAM_LIFECYCLE_VIEW_NAME,
  CLICKSTREAM_LIFECYCLE_WEEKLY_VIEW_NAME,
  CLICKSTREAM_RETENTION_BASE_VIEW_NAME,
  CLICKSTREAM_RETENTION_DAU_WAU, CLICKSTREAM_RETENTION_DAU_WAU_SP,
  CLICKSTREAM_RETENTION_EVENT_OVERTIME,
  CLICKSTREAM_RETENTION_EVENT_OVERTIME_SP,
  CLICKSTREAM_RETENTION_USER_NEW_RETURN,
  CLICKSTREAM_RETENTION_USER_NEW_RETURN_SP,
  CLICKSTREAM_RETENTION_VIEW_NAME,

} from '@aws/clickstream-base-lib';
import { SQLDef, SQLViewDef } from './model';

export const reportingViewsDef: SQLViewDef[] = [
  {
    viewName: CLICKSTREAM_EVENT_BASE_VIEW_NAME,
  },
  {
    viewName: CLICKSTREAM_EVENT_VIEW_NAME,
  },
  {
    viewName: CLICKSTREAM_ACQUISITION_DAY_USER_VIEW_CNT,
  },
  {
    viewName: CLICKSTREAM_ACQUISITION_COUNTRY_NEW_USER,
  },
  {
    viewName: CLICKSTREAM_EVENT_BASE_VIEW_SP_NAME,
    spName: CLICKSTREAM_EVENT_BASE_VIEW_SP_NAME,
    type: 'custom-mv',
    scheduleRefresh: 'true',
  },
  {
    viewName: CLICKSTREAM_ACQUISITION_INTRA_DAY_USER_MV,
    type: 'mv',
    scheduleRefresh: 'true',
  },
  {
    viewName: CLICKSTREAM_ACQUISITION_DAY_TRAFFIC_SOURCE_USER,
  },
  {
    viewName: CLICKSTREAM_ACQUISITION_DAY_USER_ACQUISITION,
  },
  {
    viewName: CLICKSTREAM_ENGAGEMENT_DAY_EVENT_VIEW,
  },
  {
    viewName: CLICKSTREAM_ENGAGEMENT_ENTRANCE,
  },
  {
    viewName: CLICKSTREAM_ENGAGEMENT_EVENT_NAME,
  },
  {
    viewName: CLICKSTREAM_ENGAGEMENT_EXIT,
  },
  {
    viewName: CLICKSTREAM_ENGAGEMENT_KPI,
  },
  {
    viewName: CLICKSTREAM_ENGAGEMENT_PAGE_SCREEN_VIEW,
  },
  {
    viewName: CLICKSTREAM_ENGAGEMENT_PAGE_SCREEN_VIEW_DETAIL,
  },
  {
    viewName: CLICKSTREAM_RETENTION_DAU_WAU,
  },
  {
    viewName: CLICKSTREAM_RETENTION_EVENT_OVERTIME,
  },
  {
    viewName: CLICKSTREAM_RETENTION_USER_NEW_RETURN,
  },
  {
    viewName: CLICKSTREAM_DEVICE_CRASH_RATE,
  },
  {
    viewName: CLICKSTREAM_DEVICE_USER_DEVICE,
  },
  {
    viewName: CLICKSTREAM_ACQUISITION_COUNTRY_NEW_USER,
    spName: CLICKSTREAM_ACQUISITION_COUNTRY_NEW_USER_SP,
    type: 'sp',
    scheduleRefresh: 'true',
    timezoneSensitive: 'true',
  },
  {
    viewName: CLICKSTREAM_ACQUISITION_DAY_TRAFFIC_SOURCE_USER,
    spName: CLICKSTREAM_ACQUISITION_DAY_TRAFFIC_SOURCE_USER_SP,
    type: 'sp',
    scheduleRefresh: 'true',
    timezoneSensitive: 'true',
  },
  {
    viewName: CLICKSTREAM_ACQUISITION_DAY_USER_ACQUISITION,
    spName: CLICKSTREAM_ACQUISITION_DAY_USER_ACQUISITION_SP,
    type: 'sp',
    scheduleRefresh: 'true',
    timezoneSensitive: 'true',
  },
  {
    viewName: CLICKSTREAM_ENGAGEMENT_DAY_EVENT_VIEW,
    spName: CLICKSTREAM_ENGAGEMENT_DAY_EVENT_VIEW_SP,
    type: 'sp',
    scheduleRefresh: 'true',
    timezoneSensitive: 'true',
  },
  {
    viewName: CLICKSTREAM_ENGAGEMENT_ENTRANCE,
    spName: CLICKSTREAM_ENGAGEMENT_ENTRANCE_SP,
    type: 'sp',
    scheduleRefresh: 'true',
    timezoneSensitive: 'true',
  },
  {
    viewName: CLICKSTREAM_ENGAGEMENT_EXIT,
    spName: CLICKSTREAM_ENGAGEMENT_EXIT_SP,
    type: 'sp',
    scheduleRefresh: 'true',
    timezoneSensitive: 'true',
  },
  {
    viewName: CLICKSTREAM_ENGAGEMENT_KPI,
    spName: CLICKSTREAM_ENGAGEMENT_KPI_SP,
    type: 'sp',
    scheduleRefresh: 'true',
    timezoneSensitive: 'true',
  },
  {
    viewName: CLICKSTREAM_ENGAGEMENT_PAGE_SCREEN_VIEW_DETAIL,
    spName: CLICKSTREAM_ENGAGEMENT_PAGE_SCREEN_VIEW_DETAIL_SP,
    type: 'sp',
    scheduleRefresh: 'true',
    timezoneSensitive: 'true',
  },
  {
    viewName: CLICKSTREAM_ENGAGEMENT_PAGE_SCREEN_VIEW,
    spName: CLICKSTREAM_ENGAGEMENT_PAGE_SCREEN_VIEW_SP,
    type: 'sp',
    scheduleRefresh: 'true',
    timezoneSensitive: 'true',
  },
  {
    viewName: CLICKSTREAM_ENGAGEMENT_EVENT_NAME,
    spName: CLICKSTREAM_ENGAGEMENT_EVENT_NAME_SP,
    type: 'sp',
    scheduleRefresh: 'true',
    timezoneSensitive: 'true',
  },
  {
    viewName: CLICKSTREAM_RETENTION_DAU_WAU,
    spName: CLICKSTREAM_RETENTION_DAU_WAU_SP,
    type: 'sp',
    scheduleRefresh: 'true',
    timezoneSensitive: 'true',
  },
  {
    viewName: CLICKSTREAM_RETENTION_EVENT_OVERTIME,
    spName: CLICKSTREAM_RETENTION_EVENT_OVERTIME_SP,
    type: 'sp',
    scheduleRefresh: 'true',
    timezoneSensitive: 'true',
  },
  {
    viewName: CLICKSTREAM_RETENTION_USER_NEW_RETURN,
    spName: CLICKSTREAM_RETENTION_USER_NEW_RETURN_SP,
    type: 'sp',
    scheduleRefresh: 'true',
    timezoneSensitive: 'true',
  },
  {
    viewName: CLICKSTREAM_ACQUISITION_DAY_USER_VIEW_CNT,
    spName: CLICKSTREAM_ACQUISITION_DAY_USER_VIEW_CNT_SP,
    type: 'sp',
    scheduleRefresh: 'true',
    timezoneSensitive: 'true',
  },
  {
    viewName: CLICKSTREAM_DEVICE_CRASH_RATE,
    spName: CLICKSTREAM_DEVICE_CRASH_RATE_SP,
    type: 'sp',
    scheduleRefresh: 'true',
    timezoneSensitive: 'true',
  },
  {
    viewName: CLICKSTREAM_DEVICE_USER_DEVICE,
    spName: CLICKSTREAM_DEVICE_USER_DEVICE_SP,
    type: 'sp',
    scheduleRefresh: 'true',
    timezoneSensitive: 'true',
  },
  {
    viewName: CLICKSTREAM_LIFECYCLE_VIEW_NAME,
    type: 'mv',
    scheduleRefresh: 'true',
    timezoneSensitive: 'true',
  },
  {
    viewName: CLICKSTREAM_LIFECYCLE_WEEKLY_VIEW_NAME,
  },
  {
    viewName: CLICKSTREAM_RETENTION_BASE_VIEW_NAME,
    type: 'mv',
    scheduleRefresh: 'true',
    timezoneSensitive: 'true',
  },
  {
    viewName: CLICKSTREAM_RETENTION_VIEW_NAME,
  },
];

// keep order
export const schemaDefs: SQLDef[] = [
  {
    sqlFile: 'clickstream-log-v2.sql',
  },
  {
    sqlFile: 'refresh-mv-sp-status.sql',
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
    sqlFile: 'sp-merge-event-v2.sql',
  },
  {
    sqlFile: 'sp-merge-item-v2.sql',
  },
  {
    sqlFile: 'sp-merge-session.sql',
  },
  {
    sqlFile: 'sp-merge-user-v2.sql',
  },
  {
    sqlFile: 'sp-clear-expired-data.sql',
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
    sqlFile: 'migrate/fn-combine-json-list.sql',
  },
  {
    sqlFile: 'migrate/fn-parse-utm-from-url.sql',
  },
  {
    sqlFile: 'migrate/fn-rm-object-props.sql',
  },
  {
    sqlFile: 'migrate/fn-transform-event-custom-props.sql',
  },
  {
    sqlFile: 'migrate/fn-transform-user-custom-props.sql',
  },
  {
    sqlFile: 'migrate/sp-migrate-event-to-v2.sql',
  },
  {
    sqlFile: 'migrate/sp-migrate-item-to-v2.sql',
  },
  {
    sqlFile: 'migrate/sp-migrate-user-to-v2.sql',
  },
  {
    sqlFile: 'migrate/sp-migrate-session-to-v2.sql',
  },
  {
    sqlFile: 'migrate/sp-migrate-data-to-v2.sql',
  },
];
