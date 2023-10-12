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

import { GetStatementResultCommand, DescribeStatementCommand, ExecuteStatementCommand, RedshiftDataClient, StatusString } from '@aws-sdk/client-redshift-data';
import { BatchWriteCommand, DynamoDBDocumentClient, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { handler, StoreMetadataEvent } from '../../../../../src/analytics/lambdas/scan-metadata-workflow/store-metadata-into-ddb';
import { StoreMetadataBody } from '../../../../../src/analytics/private/model';
import { REDSHIFT_MODE } from '../../../../../src/common/model';

import 'aws-sdk-client-mock-jest';

const storeMetadataBody: StoreMetadataBody = {
  appId: 'app1',
};

const checkScanMetadataStatusEvent: StoreMetadataEvent = {
  detail: storeMetadataBody,
};

describe('Lambda - store the metadata into DDB from Redshift', () => {

  const redshiftDataMock = mockClient(RedshiftDataClient);

  const dynamoDBMock = mockClient(DynamoDBDocumentClient);

  const workGroupName = 'demo';

  beforeEach(() => {
    redshiftDataMock.reset();

    // set the env before loading the source
    process.env.REDSHIFT_MODE = REDSHIFT_MODE.SERVERLESS;
    process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME = workGroupName;
  });

  test('Combine and Store metadata with response FINISHED', async () => {
    const eventDDBCommonData = {
      id: 'projectId#appId#eventName',
      month: '#202301',
      prefix: 'EVENT#projectId#appId',
      projectId: 'projectId',
      appId: 'appId',
      name: 'eventName',
    };

    const eventParameterDDBCommonData = {
      id: 'projectId#appId#eventName#propertyName#valueType',
      month: '#202301',
      prefix: 'EVENT_PARAMETER#projectId#appId',
      projectId: 'projectId',
      appId: 'appId',
      name: 'propertyName',
      eventName: 'eventName',
      category: 'category',
      valueType: 'String',
    };

    const userAttributeDDBCommonData = {
      id: 'projectId#appId#userattributeName#valueType',
      month: '#202301',
      prefix: 'USER_ATTRIBUTE#projectId#appId',
      projectId: 'projectId',
      appId: 'appId',
      name: 'userattributename',
      category: 'category',
      valueType: 'String',
    };

    const eventParameterDayCommonData = {
      category: 'category',
      eventName: 'eventName',
      hasData: true,
      name: 'propertyName',
      valueType: 'String',
    };

    const userAttributeDayCommonData = {
      category: 'category',
      hasData: true,
      name: 'userattributename',
      valueType: 'String',
    };

    const exeuteId = 'Id-1';
    redshiftDataMock.on(DescribeStatementCommand).resolves({
      Status: StatusString.FINISHED,
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: exeuteId });
    dynamoDBMock.on(BatchWriteCommand).resolves({});
    dynamoDBMock.on(BatchGetCommand)
      .resolvesOnce({
        Responses: {
          ClickstreamAnalyticsMetadata: [
            {
              ...eventDDBCommonData,
              day7: {
                count: 40,
                hasData: true,
                name: 'eventName',
                platform: ['APP'],
              },
              day9: {
                count: 20,
                hasData: true,
                name: 'eventName',
                platform: ['IOS'],
              },
              summary: {
                name: 'eventName',
                platform: ['APP', 'IOS'],
              },
            },
          ],
        },
      })
      .resolvesOnce({
        Responses: {
          ClickstreamAnalyticsMetadata: [
            {
              ...eventParameterDDBCommonData,
              day7: {
                ...eventParameterDayCommonData,
                platform: ['APP'],
                valueEnum: [
                  {
                    count: 20,
                    value: 'value1',
                  },
                ],
              },
              day9: {
                ...eventParameterDayCommonData,
                platform: ['APP'],
                valueEnum: [
                  {
                    count: 20,
                    value: 'value1',
                  },
                ],
              },
              summary: {
                name: 'propertyName',
                eventName: 'eventName',
                valueType: 'String',
                category: 'category',
                platform: ['APP'],
                valueEnum: [
                  {
                    count: 40,
                    value: 'value1',
                  },
                ],
              },
            },
          ],
        },
      })
      .resolvesOnce({
        Responses: {
          ClickstreamAnalyticsMetadata: [
            {
              ...userAttributeDDBCommonData,
              day7: {
                ...userAttributeDayCommonData,
                valueEnum: [
                  {
                    count: 10,
                    value: 'value1',
                  },
                ],
              },
              day9: {
                ...userAttributeDayCommonData,
                valueEnum: [
                  {
                    count: 20,
                    value: 'value1',
                  },
                ],
              },
              summary: {
                name: 'userattributename',
                valueType: 'String',
                category: 'category',
                valueEnum: [
                  {
                    count: 20,
                    value: 'value1',
                  },
                ],
              },
            },
          ],
        },
      });

    redshiftDataMock.on(GetStatementResultCommand)
      .resolvesOnce({
        Records: [
          [
            { stringValue: 'projectId#appId#eventName' },
            { stringValue: '#202301' },
          ],
        ],
      })
      .resolvesOnce({
        Records: [
          [
            { stringValue: 'projectId#appId#eventName' },
            { stringValue: '#202301' },
            { stringValue: 'EVENT#projectId#appId' },
            { stringValue: 'projectId' },
            { stringValue: 'appId' },
            { longValue: 9 },
            { longValue: 40 },
            { stringValue: 'eventName' },
            { stringValue: 'ANDROID#IOS' },
          ],
          [
            { stringValue: 'projectId#appId#eventName' },
            { stringValue: '#202301' },
            { stringValue: 'EVENT#projectId#appId' },
            { stringValue: 'projectId' },
            { stringValue: 'appId' },
            { longValue: 11 },
            { longValue: 30 },
            { stringValue: 'eventName' },
            { stringValue: 'ANDROID#WEB' },
          ],
        ],
      })
      .resolvesOnce({
        Records: [
          [
            { stringValue: 'projectId#appId#eventName#propertyName#valueType' },
            { stringValue: '#202301' },
          ],
        ],
      })
      .resolvesOnce({
        Records: [
          [
            { stringValue: 'projectId#appId#eventName#propertyName#valueType' },
            { stringValue: '#202301' },
            { stringValue: 'EVENT_PARAMETER#projectId#appId' },
            { stringValue: 'projectId' },
            { stringValue: 'appId' },
            { longValue: 9 },
            { stringValue: 'category' },
            { stringValue: 'eventName' },
            { stringValue: 'propertyName' },
            { stringValue: 'String' },
            { stringValue: 'value1_20#value2_40#value_30' },
            { stringValue: 'ANDROID#IOS' },
          ],
          [
            { stringValue: 'projectId#appId#eventName#propertyName#valueType' },
            { stringValue: '#202301' },
            { stringValue: 'EVENT_PARAMETER#projectId#appId' },
            { stringValue: 'projectId' },
            { stringValue: 'appId' },
            { longValue: 11 },
            { stringValue: 'category' },
            { stringValue: 'eventName' },
            { stringValue: 'propertyName' },
            { stringValue: 'String' },
            { stringValue: 'value3_20#value2_10#value_20' },
            { stringValue: 'WEB#IOS' },
          ],
        ],
      })
      .resolvesOnce({
        Records: [
          [
            { stringValue: 'projectId#appId#userattributeName#valueType' },
            { stringValue: '#202301' },
          ],
        ],
      })
      .resolvesOnce({
        Records: [
          [
            { stringValue: 'projectId#appId#userattributeName#valueType' },
            { stringValue: '#202301' },
            { stringValue: 'USER_ATTRIBUTE#projectId#appId' },
            { stringValue: 'projectId' },
            { stringValue: 'appId' },
            { longValue: 20 },
            { stringValue: 'category' },
            { stringValue: 'userattributename' },
            { stringValue: 'String' },
            { stringValue: 'value1_10#value2_15#value3_25' },
            { stringValue: 'ANDROID#IOS' },
          ],
        ],
      });
    const resp = await handler(checkScanMetadataStatusEvent);


    expect(dynamoDBMock).toHaveReceivedNthCommandWith(1, BatchGetCommand, {
      RequestItems: {
        ClickstreamAnalyticsMetadata: {
          Keys: [
            {
              id: 'projectId#appId#eventName',
              month: '#202301',
            },
          ],
        },
      },
    });
    expect(dynamoDBMock).toHaveReceivedNthCommandWith(2, BatchGetCommand, {
      RequestItems: {
        ClickstreamAnalyticsMetadata: {
          Keys: [
            {
              id: 'projectId#appId#eventName#propertyName#valueType',
              month: '#202301',
            },
          ],
        },
      },
    });
    expect(dynamoDBMock).toHaveReceivedNthCommandWith(3, BatchGetCommand, {
      RequestItems: {
        ClickstreamAnalyticsMetadata: {
          Keys: [
            {
              id: 'projectId#appId#userattributeName#valueType',
              month: '#202301',
            },
          ],
        },
      },
    });
    expect(dynamoDBMock).toHaveReceivedNthCommandWith(4, BatchWriteCommand, {
      RequestItems: {
        ClickstreamAnalyticsMetadata: [
          {
            PutRequest: {
              Item: {
                ...eventDDBCommonData,
                day7: {
                  count: 40,
                  hasData: true,
                  name: 'eventName',
                  platform: ['APP'],
                },
                day9: {
                  count: 40,
                  hasData: true,
                  name: 'eventName',
                  platform: ['ANDROID', 'IOS'],
                },
                day11: {
                  count: 30,
                  hasData: true,
                  name: 'eventName',
                  platform: ['ANDROID', 'WEB'],
                },
                summary: {
                  name: 'eventName',
                  platform: ['APP', 'ANDROID', 'IOS', 'WEB'],
                },
              },
            },
          },
          {
            PutRequest: {
              Item: {
                ...eventParameterDDBCommonData,
                day7: {
                  ...eventParameterDayCommonData,
                  platform: ['APP'],
                  valueEnum: [
                    {
                      count: 20,
                      value: 'value1',
                    },
                  ],
                },
                day9: {
                  ...eventParameterDayCommonData,
                  platform: ['ANDROID', 'IOS'],
                  valueEnum: [
                    {
                      count: 20,
                      value: 'value1',
                    },
                    {
                      count: 40,
                      value: 'value2',
                    },
                    {
                      count: 30,
                      value: 'value',
                    },
                  ],
                },
                day11: {
                  ...eventParameterDayCommonData,
                  platform: ['WEB', 'IOS'],
                  valueEnum: [
                    {
                      count: 20,
                      value: 'value3',
                    },
                    {
                      count: 10,
                      value: 'value2',
                    },
                    {
                      count: 20,
                      value: 'value',
                    },
                  ],
                },
                summary: {
                  name: 'propertyName',
                  eventName: 'eventName',
                  valueType: 'String',
                  category: 'category',
                  platform: ['APP', 'ANDROID', 'IOS', 'WEB'],
                  valueEnum: [
                    {
                      count: 40,
                      value: 'value1',
                    },
                    {
                      count: 50,
                      value: 'value2',
                    },
                    {
                      count: 50,
                      value: 'value',
                    },
                    {
                      count: 20,
                      value: 'value3',
                    },
                  ],
                },
              },
            },
          },
          {
            PutRequest: {
              Item: {
                ...userAttributeDDBCommonData,
                day7: {
                  ...userAttributeDayCommonData,
                  valueEnum: [
                    {
                      count: 10,
                      value: 'value1',
                    },
                  ],
                },
                day9: {
                  ...userAttributeDayCommonData,
                  valueEnum: [
                    {
                      count: 20,
                      value: 'value1',
                    },
                  ],
                },
                day20: {
                  ...userAttributeDayCommonData,
                  valueEnum: [
                    {
                      count: 10,
                      value: 'value1',
                    },
                    {
                      count: 15,
                      value: 'value2',
                    },
                    {
                      count: 25,
                      value: 'value3',
                    },
                  ],
                },
                summary: {
                  name: 'userattributename',
                  valueType: 'String',
                  category: 'category',
                  valueEnum: [
                    {
                      count: 10,
                      value: 'value1',
                    },
                    {
                      count: 15,
                      value: 'value2',
                    },
                    {
                      count: 25,
                      value: 'value3',
                    },
                  ],
                },
              },
            },
          },
        ],
      },
    });
    expect(resp).toEqual({
      detail: {
        appId: 'app1',
        status: 'SUCCEED',
        message: 'store metadata into ddb successfully',
      },
    });
    expect(redshiftDataMock).toHaveReceivedNthCommandWith(1, ExecuteStatementCommand, {
      ClusterIdentifier: undefined,
      Database: 'project1',
      DbUser: undefined,
      Sql: 'SELECT distinct id, month FROM app1.event_metadata;',
      WithEvent: true,
      WorkgroupName: 'demo',
    });
    expect(redshiftDataMock).toHaveReceivedNthCommandWith(4, ExecuteStatementCommand, {
      ClusterIdentifier: undefined,
      Database: 'project1',
      DbUser: undefined,
      Sql: 'SELECT id, month, prefix, project_id, app_id, day_number, count, event_name, platform FROM app1.event_metadata;',
      WithEvent: true,
      WorkgroupName: 'demo',
    });
    expect(redshiftDataMock).toHaveReceivedNthCommandWith(7, ExecuteStatementCommand, {
      ClusterIdentifier: undefined,
      Database: 'project1',
      DbUser: undefined,
      Sql: 'SELECT distinct id, month FROM app1.event_properties_metadata;',
      WithEvent: true,
      WorkgroupName: 'demo',
    });
    expect(redshiftDataMock).toHaveReceivedNthCommandWith(10, ExecuteStatementCommand, {
      ClusterIdentifier: undefined,
      Database: 'project1',
      DbUser: undefined,
      Sql: 'SELECT id, month, prefix, project_id, app_id, day_number, category, event_name, property_name, value_type, value_enum, platform FROM app1.event_properties_metadata;',
      WithEvent: true,
      WorkgroupName: 'demo',
    });
    expect(redshiftDataMock).toHaveReceivedNthCommandWith(13, ExecuteStatementCommand, {
      ClusterIdentifier: undefined,
      Database: 'project1',
      DbUser: undefined,
      Sql: 'SELECT distinct id, month FROM app1.user_attribute_metadata;',
      WithEvent: true,
      WorkgroupName: 'demo',
    });
    expect(redshiftDataMock).toHaveReceivedNthCommandWith(16, ExecuteStatementCommand, {
      ClusterIdentifier: undefined,
      Database: 'project1',
      DbUser: undefined,
      Sql: 'SELECT id, month, prefix, project_id, app_id, day_number, category, property_name, value_type, value_enum FROM app1.user_attribute_metadata;',
      WithEvent: true,
      WorkgroupName: 'demo',
    });
  });

  test('Store metadata for query id is undefined', async () => {
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({
      Status: StatusString.FAILED,
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: undefined });
    dynamoDBMock.on(BatchWriteCommand).resolves({});
    redshiftDataMock.on(GetStatementResultCommand).resolves({
      Records: [],
    });
    const resp = await handler(checkScanMetadataStatusEvent);
    expect(resp).toEqual({
      detail: {
        appId: 'app1',
        status: 'FAILED',
        message: 'store metadata into ddb failed',
      },
    });
  });

  test('Store metadata with redshift FAILED', async () => {
    const exeuteId = 'Id-1';
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({
      Status: StatusString.STARTED,
    })
      .resolvesOnce({
        Status: StatusString.FAILED,
      });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: exeuteId });
    dynamoDBMock.on(BatchWriteCommand).resolves({});
    redshiftDataMock.on(GetStatementResultCommand).resolves({
      Records: [],
    });
    const resp = await handler(checkScanMetadataStatusEvent);
    expect(resp).toEqual({
      detail: {
        appId: 'app1',
        status: 'FAILED',
        message: 'store metadata into ddb failed',
      },
    });
  });
});
