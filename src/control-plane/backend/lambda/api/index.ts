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
import { accessLog } from './middle-ware/access-log';
import { authOIDC } from './middle-ware/auth-oidc';
import { errorHandler } from './middle-ware/error-handler';
import { responseTime } from './middle-ware/response-time';
import { router_app } from './router/application';
import { router_dictionary } from './router/dictionary';
import { router_env } from './router/environment';
import { router_metadata } from './router/metadata';
import { router_pipeline } from './router/pipeline';
import { router_plugin } from './router/plugin';
import { router_project } from './router/project';
import { reporting_project } from './router/reporting';
import { router_user } from './router/user';

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json({ limit: '384kb' }));

app.use(accessLog);

app.use(authOIDC);

app.use(responseTime);

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
app.use('/api/metadata', router_metadata);
app.use('/api/reporting', reporting_project);
app.use('/api/user', router_user);

// Implement the “catch-all” errorHandler function
app.use(errorHandler);

// do not explicitly listen on a port when running tests.
let server = app.listen();
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(port, () => console.log(`Listening on port ${port}`));
}

export {
  app,
  server,
};
