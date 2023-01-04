// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
import { Button, Header, SpaceBetween } from '@cloudscape-design/components';
import InfoLink from 'components/common/InfoLink';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import CreateProject from '../create/CreateProject';

const ProjectsHeader: React.FC = () => {
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
        counter="(9)"
        actions={
          <SpaceBetween size="xs" direction="horizontal">
            <Button>{t('button.viewDetails')}</Button>
            <Button>{t('button.edit')}</Button>
            <Button
              variant="primary"
              onClick={() => {
                setOpenCreate(true);
              }}
            >
              {t('button.create')}
            </Button>
          </SpaceBetween>
        }
        description="Collection description"
      >
        {t('project:projects')}
      </Header>
    </>
  );
};

export default ProjectsHeader;
