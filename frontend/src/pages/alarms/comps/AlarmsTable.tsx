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
  Box,
  Header,
  SpaceBetween,
  Spinner,
} from '@cloudscape-design/components';
import { getProjectList } from 'apis/project';
import { getAlarmList } from 'apis/resource';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ALARM_DISPLAY_STATUS } from 'ts/const';
import ProjectWithAlarm from './ProjectWithAlarm';

const AlarmTableTable: React.FC = () => {
  const { t } = useTranslation();

  const [loadingData, setLoadingData] = useState(true);
  const [projectWithAlarmList, setProjectWithAlarmList] = useState<
    IProjectWithAlarm[]
  >([]);

  const listProjects = async () => {
    setLoadingData(true);
    try {
      const { success, data }: ApiResponse<ResponseTableData<IProject>> =
        await getProjectList({
          pageNumber: 1,
          pageSize: 9999,
        });
      if (success) {
        const promiseList = data.items.map((item) => {
          return {
            params: { project: item },
            promise: getAlarmList({
              pid: item.id,
              pageNumber: 1,
              pageSize: 100,
            }),
          };
        });
        const results: IAlarmPromiseResult[] = await Promise.allSettled(
          promiseList.map((request) => request.promise)
        );
        const tmpProjectAlarmList: IProjectWithAlarm[] = [];
        results.forEach((result, index) => {
          const request = promiseList[index];
          const param = request.params;
          let tmpStatus = ALARM_DISPLAY_STATUS.NO_PIPELINE;
          if (result.value) {
            const alarmTotalCount = result.value?.data.totalCount;
            if (alarmTotalCount >= 0) {
              if (alarmTotalCount > 0) {
                tmpStatus = ALARM_DISPLAY_STATUS.HAS_ALARM;
              } else {
                tmpStatus = ALARM_DISPLAY_STATUS.NO_ALARM;
              }
            } else {
              tmpStatus = ALARM_DISPLAY_STATUS.NO_PIPELINE;
            }
          }
          tmpProjectAlarmList.push({
            project: param.project,
            status: tmpStatus,
            alarms: result?.value?.data?.items || [],
          });
        });
        setProjectWithAlarmList(
          tmpProjectAlarmList.sort((a, b) => b.status - a.status)
        );
        setLoadingData(false);
      }
    } catch (error) {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    listProjects();
  }, []);

  return (
    <div>
      <Header variant="h2">{t('alarm.alarmsList')}</Header>
      <div className="mt-20">
        {loadingData ? (
          <Spinner />
        ) : projectWithAlarmList?.length > 0 ? (
          <SpaceBetween direction="vertical" size="l">
            {projectWithAlarmList.map((element) => {
              return (
                <ProjectWithAlarm
                  key={element.project.id}
                  projectAlarmInfo={element}
                />
              );
            })}
          </SpaceBetween>
        ) : (
          <Box>No Project</Box>
        )}
      </div>
    </div>
  );
};

export default AlarmTableTable;
