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

import { Button, Spinner } from '@cloudscape-design/components';
import Axios from 'axios';
import CommonAlert from 'components/common/alert';
import Footer from 'components/layouts/Footer';
import Header from 'components/layouts/Header';
import { AppContext } from 'context/AppContext';
import { WebStorageStateStore } from 'oidc-client-ts';
import AlarmsList from 'pages/alarms/AlarmList';
import AnalyticsFunnel from 'pages/analytics/funnel/AnalyticsFunnel';
import AnalyticsHome from 'pages/analytics/home/Home';
import CreateApplication from 'pages/application/create/CreateApplication';
import ApplicationDetail from 'pages/application/detail/ApplicationDetail';
import CreatePipeline from 'pages/pipelines/create/CreatePipeline';
import PipelineDetail from 'pages/pipelines/detail/PipelineDetail';
import PluginList from 'pages/plugins/PluginList';
import CreatePlugin from 'pages/plugins/create/CreatePlugin';
import Projects from 'pages/projects/Projects';
import ProjectDetail from 'pages/projects/detail/ProjectDetail';
import React, { Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthProvider, AuthProviderProps, useAuth } from 'react-oidc-context';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { CONFIG_URL, PROJECT_CONFIG_JSON } from 'ts/const';
import Home from './pages/home/Home';

const LoginCallback: React.FC = () => {
  useEffect(() => {
    const baseUrl = '/';
    window.location.href = baseUrl;
  }, []);
  return (
    <div className="page-loading">
      <Spinner />
    </div>
  );
};

const SignedInPage: React.FC = () => {
  const auth = useAuth();
  const { t } = useTranslation();
  useEffect(() => {
    // the `return` is important - addAccessTokenExpiring() returns a cleanup function
    return auth?.events?.addAccessTokenExpiring((event) => {
      auth.signinSilent();
    });
  }, [auth.events, auth.signinSilent]);

  if (auth.isLoading) {
    return (
      <div className="page-loading">
        <Spinner />
      </div>
    );
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
      <Router>
        <div id="b">
          <Header
            user={auth.user}
            signOut={() => {
              auth.removeUser();
              localStorage.removeItem(PROJECT_CONFIG_JSON);
            }}
          />
          <Suspense fallback={null}>
            <div id="app">
              <Routes>
                <Route path="/signin" element={<LoginCallback />} />
                <Route path="/" element={<Home />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/alarms" element={<AlarmsList />} />
                <Route path="/project/detail/:id" element={<ProjectDetail />} />
                <Route
                  path="/project/:pid/pipeline/:id"
                  element={<PipelineDetail />}
                />
                <Route
                  path="/project/:pid/pipeline/:id/update"
                  element={<CreatePipeline update />}
                />
                <Route
                  path="/project/:projectId/pipelines/create"
                  element={<CreatePipeline />}
                />
                <Route path="/pipelines/create" element={<CreatePipeline />} />
                <Route
                  path="/project/:id/application/create"
                  element={<CreateApplication />}
                />
                <Route path="/plugins" element={<PluginList />} />
                <Route path="/plugins/create" element={<CreatePlugin />} />
                <Route
                  path="/project/:pid/application/detail/:id"
                  element={<ApplicationDetail />}
                />
                <Route path="/analytics" element={<AnalyticsHome />} />
                <Route path="/analytics/funnel" element={<AnalyticsFunnel />} />
              </Routes>
            </div>
          </Suspense>
        </div>
        <CommonAlert />
        <Footer />
      </Router>
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
            {t('button.signin')}
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
        localStorage.getItem(PROJECT_CONFIG_JSON) || ''
      );
      setContextData(configData);
      initAuthentication(configData);
      setLoadingConfig(false);
    } else {
      await getConfig();
    }
  };

  useEffect(() => {
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
        <div className="page-loading">
          <Spinner />
        </div>
      ) : (
        <AuthProvider {...oidcConfig}>
          <AppContext.Provider value={contextData}>
            <SignedInPage />
          </AppContext.Provider>
        </AuthProvider>
      )}
    </div>
  );
};

export default App;
