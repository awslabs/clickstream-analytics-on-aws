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
  Box,
  Button,
  ColumnLayout,
  Container,
  DateRangePickerProps,
  Header,
  Icon,
  Link,
  Popover,
  SegmentedControl,
  SegmentedControlProps,
  SelectProps,
  SpaceBetween,
  Toggle,
} from '@cloudscape-design/components';
import { previewRetention } from 'apis/analytics';
import ExtendIcon from 'components/common/ExtendIcon';
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
import { cloneDeep } from 'lodash';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { COMMON_ALERT_TYPE } from 'ts/const';
import {
  ExploreComputeMethod,
  ExploreGroupColumn,
  ExploreRequestAction,
  QuickSightChartType,
} from 'ts/explore-types';
import { generateStr, alertMsg } from 'ts/utils';
import {
  getDashboardCreateParameters,
  getDateRange,
  getGlobalEventCondition,
  getLngFromLocalStorage,
  getPairEventAndConditions,
  parametersConvertToCategoryItemType,
  validRetentionAnalyticsItem,
} from '../analytics-utils';
import ExploreDateRangePicker from '../comps/ExploreDateRangePicker';
import ExploreEmbedFrame from '../comps/ExploreEmbedFrame';
import SaveToDashboardModal from '../comps/SelectDashboardModal';

interface AnalyticsRetentionProps {
  loading: boolean;
  loadFunc: () => void;
  pipeline: IPipeline;
  metadataEvents: IMetadataEvent[];
  metadataEventParameters: IMetadataEventParameter[];
  metadataUserAttributes: IMetadataUserAttribute[];
  categoryEvents: CategoryItemType[];
  presetParameters: CategoryItemType[];
}

const AnalyticsRetention: React.FC<AnalyticsRetentionProps> = (
  props: AnalyticsRetentionProps
) => {
  const { t } = useTranslation();
  const {
    loading,
    pipeline,
    metadataEvents,
    metadataUserAttributes,
    categoryEvents,
    presetParameters,
  } = props;
  const { appId } = useParams();
  const [loadingData, setLoadingData] = useState(loading);
  const [loadingChart, setLoadingChart] = useState(false);
  const [selectDashboardModalVisible, setSelectDashboardModalVisible] =
    useState(false);
  const [exploreEmbedUrl, setExploreEmbedUrl] = useState('');

  const defaultChartTypeOption = QuickSightChartType.LINE;
  const chartTypeOptions: SegmentedControlProps.Option[] = [
    {
      id: QuickSightChartType.LINE,
      iconSvg: <ExtendIcon icon="BsGraphUp" />,
    },
    {
      id: QuickSightChartType.BAR,
      iconSvg: <ExtendIcon icon="BsBarChartFill" />,
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
    useState<SegmentationFilterDataType>({
      ...INIT_SEGMENTATION_DATA,
      conditionOptions: presetParameters,
    });

  const [groupOption, setGroupOption] = useState<SelectProps.Option | null>(
    null
  );

  const getEventParameters = (eventName?: string) => {
    const event = metadataEvents.find((item) => item.name === eventName);
    if (event) {
      return event.associatedParameters;
    }
    return [];
  };

  const [dateRangeValue, setDateRangeValue] =
    React.useState<DateRangePickerProps.Value>({
      type: 'relative',
      amount: 1,
      unit: 'month',
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
    setSegmentationOptionData({
      ...INIT_SEGMENTATION_DATA,
      conditionOptions: presetParameters,
    });
    setDateRangeValue({
      type: 'relative',
      amount: 1,
      unit: 'month',
    });
    setExploreEmbedUrl('');
    setTimeGranularity({
      value: ExploreGroupColumn.DAY,
      label: t('analytics:options.dayTimeGranularity') ?? '',
    });
    setLoadingData(false);
  };

  const getRetentionRequest = (
    action: ExploreRequestAction,
    dashboardId?: string,
    dashboardName?: string,
    sheetId?: string,
    sheetName?: string,
    chartTitle?: string,
    chartSubTitle?: string
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
        chartTitle: chartTitle,
        chartSubTitle: chartSubTitle,
      };
    }
    const body: IExploreRequest = {
      action: action,
      chartType: chartType,
      locale: getLngFromLocalStorage(),
      projectId: pipeline.projectId,
      pipelineId: pipeline.pipelineId,
      appId: appId ?? '',
      sheetName: `retention_sheet_${eventId}`,
      viewName: `retention_view_${eventId}`,
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
    sheetName: string,
    chartTitle: string,
    chartSubTitle: string
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
        sheetName,
        chartTitle,
        chartSubTitle
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

  useEffect(() => {
    setSegmentationOptionData({
      ...INIT_SEGMENTATION_DATA,
      conditionOptions: presetParameters,
    });
  }, [presetParameters]);

  useEffect(() => {
    clickPreview();
  }, [timeGranularity, dateRangeValue, chartType]);

  return (
    <>
      <SpaceBetween direction="vertical" size="l">
        <Container
          header={
            <Header
              variant="h2"
              info={
                <Popover
                  triggerType="custom"
                  content={t('analytics:information.retentionInfo')}
                >
                  <Link variant="info">{t('info')}</Link>
                </Popover>
              }
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
                  {t('analytics:labels.associateParameter')}
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
                eventOptionList={categoryEvents}
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
                    metadataUserAttributes,
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
                    metadataUserAttributes,
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
                    dataObj.data[index].conditionValue = [];
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
                        categories={presetParameters}
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
            {t('button.query')}
          </Button>
        </Container>
        <Container>
          <div className="cs-analytics-data-range">
            <ExploreDateRangePicker
              dateRangeValue={dateRangeValue}
              setDateRangeValue={setDateRangeValue}
              timeGranularity={timeGranularity}
              setTimeGranularity={setTimeGranularity}
            />
            <SegmentedControl
              selectedId={chartType}
              onChange={({ detail }) =>
                setChartType(detail.selectedId as QuickSightChartType)
              }
              options={chartTypeOptions}
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
