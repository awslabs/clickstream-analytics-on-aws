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
import { amznLambdaContextHeader, amznRequestContextHeader } from '../common/constants';
import { logger } from '../common/powertools';
import { deserializeContext } from '../common/utils';

// Implement inject context middleware function
export function injectContext(req: express.Request, res: express.Response, next: express.NextFunction) {
  const requestContext = deserializeContext(req.get(amznRequestContextHeader)) ?? undefined;
  const lambdaContext = deserializeContext(req.get(amznLambdaContextHeader)) ?? undefined;
  logger.addPersistentLogAttributes({
    apiGatewayRequestId: requestContext?.requestId ?? '',
    lambdaRequestId: lambdaContext?.request_id ?? '',
  });

  res.set('X-Click-Stream-Lambda-Request-Id', lambdaContext?.request_id ?? '');
  next();
}