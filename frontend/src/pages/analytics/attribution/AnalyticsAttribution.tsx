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
  Input,
  Select,
  SelectProps,
  SpaceBetween,
} from '@cloudscape-design/components';
import { previewAttribution } from 'apis/analytics';
import InfoLink from 'components/common/InfoLink';
import Loading from 'components/common/Loading';
import InfoTitle from 'components/common/title/InfoTitle';
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
  COMMON_ALERT_TYPE,
  POSITIVE_INTEGER_REGEX,
  POSITIVE_INTEGER_REGEX_INCLUDE_ZERO,
} from 'ts/const';
import {
  QUICKSIGHT_ANALYSIS_INFIX,
  QUICKSIGHT_DASHBOARD_INFIX,
} from 'ts/constant-ln';
import {
  ExploreComputeMethod,
  ExploreConversionIntervalType,
  ExploreRequestAction,
  ExploreGroupColumn,
  QuickSightChartType,
  AttributionModelType,
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
  getGlobalEventCondition,
  getGoalAndConditions,
  getIntervalInSeconds,
  getLngFromLocalStorage,
  getTouchPointsAndConditions,
  validEventAnalyticsItem,
  validMultipleEventAnalyticsItems,
  validateFilterConditions,
} from '../analytics-utils';
import ExploreDateRangePicker, {
  DEFAULT_WEEK_RANGE,
} from '../comps/ExploreDateRangePicker';
import ExploreEmbedFrame from '../comps/ExploreEmbedFrame';
import SaveToDashboardModal from '../comps/SelectDashboardModal';

interface AnalyticsAttributionProps {
  loading: boolean;
  pipeline: IPipeline;
  metadataEvents: IMetadataEvent[];
  metadataUserAttributes: IMetadataUserAttribute[];
  categoryEvents: CategoryItemType[];
  presetParameters: CategoryItemType[];
  loadingEvents: boolean;
}

const AnalyticsAttribution: React.FC<AnalyticsAttributionProps> = (
  props: AnalyticsAttributionProps
) => {
  const { t } = useTranslation();
  const {
    loading,
    pipeline,
    metadataEvents,
    metadataUserAttributes,
    categoryEvents,
    presetParameters,
    loadingEvents,
  } = props;
  const { appId } = useParams();
  const currentUser = useContext(UserContext) ?? getUserInfoFromLocalStorage();
  const [loadingData, setLoadingData] = useState(loading);
  const [loadingChart, setLoadingChart] = useState(false);
  const [selectDashboardModalVisible, setSelectDashboardModalVisible] =
    useState(false);
  const [exploreEmbedUrl, setExploreEmbedUrl] = useState('');

  const [windowValue, setWindowValue] = useState<string>('10');

  const customWindowType = {
    value: ExploreConversionIntervalType.CUSTOMIZE,
    label: t('analytics:options.customWindow'),
  };

  const windowTypeOptions = [
    customWindowType,
    {
      value: ExploreConversionIntervalType.CURRENT_DAY,
      label: t('analytics:options.theDayWindow'),
    },
  ];

  const minuteWindowUnitOption = {
    value: 'minute',
    label: t('analytics:options.minuteWindowUnit'),
  };

  const windowUnitOptions = [
    { value: 'second', label: t('analytics:options.secondWindowUnit') },
    minuteWindowUnitOption,
    { value: 'hour', label: t('analytics:options.hourWindowUnit') },
    { value: 'day', label: t('analytics:options.dayWindowUnit') },
  ];

  const [selectedWindowType, setSelectedWindowType] =
    useState<SelectProps.Option | null>(customWindowType);

  const [selectedWindowUnit, setSelectedWindowUnit] =
    useState<SelectProps.Option | null>(minuteWindowUnitOption);

  const dispatch = useContext(DispatchContext);

  const defaultComputeMethodOption: SelectProps.Option = {
    value: ExploreComputeMethod.EVENT_CNT,
    label: t('analytics:options.eventNumber') ?? 'Event number',
  };

  const [goalDataState, goalDataDispatch] = useReducer(
    analyticsEventSelectReducer,
    [
      {
        ...DEFAULT_EVENT_ITEM,
        calculateMethodOption: defaultComputeMethodOption,
        enableChangeRelation: true,
      },
    ]
  );

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

  const [dateRangeValue, setDateRangeValue] =
    useState<DateRangePickerProps.Value>(DEFAULT_WEEK_RANGE);

  const [timeGranularity, setTimeGranularity] = useState<SelectProps.Option>({
    value: ExploreGroupColumn.DAY,
    label: defaultStr(t('analytics:options.dayTimeGranularity')),
  });

  const firstTouchOption: SelectProps.Option = {
    value: AttributionModelType.FIRST_TOUCH,
    label: defaultStr(t('analytics:options.firstTouchAttributionModel')),
  };

  const attributionModelOptions = [
    firstTouchOption,
    {
      value: AttributionModelType.LAST_TOUCH,
      label: t('analytics:options.lastTouchAttributionModel'),
    },
    {
      value: AttributionModelType.LINEAR,
      label: t('analytics:options.linearAttributionModel'),
    },
    {
      value: AttributionModelType.POSITION,
      label: t('analytics:options.positionBasedAttributionModel'),
    },
    {
      value: AttributionModelType.TIME_DECAY,
      label: t('analytics:options.timeDecayAttributionModel'),
    },
  ];

  const [selectedAttributionModel, setSelectedAttributionModel] =
    useState<SelectProps.Option | null>(firstTouchOption);
  const [contributionFirst, setContributionFirst] = useState<string>('100');
  const [contributionInBetween, setContributionInBetween] =
    useState<string>('0');
  const [contributionLast, setContributionLast] = useState<string>('0');

  const resetConfig = async () => {
    goalDataDispatch({
      type: 'resetEventData',
      defaultComputeMethodOption: defaultComputeMethodOption,
      isMultiSelect: true,
      enableChangeRelation: true,
    });
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
      const body = getAttributionRequest(
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
      const { success }: ApiResponse<any> = await previewAttribution(body);
      if (success) {
        setSelectDashboardModalVisible(false);
      }
    } catch (error) {
      console.log(error);
    }
    setLoadingData(false);
  };

  const getAttributionRequest = (
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
    const targetEventAndCondition = getGoalAndConditions(goalDataState);
    if (!targetEventAndCondition) {
      return;
    }
    const body: IExploreAttributionRequest = {
      action: action,
      chartType: QuickSightChartType.TABLE,
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
      eventAndConditions: getTouchPointsAndConditions(eventDataState),
      globalEventCondition: getGlobalEventCondition(filterOptionData),
      targetEventAndCondition: targetEventAndCondition,
      modelType: selectedAttributionModel?.value,
      timeWindowType: selectedWindowType?.value,
      timeWindowInSeconds: getIntervalInSeconds(
        selectedWindowType,
        selectedWindowUnit,
        windowValue
      ),
      timeScopeType: dateRangeParams?.timeScopeType,
      groupColumn: ExploreGroupColumn.DAY,
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
      const body = getAttributionRequest(ExploreRequestAction.PREVIEW);
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
      const { success, data }: ApiResponse<any> = await previewAttribution(
        body
      );
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
              {t('analytics:explore.attributionAnalysis')}
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
              <SpaceBetween direction="vertical" size="xs">
                <InfoTitle
                  title={t('analytics:labels.setConversionGoal')}
                  popoverDescription={t(
                    'analytics:information.attributionSetConversionGoalInfo'
                  )}
                />
                <AnalyticsEventSelect
                  eventPlaceholder={t(
                    'analytics:labels.eventSelectPlaceholder'
                  )}
                  loading={loadingEvents}
                  eventDataState={goalDataState}
                  eventDataDispatch={goalDataDispatch}
                  addEventButtonLabel={t('common:button.addEvent')}
                  eventOptionList={categoryEvents}
                  defaultComputeMethodOption={defaultComputeMethodOption}
                  metadataEvents={metadataEvents}
                  metadataUserAttributes={metadataUserAttributes}
                  enableChangeRelation={true}
                  isMultiSelect={true}
                  disableAddEvent={true}
                />
              </SpaceBetween>
              <SpaceBetween direction="vertical" size="xs">
                <InfoTitle
                  title={t('analytics:labels.setConversionWindow')}
                  popoverDescription={t(
                    'analytics:information.attributionSetConversionWindowInfo'
                  )}
                />
                <div className="cs-analytics-window">
                  <div className="cs-analytics-window-type">
                    <Select
                      selectedOption={selectedWindowType}
                      options={windowTypeOptions}
                      onChange={(event) => {
                        setSelectedWindowType(event.detail.selectedOption);
                      }}
                    />
                  </div>
                  {selectedWindowType?.value === customWindowType?.value ? (
                    <>
                      <div className="cs-analytics-window-value">
                        <Input
                          type="number"
                          placeholder="10"
                          value={windowValue}
                          onChange={(event) => {
                            if (
                              !POSITIVE_INTEGER_REGEX.test(event.detail.value)
                            ) {
                              return false;
                            }
                            setWindowValue(event.detail.value);
                          }}
                        />
                      </div>
                      <div className="cs-analytics-window-unit">
                        <Select
                          selectedOption={selectedWindowUnit}
                          options={windowUnitOptions}
                          onChange={(event) => {
                            setSelectedWindowUnit(event.detail.selectedOption);
                          }}
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              </SpaceBetween>
              <div className="cs-analytics-config">
                <SpaceBetween direction="vertical" size="xs">
                  <InfoTitle
                    title={t('analytics:labels.attributionModel')}
                    popoverDescription={t(
                      'analytics:information.attributionModelInfo'
                    )}
                  />
                  <div className="cs-analytics-attribution-model">
                    <Select
                      selectedOption={selectedAttributionModel}
                      options={attributionModelOptions}
                      onChange={(event) => {
                        setSelectedAttributionModel(
                          event.detail.selectedOption
                        );
                      }}
                    />
                  </div>
                </SpaceBetween>
                {selectedAttributionModel?.value ===
                  AttributionModelType.POSITION && (
                  <>
                    <SpaceBetween direction="vertical" size="xs">
                      <InfoTitle
                        title={t('analytics:labels.attributionFirst')}
                      />
                      <div className="cs-analytics-dropdown">
                        <div className="cs-analytics-parameter">
                          <div className="flex-1">
                            <Input
                              type="number"
                              placeholder="100"
                              value={contributionFirst}
                              onChange={(event) => {
                                if (
                                  !POSITIVE_INTEGER_REGEX_INCLUDE_ZERO.test(
                                    event.detail.value
                                  )
                                ) {
                                  return false;
                                }
                                setContributionFirst(event.detail.value);
                              }}
                            />
                          </div>
                          <div className="cs-suffix-name">%</div>
                        </div>
                      </div>
                    </SpaceBetween>
                    <SpaceBetween direction="vertical" size="xs">
                      <InfoTitle
                        title={t('analytics:labels.attributionInBetween')}
                      />
                      <div className="cs-analytics-dropdown">
                        <div className="cs-analytics-parameter">
                          <div className="flex-1">
                            <Input
                              type="number"
                              placeholder="0"
                              value={contributionInBetween}
                              onChange={(event) => {
                                if (
                                  !POSITIVE_INTEGER_REGEX_INCLUDE_ZERO.test(
                                    event.detail.value
                                  )
                                ) {
                                  return false;
                                }
                                setContributionInBetween(event.detail.value);
                              }}
                            />
                          </div>
                          <div className="cs-suffix-name">%</div>
                        </div>
                      </div>
                    </SpaceBetween>
                    <SpaceBetween direction="vertical" size="xs">
                      <InfoTitle
                        title={t('analytics:labels.attributionLast')}
                      />
                      <div className="cs-analytics-dropdown">
                        <div className="cs-analytics-parameter">
                          <div className="flex-1">
                            <Input
                              type="number"
                              placeholder="0"
                              value={contributionLast}
                              onChange={(event) => {
                                if (
                                  !POSITIVE_INTEGER_REGEX_INCLUDE_ZERO.test(
                                    event.detail.value
                                  )
                                ) {
                                  return false;
                                }
                                setContributionLast(event.detail.value);
                              }}
                            />
                          </div>
                          <div className="cs-suffix-name">%</div>
                        </div>
                      </div>
                    </SpaceBetween>
                  </>
                )}
              </div>
              <SpaceBetween direction="vertical" size="xs">
                <InfoTitle
                  title={t('analytics:labels.selectTouchpointEvent')}
                  popoverDescription={t(
                    'analytics:information.attributionSelectTouchpointEventInfo'
                  )}
                />
                <AnalyticsEventSelect
                  eventPlaceholder={t(
                    'analytics:labels.eventSelectPlaceholder'
                  )}
                  loading={loadingEvents}
                  eventDataState={eventDataState}
                  eventDataDispatch={eventDataDispatch}
                  addEventButtonLabel={t('common:button.addTouchPoint')}
                  eventOptionList={categoryEvents}
                  defaultComputeMethodOption={defaultComputeMethodOption}
                  metadataEvents={metadataEvents}
                  metadataUserAttributes={metadataUserAttributes}
                  enableChangeRelation={true}
                  isMultiSelect={true}
                />
              </SpaceBetween>
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
              timeGranularityVisible={false}
              setTimeGranularity={setTimeGranularity}
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

export default AnalyticsAttribution;
