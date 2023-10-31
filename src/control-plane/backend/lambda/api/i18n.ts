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

import { join } from 'path';
import i18next from 'i18next';
import fsBackend from 'i18next-fs-backend';
import { logger } from './common/powertools';

i18next
  .use(fsBackend)
  .init({
    lng: 'en-US',
    fallbackLng: 'en-US',
    backend: {
      loadPath: join(__dirname, './locales/{{lng}}.json'),
    },
  }).catch(err => {
    logger.error(`i18next init failed with error: ${err}`);
  });

export default i18next;