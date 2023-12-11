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
import axios from 'axios';
import { Message, Loading } from 'element-ui';
import { ClickstreamAnalytics } from '@aws/clickstream-web';

const ConfigBaseURL = process.env.VUE_APP_SERVER_API; //Default backend API address

let loadingInstance = null; // loading
//Create an axios instance using the create method
export const Service = axios.create({
  timeout: 7000, // Request timeout
  baseURL: ConfigBaseURL,
  headers: {
    'Content-Type': 'application/json;charset=UTF-8',
  },
});
// Add request interceptor
Service.interceptors.request.use((config) => {
  // Record the information sent to the request
  ClickstreamAnalytics.record({
    name: 'http_request',
    attributes: {
      request_url: config.url,
      request_config: JSON.stringify(config),
    },
  });
  console.info('request config:', config);
  loadingInstance = Loading.service({
    lock: true,
    text: 'loading...',
  });
  return config;
});

// Add response interceptor
Service.interceptors.response.use(
  (response) => {
    // Record request response information
    ClickstreamAnalytics.record({
      name: 'http_request',
      attributes: {
        response_url: response.request.request_url,
        response_config: JSON.stringify(response),
      },
    });
    loadingInstance.close();
    return response.data;
  },
  (error) => {
    const msg = error.message !== undefined ? error.message : '';
    Message({
      message: 'Network Error' + msg,
      type: 'error',
      duration: 3 * 1000,
    });
    // Add Clickstream SDK
    ClickstreamAnalytics.record({
      name: 'http_error',
      attributes: {
        error_message: msg,
        error_code: error.request.status,
        request_url: error.request.responseURL,
      },
    });
    loadingInstance.close();
    return Promise.reject(error);
  }
);
