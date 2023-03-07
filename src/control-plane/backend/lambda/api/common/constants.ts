/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

// Get the DynamoDB table name from environment variables
const clickStreamTableName = process.env.CLICK_STREAM_TABLE_NAME;
const dictionaryTableName = process.env.DICTIONARY_TABLE_NAME;
const stackActionStateMachineArn = process.env.STACK_ACTION_SATE_MACHINE;
const serviceName = process.env.POWERTOOLS_SERVICE_NAME;
const awsRegion = process.env.AWS_REGION;
const awsAccountId = process.env.AWS_ACCOUNT_ID;
const awsUrlSuffix = process.env.AWS_URL_SUFFIX;

export {
  clickStreamTableName,
  dictionaryTableName,
  stackActionStateMachineArn,
  serviceName,
  awsRegion,
  awsAccountId,
  awsUrlSuffix,
};