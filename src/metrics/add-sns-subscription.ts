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
import { CfnResource, CustomResource, Duration } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { addCfnNagSuppressRules, rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions } from '../common/cfn-nag';
import { createLambdaRole } from '../common/lambda';
import { POWERTOOLS_ENVS } from '../common/powertools';
import { SolutionNodejsFunction } from '../private/function';

export interface AddSubscriptionCustomResourceProps {
  snsTopic: Topic;
  emails: string;
}

export function addSubscriptionCustomResource(
  scope: Construct,
  props: AddSubscriptionCustomResourceProps,
) {
  const fn = createAddSubscriptionLambda(scope, props);
  const provider = new Provider(
    scope,
    'addSubscriptionCustomResourceProvider',
    {
      onEventHandler: fn,
      logRetention: RetentionDays.FIVE_DAYS,
    },
  );
  const cr = new CustomResource(scope, 'addSubscriptionCustomResource', {
    serviceToken: provider.serviceToken,
    properties: {
      snsTopicArn: props.snsTopic.topicArn,
      emails: props.emails,
      buildTime: new Date().getTime(),
    },
  });
  return { customResource: cr, fn };
}


function createAddSubscriptionLambda(scope: Construct, props: AddSubscriptionCustomResourceProps): SolutionNodejsFunction {
  const role = createLambdaRole(scope, 'addSubscriptionLambdaRole', false, [
    new PolicyStatement({
      actions: [
        'sns:Subscribe',
        'sns:ListSubscriptionsByTopic',
      ],
      resources: [props.snsTopic.topicArn],
    }),

  ]);

  const fn = new SolutionNodejsFunction(scope, 'addSubscriptionLambda', {
    runtime: Runtime.NODEJS_18_X,
    entry: join(
      __dirname,
      'custom-resource',
      'add-sns-subscription',
      'index.ts',
    ),
    handler: 'handler',
    memorySize: 256,
    timeout: Duration.minutes(1),
    logRetention: RetentionDays.ONE_WEEK,
    role,
    environment: {
      SNS_TOPIC_ARN: props.snsTopic.topicArn,
      EMAILS: props.emails,
      ...POWERTOOLS_ENVS,
    },
  });
  fn.node.addDependency(role);
  addCfnNagSuppressRules(fn.node.defaultChild as CfnResource, [
    ...rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions('addSubscription-custom-resource'),
  ]);
  return fn;
}
