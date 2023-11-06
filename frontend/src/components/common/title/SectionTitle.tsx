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

import { Icon } from '@cloudscape-design/components';
import { HelpPanelType } from 'context/reducer';
import React from 'react';
import { useTranslation } from 'react-i18next';
import ExtendIcon from '../ExtendIcon';
import InfoLink from '../InfoLink';

interface SectionTitleProps {
  helpInfoType?: HelpPanelType;
  type: 'event' | 'filter' | 'group';
  title?: string | null;
}
const SectionTitle: React.FC<SectionTitleProps> = (
  props: SectionTitleProps
) => {
  const { type, title } = props;
  const { t } = useTranslation();

  let displayTitle = '';
  if (type === 'event') {
    displayTitle = title ?? t('analytics:labels.defineMetrics');
  }
  if (type === 'filter') {
    displayTitle = t('analytics:labels.filters');
  }
  if (type === 'group') {
    displayTitle = t('analytics:labels.attributeGrouping');
  }

  const getIcon = () => {
    if (type === 'event') {
      return <Icon name="menu" />;
    }
    if (type === 'filter') {
      return <Icon name="filter" />;
    }
    if (type === 'group') {
      return <ExtendIcon icon="BsChecksGrid" color="#666" />;
    }
  };

  return (
    <div className="flex align-center gap-5">
      <div className={`cs-analytics-header ${type}`}>
        {getIcon()}
        <span>{displayTitle}</span>
      </div>
      <InfoLink
        onFollow={(e) => {
          console.info(e);
        }}
      />
    </div>
  );
};

export default SectionTitle;
