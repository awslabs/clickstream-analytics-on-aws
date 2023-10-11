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


import { CdkCustomResourceEvent, CdkCustomResourceResponse, CloudFormationCustomResourceEvent, Context } from 'aws-lambda';
import { logger } from '../../../common/powertools';

export interface ServiceTokenType {
  readonly ServiceToken: string;
}

export interface GetResourcePrefixPropertiesType {
  readonly odsEventPrefix: string;
  readonly projectId: string;
}

type PropertiesType = ServiceTokenType & GetResourcePrefixPropertiesType;


export const handler = async (event: CloudFormationCustomResourceEvent, context: Context) => {
  logger.info('event', { event });
  logger.info('context', { context });

  const response: CdkCustomResourceResponse = {
    Data: {
      prefix: await _handler(event),
    },
    Status: 'SUCCESS',
  };
  logger.info('response', { response });
  return response;
};

async function _handler(event: CdkCustomResourceEvent) {
  const requestType = event.RequestType;
  logger.info('RequestType: ' + requestType);

  const odsEventPrefix = (event.ResourceProperties as PropertiesType).odsEventPrefix;

  let prefix = odsEventPrefix;
  const projectId = (event.ResourceProperties as PropertiesType).projectId;

  if (odsEventPrefix.endsWith('/ods_events/') || odsEventPrefix.endsWith('/ods_events')) {
    prefix = odsEventPrefix.replace(/ods_events\/?/, '');
  } else if (odsEventPrefix.endsWith(`clickstream/${projectId}/data/ods/`)) {
    // control plane set the prefix to clickstream/<projectId>/data/ods/
    // the actual prefix should be clickstream/<projectId>/data/ods/<projectId>/
    prefix = odsEventPrefix + projectId;
  }
  if (prefix.length > 0 && !prefix.endsWith('/')) {
    prefix += '/';
  }
  logger.info(`prefix: '${prefix}'`);
  return prefix;
}