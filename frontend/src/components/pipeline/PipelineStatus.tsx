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

export enum EPipelineStatus {
  CREATE_IN_PROGRESS = 'CREATE_IN_PROGRESS',
  CREATE_COMPLETE = 'CREATE_COMPLETE',
  CREATE_FAILED = 'CREATE_FAILED',
  UPDATE_IN_PROGRESS = 'UPDATE_IN_PROGRESS',
  UPDATE_COMPLETE = 'UPDATE_COMPLETE',
  UPDATE_FAILED = 'UPDATE_FAILED',
  DELETE_IN_PROGRESS = 'DELETE_IN_PROGRESS',
  DELETE_COMPLETE = 'DELETE_COMPLETE',
  DELETE_FAILED = 'DELETE_FAILED',
}

interface PipelineStatusProps {
  status?: string;
}
const PipelineStatus: React.FC<PipelineStatusProps> = (
  props: PipelineStatusProps
) => {
  const { status } = props;
  let indicatorType: StatusIndicatorProps.Type = 'loading';
  if (
    status === EPipelineStatus.CREATE_IN_PROGRESS ||
    status === EPipelineStatus.UPDATE_IN_PROGRESS ||
    status === EPipelineStatus.DELETE_IN_PROGRESS
  ) {
    indicatorType = 'in-progress';
  } else if (
    status === EPipelineStatus.CREATE_FAILED ||
    status === EPipelineStatus.UPDATE_FAILED ||
    status === EPipelineStatus.DELETE_FAILED
  ) {
    indicatorType = 'error';
  } else if (
    status === EPipelineStatus.CREATE_COMPLETE ||
    status === EPipelineStatus.UPDATE_COMPLETE ||
    status === EPipelineStatus.DELETE_COMPLETE
  ) {
    indicatorType = 'success';
  } else {
    indicatorType = 'pending';
  }

  return (
    <>
      <StatusIndicator type={indicatorType}>{status}</StatusIndicator>
    </>
  );
};

export default PipelineStatus;
