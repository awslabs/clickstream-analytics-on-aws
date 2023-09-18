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
  Icon,
  Popover,
  SegmentedControl,
  SegmentedControlProps,
  SelectProps,
  SpaceBetween,
  Toggle,
} from '@cloudscape-design/components';
import {
  getMetadataEventsList,
  getMetadataParametersList,
  getMetadataUserAttributesList,
  getPipelineDetailByProjectId,
  previewRetention,
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
import EventItem from 'components/eventselect/EventItem';
import RetentionSelect from 'components/eventselect/RetentionSelect';
import SegmentationFilter from 'components/eventselect/SegmentationFilter';
import Navigation from 'components/layouts/Navigation';
import { cloneDeep } from 'lodash';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { COMMON_ALERT_TYPE } from 'ts/const';
import {
  ExploreComputeMethod,
  ExploreGroupColumn,
  ExploreRequestAction,
  MetadataSource,
  MetadataValueType,
} from 'ts/explore-types';
import { generateStr, alertMsg } from 'ts/utils';
import {
  getDashboardCreateParameters,
  getDateRange,
  getGlobalEventCondition,
  getPairEventAndConditions,
  getWarmUpParameters,
  metadataEventsConvertToCategoryItemType,
  parametersConvertToCategoryItemType,
  validRetentionAnalyticsItem,
} from '../analytics-utils';
import ExploreDateRangePicker from '../comps/ExploreDateRangePicker';
import ExploreEmbedFrame from '../comps/ExploreEmbedFrame';
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

  const defaultChartTypeOption = 'line-chart';
  const chartTypeOptions: SegmentedControlProps.Option[] = [
    {
      iconName: 'view-full',
      iconAlt: 'line-chart',
      id: 'line-chart',
    },
    {
      iconName: 'view-horizontal',
      iconAlt: 'bar-chart',
      id: 'bar-chart',
    },
    {
      iconName: 'view-vertical',
      iconAlt: 'stack-chart',
      id: 'stack-chart',
    },
  ];
  const [chartType, setChartType] = useState(defaultChartTypeOption);

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

  const [groupOption, setGroupOption] = useState<SelectProps.Option | null>(
    null
  );

  const [groupOptions, setGroupOptions] = useState<CategoryItemType[]>([]);

  const getEventParameters = (eventName?: string) => {
    const event = originEvents.find((item) => item.name === eventName);
    if (event) {
      return event.associatedParameters;
    }
    return [];
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
        setUserAttributes(data.items);
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
        const events = metadataEventsConvertToCategoryItemType(data.items);
        setOriginEvents(data.items);
        setMetadataEvents(events);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const loadPipeline = async () => {
    setLoadingData(true);
    try {
      const { success, data }: ApiResponse<IPipeline> =
        await getPipelineDetailByProjectId(projectId ?? '');
      if (success) {
        setPipeline(data);
        setLoadingData(false);
        const params = getWarmUpParameters(projectId ?? '', appId ?? '', data);
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
      setGroupOptions(conditionOptions);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (projectId && appId) {
      loadPipeline();
      listMetadataEvents();
      listAllAttributes();
    }
  }, [projectId, appId]);

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

  const getRetentionRequest = (
    action: ExploreRequestAction,
    dashboardId?: string,
    dashboardName?: string,
    sheetId?: string,
    sheetName?: string
  ) => {
    const eventId = generateStr(6);
    const parameters = getDashboardCreateParameters(
      pipeline,
      window.location.origin
    );
    if (!parameters) {
      return;
    }
    const dateRangeParams = getDateRange(dateRangeValue);
    let saveParams = {};
    if (action === ExploreRequestAction.PUBLISH) {
      saveParams = {
        dashboardId: dashboardId,
        dashboardName: dashboardName,
        sheetId: sheetId,
        sheetName: sheetName,
      };
    }
    const body: IExploreRequest = {
      action: action,
      projectId: pipeline.projectId,
      pipelineId: pipeline.pipelineId,
      appId: appId ?? '',
      sheetName: `retention_sheet_${eventId}`,
      viewName: `event_view_${eventId}`,
      dashboardCreateParameters: parameters,
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: false,
      eventAndConditions: [],
      pairEventAndConditions: getPairEventAndConditions(eventOptionData),
      globalEventCondition: getGlobalEventCondition(segmentationOptionData),
      timeScopeType: dateRangeParams?.timeScopeType,
      groupColumn: timeGranularity.value,
      ...dateRangeParams,
      ...saveParams,
    };
    return body;
  };

  const saveToDashboard = async (
    dashboardId: string,
    dashboardName: string,
    sheetId: string,
    sheetName: string
  ) => {
    if (
      eventOptionData.length === 0 ||
      !validRetentionAnalyticsItem(eventOptionData[0])
    ) {
      return;
    }
    try {
      const body = getRetentionRequest(
        ExploreRequestAction.PUBLISH,
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
      const { success }: ApiResponse<any> = await previewRetention(body);
      if (success) {
        setSelectDashboardModalVisible(false);
      }
    } catch (error) {
      console.log(error);
    }
    setLoadingData(false);
  };

  const clickPreview = async () => {
    if (
      eventOptionData.length === 0 ||
      !validRetentionAnalyticsItem(eventOptionData[0])
    ) {
      return;
    }
    try {
      const body = getRetentionRequest(ExploreRequestAction.PREVIEW);
      if (!body) {
        alertMsg(
          t('analytics:valid.funnelPipelineVersionError'),
          COMMON_ALERT_TYPE.Error as AlertType
        );
        return;
      }
      setExploreEmbedUrl('');
      setLoadingData(true);
      setLoadingChart(true);
      const { success, data }: ApiResponse<any> = await previewRetention(body);
      setLoadingData(false);
      setLoadingChart(false);
      if (success && data.dashboardEmbedUrl) {
        setExploreEmbedUrl(data.dashboardEmbedUrl);
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <>
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
              {t('analytics:explore.retentionAnalysis')}
            </Header>
          }
        >
          <ColumnLayout columns={3} variant="text-grid">
            <SpaceBetween direction="vertical" size="l">
              <div>
                <Box variant="awsui-key-label">
                  {t('analytics:labels.associateParameter')}{' '}
                  <Popover
                    triggerType="custom"
                    size="small"
                    content="This instance contains insufficient memory. Stop the instance, choose a different instance type with more memory, and restart it."
                  >
                    <Icon name="status-info" size="small" />
                  </Popover>
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
          <ColumnLayout columns={2} variant="text-grid">
            <SpaceBetween direction="vertical" size="xs">
              <Button
                variant="link"
                iconName="menu"
                className="cs-analytics-select-event"
              >
                {t('analytics:labels.defineMetrics')}
              </Button>
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
                    dataObj[index].revisitConditionRelationShip = relation;
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
                    return dataObj.filter((item, eIndex) => eIndex !== index);
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
                  const parameterOption = parametersConvertToCategoryItemType(
                    userAttributes,
                    eventParameters
                  );
                  setEventOptionData((prev) => {
                    const dataObj = cloneDeep(prev);
                    dataObj[index].startEventOption = item;
                    dataObj[index].startEventRelationAttributeOptions =
                      parameterOption;
                    dataObj[index].startConditionOptions = parameterOption;
                    return dataObj;
                  });
                }}
                changeRevisitEvent={(index, item) => {
                  const eventName = item?.value;
                  const eventParameters = getEventParameters(eventName);
                  const parameterOption = parametersConvertToCategoryItemType(
                    userAttributes,
                    eventParameters
                  );
                  setEventOptionData((prev) => {
                    const dataObj = cloneDeep(prev);
                    dataObj[index].revisitEventOption = item;
                    dataObj[index].revisitEventRelationAttributeOptions =
                      parameterOption;
                    dataObj[index].revisitConditionOptions = parameterOption;
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
            </SpaceBetween>
            <SpaceBetween direction="vertical" size="xs">
              <Button
                variant="link"
                iconName="filter"
                className="cs-analytics-select-filter"
              >
                {t('analytics:labels.filters')}
              </Button>
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
                    if (category?.valueType === MetadataValueType.STRING) {
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
              <br />
              <Button variant="link" className="cs-analytics-select-group">
                {t('analytics:labels.attributeGrouping')}
              </Button>
              <div className="cs-analytics-select-group-item">
                <div className="cs-analytics-dropdown">
                  <div className="cs-analytics-parameter">
                    <div className="flex-1">
                      <EventItem
                        placeholder={
                          t('analytics:labels.attributeSelectPlaceholder') ?? ''
                        }
                        categoryOption={groupOption}
                        changeCurCategoryOption={(item) => {
                          setGroupOption(item);
                        }}
                        categories={groupOptions}
                      />
                    </div>
                  </div>
                </div>
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
            {t('button.preview')}
          </Button>
        </Container>
        <Container>
          <div className="cs-analytics-data-range">
            <ExploreDateRangePicker
              dateRangeValue={dateRangeValue}
              setDateRangeValue={setDateRangeValue}
              timeGranularity={timeGranularity}
              setTimeGranularity={setTimeGranularity}
              onChange={clickPreview}
            />
          </div>
          <br />
          {loadingChart ? (
            <Loading />
          ) : (
            <ExploreEmbedFrame
              embedType="dashboard"
              embedUrl={exploreEmbedUrl}
              embedId={`explore_${generateStr(6)}`}
            />
          )}
        </Container>
      </SpaceBetween>
      <SaveToDashboardModal
        visible={selectDashboardModalVisible}
        disableClose={false}
        loading={loadingData}
        setModalVisible={setSelectDashboardModalVisible}
        save={saveToDashboard}
      />
    </>
  );
};

export default AnalyticsRetention;
