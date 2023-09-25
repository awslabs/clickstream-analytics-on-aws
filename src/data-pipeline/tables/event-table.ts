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

export function getEventTableColumns(): Column[] {
  return [{
    name: 'event_date',
    type: Schema.DATE,
  },
  {
    name: 'event_id',
    type: Schema.STRING,
  },
  {
    name: 'event_name',
    type: Schema.STRING,
  },
  {
    name: 'event_previous_timestamp',
    type: Schema.BIG_INT,
  },
  {
    name: 'event_bundle_sequence_id',
    type: Schema.BIG_INT,
  },
  {
    name: 'event_timestamp',
    type: Schema.BIG_INT,
  },
  {
    name: 'ingest_timestamp',
    type: Schema.BIG_INT,
  },
  {
    name: 'project_id',
    type: Schema.STRING,
  },
  {
    name: 'platform',
    type: Schema.STRING,
  },
  {
    name: 'user_id',
    type: Schema.STRING,
  },
  {
    name: 'user_pseudo_id',
    type: Schema.STRING,
  },
  {
    name: 'event_value_in_usd',
    type: Schema.FLOAT,
  },
  {
    name: 'app_info',
    type: Schema.struct([{
      name: 'app_id',
      type: Schema.STRING,
    },
    {
      name: 'id',
      type: Schema.STRING,
    },
    {
      name: 'install_source',
      type: Schema.STRING,
    },
    {
      name: 'version',
      type: Schema.STRING,
    }] ),
  },
  {
    name: 'geo',
    type: Schema.struct([{
      name: 'city',
      type: Schema.STRING,
    },
    {
      name: 'continent',
      type: Schema.STRING,
    },
    {
      name: 'country',
      type: Schema.STRING,
    },
    {
      name: 'metro',
      type: Schema.STRING,
    },
    {
      name: 'region',
      type: Schema.STRING,
    },
    {
      name: 'sub_continent',
      type: Schema.STRING,
    },
    {
      name: 'locale',
      type: Schema.STRING,
    }]),
  },
  {
    name: 'items',
    type: Schema.array(
      Schema.struct([{
        name: 'id',
        type: Schema.STRING,
      },
      {
        name: 'quantity',
        type: Schema.BIG_INT,
      },
      {
        name: 'price',
        type: Schema.DOUBLE,
      },
      {
        name: 'currency',
        type: Schema.STRING,
      },
      {
        name: 'creative_name',
        type: Schema.STRING,
      },
      {
        name: 'creative_slot',
        type: Schema.STRING,
      }]),
    ),
  },
  {
    name: 'traffic_source',
    type: Schema.struct([{
      name: 'medium',
      type: Schema.STRING,
    },
    {
      name: 'name',
      type: Schema.STRING,
    },
    {
      name: 'source',
      type: Schema.STRING,
    }]),
  },
  {
    name: 'device',
    type: Schema.struct([{
      name: 'mobile_brand_name',
      type: Schema.STRING,
    },
    {
      name: 'mobile_model_name',
      type: Schema.STRING,
    },
    {
      name: 'manufacturer',
      type: Schema.STRING,
    },
    {
      name: 'screen_width',
      type: Schema.BIG_INT,
    },
    {
      name: 'screen_height',
      type: Schema.BIG_INT,
    },
    {
      name: 'carrier',
      type: Schema.STRING,
    },
    {
      name: 'network_type',
      type: Schema.STRING,
    },
    {
      name: 'operating_system_version',
      type: Schema.STRING,
    },
    {
      name: 'operating_system',
      type: Schema.STRING,
    },
    {
      name: 'ua_browser',
      type: Schema.STRING,
    },
    {
      name: 'ua_browser_version',
      type: Schema.STRING,
    },
    {
      name: 'ua_os',
      type: Schema.STRING,
    },
    {
      name: 'ua_os_version',
      type: Schema.STRING,
    },
    {
      name: 'ua_device',
      type: Schema.STRING,
    },
    {
      name: 'ua_device_category',
      type: Schema.STRING,
    },
    {
      name: 'system_language',
      type: Schema.STRING,
    },
    {
      name: 'time_zone_offset_seconds',
      type: Schema.BIG_INT,
    },
    {
      name: 'vendor_id',
      type: Schema.STRING,
    },
    {
      name: 'advertising_id',
      type: Schema.STRING,
    },
    {
      name: 'host_name',
      type: Schema.STRING,
    }] ),
  }];
}