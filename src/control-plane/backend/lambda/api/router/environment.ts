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
import { body, header, query } from 'express-validator';
import { defaultPageValueValid, defaultRegionValueValid, defaultSubnetTypeValid, isRequestIdExisted, isValidEmpty, validate } from '../common/request-valid';
import { EnvironmentServ } from '../service/environment';

const router_env: express.Router = express.Router();
const environmentServ: EnvironmentServ = new EnvironmentServ();

router_env.get(
  '/env/regions',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.listRegions(req, res, next);
  });

router_env.get(
  '/env/vpcs',
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

router_env.get(
  '/env/vpc/:vpcId/subnets',
  validate([
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

router_env.get(
  '/env/vpc/:vpcId/securityGroups',
  validate([
    query().custom((value, { req }) => defaultRegionValueValid(value, {
      req,
      location: 'body',
      path: '',
    })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.describeSecurityGroups(req, res, next);
  });

router_env.get(
  '/env/buckets',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.listBuckets(req, res, next);
  });

router_env.get(
  '/env/MSKClusters',
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

router_env.get(
  '/env/redshiftClusters',
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

router_env.get(
  '/env/redshiftServerlessWorkGroups',
  validate([
    query().custom((value, { req }) => defaultRegionValueValid(value, {
      req,
      location: 'body',
      path: '',
    })),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.listRedshiftServerlessWorkGroups(req, res, next);
  });

router_env.get(
  '/env/quickSightSubscription',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.describeAccountSubscription(req, res, next);
  });

router_env.get(
  '/env/IAMRoles',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.listRoles(req, res, next);
  });

router_env.get(
  '/env/ACMCertificates',
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

router_env.get(
  '/env/SSMSecrets',
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

router_env.get(
  '/env/uploadRole',
  validate([
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.AssumeUploadRole(req, res, next);
  });

router_env.get(
  '/env/alarms',
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

router_env.put(
  '/env/alarm',
  validate([
    body('region').custom(isValidEmpty),
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.alarmsUpdate(req, res, next);
  });

router_env.get(
  '/env/servicesAvailable',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.servicesPing(req, res, next);
  });

router_env.get(
  '/env/domainAvailable',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.fetch(req, res, next);
  });

export {
  router_env,
};
