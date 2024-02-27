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
  CloudWatchClient,
  paginateDescribeAlarms,
  DisableAlarmActionsCommand,
  EnableAlarmActionsCommand,
  MetricAlarm,
} from '@aws-sdk/client-cloudwatch';
import { ALARM_NAME_PREFIX } from '@aws/clickstream-base-lib';
import { aws_sdk_client_common_config } from '../../common/sdk-client-config-ln';

export const describeAlarmsByProjectId = async (region: string, projectId: string) => {
  const cloudWatchClient = new CloudWatchClient({
    ...aws_sdk_client_common_config,
    region,
  });
  const records: MetricAlarm[] = [];
  const alarmNamePrefix = projectId ? `${ALARM_NAME_PREFIX}|${projectId}` : ALARM_NAME_PREFIX;
  for await (const page of paginateDescribeAlarms({ client: cloudWatchClient }, {
    AlarmNamePrefix: alarmNamePrefix,
  })) {
    records.push(...page.MetricAlarms as MetricAlarm[]);
  }
  return records;
};

export const disableAlarms = async (region: string, alarmNames: string[]) => {
  const cloudWatchClient = new CloudWatchClient({
    ...aws_sdk_client_common_config,
    region,
  });
  const command = new DisableAlarmActionsCommand({
    AlarmNames: alarmNames,
  });
  await cloudWatchClient.send(command);
};

export const enableAlarms = async (region: string, alarmNames: string[]) => {
  const cloudWatchClient = new CloudWatchClient({
    ...aws_sdk_client_common_config,
    region,
  });
  const command = new EnableAlarmActionsCommand({
    AlarmNames: alarmNames,
  });
  await cloudWatchClient.send(command);
};