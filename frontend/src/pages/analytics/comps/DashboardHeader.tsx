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
import { Button, Header, SpaceBetween } from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface DashboardHeaderProps {
  totalNum: number;
  onClickCreate: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = (
  props: DashboardHeaderProps
) => {
  const { t } = useTranslation();
  const { totalNum, onClickCreate } = props;

  return (
    <>
      <Header
        variant="h1"
        counter={`(${totalNum})`}
        description={t('analytics:dashboard.description')}
        actions={
          <SpaceBetween size="xs" direction="horizontal">
            <Button
              data-testid="header-btn-create"
              variant="primary"
              onClick={onClickCreate}
            >
              {t('common:button.createDashboard')}
            </Button>
          </SpaceBetween>
        }
      >
        {t('analytics:dashboard.title')}
      </Header>
    </>
  );
};

export default DashboardHeader;
