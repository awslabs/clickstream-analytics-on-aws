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
  Column,
  Schema,
} from '@aws-cdk/aws-glue-alpha';

export function getSessionTableColumns(): Column[] {
  return [{
    name: 'event_timestamp',
    type: Schema.TIMESTAMP,
  },
  {
    name: 'user_pseudo_id',
    type: Schema.STRING,
  },
  {
    name: 'session_id',
    type: Schema.STRING,
  },
  {
    name: 'user_id',
    type: Schema.STRING,
  },
  {
    name: 'session_number',
    type: Schema.BIG_INT,
  },
  {
    name: 'session_start_time_msec',
    type: Schema.BIG_INT,
  },
  {
    name: 'session_source',
    type: Schema.STRING,
  },
  {
    name: 'session_medium',
    type: Schema.STRING,
  },
  {
    name: 'session_campaign',
    type: Schema.STRING,
  },
  {
    name: 'session_content',
    type: Schema.STRING,
  },
  {
    name: 'session_term',
    type: Schema.STRING,
  },
  {
    name: 'session_campaign_id',
    type: Schema.STRING,
  },
  {
    name: 'session_clid_platform',
    type: Schema.STRING,
  },
  {
    name: 'session_clid',
    type: Schema.STRING,
  },
  {
    name: 'session_channel_group',
    type: Schema.STRING,
  },
  {
    name: 'session_source_category',
    type: Schema.STRING,
  },
  {
    name: 'process_info',
    type: Schema.map(Schema.STRING, Schema.STRING),
  },
  {
    name: 'created_time',
    type: Schema.TIMESTAMP,
  }];
}