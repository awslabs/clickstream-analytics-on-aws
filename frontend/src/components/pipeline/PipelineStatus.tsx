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
  Link,
  Popover,
  SpaceBetween,
  Spinner,
  StatusIndicator,
  StatusIndicatorProps,
} from '@cloudscape-design/components';
import { getPipelineDetail } from 'apis/pipeline';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CLOUDFORMATION_STATUS_MAP, EPipelineStatus } from 'ts/const';
import { buildCloudFormationStackLink } from 'ts/url';

const CHECK_TIME_INTERVAL = 5000;

interface PipelineStatusProps {
  projectId?: string;
  pipelineId?: string;
  status?: string;
}
const PipelineStatus: React.FC<PipelineStatusProps> = (
  props: PipelineStatusProps
) => {
  const { status, projectId, pipelineId } = props;
  const { t } = useTranslation();
  let intervalId: any = 0;
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [updatedStatus, setUpdatedStatus] = useState(status);
  const [pipelineRegion, setPipelineRegion] = useState('');
  const [stackStatusList, setStackStatusList] = useState<IStackStatus[]>([]);
  let indicatorType: StatusIndicatorProps.Type = 'loading';
  let displayStatus = '';
  if (
    updatedStatus === EPipelineStatus.Creating ||
    updatedStatus === EPipelineStatus.Updating ||
    updatedStatus === EPipelineStatus.Deleting
  ) {
    indicatorType = 'loading';
    if (updatedStatus === EPipelineStatus.Creating) {
      displayStatus = 'status.creating';
    }
    if (updatedStatus === EPipelineStatus.Updating) {
      displayStatus = 'status.updating';
    }
    if (updatedStatus === EPipelineStatus.Deleting) {
      displayStatus = 'status.deleting';
    }
  } else if (updatedStatus === EPipelineStatus.Failed) {
    indicatorType = 'error';
    displayStatus = 'status.failed';
  } else if (updatedStatus === EPipelineStatus.Active) {
    indicatorType = 'success';
    displayStatus = 'status.active';
  } else {
    indicatorType = 'pending';
    displayStatus = 'status.pending';
  }

  const checkStatus = async (isRefresh?: boolean) => {
    if (!isRefresh) {
      setLoadingStatus(true);
    }
    try {
      const { success, data }: ApiResponse<IExtPipeline> =
        await getPipelineDetail({
          id: pipelineId ?? '',
          pid: projectId ?? '',
        });
      if (success) {
        setUpdatedStatus(data.status?.status);
        setPipelineRegion(data.region);
        setStackStatusList(data.status?.stackDetails || []);
        if (
          data.status?.status === EPipelineStatus.Active ||
          data.status?.status === EPipelineStatus.Failed
        ) {
          window.clearInterval(intervalId);
        }
        setLoadingStatus(false);
      }
    } catch (error) {
      setLoadingStatus(false);
      window.clearInterval(intervalId);
    }
  };

  useEffect(() => {
    intervalId = setInterval(() => {
      checkStatus(true);
    }, CHECK_TIME_INTERVAL);
    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    checkStatus();
    if (status) {
      setUpdatedStatus(status);
    }
  }, [status]);

  return (
    <>
      <Popover
        dismissButton={false}
        position="right"
        size="large"
        triggerType="custom"
        content={
          loadingStatus ? (
            <Spinner />
          ) : (
            <SpaceBetween direction="vertical" size="xs">
              {stackStatusList.map((element) => {
                return (
                  <div className="flex flex-1" key={element.stackType}>
                    <StatusIndicator
                      type={
                        CLOUDFORMATION_STATUS_MAP[element.stackStatus] ||
                        'stopped'
                      }
                    >
                      <b>{element.stackType}</b>(
                      {element.stackStatus || t('status.unknown')})
                      {element.stackStatus && (
                        <span className="ml-5">
                          <Link
                            external
                            href={buildCloudFormationStackLink(
                              pipelineRegion,
                              element.stackName
                            )}
                          >
                            {t('pipeline:detail.stackDetails')}
                          </Link>
                        </span>
                      )}
                    </StatusIndicator>
                  </div>
                );
              })}
            </SpaceBetween>
          )
        }
      >
        <StatusIndicator type={indicatorType}>
          <span className="stack-status">{t(displayStatus)}</span>
        </StatusIndicator>
      </Popover>
    </>
  );
};

export default PipelineStatus;
