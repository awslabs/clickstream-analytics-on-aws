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
import { SelectProps } from '@cloudscape-design/components';
import {
  ERelationShip,
  IEventSegmentationItem,
  IEventSegmentationObj,
} from 'components/eventselect/AnalyticsType';

export const SUPPORT_USER_SELECT_REDSHIFT_SERVERLESS = false;
export const SUPPORT_SELF_HOSTED_KAFKA = true;

export const PROJECT_CONFIG_JSON = 'ClickStreamOnAWSConfigId';
export const ANALYTICS_NAV_STATUS = 'ClickStreamAnalyticsNavigationStatus';
export const ANALYTICS_NAV_ITEM = 'ClickStreamAnalyticsNavigationItem';
export const CLICK_STREAM_USER_DATA = 'ClickStreamAnalyticsUserInformation';
export const CONFIG_URL = '/aws-exports.json';

export const ALPHABETS = Array.from({ length: 26 }, (_, index) =>
  String.fromCharCode(65 + index)
);
export const MAX_USER_INPUT_LENGTH = 1024;
export const DEFAULT_ZH_LANG = 'zh-CN';
export const DEFAULT_EN_LANG = 'en-US';
export const ZH_LANGUAGE_LIST = [DEFAULT_ZH_LANG, 'zh', 'zh-cn', 'zh_CN'];

export const ZH_TEXT = '简体中文';
export const EN_TEXT = 'English(US)';
export const LANGUAGE_ITEMS = [
  { id: DEFAULT_EN_LANG, text: EN_TEXT },
  { id: DEFAULT_ZH_LANG, text: ZH_TEXT },
];

export const XMIND_LINK = 'https://www.maxmind.com';

export const MIN_KDS_BATCH_SIZE = 1;
export const MAX_KDS_BATCH_SIZE = 10000;
export const DEFAULT_KDS_BATCH_SIZE = '10000';

export const MIN_KDS_SINK_INTERVAL = 0;
export const MAX_KDS_SINK_INTERVAL = 300;
export const DEFAULT_KDS_SINK_INTERVAL = '300';

export const MIN_MSK_BATCH_SIZE = 1;
export const MAX_MSK_BATCH_SIZE = 50000;
export const DEFAULT_MSK_BATCH_SIZE = '5000';

export const MIN_MSK_SINK_INTERVAL = 0;
export const MAX_MSK_SINK_INTERVAL = 3000;
export const DEFAULT_MSK_SINK_INTERVAL = '300';

export const DEFAULT_TRANSFORM_SDK_IDS = ['clickstream', 'amplify'];

export enum ProjectStage {
  DEV = 'Dev',
  TEST = 'Test',
  PROD = 'Prod',
}

export enum ALARM_STATUS {
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
  OK = 'OK',
  ALARM = 'ALARM',
}

export enum ALARM_DISPLAY_STATUS {
  HAS_ALARM = 1,
  NO_ALARM = 0,
  NO_PIPELINE = -1,
}

export enum EPipelineStatus {
  Active = 'Active',
  Failed = 'Failed',
  Warning = 'Warning',
  Creating = 'Creating',
  Updating = 'Updating',
  Deleting = 'Deleting',
  Deleted = 'Deleted',
  Pending = 'Pending',
}

export const PROJECT_STAGE_LIST = [
  { label: 'Dev', value: ProjectStage.DEV },
  { label: 'Test', value: ProjectStage.TEST },
  { label: 'Prod', value: ProjectStage.PROD },
];

export const PLUGIN_TYPE_LIST = [
  {
    label: 'Enrichment',
    value: 'Enrich',
    description:
      'Plugin to add fields into event data collected by SDK (both Clickstream SDK or third-party SDK)',
  },
  {
    label: 'Transformation',
    value: 'Transform',
    description:
      'A plugin used to transform a third-party SDK’s raw data into solution built-in schema.',
  },
];

export const PLUGINS_LIST = [
  {
    name: 'IP lookup',
    description: 'This enrichment uses MaxMind databases to lookup use...',
    status: 'Enabled',
    edited: 'Nov 24, 2022',
  },
  {
    name: 'UA parser',
    description: 'This enrichment uses the ua-parser library to parse the ...',
    status: 'Enabled',
    edited: 'Nov 24, 2022',
  },
  {
    name: 'Event fingerprint',
    description: 'This enrichment generates a fingerprint for the event ...',
    status: 'Enabled',
    edited: 'Nov 24, 2022',
  },
];

export const TRANSFORM_LIST = [
  {
    name: 'Transform user data template',
    description: 'This Transform template transform user information...',
    status: 'Enabled',
    edited: 'Nov 24, 2022',
  },
];

export enum ResourceCreateMethod {
  CREATE = 'create',
  EXISTING = 'existing',
}

export enum YES_NO {
  YES = 'Yes',
  NO = 'No',
}

export const YES_NO_LIST = [
  { value: YES_NO.YES, label: 'Yes' },
  { value: YES_NO.NO, label: 'No' },
];

export const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

export enum SinkType {
  S3 = 's3',
  MSK = 'kafka',
  KDS = 'kinesis',
}

export enum ProtocalType {
  HTTP = 'HTTP',
  HTTPS = 'HTTPS',
}

export enum KDSProvisionType {
  ON_DEMAND = 'ON_DEMAND',
  PROVISIONED = 'PROVISIONED',
}

export enum ExecutionType {
  FIXED_RATE = 'fixed',
  CRON_EXPRESS = 'cron',
}

export const EXECUTION_TYPE_LIST = [
  {
    label: 'Fixed Rate',
    value: ExecutionType.FIXED_RATE,
  },
  {
    label: 'Cron Expression',
    value: ExecutionType.CRON_EXPRESS,
  },
];

export const EXCUTION_UNIT_LIST = [
  { label: 'Hours', value: 'hour' },
  { label: 'Minutes', value: 'minute' },
  { label: 'Days', value: 'day' },
];

export const EVENT_REFRESH_UNIT_LIST = [
  { label: 'Hours', value: 'hour' },
  { label: 'Days', value: 'day' },
];

export const REDSHIFT_UNIT_LIST = [
  { label: 'Months', value: 'month' },
  { label: 'Days', value: 'day' },
];

export const REDSHIFT_FREQUENCY_UNIT = [
  { label: 'Minutes', value: 'minute' },
  { label: 'Hours', value: 'hour' },
  { label: 'Days', value: 'day' },
];

export const SDK_LIST: SelectProps.Option[] = [
  {
    label: 'ClickStream SDK',
    value: 'clickstream',
    iconName: 'settings',
  },
  {
    label: 'Third-Party SDK',
    value: 'thirdparty',
    iconName: 'settings',
  },
];

export const KDS_TYPE: SelectProps.Option[] = [
  {
    label: 'On-Demand',
    value: KDSProvisionType.ON_DEMAND,
  },
  {
    label: 'Provisioned',
    value: KDSProvisionType.PROVISIONED,
  },
];

export enum ErrorCode {
  QuickSightNameExists = 'Error: ResourceExistsException',
}

export const AWS_REGION_MAP: AWSRegionMap = {
  'ap-northeast-3': {
    Endpoint: 'ec2.ap-northeast-3.amazonaws.com',
    RegionName: 'region.ap-northeast-3',
    OptInStatus: 'opt-in-not-required',
  },
  'ap-northeast-2': {
    Endpoint: 'ec2.ap-northeast-2.amazonaws.com',
    RegionName: 'region.ap-northeast-2',
    OptInStatus: 'opt-in-not-required',
  },
  'ap-northeast-1': {
    Endpoint: 'ec2.ap-northeast-1.amazonaws.com',
    RegionName: 'region.ap-northeast-1',
    OptInStatus: 'opt-in-not-required',
  },
  'ap-south-2': {
    Endpoint: 'ec2.ap-south-2.amazonaws.com',
    RegionName: 'region.ap-south-2',
    OptInStatus: 'opted-in',
  },
  'ap-south-1': {
    Endpoint: 'ec2.ap-south-1.amazonaws.com',
    RegionName: 'region.ap-south-1',
    OptInStatus: 'opt-in-not-required',
  },
  'ap-east-1': {
    Endpoint: 'ec2.ap-east-1.amazonaws.com',
    RegionName: 'region.ap-east-1',
    OptInStatus: 'opted-in',
  },
  'ap-southeast-1': {
    Endpoint: 'ec2.ap-southeast-1.amazonaws.com',
    RegionName: 'region.ap-southeast-1',
    OptInStatus: 'opt-in-not-required',
  },
  'ap-southeast-2': {
    Endpoint: 'ec2.ap-southeast-2.amazonaws.com',
    RegionName: 'region.ap-southeast-2',
    OptInStatus: 'opt-in-not-required',
  },
  'ap-southeast-3': {
    Endpoint: 'ec2.ap-southeast-3.amazonaws.com',
    RegionName: 'region.ap-southeast-3',
    OptInStatus: 'opted-in',
  },
  'ap-southeast-4': {
    Endpoint: 'ec2.ap-southeast-4.amazonaws.com',
    RegionName: 'region.ap-southeast-4',
    OptInStatus: 'opted-in',
  },
  'me-central-1': {
    Endpoint: 'ec2.me-central-1.amazonaws.com',
    RegionName: 'region.me-central-1',
    OptInStatus: 'opted-in',
  },
  'ca-central-1': {
    Endpoint: 'ec2.ca-central-1.amazonaws.com',
    RegionName: 'region.ca-central-1',
    OptInStatus: 'opt-in-not-required',
  },
  'eu-central-1': {
    Endpoint: 'ec2.eu-central-1.amazonaws.com',
    RegionName: 'region.eu-central-1',
    OptInStatus: 'opt-in-not-required',
  },
  'eu-central-2': {
    Endpoint: 'ec2.eu-central-2.amazonaws.com',
    RegionName: 'region.eu-central-2',
    OptInStatus: 'opted-in',
  },
  'us-east-1': {
    Endpoint: 'ec2.us-east-1.amazonaws.com',
    RegionName: 'region.us-east-1',
    OptInStatus: 'opt-in-not-required',
  },
  'us-east-2': {
    Endpoint: 'ec2.us-east-2.amazonaws.com',
    RegionName: 'region.us-east-2',
    OptInStatus: 'opt-in-not-required',
  },
  'us-west-1': {
    Endpoint: 'ec2.us-west-1.amazonaws.com',
    RegionName: 'region.us-west-1',
    OptInStatus: 'opt-in-not-required',
  },
  'us-west-2': {
    Endpoint: 'ec2.us-west-2.amazonaws.com',
    RegionName: 'region.us-west-2',
    OptInStatus: 'opt-in-not-required',
  },
  'af-south-1': {
    Endpoint: 'ec2.af-south-1.amazonaws.com',
    RegionName: 'region.af-south-1',
    OptInStatus: 'opted-in',
  },
  'eu-south-1': {
    Endpoint: 'ec2.eu-south-1.amazonaws.com',
    RegionName: 'region.eu-south-1',
    OptInStatus: 'opted-in',
  },
  'eu-south-2': {
    Endpoint: 'ec2.eu-south-2.amazonaws.com',
    RegionName: 'region.eu-south-2',
    OptInStatus: 'opted-in',
  },
  'eu-north-1': {
    Endpoint: 'ec2.eu-north-1.amazonaws.com',
    RegionName: 'region.eu-north-1',
    OptInStatus: 'opt-in-not-required',
  },
  'eu-west-3': {
    Endpoint: 'ec2.eu-west-3.amazonaws.com',
    RegionName: 'region.eu-west-3',
    OptInStatus: 'opt-in-not-required',
  },
  'eu-west-2': {
    Endpoint: 'ec2.eu-west-2.amazonaws.com',
    RegionName: 'region.eu-west-2',
    OptInStatus: 'opt-in-not-required',
  },
  'eu-west-1': {
    Endpoint: 'ec2.eu-west-1.amazonaws.com',
    RegionName: 'region.eu-west-1',
    OptInStatus: 'opt-in-not-required',
  },
  'me-south-1': {
    Endpoint: 'ec2.me-south-1.amazonaws.com',
    RegionName: 'region.me-south-1',
    OptInStatus: 'opted-in',
  },
  'sa-east-1': {
    Endpoint: 'ec2.sa-east-1.amazonaws.com',
    RegionName: 'region.sa-east-1',
    OptInStatus: 'opt-in-not-required',
  },
  'cn-north-1': {
    Endpoint: 'ec2.cn-north-1.amazonaws.cn',
    RegionName: 'region.cn-north-1',
    OptInStatus: 'opt-in-not-required',
  },
  'cn-northwest-1': {
    Endpoint: 'ec2.cn-northwest-1.amazonaws.cn',
    RegionName: 'region.cn-northwest-1',
    OptInStatus: 'opt-in-not-required',
  },
};

export const CLOUDFORMATION_STATUS_MAP: any = {
  CREATE_COMPLETE: 'success',
  CREATE_IN_PROGRESS: 'loading',
  CREATE_FAILED: 'error',
  DELETE_COMPLETE: 'success',
  DELETE_FAILED: 'error',
  DELETE_IN_PROGRESS: 'loading',
  REVIEW_IN_PROGRESS: 'loading',
  ROLLBACK_COMPLETE: 'error',
  ROLLBACK_FAILED: 'error',
  ROLLBACK_IN_PROGRESS: 'loading',
  UPDATE_COMPLETE: 'success',
  UPDATE_COMPLETE_CLEANUP_IN_PROGRESS: 'loading',
  UPDATE_IN_PROGRESS: 'loading',
  UPDATE_ROLLBACK_COMPLETE: 'error',
  UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS: 'loading',
  UPDATE_ROLLBACK_FAILED: 'error',
  UPDATE_ROLLBACK_IN_PROGRESS: 'loading',
  UPDATE_FAILED: 'error',
};

export const ANALYTICS_INFO_KEY = 'Analytics-Project-App-Info';

export enum IUserRole {
  ADMIN = 'Admin',
  OPERATOR = 'Operator',
  ANALYST = 'Analyst',
  ANALYST_READER = 'AnalystReader',
}

export const EVENT_DISPLAY_PREFIX = 'EVENT#';
export const EVENT_PARAMETER_DISPLAY_PREFIX = 'EVENT_PARAMETER#';
export const USER_ATTRIBUTE_DISPLAY_PREFIX = 'USER_ATTRIBUTE#';
export const DICTIONARY_DISPLAY_PREFIX = 'DICTIONARY#';

export const POSITIVE_INTEGER_REGEX = new RegExp(`${'^$|^[1-9]\\d*$'}`);
export const POSITIVE_INTEGER_REGEX_INCLUDE_ZERO = new RegExp(`${'^$|^\\d+$'}`);
export const PERCENTAGE_REGEX = new RegExp(
  `${'^$|^(100|[1-9]?\\d)$|^(100|[1-9]?\\d)\\.\\d{1,2}$'}`
);

export enum EIngestionType {
  Fargate = 'Fargate',
  EC2 = 'EC2',
}

export enum ENetworkType {
  General = 'General',
  Private = 'Private',
}

// For segment selection

export enum ConditionType {
  USER_DONE = 'USER_DONE',
  USER_NOT_DONE = 'USER_NOT_DONE',
  USER_DONE_IN_SEQUENCE = 'USER_DONE_IN_SEQUENCE',
  USER_IS = 'USER_IS',
  USER_IS_NOT = 'USER_IS_NOT',
  USER_IN_GROUP = 'USER_IN_GROUP',
  USER_NOT_IN_GROUP = 'USER_NOT_IN_GROUP',
}

export const CONDITION_LIST: SelectProps.Option[] = [
  {
    label: 'analytics:segment.type.userDone',
    value: ConditionType.USER_DONE,
  },
  {
    label: 'analytics:segment.type.userNotDone',
    value: ConditionType.USER_NOT_DONE,
  },
  {
    label: 'analytics:segment.type.doneInSequence',
    value: ConditionType.USER_DONE_IN_SEQUENCE,
  },
  { label: 'analytics:segment.type.userIs', value: ConditionType.USER_IS },
  {
    label: 'analytics:segment.type.userIsNot',
    value: ConditionType.USER_IS_NOT,
  },
  {
    label: 'analytics:segment.type.userInGroup',
    value: ConditionType.USER_IN_GROUP,
  },
  {
    label: 'analytics:segment.type.userNotInGroup',
    value: ConditionType.USER_NOT_IN_GROUP,
  },
];

export const DEFAULT_SEGMENT_ITEM: IEventSegmentationItem = {
  userEventType: CONDITION_LIST[0],
  subItemList: [],
  userDoneEventConditionList: [],
  sequenceEventList: [],
};

export const DEFAULT_FILTER_GROUP_ITEM: IEventSegmentationItem = {
  userEventType: null,
  segmentEventRelationShip: ERelationShip.OR,
  userDoneEventConditionList: [],
  sequenceEventList: [],
  subItemList: [{ ...DEFAULT_SEGMENT_ITEM }],
  groupDateRange: null,
};

export const DEFAULT_SEGMENT_GROUP_DATA: IEventSegmentationObj = {
  filterGroupRelationShip: ERelationShip.AND,
  subItemList: [{ ...DEFAULT_FILTER_GROUP_ITEM }],
  eventOption: [],
  eventCalculateMethodOption: [],
  conditionOptions: [],
  eventOperationOptions: [],
  attributeOptions: [],
  attributeOperationOptions: [],
  userGroupOptions: [],
};

export const darkBackgroundColors = [
  '#033160',
  '#A82A0C',
  '#037F0C',
  '#1D3557',
  '#780000',
  '#0B3C5D',
  '#F13C20',
  '#343A40',
  '#10316B',
  '#8D0801',
];
