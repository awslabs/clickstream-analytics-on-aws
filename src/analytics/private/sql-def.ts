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

import { SQLDef } from './model';

export const reportingViewsDef: SQLDef[] = [
  {
    updatable: 'false',
    sqlFile: 'clickstream-ods-events-view.sql',

  },
  {
    updatable: 'false',
    sqlFile: 'clickstream-ods-events-parameter-view.sql',

  },
  {
    updatable: 'false',
    sqlFile: 'clickstream-lifecycle-daily-view.sql',

  },
  {
    updatable: 'false',
    sqlFile: 'clickstream-lifecycle-weekly-view.sql',

  },
  {
    updatable: 'false',
    sqlFile: 'clickstream-user-dim-view.sql',

  },
  {
    updatable: 'false',
    sqlFile: 'clickstream-session-view.sql',

  },
  {
    updatable: 'false',
    sqlFile: 'clickstream-path-view.sql',

  },
  {
    updatable: 'false',
    sqlFile: 'clickstream-device-view.sql',

  },
  {
    updatable: 'false',
    sqlFile: 'clickstream-retention-view.sql',

  },
  {
    updatable: 'false',
    sqlFile: 'clickstream-user-attr-view.sql',
  },

];


// keep order
export const schemaDefs: SQLDef[] = [
  {
    updatable: 'true',
    sqlFile: 'ods-events.sql',
  },
  {
    updatable: 'true',
    sqlFile: 'sp-clickstream-log.sql',
  },
  {
    updatable: 'true',
    sqlFile: 'grant-permissions-to-bi-user.sql',
    multipleLine: 'true',
  },
  {
    updatable: 'true',
    sqlFile: 'dim-users.sql',
  },
  {
    updatable: 'true',
    sqlFile: 'sp-upsert-users.sql',
  },
  {
    updatable: 'true',
    sqlFile: 'sp-clear-expired-events.sql',
  },

];