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
  AppLayout,
  Container,
  ContentLayout,
  Header,
  SpaceBetween,
  Tabs,
} from '@cloudscape-design/components';
import { getPipelineDetail } from 'apis/pipeline';
import { getProjectDetail } from 'apis/project';
import InfoLink from 'components/common/InfoLink';
import Loading from 'components/common/Loading';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import Navigation from 'components/layouts/Navigation';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import Alarms from './comps/Alarms';
import Ingestion from './comps/Ingestion';
import Monitoring from './comps/Monitoring';
import Processing from './comps/Processing';
import Reporting from './comps/Reporting';
import BasicInfo from '../comps/BasicInfo';

const PipelineDetail: React.FC = () => {
  const { t } = useTranslation();
  const { id, pid } = useParams();

  const [loadingData, setLoadingData] = useState(true);
  const [projectInfo, setProjectInfo] = useState<IProject>();
  const [projectPipeline, setProjectPipeline] = useState<IPipeline>();

  const getProjectPipelineDetail = async () => {
    setLoadingData(true);
    const { success, data }: ApiResponse<IPipeline> = await getPipelineDetail({
      id: id ?? '',
      pid: pid ?? '',
    });
    if (success) {
      setProjectPipeline(data);
      setLoadingData(false);
    }
  };

  const getProjectDetailById = async () => {
    setLoadingData(true);
    try {
      const { success, data }: ApiResponse<IProject> = await getProjectDetail({
        id: pid ?? '',
      });
      if (success) {
        setProjectInfo(data);
        setLoadingData(false);
      }
    } catch (error) {
      setLoadingData(false);
    }
  };

  const breadcrumbItems = [
    {
      text: t('breadCrumb.projects'),
      href: '/projects',
    },
    {
      text: projectInfo?.name ?? '',
      href: `/project/detail/${pid}`,
    },
    {
      text: projectPipeline?.name || '',
      href: '/',
    },
  ];

  useEffect(() => {
    getProjectPipelineDetail();
    getProjectDetailById();
  }, []);

  return (
    <AppLayout
      content={
        <ContentLayout
          header={
            <SpaceBetween size="m">
              <Header variant="h1" info={<InfoLink />}>
                {projectPipeline?.name}
              </Header>
            </SpaceBetween>
          }
        >
          {loadingData ? (
            <Loading />
          ) : (
            <SpaceBetween direction="vertical" size="l">
              <BasicInfo pipelineInfo={projectPipeline} />
              <Container disableContentPaddings>
                <Tabs
                  tabs={[
                    {
                      label: t('pipeline:detail.ingestion'),
                      id: 'ingestion',
                      content: (
                        <div className="pd-20">
                          <Ingestion pipelineInfo={projectPipeline} />
                        </div>
                      ),
                    },
                    {
                      label: t('pipeline:detail.processing'),
                      id: 'processing',
                      content: (
                        <div className="pd-20">
                          <Processing pipelineInfo={projectPipeline} />
                        </div>
                      ),
                    },
                    {
                      label: t('pipeline:detail.reporting'),
                      id: 'reporting',
                      content: (
                        <div className="pd-20">
                          <Reporting pipelineInfo={projectPipeline} />
                        </div>
                      ),
                    },
                    {
                      label: t('pipeline:detail.monitoring'),
                      id: 'monitoring',
                      content: (
                        <div className="pd-20">
                          <Monitoring pipelineInfo={projectPipeline} />
                        </div>
                      ),
                    },
                    {
                      label: t('pipeline:detail.alarms'),
                      id: 'alarms',
                      content: (
                        <div className="pd-20">
                          <Alarms pipelineInfo={projectPipeline} />
                        </div>
                      ),
                    },
                  ]}
                />
              </Container>
            </SpaceBetween>
          )}
        </ContentLayout>
      }
      headerSelector="#header"
      breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
      navigation={<Navigation activeHref="/pipelines" />}
    />
  );
};

export default PipelineDetail;
