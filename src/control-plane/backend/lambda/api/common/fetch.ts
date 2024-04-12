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

import fetch from 'node-fetch';
import { logger } from './powertools';
import { httpsAgent } from './sdk-client-config-ln';
import { sleep } from './utils-ln';

const retryDelay = 2000; // Delay between retries in milliseconds

/**
 * Fetch the given remote url
 * @param url the remote url to be fetched
 * @param options the options to override the options of fetch
 * @param retries the retries count, the default is 3
 * @returns
 */
export const fetchRemoteUrl = async (url: string, options = {}, retries = 3): Promise<any> => {
  try {
    const response = await fetch(url, {
      agent: httpsAgent,
      timeout: 7000,
      ...options,
    });
    return response;
  } catch (err) {
    if (retries > 0) {
      logger.warn(`Error fetching template from ${url}. Retrying in ${retryDelay} ms...`, { err });
      await sleep(retryDelay);
      return fetchRemoteUrl(url, options, retries - 1);
    }
    throw err;
  }
};