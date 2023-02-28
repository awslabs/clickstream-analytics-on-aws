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
const clickStreamTableName = process.env.CLICK_STREAM_TABLE_NAME || 'DEV-Project';
const dictionaryTableName = process.env.DICTIONARY_TABLE_NAME || 'DEV-Dictionary';
const stackActionStateMachineArn = process.env.STACK_ACTION_SATE_MACHINE || '';
const serviceName = process.env.POWERTOOLS_SERVICE_NAME || 'clickstream';
const awsRegion = process.env.AWS_REGION;
const awsAccountId = process.env.AWS_ACCOUNT_ID;

const regionMap = new Map<string, any>([
  ['us-east-1', { name: 'US East (N. Virginia)', cn_name: '美国东部 (弗吉尼亚北部)' }],
  ['us-east-2', { name: 'US East (Ohio)', cn_name: '美国东部 (俄亥俄州)' }],
  ['us-west-1', { name: 'US West (N. California)', cn_name: '美国西部 (加利福尼亚北部)' }],
  ['us-west-2', { name: 'US West (Oregon)', cn_name: '美国西部 (俄勒冈州)' }],
  ['ca-central-1', { name: 'Canada (Montreal)', cn_name: '加拿大 (中部)' }],
  ['eu-north-1', { name: 'EU (Stockholm)', cn_name: '欧洲 (斯德哥尔摩)' }],
  ['eu-west-3', { name: 'EU (Paris)', cn_name: '欧洲 (巴黎)' }],
  ['eu-west-2', { name: 'EU (London)', cn_name: '欧洲 (伦敦)' }],
  ['eu-west-1', { name: 'EU (Ireland)', cn_name: '欧洲 (爱尔兰)' }],
  ['eu-central-1', { name: 'EU (Frankfurt)', cn_name: '欧洲 (法兰克福)' }],
  ['eu-central-2', { name: 'EU (Zurich)', cn_name: '欧洲 (苏黎世)' }],
  ['eu-south-1', { name: 'EU (Milan)', cn_name: '欧洲 (米兰)' }],
  ['eu-east-1', { name: 'EU (Spain)', cn_name: '欧洲 (西班牙)' }],
  ['ap-south-1', { name: 'Asia Pacific (Mumbai)', cn_name: '亚太地区 (孟买)' }],
  ['ap-south-2', { name: 'Asia Pacific (Hyderabad)', cn_name: '亚太地区 (德拉巴)' }],
  ['ap-northeast-1', { name: 'Asia Pacific (Tokyo)', cn_name: '亚太地区 (东京)' }],
  ['ap-northeast-2', { name: 'Asia Pacific (Seoul)', cn_name: '亚太地区 (首尔)' }],
  ['ap-northeast-3', { name: 'Asia Pacific (Osaka-Local)', cn_name: '亚太地区 (大阪)' }],
  ['ap-southeast-1', { name: 'Asia Pacific (Singapore)', cn_name: '亚太地区 (新加坡)' }],
  ['ap-southeast-2', { name: 'Asia Pacific (Sydney)', cn_name: '亚太地区 (悉尼)' }],
  ['ap-southeast-3', { name: 'Asia Pacific (Jakarta)', cn_name: '亚太地区 (雅加达)' }],
  ['ap-southeast-4', { name: 'Asia Pacific (Melbourne)', cn_name: '亚太地区 (墨尔本)' }],
  ['ap-east-1', { name: 'Asia Pacific (Hong Kong)', cn_name: '亚太地区 (香港)' }],
  ['sa-east-1', { name: 'South America (São Paulo)', cn_name: '南美洲 (圣保罗)' }],
  ['cn-north-1', { name: 'China (Beijing)', cn_name: '中国 (北京)' }],
  ['cn-northwest-1', { name: 'China (Ningxia)', cn_name: '中国 (宁夏)' }],
  ['me-south-1', { name: 'Middle East (Bahrain)', cn_name: '中东 (巴林)' }],
  ['me-central-1', { name: 'Middle East (UAE)', cn_name: '中东 (阿联酋)' }],
]);

export {
  clickStreamTableName,
  dictionaryTableName,
  stackActionStateMachineArn,
  serviceName,
  awsRegion,
  awsAccountId,
  regionMap,
};