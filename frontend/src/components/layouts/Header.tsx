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

import { TopNavigation } from '@cloudscape-design/components';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface IHeaderProps {
  user: any;
  signOut: any;
}

const ZH_TEXT = '简体中文';
const EN_TEXT = 'English(US)';
const ZH_LANGUAGE_LIST = ['zh', 'zh-cn', 'zh_CN'];
const LANGUAGE_ITEMS = [
  { id: 'en', text: EN_TEXT },
  { id: 'zh', text: ZH_TEXT },
];

const Header: React.FC<IHeaderProps> = (props: IHeaderProps) => {
  const { t, i18n } = useTranslation();
  const { user, signOut } = props;
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };
  useEffect(() => {
    if (ZH_LANGUAGE_LIST.includes(i18n.language)) {
      changeLanguage('zh');
    }
  }, []);

  return (
    <header id="h">
      <TopNavigation
        identity={{
          href: '#',
          title: t('header.solution') || '',
        }}
        utilities={[
          {
            type: 'button',
            text: t('header.solutionLibrary') || '',
            href: 'https://example.com/',
            external: true,
          },
          {
            type: 'button',
            iconName: 'notification',
            title: t('header.notifications') || '',
            badge: true,
            disableUtilityCollapse: false,
          },
          {
            type: 'menu-dropdown',
            ariaLabel: 'settings',
            iconName: 'settings',
            title: t('header.settings') || '',
            items: [
              {
                id: 'settings-project',
                text: t('header.projectSettings') || '',
              },
              {
                id: 'settings',
                text: t('header.projectSettings') || '',
              },
            ],
          },
          {
            type: 'menu-dropdown',
            text: ZH_LANGUAGE_LIST.includes(i18n.language) ? ZH_TEXT : EN_TEXT,
            title: 'Language',
            ariaLabel: 'settings',
            onItemClick: (item) => {
              changeLanguage(item.detail.id);
            },
            items:
              i18n.language === 'zh'
                ? LANGUAGE_ITEMS.reverse()
                : LANGUAGE_ITEMS,
          },
          {
            type: 'menu-dropdown',
            text: user?.attributes?.email || '',
            description: user?.attributes?.email,
            iconName: 'user-profile',
            onItemClick: (item) => {
              if (item.detail.id === 'signout') {
                signOut && signOut();
              }
            },
            items: [
              { id: 'profile', text: t('header.profile') || '' },
              {
                id: 'support-group',
                text: t('header.support') || '',
                items: [
                  {
                    id: 'documentation',
                    text: t('header.doc') || '',
                    href: '#',
                    external: true,
                  },
                  { id: 'support', text: t('header.support') || '' },
                  {
                    id: 'feedback',
                    text: t('header.feedback') || '',
                    href: '#',
                    external: true,
                  },
                ],
              },
              { id: 'signout', text: t('header.signOut') || '' },
            ],
          },
        ]}
        i18nStrings={{
          searchIconAriaLabel: t('header.search') || '',
          searchDismissIconAriaLabel: t('header.closeSearch') || '',
          overflowMenuTriggerText: t('header.more') || '',
          overflowMenuTitleText: t('header.all') || '',
          overflowMenuBackIconAriaLabel: t('header.back') || '',
          overflowMenuDismissIconAriaLabel: t('header.closeMenu') || '',
        }}
      />
    </header>
  );
};

export default Header;
