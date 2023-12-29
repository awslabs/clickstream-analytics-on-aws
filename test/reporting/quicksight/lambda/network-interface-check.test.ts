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

import { DescribeNetworkInterfacesCommand, EC2Client, NetworkInterfaceStatus } from '@aws-sdk/client-ec2';
import { DescribeVPCConnectionCommand, QuickSight } from '@aws-sdk/client-quicksight';
import { CdkCustomResourceResponse } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { handler } from '../../../../src/reporting/lambda/custom-resource/quicksight/network-interface-check';
import { getMockContext } from '../../../common/lambda-context';
import 'aws-sdk-client-mock-jest';
import {
  basicCloudFormationEvent,
  basicCloudFormationUpdateEvent,
} from '../../../common/lambda-events';

describe('QuickSight Lambda function', () => {
  const context = getMockContext();
  const ec2ClientMock = mockClient(EC2Client);
  const quickSightClientMock = mockClient(QuickSight);

  const commonProps = {
    awsRegion: 'us-east-1',
    awsAccountId: 'test-aws-account-id',
    vpcConnectionId: 'test-vpc-connection-id',
    networkInterfaces: [
      {
        NetworkInterfaceId: 'eni-test11111',
      },
      {
        NetworkInterfaceId: 'eni-test11112',
      },
      {
        NetworkInterfaceId: 'eni-test11113',
      },
    ],
  };

  const createEvent = {
    ...basicCloudFormationEvent,
    ResourceProperties: {
      ...basicCloudFormationEvent.ResourceProperties,
      ...commonProps,
    },

  };

  const updateEvent = {
    ...basicCloudFormationUpdateEvent,
    ResourceProperties: {
      ...basicCloudFormationEvent.ResourceProperties,
      ...commonProps,
    },

  };

  beforeEach(() => {
    ec2ClientMock.reset();
  });

  test('NetworkInterface check custom resource test - create', async () => {

    ec2ClientMock.on(DescribeNetworkInterfacesCommand).resolves({
      NetworkInterfaces: [
        {
          NetworkInterfaceId: 'eni-test11111',
          Status: NetworkInterfaceStatus.in_use,
        },
        {
          NetworkInterfaceId: 'eni-test11112',
          Status: NetworkInterfaceStatus.in_use,
        },
        {
          NetworkInterfaceId: 'eni-test11113',
          Status: NetworkInterfaceStatus.in_use,
        },
      ],
    });
    quickSightClientMock.on(DescribeVPCConnectionCommand).resolves({
      VPCConnection: {
        AvailabilityStatus: 'AVAILABLE',
      },
    });

    const resp = await handler(createEvent, context) as CdkCustomResourceResponse;
    expect(ec2ClientMock).toHaveReceivedCommandTimes(DescribeNetworkInterfacesCommand, 1);
    expect(resp.Data?.isReady).toBeDefined();
    expect(resp.Data?.isReady).toEqual(true);

  });

  test('NetworkInterface check custom resource test - update', async () => {

    ec2ClientMock.on(DescribeNetworkInterfacesCommand).resolves({
      NetworkInterfaces: [
        {
          NetworkInterfaceId: 'eni-test11111',
          Status: NetworkInterfaceStatus.in_use,
        },
        {
          NetworkInterfaceId: 'eni-test11112',
          Status: NetworkInterfaceStatus.in_use,
        },
        {
          NetworkInterfaceId: 'eni-test11113',
          Status: NetworkInterfaceStatus.in_use,
        },
      ],
    });
    quickSightClientMock.on(DescribeVPCConnectionCommand).resolves({
      VPCConnection: {
        AvailabilityStatus: 'AVAILABLE',
      },
    });

    const resp = await handler(updateEvent, context) as CdkCustomResourceResponse;
    expect(ec2ClientMock).toHaveReceivedCommandTimes(DescribeNetworkInterfacesCommand, 1);
    expect(resp.Data?.isReady).toBeDefined();
    expect(resp.Data?.isReady).toEqual(true);

  });

  test('NetworkInterface check custom resource test - wait 2 time', async () => {

    ec2ClientMock.on(DescribeNetworkInterfacesCommand).resolvesOnce({
      NetworkInterfaces: [
        {
          NetworkInterfaceId: 'eni-test11111',
          Status: NetworkInterfaceStatus.available,
        },
        {
          NetworkInterfaceId: 'eni-test11112',
          Status: NetworkInterfaceStatus.available,
        },
        {
          NetworkInterfaceId: 'eni-test11113',
          Status: NetworkInterfaceStatus.in_use,
        },
      ],
    }).resolvesOnce({
      NetworkInterfaces: [
        {
          NetworkInterfaceId: 'eni-test11111',
          Status: NetworkInterfaceStatus.available,
        },
        {
          NetworkInterfaceId: 'eni-test11112',
          Status: NetworkInterfaceStatus.in_use,
        },
        {
          NetworkInterfaceId: 'eni-test11113',
          Status: NetworkInterfaceStatus.in_use,
        },
      ],
    }).resolvesOnce({
      NetworkInterfaces: [
        {
          NetworkInterfaceId: 'eni-test11111',
          Status: NetworkInterfaceStatus.in_use,
        },
        {
          NetworkInterfaceId: 'eni-test11112',
          Status: NetworkInterfaceStatus.in_use,
        },
        {
          NetworkInterfaceId: 'eni-test11113',
          Status: NetworkInterfaceStatus.in_use,
        },
      ],
    });

    quickSightClientMock.on(DescribeVPCConnectionCommand).resolves({
      VPCConnection: {
        AvailabilityStatus: 'AVAILABLE',
      },
    });

    const resp = await handler(createEvent, context) as CdkCustomResourceResponse;
    expect(ec2ClientMock).toHaveReceivedCommandTimes(DescribeNetworkInterfacesCommand, 3);
    expect(resp.Data?.isReady).toBeDefined();
    expect(resp.Data?.isReady).toEqual(true);

  });

});