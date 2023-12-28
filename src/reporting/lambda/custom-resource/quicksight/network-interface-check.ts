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

import { EC2, NetworkInterfaceStatus } from '@aws-sdk/client-ec2';
import { Context, CloudFormationCustomResourceEvent, CdkCustomResourceResponse } from 'aws-lambda';
import { logger } from '../../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../../common/sdk-client-config';
import { sleep } from '../../../../common/utils';
import { NetworkInterfaceCheckCustomResourceLambdaProps } from '../../../private/dashboard';
import { QuickSight } from '@aws-sdk/client-quicksight';

type ResourceEvent = CloudFormationCustomResourceEvent;

type NetworkInterfaceCheckCustomResourceLambdaPropsType = NetworkInterfaceCheckCustomResourceLambdaProps & {
  readonly ServiceToken: string;
}

export type MustacheParamType = {
  schema: string;
}

export const handler = async (event: ResourceEvent, _context: Context): Promise<CdkCustomResourceResponse|void> => {
  const props = event.ResourceProperties as NetworkInterfaceCheckCustomResourceLambdaPropsType;
  const region = props.awsRegion;
  const ec2Client = new EC2({
    region,
    ...aws_sdk_client_common_config,
  });

  const quickSightClient = new QuickSight({
    region,
    ...aws_sdk_client_common_config,
  });

  if (event.RequestType === 'Create' || event.RequestType === 'Update' ) {
    return _onCreate(ec2Client, quickSightClient, props);
  }
};

const _onCreate = async (ec2Client: EC2, quickSightClient: QuickSight, props: NetworkInterfaceCheckCustomResourceLambdaPropsType): Promise<CdkCustomResourceResponse> => {

  const networkInterfaceIds: string[] = [];
  for (const ni of props.networkInterfaces) {
    networkInterfaceIds.push(ni.NetworkInterfaceId);
  }

  logger.info('networkInterfaceIds:', { networkInterfaceIds });

  let isNetworkInterfaceReady: boolean = false;
  let checkCnt = 0;
  while (!isNetworkInterfaceReady && checkCnt <= 1200) {
    await sleep(500);
    checkCnt += 1;

    const networkInterfacesDescribeResult = await ec2Client.describeNetworkInterfaces({
      NetworkInterfaceIds: networkInterfaceIds,
    });
    
    let ready = true;
    if (networkInterfacesDescribeResult.NetworkInterfaces !== undefined) {
      for (const networkInterface of networkInterfacesDescribeResult.NetworkInterfaces) {
        logger.info(`network interface status: ${networkInterface.NetworkInterfaceId} - ${networkInterface.Status}`);
        if (networkInterface.Status !== NetworkInterfaceStatus.in_use) {
          ready = false;
        }
      }
    }

    const vpcConnection = await quickSightClient.describeVPCConnection({
      VPCConnectionId: props.vpcConnectionId,
      AwsAccountId: props.awsAccountId,
    });

    if(vpcConnection.VPCConnection !== undefined) {
      logger.info(`vpc connection status: ${props.vpcConnectionId} - ${vpcConnection.VPCConnection.AvailabilityStatus}`);
      if(vpcConnection.VPCConnection.AvailabilityStatus !== 'AVAILABLE') {
        ready = false;
      }
    }
    isNetworkInterfaceReady = ready;
  }

  //force wait 1 minute after vpc connection is available
  if (isNetworkInterfaceReady) {
    logger.info('force wait 1 minute after vpc connection is available')
    await sleep(60000);
  }

  return {
    Data: {
      isReady: isNetworkInterfaceReady,
    },
  };
};