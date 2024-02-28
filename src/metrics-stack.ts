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

import { EMAIL_PATTERN, OUTPUT_METRICS_OBSERVABILITY_DASHBOARD_NAME, OUTPUT_METRICS_SNS_TOPIC_ARN_NAME, PROJECT_ID_PATTERN } from '@aws/clickstream-base-lib';
import { Aspects, CfnOutput, CfnParameter, Fn, Stack, StackProps } from 'aws-cdk-lib';
import { PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { RolePermissionBoundaryAspect } from './common/aspects';
import { addCfnNagForCustomResourceProvider, addCfnNagForLogRetention } from './common/cfn-nag';
import { Parameters } from './common/parameters';
import { SolutionInfo } from './common/solution-info';
import { associateApplicationWithStack } from './common/stack';
import { addSubscriptionCustomResource } from './metrics/add-sns-subscription';
import { MetricAndAlarm } from './metrics/metrics';

export interface MetricsStackProps extends StackProps { }

export class MetricsStack extends Stack {
  constructor(scope: Construct, id: string, props: MetricsStackProps = {}) {
    super(scope, id, props);

    const featureName = 'Metrics';
    this.templateOptions.description = `(${SolutionInfo.SOLUTION_ID}-met) ${SolutionInfo.SOLUTION_NAME} - ${featureName} ${SolutionInfo.SOLUTION_VERSION_DETAIL}`;

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

    const emailsParam = new CfnParameter(this, 'Emails', {
      description: 'Email list to receive alarms notification',
      type: 'CommaDelimitedList',
      default: '',
      allowedPattern: `(${EMAIL_PATTERN}$)?`,
    });

    const versionParam = new CfnParameter(this, 'Version', {
      description: 'Version',
      default: '1',
      type: 'String',
    });

    const snsKey = new Key(this, 'snsKey', {
      enableKeyRotation: true,
    });

    snsKey.addToResourcePolicy(new PolicyStatement({
      principals: [
        new ServicePrincipal('cloudwatch.amazonaws.com'),
      ],
      actions: [
        'kms:Decrypt',
        'kms:GenerateDataKey*',
      ],
      resources: ['*'],
    }));

    const snsTopic = new Topic(this, 'alarmNotificationSnsTopic', {
      displayName: 'Clickstream alarms notification [project:' + projectIdParam.valueAsString + ']',
      masterKey: snsKey,
    });

    snsTopic.addToResourcePolicy(new PolicyStatement({
      principals: [
        new ServicePrincipal('cloudwatch.amazonaws.com'),
      ],
      actions: [
        'sns:Publish',
      ],
      resources: [snsTopic.topicArn],
    }));

    addSubscription(this, Fn.join(',', emailsParam.valueAsList), snsTopic);

    const metrics = new MetricAndAlarm(this, 'MetricAndAlarm', {
      projectId: projectIdParam.valueAsString,
      version: versionParam.valueAsString,
      columnNumber: columnNumberParam.valueAsNumber,
      legendPosition: legendPositionParam.valueAsString,
      snsTopic,
    });

    new CfnOutput(this, OUTPUT_METRICS_OBSERVABILITY_DASHBOARD_NAME, {
      description: 'ObservabilityDashboardName',
      value: metrics.dashboard.dashboardName,
    });

    new CfnOutput(this, OUTPUT_METRICS_SNS_TOPIC_ARN_NAME, {
      description: 'SNS Topic Arn',
      value: snsTopic.topicArn,
    });

    addCfnNag(this);

    // Associate Service Catalog AppRegistry application with stack
    associateApplicationWithStack(this);

    // Add IAM role permission boundary aspect
    const {
      iamRoleBoundaryArnParam,
    } = Parameters.createIAMRolePrefixAndBoundaryParameters(this);
    Aspects.of(this).add(new RolePermissionBoundaryAspect(iamRoleBoundaryArnParam.valueAsString));
  }
}

function addSubscription(scope: Construct, emails: string, topic: Topic) {
  addSubscriptionCustomResource(scope, {
    snsTopic: topic,
    emails: emails,
  });
}

function addCfnNag(stack: Stack) {
  addCfnNagForLogRetention(stack);
  addCfnNagForCustomResourceProvider(stack, 'PutDashboard', 'PutDashboardCustomResourceProvider', '');
  addCfnNagForCustomResourceProvider(stack, 'addSubscription', 'addSubscriptionCustomResourceProvider', '');
}
