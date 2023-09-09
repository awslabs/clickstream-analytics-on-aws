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
import { logger } from '../common/powertools';
import { IUserRole } from '../common/types';
import { getTokenFromRequest, getUidFromTokenPayload } from '../common/utils';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const store: ClickStreamStore = new DynamoDbStore();

const routerRoles: Map<string, IUserRole[]> = new Map();
routerRoles.set('get /api/pipeline/:id', [IUserRole.ADMIN, IUserRole.OPERATOR, IUserRole.ANALYST]);
routerRoles.set('get /api/env/quicksight/embedUrl', [IUserRole.ADMIN, IUserRole.ANALYST]);
routerRoles.set('get /api/project', [IUserRole.ADMIN, IUserRole.OPERATOR, IUserRole.ANALYST]);
routerRoles.set('all /api/project/:id/dashboard/*', [IUserRole.ADMIN, IUserRole.ANALYST]);

routerRoles.set('all /api/env/*', [IUserRole.ADMIN, IUserRole.OPERATOR]);
routerRoles.set('all /api/app/*', [IUserRole.ADMIN, IUserRole.OPERATOR]);
routerRoles.set('all /api/pipeline/*', [IUserRole.ADMIN, IUserRole.OPERATOR]);
routerRoles.set('all /api/plugin/*', [IUserRole.ADMIN, IUserRole.OPERATOR]);
routerRoles.set('all /api/project/*', [IUserRole.ADMIN, IUserRole.OPERATOR]);
routerRoles.set('all /api/metadata/*', [IUserRole.ADMIN, IUserRole.ANALYST]);
routerRoles.set('all /api/reporting/*', [IUserRole.ADMIN, IUserRole.ANALYST]);
routerRoles.set('all /api/user/*', [IUserRole.ADMIN]);


const UNAUTHORIZED_MESSAGE = 'Unauthorized.';
const FORBIDDEN_MESSAGE = 'Insufficient permissions to access the API.';

export async function authRole(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = getTokenFromRequest(req);
  const uid = getUidFromTokenPayload(token?.payload as JwtPayload);
  if (!uid) {
    logger.warn('Error authentication token.');
    return res.status(401).send({
      auth: false,
      message: UNAUTHORIZED_MESSAGE,
    });
  }

  const user = await store.getUser(uid);
  if (!user || !user.role || user.role === IUserRole.NO_IDENTITY) {
    logger.warn('User not found or no role.');
    return res.status(403).send({
      auth: false,
      message: FORBIDDEN_MESSAGE,
    });
  }

  const requestKey = `${req.method} ${req.url}`;
  let accessRoles = routerRoles.get(requestKey);
  if (!accessRoles) {
    for (let [route, roles] of routerRoles) {
      const regexp = new RegExp(route.replace(/\*/g, '\.\*').replace(/all/g, '\.\*'));
      console.log(regexp, requestKey);
      if (regexp.test(requestKey)) {
        accessRoles = roles;
        break;
      }
    }
  }
  if (!accessRoles || !accessRoles.includes(user.role)) {
    logger.warn(FORBIDDEN_MESSAGE);
    return res.status(403).send({
      auth: false,
      message: FORBIDDEN_MESSAGE,
    });
  }

  next();
}