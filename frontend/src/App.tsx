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

import { Button } from '@cloudscape-design/components';
import AppRouter from 'AppRouter';
import { getUserDetails } from 'apis/user';
import Axios from 'axios';
import Loading from 'components/common/Loading';
import { AppContext } from 'context/AppContext';
import { GlobalProvider } from 'context/StateContext';
import { UserContext } from 'context/UserContext';
import { WebStorageStateStore } from 'oidc-client-ts';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthProvider, AuthProviderProps, useAuth } from 'react-oidc-context';
import { CONFIG_URL, PROJECT_CONFIG_JSON } from 'ts/const';
import { defaultStr } from 'ts/utils';

const SignedInPage: React.FC = () => {
  const auth = useAuth();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<IUser>();

  useEffect(() => {
    console.info('BBBBBBBBBBBBBBBBBB');
    console.info('auth.events:', auth.events);
    // the `return` is important - addAccessTokenExpiring() returns a cleanup function
    return auth?.events?.addAccessTokenExpiring((event) => {
      auth.signinSilent();
    });
  }, [auth.events, auth.signinSilent]);

  const getCurrentUser = async () => {
    if (!auth.user?.profile.email) {
      return;
    }
    try {
      const { success, data }: ApiResponse<IUser> = await getUserDetails(
        auth.user?.profile.email
      );
      if (success) {
        setCurrentUser(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    (async () => {
      await getCurrentUser();
    })();
  }, []);

  useEffect(() => {
    console.info('authauth:', auth);
    console.info('AAAAAAAAAAAAAAA');
    if (auth.activeNavigator === 'signinSilent') {
      console.info('refresh');
      // return;
    }
    // (async () => {
    //   await getCurrentUser();
    // })();
  }, [auth]);

  if (auth.isLoading || (auth.isAuthenticated && !currentUser)) {
    return <Loading isPage />;
  }

  if (auth.error) {
    return (
      <div className="text-center pd-20">
        {t('oops')} {auth.error.message}
      </div>
    );
  }

  if (auth.isAuthenticated) {
    return (
      <UserContext.Provider value={currentUser}>
        <AppRouter auth={auth} />
      </UserContext.Provider>
    );
  }

  return (
    <div className="oidc-login">
      <div>
        <div className="title">{t('welcome')}</div>
      </div>
      {
        <div>
          <Button
            variant="primary"
            onClick={() => {
              auth.signinRedirect();
            }}
          >
            {t('button.signIn')}
          </Button>
        </div>
      }
    </div>
  );
};

const App: React.FC = () => {
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [oidcConfig, setOidcConfig] = useState<AuthProviderProps>();
  const [contextData, setContextData] = useState<ConfigType>();

  const initAuthentication = (configData: ConfigType) => {
    const settings = {
      userStore: new WebStorageStateStore({ store: window.localStorage }),
      authority: configData.oidc_provider,
      scope: 'openid email profile',
      automaticSilentRenew: true,
      client_id: configData.oidc_client_id,
      redirect_uri: configData.oidc_redirect_url,
    };
    setOidcConfig(settings);
  };

  const getConfig = async () => {
    const timeStamp = new Date().getTime();
    setLoadingConfig(true);
    // Get config
    const res = await Axios.get(`${CONFIG_URL}?timestamp=${timeStamp}`);
    const configData: ConfigType = res.data;
    if (!configData.oidc_logout_url) {
      // Get oidc logout url from openid configuration
      await Axios.get(
        `${configData.oidc_provider}/.well-known/openid-configuration`
      ).then((oidcRes) => {
        configData.oidc_logout_url = oidcRes.data.end_session_endpoint;
      });
    }
    setLoadingConfig(false);
    localStorage.setItem(PROJECT_CONFIG_JSON, JSON.stringify(configData));
    initAuthentication(configData);
    setContextData(configData);
  };

  const setLocalStorageAfterLoad = async () => {
    if (localStorage.getItem(PROJECT_CONFIG_JSON)) {
      const configData = JSON.parse(
        defaultStr(localStorage.getItem(PROJECT_CONFIG_JSON))
      );
      setContextData(configData);
      initAuthentication(configData);
      setLoadingConfig(false);
    } else {
      await getConfig();
    }
  };

  useEffect(() => {
    console.info('CCCCCCCCCCCCCCCCCCCc');
    const { type } = window.performance.getEntriesByType('navigation')[0];
    if (type === 'reload') {
      getConfig();
    } else {
      setLocalStorageAfterLoad();
    }
  }, []);

  return (
    <div className="App">
      {loadingConfig ? (
        <Loading isPage />
      ) : (
        <AuthProvider {...oidcConfig}>
          <AppContext.Provider value={contextData}>
            <GlobalProvider>
              <SignedInPage />
            </GlobalProvider>
          </AppContext.Provider>
        </AuthProvider>
      )}
    </div>
  );
};

export default App;
