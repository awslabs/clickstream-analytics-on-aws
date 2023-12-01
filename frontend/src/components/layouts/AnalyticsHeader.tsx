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
  Flashbar,
  FlashbarProps,
  Select,
  SelectProps,
  TopNavigation,
} from '@cloudscape-design/components';
import { getProjectList } from 'apis/project';
import { IProjectSelectItem } from 'components/eventselect/AnalyticsType';
import { DispatchContext } from 'context/StateContext';
import { StateActionType } from 'context/reducer';
import { useLocalStorage } from 'pages/common/use-local-storage';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import {
  ANALYTICS_INFO_KEY,
  DEFAULT_ZH_LANG,
  EN_TEXT,
  LANGUAGE_ITEMS,
  PROJECT_CONFIG_JSON,
  ZH_LANGUAGE_LIST,
  ZH_TEXT,
} from 'ts/const';
import { getDocumentLink } from 'ts/url';
import { defaultStr, getProjectAppFromOptions } from 'ts/utils';

interface IHeaderProps {
  user: any;
  signOut: any;
}

const AnalyticsHeader: React.FC<IHeaderProps> = (props: IHeaderProps) => {
  const { t, i18n } = useTranslation();
  const { user, signOut } = props;
  const { projectId, appId } = useParams();
  const dispatch = useContext(DispatchContext);
  const [displayName, setDisplayName] = useState('');
  const [fullLogoutUrl, setFullLogoutUrl] = useState('');
  const [allProjectOptions, setAllProjectOptions] =
    useState<SelectProps.Options>([]);
  const [selectedOption, setSelectedOption] = useState<any>(null);
  const [analyticsInfo, setAnalyticsInfo] = useLocalStorage(
    ANALYTICS_INFO_KEY,
    {
      projectId: '',
      projectName: '',
      appId: '',
      appName: '',
    }
  );
  const [items, setItems] = useState<FlashbarProps.MessageDefinition[]>([]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const getSelectLabel = (
    label: string,
    version: string | undefined,
    reportingEnabled: boolean
  ) => {
    if (!version || version === '' || version.startsWith('v1.0')) {
      return `${label} (${t('analytics:labels.pipelineVersionNotSupport')})`;
    } else if (!reportingEnabled) {
      return `${label} (${t('analytics:labels.reportingNotEnabled')})`;
    }
    return label;
  };

  const getSelectEnable = (version: string | undefined, enable: boolean) => {
    if (!version || version === '') {
      return false;
    }
    return !enable || version.startsWith('v1.0');
  };

  const setSelectOptionFromParams = (projectOptions: SelectProps.Options) => {
    if (projectId && appId) {
      const option = getProjectAppFromOptions(projectId, appId, projectOptions);
      if (!option) {
        setItems([
          {
            type: 'warning',
            content: `${t(
              'analytics:valid.errorProjectOrApp'
            )}${projectId} / ${appId}`,
            dismissible: true,
            onDismiss: () => setItems([]),
            id: 'message',
          },
        ]);
        setSelectedOption(null);
      } else if (option.disabled) {
        setItems([
          {
            type: 'warning',
            content: `${t(
              'analytics:valid.notSupportProjectOrApp'
            )}${projectId} / ${appId}`,
            dismissible: true,
            onDismiss: () => setItems([]),
            id: 'message',
          },
        ]);
        setSelectedOption(null);
      } else {
        setSelectedOption({
          label: `${option.projectName} / ${option.appName}`,
          value: `${option.projectId}_${option.appId}`,
        });
        if (
          analyticsInfo.projectId !== option.projectId ||
          analyticsInfo.appId !== option.appId
        ) {
          setAnalyticsInfo({
            projectId: defaultStr(option.projectId),
            projectName: defaultStr(option.projectName),
            appId: defaultStr(option.appId),
            appName: defaultStr(option.appName),
          });
        }
      }
    }
  };

  const listProjects = async () => {
    try {
      const { success, data }: ApiResponse<ResponseTableData<IProject>> =
        await getProjectList({
          pageNumber: 1,
          pageSize: 9999,
        });
      if (success) {
        const projectOptions: SelectProps.Options = data.items.map(
          (element) => ({
            label: getSelectLabel(
              element.name,
              element.pipelineVersion,
              element.reportingEnabled ?? false
            ),
            value: element.id,
            disabled: getSelectEnable(
              element.pipelineVersion,
              element.reportingEnabled ?? false
            ),
            options: element.applications?.map(
              (app) =>
                ({
                  label: app.name,
                  value: `${element.id}-${app.appId}`,
                  projectId: element.id,
                  projectName: element.name,
                  appId: app.appId,
                  appName: app.name,
                } as IProjectSelectItem)
            ),
          })
        );
        dispatch?.({
          type: StateActionType.SET_PROJECT_OPTIONS,
          payload: projectOptions,
        });
        setAllProjectOptions(projectOptions);
        setSelectOptionFromParams(projectOptions);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    setDisplayName(
      user?.profile?.email ||
        user?.profile?.name ||
        user?.profile?.preferred_username ||
        user?.profile?.nickname ||
        user?.profile?.sub ||
        ''
    );
    listProjects();
  }, [user]);

  useEffect(() => {
    if (ZH_LANGUAGE_LIST.includes(i18n.language)) {
      changeLanguage(DEFAULT_ZH_LANG);
    }
    const configJSONObj: ConfigType = localStorage.getItem(PROJECT_CONFIG_JSON)
      ? JSON.parse(localStorage.getItem(PROJECT_CONFIG_JSON) ?? '')
      : {};
    if (configJSONObj.oidc_logout_url) {
      const redirectUrl = configJSONObj.oidc_redirect_url.replace(
        '/signin',
        ''
      );
      const queryParams = new URLSearchParams({
        client_id: configJSONObj.oidc_client_id,
        id_token_hint: user.id_token,
        logout_uri: redirectUrl,
        redirect_uri: redirectUrl,
        post_logout_redirect_uri: redirectUrl,
      });
      const logoutUrl = new URL(configJSONObj.oidc_logout_url);
      logoutUrl.search = queryParams.toString();
      setFullLogoutUrl(decodeURIComponent(logoutUrl.toString()));
    }
  }, []);

  return (
    <header id="h">
      <TopNavigation
        identity={{
          href: '/analytics',
          title: defaultStr(t('header.analyticsStudio')),
        }}
        search={
          <Select
            selectedOption={selectedOption}
            onChange={({ detail }) => {
              const option = detail.selectedOption as IProjectSelectItem;
              setSelectedOption({
                label: `${option.projectName} / ${option.appName}`,
                value: `${option.projectId}-${option.appId}`,
              });
              setAnalyticsInfo({
                projectId: defaultStr(option.projectId),
                projectName: defaultStr(option.projectName),
                appId: defaultStr(option.appId),
                appName: defaultStr(option.appName),
              });
              window.location.href = `/analytics/${option.projectId}/app/${option.appId}/dashboards`;
            }}
            options={allProjectOptions}
          />
        }
        utilities={[
          {
            type: 'button',
            text: defaultStr(t('header.analyticsDocumentation')),
            href: getDocumentLink(i18n.language),
            external: true,
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
              i18n.language === DEFAULT_ZH_LANG
                ? [...LANGUAGE_ITEMS].reverse()
                : LANGUAGE_ITEMS,
          },
          {
            type: 'menu-dropdown',
            text: displayName,
            description: displayName,
            iconName: 'user-profile',
            onItemClick: (item) => {
              if (item.detail.id === 'signout') {
                if (fullLogoutUrl) {
                  signOut?.();
                  window.location.href = fullLogoutUrl;
                }
                signOut?.();
              }
            },
            items: [{ id: 'signout', text: defaultStr(t('header.signOut')) }],
          },
        ]}
        i18nStrings={{
          searchIconAriaLabel: defaultStr(t('header.search')),
          searchDismissIconAriaLabel: defaultStr(t('header.closeSearch')),
          overflowMenuTriggerText: defaultStr(t('header.more')),
          overflowMenuTitleText: defaultStr(t('header.all')),
          overflowMenuBackIconAriaLabel: defaultStr(t('header.back')),
          overflowMenuDismissIconAriaLabel: defaultStr(t('header.close??Menu')),
        }}
      />
      <div className="flex center">
        <Flashbar items={items} />
      </div>
    </header>
  );
};

export default AnalyticsHeader;
