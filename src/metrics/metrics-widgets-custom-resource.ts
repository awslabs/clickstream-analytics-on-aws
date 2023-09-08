
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
import { Arn, ArnFormat, CfnResource, CustomResource, Duration, Resource, Stack } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { addCfnNagSuppressRules, rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions } from '../common/cfn-nag';
import { createLambdaRole } from '../common/lambda';
import { attachListTagsPolicyForFunction } from '../common/lambda/tags';
import { POWERTOOLS_ENVS } from '../common/powertools';
import { getShortIdOfStack } from '../common/stack';
import { SolutionNodejsFunction } from '../private/function';

export interface MetricExpression {
  expression: string;
  label?: string;
  id?: string;
  yAxis?: 'left' | 'right';
  visible?: boolean;
}

export interface RenderingProperties {
  color?: string;
  label?: string;
  yAxis?: 'left' | 'right';
  stat?: 'SampleCount' | 'Average' | 'Sum' | 'Minimum' | 'Maximum' | 'p50' | 'p90' | 'p95' | 'p99';
  id?: string;
  period?: number;
  visible?: boolean;
}

export interface MetricWidgetElement {
  type: 'metric';
  properties: {
    stat: 'SampleCount' | 'Average' | 'Sum' | 'Minimum' | 'Maximum' | 'p50' | 'p90' | 'p95' | 'p99';
    title: string;
    metrics: (string | RenderingProperties | MetricExpression)[][];
    period?: number;
    region?: string;
    // If you specify gauge, you must set a value for min and max on the `left` side of yAxis.
    view?: 'timeSeries' | 'singleValue' | 'gauge' | 'bar' | 'pie';
    legend?: {
      position: 'right' | 'bottom' | 'hidden';
    };
    yAxis?: {
      label?: string;
      left?: {
        min?: number;
        max?: number;
      };
      right?: {
        min?: number;
        max?: number;
      };
    };
  };
}

export interface TextWidgetElement {
  type: 'text';
  properties: {
    markdown: string;
    background?: 'transparent'|'solid';
  };
}

export interface AlarmsWidgetElement {
  type: 'alarm';
  properties: {
    alarms: string[];
    title: string;
  };
}

export type InputWidgetElement = (MetricWidgetElement | TextWidgetElement | AlarmsWidgetElement);

export interface MetricsWidgetsProps {
  readonly projectId: string;
  readonly order: number;
  readonly name: string;
  readonly description: {
    markdown: string;
  };
  readonly widgets: InputWidgetElement[];
}

export class MetricsWidgets extends Construct {
  constructor(scope: Construct, id: string, props: MetricsWidgetsProps) {
    super(scope, id);
    createMetricsWidgetsCustomResource(scope, id + 'Metrics', props);
  }
}

function createMetricsWidgetsCustomResource(
  scope: Construct,
  id: string,
  props: MetricsWidgetsProps,
): Resource {
  const fn = createSetMetricsWidgetsResourceLambda(scope, id);
  const provider = new Provider(
    scope,
    id + 'CustomResourceProvider',
    {
      onEventHandler: fn,
      logRetention: RetentionDays.FIVE_DAYS,
    },
  );
  const cr = new CustomResource(scope, id + 'CustomResource', {
    serviceToken: provider.serviceToken,
    properties: {
      metricsWidgetsProps: props,
      version: new Date().getTime(),
    },
  });
  return cr;
}


function createSetMetricsWidgetsResourceLambda(scope: Construct, id: string): SolutionNodejsFunction {
  const role = createLambdaRole(scope, id + 'LambdaRole', false, [
    new PolicyStatement({
      actions: [
        'ssm:PutParameter',
        'ssm:DeleteParameter',
        'ssm:DeleteParameters',
        'ssm:GetParametersByPath',
        'ssm:AddTagsToResource',
        'ssm:GetParameters',
        'ssm:GetParameter',
      ],
      resources: [
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
  ]);

  const stackId = getShortIdOfStack(Stack.of(scope));
  const fn = new SolutionNodejsFunction(scope, id + 'Lambda', {
    runtime: Runtime.NODEJS_18_X,
    entry: join(
      __dirname,
      'custom-resource',
      'set-metrics-widgets',
      'index.ts',
    ),
    handler: 'handler',
    memorySize: 256,
    timeout: Duration.minutes(1),
    logRetention: RetentionDays.ONE_WEEK,
    role,
    environment: {
      STACK_ID: stackId,
      ...POWERTOOLS_ENVS,

    },
  });

  attachListTagsPolicyForFunction(scope, id, fn);

  fn.node.addDependency(role);
  addCfnNagSuppressRules(fn.node.defaultChild as CfnResource, [
    ...rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions('put-metrics-widgets-custom-resource'),
  ]);
  return fn;
}

