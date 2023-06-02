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
    id: 'DeviceQuery',
    name: 'Clickstream - Device Query',
    description: 'Athena SQL that queries device information',
    sqlFile: 'clickstream-device-query.sql',
  },
  {
    id: 'LifecycleDailyQuery',
    name: 'Clickstream - User Life Cycle Query(daily view)',
    description: 'Athena SQL that generates user life cycle information by date',
    sqlFile: 'clickstream-lifecycle-daily-query.sql',
  },
  {
    id: 'LifecycleWeeklyQuery',
    name: 'Clickstream - User Life Cycle Query (weekly view)',
    description: 'Athena SQL that generates user life cycle information by week',
    sqlFile: 'clickstream-lifecycle-weekly-query.sql',
  },
  {
    id: 'EventsParameterQuery',
    name: 'Clickstream - Events Parameter Query',
    description: 'Athena SQL that queries event parameters',
    sqlFile: 'clickstream-ods-events-parameter-query.sql',
  },
  {
    id: 'EventsQuery',
    name: 'Clickstream - Event Query',
    description: 'Athena SQL that queries events information',
    sqlFile: 'clickstream-ods-events-query.sql',
  },
  {
    id: 'PathQuery',
    name: 'Clickstream - User Path Query',
    description: 'Athena SQL that generates user\'s activity path',
    sqlFile: 'clickstream-path-query.sql',
  },
  {
    id: 'RetentionQuery',
    name: 'Clickstream - Retention Query',
    description: 'Athena SQL that calculates user retention metrics',
    sqlFile: 'clickstream-retention-query.sql',
  },
  {
    id: 'SessionQuery',
    name: 'Clickstream - Session Query',
    description: 'Athena SQL that calculates session-related metrics',
    sqlFile: 'clickstream-session-query.sql',
  },
  {
    id: 'UserDimQuery',
    name: 'Clickstream - User Dimension Query',
    description: 'Athena SQL that generates latest user information',
    sqlFile: 'clickstream-user-dim-query.sql',
  },
  {
    id: 'UserAttrQuery',
    name: 'Clickstream - User Attribute Query',
    description: 'Athena SQL that queries users\' attributes',
    sqlFile: 'clickstream-user-attr-query.sql',
  },

];