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

import { DynamoDBClient, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';
import { GetStatementResultCommand, DescribeStatementCommand, ExecuteStatementCommand, RedshiftDataClient, StatusString } from '@aws-sdk/client-redshift-data';
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

  const dynamoDBMock = mockClient(DynamoDBClient);

  const workGroupName = 'demo';

  beforeEach(() => {
    redshiftDataMock.reset();

    // set the env before loading the source
    process.env.REDSHIFT_MODE = REDSHIFT_MODE.SERVERLESS;
    process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME = workGroupName;
  });

  test('Store metadata with response FINISHED', async () => {
    const exeuteId = 'Id-1';
    redshiftDataMock.on(DescribeStatementCommand).resolves({
      Status: StatusString.FINISHED,
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: exeuteId });
    dynamoDBMock.on(BatchWriteItemCommand).resolves({});
    redshiftDataMock.on(GetStatementResultCommand)
      .resolvesOnce({
        Records: [
          [
            { stringValue: 'projectId#appId#eventName' },
            { stringValue: 'EVENT#sprojectId#appId#eventName' },
            { stringValue: 'EVENT#projectId#appId' },
            { stringValue: 'projectId' },
            { stringValue: 'appId' },
            { stringValue: 'eventName' },
            { stringValue: 'custom' },
            { stringValue: '2000' },
            { stringValue: '[ANDROID,IOS]' },
          ],
        ],
      })
      .resolvesOnce({
        Records: [
          [
            { stringValue: 'projectId#appId#eventName#propertyName' },
            { stringValue: 'EVENT#sprojectId#appId#eventName' },
            { stringValue: 'EVENT_PARAMETER#projectId#appId' },
            { stringValue: 'eventName' },
            { stringValue: 'projectId' },
            { stringValue: 'appId' },
            { stringValue: 'category' },
            { stringValue: 'custom' },
            { stringValue: 'Private' },
            { stringValue: 'propertyName' },
            { stringValue: 'propertyId' },
            { stringValue: 'String' },
            { stringValue: '[value1, value2, value3]' },
            { stringValue: '[ANDROID,IOS]' },
          ],
        ],
      });
    const dateNowSpy = jest.spyOn(Date, 'now');
    const timestamp = 1695120657125;
    dateNowSpy.mockReturnValue(timestamp);
    const resp = await handler(checkScanMetadataStatusEvent);

    expect(dynamoDBMock).toHaveReceivedCommandWith(BatchWriteItemCommand, {
      RequestItems: {
        ClickstreamAnalyticsMetadata: [
          {
            PutRequest: {
              Item: {
                appId: {
                  S: 'appId',
                },
                createAt: {
                  N: '1695120657125',
                },
                dataVolumeLastDay: {
                  N: '2000',
                },
                deleted: {
                  BOOL: false,
                },
                description: {
                  S: '',
                },
                displayName: {
                  S: '',
                },
                hasData: {
                  BOOL: true,
                },
                id: {
                  S: 'projectId#appId#eventName',
                },
                metadataSource: {
                  S: 'custom',
                },
                name: {
                  S: 'eventName',
                },
                operator: {
                  S: '',
                },
                platform: {
                  L: [
                    {
                      S: 'ANDROID',
                    },
                    {
                      S: 'IOS',
                    },
                  ],
                },
                prefix: {
                  S: 'EVENT#projectId#appId',
                },
                projectId: {
                  S: 'projectId',
                },
                ttl: {
                  N: '1695725457',
                },
                type: {
                  S: 'EVENT#sprojectId#appId#eventName',
                },
                updateAt: {
                  N: '1695120657125',
                },
              },
            },
          },
          {
            PutRequest: {
              Item: {
                appId: {
                  S: 'appId',
                },
                category: {
                  S: 'category',
                },
                createAt: {
                  N: '1695120657125',
                },
                deleted: {
                  BOOL: false,
                },
                description: {
                  S: '',
                },
                displayName: {
                  S: '',
                },
                eventDescription: {
                  S: '',
                },
                eventDisplayName: {
                  S: '',
                },
                eventName: {
                  S: 'eventName',
                },
                hasData: {
                  BOOL: true,
                },
                id: {
                  S: 'projectId#appId#eventName#propertyName',
                },
                metadataSource: {
                  S: 'custom',
                },
                name: {
                  S: 'propertyName',
                },
                operator: {
                  S: '',
                },
                parameterId: {
                  S: 'propertyId',
                },
                parameterType: {
                  S: 'Private',
                },
                platform: {
                  L: [
                    {
                      S: 'ANDROID',
                    },
                    {
                      S: 'IOS',
                    },
                  ],
                },
                prefix: {
                  S: 'EVENT_PARAMETER#projectId#appId',
                },
                projectId: {
                  S: 'projectId',
                },
                ttl: {
                  N: '1695725457',
                },
                type: {
                  S: 'EVENT#sprojectId#appId#eventName',
                },
                updateAt: {
                  N: '1695120657125',
                },
                valueEnum: {
                  L: [
                    {
                      S: 'value1',
                    },
                    {
                      S: ' value2',
                    },
                    {
                      S: ' value3',
                    },
                  ],
                },
                valueType: {
                  S: 'String',
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
      Sql: 'SELECT id, type, prefix, project_id, app_id, event_name, metadata_source, data_volumel_last_day, platform FROM app1.event_metadata;',
      WithEvent: true,
      WorkgroupName: 'demo',
    });
    expect(redshiftDataMock).toHaveReceivedNthCommandWith(2, DescribeStatementCommand, {
      Id: 'Id-1',
    });
    expect(redshiftDataMock).toHaveReceivedNthCommandWith(3, GetStatementResultCommand, {
      Id: 'Id-1',
    });
    expect(redshiftDataMock).toHaveReceivedNthCommandWith(4, ExecuteStatementCommand, {
      ClusterIdentifier: undefined,
      Database: 'project1',
      DbUser: undefined,
      Sql: 'SELECT id, type, prefix, event_name, project_id, app_id, category, metadata_source, property_type, property_name, property_id, value_type, value_enum, platform FROM app1.event_properties_metadata;',
      WithEvent: true,
      WorkgroupName: 'demo',
    });
    expect(redshiftDataMock).toHaveReceivedNthCommandWith(5, DescribeStatementCommand, {
      Id: 'Id-1',
    });
    expect(redshiftDataMock).toHaveReceivedNthCommandWith(6, GetStatementResultCommand, {
      Id: 'Id-1',
    });
  });

  test('Store metadata for query id is undefined', async () => {
    redshiftDataMock.on(DescribeStatementCommand).resolvesOnce({
      Status: StatusString.FAILED,
    });
    redshiftDataMock.on(ExecuteStatementCommand).resolves({ Id: undefined });
    dynamoDBMock.on(BatchWriteItemCommand).resolves({});
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
    dynamoDBMock.on(BatchWriteItemCommand).resolves({});
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
