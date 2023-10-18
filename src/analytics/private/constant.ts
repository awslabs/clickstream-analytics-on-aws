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


export enum JobStatus {
  JOB_NEW = 'NEW',
  JOB_ENQUEUE = 'ENQUEUE',
  JOB_PROCESSING = 'PROCESSING',
}

export const DYNAMODB_TABLE_INDEX_NAME = 'status_timestamp_index';

export const LEGACY_REDSHIFT_ODS_EVENTS_TABLE_NAME = 'ods_events';

export const REDSHIFT_DUPLICATE_DATE_INTERVAL = 3; // Days

export const SP_UPSERT_USERS = 'sp_upsert_users';
export const SP_SCAN_METADATA = 'scan_metadata';
export const SP_CLEAR_EXPIRED_EVENTS = 'sp_clear_expired_events';

export const SQL_TEMPLATE_PARAMETER = {
  sp_upsert_users: 'sp_upsert_users',
  sp_scan_metadata: 'sp_scan_metadata',
  table_ods_users: 'ods_users',
  table_dim_users: 'dim_users',
  sp_clickstream_log: 'sp_clickstream_log',
  sp_clickstream_log_non_atomic: 'sp_clickstream_log_non_atomic',
  table_clickstream_log: 'clickstream_log',
};