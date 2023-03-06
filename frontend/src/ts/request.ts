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

import Axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { reject } from 'lodash';
import { COMMON_ALERT_TYPE } from './const';
import { alertMsg, generateStr } from './utils';

const BASE_URL = '/api';
// define reqeustId key
const REQUEST_ID_KEY = 'X-Click-Stream-Request-Id';
// define requestId value
let requestId: string | null = null;

const axios = Axios.create({
  baseURL: BASE_URL,
  timeout: 100000,
});

/**
 * http request interceptor
 */
axios.interceptors.request.use(
  (config) => {
    config.headers = {
      'Content-Type': 'application/json',
      // Authorization: token ? `Bearer ${token}` : undefined,
    };
    // set x-click-stream-request-id
    if (!config.headers[REQUEST_ID_KEY]) {
      config.headers[REQUEST_ID_KEY] = requestId || generateStr(18);
      requestId = config.headers[REQUEST_ID_KEY];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * http response interceptor
 */
axios.interceptors.response.use(
  (response) => {
    // reset requestId if success
    requestId = null;
    return response;
  },
  (error) => {
    // use previous requestId for retry
    error.config.headers[REQUEST_ID_KEY] = requestId;
    return Promise.reject(error);
  }
);

// GET Request
export function getRequest<T>(url: string, params?: any): Promise<T> {
  return axios
    .get<ApiResponse<T>>(`${url}`, {
      params,
    })
    .then((response: AxiosResponse) => {
      const apiRes: ApiResponse<T> = response.data;
      if (apiRes.success) {
        return response.data;
      } else {
        alertMsg(apiRes.message, COMMON_ALERT_TYPE.Error as AlertType);
        throw new Error(response.data.message || 'Error');
      }
    })
    .catch((err) => {
      errMsg(err);
      reject(err);
    });
}

// POST Request
export function postRequest<T>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  return axios
    .post<ApiResponse<T>>(`${url}`, data, config)
    .then((response: AxiosResponse) => {
      const apiRes: ApiResponse<T> = response.data;
      if (apiRes.success) {
        return response.data;
      } else {
        alertMsg(apiRes.message, COMMON_ALERT_TYPE.Error as AlertType);
        throw new Error(response.data.message || 'Error');
      }
    })
    .catch((err) => {
      errMsg(err);
      reject(err);
    });
}

// PUT Request
export function putRequest<T>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  return axios
    .put<ApiResponse<T>>(`${url}`, data, config)
    .then((response: AxiosResponse) => {
      const apiRes: ApiResponse<T> = response.data;
      if (apiRes.success) {
        return response.data;
      } else {
        alertMsg(apiRes.message, COMMON_ALERT_TYPE.Error as AlertType);
        throw new Error(response.data.message || 'Error');
      }
    })
    .catch((err) => {
      errMsg(err);
      reject(err);
    });
}

// DELETE Request
export function deleteRequest<T>(url: string, data?: any): Promise<T> {
  return axios
    .delete<ApiResponse<T>>(`${url}`, data)
    .then((response: AxiosResponse) => {
      const apiRes: ApiResponse<T> = response.data;
      if (apiRes.success) {
        return response.data;
      } else {
        alertMsg(apiRes.message, COMMON_ALERT_TYPE.Error as AlertType);
        throw new Error(response.data.message || 'Error');
      }
    })
    .catch((err) => {
      errMsg(err);
      reject(err);
    });
}

// Handler api request and return data
export const apiRequest = (
  fecth: 'get' | 'post' | 'put' | 'delete',
  url: string,
  param?: string | Record<string, any> | undefined
) => {
  return new Promise((resolve, reject) => {
    switch (fecth) {
      case 'get':
        getRequest(url, param).then((response) => {
          resolve(response);
        });
        break;
      case 'post':
        postRequest(url, param).then((response) => {
          resolve(response);
        });
        break;
      case 'put':
        putRequest(url, param).then((response) => {
          resolve(response);
        });
        break;
      case 'delete':
        deleteRequest(url, param).then((response) => {
          resolve(response);
        });
        break;
      default:
        reject('unknown request');
        break;
    }
  });
};

// Error handler
function errMsg(err: { response: { status: any; data: ApiResponse<null> } }) {
  if (err && err.response) {
    switch (err.response.status) {
      case 400:
        alertMsg(
          err.response?.data?.message,
          COMMON_ALERT_TYPE.Error as AlertType
        );
        break;
      case 401:
        alertMsg(
          'Unauthorized, please log in',
          COMMON_ALERT_TYPE.Error as AlertType
        );
        break;
      case 403:
        alertMsg('Access denied', COMMON_ALERT_TYPE.Error as AlertType);
        break;
      case 404:
        alertMsg(
          'Request address not found',
          COMMON_ALERT_TYPE.Error as AlertType
        );
        break;
      case 408:
        alertMsg('Request timed out', COMMON_ALERT_TYPE.Error as AlertType);
        break;
      case 500:
        alertMsg('Internal server error', COMMON_ALERT_TYPE.Error as AlertType);
        break;
      case 501:
        alertMsg(
          'Service not implemented',
          COMMON_ALERT_TYPE.Error as AlertType
        );
        break;
      case 502:
        alertMsg('Gateway error', COMMON_ALERT_TYPE.Error as AlertType);
        break;
      case 503:
        alertMsg(
          'Service is not available',
          COMMON_ALERT_TYPE.Error as AlertType
        );
        break;
      case 504:
        alertMsg('Gateway timeout', COMMON_ALERT_TYPE.Error as AlertType);
        break;
      case 505:
        alertMsg(
          'HTTP version not supported',
          COMMON_ALERT_TYPE.Error as AlertType
        );
        break;
      default:
        alertMsg(
          'Network error please try again later',
          COMMON_ALERT_TYPE.Error as AlertType
        );
        break;
    }
    return;
  }
  alertMsg(
    'Network error please try again later',
    COMMON_ALERT_TYPE.Error as AlertType
  );
}
