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
import { UserContext } from 'context/UserContext';
import React, { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ANALYTICS_NAV_ITEM, ANALYTICS_NAV_STATUS } from 'ts/const';
import {
  defaultStr,
  getUserInfoFromLocalStorage,
  isAnalystAuthorRole,
} from 'ts/utils';

interface INavigationProps {
  activeHref: string;
}

interface IAnalyticsItemType {
  text: string | null;
  href: string;
  value: string;
  icon?: any;
}

const AnalyticsNavigation: React.FC<INavigationProps> = (
  props: INavigationProps
) => {
  const { activeHref } = props;
  const { t } = useTranslation();
  const currentUser = useContext(UserContext) ?? getUserInfoFromLocalStorage();
  const { projectId, appId } = useParams();
  const [isExpanded, setIsExpanded] = useState<boolean>(
    localStorage.getItem(ANALYTICS_NAV_STATUS) === 'close' ? false : true
  );
  const toggleNavigation = () => {
    localStorage.setItem(ANALYTICS_NAV_STATUS, isExpanded ? 'close' : 'open');
    setIsExpanded(!isExpanded);
  };
  const onChangeNavItem = (item: string) => {
    localStorage.setItem(ANALYTICS_NAV_ITEM, item);
  };

  const analyticsNavItems: IAnalyticsItemType[] = [
    {
      text: t('nav.analytics.dashboards'),
      icon: <ExtendIcon icon="BsKanban" />,
      href: `/analytics/${projectId}/app/${appId}/dashboards`,
      value: 'dashboards',
    },
    {
      text: t('nav.analytics.explore'),
      icon: <ExtendIcon icon="BsFunnel" />,
      href: `/analytics/${projectId}/app/${appId}/explore`,
      value: 'explore',
    },
    {
      text: t('nav.analytics.analyzes'),
      icon: <ExtendIcon icon="BsPencilSquare" />,
      href: `/analytics/${projectId}/app/${appId}/analyzes`,
      value: 'analyzes',
    },
    {
      text: t('nav.analytics.segments'),
      icon: <ExtendIcon icon="UnchecksGrid" />,
      href: `/analytics/${projectId}/app/${appId}/segments`,
      value: 'segments',
    },
    {
      text: t('nav.analytics.data-management'),
      icon: <ExtendIcon icon="BsTagsFill" />,
      href: `/analytics/${projectId}/app/${appId}/data-management`,
      value: 'data-management',
    },
  ];

  const getNavItems = () => {
    if (!isAnalystAuthorRole(currentUser?.roles)) {
      return [...analyticsNavItems.slice(0, 2), ...analyticsNavItems.slice(3)];
    }
    return analyticsNavItems;
  };

  return (
    <div className={`sidebar ${isExpanded ? 'expanded' : ''}`}>
      <ul>
        {getNavItems().map((item: IAnalyticsItemType) => (
          <li
            key={item.href}
            className={item.href === activeHref ? 'active' : ''}
            title={defaultStr(item.text)}
            aria-labelledby={defaultStr(item.text)}
          >
            <Link
              to={item.href}
              aria-labelledby={defaultStr(item.text)}
              onClick={() => {
                onChangeNavItem(item.value);
              }}
            >
              <span className="icon" aria-labelledby={defaultStr(item.text)}>
                {item.icon}
              </span>
              {isExpanded && (
                <span className="text" aria-labelledby={defaultStr(item.text)}>
                  {item.text}
                </span>
              )}
            </Link>
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
