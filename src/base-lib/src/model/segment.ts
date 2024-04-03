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

import { ExploreAnalyticsOperators, MetadataSource, MetadataValueType } from '../constant';

export interface Segment {
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
  criteria: SegmentCriteria;
  eventBridgeRuleArn?: string;
}

export interface RefreshSchedule {
  cron: 'Manual' | 'Daily' | 'Weekly' | 'Monthly' | 'Custom';
  cronExpression?: string;
  expireAfter: number; // timestamp
}

export type FilterOperator = 'and' | 'or';

export type TimeUnit = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

export interface SegmentCriteria {
  filterGroups: SegmentFilterGroup[];
  operator: FilterOperator;
}

export interface SegmentFilterGroup {
  description?: string;
  isRelativeDateRange: boolean;
  startDate?: string;
  endDate?: string;
  lastN?: number;
  timeUnit?: TimeUnit;
  filters: SegmentFilter[];
  operator: FilterOperator;
}

export type SegmentFilter = UserSegmentFilter; // Add "SessionSegmentFilter" and "EventSegmentFilter" in the future

export interface UserSegmentFilter {
  conditions: UserSegmentFilterCondition[];
  operator: FilterOperator;
}

export type UserSegmentFilterCondition =
  UserEventCondition
  | EventsInSequenceCondition
  | UserAttributeCondition
  | UserInSegmentCondition;

export enum SegmentFilterConditionType {
  UserEventCondition = 'UserEventCondition',
  EventsInSequenceCondition = 'EventsInSequenceCondition',
  UserAttributeCondition = 'UserAttributeCondition',
  UserInSegmentCondition = 'UserInSegmentCondition',
}

export interface UserEventCondition {
  conditionType: SegmentFilterConditionType.UserEventCondition;
  hasDone: boolean;
  event: EventWithParameter;
  metricCondition: MetricCondition;
}

export interface EventsInSequenceCondition {
  conditionType: SegmentFilterConditionType.EventsInSequenceCondition;
  hasDone: boolean;
  events: EventWithParameter[];
  isInOneSession: boolean;
  isDirectlyFollow: boolean;
}

export interface UserAttributeCondition {
  conditionType: SegmentFilterConditionType.UserAttributeCondition;
  hasAttribute: boolean;
  attributeCondition: ParameterCondition;
}

export interface UserInSegmentCondition {
  conditionType: SegmentFilterConditionType.UserInSegmentCondition;
  isInSegment: boolean;
  segmentId: string;
}

export interface EventWithParameter {
  eventName: string;
  eventParameterConditions?: ParameterCondition[];
  operator?: FilterOperator;
}

export interface ParameterCondition {
  parameterType: MetadataSource;
  parameterName: string;
  dataType: MetadataValueType;
  conditionOperator: ExploreAnalyticsOperators;
  inputValue: string[];
}

export interface MetricCondition {
  metricType: SegmentFilterEventMetricType;
  conditionOperator: ExploreAnalyticsOperators;
  inputValue: number[];
  parameterType?: MetadataSource;
  parameterName?: string;
  dataType?: MetadataValueType;
}

export enum SegmentFilterEventMetricType {
  NUMBER_OF_TOTAL = 'NUMBER_OF_TOTAL',
  NUMBER_OF_TIMES_PER_DAY = 'NUMBER_OF_TIMES_PER_DAY',
  NUMBER_OF_CONSECUTIVE_DAYS = 'NUMBER_OF_CONSECUTIVE_DAYS',
  NUMBER_OF_DAYS_HAVING_EVENT = 'NUMBER_OF_DAYS_HAVING_EVENT',
  SUM_OF_EVENT_PARAMETER = 'SUM_OF_EVENT_PARAMETER',
  MIN_OF_EVENT_PARAMETER = 'MIN_OF_EVENT_PARAMETER',
  MAX_OF_EVENT_PARAMETER = 'MAX_OF_EVENT_PARAMETER',
  AVG_OF_EVENT_PARAMETER = 'AVG_OF_EVENT_PARAMETER',
  NUMBER_OF_DISTINCT_EVENT_PARAMETER = 'NUMBER_OF_DISTINCT_EVENT_PARAMETER',
}

export interface SegmentDdbItem extends Segment {
  id: string;
  type: string;
  deleted: boolean;
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

  // GSI
  prefix: string;
  createAt: number;
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
