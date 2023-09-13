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
  SelectProps,
  SpaceBetween,
  Toggle,
} from '@cloudscape-design/components';
import {
  getMetadataEventsList,
  getMetadataParametersList,
  getMetadataUserAttributesList,
  getPipelineDetailByProjectId,
  warmup,
} from 'apis/analytics';
import Loading from 'components/common/Loading';
import {
  CategoryItemType,
  DEFAULT_CONDITION_DATA,
  DEFAULT_RETENTION_ITEM,
  ERelationShip,
  INIT_SEGMENTATION_DATA,
  IRetentionAnalyticsItem,
  SegmentationFilterDataType,
} from 'components/eventselect/AnalyticsType';
import RetentionSelect from 'components/eventselect/RetentionSelect';
import SegmentationFilter from 'components/eventselect/SegmentationFilter';
import Navigation from 'components/layouts/Navigation';
import { cloneDeep } from 'lodash';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import {
  ExploreGroupColumn,
  MetadataSource,
  MetadataValueType,
} from 'ts/explore-types';
import {
  getWarmUpParameters,
  metadataEventsConvertToCategoryItemType,
  parametersConvertToCategoryItemType,
} from '../analytics-utils';
import ExploreDateRangePicker from '../comps/ExploreDateRangePicker';
import SaveToDashboardModal from '../comps/SelectDashboardModal';

const AnalyticsRetention: React.FC = () => {
  const { t } = useTranslation();
  const { projectId, appId } = useParams();
  const [loadingData, setLoadingData] = useState(false);
  const [loadingChart, setLoadingChart] = useState(false);
  const [selectDashboardModalVisible, setSelectDashboardModalVisible] =
    useState(false);
  const [pipeline, setPipeline] = useState({} as IPipeline);
  const [exploreEmbedUrl, setExploreEmbedUrl] = useState('');
  const [metadataEvents, setMetadataEvents] = useState(
    [] as CategoryItemType[]
  );
  const [originEvents, setOriginEvents] = useState([] as IMetadataEvent[]);
  const [userAttributes, setUserAttributes] = useState<
    IMetadataUserAttribute[]
  >([]);

  const [eventOptionData, setEventOptionData] = useState<
    IRetentionAnalyticsItem[]
  >([
    {
      ...DEFAULT_RETENTION_ITEM,
    },
  ]);

  const [associateParameterChecked, setAssociateParameterChecked] =
    useState<boolean>(true);
  const [segmentationOptionData, setSegmentationOptionData] =
    useState<SegmentationFilterDataType>(INIT_SEGMENTATION_DATA);

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
        setUserAttributes(data.items);
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

  const getEventParameters = (eventName: string | undefined) => {
    const event = originEvents.find((item) => item.name === eventName);
    if (event) {
      return event.associatedParameters;
    }
    return [];
  };

  const listMetadataEvents = async () => {
    if (!projectId || !appId) {
      return;
    }
    try {
      const { success, data }: ApiResponse<ResponseTableData<IMetadataEvent>> =
        await getMetadataEventsList({ projectId, appId, attribute: true });
      if (success) {
        const events = metadataEventsConvertToCategoryItemType(data.items);
        setOriginEvents(data.items);
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
        setLoadingData(false);
        const params = getWarmUpParameters(projectId, appId, data);
        if (params) {
          await warmup(params);
        }
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
        presetParameters
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

  const [timeGranularity, setTimeGranularity] =
    React.useState<SelectProps.Option>({
      value: ExploreGroupColumn.DAY,
      label: t('analytics:options.dayTimeGranularity') ?? '',
    });

  const resetConfig = async () => {
    setLoadingData(true);
    setEventOptionData([
      {
        ...DEFAULT_RETENTION_ITEM,
      },
    ]);
    setSegmentationOptionData(INIT_SEGMENTATION_DATA);
    setDateRangeValue({
      type: 'relative',
      amount: 7,
      unit: 'day',
    });
    setExploreEmbedUrl('');
    setTimeGranularity({
      value: ExploreGroupColumn.DAY,
      label: t('analytics:options.dayTimeGranularity') ?? '',
    });
    await listMetadataEvents();
    await listAllAttributes();
    setLoadingData(false);
  };

  // const getRetentionRequest = (
  //   action: ExploreRequestAction,
  //   dashboardId?: string,
  //   dashboardName?: string,
  //   sheetId?: string,
  //   sheetName?: string
  // ) => {
  //   const eventId = generateStr(6);
  //   const parameters = getDashboardCreateParameters(
  //     pipeline,
  //     window.location.origin
  //   );
  //   if (!parameters) {
  //     return;
  //   }
  //   const dateRangeParams = getDateRange(dateRangeValue);
  //   let saveParams = {};
  //   if (action === ExploreRequestAction.PUBLISH) {
  //     saveParams = {
  //       dashboardId: dashboardId,
  //       dashboardName: dashboardName,
  //       sheetId: sheetId,
  //       sheetName: sheetName,
  //     };
  //   }
  //   const body: IExploreRequest = {
  //     action: action,
  //     projectId: pipeline.projectId,
  //     pipelineId: pipeline.pipelineId,
  //     appId: appId ?? '',
  //     sheetName: `retention_sheet_${eventId}`,
  //     viewName: `event_view_${eventId}`,
  //     dashboardCreateParameters: parameters,
  //     specifyJoinColumn: false,
  //     conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
  //     conversionIntervalInSeconds: 60 * 60 * 24,
  //     computeMethod: selectedMetric?.value ?? ExploreComputeMethod.USER_CNT,
  //     eventAndConditions: getEventAndConditions(eventOptionData),
  //     firstEventExtraCondition: getFirstEventAndConditions(
  //       eventOptionData,
  //       segmentationOptionData
  //     ),
  //     timeScopeType: dateRangeParams?.timeScopeType,
  //     groupColumn: timeGranularity.value,
  //     ...dateRangeParams,
  //     ...saveParams,
  //   };
  //   return body;
  // };

  // const saveToDashboard = async (
  //   dashboardId: string,
  //   dashboardName: string,
  //   sheetId: string,
  //   sheetName: string
  // ) => {
  //   if (
  //     eventOptionData.length === 0 ||
  //     !validIRetentionAnalyticsItem(eventOptionData[0])
  //   ) {
  //     return;
  //   }
  //   try {
  //     const body = getRetentionRequest(
  //       ExploreRequestAction.PUBLISH,
  //       dashboardId,
  //       dashboardName,
  //       sheetId,
  //       sheetName
  //     );
  //     if (!body) {
  //       alertMsg(
  //         t('analytics:valid.funnelPipelineVersionError'),
  //         COMMON_ALERT_TYPE.Error as AlertType
  //       );
  //       return;
  //     }
  //     setLoadingData(true);
  //     const { success }: ApiResponse<any> = await previewEvent(body);
  //     if (success) {
  //       setSelectDashboardModalVisible(false);
  //     }
  //   } catch (error) {
  //     console.log(error);
  //   }
  //   setLoadingData(false);
  // };

  return (
    <AppLayout
      toolsHide
      content={
        <ContentLayout
          header={
            <SpaceBetween size="m">
              <Header variant="h1">
                {t('nav.analytics.exploreRetention')}
              </Header>
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
                        {t('button.reset')}
                      </Button>
                      <Button
                        variant="primary"
                        loading={loadingData}
                        onClick={() => {
                          setSelectDashboardModalVisible(true);
                        }}
                      >
                        {t('button.saveToDashboard')}
                      </Button>
                    </SpaceBetween>
                  }
                >
                  {t('analytics:header.configurations')}
                </Header>
              }
            >
              <ColumnLayout columns={3} variant="text-grid">
                <SpaceBetween direction="vertical" size="l">
                  <div>
                    <Box variant="awsui-key-label">
                      {t('analytics:labels.associateParameter')}
                    </Box>
                    <Toggle
                      onChange={({ detail }) =>
                        setAssociateParameterChecked(detail.checked)
                      }
                      checked={associateParameterChecked}
                    >
                      {associateParameterChecked ? 'On' : 'Off'}
                    </Toggle>
                  </div>
                </SpaceBetween>
              </ColumnLayout>
              <br />
              <SpaceBetween direction="vertical" size="xs">
                <Box variant="awsui-key-label">
                  {t('analytics:labels.dateRange')}
                </Box>
                <ExploreDateRangePicker
                  dateRangeValue={dateRangeValue}
                  setDateRangeValue={setDateRangeValue}
                  timeGranularity={timeGranularity}
                  setTimeGranularity={setTimeGranularity}
                />
              </SpaceBetween>
              <br />
              <ColumnLayout columns={2} variant="text-grid">
                <SpaceBetween direction="vertical" size="xs">
                  <Box variant="awsui-key-label">
                    {t('analytics:labels.eventsSelect')}
                  </Box>
                  <div>
                    <RetentionSelect
                      data={eventOptionData}
                      eventOptionList={metadataEvents}
                      addEventButtonLabel={t('analytics:labels.retentionMetrics')}
                      addStartNewConditionItem={(index) => {
                        setEventOptionData((prev) => {
                          const dataObj = cloneDeep(prev);
                          dataObj[index].startConditionList.push(
                            DEFAULT_CONDITION_DATA
                          );
                          return dataObj;
                        });
                      }}
                      addRevisitNewConditionItem={(index) => {
                        setEventOptionData((prev) => {
                          const dataObj = cloneDeep(prev);
                          dataObj[index].revisitConditionList.push(
                            DEFAULT_CONDITION_DATA
                          );
                          return dataObj;
                        });
                      }}
                      changeStartRelationShip={(
                        index: number,
                        relation: ERelationShip
                      ) => {
                        setEventOptionData((prev) => {
                          const dataObj = cloneDeep(prev);
                          dataObj[index].startConditionRelationShip = relation;
                          return dataObj;
                        });
                      }}
                      changeRevisitRelationShip={(
                        index: number,
                        relation: ERelationShip
                      ) => {
                        setEventOptionData((prev) => {
                          const dataObj = cloneDeep(prev);
                          dataObj[index].revisitConditionRelationShip =
                            relation;
                          return dataObj;
                        });
                      }}
                      removeStartEventCondition={(index, conditionIndex) => {
                        setEventOptionData((prev) => {
                          const dataObj = cloneDeep(prev);
                          const newCondition = dataObj[
                            index
                          ].startConditionList.filter(
                            (item, i) => i !== conditionIndex
                          );
                          dataObj[index].startConditionList = newCondition;
                          return dataObj;
                        });
                      }}
                      removeRevisitEventCondition={(index, conditionIndex) => {
                        setEventOptionData((prev) => {
                          const dataObj = cloneDeep(prev);
                          const newCondition = dataObj[
                            index
                          ].revisitConditionList.filter(
                            (item, i) => i !== conditionIndex
                          );
                          dataObj[index].revisitConditionList = newCondition;
                          return dataObj;
                        });
                      }}
                      changeStartConditionCategoryOption={(
                        index,
                        conditionIndex,
                        category
                      ) => {
                        setEventOptionData((prev) => {
                          const dataObj = cloneDeep(prev);
                          dataObj[index].startConditionList[
                            conditionIndex
                          ].conditionOption = category;
                          dataObj[index].startConditionList[
                            conditionIndex
                          ].conditionValue = [];
                          return dataObj;
                        });
                      }}
                      changeRevisitConditionCategoryOption={(
                        index,
                        conditionIndex,
                        category
                      ) => {
                        setEventOptionData((prev) => {
                          const dataObj = cloneDeep(prev);
                          dataObj[index].revisitConditionList[
                            conditionIndex
                          ].conditionOption = category;
                          dataObj[index].revisitConditionList[
                            conditionIndex
                          ].conditionValue = [];
                          return dataObj;
                        });
                      }}
                      changeStartConditionOperator={(
                        eventIndex,
                        conditionIndex,
                        operator
                      ) => {
                        setEventOptionData((prev) => {
                          const dataObj = cloneDeep(prev);
                          dataObj[eventIndex].startConditionList[
                            conditionIndex
                          ].conditionOperator = operator;
                          return dataObj;
                        });
                      }}
                      changeRevisitConditionOperator={(
                        eventIndex,
                        conditionIndex,
                        operator
                      ) => {
                        setEventOptionData((prev) => {
                          const dataObj = cloneDeep(prev);
                          dataObj[eventIndex].revisitConditionList[
                            conditionIndex
                          ].conditionOperator = operator;
                          return dataObj;
                        });
                      }}
                      changeStartConditionValue={(
                        eventIndex,
                        conditionIndex,
                        value
                      ) => {
                        setEventOptionData((prev) => {
                          const dataObj = cloneDeep(prev);
                          dataObj[eventIndex].startConditionList[
                            conditionIndex
                          ].conditionValue = value;
                          return dataObj;
                        });
                      }}
                      changeRevisitConditionValue={(
                        eventIndex,
                        conditionIndex,
                        value
                      ) => {
                        setEventOptionData((prev) => {
                          const dataObj = cloneDeep(prev);
                          dataObj[eventIndex].revisitConditionList[
                            conditionIndex
                          ].conditionValue = value;
                          return dataObj;
                        });
                      }}
                      addNewEventAnalyticsItem={() => {
                        setEventOptionData((prev) => {
                          const preEventList = cloneDeep(prev);
                          return [
                            ...preEventList,
                            {
                              ...DEFAULT_RETENTION_ITEM,
                            },
                          ];
                        });
                      }}
                      removeRetentionEventItem={(index) => {
                        setEventOptionData((prev) => {
                          const dataObj = cloneDeep(prev);
                          return dataObj.filter(
                            (item, eIndex) => eIndex !== index
                          );
                        });
                      }}
                      changeShowRelation={(index, show) => {
                        setEventOptionData((prev) => {
                          const dataObj = cloneDeep(prev);
                          dataObj[index].startEventRelationAttribute = null;
                          dataObj[index].revisitEventRelationAttribute = null;
                          dataObj[index].showRelation = show;
                          return dataObj;
                        });
                      }}
                      changeStartEvent={(index, item) => {
                        const eventName = item?.value;
                        const eventParameters = getEventParameters(eventName);
                        const parameterOption =
                          parametersConvertToCategoryItemType(
                            userAttributes,
                            eventParameters
                          );
                        setEventOptionData((prev) => {
                          const dataObj = cloneDeep(prev);
                          dataObj[index].startEventOption = item;
                          dataObj[index].startEventRelationAttributeOptions =
                            parameterOption;
                          dataObj[index].startConditionOptions =
                            parameterOption;
                          return dataObj;
                        });
                      }}
                      changeRevisitEvent={(index, item) => {
                        const eventName = item?.value;
                        const eventParameters = getEventParameters(eventName);
                        const parameterOption =
                          parametersConvertToCategoryItemType(
                            userAttributes,
                            eventParameters
                          );
                        setEventOptionData((prev) => {
                          const dataObj = cloneDeep(prev);
                          dataObj[index].revisitEventOption = item;
                          dataObj[index].revisitEventRelationAttributeOptions =
                            parameterOption;
                          dataObj[index].revisitConditionOptions =
                            parameterOption;
                          return dataObj;
                        });
                      }}
                      changeStartRelativeAttribute={(index, item) => {
                        setEventOptionData((prev) => {
                          const dataObj = cloneDeep(prev);
                          dataObj[index].startEventRelationAttribute = item;
                          return dataObj;
                        });
                      }}
                      changeRevisitRelativeAttribute={(index, item) => {
                        setEventOptionData((prev) => {
                          const dataObj = cloneDeep(prev);
                          dataObj[index].revisitEventRelationAttribute = item;
                          return dataObj;
                        });
                      }}
                    />
                  </div>
                  <pre>{JSON.stringify(eventOptionData, null, 2)}</pre>
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
            </Container>
            <Container>
              {loadingData ? (
                <Loading />
              ) : (
                <div
                  id={'qs-funnel-container'}
                  className="iframe-explore"
                ></div>
              )}
            </Container>
          </SpaceBetween>
          <SaveToDashboardModal
            visible={selectDashboardModalVisible}
            disableClose={false}
            loading={loadingData}
            setModalVisible={setSelectDashboardModalVisible}
            save={() => {
              return;
            }}
          />
        </ContentLayout>
      }
      headerSelector="#header"
      navigation={
        <Navigation
          activeHref={`/analytics/${projectId}/app/${appId}/retention`}
        />
      }
    />
  );
};

export default AnalyticsRetention;
