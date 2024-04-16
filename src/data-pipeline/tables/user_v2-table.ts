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

export function getUserTableColumns(): Column[] {
  return [{
    name: 'event_timestamp',
    type: Schema.TIMESTAMP,
  },
  {
    name: 'user_pseudo_id',
    type: Schema.STRING,
  },
  {
    name: 'user_id',
    type: Schema.STRING,
  },
  {
    name: 'user_properties',
    type: Schema.map(Schema.STRING, Schema.struct([{
      name: 'value',
      type: Schema.STRING,
    },
    {
      name: 'type',
      type: Schema.STRING,
    },
    {
      name: 'set_time_msec',
      type: Schema.BIG_INT,
    }])),
  },

  {
    name: 'user_properties_json_str',
    type: Schema.STRING,
  },
  {
    name: 'first_touch_time_msec',
    type: Schema.BIG_INT,
  },
  {
    name: 'first_visit_date',
    type: Schema.DATE,
  },
  {
    name: 'first_referrer',
    type: Schema.STRING,
  },
  {
    name: 'first_traffic_source',
    type: Schema.STRING,
  },
  {
    name: 'first_traffic_medium',
    type: Schema.STRING,
  },
  {
    name: 'first_traffic_campaign',
    type: Schema.STRING,
  },
  {
    name: 'first_traffic_content',
    type: Schema.STRING,
  },
  {
    name: 'first_traffic_term',
    type: Schema.STRING,
  },
  {
    name: 'first_traffic_campaign_id',
    type: Schema.STRING,
  },
  {
    name: 'first_traffic_clid_platform',
    type: Schema.STRING,
  },
  {
    name: 'first_traffic_clid',
    type: Schema.STRING,
  },
  {
    name: 'first_traffic_channel_group',
    type: Schema.STRING,
  },
  {
    name: 'first_traffic_category',
    type: Schema.STRING,
  },
  {
    name: 'first_app_install_source',
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