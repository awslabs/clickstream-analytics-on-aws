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
import { ConditionCategory, MetadataValueType } from '@aws/clickstream-base-lib';
import {
  QueryCommand,
  QueryCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { MOCK_APP_ID, MOCK_EVENT_PARAMETER_NAME, MOCK_EVENT_NAME, MOCK_PROJECT_ID, MOCK_USER_ATTRIBUTE_NAME, dictionaryMock } from './ddb-mock';
import { BASE_STATUS, MSK_DATA_PROCESSING_NEW_SERVERLESS_PIPELINE_WITH_WORKFLOW } from './pipeline-mock';
import { analyticsMetadataTable, clickStreamTableName, prefixMonthGSIName, prefixTimeGSIName } from '../../common/constants';
import 'aws-sdk-client-mock-jest';


export const MOCK_EVENT = {
  id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
  month: '#202301',
  prefix: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
  projectId: MOCK_PROJECT_ID,
  appId: MOCK_APP_ID,
  name: MOCK_EVENT_NAME,
  day1: {
    count: 1,
    hasData: true,
    platform: [
      'iOS',
    ],
    sdkName: ['Clickstream SDK'],
    sdkVersion: ['v1.0.0'],
  },
  day31: {
    count: 2,
    hasData: true,
    platform: [
      'Android',
    ],
    sdkName: ['Clickstream SDK'],
    sdkVersion: ['v1.0.1'],
  },
  summary: {
    dataVolumeLastDay: 2048,
    hasData: true,
    platform: [
      'Android',
      'iOS',
    ],
    sdkName: ['Clickstream SDK'],
    sdkVersion: ['v1.0.0', 'v1.0.1'],
  },
};

export const MOCK_EVENT_V2 = {
  ...MOCK_EVENT,
  month: 'latest',
  summary: {
    ...MOCK_EVENT.summary,
    latestCount: 43465,
    associatedParameters: [
      {
        name: MOCK_EVENT_PARAMETER_NAME,
        category: ConditionCategory.EVENT,
        valueType: MetadataValueType.STRING,
      },
    ],
  },
};

export const MOCK_EVENT_PARAMETER = {
  id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}#${ConditionCategory.EVENT}#${MOCK_EVENT_PARAMETER_NAME}#${MetadataValueType.STRING}`,
  month: '#202301',
  prefix: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
  projectId: MOCK_PROJECT_ID,
  appId: MOCK_APP_ID,
  name: MOCK_EVENT_PARAMETER_NAME,
  eventName: MOCK_EVENT_NAME,
  category: ConditionCategory.EVENT,
  valueType: MetadataValueType.STRING,
  day1: {
    hasData: true,
    platform: [
      'Android',
    ],
    valueEnum: [
      {
        count: 103,
        value: 'value-01',
      },
    ],
  },
  day31: {
    hasData: true,
    platform: [
      'iOS',
    ],
    valueEnum: [
      {
        count: 305,
        value: 'value-02',
      },
      {
        count: 505,
        value: 'value-03',
      },
    ],
  },
  summary: {
    platform: [
      'Android',
      'iOS',
    ],
    valueEnum: [
      {
        count: 103,
        value: 'value-01',
      },
      {
        count: 305,
        value: 'value-02',
      },
      {
        count: 505,
        value: 'value-03',
      },
    ],
  },
};

export const MOCK_EVENT_PARAMETER_V2 = {
  ...MOCK_EVENT_PARAMETER,
  id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${ConditionCategory.EVENT}#${MOCK_EVENT_PARAMETER_NAME}#${MetadataValueType.STRING}`,
  month: 'latest',
  eventName: undefined,
  summary: {
    ...MOCK_EVENT_PARAMETER.summary,
    associatedEvents: [MOCK_EVENT_NAME],
  },
};

export const MOCK_USER_ATTRIBUTE = {
  id: `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${ConditionCategory.USER_OUTER}#${MOCK_USER_ATTRIBUTE_NAME}#${MetadataValueType.STRING}`,
  month: '#202301',
  prefix: `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
  projectId: MOCK_PROJECT_ID,
  appId: MOCK_APP_ID,
  name: MOCK_USER_ATTRIBUTE_NAME,
  category: ConditionCategory.USER_OUTER,
  valueType: MetadataValueType.STRING,
  day1: {
    hasData: true,
    valueEnum: [
      {
        count: 103,
        value: 'value-01',
      },
    ],
  },
  day31: {
    hasData: true,
    valueEnum: [
      {
        count: 305,
        value: 'value-02',
      },
      {
        count: 505,
        value: 'value-03',
      },
    ],
  },
  summary: {
    hasData: true,
    valueEnum: [
      {
        count: 103,
        value: 'value-01',
      },
      {
        count: 305,
        value: 'value-02',
      },
      {
        count: 505,
        value: 'value-03',
      },
    ],
  },
};

export const MOCK_USER_ATTRIBUTE_V2 = {
  ...MOCK_USER_ATTRIBUTE,
  month: 'latest',
};

export function displayDataMock(m: any) {
  // display data
  m.on(QueryCommand, {
    TableName: analyticsMetadataTable,
    IndexName: prefixMonthGSIName,
    KeyConditionExpression: '#prefix= :prefix',
    FilterExpression: 'projectId = :projectId AND appId = :appId',
    ExpressionAttributeNames: {
      '#prefix': 'prefix',
    },
    ExpressionAttributeValues: {
      ':projectId': MOCK_PROJECT_ID,
      ':appId': MOCK_APP_ID,
      ':prefix': 'DISPLAY',
    },
  }).resolves({
    Items: [
      {
        id: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        displayName: {
          'en-US': `display name of event ${MOCK_EVENT_NAME}`,
          'zh-CN': `${MOCK_EVENT_NAME}显示名称`,
        },
        description: {
          'en-US': `Description of event ${MOCK_EVENT_NAME}`,
          'zh-CN': `${MOCK_EVENT_NAME}说明`,
        },
      },
      {
        id: `EVENT#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}1`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        displayName: {
          'en-US': `display name of event ${MOCK_EVENT_NAME}1`,
          'zh-CN': `${MOCK_EVENT_NAME}1显示名称`,
        },
        description: {
          'en-US': `Description of event ${MOCK_EVENT_NAME}1`,
          'zh-CN': `${MOCK_EVENT_NAME}1说明`,
        },
      },
      {
        id: `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_EVENT_NAME}#${ConditionCategory.EVENT}#${MOCK_EVENT_PARAMETER_NAME}#${MetadataValueType.STRING}`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        displayName: {
          'en-US': `display name of event parameter ${MOCK_EVENT_PARAMETER_NAME}(String)`,
          'zh-CN': `${MOCK_EVENT_PARAMETER_NAME}参数显示名称`,
        },
        description: {
          'en-US': `Description of event parameter ${MOCK_EVENT_PARAMETER_NAME}(String)`,
          'zh-CN': `${MOCK_EVENT_PARAMETER_NAME}参数说明`,
        },
      },
      {
        id: `DICTIONARY#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${ConditionCategory.EVENT}#${MOCK_EVENT_PARAMETER_NAME}#${MetadataValueType.STRING}#value-02`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        displayName: {
          'en-US': `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME}(String) value-02`,
          'zh-CN': `${MOCK_EVENT_PARAMETER_NAME} value-02 显示名称`,
        },
      },
      {
        id: `DICTIONARY#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${ConditionCategory.EVENT}#${MOCK_EVENT_PARAMETER_NAME}11#${MetadataValueType.INTEGER}#value-01`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        displayName: {
          'en-US': `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME}11(Integer) value-01`,
          'zh-CN': `${MOCK_EVENT_PARAMETER_NAME}11 value-01 显示名称`,
        },
      },
      {
        id: `DICTIONARY#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${ConditionCategory.EVENT}#${MOCK_EVENT_PARAMETER_NAME}12#${MetadataValueType.DOUBLE}#value-03`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        displayName: {
          'en-US': `display name of dictionary ${MOCK_EVENT_PARAMETER_NAME}12(Double) value-03`,
          'zh-CN': `${MOCK_EVENT_PARAMETER_NAME}12 value-03 显示名称`,
        },
      },
      {
        id: `USER_ATTRIBUTE#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${ConditionCategory.USER_OUTER}#${MOCK_USER_ATTRIBUTE_NAME}#${MetadataValueType.STRING}`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        displayName: {
          'en-US': `display name of user parameter ${MOCK_USER_ATTRIBUTE_NAME}`,
          'zh-CN': `${MOCK_USER_ATTRIBUTE_NAME}用户属性显示名称`,
        },
        description: {
          'en-US': `Description of user parameter ${MOCK_USER_ATTRIBUTE_NAME}`,
          'zh-CN': `${MOCK_USER_ATTRIBUTE_NAME}参数说明`,
        },
      },
      {
        id: `DICTIONARY#${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${ConditionCategory.USER_OUTER}#${MOCK_USER_ATTRIBUTE_NAME}#${MetadataValueType.STRING}#value-02`,
        projectId: MOCK_PROJECT_ID,
        appId: MOCK_APP_ID,
        displayName: {
          'en-US': `display name of dictionary ${MOCK_USER_ATTRIBUTE_NAME}(String) value-02`,
          'zh-CN': `${MOCK_USER_ATTRIBUTE_NAME} value-02 显示名称`,
        },
      },
    ],
  });
  // BuiltList
  dictionaryMock(m, 'MetadataBuiltInList');
}

export function getAllEventParametersInput() {
  const lastDay = `day${new Date().getDate() - 1}`;
  const allEventParametersInput: QueryCommandInput = {
    TableName: analyticsMetadataTable,
    IndexName: prefixMonthGSIName,
    KeyConditionExpression: '#prefix= :prefix',
    ProjectionExpression: `#id, #month, #prefix, projectId, appId, #name, eventName, category, valueType, ${lastDay}, summary`,
    ExpressionAttributeNames: {
      '#prefix': 'prefix',
      '#id': 'id',
      '#month': 'month',
      '#name': 'name',
    },
    ExpressionAttributeValues: {
      ':prefix': `EVENT_PARAMETER#${MOCK_PROJECT_ID}#${MOCK_APP_ID}`,
    },
    ScanIndexForward: false,
  };
  return allEventParametersInput;
}

export function mockPipeline(ddbMock: any, version?: string) {
  const stackDetailsWithScanArnOutputs = [
    BASE_STATUS.stackDetails[0],
    BASE_STATUS.stackDetails[1],
    BASE_STATUS.stackDetails[2],
    {
      ...BASE_STATUS.stackDetails[3],
      outputs: [
        {
          OutputKey: 'xxxxScanMetadataWorkflowArn',
          OutputValue: 'arn:aws:states:us-east-1:123456789012:stateMachine:xxxxScanMetadataWorkflow',
        },
      ],
    },
    BASE_STATUS.stackDetails[4],
    BASE_STATUS.stackDetails[5],
  ];
  if (version === 'v1.1.5' || version === 'v1.1.6') {
    ddbMock.on(QueryCommand, {
      TableName: clickStreamTableName,
      IndexName: prefixTimeGSIName,
      KeyConditionExpression: '#prefix= :prefix',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
      },
      ExpressionAttributeValues: {
        ':prefix': 'PIPELINE',
      },
    }).resolves({
      Items: [{
        ...MSK_DATA_PROCESSING_NEW_SERVERLESS_PIPELINE_WITH_WORKFLOW,
        templateVersion: version,
        status: undefined,
        stackDetails: stackDetailsWithScanArnOutputs,
      }],
    });
  } else {
    ddbMock.on(QueryCommand, {
      TableName: clickStreamTableName,
      IndexName: prefixTimeGSIName,
      KeyConditionExpression: '#prefix= :prefix',
      ExpressionAttributeNames: {
        '#prefix': 'prefix',
      },
      ExpressionAttributeValues: {
        ':prefix': 'PIPELINE',
      },
    }).resolves({
      Items: [{
        ...MSK_DATA_PROCESSING_NEW_SERVERLESS_PIPELINE_WITH_WORKFLOW,
        templateVersion: 'v1.1.0',
        status: {
          ...BASE_STATUS,
          stackDetails: stackDetailsWithScanArnOutputs,
        },
        stackDetails: undefined,
      }],
    });
  }
  ddbMock.on(QueryCommand, getAllEventParametersInput()).resolves({
    Items: [
      MOCK_EVENT_PARAMETER,
      {
        ...MOCK_EVENT_PARAMETER,
        month: '#202302',
      },
      {
        ...MOCK_EVENT_PARAMETER,
        month: '#202303',
      },
    ],
  });
  ddbMock.on(QueryCommand, {
    TableName: analyticsMetadataTable,
    KeyConditionExpression: '#id= :id AND begins_with(#month, :month)',
    ExpressionAttributeNames: {
      '#id': 'id',
      '#month': 'month',
    },
    ExpressionAttributeValues: {
      ':id': `${MOCK_PROJECT_ID}#${MOCK_APP_ID}#${MOCK_USER_ATTRIBUTE_NAME}`,
      ':month': '#',
    },
    ScanIndexForward: false,
  }).resolves({
    Items: [
      {
        ...MOCK_USER_ATTRIBUTE,
        month: '#202303',
      },
      {
        ...MOCK_USER_ATTRIBUTE,
        month: '#202302',
      },
      MOCK_USER_ATTRIBUTE,
    ],
  });
}
