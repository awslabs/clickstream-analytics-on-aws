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
import NodeCache from 'node-cache';
import fetch from 'node-fetch';

const logger = new Logger();
const nodeCache = new NodeCache();

export const ERR_OPENID_CONFIGURATION = 'Get openid configuration error.';
export class JWTAuthorizer {

  public static async auth(authorizationToken: string, issuerInput?: string) {
    try {
      if (authorizationToken === undefined
        || authorizationToken.indexOf('Bearer ') != 0 ) {

        logger.error('AuthorizationToken is undefined or has invalid format');
        return [false, null, null, null];
      }

      // Get the token from the Authorization header
      const token = authorizationToken.split(' ')[1];
      // Decode the token
      const decodedToken = jwt.decode(token, { complete: true });
      if (decodedToken === null) {
        logger.error('DecodedToken is null');
        return [false, null, null, null];
      }

      const openidConfiguration = await getOpenidConfiguration(issuerInput);
      if (!openidConfiguration) {
        throw Error(ERR_OPENID_CONFIGURATION);
      }

      const client = jwksClient({
        jwksUri: openidConfiguration.jwks_uri,
        cache: true,
        cacheMaxAge: 300000, //5mins
        rateLimit: true,
        jwksRequestsPerMinute: 10,
      });
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
        issuer: openidConfiguration.issuer,
      });
      if (verifiedToken.sub === undefined) {
        logger.info('VerifiedToken is invalid');
        return [false, null, null, null];
      } else {
        // Return a policy document that allows access to the API
        logger.debug('Token verified');
        const email = (verifiedToken as any).email as string;
        const username = (verifiedToken as any).name as string;
        return [true, verifiedToken.sub, email, username];
      }
    } catch (error) {
      logger.error('Token verification failed due to : ' + (error as Error).message);
      return [false, null, null, null];
    }
  }
}

const getOpenidConfiguration = async (issuer: string | undefined) => {
  if (!issuer) {
    throw Error('Input issuer miss.');
  }
  try {
    const cacheConfiguration = nodeCache.get('openid-configuration');
    if (cacheConfiguration) {
      return cacheConfiguration as OpenidConfiguration;
    } else {
      let jwksUriSuffix = '.well-known/openid-configuration';
      if (!issuer.endsWith('/')) {
        jwksUriSuffix = `/${jwksUriSuffix}`;
      }
      const response = await fetch(`${issuer}${jwksUriSuffix}`, {
        method: 'GET',
      });
      const data = await response.json();
      nodeCache.set('openid-configuration', data);
      return data as OpenidConfiguration;
    }
  } catch (error) {
    logger.error('fetch openid-configuration error', { error });
    return undefined;
  }
};

export interface OpenidConfiguration {
  readonly issuer: string;
  readonly jwks_uri: string;
}