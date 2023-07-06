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

import express from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { ERR_OPENID_CONFIGURATION, JWTAuthorizer } from './authorizer';
import { amznRequestContextHeader } from '../common/constants';
import { logger } from '../common/powertools';
import { getEmailFromRequestContext, isEmpty } from '../common/utils';

const issuerInput = process.env.ISSUER ?? '';
const authorizerTable = process.env.AUTHORIZER_TABLE ?? '';

// Implement access log middleware function
export async function authOIDC(req: express.Request, res: express.Response, next: express.NextFunction) {
  let operator = '';
  const WITH_AUTH_MIDDLEWARE = process.env.WITH_AUTH_MIDDLEWARE;
  if (WITH_AUTH_MIDDLEWARE === 'true' && req.url !== process.env.HEALTH_CHECK_PATH) {
    // ALB control plane get IdToken from header
    const authorization = req.get('authorization');
    if (authorization === undefined) {
      logger.info('Missing authentication token.');
      return res.status(401).send({
        auth: false,
        message: 'No token provided.',
      });
    } else {
      try {
        const authorizer = new JWTAuthorizer({
          issuer: issuerInput,
          dynamodbTableName: authorizerTable,
        });

        const authResult = await authorizer.auth(authorization);
        if (!authResult.success) {
          const requestId = req.get('X-Click-Stream-Request-Id');
          logger.warn(`Authentication failed. Request ID: ${requestId}`);
          return res.status(403).send({
            auth: false,
            message: 'Invalid token provided.',
          });
        }

        if (!isEmpty((authResult.jwtPayload as JwtPayload).email)) {
          operator = (authResult.jwtPayload as JwtPayload).email.toString();
        } else if (!isEmpty((authResult.jwtPayload as JwtPayload).username)) {
          operator = (authResult.jwtPayload as JwtPayload).username.toString();
        }
      } catch (err: any) {
        if (err instanceof Error && err.message == ERR_OPENID_CONFIGURATION) {
          return res.status(401).send({
            auth: false,
            message: 'Get openid configuration error.',
          });
        }
        logger.error(err);
        return res.status(500).send({
          auth: false,
          message: 'internal error.',
        });
      }
    }
  } else {
    // Cloudfront control plane
    operator = getEmailFromRequestContext(req.get(amznRequestContextHeader));
  }
  res.set('X-Click-Stream-Operator', operator);
  return next();
}