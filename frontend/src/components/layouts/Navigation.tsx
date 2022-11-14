import { Badge, SideNavigation } from '@cloudscape-design/components';
import React from 'react';

interface NavigationProps {
  activeHref: string;
}

const Navigation: React.FC<NavigationProps> = (props: NavigationProps) => {
  const { activeHref } = props;
  const navHeader = { text: 'Clickstream Analytics on AWS', href: '#/' };
  const navItems: any = [
    { type: 'link', text: 'Home', href: '/' },
    { type: 'link', text: 'Projects', href: '/projects' },
    { type: 'link', text: 'Pipelines', href: '#/pipelines' },
    { type: 'link', text: 'Analytics', href: '#/analytics' },
    {
      text: 'Pipeline modules',
      type: 'section',
      defaultExpanded: true,
      items: [
        { type: 'link', text: 'Ingestions', href: '#/ingestions' },
        { type: 'link', text: 'Streaming', href: '#/streaming' },
        { type: 'link', text: 'Enrichment', href: '#/enrichment' },
        { type: 'link', text: 'Reporting', href: '#/reporting' },
      ],
    },
    {
      text: 'Operation',
      type: 'section',
      defaultExpanded: true,
      items: [
        { type: 'link', text: 'Dashboard', href: '#/dashboard' },
        { type: 'link', text: 'Monitors & Alerts', href: '#/monitors' },
      ],
    },
    {
      text: 'Tools',
      type: 'section',
      defaultExpanded: true,
      items: [
        { type: 'link', text: 'Simulation testing', href: '#/simulation' },
        { type: 'link', text: 'SKD integration', href: '#/skd' },
      ],
    },
    { type: 'divider' },
    {
      type: 'link',
      text: 'Notifications',
      href: '#/notifications',
      info: <Badge color="red">23</Badge>,
    },
    {
      type: 'link',
      text: 'Documentation',
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
