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

import { IAlarm } from '@aws/clickstream-base-lib';
import {
  Alert,
  Button,
  ColumnLayout,
  Container,
  Header,
} from '@cloudscape-design/components';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ALARM_DISPLAY_STATUS, ALARM_STATUS } from 'ts/const';

interface ProjectWithAlarmProps {
  projectAlarmInfo: IProjectWithAlarm;
}

const ProjectWithAlarm: React.FC<ProjectWithAlarmProps> = (
  props: ProjectWithAlarmProps
) => {
  const { projectAlarmInfo } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [inAlarmCount, setInAlarmCount] = useState(0);
  const [okCount, setOkCount] = useState(0);
  const [insufficentCount, setInsufficentCount] = useState(0);

  const getStatusCountFromAlarmList = (alarmList: IAlarm[]) => {
    let tmpInAlarmCount = 0;
    let tmpOKCount = 0;
    let tmpInsufficientCount = 0;

    alarmList.forEach((alarm) => {
      if (alarm.StateValue === ALARM_STATUS.INSUFFICIENT_DATA) {
        tmpInsufficientCount++;
      }
      if (alarm.StateValue === ALARM_STATUS.ALARM) {
        tmpInAlarmCount++;
      }
      if (alarm.StateValue === ALARM_STATUS.OK) {
        tmpOKCount++;
      }
    });
    setInAlarmCount(tmpInAlarmCount);
    setOkCount(tmpOKCount);
    setInsufficentCount(tmpInsufficientCount);
  };

  const redirectToPipelineShowAlarm = () => {
    navigate(
      `/project/${projectAlarmInfo.project.id}/pipeline/${projectAlarmInfo.project.pipelineId}`,
      {
        state: { activeTab: 'alarms' },
      }
    );
  };

  useEffect(() => {
    if (projectAlarmInfo.alarms) {
      getStatusCountFromAlarmList(projectAlarmInfo.alarms);
    }
  }, [projectAlarmInfo.alarms]);

  return (
    <Container
      header={
        <Header
          variant="h3"
          description={projectAlarmInfo.project.description}
          actions={
            <>
              {projectAlarmInfo.status === ALARM_DISPLAY_STATUS.HAS_ALARM && (
                <Button
                  onClick={() => {
                    redirectToPipelineShowAlarm();
                  }}
                  iconAlign="right"
                  iconName="external"
                  target="_blank"
                >
                  {t('button.viewAlarms')}
                </Button>
              )}
              {projectAlarmInfo.status === ALARM_DISPLAY_STATUS.NO_PIPELINE && (
                <Button
                  iconName="settings"
                  onClick={() => {
                    navigate(
                      `/project/${projectAlarmInfo.project.id}/pipelines/create`
                    );
                  }}
                >
                  {t('button.configPipeline')}
                </Button>
              )}
            </>
          }
        >
          {projectAlarmInfo.project.name}
        </Header>
      }
    >
      <>
        {projectAlarmInfo.status === ALARM_DISPLAY_STATUS.HAS_ALARM && (
          <ColumnLayout columns={3} variant="text-grid">
            <div>
              <div className="alarm-title">{t('alarm.inAlarm')}</div>
              <div className="alarm-value red">{inAlarmCount}</div>
            </div>
            <div>
              <div className="alarm-title">{t('alarm.ok')}</div>
              <div className="alarm-value green">{okCount}</div>
            </div>
            <div>
              <div className="alarm-title">{t('alarm.insufficientData')}</div>
              <div className="alarm-value">{insufficentCount}</div>
            </div>
          </ColumnLayout>
        )}
        {projectAlarmInfo.status === ALARM_DISPLAY_STATUS.NO_ALARM && (
          <Alert>{t('alarm.noAlarmInPipeline')}</Alert>
        )}
        {projectAlarmInfo.status === ALARM_DISPLAY_STATUS.NO_PIPELINE && (
          <Alert type="warning">{t('alarm.projectNoPipeline')}</Alert>
        )}
      </>
    </Container>
  );
};

export default ProjectWithAlarm;
