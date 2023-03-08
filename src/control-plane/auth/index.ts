/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import {
  APIGatewayAuthorizerResult,
  APIGatewayTokenAuthorizerEvent,
  APIGatewayTokenAuthorizerHandler,
} from 'aws-lambda';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { logger } from '../../common/powertools';

const JWKS_URI = process.env.JWKS_URI;
const ISSUER = process.env.ISSUER;

const client = jwksClient({
  jwksUri: JWKS_URI!,
  cache: true,
  cacheMaxAge: 300000, //5mins
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

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

export const handler: APIGatewayTokenAuthorizerHandler = async (event: APIGatewayTokenAuthorizerEvent)=> {

  try {
    if (event.authorizationToken === undefined
      || (event.authorizationToken as string).indexOf('Bearer ') != 0 ) {

      logger.error('authorizationToken is undefined or has invalid format');
      return denyResult;
    }

    // Get the token from the Authorization header
    const token = event.authorizationToken.split(' ')[1];
    // Decode the token
    const decodedToken = jwt.decode(token, { complete: true });
    if (decodedToken === null) {
      logger.error('decodedToken is null');
      return denyResult;
    }

    // Get the kid from the header
    const kid = decodedToken.header.kid;
    // Retrieve the public key from the JWKS endpoint using the kid
    const key = await new Promise<jwt.Secret>((resolve: any, reject: any) => {
      client.getSigningKey(kid, (err: Error | null, signingKey: jwksClient.SigningKey | undefined) => {
        if (err) {
          logger.error('Error when get signing key: ' + err);
          reject(err);
        } else {
          resolve(signingKey?.getPublicKey());
        }
      });
    });

    // Verify the token using the public key
    const verifiedToken = jwt.verify(token, key, {
      algorithms: ['RS256'],
      issuer: ISSUER,
    });
    if (verifiedToken.sub === undefined) {
      logger.error('Verify result is invalid');
      return denyResult;
    } else {
      // Return a policy document that allows access to the API
      logger.debug('token verified');
      return {
        principalId: verifiedToken.sub.toString(),
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
    }
  } catch (error) {
    logger.error('Token verification failed due to : ' + (error as Error).message);
    return denyResult;
  }
};
