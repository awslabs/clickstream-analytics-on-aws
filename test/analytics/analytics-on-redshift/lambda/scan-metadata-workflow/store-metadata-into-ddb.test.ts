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
import { BatchWriteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { handler, StoreMetadataEvent } from '../../../../../src/analytics/lambdas/scan-metadata-workflow/store-metadata-into-ddb';
import { StoreMetadataBody } from '../../../../../src/analytics/private/model';
import { REDSHIFT_MODE } from '../../../../../src/common/model';

import 'aws-sdk-client-mock-jest';

const storeMetadataBody: StoreMetadataBody = {
  appId: 'app1',
};

const storeMetadataEvent: StoreMetadataEvent = {
  detail: storeMetadataBody,
};

describe('Lambda - store the metadata into DDB from Redshift', () => {

  const redshiftDataMock = mockClient(RedshiftDataClient);

  const dynamoDBMock = mockClient(DynamoDBDocumentClient);

  const workGroupName = 'demo';

  beforeEach(() => {
    redshiftDataMock.reset();
    dynamoDBMock.reset();

    jest.spyOn(Date, 'now').mockReturnValue(new Date('2024-01-01').getTime());

    // set the env before loading the source
    process.env.REDSHIFT_MODE = REDSHIFT_MODE.SERVERLESS;
    process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME = workGroupName;
  });

  test('Combine and Store one month metadata, without existing data in DDB', async () => {
    const exeuteId = 'Id-1';
    redshiftDataMock.on(DescribeStatementCommand).resolves({
      Status: StatusString.FINISHED,
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: exeuteId });
    dynamoDBMock.on(BatchWriteCommand).resolves({});

    dynamoDBMock.on(QueryCommand)
      .resolves({
        Items: [],
      });

    dynamoDBMock.on(GetCommand)
      .resolves({
        Item: undefined,
      });

    redshiftDataMock.on(GetStatementResultCommand)
      .resolvesOnce({
        Records: genEventParameterDistinctIdAndMonth(['#202311']),
      })
      .resolvesOnce({
        Records: genEventParameterMetadata(['#202311'], [9, 11, 12, 14]),
      })
      .resolvesOnce({
        Records: genEventDistinctIdAndMonth(['#202311']),
      })
      .resolvesOnce({
        Records: genEventMetadata(['#202311'], [9, 11, 12, 14]),
      })
      .resolvesOnce({
        Records: genUserAttributeDistinctIdAndMonth('#202311'),
      })
      .resolvesOnce({
        Records: genUserAttributeMetadata('#202311', 20),
      });

    const resp = await handler(storeMetadataEvent);

    expect(resp).toEqual({
      detail: {
        appId: 'app1',
        status: 'SUCCEED',
        message: 'store metadata into ddb successfully',
      },
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(1, QueryCommand, {
      ...genQueryCommandExpect('#202311', 'projectId#appId#category#propertyName#valueType'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(2, GetCommand, {
      ...genGetCommandExpect('projectId#appId#category#propertyName#valueType'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(3, QueryCommand, {
      ...genQueryCommandExpect('#202311', 'projectId#appId#eventName'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(4, GetCommand, {
      ...genGetCommandExpect('projectId#appId#eventName'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(5, QueryCommand, {
      ...genQueryCommandExpect('#202311', 'projectId#appId#userattributeName#valueType'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(6, GetCommand, {
      ...genGetCommandExpect('projectId#appId#userattributeName#valueType'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(7, BatchWriteCommand, {
      RequestItems: {
        ClickstreamAnalyticsMetadata: [
          {
            PutRequest: {
              Item: genParameterItemExpect('#202311', [9, 11, 12, 14]),
            },
          },
          {
            PutRequest: {
              Item: genEventItemExpect('#202311', [9, 11, 12, 14]),
            },
          },
          {
            PutRequest: {
              Item: genUserAttributeItemExpect('#202311', 20),
            },
          },
        ],
      },
    });
  });

  test('Combine and Store one month metadata, with existing data in DDB', async () => {
    const exeuteId = 'Id-1';
    redshiftDataMock.on(DescribeStatementCommand).resolves({
      Status: StatusString.FINISHED,
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: exeuteId });
    dynamoDBMock.on(BatchWriteCommand).resolves({});
    dynamoDBMock.on(QueryCommand)
      .resolvesOnce({
        Items: genQueryCommandParameterItemsFromDDB('#202311', 9),
      })
      .resolvesOnce({
        Items: genQueryCommandEventItemsFromDDB('#202311', 9),
      })
      .resolvesOnce({
        Items: genQueryCommandUserAttributeItemsFromDDB('#202311', 9),
      });

    dynamoDBMock.on(GetCommand)
      .resolvesOnce({
        Item: genGetCommandParameterItemFromDDB('#202311', 9),
      })
      .resolvesOnce({
        Item: genGetCommandEventItemFromDDB('#202311', 9),
      })
      .resolvesOnce({
        Item: genGetCommandUserAttributeItemFromDDB('#202311', 9),
      });

    redshiftDataMock.on(GetStatementResultCommand)
      .resolvesOnce({
        Records: genEventParameterDistinctIdAndMonth(['#202311']),
      })
      .resolvesOnce({
        Records: genEventParameterMetadata(['#202311'], [9, 11, 12]),
      })
      .resolvesOnce({
        Records: genEventDistinctIdAndMonth(['#202311']),
      })
      .resolvesOnce({
        Records: genEventMetadata(['#202311'], [9, 11, 12]),
      })
      .resolvesOnce({
        Records: genUserAttributeDistinctIdAndMonth('#202311'),
      })
      .resolvesOnce({
        Records: genUserAttributeMetadata('#202311', 20),
      });

    const resp = await handler(storeMetadataEvent);

    expect(resp).toEqual({
      detail: {
        appId: 'app1',
        status: 'SUCCEED',
        message: 'store metadata into ddb successfully',
      },
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(1, QueryCommand, {
      ...genQueryCommandExpect('#202311', 'projectId#appId#category#propertyName#valueType'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(2, GetCommand, {
      ...genGetCommandExpect('projectId#appId#category#propertyName#valueType'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(3, QueryCommand, {
      ...genQueryCommandExpect('#202311', 'projectId#appId#eventName'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(4, GetCommand, {
      ...genGetCommandExpect('projectId#appId#eventName'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(5, QueryCommand, {
      ...genQueryCommandExpect('#202311', 'projectId#appId#userattributeName#valueType'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(6, GetCommand, {
      ...genGetCommandExpect('projectId#appId#userattributeName#valueType'),
    });

    const eventItem = genEventItemExpect('#202311', [9, 11, 12]);
    const tempAssociatedParameters = eventItem.summary.associatedParameters;
    eventItem.summary.associatedParameters = [];
    eventItem.summary.associatedParameters.push({
      category: 'category',
      name: 'propertyName1',
      valueType: 'String',
    });
    eventItem.summary.associatedParameters.push(
      ...tempAssociatedParameters,
    );

    const userAttributeItem = genUserAttributeItemExpect('#202311', 20);
    userAttributeItem.day9 = {
      hasData: true,
      valueEnum: [
        {
          count: 19,
          value: 'value9',
        },
      ],
    };
    expect(dynamoDBMock).toHaveReceivedNthCommandWith(7, BatchWriteCommand, {
      RequestItems: {
        ClickstreamAnalyticsMetadata: [
          {
            PutRequest: {
              Item: genParameterItemExpect('#202311', [9, 11, 12]),
            },
          },
          {
            PutRequest: {
              Item: eventItem,
            },
          },
          {
            PutRequest: {
              Item: userAttributeItem,
            },
          },
        ],
      },
    });
  });

  test('Combine and Store two months metadata, without existing data in DDB', async () => {
    const exeuteId = 'Id-1';
    redshiftDataMock.on(DescribeStatementCommand).resolves({
      Status: StatusString.FINISHED,
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: exeuteId });
    dynamoDBMock.on(BatchWriteCommand).resolves({});

    dynamoDBMock.on(QueryCommand)
      .resolves({
        Items: [],
      });

    dynamoDBMock.on(GetCommand)
      .resolves({
        Item: undefined,
      });

    redshiftDataMock.on(GetStatementResultCommand)
      .resolvesOnce({
        Records: genEventParameterDistinctIdAndMonth(['#202311', '#202312']),
      })
      .resolvesOnce({
        Records: genEventParameterMetadata(['#202311', '#202312'], [9, 11, 12]),
      })
      .resolvesOnce({
        Records: genEventDistinctIdAndMonth(['#202311', '#202312']),
      })
      .resolvesOnce({
        Records: genEventMetadata(['#202311', '#202312'], [9, 11, 12]),
      })
      .resolvesOnce({
        Records: genUserAttributeDistinctIdAndMonth('#202312'),
      })
      .resolvesOnce({
        Records: genUserAttributeMetadata('#202312', 20),
      });

    const resp = await handler(storeMetadataEvent);

    expect(resp).toEqual({
      detail: {
        appId: 'app1',
        status: 'SUCCEED',
        message: 'store metadata into ddb successfully',
      },
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(1, QueryCommand, {
      ...genQueryCommandExpect('#202311', 'projectId#appId#category#propertyName#valueType'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(2, QueryCommand, {
      ...genQueryCommandExpect('#202312', 'projectId#appId#category#propertyName#valueType'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(3, GetCommand, {
      ...genGetCommandExpect('projectId#appId#category#propertyName#valueType'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(4, QueryCommand, {
      ...genQueryCommandExpect('#202311', 'projectId#appId#eventName'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(5, QueryCommand, {
      ...genQueryCommandExpect('#202312', 'projectId#appId#eventName'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(6, GetCommand, {
      ...genGetCommandExpect('projectId#appId#eventName'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(7, QueryCommand, {
      ...genQueryCommandExpect('#202312', 'projectId#appId#userattributeName#valueType'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(8, GetCommand, {
      ...genGetCommandExpect('projectId#appId#userattributeName#valueType'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(9, BatchWriteCommand, {
      RequestItems: {
        ClickstreamAnalyticsMetadata: [
          {
            PutRequest: {
              Item: genParameterItemExpect('#202311', [9, 11, 12], '#202311'),
            },
          },
          {
            PutRequest: {
              Item: genParameterItemExpect('#202312', [9, 11, 12]),
            },
          },
          {
            PutRequest: {
              Item: genEventItemExpect('#202311', [9, 11, 12], '#202311'),
            },
          },
          {
            PutRequest: {
              Item: genEventItemExpect('#202312', [9, 11, 12]),
            },
          },
          {
            PutRequest: {
              Item: genUserAttributeItemExpect('#202312', 20),
            },
          },
        ],
      },
    });
  });

  test('Scan Oct,Nov and Dec data, with existing Nov data in DDB', async () => {
    const exeuteId = 'Id-1';
    redshiftDataMock.on(DescribeStatementCommand).resolves({
      Status: StatusString.FINISHED,
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: exeuteId });
    dynamoDBMock.on(BatchWriteCommand).resolves({});

    dynamoDBMock.on(QueryCommand)
      .resolvesOnce({
        Items: [],
      })
      .resolvesOnce({
        Items: genQueryCommandParameterItemsFromDDB('#202311', 9),
      })
      .resolvesOnce({
        Items: [],
      })
      .resolvesOnce({
        Items: [],
      })
      .resolvesOnce({
        Items: genQueryCommandEventItemsFromDDB('#202311', 9),
      })
      .resolvesOnce({
        Items: [],
      })
      .resolvesOnce({
        Items: [],
      });

    dynamoDBMock.on(GetCommand)
      .resolvesOnce({
        Item: genGetCommandParameterItemFromDDB('#202311', 9),
      })
      .resolvesOnce({
        Item: genGetCommandEventItemFromDDB('#202311', 9),
      })
      .resolvesOnce({
        Item: genGetCommandUserAttributeItemFromDDB('#202311', 9),
      });

    redshiftDataMock.on(GetStatementResultCommand)
      .resolvesOnce({
        Records: genEventParameterDistinctIdAndMonth(['#202310', '#202311', '#202312']),
      })
      .resolvesOnce({
        Records: genEventParameterMetadata(['#202310', '#202311', '#202312'], [9, 11, 12]),
      })
      .resolvesOnce({
        Records: genEventDistinctIdAndMonth(['#202310', '#202311', '#202312']),
      })
      .resolvesOnce({
        Records: genEventMetadata(['#202310', '#202311', '#202312'], [9, 11, 12]),
      })
      .resolvesOnce({
        Records: genUserAttributeDistinctIdAndMonth('#202312'),
      })
      .resolvesOnce({
        Records: genUserAttributeMetadata('#202312', 20),
      });

    const resp = await handler(storeMetadataEvent);

    expect(resp).toEqual({
      detail: {
        appId: 'app1',
        status: 'SUCCEED',
        message: 'store metadata into ddb successfully',
      },
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(1, QueryCommand, {
      ...genQueryCommandExpect('#202310', 'projectId#appId#category#propertyName#valueType'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(2, QueryCommand, {
      ...genQueryCommandExpect('#202311', 'projectId#appId#category#propertyName#valueType'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(3, QueryCommand, {
      ...genQueryCommandExpect('#202312', 'projectId#appId#category#propertyName#valueType'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(4, GetCommand, {
      ...genGetCommandExpect('projectId#appId#category#propertyName#valueType'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(5, QueryCommand, {
      ...genQueryCommandExpect('#202310', 'projectId#appId#eventName'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(6, QueryCommand, {
      ...genQueryCommandExpect('#202311', 'projectId#appId#eventName'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(7, QueryCommand, {
      ...genQueryCommandExpect('#202312', 'projectId#appId#eventName'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(8, GetCommand, {
      ...genGetCommandExpect('projectId#appId#eventName'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(9, QueryCommand, {
      ...genQueryCommandExpect('#202312', 'projectId#appId#userattributeName#valueType'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(10, GetCommand, {
      ...genGetCommandExpect('projectId#appId#userattributeName#valueType'),
    });

    const userAttributeItem = genUserAttributeItemExpect('#202311', 9, '#202311');

    userAttributeItem.day9 = {
      hasData: true,
      valueEnum: [
        {
          count: 19,
          value: 'value9',
        },
      ],
    };

    userAttributeItem.summary.valueEnum = [
      {
        count: 19,
        value: 'value9',
      },
    ];

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(11, PutCommand, {
      TableName: 'ClickstreamAnalyticsMetadata',
      Item: userAttributeItem,
    });

    const eventItem11 = genEventItemExpect('#202311', [9, 11, 12], '#202311');
    const tempAssociatedParameters = eventItem11.summary.associatedParameters;
    eventItem11.summary.associatedParameters = [];
    eventItem11.summary.associatedParameters.push({
      category: 'category',
      name: 'propertyName1',
      valueType: 'String',
    });
    eventItem11.summary.associatedParameters.push(
      ...tempAssociatedParameters,
    );

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(12, BatchWriteCommand, {
      RequestItems: {
        ClickstreamAnalyticsMetadata: [
          {
            PutRequest: {
              Item: genParameterItemExpect('#202311', [9, 11, 12], '#202311'),
            },
          },
          {
            PutRequest: {
              Item: genParameterItemExpect('#202310', [9, 11, 12], '#202310'),
            },
          },
          {
            PutRequest: {
              Item: genParameterItemExpect('#202312', [9, 11, 12]),
            },
          },
          {
            PutRequest: {
              Item: eventItem11,
            },
          },
          {
            PutRequest: {
              Item: genEventItemExpect('#202310', [9, 11, 12], '#202310'),
            },
          },
          {
            PutRequest: {
              Item: genEventItemExpect('#202312', [9, 11, 12]),
            },
          },
          {
            PutRequest: {
              Item: genUserAttributeItemExpect('#202312', 20),
            },
          },
        ],
      },
    });
  });

  test('Scan Nov and Dec data, with existing Sept and Oct data in DDB', async () => {
    const exeuteId = 'Id-1';
    redshiftDataMock.on(DescribeStatementCommand).resolves({
      Status: StatusString.FINISHED,
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: exeuteId });
    dynamoDBMock.on(BatchWriteCommand).resolves({});

    dynamoDBMock.on(QueryCommand)
      .resolves({
        Items: [],
      });

    dynamoDBMock.on(GetCommand)
      .resolvesOnce({
        Item: genGetCommandParameterItemFromDDB('#202310', 9),
      })
      .resolvesOnce({
        Item: genGetCommandEventItemFromDDB('#202310', 9),
      })
      .resolvesOnce({
        Item: genGetCommandUserAttributeItemFromDDB('#202310', 9),
      });

    redshiftDataMock.on(GetStatementResultCommand)
      .resolvesOnce({
        Records: genEventParameterDistinctIdAndMonth(['#202311', '#202312']),
      })
      .resolvesOnce({
        Records: genEventParameterMetadata(['#202311', '#202312'], [9, 11, 12]),
      })
      .resolvesOnce({
        Records: genEventDistinctIdAndMonth(['#202311', '#202312']),
      })
      .resolvesOnce({
        Records: genEventMetadata(['#202311', '#202312'], [9, 11, 12]),
      })
      .resolvesOnce({
        Records: genUserAttributeDistinctIdAndMonth('#202312'),
      })
      .resolvesOnce({
        Records: genUserAttributeMetadata('#202312', 20),
      });

    const resp = await handler(storeMetadataEvent);

    expect(resp).toEqual({
      detail: {
        appId: 'app1',
        status: 'SUCCEED',
        message: 'store metadata into ddb successfully',
      },
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(1, QueryCommand, {
      ...genQueryCommandExpect('#202311', 'projectId#appId#category#propertyName#valueType'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(2, QueryCommand, {
      ...genQueryCommandExpect('#202312', 'projectId#appId#category#propertyName#valueType'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(3, GetCommand, {
      ...genGetCommandExpect('projectId#appId#category#propertyName#valueType'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(4, PutCommand, {
      TableName: 'ClickstreamAnalyticsMetadata',
      Item: genParameterItemExpect('#202310', [9], '#202310'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(5, QueryCommand, {
      ...genQueryCommandExpect('#202311', 'projectId#appId#eventName'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(6, QueryCommand, {
      ...genQueryCommandExpect('#202312', 'projectId#appId#eventName'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(7, GetCommand, {
      ...genGetCommandExpect('projectId#appId#eventName'),
    });

    const eventItem = genEventItemExpect('#202310', [9], '#202310');
    eventItem.summary.associatedParameters = [];
    eventItem.summary.associatedParameters.push({
      category: 'category',
      name: 'propertyName1',
      valueType: 'String',
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(8, PutCommand, {
      TableName: 'ClickstreamAnalyticsMetadata',
      Item: eventItem,
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(9, QueryCommand, {
      ...genQueryCommandExpect('#202312', 'projectId#appId#userattributeName#valueType'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(10, GetCommand, {
      ...genGetCommandExpect('projectId#appId#userattributeName#valueType'),
    });

    const userAttributeItem = genUserAttributeItemExpect('#202310', 9, '#202310');

    userAttributeItem.day9 = {
      hasData: true,
      valueEnum: [
        {
          count: 19,
          value: 'value9',
        },
      ],
    };

    userAttributeItem.summary.valueEnum = [
      {
        count: 19,
        value: 'value9',
      },
    ];

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(11, PutCommand, {
      TableName: 'ClickstreamAnalyticsMetadata',
      Item: userAttributeItem,
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(12, BatchWriteCommand, {
      RequestItems: {
        ClickstreamAnalyticsMetadata: [
          {
            PutRequest: {
              Item: genParameterItemExpect('#202311', [9, 11, 12], '#202311'),
            },
          },
          {
            PutRequest: {
              Item: genParameterItemExpect('#202312', [9, 11, 12]),
            },
          },
          {
            PutRequest: {
              Item: genEventItemExpect('#202311', [9, 11, 12], '#202311'),
            },
          },
          {
            PutRequest: {
              Item: genEventItemExpect('#202312', [9, 11, 12]),
            },
          },
          {
            PutRequest: {
              Item: genUserAttributeItemExpect('#202312', 20),
            },
          },
        ],
      },
    });
  });

  test('Scan Oct and Nov data, with existing Dec data in DDB', async () => {
    const exeuteId = 'Id-1';
    redshiftDataMock.on(DescribeStatementCommand).resolves({
      Status: StatusString.FINISHED,
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: exeuteId });
    dynamoDBMock.on(BatchWriteCommand).resolves({});

    dynamoDBMock.on(QueryCommand)
      .resolves({
        Items: [],
      });

    dynamoDBMock.on(GetCommand)
      .resolvesOnce({
        Item: genGetCommandParameterItemFromDDB('#202312', 9),
      })
      .resolvesOnce({
        Item: genGetCommandEventItemFromDDB('#202312', 9),
      })
      .resolvesOnce({
        Item: genGetCommandUserAttributeItemFromDDB('#202312', 9),
      });

    redshiftDataMock.on(GetStatementResultCommand)
      .resolvesOnce({
        Records: genEventParameterDistinctIdAndMonth(['#202310', '#202311']),
      })
      .resolvesOnce({
        Records: genEventParameterMetadata(['#202310', '#202311'], [9, 11, 12]),
      })
      .resolvesOnce({
        Records: genEventDistinctIdAndMonth(['#202310', '#202311']),
      })
      .resolvesOnce({
        Records: genEventMetadata(['#202310', '#202311'], [9, 11, 12]),
      })
      .resolvesOnce({
        Records: genUserAttributeDistinctIdAndMonth('#202312'),
      })
      .resolvesOnce({
        Records: genUserAttributeMetadata('#202312', 20),
      });

    const resp = await handler(storeMetadataEvent);

    expect(resp).toEqual({
      detail: {
        appId: 'app1',
        status: 'SUCCEED',
        message: 'store metadata into ddb successfully',
      },
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(1, QueryCommand, {
      ...genQueryCommandExpect('#202310', 'projectId#appId#category#propertyName#valueType'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(2, QueryCommand, {
      ...genQueryCommandExpect('#202311', 'projectId#appId#category#propertyName#valueType'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(3, GetCommand, {
      ...genGetCommandExpect('projectId#appId#category#propertyName#valueType'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(4, QueryCommand, {
      ...genQueryCommandExpect('#202310', 'projectId#appId#eventName'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(5, QueryCommand, {
      ...genQueryCommandExpect('#202311', 'projectId#appId#eventName'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(6, GetCommand, {
      ...genGetCommandExpect('projectId#appId#eventName'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(7, QueryCommand, {
      ...genQueryCommandExpect('#202312', 'projectId#appId#userattributeName#valueType'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(8, GetCommand, {
      ...genGetCommandExpect('projectId#appId#userattributeName#valueType'),
    });

    expect(dynamoDBMock).toHaveReceivedNthCommandWith(9, BatchWriteCommand, {
      RequestItems: {
        ClickstreamAnalyticsMetadata: [
          {
            PutRequest: {
              Item: genParameterItemExpect('#202310', [9, 11, 12], '#202310'),
            },
          },
          {
            PutRequest: {
              Item: genParameterItemExpect('#202311', [9, 11, 12], '#202311'),
            },
          },
          {
            PutRequest: {
              Item: genEventItemExpect('#202310', [9, 11, 12], '#202310'),
            },
          },
          {
            PutRequest: {
              Item: genEventItemExpect('#202311', [9, 11, 12], '#202311'),
            },
          },
          {
            PutRequest: {
              Item: genUserAttributeItemExpect('#202312', 20),
            },
          },
        ],
      },
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
    const resp = await handler(storeMetadataEvent);
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
    const resp = await handler(storeMetadataEvent);
    expect(resp).toEqual({
      detail: {
        appId: 'app1',
        status: 'FAILED',
        message: 'store metadata into ddb failed',
      },
    });
  });
});

function genEventDistinctIdAndMonth(monthList: string[]) {
  return monthList.map(month => {
    return [
      { stringValue: 'projectId#appId#eventName' },
      { stringValue: month },
    ];
  });
}

function genEventMetadata(monthList: string[], dayNumberList: number[]) {
  const result: any[] = [];
  monthList.forEach(month => {
    dayNumberList.forEach(dayNumber => {
      result.push([
        { stringValue: 'projectId#appId#eventName' },
        { stringValue: month },
        { stringValue: 'EVENT#projectId#appId' },
        { stringValue: 'projectId' },
        { stringValue: 'appId' },
        { longValue: dayNumber },
        { longValue: 20 + dayNumber },
        { stringValue: 'eventName' },
        { stringValue: `ANDROID${dayNumber}#|!|#IOS${dayNumber}` },
        { stringValue: `Version${dayNumber}#|!|#Version${dayNumber}` },
        { stringValue: `sdkA${dayNumber}#|!|#sdkB${dayNumber}` },
      ]);
    });
  });
  return result;
}

function genEventParameterDistinctIdAndMonth(monthList: string[]) {
  return monthList.map(month => {
    return [
      { stringValue: 'projectId#appId#category#propertyName#valueType' },
      { stringValue: month },
    ];
  });
}

function genEventParameterMetadata(monthList: string[], dayNumberList: number[]) {
  const result: any[] = [];
  monthList.forEach(month => {
    dayNumberList.forEach(dayNumber => {
      result.push(
        [
          { stringValue: 'projectId#appId#category#propertyName#valueType' },
          { stringValue: month },
          { stringValue: 'EVENT_PARAMETER#projectId#appId' },
          { stringValue: 'projectId' },
          { stringValue: 'appId' },
          { longValue: dayNumber },
          { stringValue: 'category' },
          { stringValue: `eventName#|!|#eventA${dayNumber}#|!|#eventB${dayNumber}` },
          { stringValue: 'propertyName' },
          { stringValue: 'String' },
          { stringValue: `value${dayNumber}` },
          { longValue: 10 + dayNumber },
          { stringValue: `ANDROID${dayNumber}#|!|#IOS${dayNumber}` },
        ],
        [
          { stringValue: 'projectId#appId#category#propertyName#valueType' },
          { stringValue: month },
          { stringValue: 'EVENT_PARAMETER#projectId#appId' },
          { stringValue: 'projectId' },
          { stringValue: 'appId' },
          { longValue: dayNumber },
          { stringValue: 'category' },
          { stringValue: `eventName#|!|#eventA${dayNumber}#|!|#eventB${dayNumber}` },
          { stringValue: 'propertyName' },
          { stringValue: 'String' },
          { stringValue: 'valueCommon' },
          { longValue: 10 + dayNumber },
          { stringValue: `ANDROID${dayNumber}#|!|#IOS${dayNumber}` },
        ],
      );
    });
  });
  return result;
}

function genUserAttributeDistinctIdAndMonth(month: string) {
  return [
    [
      { stringValue: 'projectId#appId#userattributeName#valueType' },
      { stringValue: month },
    ],
  ];
}

function genUserAttributeMetadata(month: string, dayNumber: number) {
  return [
    [
      { stringValue: 'projectId#appId#userattributeName#valueType' },
      { stringValue: month },
      { stringValue: 'USER_ATTRIBUTE#projectId#appId' },
      { stringValue: 'projectId' },
      { stringValue: 'appId' },
      { longValue: dayNumber },
      { stringValue: 'category' },
      { stringValue: 'userattributename' },
      { stringValue: 'String' },
      { stringValue: `value1_${dayNumber}#|!|#value2_${dayNumber}#|!|#value3_${dayNumber}` },
      { stringValue: `ANDROID${dayNumber}#|!|#IOS${dayNumber}` },
    ],
  ];
}

function genGetCommandExpect(id: string) {
  return {
    TableName: 'ClickstreamAnalyticsMetadata',
    Key: {
      id: id,
      month: 'latest',
    },
  };
}

function genQueryCommandExpect(originMonth: string, id: string) {
  return {
    TableName: 'ClickstreamAnalyticsMetadata',
    ExpressionAttributeNames: {
      '#id': 'id',
      '#originMonth': 'originMonth',
    },
    ExpressionAttributeValues: {
      ':id': id,
      ':originMonth': originMonth,
    },
    FilterExpression: '#originMonth = :originMonth',
    KeyConditionExpression: '#id= :id',
    ScanIndexForward: false,
  };
}

function genQueryCommandParameterItemsFromDDB(originMonth: string, dayNumber: number, inputMonth: string = 'latest') {
  return [genGetCommandParameterItemFromDDB(originMonth, dayNumber, inputMonth)];
}

function genGetCommandParameterItemFromDDB(originMonth: string, dayNumber: number, inputMonth: string = 'latest') {
  return {
    id: 'projectId#appId#category#propertyName#valueType',
    month: inputMonth,
    originMonth: originMonth,
    prefix: 'EVENT_PARAMETER#projectId#appId',
    projectId: 'projectId',
    appId: 'appId',
    name: 'propertyName',
    category: 'category',
    valueType: 'String',
    createTimestamp: 1704067200000,
    updateTimestamp: 1704067300000,
    [`day${dayNumber}`]: {
      hasData: true,
      platform: [`ANDROID${dayNumber}`, `IOS${dayNumber}`],
      valueEnum: [
        {
          count: 10 + dayNumber,
          value: `value${dayNumber}`,
        },
        {
          count: 10 + dayNumber,
          value: 'valueCommon',
        },
      ],
    },
    summary: {
      hasData: true,
      platform: [`ANDROID${dayNumber}`, `IOS${dayNumber}`],
      associatedEvents: ['eventName', `eventA${dayNumber}`, `eventB${dayNumber}`],
      valueEnum: [
        {
          count: 10 + dayNumber,
          value: `value${dayNumber}`,
        },
        {
          count: 10 + dayNumber,
          value: 'valueCommon',
        },
      ],
    },
  };
}

function genQueryCommandEventItemsFromDDB(originMonth: string, dayNumber: number) {
  return [genGetCommandEventItemFromDDB(originMonth, dayNumber)];
}

function genGetCommandEventItemFromDDB(originMonth: string, dayNumber: number, inputMonth: string = 'latest') {
  return {
    id: 'projectId#appId#eventName',
    month: inputMonth,
    originMonth: originMonth,
    prefix: 'EVENT#projectId#appId',
    projectId: 'projectId',
    appId: 'appId',
    name: 'eventName',
    createTimestamp: 1704067200000,
    updateTimestamp: 1704067300000,
    [`day${dayNumber}`]: {
      count: 20 + dayNumber,
      hasData: true,
      platform: [`ANDROID${dayNumber}`, `IOS${dayNumber}`],
      sdkVersion: [`Version${dayNumber}`],
      sdkName: [`sdkA${dayNumber}`, `sdkB${dayNumber}`],
    },
    summary: {
      platform: [`ANDROID${dayNumber}`, `IOS${dayNumber}`],
      sdkVersion: [`Version${dayNumber}`],
      sdkName: [`sdkA${dayNumber}`, `sdkB${dayNumber}`],
      latestCount: 20 + dayNumber,
      associatedParameters: [
        {
          category: 'category',
          name: 'propertyName1',
          valueType: 'String',
        },
      ],
      hasData: true,
    },
  };
}

function genQueryCommandUserAttributeItemsFromDDB(originMonth: string, dayNumber: number) {
  return [genGetCommandUserAttributeItemFromDDB(originMonth, dayNumber)];
}

function genGetCommandUserAttributeItemFromDDB(originMonth: string, dayNumber: number) {
  return {
    id: 'projectId#appId#userattributeName#valueType',
    month: 'latest',
    originMonth: originMonth,
    prefix: 'USER_ATTRIBUTE#projectId#appId',
    projectId: 'projectId',
    appId: 'appId',
    name: 'userattributename',
    category: 'category',
    valueType: 'String',
    createTimestamp: 1704067200000,
    updateTimestamp: 1704067300000,
    [`day${dayNumber}`]: {
      hasData: true,
      valueEnum: [
        {
          count: 10 + dayNumber,
          value: `value${dayNumber}`,
        },
      ],
    },
    summary: {
      hasData: true,
      valueEnum: [
        {
          count: 10 + dayNumber,
          value: `value${dayNumber}`,
        },
      ],
    },
  };
}

function genParameterItemExpect(month: string, dayNumberList: number[], inputMonth: string = 'latest') {
  const item: any = {};
  item.id = 'projectId#appId#category#propertyName#valueType';
  item.month = inputMonth;
  item.originMonth = month;
  item.prefix = 'EVENT_PARAMETER#projectId#appId';
  item.projectId = 'projectId';
  item.createTimestamp = 1704067200000;
  item.updateTimestamp = 1704067200000;
  item.appId = 'appId';
  item.name = 'propertyName';
  item.category = 'category';
  item.valueType = 'String';
  dayNumberList.forEach(dayNumber => {
    item[`day${dayNumber}`] = {
      hasData: true,
      platform: [`ANDROID${dayNumber}`, `IOS${dayNumber}`],
      valueEnum: [
        {
          count: 10 + dayNumber,
          value: `value${dayNumber}`,
        },
        {
          count: 10 + dayNumber,
          value: 'valueCommon',
        },
      ],
    };
  });
  const associatedEvents: string[] = [];
  associatedEvents.push('eventName');
  dayNumberList.forEach(dayNumber => {
    associatedEvents.push(`eventA${dayNumber}`);
    associatedEvents.push(`eventB${dayNumber}`);
  });

  const valueEnum: any[] = [];

  let valueCommonCount = 0;
  dayNumberList.forEach(dayNumber => {
    valueCommonCount += 10 + dayNumber;
  });

  let pushedValueCommon = false;
  dayNumberList.forEach(dayNumber => {
    valueEnum.push({
      count: 10 + dayNumber,
      value: `value${dayNumber}`,
    });
    if (!pushedValueCommon) {
      valueEnum.push({
        count: valueCommonCount,
        value: 'valueCommon',
      });
      pushedValueCommon = true;
    }
  });

  const platform: string[] = [];
  dayNumberList.forEach(dayNumber => {
    platform.push(`ANDROID${dayNumber}`);
    platform.push(`IOS${dayNumber}`);
  });

  item.summary = {
    hasData: true,
    platform: platform,
    associatedEvents: associatedEvents,
    valueEnum: valueEnum,
  };

  return item;
}

function genEventItemExpect(month: string, dayNumberList: number[], inputMonth: string = 'latest') {
  const item: any = {};
  item.id = 'projectId#appId#eventName';
  item.month = inputMonth;
  item.originMonth = month;
  item.prefix = 'EVENT#projectId#appId';
  item.projectId = 'projectId';
  item.createTimestamp = 1704067200000;
  item.updateTimestamp = 1704067200000;
  item.appId = 'appId';
  item.name = 'eventName';

  dayNumberList.forEach(dayNumber => {
    item[`day${dayNumber}`] = {
      count: 20 + dayNumber,
      hasData: true,
      platform: [`ANDROID${dayNumber}`, `IOS${dayNumber}`],
      sdkVersion: [`Version${dayNumber}`],
      sdkName: [`sdkA${dayNumber}`, `sdkB${dayNumber}`],
    };
  });
  const associatedParameters: any[] = [];
  associatedParameters.push({
    category: 'category',
    name: 'propertyName',
    valueType: 'String',
  });

  const sdkVersion: string[] = [];
  const sdkName: string[] = [];
  const platform: string[] = [];

  dayNumberList.forEach(dayNumber => {
    sdkVersion.push(`Version${dayNumber}`);
    sdkName.push(`sdkA${dayNumber}`);
    sdkName.push(`sdkB${dayNumber}`);
    platform.push(`ANDROID${dayNumber}`);
    platform.push(`IOS${dayNumber}`);
  });

  item.summary = {
    platform: platform,
    latestCount: 20 + dayNumberList[dayNumberList.length - 1],
    sdkVersion: sdkVersion,
    sdkName: sdkName,
    associatedParameters: associatedParameters,
    hasData: true,
  };

  return item;
}

function genUserAttributeItemExpect(month: string, dayNumber: number, inputMonth: string = 'latest') {
  const item: any = {};
  item.id = 'projectId#appId#userattributeName#valueType';
  item.month = inputMonth;
  item.originMonth = month;
  item.prefix = 'USER_ATTRIBUTE#projectId#appId';
  item.projectId = 'projectId';
  item.createTimestamp = 1704067200000;
  item.updateTimestamp = 1704067200000;
  item.appId = 'appId';
  item.name = 'userattributename';
  item.category = 'category';
  item.valueType = 'String';
  item[`day${dayNumber}`] = {
    hasData: true,
    valueEnum: [
      {
        count: dayNumber,
        value: 'value1',
      },
      {
        count: dayNumber,
        value: 'value2',
      },
      {
        count: dayNumber,
        value: 'value3',
      },
    ],
  };
  item.summary = {
    hasData: true,
    valueEnum: [
      {
        count: dayNumber,
        value: 'value1',
      },
      {
        count: dayNumber,
        value: 'value2',
      },
      {
        count: dayNumber,
        value: 'value3',
      },
    ],
  };
  return item;
}