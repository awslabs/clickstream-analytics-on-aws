/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import express from 'express';
import { body, header, param, query } from 'express-validator';
import { logger } from './common/powertools';
import {
  defaultPageValueValid,
  isApplicationExisted, isPipelineExisted, isRequestIdExisted,
  isProjectExisted,
  isValidEmpty,
  validate,
  validMatchParamId,
  ApiFail,
} from './common/request-valid';
import { ApplicationServ } from './service/application';
import { DictionaryServ } from './service/dictionary';
import { PipelineServ } from './service/pipeline';
import { ProjectServ } from './service/project';

const app = express();
const port = process.env.PORT || 8080;

const dictionaryServ: DictionaryServ = new DictionaryServ();
const projectServ: ProjectServ = new ProjectServ();
const appServ: ApplicationServ = new ApplicationServ();
const pipelineServ: PipelineServ = new PipelineServ();

app.use(express.json());

// Implement logger middleware function
app.use(function (req: express.Request, _res: express.Response, next: express.NextFunction) {
  if (req.url !== '/') {
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

// healthcheck
app.get('/', async (_req: express.Request, res: express.Response) => {
  res.send('OK!');
});

app.get('/api/dictionary', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  return dictionaryServ.list(req, res, next);
});

app.get('/api/dictionary/:name', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  return dictionaryServ.details(req, res, next);
});

app.get('/api/project/verification/:tablename', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  return projectServ.verification(req, res, next);
});

app.get(
  '/api/project',
  validate([
    query().custom((value, { req }) => defaultPageValueValid(value, { req, location: 'body', path: '' })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return projectServ.list(req, res, next);
  });

app.post(
  '/api/project',
  validate([
    body().custom(isValidEmpty),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return projectServ.create(req, res, next);
  });

app.get('/api/project/:id', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  return projectServ.details(req, res, next);
});

app.put(
  '/api/project/:id',
  validate([
    body().custom(isValidEmpty),
    body('projectId')
      .custom(isProjectExisted)
      .custom((value, { req }) => validMatchParamId(value, { req, location: 'body', path: '' })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return projectServ.update(req, res, next);
  });

app.delete(
  '/api/project/:id',
  validate([
    param('id').custom(isProjectExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return projectServ.delete(req, res, next);
  });

app.get(
  '/api/app',
  validate([
    query('pid').custom(isProjectExisted),
    query().custom((value, { req }) => defaultPageValueValid(value, { req, location: 'body', path: '' })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return appServ.list(req, res, next);
  });

app.post(
  '/api/app',
  validate([
    body().custom(isValidEmpty),
    body('projectId')
      .custom(isProjectExisted),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return appServ.add(req, res, next);
  });

app.get(
  '/api/app/:id',
  validate([
    query('pid').custom(isProjectExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return appServ.details(req, res, next);
  });

app.put(
  '/api/app/:id',
  validate([
    body('appId')
      .custom((value, { req }) => validMatchParamId(value, { req, location: 'body', path: '' }))
      .custom((value, { req }) => isApplicationExisted(value, { req, location: 'body', path: 'projectId' })),
    body('projectId')
      .custom(isProjectExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return appServ.update(req, res, next);
  });

app.delete(
  '/api/app/:id',
  validate([
    param('id').custom((value, { req }) => isApplicationExisted(value, { req, location: 'query', path: 'pid' })),
    query('pid')
      .custom(isProjectExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return appServ.delete(req, res, next);
  });

app.post(
  '/api/pipeline',
  validate([
    body().custom(isValidEmpty),
    body('base').not().isEmpty(),
    body('runtime').not().isEmpty(),
    body('ingestion').not().isEmpty(),
    body('etl').not().isEmpty(),
    body('dataModel').not().isEmpty(),
    body('projectId').custom(isProjectExisted),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return pipelineServ.add(req, res, next);
  });

app.get(
  '/api/pipeline',
  validate([
    query('pid').custom(isProjectExisted),
    query().custom((value, { req }) => defaultPageValueValid(value, { req, location: 'body', path: '' })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return pipelineServ.list(req, res, next);
  });

app.get(
  '/api/pipeline/:id',
  validate([
    query('pid').custom(isProjectExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return pipelineServ.details(req, res, next);
  });

app.put(
  '/api/pipeline/:id',
  validate([
    body('pipelineId').custom(isValidEmpty)
      .custom((value, { req }) => validMatchParamId(value, { req, location: 'body', path: '' })),
    body('projectId')
      .custom(isProjectExisted),
    body('version').custom(isValidEmpty),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return pipelineServ.update(req, res, next);
  });

app.delete(
  '/api/pipeline/:id',
  validate([
    param('id').custom((value, { req }) => isPipelineExisted(value, { req, location: 'query', path: 'pid' })),
    query('pid')
      .custom(isProjectExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return pipelineServ.delete(req, res, next);
  });

// Implement the “catch-all” errorHandler function
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unexpected error occurred at server.', err);
  if (err.name === 'TransactionCanceledException') {
    return res.status(400).json(new ApiFail('Update error, check version and retry.'));
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
