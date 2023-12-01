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
import { validationResult, ValidationChain, CustomValidator } from 'express-validator';
import { ALLOW_UPLOADED_FILE_TYPES, awsRegion } from './constants';
import { APP_ID_PATTERN, MULTI_EMAIL_PATTERN, PROJECT_ID_PATTERN } from './constants-ln';
import { validateXSS } from './stack-params-valid';
import { ApiFail, AssumeRoleType } from './types';
import { isEmpty } from './utils';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const store: ClickStreamStore = new DynamoDbStore();

// can be reused by many routes
// parallel processing
export const validate = (validations: ValidationChain[]) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }
    res.status(400).json(new ApiFail('Parameter verification failed.', errors.array()));
  };
};

export const isValidEmpty: CustomValidator = value => {
  if (isEmpty(value)) {
    return Promise.reject('Value is empty.');
  }
  return true;
};

export const validMatchParamId: CustomValidator = (value, { req }) => {
  if (value !== req.params?.id) {
    throw new Error('ID in path does not match ID in body.');
  }
  return true;
};

export const defaultPageValueValid: CustomValidator = (value, { req }) => {
  if (req.query) {
    const { pageNumber, pageSize } = value;
    req.query.pageNumber = isEmpty(pageNumber)? 1 : Number(pageNumber);
    req.query.pageSize = isEmpty(pageSize)? 10 : Number(pageSize);
  }
  return true;
};

export const defaultOrderValueValid: CustomValidator = (value, { req }) => {
  if (req.query) {
    const { order } = value;
    if (isEmpty(order)) {
      req.query.order = 'desc';
    } else {
      if (!['asc', 'desc'].includes(order)) {
        throw new Error('order in query must be: \'asc\', \'desc\'.');
      }
    }
  }
  return true;
};

export const defaultRegionValueValid: CustomValidator = (value, { req }) => {
  if (req.query) {
    const { region } = value;
    req.query.region = isEmpty(region)? awsRegion : region;
  }
  return true;
};

export const defaultAssumeRoleTypeValid: CustomValidator = (value, { req }) => {
  if (req.query) {
    const { account, service } = value;
    if (service) {
      req.query.type = AssumeRoleType.SERVICE;
      req.query.key = service;
    } else if (account) {
      req.query.type = AssumeRoleType.ACCOUNT;
      req.query.key = account;
    } else {
      req.query.type = AssumeRoleType.ALL;
    }
  }
  return true;
};

export const defaultSubnetTypeValid: CustomValidator = (value, { req }) => {
  if (req.query) {
    const { subnetType } = value;
    if (isEmpty(subnetType)) {
      req.query.subnetType = 'all';
    } else {
      const validType = ['public', 'private', 'isolated', 'all'];
      if (!validType.includes(subnetType)) {
        throw new Error('subnetType in query must be: \'public\', \'private\', \'isolated\' or \'all\'.');
      }
    }
  }
  return true;
};

export const isValidAppId: CustomValidator = value => {
  if (isEmpty(value)) {
    return Promise.reject('Value is empty.');
  }
  const regexp = new RegExp(APP_ID_PATTERN);
  const match = value.match(regexp);
  if (!match || value !== match[0]) {
    return Promise.reject(`Validation error: app name: ${value} not match ${APP_ID_PATTERN}. Please check and try again.`);
  }
  return true;
};

export const isProjectExisted: CustomValidator = value => {
  if (isEmpty(value)) {
    return Promise.reject('Value is empty.');
  }
  const regexp = new RegExp(PROJECT_ID_PATTERN);
  const match = value.match(regexp);
  if (!match || value !== match[0]) {
    return Promise.reject(`Validation error: projectId: ${value} not match ${PROJECT_ID_PATTERN}. Please check and try again.`);
  }
  return store.isProjectExisted(value).then(existed => {
    if (!existed) {
      return Promise.reject('Project resource does not exist.');
    }
    return true;
  });
};

export const isProjectNotExisted: CustomValidator = value => {
  if (isEmpty(value)) {
    return Promise.reject('Value is empty.');
  }
  const regexp = new RegExp(PROJECT_ID_PATTERN);
  const match = value.match(regexp);
  if (!match || value !== match[0]) {
    return Promise.reject(`Validation error: projectId: ${value} not match ${PROJECT_ID_PATTERN}. Please check and try again.`);
  }
  return store.isProjectExisted(value).then(existed => {
    if (existed) {
      return Promise.reject('Project resource existed.');
    }
    return true;
  });
};

export const isApplicationExisted: CustomValidator = (value, { req, location, path }) => {
  if (isEmpty(value)) {
    return Promise.reject('Value is empty.');
  }
  if (isEmpty(req[location][path])) {
    return Promise.reject(`${location}.${path} value is empty.`);
  }
  return store.isApplicationExisted(req[location][path], value).then(existed => {
    if (!existed) {
      return Promise.reject('Application resource does not exist.');
    }
    return true;
  });
};

export const isPipelineExisted: CustomValidator = (value, { req, location, path }) => {
  if (isEmpty(value)) {
    return Promise.reject('Value is empty.');
  }
  if (isEmpty(req[location][path])) {
    return Promise.reject(`${location}.${path} value is empty.`);
  }
  return store.isPipelineExisted(req[location][path], value).then(existed => {
    if (!existed) {
      return Promise.reject('Pipeline resource does not exist.');
    }
    return true;
  });
};

export const isRequestIdExisted: CustomValidator = value => {
  if (isEmpty(value)) {
    return Promise.reject('Value is empty.');
  }
  return store.isRequestIdExisted(value).then(existed => {
    if (existed) {
      return Promise.reject('Not Modified.');
    }
    return true;
  });
};

export const isPluginIdValid: CustomValidator = value => {
  if (isEmpty(value)) {
    return Promise.reject('Value is empty.');
  }
  return store.isPluginExisted(value).then(existed => {
    if (!existed) {
      return Promise.reject('Plugin resource does not exist.');
    }
    return true;
  });
};

export const isUserValid: CustomValidator = value => {
  if (isEmpty(value)) {
    return Promise.reject('Value is empty.');
  }
  return store.getUser(value).then(existed => {
    if (!existed) {
      return Promise.reject('User resource does not exist.');
    }
    return true;
  });
};

export const isEmails: CustomValidator = value => {
  if (isEmpty(value)) {
    return Promise.reject('Value is empty.');
  }
  const regexp = new RegExp(MULTI_EMAIL_PATTERN);
  const match = value.match(regexp);
  if (!match || value !== match[0]) {
    return Promise.reject(`Validation error: value: ${value} not match ${MULTI_EMAIL_PATTERN}. Please check and try again.`);
  }
  return true;
};

export const isProjectId: CustomValidator = value => {
  if (isEmpty(value)) {
    return Promise.reject('Value is empty.');
  }
  const regexp = new RegExp(PROJECT_ID_PATTERN);
  const match = value.match(regexp);
  if (!match || value !== match[0]) {
    return Promise.reject(`Validation error: projectId: ${value} not match ${PROJECT_ID_PATTERN}. Please check and try again.`);
  }
  return true;
};

export const isAppId: CustomValidator = value => {
  if (isEmpty(value)) {
    return Promise.reject('Value is empty.');
  }
  const regexp = new RegExp(APP_ID_PATTERN);
  const match = value.match(regexp);
  if (!match || value !== match[0]) {
    return Promise.reject(`Validation error: appId: ${value} not match ${APP_ID_PATTERN}. Please check and try again.`);
  }
  return true;
};

export const isXSSRequest = (data: any) => {
  const str = JSON.stringify(data);
  if (validateXSS(str)) {
    return Promise.reject('Bad request. Please check and try again.');
  }
  return true;
};

export const isAllowFilesSuffix = (data: any) => {
  if (isEmpty(data)) {
    return true;
  }
  if (Array.prototype.isPrototypeOf(data)) {
    for (let filename of data as string[]) {
      const index = filename.lastIndexOf('.') + 1;
      const suffix = filename.substring(index);
      if (!ALLOW_UPLOADED_FILE_TYPES.split(',').includes(suffix)) {
        return Promise.reject('Bad request. The file type not allow upload.');
      }
    }
  } else {
    const index = (data as string).lastIndexOf('.') + 1;
    const suffix = (data as string).substring(index);
    if (!ALLOW_UPLOADED_FILE_TYPES.split(',').includes(suffix)) {
      return Promise.reject('Bad request. The file type not allow upload.');
    }
  }
  return true;
};

