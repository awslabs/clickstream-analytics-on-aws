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
import InfoLink from 'components/common/InfoLink';
import CreateProject from 'pages/projects/create/CreateProject';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const HomeHeader: React.FC = () => {
  const { t } = useTranslation();
  const [openCreate, setOpenCreate] = useState(false);
  return (
    <>
      <CreateProject
        openModel={openCreate}
        closeModel={() => {
          setOpenCreate(false);
        }}
      />
      <Header
        variant="h1"
        info={<InfoLink />}
        actions={
          <SpaceBetween size="xs" direction="horizontal">
            <Button
              variant="primary"
              onClick={() => {
                setOpenCreate(true);
              }}
            >
              {t('button.createProject')}
            </Button>
          </SpaceBetween>
        }
        description={t('home:header.desc')}
      >
        {t('name')}
      </Header>
    </>
  );
};

export default HomeHeader;
