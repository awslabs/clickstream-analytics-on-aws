// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
import { Button, Header, SpaceBetween } from '@cloudscape-design/components';
import { deleteProject } from 'apis/project';
import InfoLink from 'components/common/InfoLink';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import CreateProject from '../create/CreateProject';

interface ProjectsHeaderProps {
  project?: IProject;
  refreshPage: () => void;
}

const ProjectsHeader: React.FC<ProjectsHeaderProps> = (
  props: ProjectsHeaderProps
) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { project, refreshPage } = props;
  const [openCreate, setOpenCreate] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const confirmDeleteProject = async () => {
    setLoadingDelete(true);
    try {
      const resData: ApiResponse<null> = await deleteProject(
        project?.projectId || ''
      );
      if (resData.success) {
        refreshPage();
        setLoadingDelete(false);
      }
    } catch (error) {
      setLoadingDelete(false);
    }
  };

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
            <Button
              loading={loadingDelete}
              disabled={!project?.projectId}
              onClick={confirmDeleteProject}
            >
              {t('button.delete')}
            </Button>
            <Button
              disabled={!project?.projectId}
              onClick={() => {
                navigate(`/project/detail/${project?.projectId}`);
              }}
            >
              {t('button.viewDetails')}
            </Button>
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
