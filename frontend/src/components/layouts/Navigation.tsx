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
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { getDoucmentList } from 'ts/url';

interface INavigationProps {
  activeHref: string;
}

const Navigation: React.FC<INavigationProps> = (props: INavigationProps) => {
  const { activeHref } = props;
  const { t, i18n } = useTranslation();
  const { projectId, appId } = useParams();
  const navHeader = { text: t('name'), href: '/' };
  const navItems: SideNavigationProps.Item[] = [
    { type: 'link', text: t('nav.home'), href: '/' },
    { type: 'link', text: t('nav.projects'), href: '/projects' },
    {
      text: t('nav.operation'),
      type: 'section',
      defaultExpanded: true,
      items: [{ type: 'link', text: t('nav.monitorAlerts'), href: '/alarms' },
      { type: 'link', text: t('nav.user'), href: '/user' }],
    },
    {
      text: t('nav.tools'),
      type: 'section',
      defaultExpanded: true,
      items: [{ type: 'link', text: t('nav.plugins'), href: '/plugins' }],
    },
    { type: 'divider' },
    {
      type: 'link',
      text: t('nav.explore'),
      href: '/analytics',
      external: true,
    },
    { type: 'divider' },
    {
      type: 'link',
      text: t('nav.doc'),
      href: getDoucmentList(i18n.language),
      external: true,
    },
  ];
  const navAnalyticsItems: SideNavigationProps.Item[] = [
    // {
    //   type: 'link',
    //   text: t('nav.analytics.realtime'),
    //   href: `/analytics/${projectId}/app/${appId}/realtime`,
    // },
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
        // {
        //   type: 'link',
        //   text: t('nav.analytics.exploreRetention'),
        //   href: `/analytics/${projectId}/app/${appId}/retention`,
        // },
        {
          type: 'link',
          text: t('nav.analytics.exploreFunnel'),
          href: `/analytics/${projectId}/app/${appId}/funnel`,
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
  return (
    <>
      <SideNavigation
        header={navHeader}
        items={
          activeHref.startsWith('/analytics') ? navAnalyticsItems : navItems
        }
        activeHref={activeHref}
        onFollow={(e) => {
          console.info(e);
        }}
      />
    </>
  );
};

export default Navigation;
