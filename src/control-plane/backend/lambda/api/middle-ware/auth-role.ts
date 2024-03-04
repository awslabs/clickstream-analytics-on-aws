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

import { UserRole } from '@aws/clickstream-base-lib';
import express from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { logger } from '../common/powertools';
import { ApiFail } from '../common/types';
import { getRoleFromToken, getTokenFromRequest, getUidFromTokenPayload } from '../common/utils';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const store: ClickStreamStore = new DynamoDbStore();

const routerRoles: Map<string, UserRole[]> = new Map();
routerRoles.set('GET /api/user/details', []);
routerRoles.set('GET /api/pipeline/:id', [UserRole.ADMIN, UserRole.OPERATOR, UserRole.ANALYST, UserRole.ANALYST_READER]);
routerRoles.set('GET /api/app', [UserRole.ADMIN, UserRole.OPERATOR, UserRole.ANALYST, UserRole.ANALYST_READER]);
routerRoles.set('GET /api/projects', [UserRole.ADMIN, UserRole.OPERATOR, UserRole.ANALYST, UserRole.ANALYST_READER]);
routerRoles.set('GET /api/project/:pid/app/:aid/dashboards', [UserRole.ADMIN, UserRole.ANALYST, UserRole.ANALYST_READER]);
routerRoles.set('GET /api/project/:pid/app/:aid/dashboard/*', [UserRole.ADMIN, UserRole.ANALYST, UserRole.ANALYST_READER]);
routerRoles.set('POST /api/project/:pid/app/:aid/dashboard/*', [UserRole.ADMIN, UserRole.ANALYST]);
routerRoles.set('PUT /api/project/:pid/app/:aid/dashboard/*', [UserRole.ADMIN, UserRole.ANALYST]);
routerRoles.set('DELETE /api/project/:pid/app/:aid/dashboard/*', [UserRole.ADMIN, UserRole.ANALYST]);
routerRoles.set('GET /api/project/:pid/analyzes', [UserRole.ADMIN, UserRole.ANALYST]);

routerRoles.set('ALL /api/env/*', [UserRole.ADMIN, UserRole.OPERATOR]);
routerRoles.set('ALL /api/app/*', [UserRole.ADMIN, UserRole.OPERATOR]);
routerRoles.set('ALL /api/pipeline/*', [UserRole.ADMIN, UserRole.OPERATOR]);
routerRoles.set('ALL /api/plugin/*', [UserRole.ADMIN, UserRole.OPERATOR]);
routerRoles.set('ALL /api/project/*', [UserRole.ADMIN, UserRole.OPERATOR]);
routerRoles.set('GET /api/metadata/*', [UserRole.ADMIN, UserRole.ANALYST, UserRole.ANALYST_READER]);
routerRoles.set('POST /api/metadata/*', [UserRole.ADMIN, UserRole.ANALYST]);
routerRoles.set('PUT /api/metadata/*', [UserRole.ADMIN, UserRole.ANALYST]);
routerRoles.set('DELETE /api/metadata/*', [UserRole.ADMIN, UserRole.ANALYST]);
routerRoles.set('ALL /api/reporting/*', [UserRole.ADMIN, UserRole.ANALYST, UserRole.ANALYST_READER]);
routerRoles.set('ALL /api/user/*', [UserRole.ADMIN]);
routerRoles.set('GET /api/users', [UserRole.ADMIN]);


const FORBIDDEN_MESSAGE = 'Insufficient permissions to access the API.';
const HTTP_METHODS_PATTERN = '(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)';
const ROUTER_PARAMETER_PATTERN = '([A-Za-z0-9_]+)';

function matchRouter(requestKey: string): UserRole[] | undefined {
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
    let userRoles: UserRole[] = [];
    if (user && user.roles) {
      userRoles = user.roles;
    } else {
      userRoles = await getRoleFromToken(token);
    }

    const requestKey = `${req.method} ${req.path}`;
    const accessRoles = matchRouter(requestKey);

    if (!accessRoles) {
      logger.warn('No access roles found.');
      return res.status(403).json(new ApiFail(FORBIDDEN_MESSAGE));
    }
    if (!checkUserRoles(userRoles, accessRoles)) {
      logger.warn(FORBIDDEN_MESSAGE);
      return res.status(403).json(new ApiFail(FORBIDDEN_MESSAGE));
    }
  }

  return next();
}

function checkUserRoles(userRoles: UserRole[], accessRoles: UserRole[]) {
  if (accessRoles.length === 0) {
    return true;
  }
  return intersectArrays(userRoles, accessRoles).length !== 0;
}

function intersectArrays(a: any[], b: any[]) {
  return [...new Set(a)].filter(x => new Set(b).has(x));
}