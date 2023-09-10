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

export function getIngestionEventsTableColumns(): Column[] {
  return [
    {
      name: 'date',
      type: Schema.STRING,
    }, {
      name: 'data',
      type: Schema.STRING,
    }, {
      name: 'ip',
      type: Schema.STRING,
    }, {
      name: 'source_type',
      type: Schema.STRING,
    }, {
      name: 'rid',
      type: Schema.STRING,
    }, {
      name: 'ua',
      type: Schema.STRING,
    }, {
      name: 'm',
      type: Schema.STRING,
    }, {
      name: 'uri',
      type: Schema.STRING,
    }, {
      name: 'platform',
      type: Schema.STRING,
    }, {
      name: 'path',
      type: Schema.STRING,
    }, {
      name: 'appId',
      type: Schema.STRING,
    }, {
      name: 'compression',
      type: Schema.STRING,
    }, {
      name: 'ingest_time',
      type: Schema.BIG_INT,
    },
  ];

}