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
import { SegmentJobStatus } from '@aws/clickstream-base-lib';
import { MOCK_APP_ID, MOCK_PROJECT_ID, MOCK_SEGMENT_ID, MOCK_SEGMENT_JOB_ID, MOCK_USER_ID } from './ddb-mock';

export const MOCK_EVENTBRIDGE_RULE_ARN = 'arn:aws:events:us-east-1:xxxxxxxx:rule/Clickstream-SegmentJob-01';
export const MOCK_CREATE_USER_SEGMENT_SETTING_INPUT = {
  segmentType: 'User',
  name: 'Test_user_segment',
  description: 'For test',
  projectId: MOCK_PROJECT_ID,
  appId: MOCK_APP_ID,
  refreshSchedule: {
    cron: 'Custom',
    cronExpression: 'rate(12 days)',
    expireAfter: 10000,
  },
  criteria: {
    operator: 'and',
    filterGroups: [
      {
        isRelativeDateRange: false,
        startDate: '2024-01-01',
        endDate: '2024-01-10',
        operator: 'and',
        filters: [
          {
            operator: 'or',
            conditions: [
              {
                conditionType: 'UserEventCondition',
                hasDone: true,
                event: {
                  eventName: '_app_end',
                  eventParameterConditions: [
                    {
                      parameterType: 'Preset',
                      parameterName: '_session_duration',
                      dataType: 'int',
                      conditionOperator: '>=',
                      inputValue: 30000,
                    },
                  ],
                  operator: 'and',
                },
                metricType: {
                  metricName: 'NUMBER_OF_TOTAL',
                  conditionOperator: '>=',
                  inputValue: 20,
                },
              },
              {
                conditionType: 'EventsInSequenceCondition',
                hasDone: true,
                isInOneSession: true,
                isDirectlyFollow: false,
                events: [
                  {
                    eventName: '_app_start',
                  },
                  {
                    eventName: '_page_view',
                  },
                  {
                    eventName: 'purchase',
                  },
                  {
                    eventName: '_app_end',
                    eventParameterConditions: [
                      {
                        parameterType: 'Preset',
                        parameterName: '_session_duration',
                        dataType: 'int',
                        conditionOperator: '>=',
                        inputValue: 30000,
                      },
                    ],
                    operator: 'and',
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        isRelativeDateRange: true,
        lastN: 7,
        timeUnit: 'day',
        operator: 'and',
        filters: [
          {
            operator: 'or',
            conditions: [
              {
                conditionType: 'UserInSegmentCondition',
                isInSegment: true,
                segmentId: '3823d8c3-958a-448d-a2d8-c76b1c32be04',
              },
            ],
          },
        ],
      },
    ],
  },
};

export const MOCK_USER_SEGMENT_DDB_ITEM = {
  ...MOCK_CREATE_USER_SEGMENT_SETTING_INPUT,
  segmentId: MOCK_SEGMENT_ID,
  createBy: MOCK_USER_ID,
  createAt: 1710993092123,
  lastUpdateBy: MOCK_USER_ID,
  lastUpdateAt: 1710993012123,
  eventBridgeRuleArn: MOCK_EVENTBRIDGE_RULE_ARN,
  id: MOCK_APP_ID,
  type: `SEGMENT_SETTING#${MOCK_SEGMENT_ID}`,
  deleted: false,
};

export const MOCK_UPDATE_USER_SEGMENT_SETTING_INPUT = {
  ...MOCK_USER_SEGMENT_DDB_ITEM,
  refreshSchedule: {
    cron: 'Manual',
  },
};

export const MOCK_SEGMENT_JOB_STATUS_ITEM = {
  id: MOCK_SEGMENT_ID,
  type: `SEGMENT_JOB#${MOCK_SEGMENT_JOB_ID}`,
  jobRunId: MOCK_SEGMENT_JOB_ID,
  segmentId: MOCK_SEGMENT_ID,
  date: '2024-03-21',
  jobStartTime: 1710979200000,
  jobEndTime: 1710979210000,
  jobStatus: SegmentJobStatus.COMPLETED,
  segmentUserNumber: 100,
  totalUserNumber: 10000,
  segmentSessionNumber: 30,
  totalSessionNumber: 1000,
  sampleData: [],
  prefix: `SEGMENT_JOB_FOR#${MOCK_SEGMENT_ID}`,
  createAt: 1710979200000,
};
