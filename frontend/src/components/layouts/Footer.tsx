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

import { Link } from '@cloudscape-design/components';
import { AppContext } from 'context/AppContext';
import { SystemInfoContext } from 'context/SystemInfoContext';
import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { buildCloudFormationStackLink } from 'ts/url';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  const appConfig = useContext(AppContext);
  const systemInfo = useContext(SystemInfoContext);

  const versionLinkRender = () => {
    if (!appConfig?.solution_version) {
      return null;
    }
    if (appConfig?.solution_region && systemInfo?.stackId) {
      return (
        <span className="version">
          {t('version')}:{' '}
          <Link
            href={buildCloudFormationStackLink(
              appConfig?.solution_region,
              systemInfo?.stackId
            )}
            external
          >
            {appConfig.solution_version}
          </Link>
        </span>
      );
    } else {
      return (
        <span className="version">
          {t('version')}: {appConfig.solution_version}
        </span>
      );
    }
  };

  return (
    <footer id="f" className="flex">
      <ul>
        <li>
          © {new Date().getFullYear()}, {t('footer.copyRight')}
        </li>
      </ul>
      {versionLinkRender()}
    </footer>
  );
};

export default Footer;
