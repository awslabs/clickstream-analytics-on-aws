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
import ExtendIcon from 'components/common/ExtendIcon';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { ANALYTICS_NAV_STATUS } from 'ts/const';

interface INavigationProps {
  activeHref: string;
}

interface IAnalyticsItemType {
  text: string | null;
  href: string;
  icon?: any;
}

const AnalyticsNavigation: React.FC<INavigationProps> = (
  props: INavigationProps
) => {
  const { activeHref } = props;
  const { t } = useTranslation();
  const { projectId, appId } = useParams();
  const [isExpanded, setIsExpanded] = useState<boolean>(
    localStorage.getItem(ANALYTICS_NAV_STATUS) === 'close' ? false : true
  );

  const toggleNavigation = () => {
    localStorage.setItem(ANALYTICS_NAV_STATUS, isExpanded ? 'close' : 'open');
    setIsExpanded(!isExpanded);
  };

  const analyticsNavItems: IAnalyticsItemType[] = [
    {
      text: t('nav.analytics.dashboards'),
      icon: <ExtendIcon icon="BsKanban" />,
      href: `/analytics/${projectId}/app/${appId}/dashboards`,
    },
    {
      text: t('nav.analytics.explore'),
      icon: <ExtendIcon icon="BsFunnel" />,
      href: `/analytics/${projectId}/app/${appId}/explore`,
    },
    {
      text: t('nav.analytics.analyzes'),
      icon: <ExtendIcon icon="BsPencilSquare" />,
      href: `/analytics/${projectId}/app/${appId}/analyzes`,
    },
    {
      text: t('nav.analytics.data-management'),
      icon: <ExtendIcon icon="settings" />,
      href: `/analytics/${projectId}/app/${appId}/data-management`,
    },
  ];

  return (
    <div className={`sidebar ${isExpanded ? 'expanded' : ''}`}>
      <ul>
        {analyticsNavItems.map((item: IAnalyticsItemType) => (
          <li
            key={item.href}
            className={item.href === activeHref ? 'active' : ''}
            title={item.text ?? ''}
            aria-labelledby={item.text ?? ''}
          >
            <a href={item.href} aria-labelledby={item.text ?? ''}>
              <span className="icon" aria-labelledby={item.text ?? ''}>
                {item.icon}
              </span>
              {isExpanded && (
                <span className="text" aria-labelledby={item.text ?? ''}>
                  {item.text}
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
      <div className="expend-icon">
        <span
          className="icon-wrap"
          onClick={() => {
            toggleNavigation();
          }}
        >
          <Icon name={isExpanded ? 'angle-left' : 'angle-right'} />
        </span>
      </div>
    </div>
  );
};

export default AnalyticsNavigation;
