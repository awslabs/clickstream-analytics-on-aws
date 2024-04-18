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
import { getPipelineDetail, getPipelineExtend } from 'apis/pipeline';
import { getProjectDetail } from 'apis/project';
import Loading from 'components/common/Loading';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import Navigation from 'components/layouts/Navigation';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router-dom';
import { defaultStr } from 'ts/utils';
import Alarms from './comps/Alarms';
import Ingestion from './comps/Ingestion';
import Monitoring from './comps/Monitoring';
import Processing from './comps/Processing';
import Reporting from './comps/Reporting';
import Tags from './comps/Tags';
import BasicInfo from '../comps/BasicInfo';

const PipelineDetail: React.FC = () => {
  const { t } = useTranslation();
  const { pid } = useParams();
  const location = useLocation();
  const [loadingData, setLoadingData] = useState(true);
  const [projectInfo, setProjectInfo] = useState<IProject>();
  const [projectPipeline, setProjectPipeline] = useState<IExtPipeline>();
  const [projectPipelineExtend, setProjectPipelineExtend] =
    useState<IPipelineExtend>();
  const [loadingPipeline, setLoadingPipeline] = useState(false);
  const [loadingPipelineExtend, setLoadingPipelineExtend] = useState(false);

  const { activeTab } = location.state || {};
  const [detailActiveTab, setDetailActiveTab] = useState(
    activeTab || 'ingestion'
  );

  const getProjectPipelineDetail = async (refresh: string) => {
    try {
      setLoadingPipeline(true);
      const { success, data }: ApiResponse<IExtPipeline> =
        await getPipelineDetail({
          projectId: defaultStr(pid),
          refresh,
        });
      if (success) {
        setProjectPipeline(data);
        setLoadingData(false);
        setLoadingPipeline(false);
      }
    } catch (error) {
      setLoadingPipeline(false);
    }
  };

  const getProjectPipelineExtend = async () => {
    try {
      setLoadingPipelineExtend(true);
      const { success, data }: ApiResponse<IPipelineExtend> =
        await getPipelineExtend({
          projectId: defaultStr(pid),
        });
      if (success) {
        setProjectPipelineExtend(data);
      }
      setLoadingPipelineExtend(false);
    } catch (error) {
      setLoadingPipelineExtend(false);
    }
  };

  const getProjectDetailById = async () => {
    setLoadingData(true);
    try {
      const { success, data }: ApiResponse<IProject> = await getProjectDetail({
        id: defaultStr(pid),
      });
      if (success) {
        setProjectInfo(data);
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
      text: defaultStr(projectInfo?.name),
      href: `/project/detail/${pid}`,
    },
    {
      text: defaultStr(projectPipeline?.pipelineId),
      href: '/',
    },
  ];

  useEffect(() => {
    getProjectPipelineDetail('false');
    getProjectDetailById();
    getProjectPipelineExtend();
  }, []);

  return (
    <AppLayout
      toolsHide
      content={
        <ContentLayout
          header={
            <SpaceBetween size="m">
              <Header variant="h1">{projectPipeline?.pipelineId}</Header>
            </SpaceBetween>
          }
        >
          {loadingData ? (
            <Loading />
          ) : (
            <SpaceBetween direction="vertical" size="l">
              <BasicInfo
                pipelineInfo={projectPipeline}
                projectPipelineExtend={projectPipelineExtend}
                loadingRefresh={loadingPipeline}
                loadingPipelineExtend={loadingPipelineExtend}
                reloadPipeline={(refresh: string) => {
                  getProjectPipelineDetail(refresh);
                }}
              />
              <Container disableContentPaddings>
                <Tabs
                  activeTabId={detailActiveTab}
                  onChange={(e) => {
                    setDetailActiveTab(e.detail.activeTabId);
                  }}
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
                          <Processing
                            pipelineInfo={projectPipeline}
                            pipelineExtend={projectPipelineExtend}
                            displayPipelineExtend={true}
                          />
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
                    {
                      label: t('pipeline:detail.tags'),
                      id: 'tags',
                      content: (
                        <div className="pd-20">
                          <Tags pipelineInfo={projectPipeline} />
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
