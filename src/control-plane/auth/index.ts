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
  APIGatewayAuthorizerResult,
  APIGatewayTokenAuthorizerEvent,
  APIGatewayTokenAuthorizerHandler,
  Context,
} from 'aws-lambda';

import { JWTAuthorizer } from './authorizer';
import { logger } from '../../common/powertools';

const issuerInput = process.env.ISSUER;

const denyResult: APIGatewayAuthorizerResult = {
  principalId: 'anonymous',
  policyDocument: {
    Version: '2012-10-17',
    Id: 'deny-all',
    Statement: [
      {
        Effect: 'Deny',
        Action: 'execute-api:Invoke',
        Resource: [
          '*',
        ],
      },
    ],
  },
};

export const handler: APIGatewayTokenAuthorizerHandler = async (event: APIGatewayTokenAuthorizerEvent, context: Context)=> {
  const authResult = await JWTAuthorizer.auth(event.authorizationToken, issuerInput);
  if (!authResult[0]) {
    logger.warn(`authtication failed. Request ID: ${context.awsRequestId}`);
    return denyResult;
  }

  logger.info('authtication success.');
  return {
    principalId: authResult[1]!.toString(),
    context: {
      email: authResult[2]!.toString(),
    },
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: event.methodArn,
        },
      ],
    },
  };
};

