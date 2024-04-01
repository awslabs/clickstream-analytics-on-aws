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

export enum MetadataSource {
  PRESET = 'Preset',
  CUSTOM = 'Custom',
  TEMPLATE = 'Template',
}

export enum MetadataPlatform {
  ANDROID = 'Android',
  IOS = 'iOS',
  WEB = 'Web',
  WECHAT_MINIPROGRAM = 'WeChatMP',
}

export enum MetadataValueType {
  STRING = 'string',
  INTEGER = 'int',
  DOUBLE = 'double',
  FLOAT = 'float',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
}

export enum MetadataParameterType {
  PUBLIC = 'Public',
  PRIVATE = 'Private',
}

export enum ExploreComputeMethod {
  USER_ID_CNT = 'USER_ID_CNT', // nullif(user_id,user_pseudo_id)
  EVENT_CNT = 'EVENT_CNT',
  SUM_VALUE = 'SUM_VALUE',
  COUNT_PROPERTY = 'COUNT_PROPERTY',
  AGGREGATION_PROPERTY = 'AGGREGATION_PROPERTY',
}

export enum ExploreAggregationMethod {
  MIN = 'min',
  MAX = 'max',
  SUM = 'sum',
  AVG = 'avg',
  MEDIAN = 'median',
}

export enum ExploreConversionIntervalType {
  CURRENT_DAY = 'CURRENT_DAY',
  CUSTOMIZE = 'CUSTOMIZE',
}

export enum ExploreTimeScopeType {
  FIXED = 'FIXED',
  RELATIVE = 'RELATIVE',
}

export enum ExploreRelativeTimeUnit {
  DD = 'DD',
  WK = 'WK',
  MM = 'MM',
  YY = 'YY',
}

export enum ExploreGroupColumn {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
}

export enum ExploreRequestAction {
  PREVIEW = 'PREVIEW',
  PUBLISH = 'PUBLISH',
}

export enum ExplorePathSessionDef {
  SESSION = 'SESSION',
  CUSTOMIZE = 'CUSTOMIZE',
}

export enum ExplorePathNodeType {
  EVENT = 'event',
  PAGE_TITLE = 'page_title',
  PAGE_URL = 'page_url',
  SCREEN_NAME = 'screen_name',
  SCREEN_ID = 'screen_id',
}

export enum ExploreVisualName {
  CHART = 'CHART',
  TABLE = 'TABLE',
}

export enum ConditionCategory {
  USER = 'user',
  USER_OUTER = 'user_outer',
  EVENT = 'event',
  EVENT_OUTER = 'event_outer',
}

export enum ConditionCategoryFrontend {
  USER = 'user',
  USER_OUTER = 'user_outer',
  EVENT = 'event',
  EVENT_OUTER = 'event_outer',
  APP_INFO = 'app_info',
  DEVICE = 'app_info',
  TRAFFIC_SOURCE = 'app_info',
  GEO = 'app_info',
  OTER = 'other'
}

export enum ExploreLocales {
  ZH_CN = 'zh-CN',
  EN_US = 'en-US'
}

export enum AnalysisType {
  FUNNEL = 'FUNNEL',
  EVENT = 'EVENT',
  PATH = 'PATH',
  RETENTION = 'RETENTION',
  ATTRIBUTION = 'ATTRIBUTION',
}

export enum QuickSightChartType {
  BAR = 'bar',
  LINE = 'line',
  FUNNEL = 'funnel',
  SANKEY = 'sankey',
  TABLE = 'table',
}

export enum AttributionModelType {
  LAST_TOUCH = 'LAST_TOUCH',
  FIRST_TOUCH = 'FIRST_TOUCH',
  LINEAR = 'LINEAR',
  TIME_DECAY = 'TIME_DECAY',
  POSITION = 'POSITION',
}

export enum ExploreAttributionTimeWindowType {
  CURRENT_DAY = 'CURRENT_DAY',
  CUSTOMIZE = 'CUSTOMIZE',
  SESSION = 'SESSION',
}

export enum ExploreAnalyticsOperators {
  NULL = 'is_null',
  NOT_NULL = 'is_not_null',
  EQUAL = '=',
  NOT_EQUAL = '<>',
  GREATER_THAN = '>',
  GREATER_THAN_OR_EQUAL = '>=',
  LESS_THAN = '<',
  LESS_THAN_OR_EQUAL = '<=',
  IN = 'in',
  NOT_IN = 'not_in',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  YES = 'yes',
  NO = 'no',
}