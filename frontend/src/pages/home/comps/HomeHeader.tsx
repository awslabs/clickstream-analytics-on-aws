// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
