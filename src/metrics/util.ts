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

import { GetParametersByPathCommand, Parameter, SSMClient } from '@aws-sdk/client-ssm';
import { CfnResource } from 'aws-cdk-lib';
import { Alarm } from 'aws-cdk-lib/aws-cloudwatch';
import { WIDGETS_HEIGHT } from './settings';
import { addCfnNagSuppressRules } from '../common/cfn-nag';
import { METRICS_PARAMETER_PATH_PREFIX } from '../common/constant';
import { logger } from '../common/powertools';

export function getParameterStoreName(projectId: string, stackId?: string, name?: string): string {
  if (name && stackId) {
    return `${METRICS_PARAMETER_PATH_PREFIX}${projectId}/${stackId}/${name}`;
  }
  return `${METRICS_PARAMETER_PATH_PREFIX}${projectId}/`;
}


export function getPosition(startY: number, idx: number, columnNum: number) {
  const widgets_width = Math.floor(24 / (columnNum));
  return {
    x: (idx % columnNum) * (widgets_width),
    y: startY + Math.floor(idx / columnNum) * (WIDGETS_HEIGHT),
    width: widgets_width,
    height: WIDGETS_HEIGHT,
  };
}

export async function listParameters(ssmClient: SSMClient, path: string): Promise<Parameter[]> {
  logger.info('listParameters: ' + path);
  const allParameters = [];
  let nextToken;
  let response;
  while (true) {
    response = await ssmClient.send(
      new GetParametersByPathCommand({
        Path: path,
        Recursive: true,
        MaxResults: 10,
        NextToken: nextToken,
      }),
    );
    if (response.Parameters) {
      allParameters.push(...response.Parameters);
    }
    if (response.NextToken) {
      nextToken = response.NextToken;
    } else {
      break;
    }
  }
  logger.info('listParameters return', { allParameters });

  return allParameters;
}


export function setCfnNagForAlarms(alarms: Alarm[]) {
  alarms.forEach(a => {
    addCfnNagSuppressRules(a.node.defaultChild as CfnResource, [
      {
        id: 'W28',
        // Resource found with an explicit name, this disallows updates that require replacement of this resource
        reason: 'Set alarmName with an explicit name, make it readable in the dashboard',
      },
    ]);
  });
}
