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

import { formatDate, parseDynamoDBTableARN } from '../../src/common/utils';

describe('utils functions tests', () => {
  test('parseDynamoDBTableARN function', () => {
    const ddbArn = 'arn:aws:dynamodb:us-east-1:123456789012:table/ClickStreamApiClickstreamMetadataEC136DD8';

    expect(parseDynamoDBTableARN(ddbArn)).toEqual({
      ddbRegion: 'us-east-1',
      ddbTableName: 'ClickStreamApiClickstreamMetadataEC136DD8',
    });
  });

  test('formatDate function', () => {
    const date = new Date(1707523212345); // '2024/02/10'

    expect(formatDate(date)).toEqual('2024-02-10');
  });
});
