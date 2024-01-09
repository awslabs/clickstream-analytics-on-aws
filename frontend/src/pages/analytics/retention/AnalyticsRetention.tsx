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
  Header,
  SegmentedControl,
  SegmentedControlProps,
  SelectProps,
  SpaceBetween,
} from '@cloudscape-design/components';
import { previewRetention } from 'apis/analytics';
import ExtendIcon from 'components/common/ExtendIcon';
import InfoLink from 'components/common/InfoLink';
import Loading from 'components/common/Loading';
import SectionTitle from 'components/common/title/SectionTitle';
import {
  CategoryItemType,
  DEFAULT_CONDITION_DATA,
  DEFAULT_RETENTION_ITEM,
  ERelationShip,
  INIT_SEGMENTATION_DATA,
  IRetentionAnalyticsItem,
} from 'components/eventselect/AnalyticsType';
import RetentionSelect from 'components/eventselect/RetentionSelect';
import AnalyticsSegmentFilter from 'components/eventselect/reducer/AnalyticsSegmentFilter';
import { analyticsSegmentFilterReducer } from 'components/eventselect/reducer/analyticsSegmentFilterReducer';
import { DispatchContext } from 'context/StateContext';
import { UserContext } from 'context/UserContext';
import { StateActionType, HelpPanelType } from 'context/reducer';
import { cloneDeep } from 'lodash';
import React, { useContext, useEffect, useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import {
  QUICKSIGHT_ANALYSIS_INFIX,
  QUICKSIGHT_DASHBOARD_INFIX,
} from 'ts/constant-ln';
import {
  ExploreComputeMethod,
  ExploreGroupColumn,
  ExploreRequestAction,
  ExploreTimeScopeType,
  IMetadataBuiltInList,
  QuickSightChartType,
} from 'ts/explore-types';
import {
  generateStr,
  alertMsg,
  defaultStr,
  getEventParameters,
  getUserInfoFromLocalStorage,
  isAnalystAuthorRole,
  getAbsoluteStartEndRange,
} from 'ts/utils';
import {
  getDashboardCreateParameters,
  getGlobalEventCondition,
  getGroupCondition,
  getLngFromLocalStorage,
  getPairEventAndConditions,
  parametersConvertToCategoryItemType,
  validMultipleRetentionAnalyticsItem,
  validRetentionAnalyticsItem,
  validRetentionJoinColumnDatatype,
  validateFilterConditions,
} from '../analytics-utils';
import AttributeGroup from '../comps/AttributeGroup';
import ExploreDatePicker from '../comps/ExploreDatePicker';
import ExploreEmbedFrame from '../comps/ExploreEmbedFrame';
import SaveToDashboardModal from '../comps/SelectDashboardModal';

interface AnalyticsRetentionProps {
  loading: boolean;
  pipeline: IPipeline;
  builtInMetadata?: IMetadataBuiltInList;
  metadataEvents: IMetadataEvent[];
  metadataEventParameters: IMetadataEventParameter[];
  metadataUserAttributes: IMetadataUserAttribute[];
  categoryEvents: CategoryItemType[];
  presetParameters: CategoryItemType[];
  groupParameters: CategoryItemType[];
  loadingEvents: boolean;
}

const AnalyticsRetention: React.FC<AnalyticsRetentionProps> = (
  props: AnalyticsRetentionProps
) => {
  const { t } = useTranslation();
  const {
    loading,
    pipeline,
    builtInMetadata,
    metadataEvents,
    metadataEventParameters,
    metadataUserAttributes,
    categoryEvents,
    presetParameters,
    groupParameters,
    loadingEvents,
  } = props;
  const { appId } = useParams();
  const currentUser = useContext(UserContext) ?? getUserInfoFromLocalStorage();
  const [loadingData, setLoadingData] = useState(loading);
  const [loadingChart, setLoadingChart] = useState(false);
  const [selectDashboardModalVisible, setSelectDashboardModalVisible] =
    useState(false);
  const [exploreEmbedUrl, setExploreEmbedUrl] = useState('');
  const dispatch = useContext(DispatchContext);

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

  const [filterOptionData, filterOptionDataDispatch] = useReducer(
    analyticsSegmentFilterReducer,
    {
      ...INIT_SEGMENTATION_DATA,
      conditionOptions: presetParameters,
    }
  );

  const [groupOption, setGroupOption] = useState<SelectProps.Option | null>(
    null
  );

  const [startDate, setStartDate] = useState<string>(
    getAbsoluteStartEndRange().startDate
  );

  const [revisitDate, setRevisitDate] = useState<string>(
    getAbsoluteStartEndRange().endDate
  );

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
    filterOptionDataDispatch({
      type: 'resetFilterData',
      presetParameters,
    });
    setStartDate(getAbsoluteStartEndRange().startDate);
    setRevisitDate(getAbsoluteStartEndRange().endDate);
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
    const eventId = generateStr(6, true);
    const parameters = getDashboardCreateParameters(
      pipeline,
      window.location.origin
    );
    if (!parameters) {
      return;
    }
    const dateRangeParams = {
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: startDate,
      timeEnd: revisitDate,
    };
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
      globalEventCondition: getGlobalEventCondition(filterOptionData),
      groupColumn: timeGranularity.value,
      groupCondition: getGroupCondition(groupOption, null),
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

  const validateRetentionJoinColumnDatatype = () => {
    if (!validRetentionJoinColumnDatatype(eventOptionData)) {
      alertMsg(t('analytics:valid.retentionJoinColumnDatatype'), 'error');
      return false;
    }
    return true;
  };
  const validateEventSelection = () => {
    if (!validMultipleRetentionAnalyticsItem(eventOptionData)) {
      dispatch?.({
        type: StateActionType.SHOW_EVENT_VALID_ERROR,
      });
      return false;
    }
    dispatch?.({
      type: StateActionType.HIDE_EVENT_VALID_ERROR,
    });
    return true;
  };
  const validateFilterSelection = () => {
    if (
      filterOptionData.data.length <= 0 ||
      (filterOptionData.data.length === 1 &&
        !filterOptionData.data[0]?.conditionOption)
    ) {
      return true;
    } else {
      dispatch?.({
        type: StateActionType.VALIDATE_FILTER_CONDITIONS,
        payload: filterOptionData.data,
      });
      const {
        hasValidConditionOption,
        hasValidConditionOperator,
        hasValidConditionValue,
      } = validateFilterConditions(filterOptionData.data);
      if (
        !hasValidConditionOption ||
        !hasValidConditionOperator ||
        !hasValidConditionValue
      ) {
        return false;
      }
      return true;
    }
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
      setLoadingData(false);
      setLoadingChart(false);
      console.log(error);
    }
  };

  useEffect(() => {
    filterOptionDataDispatch({
      type: 'resetFilterData',
      presetParameters,
    });
  }, [presetParameters]);

  useEffect(() => {
    clickPreview();
  }, [chartType]);

  return (
    <>
      <SpaceBetween direction="vertical" size="l">
        <Container
          header={
            <Header
              variant="h2"
              info={
                <InfoLink
                  onFollow={() => {
                    dispatch?.({
                      type: StateActionType.SHOW_HELP_PANEL,
                      payload: HelpPanelType.EXPLORE_RETENTION_INFO,
                    });
                  }}
                />
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
                  {isAnalystAuthorRole(currentUser?.roles) && (
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
                description={t('analytics:information.retentionMetricInfo')}
              />
              <RetentionSelect
                loading={loadingEvents}
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
                    metadataEventParameters,
                    metadataEvents,
                    builtInMetadata,
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
                    metadataEventParameters,
                    metadataEvents,
                    builtInMetadata,
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
              <SectionTitle
                type="filter"
                description={t('analytics:information.filterInfo')}
              />
              <AnalyticsSegmentFilter
                filterDataState={filterOptionData}
                filterDataDispatch={filterOptionDataDispatch}
              />
              <br />
              <SectionTitle
                type="group"
                description={t('analytics:information.groupInfo')}
              />
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
            onClick={() => {
              if (
                validateRetentionJoinColumnDatatype() &&
                validateEventSelection() &&
                validateFilterSelection()
              ) {
                clickPreview();
              }
            }}
            loading={loadingData}
          >
            {t('button.query')}
          </Button>
        </Container>
        <Container>
          <div className="cs-analytics-data-range">
            <ExploreDatePicker
              disableSelect={loadingChart}
              startDate={startDate}
              revisitDate={revisitDate}
              timeGranularity={timeGranularity}
              timeGranularityVisible={true}
              setTimeGranularity={setTimeGranularity}
              setStartDate={setStartDate}
              setRevisitDate={setRevisitDate}
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
              embedPage="explore"
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
