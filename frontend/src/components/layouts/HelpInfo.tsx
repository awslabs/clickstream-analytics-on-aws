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

import { HelpPanel } from '@cloudscape-design/components';
import { StateContext } from 'context/StateContext';
import { HelpPanelType } from 'context/reducer';
import React, { ReactElement, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { defaultStr } from 'ts/utils';
import { ExternalLinkGroup } from '../common/ExternalLinkGroup';

interface LinkItemType {
  href: string;
  text: string;
}

interface HelpInfoProps {
  title: string | null;
  description: ReactElement | string | null;
  linkItems: LinkItemType[];
}

const HelpInfo: React.FC = () => {
  const { t } = useTranslation();
  const state = useContext(StateContext);

  const dataItem: HelpInfoProps = {
    title: '',
    description: '',
    linkItems: [],
  };

  if (state?.helpPanelType === HelpPanelType.ANALYTICS_DASHBOARD) {
    dataItem.title = t('help:dashboardsInfo.title');
    dataItem.description = <p>{t('help:dashboardsInfo.description')}</p>;
    dataItem.linkItems = [
      {
        text: t('help:dashboardsInfo.links.docLinkName'),
        href: t('help:dashboardsInfo.links.docLink'),
      },
    ];
  }

  if (state?.helpPanelType === HelpPanelType.USER_LIFECYCLE_INFO) {
    dataItem.title = t('help:userLifecycleInfo.title');
    dataItem.description = <p>{t('help:userLifecycleInfo.description')}</p>;
    dataItem.linkItems = [
      {
        text: t('help:userLifecycleInfo.links.docLinkName'),
        href: t('help:userLifecycleInfo.links.docLink'),
      },
    ];
  }

  return (
    <HelpPanel
      header={<h2>{dataItem.title}</h2>}
      footer={
        <ExternalLinkGroup
          header={defaultStr(t('learnMore'))}
          items={dataItem.linkItems}
        />
      }
    >
      {dataItem.description}
    </HelpPanel>
  );
};

export default HelpInfo;
