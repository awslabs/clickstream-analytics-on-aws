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

import { JWTAuthorizer, isEmpty, logger } from '@aws/clickstream-base-lib';
import {
  APIGatewayAuthorizerResult,
  APIGatewayTokenAuthorizerEvent,
  APIGatewayTokenAuthorizerHandler,
  Context,
} from 'aws-lambda';

import { JwtPayload } from 'jsonwebtoken';

const issuerInput = process.env.ISSUER ?? '';

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
  const authorizer = new JWTAuthorizer({
    issuer: issuerInput,
  });
  try {
    const authResult = await authorizer.auth(event.authorizationToken);
    if (!authResult.success) {
      logger.warn(`authentication failed. Request ID: ${context.awsRequestId}`);
      return denyResult;
    }

    logger.info('authentication success.');
    const principalId = !isEmpty((authResult.jwtPayload as JwtPayload).sub) ? (authResult.jwtPayload as JwtPayload).sub : '';
    const email = !isEmpty((authResult.jwtPayload as JwtPayload).email) ? (authResult.jwtPayload as JwtPayload).email.toString() : '';
    const username = !isEmpty((authResult.jwtPayload as JwtPayload).username) ? (authResult.jwtPayload as JwtPayload).username.toString() : '';

    return {
      principalId: principalId,
      context: {
        email: email,
        username: username,
        authorizationToken: event.authorizationToken,
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
    } as APIGatewayAuthorizerResult;
  } catch (err) {
    logger.error(`authentication failed. Request ID: ${context.awsRequestId}. Error: ${err}`);
    return denyResult;
  }
};

