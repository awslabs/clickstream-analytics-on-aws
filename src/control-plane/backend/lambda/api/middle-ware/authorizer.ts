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

import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { logger } from '../common/powertools';

export class JWTAuthorizer {

  public static async auth(client: jwksClient.JwksClient, issuer: string, authorizationToken: string) {
    try {
      if (authorizationToken === undefined
          || authorizationToken.indexOf('Bearer ') != 0 ) {

        logger.error('authorizationToken is undefined or has invalid format');
        return false;
      }

      // Get the token from the Authorization header
      const token = authorizationToken.split(' ')[1];
      // Decode the token
      const decodedToken = jwt.decode(token, { complete: true });
      if (decodedToken === null) {
        logger.error('decodedToken is null');
        return false;
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
        logger.error('Verify result is invalid');
        return false;
      } else {
        // Return a policy document that allows access to the API
        logger.debug('token verified');
        return true;
      }
    } catch (error) {
      logger.error('Token verification failed due to : ' + (error as Error).message);
      return false;
    }
  }
}


