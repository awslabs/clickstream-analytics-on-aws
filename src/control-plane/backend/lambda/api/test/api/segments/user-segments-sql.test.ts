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
  ExploreAnalyticsNumericOperators,
  ExploreAnalyticsOperators,
  MetadataSource,
  MetadataValueType,
  Segment,
  SegmentFilterConditionType,
  SegmentFilterEventMetricType,
} from '@aws/clickstream-base-lib';
import { format } from 'sql-formatter';
import { UserSegmentsSql } from '../../../service/segments/user-segments-sql';
import { MOCK_APP_ID, MOCK_PROJECT_ID, MOCK_SEGMENT_ID, MOCK_USER_ID } from '../ddb-mock';

const baseInput: Segment = {
  segmentId: MOCK_SEGMENT_ID,
  segmentType: 'User',
  name: 'Test_user_segment',
  description: 'For test',
  projectId: MOCK_PROJECT_ID,
  appId: MOCK_APP_ID,
  createBy: MOCK_USER_ID,
  createAt: 1711843200000,
  lastUpdateBy: MOCK_USER_ID,
  lastUpdateAt: 1711843200000,
  refreshSchedule: {
    cron: 'Custom',
    cronExpression: 'rate(12 days)',
    expireAfter: 10000,
  },
  criteria: {
    operator: 'and',
    filterGroups: [],
  },
};

describe('User segments sql tests', () => {
  describe('build UserEventCondition sql', () => {
    test('NUMBER_OF_TOTAL metric type, event without parameter', () => {
      const segment: Segment = {
        ...baseInput,
        criteria: {
          operator: 'and',
          filterGroups: [
            {
              isRelativeDateRange: false,
              startDate: '2024-03-01',
              endDate: '2024-03-10',
              operator: 'and',
              filters: [
                {
                  operator: 'or',
                  conditions: [
                    {
                      conditionType: SegmentFilterConditionType.UserEventCondition,
                      hasDone: true,
                      event: {
                        eventName: '_app_end',
                      },
                      metricCondition: {
                        metricType: SegmentFilterEventMetricType.NUMBER_OF_TOTAL,
                        conditionOperator: ExploreAnalyticsNumericOperators.GREATER_THAN_OR_EQUAL,
                        inputValue: [20, 0],
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      };
      const userSegmentsSql = new UserSegmentsSql(segment);

      expect(format(userSegmentsSql.buildCriteriaStatement())).toEqual(format(`
        SELECT
            user_pseudo_id
        FROM
            app_7777_7777.event_v2
        WHERE
            event_timestamp BETWEEN '2024-03-01' AND '2024-03-10'
            AND event_name = '_app_end'
        GROUP BY
            user_pseudo_id
        HAVING
            COUNT(*) >= 20
      `));
    });

    test('NUMBER_OF_TIMES_PER_DAY metric type, event with one parameter', () => {
      const segment: Segment = {
        ...baseInput,
        criteria: {
          operator: 'and',
          filterGroups: [
            {
              isRelativeDateRange: false,
              startDate: '2024-03-01',
              endDate: '2024-03-10',
              operator: 'and',
              filters: [
                {
                  operator: 'or',
                  conditions: [
                    {
                      conditionType: SegmentFilterConditionType.UserEventCondition,
                      hasDone: true,
                      event: {
                        eventName: '_app_start',
                        eventParameterConditions: [
                          {
                            parameterType: MetadataSource.PRESET,
                            parameterName: 'user_first_touch_time_msec',
                            conditionOperator: ExploreAnalyticsOperators.GREATER_THAN,
                            inputValue: [
                              '1000000',
                            ],
                            dataType: MetadataValueType.INTEGER,
                          },
                        ],
                        operator: 'and',
                      },
                      metricCondition: {
                        metricType: SegmentFilterEventMetricType.NUMBER_OF_TIMES_PER_DAY,
                        conditionOperator: ExploreAnalyticsNumericOperators.BETWEEN,
                        inputValue: [2, 5],
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      };
      const userSegmentsSql = new UserSegmentsSql(segment);

      expect(format(userSegmentsSql.buildCriteriaStatement())).toEqual(format(`
          SELECT
              user_pseudo_id
          FROM (
              SELECT
                  user_pseudo_id,
                  DATE (event_timestamp) AS event_date,
                  count(*) AS daily_event_count
              FROM
                  app_7777_7777.event_v2
              WHERE
                  event_timestamp BETWEEN '2024-03-01' AND '2024-03-10'
                  AND (event_name = '_app_start' AND (user_first_touch_time_msec > 1000000))
              GROUP BY
                  user_pseudo_id,
                  DATE (event_timestamp)
              HAVING
                  daily_event_count BETWEEN 2 AND 5
          )
          GROUP BY
              user_pseudo_id
          HAVING
              COUNT(*) = DATE ('2024-03-10') - DATE ('2024-03-01')
      `));
    });

    test('NUMBER_OF_CONSECUTIVE_DAYS metric type, default date range, event with one preset parameter and one custom parameter', () => {
      const segment: Segment = {
        ...baseInput,
        criteria: {
          operator: 'and',
          filterGroups: [
            {
              isRelativeDateRange: false,
              operator: 'and',
              filters: [
                {
                  operator: 'or',
                  conditions: [
                    {
                      conditionType: SegmentFilterConditionType.UserEventCondition,
                      hasDone: true,
                      event: {
                        eventName: 'product_exposure',
                        eventParameterConditions: [
                          {
                            parameterType: MetadataSource.PRESET,
                            parameterName: 'user_first_touch_time_msec',
                            conditionOperator: ExploreAnalyticsOperators.GREATER_THAN,
                            inputValue: [
                              '1000000',
                            ],
                            dataType: MetadataValueType.INTEGER,
                          },
                          {
                            parameterType: MetadataSource.CUSTOM,
                            parameterName: 'currency',
                            conditionOperator: ExploreAnalyticsOperators.CONTAINS,
                            inputValue: [
                              'US',
                            ],
                            dataType: MetadataValueType.STRING,
                          },
                        ],
                        operator: 'and',
                      },
                      metricCondition: {
                        metricType: SegmentFilterEventMetricType.NUMBER_OF_CONSECUTIVE_DAYS,
                        conditionOperator: ExploreAnalyticsNumericOperators.NOT_EQUAL,
                        inputValue: [2, 0],
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      };
      const userSegmentsSql = new UserSegmentsSql(segment);

      expect(format(userSegmentsSql.buildCriteriaStatement())).toEqual(format(`
          SELECT DISTINCT
            user_pseudo_id
          FROM (
            SELECT
              user_pseudo_id,
              COUNT(*) AS consecutive_days_count
            FROM (
              SELECT
                user_pseudo_id,
                DATEDIFF(day, DATE(GETDATE() - INTERVAL '7 day'), event_date) - ROW_NUMBER() OVER (PARTITION BY user_pseudo_id ORDER BY event_date) AS grp
              FROM (
                SELECT
                  user_pseudo_id,
                  DATE (event_timestamp) as event_date
                FROM
                  app_7777_7777.event_v2
                WHERE
                  event_timestamp >= GETDATE () - INTERVAL '7 day'
                  AND (
                    event_name = 'product_exposure'
                    AND (
                      user_first_touch_time_msec > 1000000
                      AND (custom_parameters.currency.value LIKE '%US%')
                    )
                  )
                )
              )
            GROUP BY
              user_pseudo_id,
              grp
          )
          WHERE
            consecutive_days_count <> 2
      `));
    });

    test('NUMBER_OF_DAYS_HAVING_EVENT metric type, user has not done', () => {
      const segment: Segment = {
        ...baseInput,
        criteria: {
          operator: 'and',
          filterGroups: [
            {
              isRelativeDateRange: false,
              startDate: '2024-02-01',
              endDate: '2024-02-10',
              operator: 'and',
              filters: [
                {
                  operator: 'or',
                  conditions: [
                    {
                      conditionType: SegmentFilterConditionType.UserEventCondition,
                      hasDone: false,
                      event: {
                        eventName: '_app_start',
                      },
                      metricCondition: {
                        metricType: SegmentFilterEventMetricType.NUMBER_OF_DAYS_HAVING_EVENT,
                        conditionOperator: ExploreAnalyticsNumericOperators.LESS_THAN,
                        inputValue: [3, 0],
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      };
      const userSegmentsSql = new UserSegmentsSql(segment);

      expect(format(userSegmentsSql.buildCriteriaStatement())).toEqual(format(`
      SELECT
          DISTINCT e.user_pseudo_id
      FROM
          app_7777_7777.event_v2 e
          LEFT JOIN (
              SELECT
                  user_pseudo_id
              FROM
                  app_7777_7777.event_v2
              WHERE
                  event_timestamp BETWEEN '2024-02-01' AND '2024-02-10'
                  AND event_name = '_app_start'
              GROUP BY
                  user_pseudo_id
              HAVING
                  COUNT(DISTINCT DATE(event_timestamp)) < 3
          ) hd ON e.user_pseudo_id = hd.user_pseudo_id
      WHERE
          hd.user_pseudo_id IS NULL
    `));
    });

    test('SUM_OF_EVENT_PARAMETER metric type, preset metric parameter', () => {
      const segment: Segment = {
        ...baseInput,
        criteria: {
          operator: 'and',
          filterGroups: [
            {
              isRelativeDateRange: true,
              lastN: 10,
              timeUnit: 'day',
              operator: 'and',
              filters: [
                {
                  operator: 'or',
                  conditions: [
                    {
                      conditionType: SegmentFilterConditionType.UserEventCondition,
                      hasDone: true,
                      event: {
                        eventName: '_user_engagement',
                        eventParameterConditions: [
                          {
                            parameterType: MetadataSource.PRESET,
                            parameterName: 'session_duration',
                            conditionOperator: ExploreAnalyticsOperators.GREATER_THAN,
                            inputValue: [
                              '3600',
                            ],
                            dataType: MetadataValueType.INTEGER,
                          },
                        ],
                        operator: 'and',
                      },
                      metricCondition: {
                        metricType: SegmentFilterEventMetricType.SUM_OF_EVENT_PARAMETER,
                        conditionOperator: ExploreAnalyticsNumericOperators.GREATER_THAN,
                        inputValue: [2000, 0],
                        parameterType: MetadataSource.PRESET,
                        parameterName: 'user_engagement_time_msec',
                        dataType: MetadataValueType.INTEGER,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      };
      const userSegmentsSql = new UserSegmentsSql(segment);

      expect(format(userSegmentsSql.buildCriteriaStatement())).toEqual(format(`
          SELECT
            user_pseudo_id
          FROM
            app_7777_7777.event_v2
          WHERE
            event_timestamp >= GETDATE () - INTERVAL '10 day'
            AND (
              event_name = '_user_engagement'
              AND (session_duration > 3600)
            )
          GROUP BY
            user_pseudo_id
          HAVING
            SUM(user_engagement_time_msec) > 2000
      `));
    });

    test('MIN_OF_EVENT_PARAMETER metric type, preset metric parameter', () => {
      const segment: Segment = {
        ...baseInput,
        criteria: {
          operator: 'and',
          filterGroups: [
            {
              isRelativeDateRange: true,
              lastN: 10,
              timeUnit: 'day',
              operator: 'and',
              filters: [
                {
                  operator: 'or',
                  conditions: [
                    {
                      conditionType: SegmentFilterConditionType.UserEventCondition,
                      hasDone: true,
                      event: {
                        eventName: '_user_engagement',
                      },
                      metricCondition: {
                        metricType: SegmentFilterEventMetricType.MIN_OF_EVENT_PARAMETER,
                        conditionOperator: ExploreAnalyticsNumericOperators.GREATER_THAN,
                        inputValue: [2000, 0],
                        parameterType: MetadataSource.PRESET,
                        parameterName: 'user_engagement_time_msec',
                        dataType: MetadataValueType.INTEGER,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      };
      const userSegmentsSql = new UserSegmentsSql(segment);

      expect(format(userSegmentsSql.buildCriteriaStatement())).toEqual(format(`
          SELECT
            user_pseudo_id
          FROM
            app_7777_7777.event_v2
          WHERE
            event_timestamp >= GETDATE () - INTERVAL '10 day'
            AND event_name = '_user_engagement'
          GROUP BY
            user_pseudo_id
          HAVING
            MIN(user_engagement_time_msec) > 2000
      `));
    });

    test('MAX_OF_EVENT_PARAMETER metric type, custom metric parameter', () => {
      const segment: Segment = {
        ...baseInput,
        criteria: {
          operator: 'and',
          filterGroups: [
            {
              isRelativeDateRange: true,
              lastN: 10,
              timeUnit: 'day',
              operator: 'and',
              filters: [
                {
                  operator: 'or',
                  conditions: [
                    {
                      conditionType: SegmentFilterConditionType.UserEventCondition,
                      hasDone: true,
                      event: {
                        eventName: 'purchase',
                        eventParameterConditions: [
                          {
                            parameterType: MetadataSource.CUSTOM,
                            parameterName: 'in_promotion',
                            conditionOperator: ExploreAnalyticsOperators.TRUE,
                            inputValue: [],
                            dataType: MetadataValueType.BOOLEAN,
                          },
                        ],
                        operator: 'and',
                      },
                      metricCondition: {
                        metricType: SegmentFilterEventMetricType.MAX_OF_EVENT_PARAMETER,
                        conditionOperator: ExploreAnalyticsNumericOperators.GREATER_THAN,
                        inputValue: [2000, 0],
                        parameterType: MetadataSource.CUSTOM,
                        parameterName: 'value',
                        dataType: MetadataValueType.NUMBER,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      };
      const userSegmentsSql = new UserSegmentsSql(segment);

      expect(format(userSegmentsSql.buildCriteriaStatement())).toEqual(format(`
          SELECT
            user_pseudo_id
          FROM
            app_7777_7777.event_v2
          WHERE
            event_timestamp >= GETDATE () - INTERVAL '10 day'
            AND (event_name = 'purchase' AND (custom_parameters.in_promotion.value = true))
          GROUP BY
            user_pseudo_id
          HAVING
            MAX(CAST(custom_parameters.value.value AS FLOAT)) > 2000
      `));
    });

    test('AVG_OF_EVENT_PARAMETER metric type, custom metric parameter, default date range, user has not done', () => {
      const segment: Segment = {
        ...baseInput,
        criteria: {
          operator: 'and',
          filterGroups: [
            {
              isRelativeDateRange: true,
              operator: 'and',
              filters: [
                {
                  operator: 'or',
                  conditions: [
                    {
                      conditionType: SegmentFilterConditionType.UserEventCondition,
                      hasDone: false,
                      event: {
                        eventName: 'purchase',
                      },
                      metricCondition: {
                        metricType: SegmentFilterEventMetricType.AVG_OF_EVENT_PARAMETER,
                        conditionOperator: ExploreAnalyticsNumericOperators.BETWEEN,
                        inputValue: [50, 100],
                        parameterType: MetadataSource.CUSTOM,
                        parameterName: 'value',
                        dataType: MetadataValueType.INTEGER,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      };
      const userSegmentsSql = new UserSegmentsSql(segment);

      expect(format(userSegmentsSql.buildCriteriaStatement())).toEqual(format(`
          SELECT DISTINCT
              e.user_pseudo_id
          FROM
              app_7777_7777.event_v2 e
              LEFT JOIN (
                  SELECT
                      user_pseudo_id
                  FROM
                      app_7777_7777.event_v2
                  WHERE
                      event_timestamp >= GETDATE () - INTERVAL '7 day'
                      AND event_name = 'purchase'
                  GROUP BY
                      user_pseudo_id
                  HAVING
                      AVG(CAST(custom_parameters.value.value AS FLOAT)) BETWEEN 50 AND 100
              ) hd ON e.user_pseudo_id = hd.user_pseudo_id
          WHERE
              hd.user_pseudo_id IS NULL
      `));
    });

    test('NUMBER_OF_DISTINCT_EVENT_PARAMETER metric type, preset metric parameter', () => {
      const segment: Segment = {
        ...baseInput,
        criteria: {
          operator: 'and',
          filterGroups: [
            {
              isRelativeDateRange: true,
              lastN: 2,
              timeUnit: 'week',
              operator: 'and',
              filters: [
                {
                  operator: 'or',
                  conditions: [
                    {
                      conditionType: SegmentFilterConditionType.UserEventCondition,
                      hasDone: true,
                      event: {
                        eventName: '_screen_view',
                      },
                      metricCondition: {
                        metricType: SegmentFilterEventMetricType.NUMBER_OF_DISTINCT_EVENT_PARAMETER,
                        conditionOperator: ExploreAnalyticsNumericOperators.GREATER_THAN,
                        inputValue: [10, 0],
                        parameterType: MetadataSource.PRESET,
                        parameterName: 'session_number',
                        dataType: MetadataValueType.INTEGER,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      };
      const userSegmentsSql = new UserSegmentsSql(segment);

      expect(format(userSegmentsSql.buildCriteriaStatement())).toEqual(format(`
          SELECT
            user_pseudo_id
          FROM
            app_7777_7777.event_v2
          WHERE
            event_timestamp >= GETDATE () - INTERVAL '2 week'
            AND event_name = '_screen_view'
          GROUP BY
            user_pseudo_id
          HAVING
            COUNT(DISTINCT session_number) > 10
      `));
    });
  });

  describe('build EventsInSequenceCondition sql', () => {
    test('events can be in different sessions, indirectly followed each other', () => {
      const segment: Segment = {
        ...baseInput,
        criteria: {
          operator: 'and',
          filterGroups: [
            {
              isRelativeDateRange: false,
              startDate: '2024-02-01',
              endDate: '2024-03-01',
              operator: 'and',
              filters: [
                {
                  operator: 'or',
                  conditions: [
                    {
                      conditionType: SegmentFilterConditionType.EventsInSequenceCondition,
                      hasDone: true,
                      events: [
                        {
                          eventName: '_app_start',
                          eventParameterConditions: [],
                        },
                        {
                          eventName: '_page_view',
                          eventParameterConditions: [
                            {
                              parameterType: MetadataSource.PRESET,
                              parameterName: 'page_view_page_url',
                              dataType: MetadataValueType.STRING,
                              conditionOperator: ExploreAnalyticsOperators.NOT_IN,
                              inputValue: ['/abc', '/def', '/xyz'],
                            },
                          ],
                          operator: 'and',
                        },
                        {
                          eventName: 'purchase',
                          eventParameterConditions: [
                            {
                              parameterType: MetadataSource.PRESET,
                              parameterName: 'app_exception_stack',
                              dataType: MetadataValueType.STRING,
                              conditionOperator: ExploreAnalyticsOperators.NULL,
                              inputValue: [],
                            },
                            {
                              parameterType: MetadataSource.CUSTOM,
                              parameterName: 'value',
                              dataType: MetadataValueType.FLOAT,
                              conditionOperator: ExploreAnalyticsOperators.IN,
                              inputValue: ['12.99', '198', '299'],
                            },
                          ],
                          operator: 'and',
                        },
                        {
                          eventName: '_app_end',
                          eventParameterConditions: [
                            {
                              parameterType: MetadataSource.PRESET,
                              parameterName: 'session_duration',
                              dataType: MetadataValueType.DOUBLE,
                              conditionOperator: ExploreAnalyticsOperators.GREATER_THAN,
                              inputValue: ['30000'],
                            },
                          ],
                          operator: 'and',
                        },
                      ],
                      isInOneSession: false,
                      isDirectlyFollow: false,
                    },
                  ],
                },
              ],
            },
          ],
        },
      };
      const userSegmentsSql = new UserSegmentsSql(segment);

      expect(format(userSegmentsSql.buildCriteriaStatement())).toEqual(format(`
          SELECT DISTINCT
              e1.user_pseudo_id
          FROM
              (
                  SELECT
                      user_pseudo_id,
                      session_id,
                      event_name,
                      ROW_NUMBER() OVER (PARTITION BY user_pseudo_id) AS seq_num
                  FROM
                      app_7777_7777.event_v2
                  WHERE
                      event_timestamp BETWEEN '2024-02-01' AND '2024-03-01'
                      AND (
                          event_name = '_app_start'
                          OR (event_name = '_page_view' AND (page_view_page_url NOT IN ('/abc', '/def', '/xyz')))
                          OR (event_name = 'purchase' AND (app_exception_stack IS NULL AND CAST(custom_parameters.value.value AS FLOAT) IN (12.99, 198, 299)))
                          OR (event_name = '_app_end' AND (session_duration > 30000))
                      )
              ) e1 JOIN (
                  SELECT
                      user_pseudo_id,
                      session_id,
                      event_name,
                      ROW_NUMBER() OVER (PARTITION BY user_pseudo_id) AS seq_num
                  FROM
                      app_7777_7777.event_v2
                  WHERE
                      event_timestamp BETWEEN '2024-02-01' AND '2024-03-01'
                    AND (
                      event_name = '_app_start'
                          OR (event_name = '_page_view' AND (page_view_page_url NOT IN ('/abc', '/def', '/xyz')))
                          OR (event_name = 'purchase' AND (app_exception_stack IS NULL AND CAST(custom_parameters.value.value AS FLOAT) IN (12.99, 198, 299)))
                          OR (event_name = '_app_end' AND (session_duration > 30000))
                      )
              ) e2 ON e1.user_pseudo_id = e2.user_pseudo_id AND e2.seq_num > e1.seq_num JOIN (
                  SELECT
                      user_pseudo_id,
                      session_id,
                      event_name,
                      ROW_NUMBER() OVER (PARTITION BY user_pseudo_id) AS seq_num
                  FROM
                      app_7777_7777.event_v2
                  WHERE
                      event_timestamp BETWEEN '2024-02-01' AND '2024-03-01'
                    AND (
                      event_name = '_app_start'
                          OR (event_name = '_page_view' AND (page_view_page_url NOT IN ('/abc', '/def', '/xyz')))
                          OR (event_name = 'purchase' AND (app_exception_stack IS NULL AND CAST(custom_parameters.value.value AS FLOAT) IN (12.99, 198, 299)))
                          OR (event_name = '_app_end' AND (session_duration > 30000))
                      )
              ) e3 ON e1.user_pseudo_id = e3.user_pseudo_id AND e3.seq_num > e2.seq_num JOIN (
                  SELECT
                      user_pseudo_id,
                      session_id,
                      event_name,
                      ROW_NUMBER() OVER (PARTITION BY user_pseudo_id) AS seq_num
                  FROM
                      app_7777_7777.event_v2
                  WHERE
                      event_timestamp BETWEEN '2024-02-01' AND '2024-03-01'
                    AND (
                      event_name = '_app_start'
                          OR (event_name = '_page_view' AND (page_view_page_url NOT IN ('/abc', '/def', '/xyz')))
                          OR (event_name = 'purchase' AND (app_exception_stack IS NULL AND CAST(custom_parameters.value.value AS FLOAT) IN (12.99, 198, 299)))
                          OR (event_name = '_app_end' AND (session_duration > 30000))
                      )
              ) e4 ON e1.user_pseudo_id = e4.user_pseudo_id AND e4.seq_num > e3.seq_num
          WHERE
            e1.event_name = '_app_start'
            AND e2.event_name = '_page_view'
            AND e3.event_name = 'purchase'
            AND e4.event_name = '_app_end'
      `));
    });

    test('events are in the same sessions, indirectly followed each other', () => {
      const segment: Segment = {
        ...baseInput,
        criteria: {
          operator: 'and',
          filterGroups: [
            {
              isRelativeDateRange: false,
              startDate: '2024-02-01',
              endDate: '2024-03-01',
              operator: 'and',
              filters: [
                {
                  operator: 'or',
                  conditions: [
                    {
                      conditionType: SegmentFilterConditionType.EventsInSequenceCondition,
                      hasDone: true,
                      events: [
                        {
                          eventName: '_app_start',
                          eventParameterConditions: [],
                        },
                        {
                          eventName: '_page_view',
                          eventParameterConditions: [
                            {
                              parameterType: MetadataSource.PRESET,
                              parameterName: 'page_view_page_url',
                              dataType: MetadataValueType.STRING,
                              conditionOperator: ExploreAnalyticsOperators.NOT_IN,
                              inputValue: ['/abc', '/def', '/xyz'],
                            },
                          ],
                          operator: 'and',
                        },
                        {
                          eventName: 'purchase',
                          eventParameterConditions: [
                            {
                              parameterType: MetadataSource.PRESET,
                              parameterName: 'app_exception_stack',
                              dataType: MetadataValueType.STRING,
                              conditionOperator: ExploreAnalyticsOperators.NULL,
                              inputValue: [],
                            },
                            {
                              parameterType: MetadataSource.CUSTOM,
                              parameterName: 'value',
                              dataType: MetadataValueType.FLOAT,
                              conditionOperator: ExploreAnalyticsOperators.IN,
                              inputValue: ['12.99', '198', '299'],
                            },
                          ],
                          operator: 'and',
                        },
                        {
                          eventName: '_app_end',
                          eventParameterConditions: [
                            {
                              parameterType: MetadataSource.PRESET,
                              parameterName: 'session_duration',
                              dataType: MetadataValueType.DOUBLE,
                              conditionOperator: ExploreAnalyticsOperators.GREATER_THAN,
                              inputValue: ['30000'],
                            },
                          ],
                          operator: 'and',
                        },
                      ],
                      isInOneSession: true,
                      isDirectlyFollow: false,
                    },
                  ],
                },
              ],
            },
          ],
        },
      };
      const userSegmentsSql = new UserSegmentsSql(segment);

      expect(format(userSegmentsSql.buildCriteriaStatement())).toEqual(format(`
          SELECT DISTINCT
              e1.user_pseudo_id
          FROM
              (
                  SELECT
                      user_pseudo_id,
                      session_id,
                      event_name,
                      ROW_NUMBER() OVER (PARTITION BY session_id) AS seq_num
                  FROM
                      app_7777_7777.event_v2
                  WHERE
                      event_timestamp BETWEEN '2024-02-01' AND '2024-03-01'
                    AND (
                      event_name = '_app_start'
                          OR (event_name = '_page_view' AND (page_view_page_url NOT IN ('/abc', '/def', '/xyz')))
                          OR (event_name = 'purchase' AND (app_exception_stack IS NULL AND CAST(custom_parameters.value.value AS FLOAT) IN (12.99, 198, 299)))
                          OR (event_name = '_app_end' AND (session_duration > 30000))
                      )
              ) e1 JOIN (
                  SELECT
                      user_pseudo_id,
                      session_id,
                      event_name,
                      ROW_NUMBER() OVER (PARTITION BY session_id) AS seq_num
                  FROM
                      app_7777_7777.event_v2
                  WHERE
                      event_timestamp BETWEEN '2024-02-01' AND '2024-03-01'
                    AND (
                      event_name = '_app_start'
                          OR (event_name = '_page_view' AND (page_view_page_url NOT IN ('/abc', '/def', '/xyz')))
                          OR (event_name = 'purchase' AND (app_exception_stack IS NULL AND CAST(custom_parameters.value.value AS FLOAT) IN (12.99, 198, 299)))
                          OR (event_name = '_app_end' AND (session_duration > 30000))
                      )
              ) e2 ON e1.session_id = e2.session_id AND e2.seq_num > e1.seq_num JOIN (
                  SELECT
                      user_pseudo_id,
                      session_id,
                      event_name,
                      ROW_NUMBER() OVER (PARTITION BY session_id) AS seq_num
                  FROM
                      app_7777_7777.event_v2
                  WHERE
                      event_timestamp BETWEEN '2024-02-01' AND '2024-03-01'
                    AND (
                      event_name = '_app_start'
                          OR (event_name = '_page_view' AND (page_view_page_url NOT IN ('/abc', '/def', '/xyz')))
                          OR (event_name = 'purchase' AND (app_exception_stack IS NULL AND CAST(custom_parameters.value.value AS FLOAT) IN (12.99, 198, 299)))
                          OR (event_name = '_app_end' AND (session_duration > 30000))
                      )
              ) e3 ON e1.session_id = e3.session_id AND e3.seq_num > e2.seq_num JOIN (
                  SELECT
                      user_pseudo_id,
                      session_id,
                      event_name,
                      ROW_NUMBER() OVER (PARTITION BY session_id) AS seq_num
                  FROM
                      app_7777_7777.event_v2
                  WHERE
                      event_timestamp BETWEEN '2024-02-01' AND '2024-03-01'
                    AND (
                      event_name = '_app_start'
                          OR (event_name = '_page_view' AND (page_view_page_url NOT IN ('/abc', '/def', '/xyz')))
                          OR (event_name = 'purchase' AND (app_exception_stack IS NULL AND CAST(custom_parameters.value.value AS FLOAT) IN (12.99, 198, 299)))
                          OR (event_name = '_app_end' AND (session_duration > 30000))
                      )
              ) e4 ON e1.session_id = e4.session_id AND e4.seq_num > e3.seq_num
          WHERE
            e1.event_name = '_app_start'
            AND e2.event_name = '_page_view'
            AND e3.event_name = 'purchase'
            AND e4.event_name = '_app_end'
      `));
    });

    test('events can be in different sessions, directly followed each other', () => {
      const segment: Segment = {
        ...baseInput,
        criteria: {
          operator: 'and',
          filterGroups: [
            {
              isRelativeDateRange: false,
              startDate: '2024-02-01',
              endDate: '2024-03-01',
              operator: 'and',
              filters: [
                {
                  operator: 'or',
                  conditions: [
                    {
                      conditionType: SegmentFilterConditionType.EventsInSequenceCondition,
                      hasDone: true,
                      events: [
                        {
                          eventName: '_app_start',
                          eventParameterConditions: [],
                        },
                        {
                          eventName: '_page_view',
                          eventParameterConditions: [
                            {
                              parameterType: MetadataSource.PRESET,
                              parameterName: 'page_view_page_url',
                              dataType: MetadataValueType.STRING,
                              conditionOperator: ExploreAnalyticsOperators.NOT_IN,
                              inputValue: ['/abc', '/def', '/xyz'],
                            },
                          ],
                          operator: 'and',
                        },
                        {
                          eventName: 'purchase',
                          eventParameterConditions: [
                            {
                              parameterType: MetadataSource.PRESET,
                              parameterName: 'app_exception_stack',
                              dataType: MetadataValueType.STRING,
                              conditionOperator: ExploreAnalyticsOperators.NULL,
                              inputValue: [],
                            },
                            {
                              parameterType: MetadataSource.CUSTOM,
                              parameterName: 'value',
                              dataType: MetadataValueType.FLOAT,
                              conditionOperator: ExploreAnalyticsOperators.IN,
                              inputValue: ['12.99', '198', '299'],
                            },
                          ],
                          operator: 'and',
                        },
                        {
                          eventName: '_app_end',
                          eventParameterConditions: [
                            {
                              parameterType: MetadataSource.PRESET,
                              parameterName: 'session_duration',
                              dataType: MetadataValueType.DOUBLE,
                              conditionOperator: ExploreAnalyticsOperators.GREATER_THAN,
                              inputValue: ['30000'],
                            },
                          ],
                          operator: 'and',
                        },
                      ],
                      isInOneSession: false,
                      isDirectlyFollow: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
      };
      const userSegmentsSql = new UserSegmentsSql(segment);

      expect(format(userSegmentsSql.buildCriteriaStatement())).toEqual(format(`
          SELECT DISTINCT
              e1.user_pseudo_id
          FROM
              (
                  SELECT
                      user_pseudo_id,
                      session_id,
                      event_name,
                      ROW_NUMBER() OVER (PARTITION BY user_pseudo_id) AS seq_num
                  FROM
                      app_7777_7777.event_v2
                  WHERE
                      event_timestamp BETWEEN '2024-02-01' AND '2024-03-01'
                    AND (
                      event_name = '_app_start'
                          OR (event_name = '_page_view' AND (page_view_page_url NOT IN ('/abc', '/def', '/xyz')))
                          OR (event_name = 'purchase' AND (app_exception_stack IS NULL AND CAST(custom_parameters.value.value AS FLOAT) IN (12.99, 198, 299)))
                          OR (event_name = '_app_end' AND (session_duration > 30000))
                      )
              ) e1 JOIN (
                  SELECT
                      user_pseudo_id,
                      session_id,
                      event_name,
                      ROW_NUMBER() OVER (PARTITION BY user_pseudo_id) AS seq_num
                  FROM
                      app_7777_7777.event_v2
                  WHERE
                      event_timestamp BETWEEN '2024-02-01' AND '2024-03-01'
                    AND (
                      event_name = '_app_start'
                          OR (event_name = '_page_view' AND (page_view_page_url NOT IN ('/abc', '/def', '/xyz')))
                          OR (event_name = 'purchase' AND (app_exception_stack IS NULL AND CAST(custom_parameters.value.value AS FLOAT) IN (12.99, 198, 299)))
                          OR (event_name = '_app_end' AND (session_duration > 30000))
                      )
              ) e2 ON e1.user_pseudo_id = e2.user_pseudo_id AND e2.seq_num = e1.seq_num + 1 JOIN (
                  SELECT
                      user_pseudo_id,
                      session_id,
                      event_name,
                      ROW_NUMBER() OVER (PARTITION BY user_pseudo_id) AS seq_num
                  FROM
                      app_7777_7777.event_v2
                  WHERE
                      event_timestamp BETWEEN '2024-02-01' AND '2024-03-01'
                    AND (
                      event_name = '_app_start'
                          OR (event_name = '_page_view' AND (page_view_page_url NOT IN ('/abc', '/def', '/xyz')))
                          OR (event_name = 'purchase' AND (app_exception_stack IS NULL AND CAST(custom_parameters.value.value AS FLOAT) IN (12.99, 198, 299)))
                          OR (event_name = '_app_end' AND (session_duration > 30000))
                      )
              ) e3 ON e1.user_pseudo_id = e3.user_pseudo_id AND e3.seq_num = e2.seq_num + 1 JOIN (
                  SELECT
                      user_pseudo_id,
                      session_id,
                      event_name,
                      ROW_NUMBER() OVER (PARTITION BY user_pseudo_id) AS seq_num
                  FROM
                      app_7777_7777.event_v2
                  WHERE
                      event_timestamp BETWEEN '2024-02-01' AND '2024-03-01'
                    AND (
                      event_name = '_app_start'
                          OR (event_name = '_page_view' AND (page_view_page_url NOT IN ('/abc', '/def', '/xyz')))
                          OR (event_name = 'purchase' AND (app_exception_stack IS NULL AND CAST(custom_parameters.value.value AS FLOAT) IN (12.99, 198, 299)))
                          OR (event_name = '_app_end' AND (session_duration > 30000))
                      )
              ) e4 ON e1.user_pseudo_id = e4.user_pseudo_id AND e4.seq_num = e3.seq_num + 1
          WHERE
            e1.event_name = '_app_start'
            AND e2.event_name = '_page_view'
            AND e3.event_name = 'purchase'
            AND e4.event_name = '_app_end'
      `));
    });

    test('events are in the same sessions, directly followed each other', () => {
      const segment: Segment = {
        ...baseInput,
        criteria: {
          operator: 'and',
          filterGroups: [
            {
              isRelativeDateRange: false,
              startDate: '2024-02-01',
              endDate: '2024-03-01',
              operator: 'and',
              filters: [
                {
                  operator: 'or',
                  conditions: [
                    {
                      conditionType: SegmentFilterConditionType.EventsInSequenceCondition,
                      hasDone: true,
                      events: [
                        {
                          eventName: '_app_start',
                          eventParameterConditions: [],
                        },
                        {
                          eventName: '_page_view',
                          eventParameterConditions: [
                            {
                              parameterType: MetadataSource.PRESET,
                              parameterName: 'page_view_page_url',
                              dataType: MetadataValueType.STRING,
                              conditionOperator: ExploreAnalyticsOperators.NOT_IN,
                              inputValue: ['/abc', '/def', '/xyz'],
                            },
                          ],
                          operator: 'and',
                        },
                        {
                          eventName: 'purchase',
                          eventParameterConditions: [
                            {
                              parameterType: MetadataSource.PRESET,
                              parameterName: 'app_exception_stack',
                              dataType: MetadataValueType.STRING,
                              conditionOperator: ExploreAnalyticsOperators.NULL,
                              inputValue: [],
                            },
                            {
                              parameterType: MetadataSource.CUSTOM,
                              parameterName: 'value',
                              dataType: MetadataValueType.FLOAT,
                              conditionOperator: ExploreAnalyticsOperators.IN,
                              inputValue: ['12.99', '198', '299'],
                            },
                          ],
                          operator: 'and',
                        },
                        {
                          eventName: '_app_end',
                          eventParameterConditions: [
                            {
                              parameterType: MetadataSource.PRESET,
                              parameterName: 'session_duration',
                              dataType: MetadataValueType.DOUBLE,
                              conditionOperator: ExploreAnalyticsOperators.GREATER_THAN,
                              inputValue: ['30000'],
                            },
                          ],
                          operator: 'and',
                        },
                      ],
                      isInOneSession: true,
                      isDirectlyFollow: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
      };
      const userSegmentsSql = new UserSegmentsSql(segment);

      expect(format(userSegmentsSql.buildCriteriaStatement())).toEqual(format(`
          SELECT DISTINCT
              e1.user_pseudo_id
          FROM
              (
                  SELECT
                      user_pseudo_id,
                      session_id,
                      event_name,
                      ROW_NUMBER() OVER (PARTITION BY session_id) AS seq_num
                  FROM
                      app_7777_7777.event_v2
                  WHERE
                      event_timestamp BETWEEN '2024-02-01' AND '2024-03-01'
                    AND (
                      event_name = '_app_start'
                          OR (event_name = '_page_view' AND (page_view_page_url NOT IN ('/abc', '/def', '/xyz')))
                          OR (event_name = 'purchase' AND (app_exception_stack IS NULL AND CAST(custom_parameters.value.value AS FLOAT) IN (12.99, 198, 299)))
                          OR (event_name = '_app_end' AND (session_duration > 30000))
                      )
              ) e1 JOIN (
                  SELECT
                      user_pseudo_id,
                      session_id,
                      event_name,
                      ROW_NUMBER() OVER (PARTITION BY session_id) AS seq_num
                  FROM
                      app_7777_7777.event_v2
                  WHERE
                      event_timestamp BETWEEN '2024-02-01' AND '2024-03-01'
                    AND (
                      event_name = '_app_start'
                          OR (event_name = '_page_view' AND (page_view_page_url NOT IN ('/abc', '/def', '/xyz')))
                          OR (event_name = 'purchase' AND (app_exception_stack IS NULL AND CAST(custom_parameters.value.value AS FLOAT) IN (12.99, 198, 299)))
                          OR (event_name = '_app_end' AND (session_duration > 30000))
                      )
              ) e2 ON e1.session_id = e2.session_id AND e2.seq_num = e1.seq_num + 1 JOIN (
                  SELECT
                      user_pseudo_id,
                      session_id,
                      event_name,
                      ROW_NUMBER() OVER (PARTITION BY session_id) AS seq_num
                  FROM
                      app_7777_7777.event_v2
                  WHERE
                      event_timestamp BETWEEN '2024-02-01' AND '2024-03-01'
                    AND (
                      event_name = '_app_start'
                          OR (event_name = '_page_view' AND (page_view_page_url NOT IN ('/abc', '/def', '/xyz')))
                          OR (event_name = 'purchase' AND (app_exception_stack IS NULL AND CAST(custom_parameters.value.value AS FLOAT) IN (12.99, 198, 299)))
                          OR (event_name = '_app_end' AND (session_duration > 30000))
                      )
              ) e3 ON e1.session_id = e3.session_id AND e3.seq_num = e2.seq_num + 1 JOIN (
                  SELECT
                      user_pseudo_id,
                      session_id,
                      event_name,
                      ROW_NUMBER() OVER (PARTITION BY session_id) AS seq_num
                  FROM
                      app_7777_7777.event_v2
                  WHERE
                      event_timestamp BETWEEN '2024-02-01' AND '2024-03-01'
                    AND (
                      event_name = '_app_start'
                          OR (event_name = '_page_view' AND (page_view_page_url NOT IN ('/abc', '/def', '/xyz')))
                          OR (event_name = 'purchase' AND (app_exception_stack IS NULL AND CAST(custom_parameters.value.value AS FLOAT) IN (12.99, 198, 299)))
                          OR (event_name = '_app_end' AND (session_duration > 30000))
                      )
              ) e4 ON e1.session_id = e4.session_id AND e4.seq_num = e3.seq_num + 1
          WHERE
              e1.event_name = '_app_start'
            AND e2.event_name = '_page_view'
            AND e3.event_name = 'purchase'
            AND e4.event_name = '_app_end'
      `));
    });
  });

  describe('build UserAttributeCondition sql', () => {
    test('user has preset attribute', () => {
      const segment: Segment = {
        ...baseInput,
        criteria: {
          operator: 'and',
          filterGroups: [
            {
              isRelativeDateRange: false,
              operator: 'and',
              filters: [
                {
                  operator: 'or',
                  conditions: [
                    {
                      conditionType: SegmentFilterConditionType.UserAttributeCondition,
                      hasAttribute: true,
                      attributeCondition: {
                        parameterType: MetadataSource.PRESET,
                        parameterName: 'first_app_install_source',
                        conditionOperator: ExploreAnalyticsOperators.IN,
                        inputValue: ['Google play', 'Galaxy Store'],
                        dataType: MetadataValueType.STRING,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      };
      const userSegmentsSql = new UserSegmentsSql(segment);

      expect(format(userSegmentsSql.buildCriteriaStatement())).toEqual(format(`
          SELECT DISTINCT
              user_pseudo_id
          FROM
              app_7777_7777.user_v2
          WHERE
              first_app_install_source IN ('Google play', 'Galaxy Store')
      `));
    });

    test('user does not have custom attribute', () => {
      const segment: Segment = {
        ...baseInput,
        criteria: {
          operator: 'and',
          filterGroups: [
            {
              isRelativeDateRange: false,
              startDate: '2024-03-01',
              endDate: '2024-03-10',
              operator: 'and',
              filters: [
                {
                  operator: 'or',
                  conditions: [
                    {
                      conditionType: SegmentFilterConditionType.UserAttributeCondition,
                      hasAttribute: false,
                      attributeCondition: {
                        parameterType: MetadataSource.CUSTOM,
                        parameterName: 'age',
                        conditionOperator: ExploreAnalyticsOperators.GREATER_THAN,
                        inputValue: ['23'],
                        dataType: MetadataValueType.INTEGER,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      };
      const userSegmentsSql = new UserSegmentsSql(segment);

      expect(format(userSegmentsSql.buildCriteriaStatement())).toEqual(format(`
          SELECT
              DISTINCT u.user_pseudo_id
          FROM
              app_7777_7777.user_v2 u LEFT JOIN (
                SELECT 
                    DISTINCT user_pseudo_id
                FROM
                    app_7777_7777.user_v2
                WHERE
                    CAST(user_properties.age.value AS FLOAT) > 23
              ) uha ON u.user_pseudo_id = uha.user_pseudo_id
          WHERE
              uha.user_pseudo_id IS NULL
      `));
    });
  });

  describe('build UserInSegmentCondition sql', () => {
    test('user is in segment', () => {
      const segment: Segment = {
        ...baseInput,
        criteria: {
          operator: 'and',
          filterGroups: [
            {
              isRelativeDateRange: false,
              startDate: '2024-03-01',
              endDate: '2024-03-10',
              operator: 'and',
              filters: [
                {
                  operator: 'or',
                  conditions: [
                    {
                      conditionType: SegmentFilterConditionType.UserInSegmentCondition,
                      isInSegment: true,
                      segmentId: 'segment-uuid',
                    },
                  ],
                },
              ],
            },
          ],
        },
      };
      const userSegmentsSql = new UserSegmentsSql(segment);

      expect(format(userSegmentsSql.buildCriteriaStatement())).toEqual(format(`
          SELECT
              DISTINCT user_pseudo_id
          FROM
              app_7777_7777.user_v2
          WHERE
              user_pseudo_id IN (
                  SELECT
                      user_id
                  FROM
                      app_7777_7777.segment_user
                  WHERE
                      segment_id = 'segment-uuid'
              )
      `));
    });

    test('user is not in segment', () => {
      const segment: Segment = {
        ...baseInput,
        criteria: {
          operator: 'and',
          filterGroups: [
            {
              isRelativeDateRange: false,
              operator: 'and',
              filters: [
                {
                  operator: 'or',
                  conditions: [
                    {
                      conditionType: SegmentFilterConditionType.UserInSegmentCondition,
                      isInSegment: false,
                      segmentId: 'segment-uuid',
                    },
                  ],
                },
              ],
            },
          ],
        },
      };
      const userSegmentsSql = new UserSegmentsSql(segment);

      expect(format(userSegmentsSql.buildCriteriaStatement())).toEqual(format(`
          SELECT
              DISTINCT user_pseudo_id
          FROM
              app_7777_7777.user_v2
          WHERE
              user_pseudo_id NOT IN (
                  SELECT
                      user_id
                  FROM
                      app_7777_7777.segment_user
                  WHERE
                      segment_id = 'segment-uuid'
              )
      `));
    });
  });

  describe('build complex sql', () => {
    test('cover all conditions', () => {
      const segment: Segment = {
        ...baseInput,
        criteria: {
          operator: 'and',
          filterGroups: [
            {
              isRelativeDateRange: false,
              startDate: '2024-02-01',
              endDate: '2024-03-10',
              operator: 'and',
              filters: [
                {
                  operator: 'or',
                  conditions: [
                    {
                      conditionType: SegmentFilterConditionType.UserEventCondition,
                      hasDone: true,
                      event: {
                        eventName: '_app_start',
                        eventParameterConditions: [
                          {
                            parameterType: MetadataSource.PRESET,
                            parameterName: 'user_first_touch_time_msec',
                            conditionOperator: ExploreAnalyticsOperators.GREATER_THAN,
                            inputValue: [
                              '1000000',
                            ],
                            dataType: MetadataValueType.NUMBER,
                          },
                          {
                            parameterType: MetadataSource.CUSTOM,
                            parameterName: 'currency',
                            conditionOperator: ExploreAnalyticsOperators.CONTAINS,
                            inputValue: [
                              'US',
                            ],
                            dataType: MetadataValueType.STRING,
                          },
                        ],
                        operator: 'and',
                      },
                      metricCondition: {
                        metricType: SegmentFilterEventMetricType.NUMBER_OF_TIMES_PER_DAY,
                        conditionOperator: ExploreAnalyticsNumericOperators.BETWEEN,
                        inputValue: [2, 5],
                      },
                    },
                    {
                      conditionType: SegmentFilterConditionType.UserEventCondition,
                      hasDone: false,
                      event: {
                        eventName: 'purchase',
                      },
                      metricCondition: {
                        metricType: SegmentFilterEventMetricType.MAX_OF_EVENT_PARAMETER,
                        conditionOperator: ExploreAnalyticsNumericOperators.GREATER_THAN,
                        inputValue: [2000, 0],
                        parameterType: MetadataSource.CUSTOM,
                        parameterName: 'value',
                        dataType: MetadataValueType.NUMBER,
                      },
                    },
                  ],
                },
                {
                  operator: 'or',
                  conditions: [
                    {
                      conditionType: SegmentFilterConditionType.EventsInSequenceCondition,
                      hasDone: true,
                      events: [
                        {
                          eventName: '_app_start',
                          eventParameterConditions: [],
                        },
                        {
                          eventName: '_page_view',
                          eventParameterConditions: [
                            {
                              parameterType: MetadataSource.PRESET,
                              parameterName: 'page_view_page_url',
                              dataType: MetadataValueType.STRING,
                              conditionOperator: ExploreAnalyticsOperators.NOT_IN,
                              inputValue: ['/abc', '/def', '/xyz'],
                            },
                          ],
                          operator: 'and',
                        },
                        {
                          eventName: 'purchase',
                          eventParameterConditions: [
                            {
                              parameterType: MetadataSource.PRESET,
                              parameterName: 'app_exception_stack',
                              dataType: MetadataValueType.STRING,
                              conditionOperator: ExploreAnalyticsOperators.NULL,
                              inputValue: [],
                            },
                            {
                              parameterType: MetadataSource.CUSTOM,
                              parameterName: 'value',
                              dataType: MetadataValueType.FLOAT,
                              conditionOperator: ExploreAnalyticsOperators.IN,
                              inputValue: ['12.99', '198', '299'],
                            },
                          ],
                          operator: 'and',
                        },
                        {
                          eventName: '_app_end',
                          eventParameterConditions: [
                            {
                              parameterType: MetadataSource.PRESET,
                              parameterName: 'session_duration',
                              dataType: MetadataValueType.DOUBLE,
                              conditionOperator: ExploreAnalyticsOperators.GREATER_THAN,
                              inputValue: ['30000'],
                            },
                          ],
                          operator: 'and',
                        },
                      ],
                      isInOneSession: true,
                      isDirectlyFollow: false,
                    },
                  ],
                },
              ],
            },
            {
              isRelativeDateRange: false,
              operator: 'and',
              filters: [
                {
                  operator: 'or',
                  conditions: [
                    {
                      conditionType: SegmentFilterConditionType.UserAttributeCondition,
                      hasAttribute: true,
                      attributeCondition: {
                        parameterType: MetadataSource.PRESET,
                        parameterName: 'first_app_install_source',
                        conditionOperator: ExploreAnalyticsOperators.IN,
                        inputValue: ['Google play', 'Galaxy Store'],
                        dataType: MetadataValueType.STRING,
                      },
                    },
                  ],
                },
                {
                  operator: 'or',
                  conditions: [
                    {
                      conditionType: SegmentFilterConditionType.UserInSegmentCondition,
                      isInSegment: false,
                      segmentId: 'segment-uuid',
                    },
                  ],
                },
              ],
            },
          ],
        },
      };
      const userSegmentsSql = new UserSegmentsSql(segment);

      expect(format(userSegmentsSql.buildCriteriaStatement())).toEqual(format(`
          SELECT DISTINCT
              user_pseudo_id
          FROM (
              SELECT
                  user_pseudo_id
              FROM (
                  SELECT
                      user_pseudo_id
                  FROM (
                      SELECT
                          user_pseudo_id
                      FROM (
                          SELECT
                              user_pseudo_id,
                              DATE (event_timestamp) AS event_date,
                              count(*) AS daily_event_count
                          FROM
                              app_7777_7777.event_v2
                          WHERE
                              event_timestamp BETWEEN '2024-02-01' AND '2024-03-10'
                              AND (event_name = '_app_start' AND (user_first_touch_time_msec > 1000000 AND (custom_parameters.currency.value LIKE '%US%')))
                          GROUP BY
                              user_pseudo_id,
                              DATE (event_timestamp)
                          HAVING
                              daily_event_count BETWEEN 2 AND 5
                      )
                      GROUP BY
                          user_pseudo_id
                      HAVING
                          COUNT(*) = DATE ('2024-03-10') - DATE ('2024-02-01')
                      UNION
                      SELECT
                          DISTINCT e.user_pseudo_id
                      FROM
                          app_7777_7777.event_v2 e LEFT JOIN (
                          SELECT
                              user_pseudo_id
                          FROM
                              app_7777_7777.event_v2
                          WHERE
                              event_timestamp BETWEEN '2024-02-01' AND '2024-03-10' AND event_name = 'purchase'
                          GROUP BY
                              user_pseudo_id
                          HAVING
                              MAX(CAST(custom_parameters.value.value AS FLOAT)) > 2000
                      ) hd ON e.user_pseudo_id = hd.user_pseudo_id
                      WHERE
                          hd.user_pseudo_id IS NULL
                  )
                  INTERSECT
                  SELECT
                      DISTINCT e1.user_pseudo_id
                  FROM
                      (
                          SELECT
                              user_pseudo_id,
                              session_id,
                              event_name,
                              ROW_NUMBER() OVER (PARTITION BY session_id) AS seq_num
                          FROM
                              app_7777_7777.event_v2
                          WHERE
                              event_timestamp BETWEEN '2024-02-01' AND '2024-03-10'
                              AND (
                                  event_name = '_app_start'
                                  OR (event_name = '_page_view' AND (page_view_page_url NOT IN ('/abc', '/def', '/xyz')))
                                  OR (event_name = 'purchase' AND (app_exception_stack IS NULL AND CAST(custom_parameters.value.value AS FLOAT) IN (12.99, 198, 299)))
                                  OR (event_name = '_app_end' AND (session_duration > 30000))
                              )
                      ) e1 JOIN (
                          SELECT
                              user_pseudo_id,
                              session_id,
                              event_name,
                              ROW_NUMBER() OVER (PARTITION BY session_id) AS seq_num
                          FROM
                              app_7777_7777.event_v2
                          WHERE
                              event_timestamp BETWEEN '2024-02-01' AND '2024-03-10'
                            AND (
                                event_name = '_app_start'
                                OR (event_name = '_page_view' AND (page_view_page_url NOT IN ('/abc', '/def', '/xyz')))
                                OR (event_name = 'purchase' AND (app_exception_stack IS NULL AND CAST(custom_parameters.value.value AS FLOAT) IN (12.99, 198, 299)))
                                OR (event_name = '_app_end' AND (session_duration > 30000))
                            )
                      ) e2 ON e1.session_id = e2.session_id AND e2.seq_num > e1.seq_num JOIN (
                          SELECT
                              user_pseudo_id,
                              session_id,
                              event_name,
                              ROW_NUMBER() OVER (PARTITION BY session_id) AS seq_num
                          FROM
                              app_7777_7777.event_v2
                          WHERE
                              event_timestamp BETWEEN '2024-02-01' AND '2024-03-10'
                            AND (
                                event_name = '_app_start'
                                OR (event_name = '_page_view' AND (page_view_page_url NOT IN ('/abc', '/def', '/xyz')))
                                OR (event_name = 'purchase' AND (app_exception_stack IS NULL AND CAST(custom_parameters.value.value AS FLOAT) IN (12.99, 198, 299)))
                                OR (event_name = '_app_end' AND (session_duration > 30000))
                            )
                      ) e3 ON e1.session_id = e3.session_id AND e3.seq_num > e2.seq_num JOIN (
                          SELECT
                              user_pseudo_id,
                              session_id,
                              event_name,
                              ROW_NUMBER() OVER (PARTITION BY session_id) AS seq_num
                          FROM
                              app_7777_7777.event_v2
                          WHERE
                              event_timestamp BETWEEN '2024-02-01' AND '2024-03-10'
                            AND (
                                event_name = '_app_start'
                                OR (event_name = '_page_view' AND (page_view_page_url NOT IN ('/abc', '/def', '/xyz')))
                                OR (event_name = 'purchase' AND (app_exception_stack IS NULL AND CAST(custom_parameters.value.value AS FLOAT) IN (12.99, 198, 299)))
                                OR (event_name = '_app_end' AND (session_duration > 30000))
                            )
                      ) e4 ON e1.session_id = e4.session_id AND e4.seq_num > e3.seq_num
                  WHERE
                      e1.event_name = '_app_start'
                      AND e2.event_name = '_page_view'
                      AND e3.event_name = 'purchase'
                      AND e4.event_name = '_app_end'
              )
              INTERSECT
              SELECT
                  user_pseudo_id
              FROM (
                  SELECT 
                      DISTINCT user_pseudo_id
                  FROM
                      app_7777_7777.user_v2
                  WHERE
                      first_app_install_source IN ('Google play', 'Galaxy Store')
                  INTERSECT
                  SELECT
                      DISTINCT user_pseudo_id
                  FROM
                      app_7777_7777.user_v2
                  WHERE
                      user_pseudo_id NOT IN (
                          SELECT
                              user_id
                          FROM
                              app_7777_7777.segment_user
                          WHERE
                              segment_id = 'segment-uuid'
                      )
              )
          )
      `));
    });
  });
});