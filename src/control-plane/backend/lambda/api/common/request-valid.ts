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
import { validationResult, ValidationChain, CustomValidator } from 'express-validator';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';
import { awsRegion } from './constants';
import { isEmpty } from './utils';

const store: ClickStreamStore = new DynamoDbStore();

export class ApiResponse {
  public success: boolean;
  public message: string;

  constructor(success: boolean, message?: string) {
    this.success = success;
    this.message = message? message: '';
  }
}

export class ApiSuccess extends ApiResponse {
  public data?: any | never[];

  constructor(data: any | never[], message?: string) {
    super(true, message);
    this.data = data;
  }
}

export class ApiFail extends ApiResponse {
  public error?: any;

  constructor(message: string, error?: any) {
    super(false, message);
    this.error = error;
  }
}

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

export const defaultRegionValueValid: CustomValidator = (value, { req }) => {
  if (req.query) {
    const { region } = value;
    req.query.region = isEmpty(region)? awsRegion : region;
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

export const isProjectExisted: CustomValidator = value => {
  if (isEmpty(value)) {
    return Promise.reject('Value is empty.');
  }
  return store.isProjectExisted(value).then(existed => {
    if (!existed) {
      return Promise.reject('Project resource does not exist.');
    }
    return;
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
    return;
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
    return;
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
    return;
  });
};


