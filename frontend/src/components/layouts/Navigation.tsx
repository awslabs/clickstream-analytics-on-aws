import {
  Badge,
  SideNavigation,
  SideNavigationProps,
} from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface INavigationProps {
  activeHref: string;
}

const Navigation: React.FC<INavigationProps> = (props: INavigationProps) => {
  const { activeHref } = props;
  const { t } = useTranslation();
  const navHeader = { text: t('name'), href: '#/' };
  const navItems: SideNavigationProps.Item[] = [
    { type: 'link', text: t('nav.home'), href: '/' },
    { type: 'link', text: t('nav.projects'), href: '/projects' },
    { type: 'link', text: t('nav.pipelines'), href: '/pipelines' },
    { type: 'link', text: t('nav.analytics'), href: '#/analytics' },
    {
      text: t('nav.pipelineModules'),
      type: 'section',
      defaultExpanded: true,
      items: [
        { type: 'link', text: t('nav.ingestions'), href: '#/ingestions' },
        { type: 'link', text: t('nav.streaming'), href: '#/streaming' },
        { type: 'link', text: t('nav.enrichment'), href: '#/enrichment' },
        { type: 'link', text: t('nav.reporting'), href: '#/reporting' },
      ],
    },
    {
      text: t('nav.operation'),
      type: 'section',
      defaultExpanded: true,
      items: [
        { type: 'link', text: t('nav.dashboard'), href: '#/dashboard' },
        { type: 'link', text: t('nav.monitorAlerts'), href: '#/monitors' },
      ],
    },
    {
      text: t('nav.tools'),
      type: 'section',
      defaultExpanded: true,
      items: [
        { type: 'link', text: t('nav.simuTest'), href: '#/simulation' },
        { type: 'link', text: t('nav.sdkIntegration'), href: '#/skd' },
      ],
    },
    { type: 'divider' },
    {
      type: 'link',
      text: t('nav.notifications'),
      href: '#/notifications',
      info: <Badge color="red">23</Badge>,
    },
    {
      type: 'link',
      text: t('nav.doc'),
      href: 'https://example.com',
      external: true,
    },
  ];
  return (
    <>
      <SideNavigation
        header={navHeader}
        items={navItems}
        activeHref={activeHref}
        onFollow={(e) => {
          console.info(e);
        }}
      />
    </>
  );
};

export default Navigation;
