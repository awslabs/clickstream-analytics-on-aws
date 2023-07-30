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

import { AppLayout } from '@cloudscape-design/components';
import { getApplicationListByPipeline } from 'apis/application';
import { getProjectList } from 'apis/project';
import Loading from 'components/common/Loading';
import Navigation from 'components/layouts/Navigation';
import SwitchSpaceModal from 'components/layouts/SwitchSpaceModal';
import { load, save } from 'pages/common/use-local-storage';
import React, { useEffect, useState } from 'react';

const AnalyticsHome: React.FC = () => {
  const [loadingData, setLoadingData] = useState(true);
  const [swichProjectVisible, setSwichProjectVisible] = useState(false);

  const getDefaultProjectAndApp = async () => {
    const projects = await listProjects();
    if (projects && projects.length > 0) {
      const project = projects[0];
      const apps = await listApplicationByProject(project.id);
      if (apps && apps.length > 0) {
        const app = apps[0];
        save('Analytics-ProjectId-AppId', {
          pid: project.id,
          pname: project.name,
          appid: app.appId,
          appname: app.name,
        });
        window.location.href = `/analytics/${project.id}/app/${app.appId}/dashboards`;
        return;
      }
      setSwichProjectVisible(true);
    }
    setSwichProjectVisible(true);
  };

  const listProjects = async () => {
    try {
      const { success, data }: ApiResponse<ResponseTableData<IProject>> =
        await getProjectList({
          pageNumber: 1,
          pageSize: 9999,
        });
      if (success) {
        return data.items;
      }
      return [];
    } catch (error) {
      console.log(error);
      return [];
    }
  };

  const listApplicationByProject = async (pid: string) => {
    try {
      const { success, data }: ApiResponse<ResponseTableData<IApplication>> =
        await getApplicationListByPipeline({
          pid: pid,
          pageNumber: 1,
          pageSize: 9999,
        });
      if (success) {
        return data.items;
      }
      return [];
    } catch (error) {
      console.log(error);
      return [];
    }
  };

  useEffect(() => {
    setLoadingData(true);
    const analyticsIds = load('Analytics-ProjectId-AppId');
    if (analyticsIds) {
      window.location.href = `/analytics/${analyticsIds.pid}/app/${analyticsIds.appid}/dashboards`;
    } else {
      getDefaultProjectAndApp();
    }
    setLoadingData(false);
  }, []);

  return (
    <AppLayout
      toolsHide
      content={
        <div>
          {loadingData ? (
            <Loading />
          ) : (
            <SwitchSpaceModal
              visible={swichProjectVisible}
              disableClose={true}
              setSwichProjectVisible={setSwichProjectVisible}
            />
          )}
        </div>
      }
      headerSelector="#header"
      navigation={<Navigation activeHref="/analytics" />}
    />
  );
};

export default AnalyticsHome;
