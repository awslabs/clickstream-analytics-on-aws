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
  EventsInSequenceCondition,
  EventWithParameter,
  ExploreAnalyticsNumericOperators,
  ExploreAnalyticsOperators,
  MetadataSource,
  MetadataValueType,
  ParameterCondition,
  Segment,
  SegmentFilter,
  SegmentFilterConditionType,
  SegmentFilterEventMetricType,
  SegmentFilterGroup,
  UserAttributeCondition,
  UserEventCondition,
  UserInSegmentCondition,
  UserSegmentFilterCondition,
} from '@aws/clickstream-base-lib';

const EVENT_TABLE = 'event_v2';
const EVENT_CUSTOM_PARAM_COLUMN = 'custom_parameters';
const USER_TABLE = 'user_v2';
const USER_CUSTOM_ATTR_COLUMN = 'user_properties';
const SEGMENT_USER_TABLE = 'segment_user';
type ParameterSourceType = 'EventParameter' | 'UserProperty';

export class UserSegmentsSql {
  private readonly segment: Segment;

  constructor(segment: Segment) {
    this.segment = segment;
  }

  /**
   * Build sql query based on user segment settings.
   * There are three level segment criteria: group, filter and condition.
   * This method is to build top level criteria sql query with a few group level sql statements.
   */
  public buildCriteriaStatement() {
    const criteria = this.segment.criteria;
    const groupStatements = criteria.filterGroups.map(group => this.buildGroupLevelStatement(group));

    if (groupStatements.length === 1) {
      return groupStatements[0];
    }

    return `SELECT DISTINCT user_pseudo_id
            FROM (${criteria.operator === 'and' ? groupStatements.join(' INTERSECT ') : groupStatements.join(' UNION ')})`;
  };

  /**
   * Build group level sql query with a few filter level sql statements
   * @param group
   * @private
   */
  private buildGroupLevelStatement(group: SegmentFilterGroup) {
    const filterStatements = group.filters.map(filter => {
      return this.buildFilterLevelStatement(group, filter);
    });

    if (filterStatements.length === 1) {
      return filterStatements[0];
    }

    return `SELECT user_pseudo_id
            FROM (${group.operator === 'and' ? filterStatements.join(' INTERSECT ') : filterStatements.join(' UNION ')})`;
  }

  /**
   * Build filter level sql query with a few condition level sql statements
   * @param group
   * @param filter
   * @private
   */
  private buildFilterLevelStatement(group: SegmentFilterGroup, filter: SegmentFilter) {
    const conditionStatements = filter.conditions.map(condition => this.buildConditionLevelStatement(group, condition));

    if (conditionStatements.length === 1) {
      return conditionStatements[0];
    }

    return `SELECT user_pseudo_id
            FROM (${filter.operator === 'and' ? conditionStatements.join(' INTERSECT ') : conditionStatements.join(' UNION ')})`;
  }

  /**
   * Build condition level sql query statements.
   * There are four types of condition: UserEventCondition, EventsInSequenceCondition, UserAttributeCondition, UserInSegmentCondition
   * @param group
   * @param condition
   * @private
   */
  private buildConditionLevelStatement(group: SegmentFilterGroup, condition: UserSegmentFilterCondition) {
    switch (condition.conditionType) {
      case SegmentFilterConditionType.UserEventCondition:
        return this.buildUserEventConditionStatement(group, condition);
      case SegmentFilterConditionType.EventsInSequenceCondition:
        return this.buildEventsInSequenceConditionStatement(group, condition);
      case SegmentFilterConditionType.UserAttributeCondition:
        return this.buildUserAttributeConditionStatement(condition);
      case SegmentFilterConditionType.UserInSegmentCondition:
        return this.buildUserInSegmentConditionStatement(condition);
      default:
        return '';
    }
  }

  /**
   * Build UserEventCondition sql query statement.
   * The query statement break down:
   * 1) Query should perform date range filter if configured in SegmentFilterGroup
   * 2) Event with multiple Preset or Custom parameters
   * 3) Metric condition can apply to the event itself, e.g. total number of the specific event,
   *    or to particular event parameter, e.g. average of one event's parameter values
   * 4) User HAS done and user HAS NOT done
   * @param group
   * @param condition
   * @private
   */
  private buildUserEventConditionStatement(group: SegmentFilterGroup, condition: UserEventCondition) {
    const table = this.segment.appId + '.' + EVENT_TABLE;
    const whereClause = this.composeDateRangeClause(group) + ' AND ' + this.composeEventWithParamClause(condition.event);

    // Metric condition inputValue is always a number array with two elements
    // Use two numbers only when the operator is 'between'
    const metricCondition = condition.metricCondition;
    const metricInputValueClause = metricCondition.conditionOperator === ExploreAnalyticsNumericOperators.BETWEEN ?
      `BETWEEN ${metricCondition.inputValue[0]} AND ${metricCondition.inputValue[1]}` : `${metricCondition.conditionOperator} ${metricCondition.inputValue[0]}`;
    const metricParamField = metricCondition.parameterType === MetadataSource.PRESET ?
      metricCondition.parameterName : `CAST(${EVENT_CUSTOM_PARAM_COLUMN}.${metricCondition.parameterName}.value AS FLOAT)`;

    let hasDone: string;
    switch (condition.metricCondition.metricType) {
      case SegmentFilterEventMetricType.NUMBER_OF_TOTAL:
        hasDone = `
            SELECT user_pseudo_id
            FROM ${table}
            WHERE ${whereClause}
            GROUP BY user_pseudo_id
            HAVING COUNT(*) ${metricInputValueClause}
        `;
        break;
      case SegmentFilterEventMetricType.NUMBER_OF_TIMES_PER_DAY:
        hasDone = `
            SELECT user_pseudo_id
            FROM (
                SELECT user_pseudo_id, DATE (event_timestamp) AS event_date, count(*) AS daily_event_count
                FROM ${table}
                WHERE ${whereClause}
                GROUP BY user_pseudo_id, DATE (event_timestamp)
                HAVING daily_event_count ${metricInputValueClause}
            )
            GROUP BY user_pseudo_id
            HAVING COUNT(*) = ${this.composeNumberOfDaysClause(group)}
        `;
        break;
      case SegmentFilterEventMetricType.NUMBER_OF_CONSECUTIVE_DAYS:
        hasDone = `
            SELECT DISTINCT user_pseudo_id
            FROM (
                SELECT user_pseudo_id, COUNT (*) AS consecutive_days_count
                FROM (
                    SELECT
                        user_pseudo_id,
                        DATEDIFF(day, ${this.getDateRangeStartDateClause(group)}, event_date) - ROW_NUMBER() OVER (PARTITION BY user_pseudo_id ORDER BY event_date) AS grp
                    FROM (
                        SELECT user_pseudo_id, DATE(event_timestamp) as event_date
                        FROM ${table}
                        WHERE ${whereClause}
                    )
                )
                GROUP BY user_pseudo_id, grp
            )
            WHERE consecutive_days_count ${metricInputValueClause}
        `;
        break;
      case SegmentFilterEventMetricType.NUMBER_OF_DAYS_HAVING_EVENT:
        hasDone = `
            SELECT user_pseudo_id
            FROM ${table}
            WHERE ${whereClause}
            GROUP BY user_pseudo_id
            HAVING COUNT(DISTINCT DATE (event_timestamp)) ${metricInputValueClause}
        `;
        break;
      case SegmentFilterEventMetricType.SUM_OF_EVENT_PARAMETER:
        hasDone = `
            SELECT user_pseudo_id
            FROM ${table}
            WHERE ${whereClause}
            GROUP BY user_pseudo_id
            HAVING SUM(${metricParamField}) ${metricInputValueClause}
        `;
        break;
      case SegmentFilterEventMetricType.MIN_OF_EVENT_PARAMETER:
        hasDone = `
            SELECT user_pseudo_id
            FROM ${table}
            WHERE ${whereClause}
            GROUP BY user_pseudo_id
            HAVING MIN(${metricParamField}) ${metricInputValueClause}
        `;
        break;
      case SegmentFilterEventMetricType.MAX_OF_EVENT_PARAMETER:
        hasDone = `
            SELECT user_pseudo_id
            FROM ${table}
            WHERE ${whereClause}
            GROUP BY user_pseudo_id
            HAVING MAX(${metricParamField}) ${metricInputValueClause}
        `;
        break;
      case SegmentFilterEventMetricType.AVG_OF_EVENT_PARAMETER:
        hasDone = `
            SELECT user_pseudo_id
            FROM ${table}
            WHERE ${whereClause}
            GROUP BY user_pseudo_id
            HAVING AVG(${metricParamField}) ${metricInputValueClause}
        `;
        break;
      case SegmentFilterEventMetricType.NUMBER_OF_DISTINCT_EVENT_PARAMETER:
        hasDone = `
            SELECT user_pseudo_id
            FROM ${table}
            WHERE ${whereClause}
            GROUP BY user_pseudo_id
            HAVING COUNT(DISTINCT ${metricParamField}) ${metricInputValueClause}
        `;
        break;
    }

    return condition.hasDone ? hasDone : `
        SELECT DISTINCT e.user_pseudo_id
        FROM ${table} e
                 LEFT JOIN (${hasDone}) hd ON e.user_pseudo_id = hd.user_pseudo_id
        WHERE hd.user_pseudo_id IS NULL
    `;
  }

  /**
   * Build EventsInSequenceCondition sql query statement
   * Events could be in the same session.
   * Events could be directly or indirectly followed each other.
   * Each event may have multiple parameters.
   * @param group
   * @param condition
   * @private
   */
  private buildEventsInSequenceConditionStatement(group: SegmentFilterGroup, condition: EventsInSequenceCondition) {
    const { events, isInOneSession, isDirectlyFollow } = condition;
    const table = this.segment.appId + '.' + EVENT_TABLE;
    const dateRangeClause = this.composeDateRangeClause(group);
    const eventsClause = events.map(event => (this.composeEventWithParamClause(event))).join(' OR ');
    const queryId = isInOneSession ? 'session_id' : 'user_pseudo_id';
    const filteredEvents = `
        SELECT user_pseudo_id, session_id, event_name, ROW_NUMBER() OVER (PARTITION BY ${queryId}) AS seq_num
        FROM ${table}
        WHERE ${dateRangeClause} AND (${eventsClause})
    `;
    const fromClause = events.map((_, index) => {
      if (index === 0) {
        return `(${filteredEvents}) e1`;
      } else {
        const seqCondition = isDirectlyFollow ? `e${index + 1}.seq_num = e${index}.seq_num + 1` : `e${index + 1}.seq_num > e${index}.seq_num`;

        return `(${filteredEvents}) e${index + 1} ON e1.${queryId} = e${index + 1}.${queryId} AND ${seqCondition}`;
      }
    }).join(' JOIN ');
    const whereClause = events.map((event, index) => (`e${index + 1}.event_name = '${event.eventName}'`)).join(' AND ');

    return `
        SELECT DISTINCT e1.user_pseudo_id
        FROM ${fromClause}
        WHERE ${whereClause}
    `;
  }

  /**
   * Build UserAttributeCondition sql query statement
   * @param condition
   * @private
   */
  private buildUserAttributeConditionStatement(condition: UserAttributeCondition) {
    const table = this.segment.appId + '.' + USER_TABLE;
    const userHasAttribute = `
        SELECT DISTINCT user_pseudo_id
        FROM ${table}
        WHERE ${this.composeParameterConditionClause(condition.attributeCondition, 'UserProperty')}
    `;

    return condition.hasAttribute ? userHasAttribute : `
        SELECT DISTINCT u.user_pseudo_id
        FROM ${table} u
                 LEFT JOIN (${userHasAttribute}) uha ON u.user_pseudo_id = uha.user_pseudo_id
        WHERE uha.user_pseudo_id IS NULL
    `;
  }

  /**
   * Build UserInSegmentCondition sql query statement
   * @param condition
   * @private
   */
  private buildUserInSegmentConditionStatement(condition: UserInSegmentCondition) {
    const userTable = this.segment.appId + '.' + USER_TABLE;
    const segmentTable = this.segment.appId + '.' + SEGMENT_USER_TABLE;
    return `
        SELECT DISTINCT user_pseudo_id
        FROM ${userTable}
        WHERE user_pseudo_id ${condition.isInSegment ? '' : 'NOT'} IN (
            SELECT user_id
            FROM ${segmentTable}
            WHERE segment_id = '${condition.segmentId}'
        )
    `;
  }

  /**
   * Compose date range clause from SegmentFilterGroup. Note that date range setting is optional.
   * @param group SegmentFilterGroup
   * @private
   */
  private composeDateRangeClause(group: SegmentFilterGroup) {
    const { isRelativeDateRange, startDate, endDate, lastN, timeUnit } = group;

    // Date range is optional
    if ((isRelativeDateRange && (lastN === undefined || timeUnit === undefined))
      || (!isRelativeDateRange && (startDate === undefined || endDate === undefined))) {
      return 'event_timestamp >= GETDATE() - INTERVAL \'7 day\''; // last 7 days by default
    }

    if (isRelativeDateRange) {
      return `event_timestamp >= GETDATE() - INTERVAL '${lastN} ${timeUnit}'`;
    } else {
      return `event_timestamp BETWEEN '${startDate}' AND '${endDate}'`;
    }
  }

  /**
   * Compose number of days clause from SegmentFilterGroup.
   * @param group SegmentFilterGroup
   * @private
   */
  private composeNumberOfDaysClause(group: SegmentFilterGroup) {
    const { isRelativeDateRange, startDate, endDate, lastN, timeUnit } = group;

    if (isRelativeDateRange && lastN !== undefined && timeUnit !== undefined) {
      return `DATEDIFF(DAY, GETDATE() - INTERVAL '${lastN} ${timeUnit}', GETDATE())`;
    }

    if (!isRelativeDateRange && startDate !== undefined && endDate !== undefined) {
      return `DATE('${endDate}') - DATE('${startDate}')`;
    }

    return '7'; // 7 days by default
  }

  /**
   * Calculate start date of date range
   * @param group SegmentFilterGroup
   * @private
   */
  private getDateRangeStartDateClause(group: SegmentFilterGroup) {
    const { isRelativeDateRange, startDate, endDate, lastN, timeUnit } = group;

    if (isRelativeDateRange && lastN !== undefined && timeUnit !== undefined) {
      return `DATE(GETDATE() - INTERVAL '${lastN} ${timeUnit}')`;
    }

    if (!isRelativeDateRange && startDate !== undefined && endDate !== undefined) {
      return `DATE('${startDate}')`;
    }

    return 'DATE(GETDATE() - INTERVAL \'7 day\')'; // Start from 7 days ago by default
  }

  /**
   * Compose event clause from EventWithParameter. Event may have multiple parameters.
   * @param event
   * @private
   */
  private composeEventWithParamClause(event: EventWithParameter) {
    const eventClause = `event_name = '${event.eventName}'`;
    const conditions = event.eventParameterConditions;
    if (conditions === undefined || conditions.length === 0) {
      return eventClause;
    }

    const conditionClauses = conditions.map(condition => this.composeParameterConditionClause(condition, 'EventParameter'));

    return `(${eventClause} AND (${conditionClauses.join(event.operator === 'and' ? ' AND ' : ' OR ')}))`;
  }

  /**
   * Compose parameter clause from ParameterCondition.
   * The inputValue is always a string array. Need to parse the data based on dataType, then get first single value or a list according to the operator.
   * The parameter can be Preset or Custom.
   * @param condition
   * @param type
   * @private
   */
  private composeParameterConditionClause(condition: ParameterCondition, type: ParameterSourceType) {
    const customColumn = type === 'EventParameter' ? EVENT_CUSTOM_PARAM_COLUMN : USER_CUSTOM_ATTR_COLUMN;
    const customValue = `${customColumn}.${condition.parameterName}.value`;
    const field = condition.parameterType === MetadataSource.PRESET ? condition.parameterName :
      condition.dataType === MetadataValueType.STRING || condition.dataType === MetadataValueType.BOOLEAN ? customValue : `CAST(${customValue} AS FLOAT)`;
    const inputValues = condition.inputValue.map(value => {
      switch (condition.dataType) {
        case MetadataValueType.STRING:
          return `'${value}'`;
        case MetadataValueType.INTEGER:
          return parseInt(value);
        case MetadataValueType.DOUBLE:
        case MetadataValueType.FLOAT:
        case MetadataValueType.NUMBER:
          return parseFloat(value);
        case MetadataValueType.BOOLEAN:
          return value;
      }
    });

    switch (condition.conditionOperator) {
      case ExploreAnalyticsOperators.NULL:
        return `${field} IS NULL`;
      case ExploreAnalyticsOperators.NOT_NULL:
        return `${field} IS NOT NULL`;
      case ExploreAnalyticsOperators.EQUAL:
      case ExploreAnalyticsOperators.NOT_EQUAL:
      case ExploreAnalyticsOperators.GREATER_THAN:
      case ExploreAnalyticsOperators.GREATER_THAN_OR_EQUAL:
      case ExploreAnalyticsOperators.LESS_THAN:
      case ExploreAnalyticsOperators.LESS_THAN_OR_EQUAL:
        return `${field} ${condition.conditionOperator} ${inputValues[0]}`;
      case ExploreAnalyticsOperators.IN:
        return `${field} IN (${inputValues.join(', ')})`;
      case ExploreAnalyticsOperators.NOT_IN:
        return `${field} NOT IN (${inputValues.join(', ')})`;
      case ExploreAnalyticsOperators.CONTAINS:
        return `(${condition.inputValue.map(value => (`${field} LIKE '%${value}%'`)).join(' AND ')})`;
      case ExploreAnalyticsOperators.NOT_CONTAINS:
        return `(${condition.inputValue.map(value => (`${field} NOT LIKE '%${value}%'`)).join(' AND ')})`;
      case ExploreAnalyticsOperators.TRUE:
        return `${field} = true`;
      case ExploreAnalyticsOperators.FALSE:
        return `${field} = false`;
    }
  }
}
