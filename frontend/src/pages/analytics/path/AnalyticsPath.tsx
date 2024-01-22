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
  Toggle,
} from '@cloudscape-design/components';
import { previewPath } from 'apis/analytics';
import InfoLink from 'components/common/InfoLink';
import Loading from 'components/common/Loading';
import InfoTitle from 'components/common/title/InfoTitle';
import SectionTitle from 'components/common/title/SectionTitle';
import {
  CategoryItemType,
  DEFAULT_EVENT_ITEM,
  IAnalyticsItem,
  INIT_SEGMENTATION_DATA,
} from 'components/eventselect/AnalyticsType';
import AnalyticsEventSelect from 'components/eventselect/reducer/AnalyticsEventSelect';
import AnalyticsSegmentFilter from 'components/eventselect/reducer/AnalyticsSegmentFilter';
import { analyticsEventSelectReducer } from 'components/eventselect/reducer/analyticsEventSelectReducer';
import { analyticsSegmentFilterReducer } from 'components/eventselect/reducer/analyticsSegmentFilterReducer';
import { DispatchContext } from 'context/StateContext';
import { UserContext } from 'context/UserContext';
import { StateActionType, HelpPanelType } from 'context/reducer';
import { cloneDeep } from 'lodash';
import React, { useContext, useEffect, useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { POSITIVE_INTEGER_REGEX } from 'ts/const';
import {
  QUICKSIGHT_ANALYSIS_INFIX,
  QUICKSIGHT_DASHBOARD_INFIX,
} from 'ts/constant-ln';
import {
  ExploreComputeMethod,
  ExploreRequestAction,
  ExploreGroupColumn,
  ExplorePathNodeType,
  ExplorePathSessionDef,
  MetadataPlatform,
  QuickSightChartType,
  IMetadataBuiltInList,
} from 'ts/explore-types';
import {
  alertMsg,
  defaultStr,
  generateStr,
  getEventParameters,
  getUserInfoFromLocalStorage,
  isAnalystAuthorRole,
} from 'ts/utils';
import {
  getDashboardCreateParameters,
  getDateRange,
  getEventAndConditions,
  getGlobalEventCondition,
  getIntervalInSeconds,
  getLngFromLocalStorage,
  metadataEventsConvertToCategoryItemType,
  parametersConvertToCategoryItemType,
  pathNodesConvertToCategoryItemType,
  validEventAnalyticsItem,
  validMultipleEventAnalyticsItems,
  validateFilterConditions,
} from '../analytics-utils';
import ExploreDateRangePicker, {
  DEFAULT_WEEK_RANGE,
} from '../comps/ExploreDateRangePicker';
import ExploreEmbedFrame from '../comps/ExploreEmbedFrame';
import SaveToDashboardModal from '../comps/SelectDashboardModal';
import StartNodeSelect from '../comps/StartNodeSelect';

interface AnalyticsPathProps {
  loading: boolean;
  pipeline: IPipeline;
  builtInMetadata?: IMetadataBuiltInList;
  metadataEvents: IMetadataEvent[];
  metadataEventParameters: IMetadataEventParameter[];
  metadataUserAttributes: IMetadataUserAttribute[];
  categoryEvents: CategoryItemType[];
  presetParameters: CategoryItemType[];
  nodes: {
    pageTitles: IMetadataAttributeValue[];
    pageUrls: IMetadataAttributeValue[];
    screenNames: IMetadataAttributeValue[];
    screenIds: IMetadataAttributeValue[];
  };
  loadingEvents: boolean;
}

const AnalyticsPath: React.FC<AnalyticsPathProps> = (
  props: AnalyticsPathProps
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
    nodes,
    loadingEvents,
  } = props;
  const { appId } = useParams();
  const currentUser = useContext(UserContext) ?? getUserInfoFromLocalStorage();
  const [loadingData, setLoadingData] = useState(loading);
  const [loadingChart, setLoadingChart] = useState(false);
  const [selectDashboardModalVisible, setSelectDashboardModalVisible] =
    useState(false);
  const [exploreEmbedUrl, setExploreEmbedUrl] = useState('');
  const [disableAddCondition, setDisableAddCondition] = useState(false);
  const [categoryEventsData, setCategoryEventsData] =
    useState<CategoryItemType[]>(categoryEvents);
  const dispatch = useContext(DispatchContext);

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
  const [selectedMetric, setSelectedMetric] =
    useState<SelectProps.Option | null>(defaultComputeMethodOption);

  const defaultSessionDefinitionOption: SelectProps.Option = {
    value: ExplorePathSessionDef.SESSION,
    label: defaultStr(t('analytics:options.sessionId')),
  };
  const customSessionDefinitionOption: SelectProps.Option = {
    value: ExplorePathSessionDef.CUSTOMIZE,
    label: defaultStr(t('analytics:options.sessionCustom')),
  };

  const sessionDefinitionOptions: SelectProps.Options = [
    defaultSessionDefinitionOption,
    customSessionDefinitionOption,
  ];
  const [selectedSessionDefinition, setSelectedSessionDefinition] =
    useState<SelectProps.Option | null>(defaultSessionDefinitionOption);

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

  const [windowValue, setWindowValue] = useState<string>('5');

  const [selectedWindowUnit, setSelectedWindowUnit] =
    useState<SelectProps.Option | null>(minuteWindowUnitOption);

  const defaultNodeTypeOption: SelectProps.Option = {
    value: ExplorePathNodeType.EVENT,
    label: defaultStr(t('analytics:options.pathNodeEventName')),
  };

  const nodeTypeOptions: SelectProps.Options = [
    defaultNodeTypeOption,
    {
      value: ExplorePathNodeType.SCREEN_NAME,
      label: defaultStr(t('analytics:options.pathNodeScreenName')),
    },
    {
      value: ExplorePathNodeType.SCREEN_ID,
      label: defaultStr(t('analytics:options.pathNodeScreenID')),
    },
    {
      value: ExplorePathNodeType.PAGE_TITLE,
      label: defaultStr(t('analytics:options.pathNodePageTitle')),
    },
    {
      value: ExplorePathNodeType.PAGE_URL,
      label: defaultStr(t('analytics:options.pathNodePageUrl')),
    },
  ];
  const [selectedNodeType, setSelectedNodeType] =
    useState<SelectProps.Option | null>(defaultNodeTypeOption);

  const webPlatformOption: SelectProps.Option = {
    value: MetadataPlatform.WEB,
    label: defaultStr(t('analytics:options.platformWeb')),
  };

  const [startNodeOption, setStartNodeOption] = useState<IAnalyticsItem | null>(
    null
  );

  const [eventDataState, eventDataDispatch] = useReducer(
    analyticsEventSelectReducer,
    [
      {
        ...DEFAULT_EVENT_ITEM,
        isMultiSelect: false,
        disabled: true,
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

  const [selectedPlatform, setSelectedPlatform] =
    useState<SelectProps.Option | null>(webPlatformOption);

  const [dateRangeValue, setDateRangeValue] =
    React.useState<DateRangePickerProps.Value>(DEFAULT_WEEK_RANGE);

  const [timeGranularity, setTimeGranularity] = useState<SelectProps.Option>({
    value: ExploreGroupColumn.DAY,
    label: defaultStr(t('analytics:options.dayTimeGranularity')),
  });

  const [includingOtherEvents, setIncludingOtherEvents] = React.useState(false);
  const [mergeConsecutiveEvents, setMergeConsecutiveEvents] =
    React.useState(false);

  const resetConfig = async () => {
    setLoadingData(true);
    setSelectedMetric({
      value: ExploreComputeMethod.USER_ID_CNT,
      label: defaultStr(t('analytics:options.userNumber'), 'User number'),
    });
    eventDataDispatch({
      type: 'resetEventData',
      isMultiSelect: false,
      enableChangeRelation: false,
      disabled: true,
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
    setSelectedNodeType({
      value: ExplorePathNodeType.EVENT,
      label: defaultStr(t('analytics:options.pathNodeEventName')),
    });
    setSelectedSessionDefinition({
      value: ExplorePathSessionDef.SESSION,
      label: defaultStr(t('analytics:options.sessionId')),
    });
    setSelectedWindowUnit(minuteWindowUnitOption);
    setWindowValue('5');
    setExploreEmbedUrl('');
    setSelectedPlatform(webPlatformOption);
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
      const body = getPathRequest(
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
      const { success }: ApiResponse<any> = await previewPath(body);
      if (success) {
        setSelectDashboardModalVisible(false);
      }
    } catch (error) {
      console.log(error);
    }
    setLoadingData(false);
  };

  const getPathRequest = (
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
    const pathAnalysisPlatform =
      selectedNodeType?.value !== defaultNodeTypeOption?.value
        ? selectedPlatform?.value
        : undefined;
    const pathAnalysisLagSeconds =
      selectedSessionDefinition?.value === ExplorePathSessionDef.CUSTOMIZE
        ? getIntervalInSeconds(
            selectedSessionDefinition,
            selectedWindowUnit,
            windowValue
          )
        : undefined;
    const pathAnalysisNodes = eventDataState.map((item) => {
      return defaultStr(item.selectedEventOption?.name);
    });
    const pathAnalysisParameter: IPathAnalysisParameter = {
      platform: pathAnalysisPlatform,
      sessionType: selectedSessionDefinition?.value,
      nodeType: defaultStr(selectedNodeType?.value, ExplorePathNodeType.EVENT),
      lagSeconds: pathAnalysisLagSeconds,
      nodes: pathAnalysisNodes,
      includingOtherEvents,
      mergeConsecutiveEvents,
    };

    const body: IExploreRequest = {
      action: action,
      chartType: QuickSightChartType.SANKEY,
      locale: getLngFromLocalStorage(),
      projectId: pipeline.projectId,
      pipelineId: pipeline.pipelineId,
      appId: defaultStr(appId),
      sheetName: `path_sheet_${eventId}`,
      viewName: `path_view_${eventId}`,
      dashboardCreateParameters: parameters,
      specifyJoinColumn: false,
      computeMethod: defaultStr(
        selectedMetric?.value,
        ExploreComputeMethod.USER_ID_CNT
      ),
      eventAndConditions: getEventAndConditions(eventDataState),
      globalEventCondition: getGlobalEventCondition(filterOptionData),
      maxStep: 10,
      pathAnalysis: pathAnalysisParameter,
      timeScopeType: dateRangeParams?.timeScopeType,
      groupColumn: timeGranularity.value,
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
      const body = getPathRequest(ExploreRequestAction.PREVIEW);
      if (!body) {
        alertMsg(t('analytics:valid.funnelPipelineVersionError'));
        return;
      }
      setExploreEmbedUrl('');
      setLoadingData(true);
      setLoadingChart(true);
      const { success, data }: ApiResponse<any> = await previewPath(body);
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

  const onNodeTypeChange = (event: any) => {
    setSelectedNodeType(event.detail.selectedOption);
    setDisableAddCondition(
      event.detail.selectedOption?.value !== defaultNodeTypeOption?.value
    );
    eventDataDispatch({
      type: 'resetEventData',
      isMultiSelect: false,
      enableChangeRelation: false,
      disabled: true,
    });
    filterOptionDataDispatch({
      type: 'resetFilterData',
      presetParameters,
    });
    setStartNodeOption(null);
    switch (event.detail.selectedOption?.value) {
      case ExplorePathNodeType.EVENT:
        setCategoryEventsData(
          metadataEventsConvertToCategoryItemType(metadataEvents)
        );
        break;
      case ExplorePathNodeType.SCREEN_NAME:
        setCategoryEventsData(
          pathNodesConvertToCategoryItemType(nodes?.screenNames ?? [])
        );
        break;
      case ExplorePathNodeType.SCREEN_ID:
        setCategoryEventsData(
          pathNodesConvertToCategoryItemType(nodes?.screenIds ?? [])
        );
        break;
      case ExplorePathNodeType.PAGE_TITLE:
        setCategoryEventsData(
          pathNodesConvertToCategoryItemType(nodes?.pageTitles ?? [])
        );
        break;
      case ExplorePathNodeType.PAGE_URL:
        setCategoryEventsData(
          pathNodesConvertToCategoryItemType(nodes?.pageUrls ?? [])
        );
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    setCategoryEventsData(categoryEvents);
  }, [categoryEvents]);

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
                      payload: HelpPanelType.EXPLORE_PATH_INFO,
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
              {t('analytics:explore.pathAnalysis')}
            </Header>
          }
        >
          <div className="cs-analytics-config">
            <SpaceBetween direction="vertical" size="xs">
              <InfoTitle
                title={t('analytics:labels.metrics')}
                popoverDescription={t('analytics:information.pathMetricsInfo')}
              />
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
            <SpaceBetween direction="vertical" size="xs">
              <InfoTitle
                title={t('analytics:labels.sessionDefinition')}
                popoverDescription={t(
                  'analytics:information.pathSessionDefInfo'
                )}
              />
              <div className="cs-analytics-session-window">
                <div className="cs-analytics-session-window-type">
                  <Select
                    selectedOption={selectedSessionDefinition}
                    options={sessionDefinitionOptions}
                    onChange={(event) => {
                      setSelectedSessionDefinition(event.detail.selectedOption);
                    }}
                  />
                </div>
                {selectedSessionDefinition?.value ===
                customSessionDefinitionOption?.value ? (
                  <>
                    <div className="cs-analytics-session-window-value">
                      <Input
                        type="number"
                        placeholder="5"
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
                    <div className="cs-analytics-session-window-unit">
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
            <SpaceBetween direction="vertical" size="xs">
              <InfoTitle
                title={t('analytics:labels.nodeType')}
                popoverDescription={t('analytics:information.pathNodeTypeInfo')}
              />
              <div className="cs-analytics-session-window">
                <div className="cs-analytics-session-window-type">
                  <Select
                    selectedOption={selectedNodeType}
                    options={nodeTypeOptions}
                    onChange={onNodeTypeChange}
                  />
                </div>
              </div>
            </SpaceBetween>
          </div>
          <br />
          <ColumnLayout columns={2} variant="text-grid">
            <SpaceBetween direction="vertical" size="xs">
              <SectionTitle
                type="event"
                title={t('analytics:labels.nodesSelect')}
                description={t('analytics:information.pathNodeTypeInfo')}
              />
              <InfoTitle
                title={t('analytics:labels.setStartNode')}
                popoverDescription={t(
                  'analytics:information.pathStartNodeInfo'
                )}
              />
              <StartNodeSelect
                loading={loadingEvents}
                nodes={categoryEventsData}
                nodeOption={startNodeOption}
                setNodeOption={(option) => {
                  setStartNodeOption(option);
                  const preEventList = cloneDeep(eventDataState);
                  const filterEventList = preEventList.filter(
                    (item, eIndex) => eIndex !== 0
                  );
                  const eventName = option?.name;
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
                  eventDataDispatch({
                    type: 'updateEventData',
                    eventData: [
                      {
                        ...DEFAULT_EVENT_ITEM,
                        selectedEventOption: option,
                        conditionOptions: parameterOption,
                        enableChangeRelation: false,
                        isMultiSelect: false,
                        disabled: true,
                      },
                      ...filterEventList,
                    ],
                  });
                }}
              />
              <InfoTitle
                title={t('analytics:labels.participateNodes')}
                popoverDescription={t(
                  'analytics:information.pathNodeSelectionInfo'
                )}
              />

              <AnalyticsEventSelect
                eventPlaceholder={t('analytics:labels.nodeSelectPlaceholder')}
                loading={loadingEvents}
                disableAddCondition={disableAddCondition}
                eventDataState={eventDataState}
                eventDataDispatch={eventDataDispatch}
                addEventButtonLabel={t('common:button.addNode')}
                eventOptionList={categoryEventsData}
                defaultComputeMethodOption={defaultComputeMethodOption}
                builtInMetadata={builtInMetadata}
                metadataEvents={metadataEvents}
                metadataEventParameters={metadataEventParameters}
                metadataUserAttributes={metadataUserAttributes}
                isMultiSelect={false}
                enableChangeRelation={true}
                enableChangeMultiSelect={false}
              />

              <div className="cs-analytics-config">
                <SpaceBetween direction="vertical" size="xs">
                  <InfoTitle
                    title={t('analytics:labels.includingOtherEvents')}
                    popoverDescription={t(
                      'analytics:information.pathIncludeOtherInfo'
                    )}
                  />
                  <Toggle
                    onChange={({ detail }) =>
                      setIncludingOtherEvents(detail.checked)
                    }
                    checked={includingOtherEvents}
                  >
                    {includingOtherEvents ? t('yes') : t('no')}
                  </Toggle>
                </SpaceBetween>
                <SpaceBetween direction="vertical" size="xs">
                  <InfoTitle
                    title={t('analytics:labels.mergeConsecutiveEvents')}
                    popoverDescription={t(
                      'analytics:information.pathMergeNodeInfo'
                    )}
                  />
                  <Toggle
                    onChange={({ detail }) =>
                      setMergeConsecutiveEvents(detail.checked)
                    }
                    checked={mergeConsecutiveEvents}
                  >
                    {mergeConsecutiveEvents ? t('yes') : t('no')}
                  </Toggle>
                </SpaceBetween>
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

export default AnalyticsPath;
