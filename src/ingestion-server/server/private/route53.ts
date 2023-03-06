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

import { ApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { IHostedZone, ARecord, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { LoadBalancerTarget } from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';
import { RESOURCE_ID_PREFIX } from '../ingestion-server';

export function createRecordInRoute53(
  scope: Construct,
  domainPrefix: string,
  alb: ApplicationLoadBalancer,
  hostZone: IHostedZone,
): ARecord {
  const record = new ARecord(scope, `${RESOURCE_ID_PREFIX}AlbRecord`, {
    recordName: domainPrefix,
    zone: hostZone,
    target: RecordTarget.fromAlias(new LoadBalancerTarget(alb)),
  });

  return record;
}
