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

export const agaPing = (region: string): boolean => {
  // https://api.regional-table.region-services.aws.a2z.com/index.json
  const availableRegion = [
    'ap-east-1',
    'ap-northeast-1',
    'ap-south-1',
    'ap-southeast-2',
    'eu-north-1',
    'eu-south-1',
    'eu-west-3',
    'me-central-1',
    'sa-east-1',
    'us-west-2',
    'ap-northeast-3',
    'ap-south-2',
    'ap-southeast-1',
    'ca-central-1',
    'eu-central-1',
    'eu-west-2',
    'me-south-1',
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'af-south-1',
    'ap-northeast-2',
    'eu-west-1',
  ];
  return availableRegion.includes(region);
};
