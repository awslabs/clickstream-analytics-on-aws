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
    name: 'app_id',
    type: Schema.DATE,
  },
  {
    name: 'event_date',
    type: Schema.DATE,
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
    name: 'user_first_touch_timestamp',
    type: Schema.BIG_INT,
  },
  {
    name: 'user_properties',
    type: Schema.array(
      Schema.struct([{
        name: 'key',
        type: Schema.STRING,
      },
      {
        name: 'value',
        type: Schema.struct([{
          name: 'double_value',
          type: Schema.STRING,
        },
        {
          name: 'float_value',
          type: Schema.STRING,
        },
        {
          name: 'int_value',
          type: Schema.STRING,
        },
        {
          name: 'string_value',
          type: Schema.STRING,
        },
        {
          name: 'set_timestamp_micros',
          type: Schema.BIG_INT,
        }]),
      }]),
    ),
  },

  {
    name: 'user_ltv',
    type: Schema.struct([{
      name: 'revenue',
      type: Schema.DOUBLE,
    },
    {
      name: 'currency',
      type: Schema.STRING,
    }]),
  },

  {
    name: '_first_visit_date',
    type: Schema.DATE,
  },

  {
    name: '_first_referer',
    type: Schema.STRING,
  },

  {
    name: '_first_traffic_source_type',
    type: Schema.STRING,
  },

  {
    name: '_first_traffic_medium',
    type: Schema.STRING,
  },

  {
    name: '_first_traffic_source',
    type: Schema.STRING,
  },

  {
    name: 'device_id_list',
    type: Schema.STRING,
  },

  {
    name: '_channel',
    type: Schema.STRING,
  }];
}