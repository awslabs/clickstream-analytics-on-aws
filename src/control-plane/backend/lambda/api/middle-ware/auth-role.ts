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
import { ApiFail, IUserRole } from '../common/types';
import { getRoleFromToken, getTokenFromRequest, getUidFromTokenPayload } from '../common/utils';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const store: ClickStreamStore = new DynamoDbStore();

const routerRoles: Map<string, IUserRole[]> = new Map();
routerRoles.set('GET /api/user/details', [IUserRole.ADMIN, IUserRole.OPERATOR, IUserRole.ANALYST, IUserRole.ANALYST_READER, IUserRole.NO_IDENTITY]);
routerRoles.set('GET /api/pipeline/:id', [IUserRole.ADMIN, IUserRole.OPERATOR, IUserRole.ANALYST, IUserRole.ANALYST_READER]);
routerRoles.set('GET /api/app', [IUserRole.ADMIN, IUserRole.OPERATOR, IUserRole.ANALYST, IUserRole.ANALYST_READER]);
routerRoles.set('GET /api/project', [IUserRole.ADMIN, IUserRole.OPERATOR, IUserRole.ANALYST, IUserRole.ANALYST_READER]);
routerRoles.set('GET /api/project/:pid/:aid/dashboard/*', [IUserRole.ADMIN, IUserRole.ANALYST, IUserRole.ANALYST_READER]);
routerRoles.set('POST /api/project/:pid/:aid/dashboard/*', [IUserRole.ADMIN, IUserRole.ANALYST]);
routerRoles.set('PUT /api/project/:pid/:aid/dashboard/*', [IUserRole.ADMIN, IUserRole.ANALYST]);
routerRoles.set('DELETE /api/project/:pid/:aid/dashboard/*', [IUserRole.ADMIN, IUserRole.ANALYST]);
routerRoles.set('GET /api/project/:pid/analyzes', [IUserRole.ADMIN, IUserRole.ANALYST, IUserRole.ANALYST_READER]);

routerRoles.set('ALL /api/env/*', [IUserRole.ADMIN, IUserRole.OPERATOR]);
routerRoles.set('ALL /api/app/*', [IUserRole.ADMIN, IUserRole.OPERATOR]);
routerRoles.set('ALL /api/pipeline/*', [IUserRole.ADMIN, IUserRole.OPERATOR]);
routerRoles.set('ALL /api/plugin/*', [IUserRole.ADMIN, IUserRole.OPERATOR]);
routerRoles.set('ALL /api/project/*', [IUserRole.ADMIN, IUserRole.OPERATOR]);
routerRoles.set('GET /api/metadata/*', [IUserRole.ADMIN, IUserRole.ANALYST, IUserRole.ANALYST_READER]);
routerRoles.set('POST /api/metadata/*', [IUserRole.ADMIN, IUserRole.ANALYST]);
routerRoles.set('PUT /api/metadata/*', [IUserRole.ADMIN, IUserRole.ANALYST]);
routerRoles.set('DELETE /api/metadata/*', [IUserRole.ADMIN, IUserRole.ANALYST]);
routerRoles.set('ALL /api/reporting/*', [IUserRole.ADMIN, IUserRole.ANALYST, IUserRole.ANALYST_READER]);
routerRoles.set('ALL /api/user/*', [IUserRole.ADMIN]);


const FORBIDDEN_MESSAGE = 'Insufficient permissions to access the API.';
const HTTP_METHODS_PATTERN = '(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)';
const ROUTER_PARAMETER_PATTERN = '([A-Za-z0-9_]+)';

function matchRouter(requestKey: string): IUserRole[] | undefined {
  let accessRoles = routerRoles.get(requestKey);
  if (!accessRoles) {
    for (let [route, roles] of routerRoles) {
      // replace ALL to HTTP_METHODS_PATTERN
      let pattern = route.replace(/ALL/g, HTTP_METHODS_PATTERN);
      // support router parameters like /api/abc/:id
      pattern = pattern.replace(/:\w+/g, ROUTER_PARAMETER_PATTERN);
      // support /api/abc/* match /api/abc
      pattern = pattern.replace(/\/\*$/, '(/.*|)');
      const regexp = new RegExp(pattern);
      const match = requestKey.match(regexp);
      if (match && requestKey === match[0]) {
        accessRoles = roles;
        break;
      }
    }
  }
  return accessRoles;
}

export async function authRole(req: express.Request, res: express.Response, next: express.NextFunction) {
  const WITH_VALIDATE_ROLE = process.env.WITH_VALIDATE_ROLE;
  if (WITH_VALIDATE_ROLE === 'true' && req.url !== process.env.HEALTH_CHECK_PATH) {
    const token = getTokenFromRequest(req);
    if (!token) {
      logger.warn('No token found.');
      return res.status(401).json(new ApiFail('No token found.'));
    }
    const uid = getUidFromTokenPayload(token?.payload as JwtPayload);
    if (!uid) {
      logger.warn('Error authentication token.');
      return res.status(401).json(new ApiFail('Error authentication token.'));
    }

    const user = await store.getUser(uid);
    let userRole;
    if (user && user.role) {
      userRole = user.role;
    } else {
      userRole = await getRoleFromToken(token);
    }

    const requestKey = `${req.method} ${req.path}`;
    const accessRoles = matchRouter(requestKey);
    if (!accessRoles || !accessRoles.includes(userRole)) {
      logger.warn(FORBIDDEN_MESSAGE);
      return res.status(403).json(new ApiFail(FORBIDDEN_MESSAGE));
    }
  }

  return next();
}