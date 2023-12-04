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

import { Box, Popover } from '@cloudscape-design/components';
import React from 'react';
import ExtendIcon from '../ExtendIcon';

interface InfoTitleProps {
  title: string | null;
  popoverDescription?: string | null;
}

const InfoTitle: React.FC<InfoTitleProps> = (props: InfoTitleProps) => {
  const { title, popoverDescription } = props;
  return (
    <div className="flex align-center gap-3">
      <Box variant="awsui-key-label">{title}</Box>
      {popoverDescription && (
        <Popover triggerType="custom" size="small" content={popoverDescription}>
          <div>
            <ExtendIcon icon="Info" color="#666" />
          </div>
        </Popover>
      )}
    </div>
  );
};

export default InfoTitle;
