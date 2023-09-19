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
  ContentLayout,
  FormField,
  Header,
  Link,
  Popover,
  Select,
  SelectProps,
} from '@cloudscape-design/components';
import {
  getMetadataUserAttributesList,
  getMetadataParametersList,
  getMetadataEventsList,
  getPipelineDetailByProjectId,
  warmup,
  clean,
  getPathNodes,
} from 'apis/analytics';
import Loading from 'components/common/Loading';
import { CategoryItemType } from 'components/eventselect/AnalyticsType';
import AnalyticsNavigation from 'components/layouts/AnalyticsNavigation';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { MetadataSource } from 'ts/explore-types';
import {
  metadataEventsConvertToCategoryItemType,
  getWarmUpParameters,
  parametersConvertToCategoryItemType,
} from '../analytics-utils';
import AnalyticsEvent from '../event/AnalyticsEvent';
import AnalyticsFunnel from '../funnel/AnalyticsFunnel';
import AnalyticsPath from '../path/AnalyticsPath';
import AnalyticsRetention from '../retention/AnalyticsRetention';

const AnalyticsExplore: React.FC = () => {
  const { t } = useTranslation();
  const { projectId, appId } = useParams();

  const [selectedOption, setSelectedOption] =
    useState<SelectProps.Option | null>({
      label: t('analytics:explore.funnelAnalysis') ?? '',
      value: 'Funnel',
    });

  const analyticsModelOptions: SelectProps.Options = [
    {
      label: t('analytics:explore.exploitativeAnalytics') ?? '',
      options: [
        { label: t('analytics:explore.funnelAnalysis') ?? '', value: 'Funnel' },
        { label: t('analytics:explore.eventAnalysis') ?? '', value: 'Event' },
        { label: t('analytics:explore.pathAnalysis') ?? '', value: 'Path' },
        {
          label: t('analytics:explore.retentionAnalysis') ?? '',
          value: 'Retention',
        },
      ],
    },
    {
      label: t('analytics:explore.userAnalytics') ?? '',
      disabled: true,
      options: [
        { label: t('analytics:explore.userSearch') ?? '', value: 'UserSearch' },
      ],
    },
  ];

  const breadcrumbItems = [
    {
      text: t('breadCrumb.analytics'),
      href: '/analytics',
    },
    {
      text: t('breadCrumb.explore'),
      href: `/analytics/${projectId}/app/${appId}/explore`,
    },
  ];

  const [pipeline, setPipeline] = useState<IPipeline | null>(null);
  const [metadataEvents, setMetadataEvents] = useState<IMetadataEvent[]>([]);
  const [metadataEventParameters, setMetadataEventParameters] = useState<
    IMetadataEventParameter[]
  >([]);
  const [metadataUserAttributes, setMetadataUserAttributes] = useState<
    IMetadataUserAttribute[]
  >([]);

  const [categoryEvents, setCategoryEvents] = useState(
    [] as CategoryItemType[]
  );

  const [presetParameters, setPresetParameters] = useState<CategoryItemType[]>(
    []
  );

  const [pathNodes, setPathNodes] = useState<{
    pageTitles: IMetadataAttributeValue[];
    pageUrls: IMetadataAttributeValue[];
    screenNames: IMetadataAttributeValue[];
    screenIds: IMetadataAttributeValue[];
  }>({
    pageTitles: [],
    pageUrls: [],
    screenNames: [],
    screenIds: [],
  });

  const getAllPathNodes = async () => {
    try {
      const { success, data }: ApiResponse<any> = await getPathNodes(
        projectId ?? '',
        appId ?? ''
      );
      if (success) {
        setPathNodes(data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getUserAttributes = async () => {
    try {
      const {
        success,
        data,
      }: ApiResponse<ResponseTableData<IMetadataUserAttribute>> =
        await getMetadataUserAttributesList({
          projectId: projectId ?? '',
          appId: appId ?? '',
        });
      if (success) {
        setMetadataUserAttributes(data.items);
        return data.items;
      }
      return [];
    } catch (error) {
      return [];
    }
  };

  const getAllParameters = async () => {
    try {
      const {
        success,
        data,
      }: ApiResponse<ResponseTableData<IMetadataEventParameter>> =
        await getMetadataParametersList({
          projectId: projectId ?? '',
          appId: appId ?? '',
        });
      if (success) {
        setMetadataEventParameters(data.items);
        return data.items;
      }
    } catch (error) {
      console.log(error);
      return [];
    }
  };

  const listMetadataEvents = async () => {
    try {
      const { success, data }: ApiResponse<ResponseTableData<IMetadataEvent>> =
        await getMetadataEventsList({
          projectId: projectId ?? '',
          appId: appId ?? '',
          attribute: true,
        });
      if (success) {
        setMetadataEvents(data.items);
        const events = metadataEventsConvertToCategoryItemType(data.items);
        setCategoryEvents(events);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const loadPipeline = async () => {
    try {
      const { success, data }: ApiResponse<IPipeline> =
        await getPipelineDetailByProjectId(projectId ?? '');
      if (success) {
        setPipeline(data);
        const params = getWarmUpParameters(projectId ?? '', appId ?? '', data);
        if (params) {
          await warmup(params);
          await clean(params.dashboardCreateParameters.region);
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const listAllAttributes = async () => {
    try {
      const parameters = await getAllParameters();
      const presetParameters = parameters?.filter(
        (item) => item.metadataSource === MetadataSource.PRESET
      );
      const userAttributes = await getUserAttributes();
      const presetUserAttributes = userAttributes.filter(
        (item) => item.metadataSource === MetadataSource.PRESET
      );
      const conditionOptions = parametersConvertToCategoryItemType(
        presetUserAttributes,
        presetParameters
      );
      setPresetParameters(conditionOptions);
    } catch (error) {
      console.log(error);
    }
  };

  const loadData = () => {
    loadPipeline();
    listMetadataEvents();
    listAllAttributes();
    if (selectedOption?.value === 'Path') {
      getAllPathNodes();
    }
  };

  useEffect(() => {
    if (projectId && appId) {
      loadData();
    }
  }, [projectId, appId]);

  return (
    <div className="flex">
      <AnalyticsNavigation
        activeHref={`/analytics/${projectId}/app/${appId}/explore`}
      />
      <div className="flex-1">
        <AppLayout
          toolsHide
          navigationHide
          content={
            <ContentLayout
              header={
                <Header
                  variant="h1"
                  info={
                    <Popover
                      triggerType="custom"
                      content={t('analytics:information.exploreInfo')}
                    >
                      <Link variant="info">Info</Link>
                    </Popover>
                  }
                  description={t('analytics:explore.description')}
                  actions={
                    <FormField
                      label={
                        <>
                          {t('analytics:explore.analyticsModel')} &nbsp;
                          <Popover
                            triggerType="custom"
                            content={t(
                              'analytics:information.analyticsModelInfo'
                            )}
                          >
                            <Link variant="info">Info</Link>
                          </Popover>
                        </>
                      }
                    >
                      <Select
                        selectedOption={selectedOption}
                        onChange={({ detail }) =>
                          setSelectedOption(detail.selectedOption)
                        }
                        options={analyticsModelOptions}
                      />
                    </FormField>
                  }
                >
                  {t('analytics:explore.title')}
                </Header>
              }
            >
              {!pipeline && <Loading />}
              {pipeline && selectedOption?.value === 'Funnel' && (
                <AnalyticsFunnel
                  loading={false}
                  loadFunc={loadData}
                  pipeline={pipeline}
                  metadataEvents={metadataEvents}
                  metadataEventParameters={metadataEventParameters}
                  metadataUserAttributes={metadataUserAttributes}
                  categoryEvents={categoryEvents}
                  presetParameters={presetParameters}
                />
              )}
              {pipeline && selectedOption?.value === 'Event' && (
                <AnalyticsEvent
                  loading={false}
                  loadFunc={loadData}
                  pipeline={pipeline}
                  metadataEvents={metadataEvents}
                  metadataEventParameters={metadataEventParameters}
                  metadataUserAttributes={metadataUserAttributes}
                  categoryEvents={categoryEvents}
                  presetParameters={presetParameters}
                />
              )}
              {pipeline && selectedOption?.value === 'Path' && (
                <AnalyticsPath
                  loading={false}
                  loadFunc={loadData}
                  pipeline={pipeline}
                  metadataEvents={metadataEvents}
                  metadataEventParameters={metadataEventParameters}
                  metadataUserAttributes={metadataUserAttributes}
                  categoryEvents={categoryEvents}
                  presetParameters={presetParameters}
                  nodes={pathNodes}
                />
              )}
              {pipeline && selectedOption?.value === 'Retention' && (
                <AnalyticsRetention
                  loading={false}
                  loadFunc={loadData}
                  pipeline={pipeline}
                  metadataEvents={metadataEvents}
                  metadataEventParameters={metadataEventParameters}
                  metadataUserAttributes={metadataUserAttributes}
                  categoryEvents={categoryEvents}
                  presetParameters={presetParameters}
                />
              )}
            </ContentLayout>
          }
          breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
          headerSelector="#header"
        />
      </div>
    </div>
  );
};

export default AnalyticsExplore;
