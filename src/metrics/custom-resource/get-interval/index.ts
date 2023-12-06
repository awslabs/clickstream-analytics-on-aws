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
import { CdkCustomResourceHandler, CdkCustomResourceEvent } from 'aws-lambda';
import parser from 'cron-parser';
import { logger } from '../../../common/powertools';

export const handler: CdkCustomResourceHandler = async (event) => {
  try {
    return await _handler(event);
  } catch (e) {
    if (e instanceof Error) {
      logger.error('Error when creating database and schema in redshift', e);
    }
    throw e;
  }
};

async function _handler(event: CdkCustomResourceEvent) {
  const requestType = event.RequestType;
  if (requestType == 'Delete') {
    return {};
  }

  const expression = event.ResourceProperties.expression;
  const evaluationPeriods = parseInt(event.ResourceProperties.evaluationPeriods || '1');

  let intervalSeconds;
  if ((expression as string).startsWith('rate')) {
    intervalSeconds = parseRate(expression);
  } else if ((expression as string).startsWith('cron')) {
    intervalSeconds = parseCronExpression(expression);
  } else {
    throw new Error('Unknown expression:' + expression);
  }

  // Metrics cannot be checked across more than a day (EvaluationPeriods * Period must be <= 86400)
  if (intervalSeconds * evaluationPeriods > 86400) {
    intervalSeconds = 86400 / evaluationPeriods;
  }
  // Must: Any multiple of 60, with 60 as the minimum
  intervalSeconds = Math.max(60, intervalSeconds);
  intervalSeconds = Math.floor(intervalSeconds / 60) * 60;

  return {
    Data: {
      intervalSeconds,
    },
  };
}

function parseRate(expression: string) {
  const m = expression.match(/^rate\s*\(\s*(\d{1,5})\s*(\w+)\s*\)$/i);
  let intervalSeconds = 300;
  if (m) {
    const intervalValue = parseFloat(m[1]);
    const unit = m[2];
    if (unit.includes('minute')) {
      intervalSeconds = intervalValue * 60;
    } else if (unit.includes('hour')) {
      intervalSeconds = intervalValue * 3600;
    } else if (unit.includes('day')) {
      intervalSeconds = intervalValue * 3600 * 24;
    } else if (unit.includes('week')) {
      intervalSeconds = intervalValue * 3600 * 24 * 7;
    } else if (unit.includes('month')) {
      intervalSeconds = intervalValue * 3600 * 24 * 30;
    } else if (unit.includes('year')) {
      intervalSeconds = intervalValue * 3600 * 24 * 30 * 12;
    } else {
      intervalSeconds = intervalValue;
    }
  }
  return intervalSeconds;
}

function parseCronExpression(expression: string): number {
  logger.info('expression: ' + expression);

  const m = expression.match(/cron\s*\((.*)\)/i);
  let cronExpression = expression;
  if (m) {
    cronExpression = m[1];
  }

  //0 1 * * ? * => 0 1 * * * *
  cronExpression= cronExpression.replace(/\?/g, '*');

  logger.info('cronExpression: ' + cronExpression);

  const interval = parser.parseExpression(cronExpression);
  const time1 = new Date(interval.next().toISOString()).getTime();
  const time2 = new Date(interval.next().toISOString()).getTime();
  return Math.round((time2 - time1) / 1000);
}
