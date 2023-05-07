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

export const clickstream_daily_active_user_view_columns = [
  {
    Name: 'user_type',
    Type: 'STRING',
  },
  {
    Name: 'mobile_brand',
    Type: 'STRING',
  },
  {
    Name: 'country',
    Type: 'STRING',
  },
  {
    Name: 'event_create_day',
    Type: 'DATETIME',
  },
];

export const clickstream_dau_wau_view_columns = [
  {
    Name: 'today_active_user_num',
    Type: 'INTEGER',
  },
  {
    Name: 'active_user_numer_last_7_days',
    Type: 'INTEGER',
  },
  {
    Name: 'event_create_day',
    Type: 'DATETIME',
  },
];

export const clickstream_ods_flattened_view_columns = [
  {
    Name: 'event_name',
    Type: 'STRING',
  },
  {
    Name: 'event_date',
    Type: 'STRING',
  },
];

export const clickstream_retention_view_columns = [
  {
    Name: 'day_cohort',
    Type: 'DATETIME',
  },
  {
    Name: 'day_3',
    Type: 'INTEGER',
  },
  {
    Name: 'day_1',
    Type: 'INTEGER',
  },
  {
    Name: 'day_2',
    Type: 'INTEGER',
  },
];

export const clickstream_session_view_columns = [
  {
    Name: 'avg_session_duration_min',
    Type: 'DECIMAL',
  },
  {
    Name: 'engaged_rate_percentage',
    Type: 'DECIMAL',
  },

  {
    Name: 'engaged_session_num__per_user',
    Type: 'DECIMAL',
  },
  {
    Name: 'event_create_day',
    Type: 'DATETIME',
  },
];