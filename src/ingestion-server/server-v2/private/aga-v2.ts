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

import { Stack, CfnCondition, Fn } from 'aws-cdk-lib';
import {
  ApplicationLoadBalancer,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Accelerator, PortRange, CfnListener } from 'aws-cdk-lib/aws-globalaccelerator';
import { ApplicationLoadBalancerEndpoint } from 'aws-cdk-lib/aws-globalaccelerator-endpoints';
import { Construct } from 'constructs';
import { getShortIdOfStack } from '../../../common/stack';
import { RESOURCE_ID_PREFIX } from '../../server/ingestion-server';

export interface GlobalAcceleratorProps {
  ports: {
    http: number;
    https: number;
  };
  protocol: string;
  alb: ApplicationLoadBalancer;
  endpointPath: string;
  isHttps: CfnCondition;
}

export function createGlobalAcceleratorV2(
  scope: Construct,
  props: GlobalAcceleratorProps,
) {
  const { accelerator, agListener, endpointGroup } = createAccelerator(scope, props);
  return { accelerator, agListener, endpointGroup };
}

function createAccelerator(
  scope: Construct,
  props: GlobalAcceleratorProps,
) {
  const stackShortId = getShortIdOfStack(Stack.of(scope));
  const accelerator = new Accelerator(scope, 'Accelerator', {
    acceleratorName: `${RESOURCE_ID_PREFIX}${stackShortId}-Accelerator`,
  });
  const portRanges: PortRange[] = [];

  const httpPortRanges: any[] = [
    {
      FromPort: props.ports.http,
      ToPort: props.ports.http,
    },
  ];

  const httpsPortRanges: any[] = [
    {
      FromPort: props.ports.http,
      ToPort: props.ports.http,
    },
    {
      FromPort: props.ports.https,
      ToPort: props.ports.https,
    },
  ];
  const agListener = accelerator.addListener('AcceleratorListener', {
    portRanges: portRanges,
  });

  const cfnListener = agListener.node.defaultChild as CfnListener;
  cfnListener.addPropertyOverride('PortRanges',
    Fn.conditionIf(props.isHttps.logicalId, httpsPortRanges, httpPortRanges));

  const endpointGroup = agListener.addEndpointGroup('ALBGroup', {
    endpoints: [new ApplicationLoadBalancerEndpoint(props.alb)],
  });
  return { accelerator, agListener, endpointGroup };
}

