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

import Loading from 'components/common/Loading';
import RoleRoute from 'components/common/RoleRoute';
import CommonAlert from 'components/common/alert';
import { UserContext } from 'context/UserContext';
import AlarmsList from 'pages/alarms/AlarmList';
import AnalyticsHome from 'pages/analytics/AnalyticsHome';
import AnalyticsAnalyzes from 'pages/analytics/analyzes/AnalyticsAnalyzes';
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
import React, { Suspense, useContext, useEffect } from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { IUserRole } from 'ts/const';
import { getUserInfoFormLocalStorage } from 'ts/utils';
import Home from './pages/home/Home';

const LoginCallback: React.FC = () => {
  const currentUser = useContext(UserContext) ?? getUserInfoFormLocalStorage();

  useEffect(() => {
    const baseUrl = '/';
    if (currentUser?.role === IUserRole.ANALYST) {
      window.location.href = `${baseUrl}analytics`;
    } else {
      window.location.href = baseUrl;
    }
  }, []);
  return <Loading isPage />;
};

interface AppRouterProps {
  auth: any;
}

const AppRouter: React.FC<AppRouterProps> = (props: AppRouterProps) => {
  const { auth } = props;
  return (
    <Router>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/signin" element={<LoginCallback />} />
          <Route
            path="/"
            element={
              <RoleRoute
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
              <RoleRoute layout="common" auth={auth} roles={[IUserRole.ADMIN]}>
                <UserList />
              </RoleRoute>
            }
          />
          <Route
            path="/project/detail/:id"
            element={
              <RoleRoute
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
                layout="none"
                auth={auth}
                roles={[IUserRole.ADMIN, IUserRole.ANALYST]}
              >
                <AnalyticsHome auth={auth} />
              </RoleRoute>
            }
          />
          <Route
            path="/analytics/:projectId/app/:appId/data-management"
            element={
              <RoleRoute
                layout="analytics"
                auth={auth}
                roles={[IUserRole.ADMIN, IUserRole.ANALYST]}
              >
                <AnalyticsDataManagement />
              </RoleRoute>
            }
          />
          <Route
            path="/analytics/:projectId/app/:appId/realtime"
            element={
              <RoleRoute
                layout="analytics"
                auth={auth}
                roles={[IUserRole.ADMIN, IUserRole.ANALYST]}
              >
                <AnalyticsRealtime />
              </RoleRoute>
            }
          />
          <Route
            path="/analytics/:projectId/app/:appId/explore"
            element={
              <RoleRoute
                layout="analytics"
                auth={auth}
                roles={[IUserRole.ADMIN, IUserRole.ANALYST]}
              >
                <AnalyticsExplore />
              </RoleRoute>
            }
          />
          <Route
            path="/analytics/:projectId/app/:appId/analyzes"
            element={
              <RoleRoute
                layout="analytics"
                auth={auth}
                roles={[IUserRole.ADMIN, IUserRole.ANALYST]}
              >
                <AnalyticsAnalyzes />
              </RoleRoute>
            }
          />
          <Route
            path="/analytics/:projectId/app/:appId/dashboards"
            element={
              <RoleRoute
                layout="analytics"
                auth={auth}
                roles={[IUserRole.ADMIN, IUserRole.ANALYST]}
              >
                <AnalyticsDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/analytics/:projectId/app/:appId/dashboard/:dashboardId"
            element={
              <RoleRoute
                layout="analytics"
                auth={auth}
                roles={[IUserRole.ADMIN, IUserRole.ANALYST]}
              >
                <AnalyticsDashboardDetail />
              </RoleRoute>
            }
          />
          <Route
            path="/analytics/:projectId/app/:appId/dashboard/full/:dashboardId"
            element={
              <RoleRoute
                layout="none"
                auth={auth}
                roles={[IUserRole.ADMIN, IUserRole.ANALYST]}
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
