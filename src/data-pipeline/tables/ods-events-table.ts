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

export function getODSEventsTableColumns(): Column[] {
  return [
    {
      name: 'app_info',
      type: Schema.struct([
        {
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
        },
      ],
      ),
    },
    {
      name: 'device',
      type: Schema.struct([
        {
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
        },
      ],
      ),
    },
    {
      name: 'ecommerce',
      type: Schema.struct([
        {
          name: 'total_item_quantity',
          type: Schema.BIG_INT,
        },
        {
          name: 'purchase_revenue_in_usd',
          type: Schema.DOUBLE,
        },
        {
          name: 'purchase_revenue',
          type: Schema.DOUBLE,
        },
        {
          name: 'refund_value_in_usd',
          type: Schema.DOUBLE,
        },
        {
          name: 'refund_value',
          type: Schema.DOUBLE,
        },
        {
          name: 'shipping_value_in_usd',
          type: Schema.DOUBLE,
        },
        {
          name: 'shipping_value',
          type: Schema.DOUBLE,
        },
        {
          name: 'tax_value_in_usd',
          type: Schema.DOUBLE,
        },
        {
          name: 'tax_value',
          type: Schema.DOUBLE,
        },
        {
          name: 'transaction_id',
          type: Schema.STRING,
        },
        {
          name: 'unique_items',
          type: Schema.BIG_INT,
        },
      ]),
    },
    {
      name: 'event_bundle_sequence_id',
      type: Schema.BIG_INT,
    },
    {
      name: 'event_date',
      type: Schema.DATE,
    },
    {
      name: 'event_dimensions',
      type: Schema.array(
        Schema.struct([
          {
            name: 'key',
            type: Schema.STRING,
          },
          {
            name: 'value',
            type: Schema.struct([
              {
                name: 'double_value',
                type: Schema.DOUBLE,
              },
              {
                name: 'float_value',
                type: Schema.FLOAT,
              },
              {
                name: 'int_value',
                type: Schema.BIG_INT,
              },
              {
                name: 'string_value',
                type: Schema.STRING,
              },
            ]),
          },
        ]),
      ),
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
      name: 'event_params',
      type: Schema.array(
        Schema.struct([
          {
            name: 'key',
            type: Schema.STRING,
          },
          {
            name: 'value',
            type: Schema.struct([
              {
                name: 'double_value',
                type: Schema.DOUBLE,
              },
              {
                name: 'float_value',
                type: Schema.FLOAT,
              },
              {
                name: 'int_value',
                type: Schema.BIG_INT,
              },
              {
                name: 'string_value',
                type: Schema.STRING,
              },
            ]),
          },
        ]),
      ),
    },
    {
      name: 'event_previous_timestamp',
      type: Schema.BIG_INT,
    },
    {
      name: 'event_server_timestamp_offset',
      type: Schema.BIG_INT,
    },
    {
      name: 'event_timestamp',
      type: Schema.BIG_INT,
    },
    {
      name: 'event_value_in_usd',
      type: Schema.FLOAT,
    },
    {
      name: 'geo',
      type: Schema.struct([
        {
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
        },
      ]),
    },
    {
      name: 'ingest_timestamp',
      type: Schema.BIG_INT,
    },
    {
      name: 'items',
      type: Schema.array(
        Schema.struct([
          {
            name: 'brand',
            type: Schema.STRING,
          },
          {
            name: 'category',
            type: Schema.STRING,
          },
          {
            name: 'category2',
            type: Schema.STRING,
          },
          {
            name: 'category3',
            type: Schema.STRING,
          },
          {
            name: 'category4',
            type: Schema.STRING,
          },
          {
            name: 'category5',
            type: Schema.STRING,
          },
          {
            name: 'creative_name',
            type: Schema.STRING,
          },
          {
            name: 'creative_slot',
            type: Schema.STRING,
          },
          {
            name: 'id',
            type: Schema.STRING,
          },
          {
            name: 'location_id',
            type: Schema.STRING,
          },
          {
            name: 'name',
            type: Schema.STRING,
          },
          {
            name: 'price',
            type: Schema.DOUBLE,
          },

          {
            name: 'quantity',
            type: Schema.INTEGER,
          },
        ]),
      ),

    },
    {
      name: 'platform',
      type: Schema.STRING,
    },
    {
      name: 'privacy_info',
      type: Schema.struct([
        {
          name: 'ads_storage',
          type: Schema.STRING,
        },
        {
          name: 'analytics_storage',
          type: Schema.STRING,
        },
        {
          name: 'uses_transient_token',
          type: Schema.STRING,
        },
      ]),
    },
    {
      name: 'project_id',
      type: Schema.STRING,
    },
    {
      name: 'traffic_source',
      type: Schema.struct([
        {
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
        },
      ]),
    },
    {
      name: 'user_first_touch_timestamp',
      type: Schema.BIG_INT,
    },
    {
      name: 'user_id',
      type: Schema.STRING,
    },
    {
      name: 'user_ltv',
      type: Schema.struct([
        {
          name: 'revenue',
          type: Schema.DOUBLE,
        },
        {
          name: 'currency',
          type: Schema.STRING,
        },
      ]),
    },
    {
      name: 'user_properties',
      type: Schema.array(
        Schema.struct([
          {
            name: 'key',
            type: Schema.STRING,
          },
          {
            name: 'value',
            type: Schema.struct([
              {
                name: 'double_value',
                type: Schema.DOUBLE,
              },
              {
                name: 'float_value',
                type: Schema.FLOAT,
              },
              {
                name: 'int_value',
                type: Schema.BIG_INT,
              },
              {
                name: 'string_value',
                type: Schema.STRING,
              },
              {
                name: 'set_timestamp_micros',
                type: Schema.BIG_INT,
              },
            ]),
          },
        ]),
      ),
    },
    {
      name: 'user_pseudo_id',
      type: Schema.STRING,
    },
  ];
}