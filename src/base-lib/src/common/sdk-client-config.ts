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

import { UserAgent } from '@aws-sdk/types';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { HttpsProxyAgent } from 'hpagent';

const userAgent: UserAgent = [[<string>process.env.USER_AGENT_STRING ?? '']];
const httpProxy = process.env.http_proxy || process.env.HTTP_PROXY || '';
const httpsProxy = process.env.https_proxy || process.env.HTTPS_PROXY || '';

export const httpAgent = httpProxy ? new HttpsProxyAgent({ proxy: httpProxy }) : undefined;
export const httpsAgent = httpsProxy ? new HttpsProxyAgent({ proxy: httpsProxy }) : undefined;

export const aws_sdk_client_common_config = {
  maxAttempts: 3,
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 5000,
    requestTimeout: 5000,
    httpAgent: httpAgent,
    httpsAgent: httpsAgent,
  }),
  customUserAgent: userAgent,
};

export const marshallOptions = {
  convertEmptyValues: false,
  removeUndefinedValues: true,
  convertClassInstanceToMap: true,
  convertTopLevelContainer: true,
};

export const unmarshallOptions = {
  wrapNumbers: false,
};