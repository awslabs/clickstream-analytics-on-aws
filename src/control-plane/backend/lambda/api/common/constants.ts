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

const QUICKSIGHT_EMBED_NO_REPLY_EMAIL = 'quicksight-embedding-no-reply@amazon.com';
const clickStreamTableName = process.env.CLICK_STREAM_TABLE_NAME;
const dictionaryTableName = process.env.DICTIONARY_TABLE_NAME;
const analyticsMetadataTable = process.env.ANALYTICS_METADATA_TABLE_NAME;
const stackActionStateMachineArn = process.env.STACK_ACTION_STATE_MACHINE;
const stackWorkflowStateMachineArn = process.env.STACK_WORKFLOW_STATE_MACHINE;
const stackWorkflowS3Bucket = process.env.STACK_WORKFLOW_S3_BUCKET;
const prefixTimeGSIName = process.env.PREFIX_TIME_GSI_NAME;
const prefixMonthGSIName = process.env.PREFIX_MONTH_GSI_NAME;
const serviceName = process.env.POWERTOOLS_SERVICE_NAME;
const awsRegion = process.env.AWS_REGION;
const awsPartition = process.env.AWS_PARTITION;
const awsAccountId = process.env.AWS_ACCOUNT_ID;
const awsUrlSuffix = process.env.AWS_URL_SUFFIX;
const STSUploadRole = process.env.STS_UPLOAD_ROLE_ARN;
const APIRoleName = process.env.API_ROLE_NAME;
const QuickSightEmbedRoleArn = process.env.QUICKSIGHT_EMBED_ROLE_ARN;
const amznRequestContextHeader = 'x-amzn-request-context';
const ALLOW_UPLOADED_FILE_TYPES = process.env.ALLOW_UPLOADED_FILE_TYPES || 'jar,mmdb';
const QUICKSIGHT_CONTROL_PLANE_REGION = process.env.QUICKSIGHT_CONTROL_PLANE_REGION || 'us-east-1';
const SDK_MAVEN_VERSION_API_LINK =
  'https://search.maven.org/solrsearch/select?q=g:%22software.aws.solution%22+AND+a:%22clickstream%22&wt=json';
const PIPELINE_SUPPORTED_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ap-east-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-northeast-3',
  'ap-south-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ca-central-1',
  'eu-central-1',
  'eu-north-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'sa-east-1',
  'af-south-1',
  'ap-southeast-3',
  'eu-central-2',
  'eu-south-1',
  'me-central-1',
  'me-south-1',
  'cn-north-1',
  'cn-northwest-1',
];

const DEFAULT_ROLE_JSON_PATH = '$.payload.cognito:groups';
const DEFAULT_OPERATOR_ROLE_NAMES = 'ClickstreamOperator';
const DEFAULT_ANALYST_ROLE_NAMES = 'ClickstreamAnalyst';

export {
  clickStreamTableName,
  dictionaryTableName,
  analyticsMetadataTable,
  stackActionStateMachineArn,
  stackWorkflowStateMachineArn,
  stackWorkflowS3Bucket,
  prefixTimeGSIName,
  prefixMonthGSIName,
  serviceName,
  awsRegion,
  awsPartition,
  awsAccountId,
  awsUrlSuffix,
  STSUploadRole,
  APIRoleName,
  QuickSightEmbedRoleArn,
  amznRequestContextHeader,
  QUICKSIGHT_CONTROL_PLANE_REGION,
  SDK_MAVEN_VERSION_API_LINK,
  PIPELINE_SUPPORTED_REGIONS,
  ALLOW_UPLOADED_FILE_TYPES,
  QUICKSIGHT_EMBED_NO_REPLY_EMAIL,
  DEFAULT_ROLE_JSON_PATH,
  DEFAULT_OPERATOR_ROLE_NAMES,
  DEFAULT_ANALYST_ROLE_NAMES,
};