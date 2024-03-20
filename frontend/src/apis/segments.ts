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

import { apiRequest } from 'ts/request';

export const getSegmentsList = async (params: {
  projectId: string;
  appId: string;
}) => {
  const result: any = await apiRequest('get', `/segments`, params);
  return result;
};

export const createSegment = async () => {
  const result: any = await apiRequest('post', `/segments`, {
    segmentType: 'User',
    name: 'Test_user_segment',
    description: 'For test',
    projectId: 'test_magic_project_gpvz',
    appId: 'shopping',
    refreshSchedule: {
      cron: 'Custom',
      cronExpression: 'rate(12 days)',
      expireAfter: 10000,
    },
    criteria: {
      operator: 'and',
      filterGroups: [
        {
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
                        parameterType: 'Predefined',
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
                          parameterType: 'Predefined',
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
          startDate: '2024-01-01',
          endDate: '2024-01-10',
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
  });
  return result;
};
