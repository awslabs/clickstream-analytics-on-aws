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
  WECHAT_MINIPROGRAM = 'Wechat MiniProgram',
}

export enum MetadataValueType {
  STRING = 'String',
  INTEGER = 'Integer',
  DOUBLE = 'Double',
  FLOAT = 'Float',
}

export enum MetadataParameterType {
  PUBLIC = 'Public',
  PRIVATE = 'Private',
}

export enum ExploreComputeMethod {
  USER_CNT = 'USER_CNT',// user_pseudo_id
  USER_ID_CNT = 'USER_ID_CNT', // user_id
  EVENT_CNT = 'EVENT_CNT',
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
  Q = 'Q',
}

export enum ExploreGroupColumn {
  WEEK = 'week',
  DAY = 'day',
  HOUR = 'hour',
}

export enum ExploreFunnelRequestAction {
  PREVIEW = 'PREVIEW',
  PUBLISH = 'PUBLISH',
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
}
