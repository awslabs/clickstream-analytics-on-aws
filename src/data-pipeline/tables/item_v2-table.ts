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

export function getItemTableColumns(): Column[] {
  return [{
      name: "event_timestamp",
      type: Schema.TIMESTAMP
    },
    {
      name: "event_id",
      type: Schema.STRING
    },
    {
      name: "event_name",
      type: Schema.STRING
    },
    {
      name: "platform",
      type: Schema.STRING
    },
    {
      name: "user_pseudo_id",
      type: Schema.STRING
    },
    {
      name: "user_id",
      type: Schema.STRING
    },
    {
      name: "item_id",
      type: Schema.STRING
    },
    {
      name: "name",
      type: Schema.STRING
    },
    {
      name: "brand",
      type: Schema.STRING
    },
    {
      name: "currency",
      type: Schema.STRING
    },
    {
      name: "price",
      type: Schema.DOUBLE
    },
    {
      name: "quantity",
      type: Schema.DOUBLE
    },
    {
      name: "creative_name",
      type: Schema.STRING
    },
    {
      name: "creative_slot",
      type: Schema.STRING
    },
    {
      name: "location_id",
      type: Schema.STRING
    },
    {
      name: "category",
      type: Schema.STRING
    },
    {
      name: "category2",
      type: Schema.STRING
    },
    {
      name: "category3",
      type: Schema.STRING
    },
    {
      name: "category4",
      type: Schema.STRING
    },
    {
      name: "category5",
      type: Schema.STRING
    },
    {
      name: "custom_parameters_json_str",
      type: Schema.STRING
    },
    {
      name: "custom_parameters",
      type: Schema.map(Schema.STRING, Schema.struct([{
          name: "value",
          type: Schema.STRING
        },
        {
          name: "type",
          type: Schema.STRING
        }
      ]))
    },
    {
      name: "process_info",
      type: Schema.map(Schema.STRING, Schema.STRING)
    },
    {
      name: "created_time",
      type: Schema.TIMESTAMP
    },

  ];
}