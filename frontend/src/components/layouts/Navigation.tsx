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

import {
  SideNavigation,
  SideNavigationProps,
} from '@cloudscape-design/components';
import { UserContext } from 'context/UserContext';
import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { IUserRole } from 'ts/const';
import { getDocumentList } from 'ts/url';

interface INavigationProps {
  activeHref: string;
}

const Navigation: React.FC<INavigationProps> = (props: INavigationProps) => {
  const { activeHref } = props;
  const { t, i18n } = useTranslation();
  const { projectId, appId } = useParams();
  const currentUser = useContext(UserContext);

  const navHeader = {
    text: t('name'),
    href: currentUser?.role === IUserRole.ANALYST ? '/analytics' : '/',
  };
  const pipelineNavItems: SideNavigationProps.Item[] = [
    { type: 'link', text: t('nav.home'), href: '/' },
    { type: 'link', text: t('nav.projects'), href: '/projects' },
    {
      text: t('nav.operation'),
      type: 'section',
      defaultExpanded: true,
      items: [{ type: 'link', text: t('nav.monitorAlerts'), href: '/alarms' }],
    },
    {
      text: t('nav.tools'),
      type: 'section',
      defaultExpanded: true,
      items: [{ type: 'link', text: t('nav.plugins'), href: '/plugins' }],
    },
  ];
  const systemNavItems: SideNavigationProps.Item[] = [
    {
      text: t('nav.system'),
      type: 'section',
      defaultExpanded: true,
      items: [{ type: 'link', text: t('nav.user'), href: '/user' }],
    },
  ];
  const exploreNavItems: SideNavigationProps.Item[] = [
    { type: 'divider' },
    {
      type: 'link',
      text: t('nav.explore'),
      href: '/analytics',
      external: true,
    },
  ];
  const docNavItems: SideNavigationProps.Item[] = [
    { type: 'divider' },
    {
      type: 'link',
      text: t('nav.doc'),
      href: getDocumentList(i18n.language),
      external: true,
    },
  ];
  const analyticsNavItems: SideNavigationProps.Item[] = [
    {
      type: 'link',
      text: t('nav.analytics.dashboards'),
      href: `/analytics/${projectId}/app/${appId}/dashboards`,
    },
    {
      text: t('nav.analytics.explore'),
      type: 'section',
      defaultExpanded: true,
      items: [
        {
          type: 'link',
          text: t('nav.analytics.exploreEvent'),
          href: `/analytics/${projectId}/app/${appId}/event`,
        },
        {
          type: 'link',
          text: t('nav.analytics.exploreRetention'),
          href: `/analytics/${projectId}/app/${appId}/retention`,
        },
        {
          type: 'link',
          text: t('nav.analytics.exploreFunnel'),
          href: `/analytics/${projectId}/app/${appId}/funnel`,
        },
        {
          type: 'link',
          text: t('nav.analytics.explorePath'),
          href: `/analytics/${projectId}/app/${appId}/path`,
        },
      ],
    },
    {
      text: t('nav.analytics.metadata'),
      type: 'section',
      defaultExpanded: true,
      items: [
        {
          type: 'link',
          text: t('nav.analytics.metadata-events'),
          href: `/analytics/${projectId}/app/${appId}/metadata/events`,
        },
        {
          type: 'link',
          text: t('nav.analytics.metadata-event-parameters'),
          href: `/analytics/${projectId}/app/${appId}/metadata/event-parameters`,
        },
        {
          type: 'link',
          text: t('nav.analytics.metadata-user-attributes'),
          href: `/analytics/${projectId}/app/${appId}/metadata/user-attributes`,
        },
      ],
    },
  ];

  const getNavItems = () => {
    if (activeHref.startsWith('/analytics')) {
      return analyticsNavItems;
    } else if (currentUser?.role === IUserRole.ADMIN) {
      return [
        ...pipelineNavItems,
        ...systemNavItems,
        ...exploreNavItems,
        ...docNavItems,
      ];
    } else if (currentUser?.role === IUserRole.ANALYST) {
      return [...pipelineNavItems, ...exploreNavItems, ...docNavItems];
    } else {
      return [...pipelineNavItems, ...docNavItems];
    }
  };

  return (
    <>
      <SideNavigation
        header={navHeader}
        items={getNavItems()}
        activeHref={activeHref}
        onFollow={(e) => {
          console.info(e);
        }}
      />
    </>
  );
};

export default Navigation;
