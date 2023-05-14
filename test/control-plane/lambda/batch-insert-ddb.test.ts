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
import {
  DynamoDBClient,
  BatchWriteItemCommand,
} from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { CdkCustomResourceEvent, CdkCustomResourceResponse } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { handler } from '../../../src/control-plane/backend/lambda/batch-insert-ddb/index';
import { getMockContext } from '../../common/lambda-context';
import { basicCloudFormationEvent } from '../../common/lambda-events';
import 'aws-sdk-client-mock-jest';

describe('Dictionary Data', () => {

  const context = getMockContext();
  const ddbMock = mockClient(DynamoDBClient);
  const docMock = mockClient(DynamoDBDocumentClient);

  const basicEvent = {
    ...basicCloudFormationEvent,
    ResourceProperties: {
      ...basicCloudFormationEvent.ResourceProperties,
      tableName: 'Dictionary',
    },
  };

  const createDictionaryEvent = {
    ...basicEvent,
    ResourceProperties: {
      ...basicEvent.ResourceProperties,
    },
  };

  const updateDictionaryEvent: CdkCustomResourceEvent = {
    ...createDictionaryEvent,
    OldResourceProperties: createDictionaryEvent.ResourceProperties,
    ResourceProperties: {
      ...createDictionaryEvent.ResourceProperties,
    },
    PhysicalResourceId: 'physical-resource-id',
    RequestType: 'Update',
  };

  const deleteDictionaryEvent: CdkCustomResourceEvent = {
    ...basicEvent,
    PhysicalResourceId: 'physical-resource-id',
    RequestType: 'Delete',
  };

  beforeEach(() => {
    ddbMock.reset();
    docMock.reset();
  });

  test('Initialize Dictionary', async () => {
    const event = {
      ...createDictionaryEvent,
      ResourceProperties: {
        ...createDictionaryEvent.ResourceProperties,
        items: [
          {
            name: 'Templates',
            data: {
              ingestion_s3: 'ingestion-server-s3-stack.template.json',
            },
          },
        ],
      },
    };
    docMock.on(ScanCommand).resolvesOnce({ Items: [] });
    docMock.on(DeleteCommand).resolves({});
    ddbMock.on(BatchWriteItemCommand).resolvesOnce({});
    const resp = await handler(event, context) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(docMock).toHaveReceivedCommandTimes(ScanCommand, 1);
    expect(docMock).toHaveReceivedCommandTimes(DeleteCommand, 0);
    expect(ddbMock).toHaveReceivedNthSpecificCommandWith(1, BatchWriteItemCommand, {
      RequestItems: {
        Dictionary: [
          {
            PutRequest: {
              Item: {
                data: {
                  M: {
                    ingestion_s3: {
                      S: 'ingestion-server-s3-stack.template.json',
                    },
                  },
                },
                name: {
                  S: 'Templates',
                },
              },
            },
          },
        ],
      },
    });
  });

  test('Initialize Dictionary with plugins', async () => {
    const event = {
      ...createDictionaryEvent,
      ResourceProperties: {
        ...createDictionaryEvent.ResourceProperties,
        items: [
          {
            name: 'BuildInPlugins',
            data: [
              {
                id: 'BUILDIN-1',
                type: 'PLUGIN#BUILDIN-1',
                prefix: 'PLUGIN',
                name: 'Transformer',
                description: 'Description of Transformer',
                builtIn: true,
                mainFunction: 'software.aws.solution.clickstream.Transformer',
                jarFile: '',
                bindCount: 0,
                pluginType: 'Transform',
                dependencyFiles: [],
                operator: '',
                deleted: false,
                createAt: 1667355960000,
                updateAt: 1667355960000,
              },
            ],
          },
        ],
      },
    };
    docMock.on(ScanCommand).resolvesOnce({ Items: [] });
    docMock.on(DeleteCommand).resolves({});
    ddbMock.on(BatchWriteItemCommand).resolvesOnce({});
    const resp = await handler(event, context) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(docMock).toHaveReceivedCommandTimes(ScanCommand, 1);
    expect(docMock).toHaveReceivedCommandTimes(DeleteCommand, 0);
    expect(ddbMock).toHaveReceivedNthSpecificCommandWith(1, BatchWriteItemCommand, {
      RequestItems: {
        Dictionary: [
          {
            PutRequest: {
              Item: {
                data: {
                  L: [
                    {
                      M: {
                        bindCount: {
                          N: '0',
                        },
                        builtIn: {
                          BOOL: true,
                        },
                        createAt: {
                          N: '1667355960000',
                        },
                        deleted: {
                          BOOL: false,
                        },
                        dependencyFiles: {
                          L: [],
                        },
                        description: {
                          S: 'Description of Transformer',
                        },
                        id: {
                          S: 'BUILDIN-1',
                        },
                        jarFile: {
                          NULL: true,
                        },
                        mainFunction: {
                          S: 'software.aws.solution.clickstream.Transformer',
                        },
                        name: {
                          S: 'Transformer',
                        },
                        operator: {
                          NULL: true,
                        },
                        pluginType: {
                          S: 'Transform',
                        },
                        prefix: {
                          S: 'PLUGIN',
                        },
                        type: {
                          S: 'PLUGIN#BUILDIN-1',
                        },
                        updateAt: {
                          N: '1667355960000',
                        },
                      },
                    },
                  ],
                },
                name: {
                  S: 'BuildInPlugins',
                },
              },
            },
          },
        ],
      },
    });
  });

  test('Update Dictionary', async () => {
    const event = {
      ...updateDictionaryEvent,
      ResourceProperties: {
        ...updateDictionaryEvent.ResourceProperties,
        items: [
          {
            name: 'Templates',
            data: {
              ingestion_s3: 'ingestion-server-s3-stack.template.json',
              ingestion_kafka: 'ingestion-server-kafka-stack.template.json',
            },
          },
        ],
      },
    };
    docMock.on(ScanCommand).resolvesOnce({ Items: [{ name: 'D1', data: {} }] });
    docMock.on(DeleteCommand).resolves({});
    ddbMock.on(BatchWriteItemCommand).resolvesOnce({});
    const resp = await handler(event, context) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(docMock).toHaveReceivedCommandTimes(ScanCommand, 1);
    expect(docMock).toHaveReceivedCommandTimes(DeleteCommand, 1);
    expect(ddbMock).toHaveReceivedNthSpecificCommandWith(1, BatchWriteItemCommand, {
      RequestItems: {
        Dictionary: [
          {
            PutRequest: {
              Item: {
                data: {
                  M: {
                    ingestion_kafka: {
                      S: 'ingestion-server-kafka-stack.template.json',
                    },
                    ingestion_s3: {
                      S: 'ingestion-server-s3-stack.template.json',
                    },
                  },
                },
                name: {
                  S: 'Templates',
                },
              },
            },
          },
        ],
      },
    });
  });

  test('Delete Dictionary', async () => {
    const event = deleteDictionaryEvent;
    docMock.on(ScanCommand).resolvesOnce({
      Items: [
        { name: 'D1', data: {} },
        { name: 'D2', data: {} },
      ],
    });
    docMock.on(DeleteCommand).resolves({});
    const resp = await handler(event, context) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(docMock).toHaveReceivedCommandTimes(ScanCommand, 0);
    expect(docMock).toHaveReceivedCommandTimes(DeleteCommand, 0);
    expect(ddbMock).toHaveReceivedCommandTimes(BatchWriteItemCommand, 0);
  });

});
