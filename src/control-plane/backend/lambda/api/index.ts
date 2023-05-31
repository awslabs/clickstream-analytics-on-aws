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
import { body, header, param, query } from 'express-validator';
import jwksClient from 'jwks-rsa';
import { amznRequestContextHeader } from './common/constants';
import { logger } from './common/powertools';
import {
  defaultPageValueValid,
  isApplicationExisted,
  isPipelineExisted,
  isRequestIdExisted,
  isValidEmpty,
  validate,
  validMatchParamId,
  defaultRegionValueValid,
  defaultSubnetTypeValid,
  defaultOrderValueValid,
  isPluginIdValid,
  defaultAssumeRoleTypeValid,
  isProjectExisted,
  isProjectNotExisted,
  isValidAppId, isEmails,
} from './common/request-valid';
import { ApiFail } from './common/types';
import { getEmailFromRequestContext, isEmpty } from './common/utils';
import { JWTAuthorizer } from './middle-ware/authorizer';
import { ApplicationServ } from './service/application';
import { DictionaryServ } from './service/dictionary';
import { EnvironmentServ } from './service/environment';
import { PipelineServ } from './service/pipeline';
import { PluginServ } from './service/plugin';
import { ProjectServ } from './service/project';

const app = express();
const port = process.env.PORT || 8080;
const WITH_AUTH_MIDDLEWARE = process.env.WITH_AUTH_MIDDLEWARE;

const dictionaryServ: DictionaryServ = new DictionaryServ();
const projectServ: ProjectServ = new ProjectServ();
const appServ: ApplicationServ = new ApplicationServ();
const pipelineServ: PipelineServ = new PipelineServ();
const environmentServ: EnvironmentServ = new EnvironmentServ();
const pluginServ: PluginServ = new PluginServ();

const issuer = process.env.ISSUER ?? '';
const jwksUri = process.env.JWKS_URI ?? '';

const client = jwksClient({
  jwksUri: jwksUri,
  cache: true,
  cacheMaxAge: 300000, //5mins
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

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

// Implement authorization middleware function
app.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  let email = 'unknown';
  if (WITH_AUTH_MIDDLEWARE === 'true') {
    // ALB control plane get IdToken from header
    const authorization = req.get('authorization');
    if (authorization === undefined) {
      logger.info('Missing authentication token.');
      return res.status(401).send({
        auth: false,
        message: 'No token provided.',
      });
    } else {
      const isAuthorized = await JWTAuthorizer.auth(client, issuer, authorization);
      if (!isAuthorized[0]) {
        const requestId = req.get('X-Click-Stream-Request-Id');
        logger.warn(`Authentication failed. Request ID: ${requestId}`);
        return res.status(403).send({
          auth: false,
          message: 'Invalid token provided.',
        });
      }
      if (!isEmpty(isAuthorized[2])) {
        email = isAuthorized[2]!.toString();
      }
    }
  } else {
    // Cloudfront control plane
    email = getEmailFromRequestContext(req.get(amznRequestContextHeader));
  }
  res.set('X-Click-Stream-Operator', email);
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
app.get('/', async (_req: express.Request, res: express.Response) => {
  res.send('OK!');
});

app.get(
  '/api/env/regions',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.listRegions(req, res, next);
  });

app.get(
  '/api/env/vpc',
  validate([
    query().custom((value, { req }) => defaultRegionValueValid(value, {
      req,
      location: 'body',
      path: '',
    })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.describeVpcs(req, res, next);
  });

app.get(
  '/api/env/vpc3az',
  validate([
    query().custom((value, { req }) => defaultRegionValueValid(value, {
      req,
      location: 'body',
      path: '',
    })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.describeVpcs3AZ(req, res, next);
  });

app.get(
  '/api/env/vpc/subnet',
  validate([
    query('vpcId').custom(isValidEmpty),
    query().custom((value, { req }) => defaultRegionValueValid(value, {
      req,
      location: 'body',
      path: '',
    }))
      .custom((value, { req }) => defaultSubnetTypeValid(value, {
        req,
        location: 'body',
        path: '',
      })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.describeSubnets(req, res, next);
  });

app.get(
  '/api/env/vpc/securitygroups',
  validate([
    query('vpcId').custom(isValidEmpty),
    query().custom((value, { req }) => defaultRegionValueValid(value, {
      req,
      location: 'body',
      path: '',
    })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.describeSecurityGroups(req, res, next);
  });

app.get(
  '/api/env/s3/buckets',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.listBuckets(req, res, next);
  });

app.get(
  '/api/env/s3/checkalblogpolicy',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.checkALBLogPolicy(req, res, next);
  });

app.get(
  '/api/env/msk/clusters',
  validate([
    query('vpcId').custom(isValidEmpty),
    query().custom((value, { req }) => defaultRegionValueValid(value, {
      req,
      location: 'body',
      path: '',
    })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.listMSKCluster(req, res, next);
  });

app.get(
  '/api/env/msk/ping',
  validate([
    query().custom((value, { req }) => defaultRegionValueValid(value, {
      req,
      location: 'body',
      path: '',
    })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.mskPing(req, res, next);
  });

app.get(
  '/api/env/redshift/clusters',
  validate([
    query().custom((value, { req }) => defaultRegionValueValid(value, {
      req,
      location: 'body',
      path: '',
    })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.describeRedshiftClusters(req, res, next);
  });

app.get(
  '/api/env/redshift-serverless/workgroups',
  validate([
    query().custom((value, { req }) => defaultRegionValueValid(value, {
      req,
      location: 'body',
      path: '',
    })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.listRedshiftServerlessWorkgroups(req, res, next);
  });

app.get(
  '/api/env/quicksight/users',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.listQuickSightUsers(req, res, next);
  });

app.post(
  '/api/env/quicksight/user',
  validate([
    body('email').isEmail(),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.registerQuickSightUser(req, res, next);
  });

app.get(
  '/api/env/quicksight/ping',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.quickSightIsSubscribed(req, res, next);
  });

app.get(
  '/api/env/quicksight/describe',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.describeAccountSubscription(req, res, next);
  });

app.get(
  '/api/env/athena/workgroups',
  validate([
    query().custom((value, { req }) => defaultRegionValueValid(value, {
      req,
      location: 'body',
      path: '',
    })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.listWorkGroups(req, res, next);
  });

app.get(
  '/api/env/athena/ping',
  validate([
    query().custom((value, { req }) => defaultRegionValueValid(value, {
      req,
      location: 'body',
      path: '',
    })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.athenaPing(req, res, next);
  });

app.get(
  '/api/env/iam/roles',
  validate([
    query().custom((value, { req }) => defaultAssumeRoleTypeValid(value, {
      req,
      location: 'body',
      path: '',
    })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.listRoles(req, res, next);
  });

app.get(
  '/api/env/route53/hostedzones',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.listHostedZones(req, res, next);
  });

app.get(
  '/api/env/acm/certificates',
  validate([
    query().custom((value, { req }) => defaultRegionValueValid(value, {
      req,
      location: 'body',
      path: '',
    })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.listCertificates(req, res, next);
  });

app.get(
  '/api/env/ssm/secrets',
  validate([
    query().custom((value, { req }) => defaultRegionValueValid(value, {
      req,
      location: 'body',
      path: '',
    })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.listSecrets(req, res, next);
  });

app.get(
  '/api/env/sts/assume_upload_role',
  validate([
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.AssumeUploadRole(req, res, next);
  });

app.get(
  '/api/env/cloudwatch/alarms',
  validate([
    query().custom((value, { req }) => defaultPageValueValid(value, {
      req,
      location: 'body',
      path: '',
    })),
    query().custom((value, { req }) => defaultRegionValueValid(value, {
      req,
      location: 'body',
      path: '',
    })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.alarms(req, res, next);
  });

app.post(
  '/api/env/cloudwatch/alarms/disable',
  validate([
    body('region').custom(isValidEmpty),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.alarmsDisable(req, res, next);
  });

app.post(
  '/api/env/cloudwatch/alarms/enable',
  validate([
    body('region').custom(isValidEmpty),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.alarmsEnable(req, res, next);
  });

app.get(
  '/api/env/ping',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.servicesPing(req, res, next);
  });

app.post(
  '/api/env/fetch',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.fetch(req, res, next);
  });

app.get('/api/dictionary', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  return dictionaryServ.list(req, res, next);
});

app.get('/api/dictionary/:name', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  return dictionaryServ.details(req, res, next);
});

app.get('/api/project/verification/:id', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  return projectServ.verification(req, res, next);
});

app.get(
  '/api/project',
  validate([
    query().custom((value, { req }) => defaultPageValueValid(value, {
      req,
      location: 'body',
      path: '',
    }))
      .custom((value, { req }) => defaultOrderValueValid(value, {
        req,
        location: 'body',
        path: '',
      })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return projectServ.list(req, res, next);
  });

app.post(
  '/api/project',
  validate([
    body().custom(isValidEmpty),
    body('emails').custom(isEmails),
    body('id').custom(isProjectNotExisted),
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
    body('id')
      .custom(isProjectExisted)
      .custom((value, { req }) => validMatchParamId(value, {
        req,
        location: 'body',
        path: '',
      })),
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
    query().custom((value, { req }) => defaultPageValueValid(value, {
      req,
      location: 'body',
      path: '',
    }))
      .custom((value, { req }) => defaultOrderValueValid(value, {
        req,
        location: 'body',
        path: '',
      })),
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
    body('appId')
      .custom(isValidAppId),
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
      .custom((value, { req }) => validMatchParamId(value, {
        req,
        location: 'body',
        path: '',
      }))
      .custom((value, { req }) => isApplicationExisted(value, {
        req,
        location: 'body',
        path: 'projectId',
      })),
    body('projectId')
      .custom(isProjectExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return appServ.update(req, res, next);
  });

app.delete(
  '/api/app/:id',
  validate([
    param('id').custom((value, { req }) => isApplicationExisted(value, {
      req,
      location: 'query',
      path: 'pid',
    })),
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
    body('projectId').custom(isProjectExisted),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return pipelineServ.add(req, res, next);
  });

app.post(
  '/api/pipeline/:id/retry',
  validate([
    query('pid').custom(isProjectExisted),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return pipelineServ.retry(req, res, next);
  });

app.post(
  '/api/pipeline/:id/upgrade',
  validate([
    query('pid').custom(isProjectExisted),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return pipelineServ.upgrade(req, res, next);
  });

app.get(
  '/api/pipeline',
  validate([
    query().custom((value, { req }) => defaultPageValueValid(value, {
      req,
      location: 'body',
      path: '',
    }))
      .custom((value, { req }) => defaultOrderValueValid(value, {
        req,
        location: 'body',
        path: '',
      })),
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
      .custom((value, { req }) => validMatchParamId(value, {
        req,
        location: 'body',
        path: '',
      })),
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
    param('id').custom((value, { req }) => isPipelineExisted(value, {
      req,
      location: 'query',
      path: 'pid',
    })),
    query('pid')
      .custom(isProjectExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return pipelineServ.delete(req, res, next);
  });

app.get(
  '/api/plugin',
  validate([
    query().custom((value, { req }) => defaultPageValueValid(value, {
      req,
      location: 'body',
      path: '',
    }))
      .custom((value, { req }) => defaultOrderValueValid(value, {
        req,
        location: 'body',
        path: '',
      })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return pluginServ.list(req, res, next);
  });

app.post(
  '/api/plugin',
  validate([
    body().custom(isValidEmpty),
    body('jarFile').custom(isValidEmpty),
    body('mainFunction').custom(isValidEmpty),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return pluginServ.add(req, res, next);
  });

app.get(
  '/api/plugin/:id',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return pluginServ.details(req, res, next);
  });

app.put(
  '/api/plugin/:id',
  validate([
    body('id')
      .custom(isPluginIdValid)
      .custom((value, { req }) => validMatchParamId(value, {
        req,
        location: 'body',
        path: '',
      })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return pluginServ.update(req, res, next);
  });

app.delete(
  '/api/plugin/:id',
  validate([
    param('id').custom(isPluginIdValid),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return pluginServ.delete(req, res, next);
  });

// Implement the “catch-all” errorHandler function
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unexpected error occurred at server.', {
    error: err,
    request: req,
  });
  if (err.name === 'TransactionCanceledException') {
    return res.status(400).json(new ApiFail('Update error, check version and retry.'));
  }
  if (err.name === 'ClickStreamBadRequestError') {
    return res.status(400).json(new ApiFail(err.message));
  }
  if (err.name === 'TypeError') {
    return res.status(400).json(new ApiFail(`Validate error, ${err.message}. Please check and try again.`));
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
