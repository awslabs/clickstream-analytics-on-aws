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
import { logger } from '../common/powertools';
import { ApiFail, ClickStreamAuthError, ClickStreamBadRequestError } from '../common/types';

// Implement the “catch-all” errorHandler function
export function errorHandler(err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) {
  logger.error('Unexpected error occurred at server.', {
    error: err,
  });
  if (err instanceof ClickStreamAuthError) {
    return res.status(err.code).json(err.body);
  }
  if (err instanceof ClickStreamBadRequestError) {
    return res.status(400).json(new ApiFail(err.message));
  }
  if (err instanceof URIError) {
    return res.status(400).json(new ApiFail('Invalid URI.'));
  }
  if (err.name === 'TransactionCanceledException') {
    return res.status(400).json(new ApiFail('Update error, check version and retry.'));
  }
  if (err.name === 'TypeError') {
    return res.status(400).json(new ApiFail(`Validation error: ${err.message}. Please check and try again.`));
  }
  if (err.name === 'PayloadTooLargeError') {
    return res.status(413).json(new ApiFail('The request entity is larger than limits defined by server.'));
  }
  return res.status(500).send(new ApiFail('Unexpected error occurred at server.', err.name));
}