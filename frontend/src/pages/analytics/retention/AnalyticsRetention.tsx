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
  Button,
  ColumnLayout,
  Container,
  DateRangePickerProps,
  Header,
  Link,
  Popover,
  SegmentedControl,
  SegmentedControlProps,
  SelectProps,
  SpaceBetween,
} from '@cloudscape-design/components';
import { previewRetention } from 'apis/analytics';
import ExtendIcon from 'components/common/ExtendIcon';
import Loading from 'components/common/Loading';
import SectionTitle from 'components/common/title/SectionTitle';
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
import { UserContext } from 'context/UserContext';
import { cloneDeep } from 'lodash';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { COMMON_ALERT_TYPE, IUserRole } from 'ts/const';
import {
  QUICKSIGHT_ANALYSIS_INFIX,
  QUICKSIGHT_DASHBOARD_INFIX,
} from 'ts/constant-ln';
import {
  ExploreComputeMethod,
  ExploreGroupColumn,
  ExploreRequestAction,
  QuickSightChartType,
} from 'ts/explore-types';
import {
  generateStr,
  alertMsg,
  defaultStr,
  getEventParameters,
  getUserInfoFromLocalStorage,
} from 'ts/utils';
import {
  getDashboardCreateParameters,
  getDateRange,
  getGlobalEventCondition,
  getGroupCondition,
  getLngFromLocalStorage,
  getPairEventAndConditions,
  parametersConvertToCategoryItemType,
  validRetentionAnalyticsItem,
} from '../analytics-utils';
import AttributeGroup from '../comps/AttributeGroup';
import ExploreDateRangePicker, {
  DEFAULT_DAY_RANGE,
  DEFAULT_WEEK_RANGE,
} from '../comps/ExploreDateRangePicker';
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
  groupParameters: CategoryItemType[];
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
    groupParameters,
  } = props;
  const { appId } = useParams();
  const currentUser = useContext(UserContext) ?? getUserInfoFromLocalStorage();
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

  const [segmentationOptionData, setSegmentationOptionData] =
    useState<SegmentationFilterDataType>({
      ...INIT_SEGMENTATION_DATA,
      conditionOptions: presetParameters,
    });

  const [groupOption, setGroupOption] = useState<SelectProps.Option | null>(
    null
  );

  const [dateRangeValue, setDateRangeValue] =
    useState<DateRangePickerProps.Value>(DEFAULT_DAY_RANGE);

  const [timeGranularity, setTimeGranularity] = useState<SelectProps.Option>({
    value: ExploreGroupColumn.DAY,
    label: defaultStr(t('analytics:options.dayTimeGranularity')),
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
    setDateRangeValue(DEFAULT_WEEK_RANGE);
    setExploreEmbedUrl('');
    setTimeGranularity({
      value: ExploreGroupColumn.DAY,
      label: defaultStr(t('analytics:options.dayTimeGranularity')),
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
        analysisId: dashboardId?.replace(
          QUICKSIGHT_DASHBOARD_INFIX,
          QUICKSIGHT_ANALYSIS_INFIX
        ),
        analysisName: dashboardName,
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
      appId: defaultStr(appId),
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
      groupCondition: getGroupCondition(groupOption),
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
                  {currentUser.role !== IUserRole.ANALYST_READER && (
                    <Button
                      variant="primary"
                      loading={loadingData}
                      onClick={() => {
                        setSelectDashboardModalVisible(true);
                      }}
                    >
                      {t('button.saveToDashboard')}
                    </Button>
                  )}
                </SpaceBetween>
              }
            >
              {t('analytics:explore.retentionAnalysis')}
            </Header>
          }
        >
          <br />
          <ColumnLayout columns={2} variant="text-grid">
            <SpaceBetween direction="vertical" size="xs">
              <SectionTitle
                type="event"
                title={t('analytics:labels.defineMetrics')}
              />
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
                  const eventName = item?.name;
                  const eventParameters = getEventParameters(
                    metadataEvents,
                    eventName
                  );
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
                  const eventName = item?.name;
                  const eventParameters = getEventParameters(
                    metadataEvents,
                    eventName
                  );
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
              <SectionTitle type="filter" />
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
              <SectionTitle type="group" />
              <AttributeGroup
                groupParameters={groupParameters}
                groupOption={groupOption}
                setGroupOption={setGroupOption}
              />
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
              disableSelect={loadingChart}
              dateRangeValue={dateRangeValue}
              setDateRangeValue={setDateRangeValue}
              timeGranularity={timeGranularity}
              timeGranularityVisible={true}
              setTimeGranularity={setTimeGranularity}
            />
            <SegmentedControl
              selectedId={chartType}
              onChange={({ detail }) =>
                setChartType(detail.selectedId as QuickSightChartType)
              }
              options={chartTypeOptions.map((obj) => ({
                ...obj,
                disabled: loadingChart,
              }))}
            />
          </div>
          <br />
          {loadingChart ? (
            <Loading isPage />
          ) : (
            <ExploreEmbedFrame
              embedType="dashboard"
              embedUrl={exploreEmbedUrl}
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
