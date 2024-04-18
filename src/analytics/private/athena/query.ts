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

export const AthenaBuiltInQueries = [
  {
    id: 'AllDataQuery',
    name: 'Clickstream - All Data Query',
    description: 'Athena SQL that queries event,user and session information',
    sqlFile: 'clickstream-event-user-session-query.sql',
  },
  {
    id: 'EventsQuery',
    name: 'Clickstream - Event Query',
    description: 'Athena SQL that queries event information',
    sqlFile: 'clickstream-event-query.sql',
  },
  {
    id: 'UserQuery',
    name: 'Clickstream - User Query',
    description: 'Athena SQL that queries user information',
    sqlFile: 'clickstream-user-query.sql',
  },
  {
    id: 'SessionQuery',
    name: 'Clickstream - Session Query',
    description: 'Athena SQL that queries session-related metrics',
    sqlFile: 'clickstream-session-query.sql',
  },
  {
    id: 'ItemQuery',
    name: 'Clickstream - Item Query',
    description: 'Athena SQL that queries item information',
    sqlFile: 'clickstream-item-query.sql',
  },
];