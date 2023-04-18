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
  StatusIndicator,
  StatusIndicatorProps,
} from '@cloudscape-design/components';
import { getPipelineDetail } from 'apis/pipeline';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export enum EPipelineStatus {
  Active = 'Active',
  Failed = 'Failed',
  Creating = 'Creating',
  Updating = 'Updating',
  Deleting = 'Deleting',
  Pending = 'Pending',
}

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
  const [updatedStatus, setUpdatedStatus] = useState(status);
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

  const checkStatus = async () => {
    try {
      const { success, data }: ApiResponse<IExtPipeline> =
        await getPipelineDetail({
          id: pipelineId ?? '',
          pid: projectId ?? '',
        });
      if (success) {
        setUpdatedStatus(data.status?.status);
        if (
          data.status?.status === EPipelineStatus.Active ||
          data.status?.status === EPipelineStatus.Failed
        ) {
          window.clearInterval(intervalId);
        }
      }
    } catch (error) {
      window.clearInterval(intervalId);
    }
  };

  useEffect(() => {
    intervalId = setInterval(() => {
      checkStatus();
    }, CHECK_TIME_INTERVAL);
    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (status) {
      setUpdatedStatus(status);
    }
  }, [status]);

  return (
    <>
      <StatusIndicator type={indicatorType}>{t(displayStatus)}</StatusIndicator>
    </>
  );
};

export default PipelineStatus;
