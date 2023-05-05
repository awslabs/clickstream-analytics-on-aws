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

import { Badge } from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ProjectStage } from 'ts/const';

interface EnvironmentProps {
  env: string;
}

const Environment: React.FC<EnvironmentProps> = (props: EnvironmentProps) => {
  const { env } = props;
  const { t } = useTranslation();
  return (
    <div className="project-env">
      {!env && (
        <div className="unspecified">{t('project:create.unspecified')}</div>
      )}
      {env === ProjectStage.DEV && <Badge>{env}</Badge>}
      {env === ProjectStage.TEST && <Badge color="blue">{env}</Badge>}
      {env === ProjectStage.PROD && <Badge color="red">{env}</Badge>}
    </div>
  );
};

export default Environment;
