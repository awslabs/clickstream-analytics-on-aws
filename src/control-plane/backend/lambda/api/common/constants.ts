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

// Get the DynamoDB table name from environment variables
const clickStreamTableName = process.env.CLICK_STREAM_TABLE_NAME;
const dictionaryTableName = process.env.DICTIONARY_TABLE_NAME;
const stackActionStateMachineArn = process.env.STACK_ACTION_SATE_MACHINE;
const stackWorkflowStateMachineArn = process.env.STACK_WORKFLOW_SATE_MACHINE;
const stackWorkflowS3Bucket = process.env.STACK_WORKFLOW_S3_BUCKET;
const prefixTimeGSIName = process.env.PREFIX_TIME_GSI_NAME;
const serviceName = process.env.POWERTOOLS_SERVICE_NAME;
const awsRegion = process.env.AWS_REGION;
const awsAccountId = process.env.AWS_ACCOUNT_ID;
const awsUrlSuffix = process.env.AWS_URL_SUFFIX;
const STSUploadRole = process.env.STS_UPLOAD_ROLE_ARN;
const APIRoleName = process.env.API_ROLE_NAME;
const amznRequestContextHeader = 'x-amzn-request-context';
const QUICKSIGHT_CONTROL_PLANE_REGION = process.env.QUICKSIGHT_CONTROL_PLANE_REGION || 'us-east-1';

export {
  clickStreamTableName,
  dictionaryTableName,
  stackActionStateMachineArn,
  stackWorkflowStateMachineArn,
  stackWorkflowS3Bucket,
  prefixTimeGSIName,
  serviceName,
  awsRegion,
  awsAccountId,
  awsUrlSuffix,
  STSUploadRole,
  APIRoleName,
  amznRequestContextHeader,
  QUICKSIGHT_CONTROL_PLANE_REGION,
};