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
  Select,
  SelectProps,
  SpaceBetween,
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
import HelpInfo from 'components/layouts/HelpInfo';
import { DispatchContext, StateContext } from 'context/StateContext';
import { HelpInfoActionType, HelpPanelType } from 'context/reducer';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { MetadataParameterType, MetadataSource } from 'ts/explore-types';
import { defaultStr } from 'ts/utils';
import {
  metadataEventsConvertToCategoryItemType,
  getWarmUpParameters,
  parametersConvertToCategoryItemType,
} from '../analytics-utils';
import AnalyticsCustomHeader from '../comps/AnalyticsCustomHeader';
import AnalyticsCustomHeaderBg from '../comps/AnalyticsCustomHeaderBg';
import AnalyticsEvent from '../event/AnalyticsEvent';
import AnalyticsFunnel from '../funnel/AnalyticsFunnel';
import AnalyticsPath from '../path/AnalyticsPath';
import AnalyticsRetention from '../retention/AnalyticsRetention';

const AnalyticsExplore: React.FC = () => {
  const { t } = useTranslation();
  const { projectId, appId } = useParams();
  const [headerHeight, setHeaderHeight] = useState(100);
  const dispatch = useContext(DispatchContext);
  const state = useContext(StateContext);
  const [selectedOption, setSelectedOption] =
    useState<SelectProps.Option | null>({
      label: defaultStr(t('analytics:explore.eventAnalysis')),
      value: 'Event',
    });

  const analyticsModelOptions: SelectProps.Options = [
    {
      label: defaultStr(t('analytics:explore.exploitativeAnalytics')),
      options: [
        {
          label: defaultStr(t('analytics:explore.eventAnalysis')),
          value: 'Event',
        },
        {
          label: defaultStr(t('analytics:explore.funnelAnalysis')),
          value: 'Funnel',
        },
        {
          label: defaultStr(t('analytics:explore.pathAnalysis')),
          value: 'Path',
        },
        {
          label: defaultStr(t('analytics:explore.retentionAnalysis')),
          value: 'Retention',
        },
      ],
    },
  ];

  const breadcrumbItems = [
    {
      text: t('breadCrumb.analyticsStudio'),
      href: '/analytics',
    },
    {
      text: t('breadCrumb.explore'),
      href: `/analytics/${projectId}/app/${appId}/explore`,
    },
  ];

  const [pipeline, setPipeline] = useState<IPipeline | null>(null);
  const [loadingMetadataEvent, setLoadingMetadataEvent] = useState(false);
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

  const [groupParameters, setGroupParameters] = useState<CategoryItemType[]>(
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
        defaultStr(projectId),
        defaultStr(appId)
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
          projectId: defaultStr(projectId),
          appId: defaultStr(appId),
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
          projectId: defaultStr(projectId),
          appId: defaultStr(appId),
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
    setLoadingMetadataEvent(true);
    try {
      const { success, data }: ApiResponse<ResponseTableData<IMetadataEvent>> =
        await getMetadataEventsList({
          projectId: defaultStr(projectId),
          appId: defaultStr(appId),
          attribute: true,
        });
      if (success) {
        setMetadataEvents(data.items);
        const events = metadataEventsConvertToCategoryItemType(data.items);
        setCategoryEvents(events);
      }
      setLoadingMetadataEvent(false);
    } catch (error) {
      setLoadingMetadataEvent(false);
      console.log(error);
    }
  };

  const loadPipeline = async () => {
    try {
      const { success, data }: ApiResponse<IPipeline> =
        await getPipelineDetailByProjectId(defaultStr(projectId));
      if (success) {
        setPipeline(data);
        const params = getWarmUpParameters(
          defaultStr(projectId),
          defaultStr(appId),
          data
        );
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
      const publicParameters = parameters?.filter(
        (item) => item.parameterType === MetadataParameterType.PUBLIC
      );
      const userAttributes = await getUserAttributes();
      const presetUserAttributes = userAttributes.filter((item) => {
        return item.metadataSource === MetadataSource.PRESET;
      });
      const conditionOptions = parametersConvertToCategoryItemType(
        presetUserAttributes,
        publicParameters ?? []
      );
      setPresetParameters(conditionOptions);
      const groupOptions = parametersConvertToCategoryItemType(
        presetUserAttributes,
        parameters ?? []
      );
      setGroupParameters(groupOptions);
    } catch (error) {
      console.log(error);
    }
  };

  const loadData = () => {
    loadPipeline();
    listMetadataEvents();
    listAllAttributes();
  };

  useEffect(() => {
    if (projectId && appId) {
      loadData();
    }
  }, [projectId, appId]);

  useEffect(() => {
    if (projectId && appId && selectedOption?.value === 'Path') {
      getAllPathNodes();
    }
  }, [selectedOption]);

  return (
    <div className="flex">
      <AnalyticsNavigation
        activeHref={`/analytics/${projectId}/app/${appId}/explore`}
      />
      <div className="flex-1">
        <AppLayout
          toolsOpen={state?.showHelpPanel}
          onToolsChange={(e) => {
            if (state?.helpPanelType === HelpPanelType.NONE) {
              return;
            }
            if (!e.detail.open) {
              dispatch?.({ type: HelpInfoActionType.HIDE_HELP_PANEL });
            } else {
              dispatch?.({
                type: HelpInfoActionType.SHOW_HELP_PANEL,
                payload: state?.helpPanelType,
              });
            }
          }}
          tools={<HelpInfo />}
          navigationHide
          content={
            <ContentLayout
              header={<AnalyticsCustomHeaderBg height={headerHeight} />}
            >
              <AnalyticsCustomHeader
                updateContentHeader={(height) => {
                  setHeaderHeight(height);
                }}
                headerText={defaultStr(t('analytics:explore.title'))}
                descriptionText={t('analytics:explore.description')}
              >
                <div className="mt-20 flex align-center">
                  <FormField
                    label={
                      <SpaceBetween direction="horizontal" size="xxs">
                        <div className="white-title">
                          {t('analytics:explore.analyticsModel')}
                        </div>
                      </SpaceBetween>
                    }
                  ></FormField>
                  <div className="ml-10" style={{ minWidth: 220 }}>
                    <Select
                      disabled={!pipeline}
                      selectedOption={selectedOption}
                      onChange={({ detail }) => {
                        dispatch?.({
                          type: HelpInfoActionType.HIDE_HELP_PANEL,
                        });
                        setSelectedOption(detail.selectedOption);
                      }}
                      options={analyticsModelOptions}
                    />
                  </div>
                </div>
              </AnalyticsCustomHeader>
              {!pipeline && <Loading />}
              {pipeline && selectedOption?.value === 'Funnel' && (
                <AnalyticsFunnel
                  loadingEvents={loadingMetadataEvent}
                  loading={false}
                  loadFunc={loadData}
                  pipeline={pipeline}
                  metadataEvents={metadataEvents}
                  metadataEventParameters={metadataEventParameters}
                  metadataUserAttributes={metadataUserAttributes}
                  categoryEvents={categoryEvents}
                  presetParameters={presetParameters}
                  groupParameters={groupParameters}
                />
              )}
              {pipeline && selectedOption?.value === 'Event' && (
                <AnalyticsEvent
                  loadingEvents={loadingMetadataEvent}
                  loading={false}
                  loadFunc={loadData}
                  pipeline={pipeline}
                  metadataEvents={metadataEvents}
                  metadataEventParameters={metadataEventParameters}
                  metadataUserAttributes={metadataUserAttributes}
                  categoryEvents={categoryEvents}
                  presetParameters={presetParameters}
                  groupParameters={groupParameters}
                />
              )}
              {pipeline && selectedOption?.value === 'Path' && (
                <AnalyticsPath
                  loadingEvents={loadingMetadataEvent}
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
                  pipeline={pipeline}
                  metadataEvents={metadataEvents}
                  metadataUserAttributes={metadataUserAttributes}
                  categoryEvents={categoryEvents}
                  presetParameters={presetParameters}
                  groupParameters={groupParameters}
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
