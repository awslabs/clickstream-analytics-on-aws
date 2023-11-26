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
import { ProjectServ } from '../service/project';

const projectServ: ProjectServ = new ProjectServ();

// Implement access log middleware function
export async function responseTime(req: express.Request, res: express.Response, next: express.NextFunction) {
  const originalEnd = res.end;
  let duration = 0;
  const start = Date.now();
  // @ts-ignore
  res.end = async (chunk: any, encoding: BufferEncoding, cb?: () => void) => {
    const requestId = req.get('X-Click-Stream-Request-Id');
    if (requestId && res.statusCode >= 500) {
      await projectServ.deleteRequestId(requestId);
    }
    duration = Date.now() - start;
    res.setHeader('X-Click-Stream-Response-Time', duration);
    res.end = originalEnd;
    res.end(chunk, encoding, cb);
  };
  next();
}