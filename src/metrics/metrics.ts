
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

import { join } from 'path';
import { Arn, ArnFormat, CfnResource, CustomResource, Duration, Stack } from 'aws-cdk-lib';
import { Dashboard, PeriodOverride } from 'aws-cdk-lib/aws-cloudwatch';
import { Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { PARAMETERS_DESCRIPTION } from './settings';
import { addCfnNagSuppressRules, rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions } from '../common/cfn-nag';
import { createLambdaRole } from '../common/lambda';
import { POWERTOOLS_ENVS } from '../common/powertools';
import { getShortIdOfStack } from '../common/stack';

interface MetricAndAlarmProps {
  readonly projectId: string;
  readonly columnNumber: number;
  readonly version: string;
  readonly legendPosition: string;
}

interface CustomResourceProps extends MetricAndAlarmProps {
  dashboard: Dashboard;
}

export class MetricAndAlarm extends Construct {
  public dashboard: Dashboard;
  constructor(scope: Construct, id: string, props: MetricAndAlarmProps) {
    super(scope, id);
    const stackId = getShortIdOfStack(Stack.of(scope));
    const dashboard = new Dashboard(scope, 'Dashboard', {
      dashboardName: `Clickstream-${props.projectId}-Dashboard-${stackId}`,
      defaultInterval: Duration.hours(12),
      periodOverride: PeriodOverride.AUTO,
    });

    const { fn } = createPutDashboardCustomResource(scope, {
      dashboard,
      ...props,
    });
    this.dashboard = dashboard;

    new Rule(this, 'MetricsParameterStoreChangeRule', {
      eventPattern: {
        source: ['aws.ssm'],
        detailType: ['Parameter Store Change'],
        detail: {
          description: [`${PARAMETERS_DESCRIPTION} ${props.projectId}`],
        },
      },
      targets: [new LambdaFunction(fn)],
    });

  }
}

export function createPutDashboardCustomResource(
  scope: Construct,
  props: CustomResourceProps,
) {
  const fn = createPutDashboardLambda(scope, props);
  const provider = new Provider(
    scope,
    'PutDashboardCustomResourceProvider',
    {
      onEventHandler: fn,
      logRetention: RetentionDays.FIVE_DAYS,
    },
  );
  const cr = new CustomResource(scope, 'PutDashboardCustomResource', {
    serviceToken: provider.serviceToken,
    properties: {
      projectId: props.projectId,
      columnNumber: props.columnNumber,
      legendPosition: props.legendPosition,
      version: props.version,
    },
  });
  return { customResource: cr, fn };
}


function createPutDashboardLambda(scope: Construct, props: CustomResourceProps): NodejsFunction {
  const role = createLambdaRole(scope, 'PutDashboardLambdaRole', false, [
    new PolicyStatement({
      actions: [
        'ssm:GetParametersByPath',
        'ssm:GetParameters',
        'ssm:GetParameter',
      ],
      resources: [
        // arn:aws:ssm:*:11111111:parameter/Clickstream
        Arn.format(
          {
            resourceName: 'Clickstream/*',
            resource: 'parameter',
            service: 'ssm',
            arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
          },
          Stack.of(scope),
        ),
      ],
    }),

    new PolicyStatement({
      actions: [
        'ssm:DescribeParameters',
      ],
      resources: ['*'],
    }),

    new PolicyStatement({
      actions: [
        'cloudwatch:PutDashboard',
      ],
      resources: [
        props.dashboard.dashboardArn,
      ],
    }),
  ]);

  const fn = new NodejsFunction(scope, 'PutDashboardLambda', {
    runtime: Runtime.NODEJS_18_X,
    entry: join(
      __dirname,
      'custom-resource',
      'put-dashboard',
      'index.ts',
    ),
    handler: 'handler',
    memorySize: 256,
    timeout: Duration.minutes(1),
    logRetention: RetentionDays.ONE_WEEK,
    role,
    environment: {
      DASHBOARD_NAME: props.dashboard.dashboardName,
      PROJECT_ID: props.projectId,
      LEGEND_POSITION: props.legendPosition,
      COLUMN_NUMBER: props.columnNumber + '',
      ...POWERTOOLS_ENVS,
    },
  });
  fn.node.addDependency(role);
  addCfnNagSuppressRules(fn.node.defaultChild as CfnResource, [
    ... rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions('put-dashboard-custom-resource'),
  ]);
  return fn;
}