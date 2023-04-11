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
import React from 'react';
import { useTranslation } from 'react-i18next';

export enum EPipelineStatus {
  Active = 'Active',
  Failed = 'Failed',
  Creating = 'Creating',
  Updating = 'Updating',
  Deleting = 'Deleting',
  Pending = 'Pending',
}

interface PipelineStatusProps {
  status?: string;
}
const PipelineStatus: React.FC<PipelineStatusProps> = (
  props: PipelineStatusProps
) => {
  const { status } = props;
  const { t } = useTranslation();
  let indicatorType: StatusIndicatorProps.Type = 'loading';
  let displayStatus = '';
  if (
    status === EPipelineStatus.Creating ||
    status === EPipelineStatus.Updating ||
    status === EPipelineStatus.Deleting
  ) {
    indicatorType = 'in-progress';
    if (status === EPipelineStatus.Creating) {
      displayStatus = 'status.creating';
    }
    if (status === EPipelineStatus.Updating) {
      displayStatus = 'status.updating';
    }
    if (status === EPipelineStatus.Deleting) {
      displayStatus = 'status.deleting';
    }
  } else if (status === EPipelineStatus.Failed) {
    indicatorType = 'error';
    displayStatus = 'status.failed';
  } else if (status === EPipelineStatus.Active) {
    indicatorType = 'success';
    displayStatus = 'status.active';
  } else {
    indicatorType = 'pending';
    displayStatus = 'status.pending';
  }

  return (
    <>
      <StatusIndicator type={indicatorType}>{t(displayStatus)}</StatusIndicator>
    </>
  );
};

export default PipelineStatus;
