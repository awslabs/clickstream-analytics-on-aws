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

import { CustomProperties, SQLDef } from '../../analytics/private/model';

export type StreamingIngestionSchemas = CustomProperties & {
  readonly projectId: string;
  readonly appIds: string;
  readonly streamingRoleArn: string;
  readonly schemaDefs: SQLDef[];
  readonly biUsername: string;
  readonly identifier: string;
  readonly dataAPIRole: string;
  readonly databaseName: string;
}

export type MustacheParamType = {
  app_schema: string;
  stream_schema: string;
  kinesis_data_stream_name: string;
  user_bi: string;
}