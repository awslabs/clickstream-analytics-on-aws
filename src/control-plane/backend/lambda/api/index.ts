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
import { amznRequestContextHeader } from './common/constants';
import { logger } from './common/powertools';
import { ApiFail } from './common/types';
import { getEmailFromRequestContext, isEmpty } from './common/utils';
import { ERR_OPENID_CONFIGURATION, JWTAuthorizer } from './middle-ware/authorizer';
import { router_app } from './router/application';
import { router_dictionary } from './router/dictionary';
import { router_env } from './router/environment';
import { router_pipeline } from './router/pipeline';
import { router_plugin } from './router/plugin';
import { router_project } from './router/project';
import { ProjectServ } from './service/project';

const app = express();
const port = process.env.PORT || 8080;
const projectServ: ProjectServ = new ProjectServ();

const issuerInput = process.env.ISSUER ?? '';
const authorizerTable = process.env.AUTHORIZER_TABLE ?? '';

app.use(express.json({ limit: '384kb' }));

// Implement logger middleware function
app.use(function (req: express.Request, _res: express.Response, next: express.NextFunction) {
  if (req.url !== process.env.HEALTH_CHECK_PATH) {
    logger.info('Request',
      {
        url: req.url,
        method: req.method,
        body: req.body,
        params: req.params,
        query: req.query,
      });
  }
  next();
});

// Implement authorization middleware function
app.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
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
});

// Implement save request id interceptor
app.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const originalEnd = res.end;
  let duration = 0;
  const start = Date.now();
  // @ts-ignore
  res.end = async (chunk: any, encoding: BufferEncoding, cb?: () => void) => {
    const requestId = req.get('X-Click-Stream-Request-Id');
    if (requestId && res.statusCode >= 200 && res.statusCode <= 299) {
      await projectServ.saveRequestId(requestId);
    }
    duration = Date.now() - start;
    res.setHeader('X-Click-Stream-Response-Time', duration);
    res.end = originalEnd;
    res.end(chunk, encoding, cb);
  };
  next();
});

// healthcheck
app.get(process.env.HEALTH_CHECK_PATH ?? '/', async (_req: express.Request, res: express.Response) => {
  res.send('OK!');
});

// routers
app.use('/api/env', router_env);
app.use('/api/dictionary', router_dictionary);
app.use('/api/project', router_project);
app.use('/api/app', router_app);
app.use('/api/pipeline', router_pipeline);
app.use('/api/plugin', router_plugin);

// Implement the “catch-all” errorHandler function
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unexpected error occurred at server.', {
    error: err,
  });
  if (err.name === 'TransactionCanceledException') {
    return res.status(400).json(new ApiFail('Update error, check version and retry.'));
  }
  if (err.name === 'ClickStreamBadRequestError') {
    return res.status(400).json(new ApiFail(err.message));
  }
  if (err.name === 'TypeError') {
    return res.status(400).json(new ApiFail(`Validation error: ${err.message}. Please check and try again.`));
  }
  if (err.name === 'PayloadTooLargeError') {
    return res.status(413).json(new ApiFail('The request entity is larger than limits defined by server.'));
  }
  return res.status(500).send(new ApiFail('Unexpected error occurred at server.', err.name));
});

// do not explicitly listen on a port when running tests.
let server = app.listen();
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(port, () => console.log(`Listening on port ${port}`));
}

export {
  app,
  server,
};
