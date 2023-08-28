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
  Box,
  Button,
  ColumnLayout,
  Container,
  ContentLayout,
  DateRangePickerProps,
  Header,
  Select,
  SelectProps,
  SpaceBetween,
} from '@cloudscape-design/components';
import { createEmbeddingContext } from 'amazon-quicksight-embedding-sdk';
import {
  fetchEmbeddingUrl,
  getMetadataEventDetails,
  getMetadataEventsList,
  getMetadataParametersList,
  getMetadataUserAttributesList,
  getPipelineDetailByProjectId,
  previewEvent,
} from 'apis/analytics';
import Loading from 'components/common/Loading';
import {
  CategoryItemType,
  DEFAULT_CONDITION_DATA,
  DEFAULT_EVENT_ITEM,
  IEventAnalyticsItem,
  INIT_SEGMENTATION_DATA,
  SegmentationFilterDataType,
} from 'components/eventselect/AnalyticsType';
import EventsSelect from 'components/eventselect/EventSelect';
import SegmentationFilter from 'components/eventselect/SegmentationFilter';
import Navigation from 'components/layouts/Navigation';
import { cloneDeep } from 'lodash';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { COMMON_ALERT_TYPE } from 'ts/const';
import {
  ExploreComputeMethod,
  ExploreFunnelRequestAction,
  MetadataSource,
  MetadataValueType,
} from 'ts/explore-types';
import { alertMsg, generateStr } from 'ts/utils';
import {
  getDashboardCreateParameters,
  getDateRange,
  getEventAndConditions,
  getFirstEventAndConditions,
  metadataEventsConvertToCategoryItemType,
  parametersConvertToCategoryItemType,
  validEventAnalyticsItem,
} from '../analytics-utils';
import ExploreDateRangePicker from '../comps/ExploreDateRangePicker';
import SaveToDashboardModal from '../comps/SelectDashboardModal';

const AnalyticsEvent: React.FC = () => {
  const { t } = useTranslation();
  const { projectId, appId } = useParams();
  const [loadingData, setLoadingData] = useState(false);
  const [loadingChart, setLoadingChart] = useState(false);
  const [selectDashboardModalVisible, setSelectDashboardModalVisible] =
    useState(false);
  const [emptyData, setEmptyData] = useState(true);
  const [pipeline, setPipeline] = useState({} as IPipeline);
  const [metadataEvents, setMetadataEvents] = useState(
    [] as CategoryItemType[]
  );

  const defaultComputeMethodOption: SelectProps.Option = {
    value: ExploreComputeMethod.USER_CNT,
    label: t('analytics:options.userNumber') ?? '',
  };

  const computeMethodOptions: SelectProps.Options = [
    {
      value: ExploreComputeMethod.EVENT_CNT,
      label: t('analytics:options.eventNumber') ?? '',
    },
    defaultComputeMethodOption,
  ];
  const [selectedMetric, setSelectedMetric] =
    useState<SelectProps.Option | null>(defaultComputeMethodOption);

  const [eventOptionData, setEventOptionData] = useState<IEventAnalyticsItem[]>(
    [
      {
        ...DEFAULT_EVENT_ITEM,
        isMultiSelect: false,
      },
    ]
  );

  const [segmentationOptionData, setSegmentationOptionData] =
    useState<SegmentationFilterDataType>(INIT_SEGMENTATION_DATA);

  const getEmbeddingUrl = async (
    dashboardId: string,
    sheetId: string | undefined,
    visualId: string | undefined,
    containerId: string
  ) => {
    try {
      const { success, data }: ApiResponse<any> = await fetchEmbeddingUrl(
        pipeline.region,
        window.location.origin,
        dashboardId,
        sheetId,
        visualId
      );
      if (success) {
        const embedDashboard = async () => {
          const embeddingContext = await createEmbeddingContext();
          await embeddingContext.embedVisual({
            url: data.EmbedUrl,
            container: containerId,
          });
        };
        embedDashboard();
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getUserAttributes = async () => {
    try {
      if (!projectId || !appId) {
        return [];
      }
      const {
        success,
        data,
      }: ApiResponse<ResponseTableData<IMetadataUserAttribute>> =
        await getMetadataUserAttributesList({ projectId, appId });
      if (success) {
        return data.items;
      }
      return [];
    } catch (error) {
      return [];
    }
  };

  const getAllParameters = async () => {
    if (!projectId || !appId) {
      return [];
    }
    try {
      const {
        success,
        data,
      }: ApiResponse<ResponseTableData<IMetadataEventParameter>> =
        await getMetadataParametersList({ projectId, appId });
      if (success) {
        return data.items;
      }
    } catch (error) {
      console.log(error);
      return [];
    }
  };

  const getEventParameters = async (eventName: string | undefined) => {
    if (!projectId || !appId || !eventName) {
      return [];
    }
    try {
      const { success, data }: ApiResponse<IMetadataEvent> =
        await getMetadataEventDetails({
          projectId: projectId,
          appId: appId,
          eventName: eventName,
        });
      if (success) {
        return data.associatedParameters ?? [];
      }
    } catch (error) {
      console.log(error);
      return [];
    }
  };

  const listMetadataEvents = async () => {
    if (!projectId || !appId) {
      return;
    }
    try {
      const { success, data }: ApiResponse<ResponseTableData<IMetadataEvent>> =
        await getMetadataEventsList({ projectId, appId });
      if (success) {
        const events = metadataEventsConvertToCategoryItemType(data.items);
        setMetadataEvents(events);
      }
    } catch (error) {
      console.log(error);
      return;
    }
  };

  const loadPipeline = async () => {
    if (!projectId) {
      return;
    }
    setLoadingData(true);
    try {
      const { success, data }: ApiResponse<IPipeline> =
        await getPipelineDetailByProjectId(projectId);
      if (success) {
        setPipeline(data);
      }
    } catch (error) {
      console.log(error);
    }
    setLoadingData(false);
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
        presetParameters,
        []
      );
      setSegmentationOptionData((prev) => {
        const dataObj = cloneDeep(prev);
        dataObj.conditionOptions = conditionOptions;
        return dataObj;
      });
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    loadPipeline();
    listMetadataEvents();
    listAllAttributes();
  }, [projectId]);

  const [dateRangeValue, setDateRangeValue] =
    React.useState<DateRangePickerProps.Value>({
      type: 'relative',
      amount: 7,
      unit: 'day',
    });

  const resetConfig = async () => {
    setLoadingData(true);
    setSelectedMetric({
      value: ExploreComputeMethod.USER_CNT,
      label: t('analytics:options.userNumber') ?? '',
    });
    setEventOptionData([
      {
        ...DEFAULT_EVENT_ITEM,
        isMultiSelect: false,
      },
    ]);
    setSegmentationOptionData(INIT_SEGMENTATION_DATA);
    setDateRangeValue({
      type: 'relative',
      amount: 7,
      unit: 'day',
    });
    await listMetadataEvents();
    await listAllAttributes();
    setLoadingData(false);
  };

  const saveToDashboard = async (
    dashboardId: string,
    dashboardName: string,
    sheetId: string,
    sheetName: string
  ) => {
    if (
      eventOptionData.length === 0 ||
      !validEventAnalyticsItem(eventOptionData[0])
    ) {
      return;
    }
    try {
      const body = getEventRequest(
        ExploreFunnelRequestAction.PUBLISH,
        dashboardId,
        dashboardName,
        sheetId,
        sheetName
      );
      if (!body) {
        alertMsg(
          t('analytics:valid.funnelPipelineVersionError'),
          COMMON_ALERT_TYPE.Error as AlertType
        );
        return;
      }
      setLoadingData(true);
      const { success }: ApiResponse<any> = await previewEvent(body);
      if (success) {
        setSelectDashboardModalVisible(false);
      }
    } catch (error) {
      console.log(error);
    }
    setLoadingData(false);
  };

  const getEventRequest = (
    action: ExploreFunnelRequestAction,
    dashboardId?: string,
    dashboardName?: string,
    sheetId?: string,
    sheetName?: string
  ) => {
    const eventId = generateStr(6);
    const parameters = getDashboardCreateParameters(pipeline);
    if (!parameters) {
      return;
    }
    const dateRangeParams = getDateRange(dateRangeValue);
    let saveParams = {};
    if (action === ExploreFunnelRequestAction.PUBLISH) {
      saveParams = {
        dashboardId: dashboardId,
        dashboardName: dashboardName,
        sheetId: sheetId,
        sheetName: sheetName,
      };
    }
    const body: IFunnelRequest = {
      action: action,
      projectId: pipeline.projectId,
      pipelineId: pipeline.pipelineId,
      appId: appId ?? '',
      sheetName: `event_sheet_${eventId}`,
      viewName: `event_view_${eventId}`,
      dashboardCreateParameters: parameters,
      computeMethod: selectedMetric?.value ?? ExploreComputeMethod.USER_CNT,
      joinColumn: 'user_pseudo_id',
      eventAndConditions: getEventAndConditions(eventOptionData),
      firstEventExtraCondition: getFirstEventAndConditions(
        eventOptionData,
        segmentationOptionData
      ),
      timeScopeType: dateRangeParams?.timeScopeType,
      groupColumn: dateRangeParams?.groupColumn,
      ...dateRangeParams,
      ...saveParams,
    };
    return body;
  };

  const clickPreview = async () => {
    if (
      eventOptionData.length === 0 ||
      !validEventAnalyticsItem(eventOptionData[0])
    ) {
      return;
    }
    try {
      const body = getEventRequest(ExploreFunnelRequestAction.PREVIEW);
      if (!body) {
        alertMsg(
          t('analytics:valid.funnelPipelineVersionError'),
          COMMON_ALERT_TYPE.Error as AlertType
        );
        return;
      }
      setLoadingData(true);
      setEmptyData(false);
      setLoadingChart(true);
      const { success, data }: ApiResponse<any> = await previewEvent(body);
      if (success) {
        getEmbeddingUrl(
          data.dashboardId,
          data.sheetId,
          data.visualIds[0],
          '#qs-event-container'
        );
        getEmbeddingUrl(
          data.dashboardId,
          data.sheetId,
          data.visualIds[1],
          '#qs-event-table-container'
        );
      }
    } catch (error) {
      console.log(error);
    }
    setLoadingData(false);
    setLoadingChart(false);
  };

  return (
    <AppLayout
      toolsHide
      content={
        <>
          <ContentLayout
            header={
              <SpaceBetween size="m">
                <Header variant="h1">{t('nav.analytics.exploreEvent')}</Header>
              </SpaceBetween>
            }
          >
            <SpaceBetween direction="vertical" size="l">
              <Container
                header={
                  <Header
                    variant="h2"
                    actions={
                      <SpaceBetween direction="horizontal" size="xs">
                        <Button
                          iconName="refresh"
                          onClick={resetConfig}
                          loading={loadingData}
                        >
                          {t('analytics:button.reset')}
                        </Button>
                        <Button
                          variant="primary"
                          loading={loadingData}
                          onClick={() => {
                            setSelectDashboardModalVisible(true);
                          }}
                        >
                          {t('analytics:button.save')}
                        </Button>
                      </SpaceBetween>
                    }
                  >
                    {t('analytics:header.configurations')}
                  </Header>
                }
              >
                <div className="cs-analytics-config">
                  <SpaceBetween direction="vertical" size="xs">
                    <Box variant="awsui-key-label">
                      {t('analytics:labels.metrics')}
                    </Box>
                    <div className="cs-analytics-config">
                      <Select
                        selectedOption={selectedMetric}
                        options={computeMethodOptions}
                        onChange={(event) => {
                          setSelectedMetric(event.detail.selectedOption);
                        }}
                      />
                    </div>
                  </SpaceBetween>
                </div>
                <br />
                <SpaceBetween direction="vertical" size="xs">
                  <Box variant="awsui-key-label">
                    {t('analytics:labels.dateRange')}
                  </Box>
                  <ExploreDateRangePicker
                    dateRangeValue={dateRangeValue}
                    setDateRangeValue={setDateRangeValue}
                  />
                </SpaceBetween>
                <br />
                <ColumnLayout columns={2} variant="text-grid">
                  <SpaceBetween direction="vertical" size="xs">
                    <Box variant="awsui-key-label">
                      {t('analytics:labels.eventsSelect')}
                    </Box>
                    <div>
                      <EventsSelect
                        data={eventOptionData}
                        eventOptionList={metadataEvents}
                        addEventButtonLabel={t('common:button.addEvent')}
                        addNewEventAnalyticsItem={() => {
                          setEventOptionData((prev) => {
                            const preEventList = cloneDeep(prev);
                            return [
                              ...preEventList,
                              {
                                ...DEFAULT_EVENT_ITEM,
                                isMultiSelect: false,
                              },
                            ];
                          });
                        }}
                        removeEventItem={(index) => {
                          setEventOptionData((prev) => {
                            const dataObj = cloneDeep(prev);
                            return dataObj.filter(
                              (item, eIndex) => eIndex !== index
                            );
                          });
                        }}
                        addNewConditionItem={(index: number) => {
                          setEventOptionData((prev) => {
                            const dataObj = cloneDeep(prev);
                            dataObj[index].conditionList.push(
                              DEFAULT_CONDITION_DATA
                            );
                            return dataObj;
                          });
                        }}
                        removeEventCondition={(eventIndex, conditionIndex) => {
                          setEventOptionData((prev) => {
                            const dataObj = cloneDeep(prev);
                            const newCondition = dataObj[
                              eventIndex
                            ].conditionList.filter(
                              (item, i) => i !== conditionIndex
                            );
                            dataObj[eventIndex].conditionList = newCondition;
                            return dataObj;
                          });
                        }}
                        changeConditionCategoryOption={(
                          eventIndex,
                          conditionIndex,
                          category
                        ) => {
                          setEventOptionData((prev) => {
                            const dataObj = cloneDeep(prev);
                            dataObj[eventIndex].conditionList[
                              conditionIndex
                            ].conditionOption = category;
                            if (
                              category?.valueType === MetadataValueType.STRING
                            ) {
                              dataObj[eventIndex].conditionList[
                                conditionIndex
                              ].conditionValue = [];
                            } else {
                              dataObj[eventIndex].conditionList[
                                conditionIndex
                              ].conditionValue = '';
                            }
                            return dataObj;
                          });
                        }}
                        changeConditionOperator={(
                          eventIndex,
                          conditionIndex,
                          operator
                        ) => {
                          setEventOptionData((prev) => {
                            const dataObj = cloneDeep(prev);
                            dataObj[eventIndex].conditionList[
                              conditionIndex
                            ].conditionOperator = operator;
                            return dataObj;
                          });
                        }}
                        changeConditionValue={(
                          eventIndex,
                          conditionIndex,
                          value
                        ) => {
                          setEventOptionData((prev) => {
                            const dataObj = cloneDeep(prev);
                            dataObj[eventIndex].conditionList[
                              conditionIndex
                            ].conditionValue = value;
                            return dataObj;
                          });
                        }}
                        changeCurCalcMethodOption={(eventIndex, method) => {
                          setEventOptionData((prev) => {
                            const dataObj = cloneDeep(prev);
                            dataObj[eventIndex].calculateMethodOption = method;
                            return dataObj;
                          });
                        }}
                        changeCurCategoryOption={async (
                          eventIndex,
                          category
                        ) => {
                          const eventName = category?.value;
                          const eventParameters = await getEventParameters(
                            eventName
                          );
                          const userAttributes = await getUserAttributes();
                          const parameterOption =
                            parametersConvertToCategoryItemType(
                              userAttributes,
                              [],
                              eventParameters
                            );
                          setEventOptionData((prev) => {
                            const dataObj = cloneDeep(prev);
                            dataObj[eventIndex].selectedEventOption = category;
                            dataObj[eventIndex].conditionOptions =
                              parameterOption;
                            return dataObj;
                          });
                        }}
                        changeCurRelationShip={(eventIndex, relation) => {
                          setEventOptionData((prev) => {
                            const dataObj = cloneDeep(prev);
                            dataObj[eventIndex].conditionRelationShip =
                              relation;
                            return dataObj;
                          });
                        }}
                      />
                    </div>
                  </SpaceBetween>
                  <SpaceBetween direction="vertical" size="xs">
                    <Box variant="awsui-key-label">
                      {t('analytics:labels.filters')}
                    </Box>
                    <div>
                      <SegmentationFilter
                        segmentationData={segmentationOptionData}
                        addNewConditionItem={() => {
                          setSegmentationOptionData((prev) => {
                            const dataObj = cloneDeep(prev);
                            dataObj.data.push(DEFAULT_CONDITION_DATA);
                            return dataObj;
                          });
                        }}
                        removeEventCondition={(index) => {
                          setSegmentationOptionData((prev) => {
                            const dataObj = cloneDeep(prev);
                            const newCondition = dataObj.data.filter(
                              (item, i) => i !== index
                            );
                            dataObj.data = newCondition;
                            return dataObj;
                          });
                        }}
                        changeConditionCategoryOption={(index, category) => {
                          setSegmentationOptionData((prev) => {
                            const dataObj = cloneDeep(prev);
                            dataObj.data[index].conditionOption = category;
                            if (
                              category?.valueType === MetadataValueType.STRING
                            ) {
                              dataObj.data[index].conditionValue = [];
                            } else {
                              dataObj.data[index].conditionValue = '';
                            }
                            return dataObj;
                          });
                        }}
                        changeConditionOperator={(index, operator) => {
                          setSegmentationOptionData((prev) => {
                            const dataObj = cloneDeep(prev);
                            dataObj.data[index].conditionOperator = operator;
                            return dataObj;
                          });
                        }}
                        changeConditionValue={(index, value) => {
                          setSegmentationOptionData((prev) => {
                            const dataObj = cloneDeep(prev);
                            dataObj.data[index].conditionValue = value;
                            return dataObj;
                          });
                        }}
                        changeCurRelationShip={(relation) => {
                          setSegmentationOptionData((prev) => {
                            const dataObj = cloneDeep(prev);
                            dataObj.conditionRelationShip = relation;
                            return dataObj;
                          });
                        }}
                      />
                    </div>
                  </SpaceBetween>
                </ColumnLayout>
                <br />
                <Button
                  variant="primary"
                  iconName="search"
                  onClick={clickPreview}
                  loading={loadingData}
                >
                  {t('common:button.preview')}
                </Button>
              </Container>
              <Container>
                {loadingChart ? (
                  <Loading />
                ) : (
                  <div id={'qs-event-container'} className="iframe-explore">
                    {emptyData ? (
                      <Box
                        margin={{ vertical: 'xs' }}
                        textAlign="center"
                        color="inherit"
                      >
                        <SpaceBetween size="m">
                          <b>{t('analytics:emptyData')}</b>
                        </SpaceBetween>
                      </Box>
                    ) : null}
                  </div>
                )}
              </Container>
              <Container>
                {loadingChart ? (
                  <Loading />
                ) : (
                  <div
                    id={'qs-event-table-container'}
                    className="iframe-explore"
                  >
                    {emptyData ? (
                      <Box
                        margin={{ vertical: 'xs' }}
                        textAlign="center"
                        color="inherit"
                      >
                        <SpaceBetween size="m">
                          <b>{t('analytics:emptyData')}</b>
                        </SpaceBetween>
                      </Box>
                    ) : null}
                  </div>
                )}
              </Container>
            </SpaceBetween>
          </ContentLayout>
          <SaveToDashboardModal
            visible={selectDashboardModalVisible}
            disableClose={false}
            loading={loadingData}
            setModalVisible={setSelectDashboardModalVisible}
            save={saveToDashboard}
          />
        </>
      }
      headerSelector="#header"
      navigation={
        <Navigation activeHref={`/analytics/${projectId}/app/${appId}/event`} />
      }
    />
  );
};

export default AnalyticsEvent;
