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
  Input,
  SegmentedControl,
  SegmentedControlProps,
  Select,
  SelectProps,
  SpaceBetween,
  Toggle,
} from '@cloudscape-design/components';
import { DateRangePickerProps } from '@cloudscape-design/components/date-range-picker/interfaces';
import { previewFunnel } from 'apis/analytics';
import ExtendIcon from 'components/common/ExtendIcon';
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
import { COMMON_ALERT_TYPE, POSITIVE_INTEGER_REGEX } from 'ts/const';
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
  validEventAnalyticsItem,
  getDateRange,
  getEventAndConditions,
  getDashboardCreateParameters,
  getIntervalInSeconds,
  getGlobalEventCondition,
  getLngFromLocalStorage,
  getGroupCondition,
  validMultipleEventAnalyticsItems,
  validateFilterConditions,
} from '../analytics-utils';
import AttributeGroup from '../comps/AttributeGroup';
import ExploreDateRangePicker, {
  DEFAULT_WEEK_RANGE,
} from '../comps/ExploreDateRangePicker';
import ExploreEmbedFrame from '../comps/ExploreEmbedFrame';
import SaveToDashboardModal from '../comps/SelectDashboardModal';

interface AnalyticsFunnelProps {
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

const AnalyticsFunnel: React.FC<AnalyticsFunnelProps> = (
  props: AnalyticsFunnelProps
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
  const [groupDisabled, setGroupDisabled] = useState(false);
  const defaultChartTypeOption = QuickSightChartType.BAR;
  const chartTypeOptions: SegmentedControlProps.Option[] = [
    {
      id: QuickSightChartType.BAR,
      iconSvg: <ExtendIcon icon="BsBarChartFill" color="black" />,
    },
    {
      id: QuickSightChartType.FUNNEL,
      iconSvg: <ExtendIcon icon="BsFilter" color="black" />,
    },
  ];
  const [chartType, setChartType] = useState(defaultChartTypeOption);

  const defaultComputeMethodOption: SelectProps.Option = {
    value: ExploreComputeMethod.USER_ID_CNT,
    label: defaultStr(t('analytics:options.userNumber'), 'User number'),
  };

  const computeMethodOptions: SelectProps.Options = [
    defaultComputeMethodOption,
    {
      value: ExploreComputeMethod.EVENT_CNT,
      label: defaultStr(t('analytics:options.eventNumber'), 'Event number'),
    },
  ];

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

  const [dateRangeValue, setDateRangeValue] =
    useState<DateRangePickerProps.Value>(DEFAULT_WEEK_RANGE);

  const [timeGranularity, setTimeGranularity] = useState<SelectProps.Option>({
    value: ExploreGroupColumn.DAY,
    label: defaultStr(t('analytics:options.dayTimeGranularity')),
  });
  const [selectedMetric, setSelectedMetric] =
    useState<SelectProps.Option | null>(defaultComputeMethodOption);

  const [windowValue, setWindowValue] = useState<string>('10');

  const [selectedWindowType, setSelectedWindowType] =
    useState<SelectProps.Option | null>(customWindowType);

  const [selectedWindowUnit, setSelectedWindowUnit] =
    useState<SelectProps.Option | null>(minuteWindowUnitOption);

  const [associateParameterChecked, setAssociateParameterChecked] =
    useState<boolean>(true);

  const [eventDataState, eventDataDispatch] = useReducer(
    analyticsEventSelectReducer,
    [
      {
        ...DEFAULT_EVENT_ITEM,
        isMultiSelect: false,
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

  const [groupApplyToFirst, setGroupApplyToFirst] = React.useState(false);

  const getFunnelRequest = (
    action: ExploreRequestAction,
    dashboardId?: string,
    dashboardName?: string,
    sheetId?: string,
    sheetName?: string,
    chartTitle?: string,
    chartSubTitle?: string
  ) => {
    const funnelId = generateStr(6, true);
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
      sheetName: `funnel_sheet_${funnelId}`,
      viewName: `funnel_view_${funnelId}`,
      dashboardCreateParameters: parameters,
      computeMethod: selectedMetric?.value ?? ExploreComputeMethod.USER_ID_CNT,
      specifyJoinColumn: associateParameterChecked,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType:
        selectedWindowType?.value ?? ExploreConversionIntervalType.CURRENT_DAY,
      conversionIntervalInSeconds: getIntervalInSeconds(
        selectedWindowType,
        selectedWindowUnit,
        windowValue
      ),
      eventAndConditions: getEventAndConditions(eventDataState),
      globalEventCondition: getGlobalEventCondition(filterOptionData),
      timeScopeType: dateRangeParams?.timeScopeType,
      groupColumn: timeGranularity.value,
      groupCondition:
        chartType === QuickSightChartType.BAR
          ? getGroupCondition(groupOption, groupApplyToFirst)
          : undefined,
      ...dateRangeParams,
      ...saveParams,
    };
    return body;
  };

  const validateEventSelection = () => {
    if (
      eventDataState.length === 0 ||
      !validMultipleEventAnalyticsItems(eventDataState)
    ) {
      dispatch?.({
        type: StateActionType.SHOW_EVENT_VALID_ERROR,
      });
      return false;
    }
    if (eventDataState.length < 2) {
      dispatch?.({
        type: StateActionType.HIDE_EVENT_VALID_ERROR,
      });
      alertMsg(t('analytics:valid.selectTwoEvent'), 'error');
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
      const body = getFunnelRequest(ExploreRequestAction.PREVIEW);
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
      const { success, data }: ApiResponse<any> = await previewFunnel(body);
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

  const resetConfig = async () => {
    setLoadingData(true);
    setSelectedMetric({
      value: ExploreComputeMethod.USER_ID_CNT,
      label: t('analytics:options.userNumber') ?? 'User number',
    });
    setSelectedWindowType(customWindowType);
    setSelectedWindowUnit({
      value: 'minute',
      label: defaultStr(t('analytics:options.minuteWindowUnit')),
    });
    setAssociateParameterChecked(true);
    eventDataDispatch({
      type: 'resetEventData',
      defaultComputeMethodOption: defaultComputeMethodOption,
      isMultiSelect: false,
      enableChangeRelation: true,
    });
    filterOptionDataDispatch({
      type: 'resetFilterData',
      presetParameters,
    });
    setDateRangeValue(DEFAULT_WEEK_RANGE);
    setTimeGranularity({
      value: ExploreGroupColumn.DAY,
      label: defaultStr(t('analytics:options.dayTimeGranularity')),
    });
    setExploreEmbedUrl('');
    setLoadingData(false);
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
      const body = getFunnelRequest(
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
      const { success }: ApiResponse<any> = await previewFunnel(body);
      if (success) {
        setSelectDashboardModalVisible(false);
      }
    } catch (error) {
      console.log(error);
    }
    setLoadingData(false);
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

  useEffect(() => {
    if (chartType === 'funnel') {
      setGroupDisabled(true);
      setGroupOption(null);
      setGroupApplyToFirst(false);
    } else {
      setGroupDisabled(false);
    }
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
                      payload: HelpPanelType.EXPLORE_FUNNEL_INFO,
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
              {t('analytics:explore.funnelAnalysis')}
            </Header>
          }
        >
          <div className="cs-analytics-config">
            <SpaceBetween direction="vertical" size="xs">
              <InfoTitle
                title={t('analytics:labels.metrics')}
                popoverDescription={t(
                  'analytics:information.funnelMetricsInfo'
                )}
              />
              <Select
                selectedOption={selectedMetric}
                options={computeMethodOptions}
                onChange={(event) => {
                  setSelectedMetric(event.detail.selectedOption);
                }}
              />
            </SpaceBetween>
          </div>
          <br />
          <ColumnLayout columns={2} variant="text-grid">
            <SpaceBetween direction="vertical" size="xs">
              <SectionTitle
                type="event"
                title={t('analytics:labels.funnelSteps')}
                description={t('analytics:information.funnelStepsInfo')}
              />
              <div className="mt-10">
                <SpaceBetween direction="vertical" size="xs">
                  <InfoTitle
                    title={t('analytics:labels.window')}
                    popoverDescription={t(
                      'analytics:information.funnelWindowInfo'
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
                              setSelectedWindowUnit(
                                event.detail.selectedOption
                              );
                            }}
                          />
                        </div>
                      </>
                    ) : null}
                  </div>
                </SpaceBetween>
                <br />
                <AnalyticsEventSelect
                  eventPlaceholder={t(
                    'analytics:labels.eventSelectPlaceholder'
                  )}
                  loading={loadingEvents}
                  eventDataState={eventDataState}
                  eventDataDispatch={eventDataDispatch}
                  addEventButtonLabel={t('common:button.addFunnelStep')}
                  eventOptionList={categoryEvents}
                  defaultComputeMethodOption={defaultComputeMethodOption}
                  builtInMetadata={builtInMetadata}
                  metadataEvents={metadataEvents}
                  metadataEventParameters={metadataEventParameters}
                  metadataUserAttributes={metadataUserAttributes}
                  isMultiSelect={false}
                  enableChangeRelation={true}
                />
              </div>
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
                disabled={groupDisabled}
                type="group"
                description={t('analytics:information.groupInfo')}
              />
              <AttributeGroup
                disabled={groupDisabled}
                groupParameters={groupParameters}
                groupOption={groupOption}
                setGroupOption={setGroupOption}
              />

              <InfoTitle
                title={t('analytics:labels.groupApplyToFirst')}
                popoverDescription={t(
                  'analytics:information.groupApplyToFirstInfo'
                )}
              />
              <Toggle
                onChange={({ detail }) => setGroupApplyToFirst(detail.checked)}
                checked={groupApplyToFirst}
                disabled={groupDisabled}
              >
                {groupApplyToFirst ? t('yes') : t('no')}
              </Toggle>
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

export default AnalyticsFunnel;
