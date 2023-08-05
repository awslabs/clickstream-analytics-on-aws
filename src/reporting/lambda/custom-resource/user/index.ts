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

import {
  DeleteUserCommand,
  DescribeUserCommand,
  QuickSightClient, RegisterUserCommand, ResourceNotFoundException,
} from '@aws-sdk/client-quicksight';
import { Context, CloudFormationCustomResourceEvent, CdkCustomResourceResponse } from 'aws-lambda';
import { logger } from '../../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../../common/sdk-client-config';
import {
  QuicksightInternalUserCustomResourceLabmdaProps,
} from '../../../private/dashboard';


type ResourceEvent = CloudFormationCustomResourceEvent;

type QuicksightInternalUserCustomResourceLabmdaPropsType = QuicksightInternalUserCustomResourceLabmdaProps & {
  readonly ServiceToken: string;
}

export const handler = async (event: ResourceEvent, _context: Context): Promise<CdkCustomResourceResponse|void> => {
  const props = event.ResourceProperties as QuicksightInternalUserCustomResourceLabmdaPropsType;
  const region = props.awsRegion;
  const quickSight = new QuickSightClient({
    region,
    ...aws_sdk_client_common_config,
  });

  const awsAccountId = props.awsAccountId;
  const email = props.email;
  const namespace = props.quickSightNamespace;

  logger.info('receive event', JSON.stringify(event));

  if (event.RequestType === 'Create') {
    return _onCreate(quickSight, awsAccountId, email, namespace);
  } else if (event.RequestType === 'Delete' ) {
    return _onDelete(quickSight, awsAccountId, email, namespace);
  } else {
    logger.warn('unsupport operation');
  }

};

const _onCreate = async (quickSightClient: QuickSightClient, awsAccountId: string, email: string, namespace: string)
: Promise<CdkCustomResourceResponse> => {

  const describeCommand = new DescribeUserCommand({
    AwsAccountId: awsAccountId,
    UserName: `clickstream${email}`,
    Namespace: namespace,
  });

  try {
    const userOut = await quickSightClient.send(describeCommand);
    if (userOut.User) {
      return {
        Data: {
          user: userOut.User?.UserName,
          invitationUrl: '',
        },
      };
    }
  } catch (err) {

    if (err instanceof ResourceNotFoundException) {
      logger.warn(`user ${email} not exist, will create it`);
    } else {
      throw err;
    }
  }

  const command = new RegisterUserCommand({
    AwsAccountId: awsAccountId,
    UserName: `clickstream${email}`,
    Namespace: namespace,
    Email: email,
    IdentityType: 'QUICKSIGHT',
    UserRole: 'ADMIN',
  });

  const response = await quickSightClient.send(command);
  logger.info(`QuickSight internal user: ${JSON.stringify(response)}`);
  return {
    Data: {
      user: response.User?.UserName,
      invitationUrl: response.UserInvitationUrl,
    },
  };

};

const _onDelete = async (quickSightClient: QuickSightClient, awsAccountId: string, email: string, namespace: string): Promise<void> => {

  const command = new DeleteUserCommand({
    AwsAccountId: awsAccountId,
    UserName: `clickstream${email}`,
    Namespace: namespace,
  });

  try {
    await quickSightClient.send(command);
  } catch (err) {
    logger.error(`delte user clickstream_${email} failed.`);
  }

};

