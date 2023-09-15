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
      href: `/analytics/${projectId}/app/${appId}/dashboards`,
    },
    {
      text: t('nav.analytics.exploreEvent'),
      href: `/analytics/${projectId}/app/${appId}/event`,
    },
    {
      text: t('nav.analytics.exploreRetention'),
      href: `/analytics/${projectId}/app/${appId}/retention`,
    },
    {
      text: t('nav.analytics.exploreFunnel'),
      href: `/analytics/${projectId}/app/${appId}/funnel`,
    },
    {
      text: t('nav.analytics.explorePath'),
      href: `/analytics/${projectId}/app/${appId}/path`,
    },

    {
      text: t('nav.analytics.metadata-events'),
      href: `/analytics/${projectId}/app/${appId}/metadata/events`,
    },
    {
      text: t('nav.analytics.metadata-event-parameters'),
      href: `/analytics/${projectId}/app/${appId}/metadata/event-parameters`,
    },
    {
      text: t('nav.analytics.metadata-user-attributes'),
      href: `/analytics/${projectId}/app/${appId}/metadata/user-attributes`,
    },
  ];

  return (
    <div className={`sidebar ${isExpanded ? 'expanded' : ''}`}>
      <ul>
        {analyticsNavItems.map((item: IAnalyticsItemType) => (
          <li
            key={item.href}
            className={item.href === activeHref ? 'active' : ''}
          >
            <a href={item.href}>
              <span className="icon">
                <Icon name="settings" variant="inverted" />
              </span>
              {isExpanded && <span className="text">{item.text}</span>}
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
