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

import { Alert } from '@cloudscape-design/components';
import { getUserDetails } from 'apis/user';
import Loading from 'components/common/Loading';
import RoleRoute from 'components/common/RoleRoute';
import CommonAlert from 'components/common/alert';
import { UserContext } from 'context/UserContext';
import AlarmsList from 'pages/alarms/AlarmList';
import AnalyticsHome from 'pages/analytics/AnalyticsHome';
import AnalyticsAnalyzes from 'pages/analytics/analyzes/AnalyticsAnalyzes';
import AnalyticsAnalyzesFullWindow from 'pages/analytics/analyzes/full/AnalyticsAnalyzesFullWindow';
import AnalyticsDashboard from 'pages/analytics/dashboard/AnalyticsDashboard';
import AnalyticsDashboardDetail from 'pages/analytics/dashboard/detail/AnalyticsDashboardDetail';
import AnalyticsDashboardFullWindow from 'pages/analytics/dashboard/full/AnalyticsDashboardFullWindow';
import AnalyticsDataManagement from 'pages/analytics/data-management/AnalyticsDataManagement';
import AnalyticsExplore from 'pages/analytics/explore/AnalyticsExplore';
import AnalyticsRealtime from 'pages/analytics/realtime/AnalyticsRealtime';
import CreateApplication from 'pages/application/create/CreateApplication';
import ApplicationDetail from 'pages/application/detail/ApplicationDetail';
import CreatePipeline from 'pages/pipelines/create/CreatePipeline';
import PipelineDetail from 'pages/pipelines/detail/PipelineDetail';
import PluginList from 'pages/plugins/PluginList';
import CreatePlugin from 'pages/plugins/create/CreatePlugin';
import Projects from 'pages/projects/Projects';
import ProjectDetail from 'pages/projects/detail/ProjectDetail';
import UserList from 'pages/user/UserList';
import React, { Suspense, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthContextProps } from 'react-oidc-context';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { IUserRole, LAST_VISIT_URL } from 'ts/const';
import { getIntersectArrays, getUserInfoFromLocalStorage } from 'ts/utils';
import Home from './pages/home/Home';

interface LoginCallbackProps {
  auth: AuthContextProps;
}

const BASE_URL = '/';
const ANALYTICS_ROLE = [IUserRole.ANALYST, IUserRole.ANALYST_READER];
const LoginCallback: React.FC<LoginCallbackProps> = (
  props: LoginCallbackProps
) => {
  const { t } = useTranslation();
  const { auth } = props;
  const currentUser = useContext(UserContext) ?? getUserInfoFromLocalStorage();
  const [noUserEmailError, setNoUserEmailError] = useState(false);
  const [unexpectedError, setUnexpectedError] = useState(false);
  const [unexpectedErrorMessage, setUnexpectedErrorMessage] = useState('');

  const gotoBasePage = () => {
    const lastVisitUrl = localStorage.getItem(LAST_VISIT_URL) ?? BASE_URL;
    localStorage.removeItem(LAST_VISIT_URL);
    window.location.href = `${lastVisitUrl}`;
  };
  const gotoAnalyticsPage = () => {
    const lastVisitUrl =
      localStorage.getItem(LAST_VISIT_URL) ?? `${BASE_URL}analytics`;
    localStorage.removeItem(LAST_VISIT_URL);
    window.location.href = `${lastVisitUrl}`;
  };

  const getUserInfo = async () => {
    if (!auth.user?.profile.email) {
      setNoUserEmailError(true);
      return;
    }
    setNoUserEmailError(false);
    try {
      const { success, data }: ApiResponse<IUser> = await getUserDetails(
        auth.user?.profile.email ?? ''
      );
      if (
        success &&
        getIntersectArrays(ANALYTICS_ROLE, data.roles).length > 0
      ) {
        gotoAnalyticsPage();
      } else {
        gotoBasePage();
      }
    } catch (error: any) {
      setUnexpectedError(true);
      setUnexpectedErrorMessage(error.message);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      getUserInfo();
    } else if (
      getIntersectArrays(ANALYTICS_ROLE, currentUser.roles).length > 0
    ) {
      gotoAnalyticsPage();
    } else {
      gotoBasePage();
    }
  }, []);

  if (noUserEmailError) {
    return <Alert type="error">{t('noEmailError')}</Alert>;
  }

  if (unexpectedError) {
    return (
      <Alert type="error">
        {t('unknownError')} {unexpectedErrorMessage}
      </Alert>
    );
  }

  return <Loading isPage />;
};

interface AppRouterProps {
  auth: any;
  sessionExpired: boolean;
}

const AppRouter: React.FC<AppRouterProps> = (props: AppRouterProps) => {
  const { auth, sessionExpired } = props;
  return (
    <Router>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/signin" element={<LoginCallback auth={auth} />} />
          <Route
            path="/"
            element={
              <RoleRoute
                sessionExpired={sessionExpired}
                layout="common"
                auth={auth}
                roles={[IUserRole.ADMIN, IUserRole.OPERATOR]}
              >
                <Home />
              </RoleRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <RoleRoute
                sessionExpired={sessionExpired}
                layout="common"
                auth={auth}
                roles={[IUserRole.ADMIN, IUserRole.OPERATOR]}
              >
                <Projects />
              </RoleRoute>
            }
          />
          <Route
            path="/alarms"
            element={
              <RoleRoute
                sessionExpired={sessionExpired}
                layout="common"
                auth={auth}
                roles={[IUserRole.ADMIN, IUserRole.OPERATOR]}
              >
                <AlarmsList />
              </RoleRoute>
            }
          />
          <Route
            path="/user"
            element={
              <RoleRoute
                sessionExpired={sessionExpired}
                layout="common"
                auth={auth}
                roles={[IUserRole.ADMIN]}
              >
                <UserList />
              </RoleRoute>
            }
          />

          <Route
            path="/project/detail/:id"
            element={
              <RoleRoute
                sessionExpired={sessionExpired}
                layout="common"
                auth={auth}
                roles={[IUserRole.ADMIN, IUserRole.OPERATOR]}
              >
                <ProjectDetail />
              </RoleRoute>
            }
          />
          <Route
            path="/project/:pid/pipeline/:id"
            element={
              <RoleRoute
                sessionExpired={sessionExpired}
                layout="common"
                auth={auth}
                roles={[IUserRole.ADMIN, IUserRole.OPERATOR]}
              >
                <PipelineDetail />
              </RoleRoute>
            }
          />
          <Route
            path="/project/:pid/pipeline/:id/update"
            element={
              <RoleRoute
                sessionExpired={sessionExpired}
                layout="common"
                auth={auth}
                roles={[IUserRole.ADMIN, IUserRole.OPERATOR]}
              >
                <CreatePipeline update />
              </RoleRoute>
            }
          />
          <Route
            path="/project/:projectId/pipelines/create"
            element={
              <RoleRoute
                sessionExpired={sessionExpired}
                layout="common"
                auth={auth}
                roles={[IUserRole.ADMIN, IUserRole.OPERATOR]}
              >
                <CreatePipeline />
              </RoleRoute>
            }
          />
          <Route
            path="/pipelines/create"
            element={
              <RoleRoute
                sessionExpired={sessionExpired}
                layout="common"
                auth={auth}
                roles={[IUserRole.ADMIN, IUserRole.OPERATOR]}
              >
                <CreatePipeline />
              </RoleRoute>
            }
          />
          <Route
            path="/project/:id/application/create"
            element={
              <RoleRoute
                sessionExpired={sessionExpired}
                layout="common"
                auth={auth}
                roles={[IUserRole.ADMIN, IUserRole.OPERATOR]}
              >
                <CreateApplication />
              </RoleRoute>
            }
          />
          <Route
            path="/plugins"
            element={
              <RoleRoute
                sessionExpired={sessionExpired}
                layout="common"
                auth={auth}
                roles={[IUserRole.ADMIN, IUserRole.OPERATOR]}
              >
                <PluginList />
              </RoleRoute>
            }
          />
          <Route
            path="/plugins/create"
            element={
              <RoleRoute
                sessionExpired={sessionExpired}
                layout="common"
                auth={auth}
                roles={[IUserRole.ADMIN, IUserRole.OPERATOR]}
              >
                <CreatePlugin />
              </RoleRoute>
            }
          />
          <Route
            path="/project/:pid/application/detail/:id"
            element={
              <RoleRoute
                sessionExpired={sessionExpired}
                layout="common"
                auth={auth}
                roles={[IUserRole.ADMIN, IUserRole.OPERATOR]}
              >
                <ApplicationDetail />
              </RoleRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <RoleRoute
                sessionExpired={sessionExpired}
                layout="none"
                auth={auth}
                roles={[
                  IUserRole.ADMIN,
                  IUserRole.ANALYST,
                  IUserRole.ANALYST_READER,
                ]}
              >
                <AnalyticsHome auth={auth} />
              </RoleRoute>
            }
          />
          <Route
            path="/analytics/:projectId/app/:appId/data-management"
            element={
              <RoleRoute
                sessionExpired={sessionExpired}
                layout="analytics"
                auth={auth}
                roles={[
                  IUserRole.ADMIN,
                  IUserRole.ANALYST,
                  IUserRole.ANALYST_READER,
                ]}
              >
                <AnalyticsDataManagement />
              </RoleRoute>
            }
          />
          <Route
            path="/analytics/:projectId/app/:appId/realtime"
            element={
              <RoleRoute
                sessionExpired={sessionExpired}
                layout="analytics"
                auth={auth}
                roles={[
                  IUserRole.ADMIN,
                  IUserRole.ANALYST,
                  IUserRole.ANALYST_READER,
                ]}
              >
                <AnalyticsRealtime />
              </RoleRoute>
            }
          />
          <Route
            path="/analytics/:projectId/app/:appId/explore"
            element={
              <RoleRoute
                sessionExpired={sessionExpired}
                layout="analytics"
                auth={auth}
                roles={[
                  IUserRole.ADMIN,
                  IUserRole.ANALYST,
                  IUserRole.ANALYST_READER,
                ]}
              >
                <AnalyticsExplore />
              </RoleRoute>
            }
          />
          <Route
            path="/analytics/:projectId/app/:appId/analyzes"
            element={
              <RoleRoute
                sessionExpired={sessionExpired}
                layout="analytics"
                auth={auth}
                roles={[IUserRole.ADMIN, IUserRole.ANALYST]}
              >
                <AnalyticsAnalyzes />
              </RoleRoute>
            }
          />
          <Route
            path="/analytics/:projectId/app/:appId/analyzes/full"
            element={
              <RoleRoute
                sessionExpired={sessionExpired}
                layout="none"
                auth={auth}
                roles={[IUserRole.ADMIN, IUserRole.ANALYST]}
              >
                <AnalyticsAnalyzesFullWindow />
              </RoleRoute>
            }
          />
          <Route
            path="/analytics/:projectId/app/:appId/dashboards"
            element={
              <RoleRoute
                sessionExpired={sessionExpired}
                layout="analytics"
                auth={auth}
                roles={[
                  IUserRole.ADMIN,
                  IUserRole.ANALYST,
                  IUserRole.ANALYST_READER,
                ]}
              >
                <AnalyticsDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/analytics/:projectId/app/:appId/dashboard/:dashboardId"
            element={
              <RoleRoute
                sessionExpired={sessionExpired}
                layout="analytics"
                auth={auth}
                roles={[
                  IUserRole.ADMIN,
                  IUserRole.ANALYST,
                  IUserRole.ANALYST_READER,
                ]}
              >
                <AnalyticsDashboardDetail />
              </RoleRoute>
            }
          />
          <Route
            path="/analytics/:projectId/app/:appId/dashboard/full/:dashboardId"
            element={
              <RoleRoute
                sessionExpired={sessionExpired}
                layout="none"
                auth={auth}
                roles={[
                  IUserRole.ADMIN,
                  IUserRole.ANALYST,
                  IUserRole.ANALYST_READER,
                ]}
              >
                <AnalyticsDashboardFullWindow />
              </RoleRoute>
            }
          />
        </Routes>
      </Suspense>
      <CommonAlert />
    </Router>
  );
};

export default AppRouter;
