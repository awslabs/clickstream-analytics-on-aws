import { TopNavigation } from '@cloudscape-design/components';
import React from 'react';

interface HeaderProps {
  user: any;
  signOut: any;
}

const Header: React.FC<HeaderProps> = (props: HeaderProps) => {
  const { user, signOut } = props;
  console.info('user:', user);
  return (
    <header id="h">
      <TopNavigation
        identity={{
          href: '#',
          title: 'AWS Solutions',
        }}
        utilities={[
          {
            type: 'button',
            text: 'Solution Library',
            href: 'https://example.com/',
            external: true,
            externalIconAriaLabel: ' (opens in a new tab)',
          },
          {
            type: 'button',
            iconName: 'notification',
            title: 'Notifications',
            ariaLabel: 'Notifications (unread)',
            badge: true,
            disableUtilityCollapse: false,
          },
          {
            type: 'menu-dropdown',
            iconName: 'settings',
            ariaLabel: 'Settings',
            title: 'Settings',
            items: [
              {
                id: 'settings-org',
                text: 'Organizational settings',
              },
              {
                id: 'settings-project',
                text: 'Project settings',
              },
            ],
          },
          {
            type: 'menu-dropdown',
            text: user?.attributes?.email || '',
            description: user?.attributes?.email,
            iconName: 'user-profile',
            onItemClick: (item) => {
              console.info('item:', item);
              if (item.detail.id === 'signout') {
                signOut && signOut();
              }
            },
            items: [
              { id: 'profile', text: 'Profile' },
              { id: 'preferences', text: 'Preferences' },
              {
                id: 'support-group',
                text: 'Support',
                items: [
                  {
                    id: 'documentation',
                    text: 'Documentation',
                    href: '#',
                    external: true,
                    externalIconAriaLabel: ' (opens in new tab)',
                  },
                  { id: 'support', text: 'Support' },
                  {
                    id: 'feedback',
                    text: 'Feedback',
                    href: '#',
                    external: true,
                    externalIconAriaLabel: ' (opens in new tab)',
                  },
                ],
              },
              { id: 'signout', text: 'Sign out' },
            ],
          },
        ]}
        i18nStrings={{
          searchIconAriaLabel: 'Search',
          searchDismissIconAriaLabel: 'Close search',
          overflowMenuTriggerText: 'More',
          overflowMenuTitleText: 'All',
          overflowMenuBackIconAriaLabel: 'Back',
          overflowMenuDismissIconAriaLabel: 'Close menu',
        }}
      />
    </header>
  );
};

export default Header;
