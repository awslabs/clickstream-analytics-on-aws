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
import { buildDocumentLink } from 'ts/url';
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
  const { t, i18n } = useTranslation();
  const state = useContext(StateContext);

  const helpPanelMappings: any = {
    [HelpPanelType.ANALYTICS_DASHBOARD]: 'dashboardsInfo',
    [HelpPanelType.USER_LIFECYCLE_INFO]: 'userLifecycleInfo',
    [HelpPanelType.ANALYTICS_EXPLORE]: 'exploreInfo',
    [HelpPanelType.EXPLORE_EVENT_INFO]: 'eventInfo',
    [HelpPanelType.EXPLORE_FUNNEL_INFO]: 'funnelInfo',
    [HelpPanelType.EXPLORE_PATH_INFO]: 'pathInfo',
    [HelpPanelType.EXPLORE_RETENTION_INFO]: 'retentionInfo',
    [HelpPanelType.EXPLORE_ATTRIBUTION_INFO]: 'attributionInfo',
    [HelpPanelType.EXPLORE_ATTRIBUTION_MODEL_INFO]: 'attributionModelInfo',
    [HelpPanelType.ANALYTICS_ANALYZES]: 'analyzesInfo',
    [HelpPanelType.ANALYTICS_METADATA]: 'metadataInfo',
    [HelpPanelType.METADATA_EVENT_INFO]: 'metadataEventInfo',
    [HelpPanelType.METADATA_EVENT_PARAM_INFO]: 'metadataEventParamInfo',
    [HelpPanelType.METADATA_USER_PARAM_INFO]: 'metadataUserParamInfo',
  };

  const getDescription = (currentHelpPanelKey: string) => {
    if (currentHelpPanelKey === 'attributionModelInfo') {
      return (
        <p>
          {t('help:attributionModelInfo.description')}
          <br />
          <ul>
            <li>
              <b>{t('help:attributionModelInfo.firstTouch.title')}</b>
              {t('help:attributionModelInfo.firstTouch.description')}
            </li>
            <li>
              <b>{t('help:attributionModelInfo.lastTouch.title')}</b>
              {t('help:attributionModelInfo.lastTouch.description')}
            </li>
            <li>
              <b>{t('help:attributionModelInfo.linearTouch.title')}</b>
              {t('help:attributionModelInfo.linearTouch.description')}
            </li>
            <li>
              <b>{t('help:attributionModelInfo.positionBasedTouch.title')}</b>
              {t('help:attributionModelInfo.positionBasedTouch.description')}
            </li>
          </ul>
        </p>
      );
    }
    return <p>{t(`help:${currentHelpPanelKey}.description`)}</p>;
  };

  const dataItem: HelpInfoProps = {
    title: '',
    description: '',
    linkItems: [],
  };

  const currentHelpPanelKey = helpPanelMappings[state?.helpPanelType ?? ''];

  if (currentHelpPanelKey) {
    dataItem.title = t(`help:${currentHelpPanelKey}.title`);
    dataItem.description = getDescription(currentHelpPanelKey);
    dataItem.linkItems = [
      {
        text: t(`help:${currentHelpPanelKey}.links.docLinkName`),
        href: buildDocumentLink(
          i18n.language,
          defaultStr(t(`help:${currentHelpPanelKey}.links.docLink`)),
          defaultStr(t(`help:${currentHelpPanelKey}.links.docLink`))
        ),
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
