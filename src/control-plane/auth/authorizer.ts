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
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, GetCommandOutput, PutCommand } from '@aws-sdk/lib-dynamodb';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';
import jwt, { JwtPayload } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import NodeCache from 'node-cache';
import fetch from 'node-fetch';

const logger = new Logger();
const nodeCache = new NodeCache();

export const ERR_OPENID_CONFIGURATION = 'Get openid configuration error.';
const OPENID_CONFIGURATION_KEY = 'OPENID_CONFIGURATION';
const CACHE_TTL = 60 * 60 * 24;

// Create DynamoDB Client and patch it for tracing
const ddbClient = new DynamoDBClient({
  maxAttempts: 3,
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 5000,
    requestTimeout: 5000,
  }),
});

// Create the DynamoDB Document client.
const docClient = DynamoDBDocumentClient.from(ddbClient);

interface JWTAuthorizerProps {
  readonly issuer: string;
  readonly dynamodbTableName: string;
}

interface JWTAuthorizerReponse {
  readonly success: boolean;
  readonly jwtPayload?: string | JwtPayload;
}

interface OpenidConfiguration {
  readonly issuer: string;
  readonly jwks_uri: string;
}

export class JWTAuthorizer {

  private issuer?: string;
  private dynamodbTableName?: string;
  private openidConfigurationKey: string;
  private cacheTtl: number;

  constructor(props: JWTAuthorizerProps) {
    this.openidConfigurationKey = OPENID_CONFIGURATION_KEY;
    this.cacheTtl = CACHE_TTL;
    this.dynamodbTableName = props.dynamodbTableName;
    this.issuer = props.issuer;
  }

  public async auth(authorizationToken: string): Promise<JWTAuthorizerReponse> {
    if (authorizationToken === undefined
      || authorizationToken.indexOf('Bearer ') != 0 ) {

      logger.error('AuthorizationToken is undefined or has invalid format');
      return {
        success: false,
      };
    }

    // Get the token from the Authorization header
    const token = authorizationToken.split(' ')[1];
    // Decode the token
    const decodedToken = jwt.decode(token, { complete: true });
    if (decodedToken === null) {
      logger.error('DecodedToken is null');
      return {
        success: false,
      };
    }

    const openidConfiguration = await this.getOpenidConfiguration();
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
      return {
        success: false,
      };
    }
    // Return a policy document that allows access to the API
    return {
      success: true,
      jwtPayload: verifiedToken,
    };
  }

  private async getOpenidConfiguration(): Promise<OpenidConfiguration | undefined> {
    try {
      const localCache = nodeCache.get(this.openidConfigurationKey);
      if (localCache) {
        return localCache as OpenidConfiguration;
      } else {
        const ddbCache = await this.getOpenidConfigurationFromDDB();
        if (ddbCache) {
          nodeCache.set(this.openidConfigurationKey, ddbCache, this.cacheTtl);
          return ddbCache as OpenidConfiguration;
        } else {
          let jwksUriSuffix = '.well-known/openid-configuration';
          if (!this.issuer?.endsWith('/')) {
            jwksUriSuffix = `/${jwksUriSuffix}`;
          }
          const response = await fetch(`${this.issuer}${jwksUriSuffix}`, {
            method: 'GET',
          });
          const data = await response.json();
          await this.setOpenidConfigurationToDDB(this.openidConfigurationKey, data, this.cacheTtl);
          nodeCache.set(this.openidConfigurationKey, data, this.cacheTtl);
          return data as OpenidConfiguration;
        }
      }
    } catch (error) {
      logger.error('fetch openid-configuration error', { error });
      return undefined;
    }
  }

  private async getOpenidConfigurationFromDDB(): Promise<OpenidConfiguration | undefined> {
    try {
      const params: GetCommand = new GetCommand({
        TableName: this.dynamodbTableName,
        Key: {
          id: this.openidConfigurationKey,
        },
      });
      const result: GetCommandOutput = await docClient.send(params);
      if (result.Item) {
        return result.Item.data as OpenidConfiguration;
      }
      return undefined;
    } catch (error) {
      logger.error('get openid configuration from DDB error', { error });
      return undefined;
    }
  }

  private async setOpenidConfigurationToDDB(key: string, data: OpenidConfiguration, ttl: number): Promise<void> {
    try {
      const params: PutCommand = new PutCommand({
        TableName: this.dynamodbTableName,
        Item: {
          id: key,
          ttl: Date.now() / 1000 + ttl,
          data: data,
        },
      });
      await docClient.send(params);
    } catch (error) {
      logger.error('set openid configuration to DDB error', { error });
    }
  }
}
