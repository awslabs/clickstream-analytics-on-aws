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
  Logger,
} from '@aws-lambda-powertools/logger';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const logger = new Logger();

export class JWTAuthorizer {

  public static async auth(client: jwksClient.JwksClient, issuer: string, authorizationToken: string) {
    try {
      if (authorizationToken === undefined
          || authorizationToken.indexOf('Bearer ') != 0 ) {

        logger.error('AuthorizationToken is undefined or has invalid format');
        return [false, null];
      }

      // Get the token from the Authorization header
      const token = authorizationToken.split(' ')[1];
      // Decode the token
      const decodedToken = jwt.decode(token, { complete: true });
      if (decodedToken === null) {
        logger.error('DecodedToken is null');
        return [false, null];
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
        issuer: issuer,
      });
      if (verifiedToken.sub === undefined) {
        logger.info('VerifiedToken is invalid');
        return [false, null];
      } else {
        // Return a policy document that allows access to the API
        logger.debug('Token verified');
        return [true, verifiedToken.sub];
      }
    } catch (error) {
      logger.error('Token verification failed due to : ' + (error as Error).message);
      return [false, null];
    }
  }
}


