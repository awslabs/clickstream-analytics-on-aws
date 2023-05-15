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

import { CfnOutput, CfnParameter, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { addCfnNagForCustomResourceProvider, addCfnNagForLogRetention } from './common/cfn-nag';
import { PROJECT_ID_PATTERN } from './common/constant';
import { SolutionInfo } from './common/solution-info';
import { MetricAndAlarm } from './metrics/metrics';


export interface MetricsStackProps extends StackProps { }

export class MetricsStack extends Stack {
  constructor(scope: Construct, id: string, props: MetricsStackProps = {}) {
    super(scope, id, props);

    const featureName = 'Metrics';
    this.templateOptions.description = `(${SolutionInfo.SOLUTION_ID}) ${SolutionInfo.SOLUTION_NAME} - ${featureName} (Version ${SolutionInfo.SOLUTION_VERSION})`;

    const projectIdParam = new CfnParameter(this, 'ProjectId', {
      description: 'Project Id',
      allowedPattern: `^${PROJECT_ID_PATTERN}$`,
      type: 'String',
    });

    const columnNumberParam = new CfnParameter(this, 'ColumnNumber', {
      description: 'Columns in each row',
      default: '4',
      minValue: 1,
      type: 'Number',
    });

    const legendPositionParam = new CfnParameter(this, 'LegendPosition', {
      description: 'Widgets legend position',
      type: 'String',
      default: 'bottom',
      allowedValues: [
        'right',
        'bottom',
        'hidden',
      ],
    });

    const versionParam = new CfnParameter(this, 'Version', {
      description: 'Version',
      default: '1',
      type: 'String',
    });

    const metrics = new MetricAndAlarm(this, 'MetricAndAlarm', {
      projectId: projectIdParam.valueAsString,
      version: versionParam.valueAsString,
      columnNumber: columnNumberParam.valueAsNumber,
      legendPosition: legendPositionParam.valueAsString,
    });

    new CfnOutput(this, 'ObservabilityDashboardName', {
      description: 'ObservabilityDashboardName',
      value: metrics.dashboard.dashboardName,
    });

    addCfnNag(this);
  }
}


function addCfnNag(stack: Stack) {
  addCfnNagForLogRetention(stack);
  addCfnNagForCustomResourceProvider(stack, 'PutDashboard', 'PutDashboardCustomResourceProvider', '');
};