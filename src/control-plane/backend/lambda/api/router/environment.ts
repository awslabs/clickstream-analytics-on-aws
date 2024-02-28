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
import { defaultAssumeRoleTypeValid, defaultPageValueValid, defaultRegionValueValid, defaultSubnetTypeValid, isRequestIdExisted, isValidEmpty, validate } from '../common/request-valid';
import { EnvironmentServ } from '../service/environment';

const router_env = express.Router();
const environmentServ: EnvironmentServ = new EnvironmentServ();

router_env.get(
  '/regions',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.listRegions(req, res, next);
  });

router_env.get(
  '/vpc',
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
  '/vpc3az',
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

router_env.get(
  '/vpc/subnet',
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

router_env.get(
  '/vpc/securitygroups',
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

router_env.get(
  '/s3/buckets',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.listBuckets(req, res, next);
  });

router_env.get(
  '/msk/clusters',
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
  '/redshift/clusters',
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
  '/redshift-serverless/workgroups',
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

router_env.get(
  '/quicksight/ping',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.quickSightIsSubscribed(req, res, next);
  });

router_env.get(
  '/quicksight/users',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.quickSightListUsers(req, res, next);
  });

router_env.get(
  '/quicksight/describe',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.describeAccountSubscription(req, res, next);
  });

router_env.get(
  '/iam/roles',
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

router_env.get(
  '/route53/hostedzones',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.listHostedZones(req, res, next);
  });

router_env.get(
  '/acm/certificates',
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
  '/ssm/secrets',
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
  '/sts/assume_upload_role',
  validate([
    header('X-Click-Stream-Request-Id').custom(isRequestIdExisted),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.AssumeUploadRole(req, res, next);
  });

router_env.get(
  '/cloudwatch/alarms',
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

router_env.post(
  '/cloudwatch/alarms/disable',
  validate([
    body('region').custom(isValidEmpty),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.alarmsDisable(req, res, next);
  });

router_env.post(
  '/cloudwatch/alarms/enable',
  validate([
    body('region').custom(isValidEmpty),
  ]),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.alarmsEnable(req, res, next);
  });

router_env.get(
  '/ping',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.servicesPing(req, res, next);
  });

router_env.post(
  '/fetch',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    return environmentServ.fetch(req, res, next);
  });

export {
  router_env,
};
