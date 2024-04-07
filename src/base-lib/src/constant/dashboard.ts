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

export const CLICKSTREAM_LIFECYCLE_VIEW_NAME = 'clickstream_lifecycle_view_v2';
export const CLICKSTREAM_LIFECYCLE_WEEKLY_VIEW_NAME = 'clickstream_lifecycle_weekly_view_v3';
export const CLICKSTREAM_RETENTION_VIEW_NAME = 'clickstream_retention_view_v3';
export const CLICKSTREAM_RETENTION_BASE_VIEW_NAME = 'clickstream_retention_base_view';

export const CLICKSTREAM_USER_M_VIEW_NAME = 'clickstream_user_m_view_v2';
export const CLICKSTREAM_USER_M_MAX_VIEW_NAME = 'clickstream_user_m_max_view_v2';

export const CLICKSTREAM_SESSION_M_VIEW_NAME = 'clickstream_session_m_view';
export const CLICKSTREAM_SESSION_M_MAX_VIEW_NAME = 'clickstream_session_m_max_view';

export const CLICKSTREAM_EVENT_VIEW_NAME = 'clickstream_event_view_v3';
export const CLICKSTREAM_ACQUISITION_COUNTRY_NEW_USER = 'clickstream_acquisition_country_new_user';
export const CLICKSTREAM_ACQUISITION_COUNTRY_NEW_USER_SP = 'clickstream_acquisition_country_new_user_sp';
export const CLICKSTREAM_ACQUISITION_DAY_TRAFFIC_SOURCE_USER = 'clickstream_acquisition_day_traffic_source_user';
export const CLICKSTREAM_ACQUISITION_DAY_TRAFFIC_SOURCE_USER_SP = 'clickstream_acquisition_day_traffic_source_user_sp';
export const CLICKSTREAM_ACQUISITION_DAY_USER_ACQUISITION = 'clickstream_acquisition_day_user_acquisition';
export const CLICKSTREAM_ACQUISITION_DAY_USER_ACQUISITION_SP = 'clickstream_acquisition_day_user_acquisition_sp';
export const CLICKSTREAM_ACQUISITION_DAY_USER_VIEW_CNT_MV = 'clickstream_acquisition_day_user_view_cnt_mv';
export const CLICKSTREAM_ENGAGEMENT_DAY_USER_VIEW = 'clickstream_engagement_day_user_view';
export const CLICKSTREAM_ENGAGEMENT_DAY_USER_VIEW_SP = 'clickstream_engagement_day_user_view_sp';
export const CLICKSTREAM_ENGAGEMENT_ENTRANCE = 'clickstream_engagement_entrance';
export const CLICKSTREAM_ENGAGEMENT_ENTRANCE_SP = 'clickstream_engagement_entrance_sp';
export const CLICKSTREAM_ENGAGEMENT_EXIT = 'clickstream_engagement_exit';
export const CLICKSTREAM_ENGAGEMENT_EXIT_SP = 'clickstream_engagement_exit_sp';
export const CLICKSTREAM_ENGAGEMENT_KPI = 'clickstream_engagement_kpi';
export const CLICKSTREAM_ENGAGEMENT_KPI_SP = 'clickstream_engagement_kpi_sp';
export const CLICKSTREAM_ENGAGEMENT_PAGE_SCREEN_VIEW = 'clickstream_engagement_page_screen_view';
export const CLICKSTREAM_ENGAGEMENT_PAGE_SCREEN_VIEW_DETAIL = 'clickstream_engagement_page_screen_view_detail';
export const CLICKSTREAM_ENGAGEMENT_PAGE_SCREEN_VIEW_DETAIL_SP = 'clickstream_engagement_page_screen_view_detail_sp';
export const CLICKSTREAM_ENGAGEMENT_PAGE_SCREEN_VIEW_SP = 'clickstream_engagement_page_screen_view_sp';

export const CLICKSTREAM_RETENTION_USER_NEW_RETURN = 'clickstream_retention_user_new_return';
export const CLICKSTREAM_RETENTION_DAU_WAU = 'clickstream_retention_dau_wau';
export const CLICKSTREAM_RETENTION_EVENT_OVERTIME = 'clickstream_retention_event_overtime';
export const CLICKSTREAM_DEVICE_CRASH_RATE = 'clickstream_device_crash_rate';
export const CLICKSTREAM_RETENTION_USER_NEW_RETURN_SP = 'clickstream_retention_user_new_return_sp';
export const CLICKSTREAM_RETENTION_DAU_WAU_SP = 'clickstream_retention_dau_wau_sp';
export const CLICKSTREAM_RETENTION_EVENT_OVERTIME_SP = 'clickstream_retention_event_overtime_sp';
export const CLICKSTREAM_DEVICE_CRASH_RATE_SP = 'clickstream_device_crash_rate_sp';

export const CLICKSTREAM_EVENT_VIEW_PLACEHOLDER = 'Event_View';
export const CLICKSTREAM_ACQUISITION_COUNTRY_NEW_USER_PLACEHOLDER = 'Country_New_User';
export const CLICKSTREAM_ACQUISITION_DAY_TRAFFIC_SOURCE_USER_PLACEHOLDER = 'Day_Traffic_Source_User';
export const CLICKSTREAM_ACQUISITION_DAY_USER_ACQUISITION_PLACEHOLDER = 'Day_User_Acquisition';
export const CLICKSTREAM_ACQUISITION_DAY_USER_VIEW_CNT_MV_PLACEHOLDER = 'Day_User_View';
export const CLICKSTREAM_ENGAGEMENT_DAY_USER_VIEW_PLACEHOLDER = 'Day_User_View_Engagement';
export const CLICKSTREAM_ENGAGEMENT_ENTRANCE_PLACEHOLDER = 'Entrance';
export const CLICKSTREAM_ENGAGEMENT_EXIT_PLACEHOLDER = 'Exit';
export const CLICKSTREAM_ENGAGEMENT_KPI_PLACEHOLDER = 'Engagement_KPI';
export const CLICKSTREAM_ENGAGEMENT_PAGE_SCREEN_VIEW_PLACEHOLDER = 'Page_Screen_View';
export const CLICKSTREAM_ENGAGEMENT_PAGE_SCREEN_VIEW_DETAIL_PLACEHOLDER = 'Page_Screen_View_Detail';

export const CLICKSTREAM_RETENTION_USER_NEW_RETURN_PLACEHOLDER = 'User_New_Return';
export const CLICKSTREAM_RETENTION_DAU_WAU_PLACEHOLDER = 'DAU_WAU';
export const CLICKSTREAM_RETENTION_EVENT_OVERTIME_PLACEHOLDER = 'Event_Overtime';
export const CLICKSTREAM_DEVICE_CRASH_RATE_PLACEHOLDER = 'Crash_Rate';

export const CLICKSTREAM_LIFECYCLE_WEEKLY_VIEW_PLACEHOLDER = 'Lifecycle_Weekly_View';
export const CLICKSTREAM_RETENTION_VIEW_NAME_PLACEHOLDER = 'Retention_View';

export const CLICKSTREAM_DEPRECATED_MATERIALIZED_VIEW_LIST = [
  'clickstream_lifecycle_daily_view_v1',
  'clickstream_lifecycle_weekly_view_v1',
  'clickstream_retention_view_v1',
  'clickstream_device_view_v1',
  'clickstream_lifecycle_view_v1',
  'clickstream_retention_view_v2',
  'clickstream_session_duration_attr_view_v1',
  'clickstream_session_page_attr_view_v1',
  'clickstream_user_first_attr_view_v1',
  'clickstream_event_parameter_view_v1',
  'clickstream_event_attr_view_v1',
  'clickstream_session_view_v1',
  'clickstream_event_view_v1',
];

export const CLICKSTREAM_DEPRECATED_VIEW_LIST = [
  'clickstream_lifecycle_daily_view_v2',
  'clickstream_lifecycle_weekly_view_v2',
  'clickstream_session_view_v2',
  'clickstream_user_attr_view_v1',
  'clickstream_user_dim_view_v1',
  'clickstream_event_view_v2',
];