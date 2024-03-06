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

interface Segment {
  segmentId: string;
  segmentType: 'User' | 'Session' | 'Event';
  name: string;
  description: string;
  projectId: string;
  appId: string;
  createBy: string;
  createAt: number;
  lastUpdateBy: string;
  lastUpdateAt: number;
  refreshSchedule: RefreshSchedule;
  eventBridgeRuleArn?: string;
  criteria: SegmentCriteria;
}

interface RefreshSchedule {
  cron: 'Manual' | 'Daily' | 'Weekly' | 'Monthly' | 'Custom';
  hour?: number;
  minute?: number;
  weeklyDay?: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  monthlyDay?: number;
  cronExpression?: string;
  expireAfter: number; // timestamp
}

type FilterOperator = 'and' | 'or';

interface SegmentCriteria {
  filterGroups: SegmentFilterGroup[];
  operator: FilterOperator;
}

interface SegmentFilterGroup {
  description?: string;
  startDate?: string;
  endDate?: string;
  relativeDateRange?: string; // TODO: expression
  filters: SegmentFilter[];
  operator: FilterOperator;
}

type SegmentFilter = UserSegmentFilter; // Add "SessionSegmentFilter" and "EventSegmentFilter" in the future

interface UserSegmentFilter {
  conditions: UserSegmentFilterCondition[];
  operator: FilterOperator;
}

type UserSegmentFilterCondition =
  UserEventCondition
  | EventsInSequenceCondition
  | UserAttributeCondition
  | UserInSegmentCondition;

enum SegmentFilterConditionType {
  UserEventCondition,
  EventsInSequenceCondition,
  UserAttributeCondition,
  UserInSegmentCondition,
}

interface UserEventCondition {
  conditionType: SegmentFilterConditionType.UserEventCondition;
  hasDone: boolean;
  event: EventWithParameter;
  metricCondition: MetricCondition;
}

interface EventsInSequenceCondition {
  conditionType: SegmentFilterConditionType.EventsInSequenceCondition;
  hasDone: boolean;
  events: EventWithParameter[];
  isInOneSession: boolean;
  isDirectlyFollow: boolean;
}

interface UserAttributeCondition {
  conditionType: SegmentFilterConditionType.UserAttributeCondition;
  attributeCondition: ParameterCondition;
}

interface UserInSegmentCondition {
  conditionType: SegmentFilterConditionType.UserInSegmentCondition;
  isInSegment: boolean;
  segmentId: string;
}

interface EventWithParameter {
  eventName: string;
  eventParameterConditions?: ParameterCondition[];
}

interface ParameterCondition {
  parameterType: ParameterType;
  parameterName: string;
  dataType: ParameterDataType;
  conditionOperator: ConditionOperator;
  inputValue: number | string;
}

interface MetricCondition {
  metricType: SegmentFilterEventMetricType;
  conditionOperator: ConditionOperator;
  inputValue: number;
}

enum ParameterType {
  PREDEFINED = 'predefined',
  CUSTOM = 'custom',
}

enum ParameterDataType {
  STRING = 'string',
  INTEGER = 'integer',
  DOUBLE = 'double',
  FLOAT = 'float',
}

enum ConditionOperator {
  NULL = 'is null',
  NOT_NULL = 'is not null',
  EQUAL = '=',
  NOT_EQUAL = '<>',
  GREATER_THAN = '>',
  GREATER_THAN_OR_EQUAL = '>=',
  LESS_THAN = '<',
  LESS_THAN_OR_EQUAL = '<=',
  IN = 'in',
  NOT_IN = ' not in',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not contains',
  BEGIN_WITH = 'begin with',
}

enum SegmentFilterEventMetricType {
  NUMBER_OF_TOTAL,
  NUMBER_OF_TIMES_PER_DAY,
  NUMBER_OF_CONSECUTIVE_DAYS,
  NUBMER_OF_DAYS_HAVING_EVENT,
  SUM_OF_EVENT_PARAMETER,
  MIN_OF_EVENT_PARAMETER,
  MAX_OF_EVENT_PARAMETER,
  AVG_OF_EVENT_PARAMETER,
  NUMBER_OF_DISTINCT_EVENT_PARAMETER,
}

export interface SegmentDdbItem extends Segment {
  id: string;
  type: string;
  deleted: boolean;
  eventBridgeRuleArn?: string;
  lastJobRunId?: string;
}

export interface SegmentJobStatusItem {
  id: string;
  type: string;
  jobRunId: string;
  segmentId: string;
  date: string;
  jobStartTime: number;
  jobEndTime: number;
  jobStatus: SegmentJobStatus;
  segmentUserNumber: number;
  totalUserNumber: number;
  segmentSessionNumber: number;
  totalSessionNumber: number;
  sampleData: object[];
}

export enum SegmentJobStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  FAILED = 'Failed',
}

export enum SegmentJobTriggerType {
  MANUALLY = 'Manually',
  SCHEDULED = 'Scheduled',
}
