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
  QUICKSIGHT_ANALYSIS_INFIX,
  QUICKSIGHT_DASHBOARD_INFIX,
} from '@aws/clickstream-base-lib';
import {
  Button,
  ColumnLayout,
  Container,
  DateRangePickerProps,
  Header,
  SegmentedControl,
  SegmentedControlProps,
  SelectProps,
  SpaceBetween,
} from '@cloudscape-design/components';
import { previewEvent } from 'apis/analytics';
import ExtendIcon from 'components/common/ExtendIcon';
import InfoLink from 'components/common/InfoLink';
import Loading from 'components/common/Loading';
import SectionTitle from 'components/common/title/SectionTitle';
import {
  CategoryItemType,
  DEFAULT_EVENT_ITEM,
  INIT_SEGMENTATION_DATA,
} from 'components/eventselect/AnalyticsType';
import AnalyticsEventSelect from 'components/eventselect/reducer/AnalyticsEventSelect';
import AnalyticsSegmentFilter from 'components/eventselect/reducer/AnalyticsSegmentFilter';
import { analyticsEventSelectReducer } from 'components/eventselect/reducer/analyticsEventSelectReducer';
import { analyticsSegmentFilterReducer } from 'components/eventselect/reducer/analyticsSegmentFilterReducer';
import { DispatchContext } from 'context/StateContext';
import { UserContext } from 'context/UserContext';
import { StateActionType, HelpPanelType } from 'context/reducer';

import React, { useContext, useEffect, useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import {
  ExploreComputeMethod,
  ExploreConversionIntervalType,
  ExploreRequestAction,
  ExploreGroupColumn,
  QuickSightChartType,
  IMetadataBuiltInList,
} from 'ts/explore-types';
import {
  alertMsg,
  defaultStr,
  generateStr,
  getUserInfoFromLocalStorage,
  isAnalystAuthorRole,
} from 'ts/utils';
import {
  getDashboardCreateParameters,
  getDateRange,
  getEventAndConditions,
  getGlobalEventCondition,
  getGroupCondition,
  getLngFromLocalStorage,
  validEventAnalyticsItem,
  validMultipleEventAnalyticsItems,
  validateFilterConditions,
} from '../analytics-utils';
import AttributeGroup from '../comps/AttributeGroup';
import ExploreDateRangePicker, {
  DEFAULT_WEEK_RANGE,
} from '../comps/ExploreDateRangePicker';
import ExploreEmbedFrame from '../comps/ExploreEmbedFrame';
import SaveToDashboardModal from '../comps/SelectDashboardModal';

interface AnalyticsEventProps {
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

const AnalyticsEvent: React.FC<AnalyticsEventProps> = (
  props: AnalyticsEventProps
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

  const defaultComputeMethodOption: SelectProps.Option = {
    value: ExploreComputeMethod.EVENT_CNT,
    label: t('analytics:options.eventNumber') ?? 'Event number',
  };

  const [eventDataState, eventDataDispatch] = useReducer(
    analyticsEventSelectReducer,
    [
      {
        ...DEFAULT_EVENT_ITEM,
        calculateMethodOption: defaultComputeMethodOption,
        enableChangeRelation: true,
      },
    ]
  );
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

  const [dateRangeValue, setDateRangeValue] =
    useState<DateRangePickerProps.Value>(DEFAULT_WEEK_RANGE);

  const [timeGranularity, setTimeGranularity] = useState<SelectProps.Option>({
    value: ExploreGroupColumn.DAY,
    label: defaultStr(t('analytics:options.dayTimeGranularity')),
  });

  const resetConfig = async () => {
    eventDataDispatch({
      type: 'resetEventData',
      defaultComputeMethodOption: defaultComputeMethodOption,
      isMultiSelect: true,
      enableChangeRelation: true,
    });
    filterOptionDataDispatch({
      type: 'resetFilterData',
      presetParameters,
    });
    setDateRangeValue(DEFAULT_WEEK_RANGE);
    setExploreEmbedUrl('');
    setTimeGranularity({
      value: ExploreGroupColumn.DAY,
      label: defaultStr(t('analytics:options.dayTimeGranularity')),
    });
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
      eventDataState.length === 0 ||
      !validEventAnalyticsItem(eventDataState[0])
    ) {
      return;
    }
    try {
      const body = getEventRequest(
        ExploreRequestAction.PUBLISH,
        dashboardId,
        dashboardName,
        sheetId,
        sheetName,
        chartTitle,
        chartSubTitle
      );
      if (!body) {
        alertMsg(t('analytics:valid.funnelPipelineVersionError'));
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
      sheetName: `event_sheet_${eventId}`,
      viewName: `event_view_${eventId}`,
      dashboardCreateParameters: parameters,
      specifyJoinColumn: false,
      conversionIntervalType: ExploreConversionIntervalType.CUSTOMIZE,
      conversionIntervalInSeconds: 60 * 60 * 24,
      computeMethod: ExploreComputeMethod.USER_ID_CNT,
      eventAndConditions: getEventAndConditions(eventDataState),
      globalEventCondition: getGlobalEventCondition(filterOptionData),
      timeScopeType: dateRangeParams?.timeScopeType,
      groupColumn: timeGranularity.value,
      groupCondition: getGroupCondition(groupOption, null),
      ...dateRangeParams,
      ...saveParams,
    };
    return body;
  };

  const validateEventSelection = () => {
    if (!validMultipleEventAnalyticsItems(eventDataState)) {
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
      eventDataState.length === 0 ||
      !validEventAnalyticsItem(eventDataState[0])
    ) {
      return;
    }
    try {
      const body = getEventRequest(ExploreRequestAction.PREVIEW);
      if (!body) {
        alertMsg(t('analytics:valid.funnelPipelineVersionError'));
        return;
      }
      setExploreEmbedUrl('');
      setLoadingData(true);
      setLoadingChart(true);
      const { success, data }: ApiResponse<any> = await previewEvent(body);
      setLoadingData(false);
      setLoadingChart(false);
      if (success && data.dashboardEmbedUrl) {
        setExploreEmbedUrl(data.dashboardEmbedUrl);
      }
    } catch (error) {
      setLoadingChart(false);
      setLoadingData(false);
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
                      payload: HelpPanelType.EXPLORE_EVENT_INFO,
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
              {t('analytics:explore.eventAnalysis')}
            </Header>
          }
        >
          <ColumnLayout columns={2} variant="text-grid">
            <SpaceBetween direction="vertical" size="xs">
              <SectionTitle
                type="event"
                title={t('analytics:labels.defineMetrics')}
                description={t('analytics:information.eventDefineMetricInfo')}
              />
              <AnalyticsEventSelect
                eventPlaceholder={t('analytics:labels.eventSelectPlaceholder')}
                loading={loadingEvents}
                eventDataState={eventDataState}
                eventDataDispatch={eventDataDispatch}
                addEventButtonLabel={t('common:button.addEvent')}
                eventOptionList={categoryEvents}
                defaultComputeMethodOption={defaultComputeMethodOption}
                builtInMetadata={builtInMetadata}
                metadataEvents={metadataEvents}
                metadataEventParameters={metadataEventParameters}
                metadataUserAttributes={metadataUserAttributes}
                enableChangeRelation={true}
                isMultiSelect={true}
                enableChangeMultiSelect={false}
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
              if (validateEventSelection() && validateFilterSelection()) {
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

export default AnalyticsEvent;
