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
import { getUserDetails } from 'apis/user';
import Axios from 'axios';
import RoleRoute from 'components/common/RoleRoute';
import CommonAlert from 'components/common/alert';
import Footer from 'components/layouts/Footer';
import Header from 'components/layouts/Header';
import { AppContext } from 'context/AppContext';
import { UserContext } from 'context/UserContext';
import { WebStorageStateStore } from 'oidc-client-ts';
import AlarmsList from 'pages/alarms/AlarmList';
import AnalyticsHome from 'pages/analytics/AnalyticsHome';
import AnalyticsDashboard from 'pages/analytics/dashboard/AnalyticsDashboard';
import AnalyticsDashboardDetail from 'pages/analytics/dashboard/detail/AnalyticsDashboardDetail';
import AnalyticsEvent from 'pages/analytics/event/AnalyticsEvent';
import AnalyticsFunnel from 'pages/analytics/funnel/AnalyticsFunnel';
import MetadataParameters from 'pages/analytics/metadata/event-parameters/MetadataParameters';
import MetadataEvents from 'pages/analytics/metadata/events/MetadataEvents';
import MetadataUserAttributes from 'pages/analytics/metadata/user-attributes/MetadataUserAttributes';
import AnalyticsRealtime from 'pages/analytics/realtime/AnalyticsRealtime';
import AnalyticsRetention from 'pages/analytics/retention/AnalyticsRetention';
import CreateApplication from 'pages/application/create/CreateApplication';
import ApplicationDetail from 'pages/application/detail/ApplicationDetail';
import AccessDenied from 'pages/error-page/AccessDenied';
import CreatePipeline from 'pages/pipelines/create/CreatePipeline';
import PipelineDetail from 'pages/pipelines/detail/PipelineDetail';
import PluginList from 'pages/plugins/PluginList';
import CreatePlugin from 'pages/plugins/create/CreatePlugin';
import Projects from 'pages/projects/Projects';
import ProjectDetail from 'pages/projects/detail/ProjectDetail';
import UserList from 'pages/user/UserList';
import React, { Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthProvider, AuthProviderProps, useAuth } from 'react-oidc-context';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { CONFIG_URL, IUserRole, PROJECT_CONFIG_JSON } from 'ts/const';
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
  const [currentUser, setCurrentUser] = useState<IUser>();

  useEffect(() => {
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
  }, [auth]);

  if (auth.isLoading || !currentUser) {
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
      <UserContext.Provider value={currentUser}>
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
                  <Route path="/403" element={<AccessDenied />} />
                  <Route
                    path="/"
                    element={
                      <RoleRoute roles={[IUserRole.ADMIN, IUserRole.DEVELOPER]}>
                        <Home />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/projects"
                    element={
                      <RoleRoute roles={[IUserRole.ADMIN, IUserRole.DEVELOPER]}>
                        <Projects />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/alarms"
                    element={
                      <RoleRoute roles={[IUserRole.ADMIN, IUserRole.DEVELOPER]}>
                        <AlarmsList />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/user"
                    element={
                      <RoleRoute roles={[IUserRole.ADMIN, IUserRole.DEVELOPER]}>
                        <UserList />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/project/detail/:id"
                    element={
                      <RoleRoute roles={[IUserRole.ADMIN, IUserRole.DEVELOPER]}>
                        <ProjectDetail />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/project/:pid/pipeline/:id"
                    element={
                      <RoleRoute roles={[IUserRole.ADMIN, IUserRole.DEVELOPER]}>
                        <PipelineDetail />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/project/:pid/pipeline/:id/update"
                    element={
                      <RoleRoute roles={[IUserRole.ADMIN, IUserRole.DEVELOPER]}>
                        <CreatePipeline update />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/project/:projectId/pipelines/create"
                    element={
                      <RoleRoute roles={[IUserRole.ADMIN, IUserRole.DEVELOPER]}>
                        <CreatePipeline />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/pipelines/create"
                    element={
                      <RoleRoute roles={[IUserRole.ADMIN, IUserRole.DEVELOPER]}>
                        <CreatePipeline />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/project/:id/application/create"
                    element={
                      <RoleRoute roles={[IUserRole.ADMIN, IUserRole.DEVELOPER]}>
                        <CreateApplication />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/plugins"
                    element={
                      <RoleRoute roles={[IUserRole.ADMIN, IUserRole.DEVELOPER]}>
                        <PluginList />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/plugins/create"
                    element={
                      <RoleRoute roles={[IUserRole.ADMIN, IUserRole.DEVELOPER]}>
                        <CreatePlugin />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/project/:pid/application/detail/:id"
                    element={
                      <RoleRoute roles={[IUserRole.ADMIN, IUserRole.DEVELOPER]}>
                        <ApplicationDetail />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/analytics"
                    element={
                      <RoleRoute roles={[IUserRole.ADMIN, IUserRole.ANALYST]}>
                        <AnalyticsHome />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/analytics/:projectId/app/:appId/realtime"
                    element={
                      <RoleRoute roles={[IUserRole.ADMIN, IUserRole.ANALYST]}>
                        <AnalyticsRealtime />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/analytics/:projectId/app/:appId/dashboards"
                    element={
                      <RoleRoute roles={[IUserRole.ADMIN, IUserRole.ANALYST]}>
                        <AnalyticsDashboard />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/analytics/:projectId/app/:appId/dashboard/:dashboardId"
                    element={
                      <RoleRoute roles={[IUserRole.ADMIN, IUserRole.ANALYST]}>
                        <AnalyticsDashboardDetail />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/analytics/:projectId/app/:appId/event"
                    element={
                      <RoleRoute roles={[IUserRole.ADMIN, IUserRole.ANALYST]}>
                        <AnalyticsEvent />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/analytics/:projectId/app/:appId/retention"
                    element={
                      <RoleRoute roles={[IUserRole.ADMIN, IUserRole.ANALYST]}>
                        <AnalyticsRetention />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/analytics/:projectId/app/:appId/funnel"
                    element={
                      <RoleRoute roles={[IUserRole.ADMIN, IUserRole.ANALYST]}>
                        <AnalyticsFunnel />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/analytics/:projectId/app/:appId/metadata/events"
                    element={
                      <RoleRoute roles={[IUserRole.ADMIN, IUserRole.ANALYST]}>
                        <MetadataEvents />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/analytics/:projectId/app/:appId/metadata/event-parameters"
                    element={
                      <RoleRoute roles={[IUserRole.ADMIN, IUserRole.ANALYST]}>
                        <MetadataParameters />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="/analytics/:projectId/app/:appId/metadata/user-attributes"
                    element={
                      <RoleRoute roles={[IUserRole.ADMIN, IUserRole.ANALYST]}>
                        <MetadataUserAttributes />
                      </RoleRoute>
                    }
                  />
                </Routes>
              </div>
            </Suspense>
          </div>
          <CommonAlert />
          <Footer />
        </Router>
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
