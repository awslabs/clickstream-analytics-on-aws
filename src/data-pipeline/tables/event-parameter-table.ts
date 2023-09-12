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

export function getEventParameterTableColumns(): Column[] {
  return [
    {
      name: 'event_id',
      type: Schema.STRING,
    },
    {
      name: 'event_param_key',
      type: Schema.STRING,
    },
    {
      name: 'event_param_double_value',
      type: Schema.DOUBLE,
    },
    {
      name: 'event_param_float_value',
      type: Schema.FLOAT,
    },
    {
      name: 'event_param_int_value',
      type: Schema.BIG_INT,
    },
    {
      name: 'event_param_string_value',
      type: Schema.STRING,
    },
  ];
}