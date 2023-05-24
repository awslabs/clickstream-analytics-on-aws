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

import { CloudWatchClient, DescribeAlarmsCommand, PutMetricAlarmCommand, MetricAlarm } from '@aws-sdk/client-cloudwatch';
import { logger } from '../../../common/powertools';

export async function setAlarmsAction(cwClient: CloudWatchClient, alarmArns: string[], snsTopicArn: string) {
  const allMetricAlarms: MetricAlarm[] = await listAllMetricsAlarms(cwClient, alarmArns);

  for (const m of allMetricAlarms) {
    let addAction = false;
    if (!m.AlarmActions || (m.AlarmActions && !m.AlarmActions.includes(snsTopicArn))) {
      m.AlarmActions = [snsTopicArn];
      addAction = true;
    }
    if (!m.OKActions || (m.OKActions && !m.OKActions.includes(snsTopicArn))) {
      m.OKActions = [snsTopicArn];
      addAction = true;
    }

    if (!addAction) {
      logger.info("alarm '" + m.AlarmName + "' already has action for " + snsTopicArn);
      continue;
    }

    let input = {
      ActionsEnabled: m.ActionsEnabled,
      AlarmActions: m.AlarmActions,
      AlarmDescription: m.AlarmDescription,
      AlarmName: m.AlarmName!,
      ComparisonOperator: m.ComparisonOperator!,
      DatapointsToAlarm: m.DatapointsToAlarm,
      Dimensions: m.Dimensions,
      EvaluateLowSampleCountPercentile: m.EvaluateLowSampleCountPercentile,
      EvaluationPeriods: m.EvaluationPeriods!,
      ExtendedStatistic: m.ExtendedStatistic,
      InsufficientDataActions: m.InsufficientDataActions,
      MetricName: m.MetricName,
      Metrics: m.Metrics,
      Namespace: m.Namespace,
      OKActions: m.OKActions,
      Period: m.Period,
      Statistic: m.Statistic,
      Threshold: m.Threshold,
      ThresholdMetricId: m.ThresholdMetricId,
      TreatMissingData: m.TreatMissingData,
      Unit: m.Unit,
    };
    logger.info('PutMetricAlarmCommandInput', { input });
    await cwClient.send(new PutMetricAlarmCommand(input));
  }
}

async function listAllMetricsAlarms(cwClient: CloudWatchClient, alarmArns: string[]) {
  const allMetricAlarms: MetricAlarm[] = [];
  let nextToken = undefined;
  let describeAlarmsOutput;

  while (true) {
    // arn:aws:cloudwatch:us-east-1:1111111111:alarm:Clickstream|test_project_007 ECS Pending Task Count cae00c80
    describeAlarmsOutput = await cwClient.send(new DescribeAlarmsCommand({
      AlarmNames: alarmArns.map(a => a.split(':')[6]),
      NextToken: nextToken,
    }));

    logger.info('describeAlarmsOutput', { describeAlarmsOutput });
    if (describeAlarmsOutput && describeAlarmsOutput.MetricAlarms) {
      allMetricAlarms.push(...describeAlarmsOutput.MetricAlarms);
    }

    if (describeAlarmsOutput.NextToken) {
      nextToken = describeAlarmsOutput.NextToken;
    } else {
      break;
    }
  }
  logger.info('listAllMetricsAlarms return', { allMetricAlarms });
  return allMetricAlarms;
}