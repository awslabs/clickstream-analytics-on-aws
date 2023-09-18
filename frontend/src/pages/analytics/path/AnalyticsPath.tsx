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
  Input,
  Popover,
  SegmentedControl,
  SegmentedControlProps,
  Select,
  SelectProps,
  SpaceBetween,
} from '@cloudscape-design/components';
import {
  getMetadataEventsList,
  getMetadataParametersList,
  getMetadataUserAttributesList,
  getPathNodes,
  getPipelineDetailByProjectId,
  previewPath,
  warmup,
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
import { cloneDeep } from 'lodash';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { COMMON_ALERT_TYPE } from 'ts/const';
import {
  ExploreComputeMethod,
  ExploreRequestAction,
  ExploreGroupColumn,
  ExplorePathNodeType,
  ExplorePathSessionDef,
  MetadataSource,
  MetadataValueType,
  MetadataPlatform,
} from 'ts/explore-types';
import { alertMsg, generateStr } from 'ts/utils';
import {
  getDashboardCreateParameters,
  getDateRange,
  getEventAndConditions,
  getGlobalEventCondition,
  getIntervalInSeconds,
  getWarmUpParameters,
  metadataEventsConvertToCategoryItemType,
  parametersConvertToCategoryItemType,
  pathNodesConvertToCategoryItemType,
  validEventAnalyticsItem,
} from '../analytics-utils';
import ExploreDateRangePicker from '../comps/ExploreDateRangePicker';
import ExploreEmbedFrame from '../comps/ExploreEmbedFrame';
import SaveToDashboardModal from '../comps/SelectDashboardModal';

const AnalyticsPath: React.FC = () => {
  const { t } = useTranslation();
  const { projectId, appId } = useParams();
  const [loadingData, setLoadingData] = useState(false);
  const [loadingChart, setLoadingChart] = useState(false);
  const [selectDashboardModalVisible, setSelectDashboardModalVisible] =
    useState(false);
  const [exploreEmbedUrl, setExploreEmbedUrl] = useState('');
  const [disableAddCondition, setDisableAddCondition] = useState(false);
  const [pipeline, setPipeline] = useState({} as IPipeline);
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

  const [nodes, setNodes] = useState<{
    pageTitles: IMetadataAttributeValue[];
    pageUrls: IMetadataAttributeValue[];
    screenNames: IMetadataAttributeValue[];
    screenIds: IMetadataAttributeValue[];
  }>();

  const defaultComputeMethodOption: SelectProps.Option = {
    value: ExploreComputeMethod.USER_ID_CNT,
    label: t('analytics:options.userNumber') ?? '',
  };

  const computeMethodOptions: SelectProps.Options = [
    defaultComputeMethodOption,
    {
      value: ExploreComputeMethod.EVENT_CNT,
      label: t('analytics:options.eventNumber') ?? '',
    },
  ];
  const [selectedMetric, setSelectedMetric] =
    useState<SelectProps.Option | null>(defaultComputeMethodOption);

  const defaultSessionDefinitionOption: SelectProps.Option = {
    value: ExplorePathSessionDef.SESSION,
    label: t('analytics:options.sessionId') ?? '',
  };
  const customSessionDefinitionOption: SelectProps.Option = {
    value: ExplorePathSessionDef.CUSTOMIZE,
    label: t('analytics:options.sessionCustom') ?? '',
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
    label: t('analytics:options.pathNodeEventName') ?? '',
  };

  const nodeTypeOptions: SelectProps.Options = [
    defaultNodeTypeOption,
    {
      value: ExplorePathNodeType.SCREEN_NAME,
      label: t('analytics:options.pathNodeScreenName') ?? '',
    },
    {
      value: ExplorePathNodeType.SCREEN_ID,
      label: t('analytics:options.pathNodeScreenID') ?? '',
    },
    {
      value: ExplorePathNodeType.PAGE_TITLE,
      label: t('analytics:options.pathNodePageTitle') ?? '',
    },
    {
      value: ExplorePathNodeType.PAGE_URL,
      label: t('analytics:options.pathNodePageUrl') ?? '',
    },
  ];
  const [selectedNodeType, setSelectedNodeType] =
    useState<SelectProps.Option | null>(defaultNodeTypeOption);

  const defaultPlatformOption: SelectProps.Option = {
    value: MetadataPlatform.WEB,
    label: t('analytics:options.platformWeb') ?? '',
  };

  const platformOptions: SelectProps.Options = [
    defaultPlatformOption,
    {
      value: MetadataPlatform.ANDROID,
      label: t('analytics:options.platformAndroid') ?? '',
    },
    {
      value: MetadataPlatform.IOS,
      label: t('analytics:options.platformIOS') ?? '',
    },
    {
      value: MetadataPlatform.WECHAT_MINIPROGRAM,
      label: t('analytics:options.platformWechatMinPro') ?? '',
    },
  ];

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

  const [selectedPlatform, setSelectedPlatform] =
    useState<SelectProps.Option | null>(defaultPlatformOption);

  const getEventParameters = (eventName?: string) => {
    const event = originEvents.find((item) => item.name === eventName);
    if (event) {
      return event.associatedParameters;
    }
    return [];
  };

  const getAllPathNodes = async () => {
    try {
      const { success, data }: ApiResponse<any> = await getPathNodes(
        projectId ?? '',
        appId ?? ''
      );
      if (success) {
        setNodes(data);
      }
    } catch (error) {
      console.log(error);
    }
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
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (projectId && appId) {
      loadPipeline();
      listMetadataEvents();
      listAllAttributes();
      getAllPathNodes();
    }
  }, [projectId, appId]);

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
    setSelectedMetric({
      value: ExploreComputeMethod.USER_ID_CNT,
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
      amount: 1,
      unit: 'month',
    });
    setTimeGranularity({
      value: ExploreGroupColumn.DAY,
      label: t('analytics:options.dayTimeGranularity') ?? '',
    });
    setSelectedNodeType({
      value: ExplorePathNodeType.EVENT,
      label: t('analytics:options.pathNodeEventName') ?? '',
    });
    setSelectedSessionDefinition({
      value: ExplorePathSessionDef.SESSION,
      label: t('analytics:options.sessionId') ?? '',
    });
    setSelectedWindowUnit(minuteWindowUnitOption);
    setWindowValue('5');
    setExploreEmbedUrl('');
    setSelectedPlatform(defaultPlatformOption);

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
      const body = getPathRequest(
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
    const pathAnalysisNodes =
      selectedNodeType?.value !== defaultNodeTypeOption?.value
        ? eventOptionData.map((item) => {
            return item.selectedEventOption?.value ?? '';
          })
        : [];
    const pathAnalysisParameter: IPathAnalysisParameter = {
      platform: pathAnalysisPlatform,
      sessionType: selectedSessionDefinition?.value,
      nodeType: selectedNodeType?.value ?? ExplorePathNodeType.EVENT,
      lagSeconds: pathAnalysisLagSeconds,
      nodes: pathAnalysisNodes,
    };

    const body: IExploreRequest = {
      action: action,
      projectId: pipeline.projectId,
      pipelineId: pipeline.pipelineId,
      appId: appId ?? '',
      sheetName: `path_sheet_${eventId}`,
      viewName: `path_view_${eventId}`,
      dashboardCreateParameters: parameters,
      specifyJoinColumn: false,
      computeMethod: selectedMetric?.value ?? ExploreComputeMethod.USER_ID_CNT,
      eventAndConditions: getEventAndConditions(eventOptionData),
      globalEventCondition: getGlobalEventCondition(segmentationOptionData),
      maxStep: 10,
      pathAnalysis: pathAnalysisParameter,
      timeScopeType: dateRangeParams?.timeScopeType,
      groupColumn: timeGranularity.value,
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
      const body = getPathRequest(ExploreRequestAction.PREVIEW);
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
      const { success, data }: ApiResponse<any> = await previewPath(body);
      setLoadingData(false);
      setLoadingChart(false);
      if (success && data.dashboardEmbedUrl) {
        setExploreEmbedUrl(data.dashboardEmbedUrl);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const onNodeTypeChange = (event: any) => {
    setSelectedNodeType(event.detail.selectedOption);
    setDisableAddCondition(
      event.detail.selectedOption?.value !== defaultNodeTypeOption?.value
    );
    setEventOptionData([
      {
        ...DEFAULT_EVENT_ITEM,
        isMultiSelect: false,
      },
    ]);
    setSegmentationOptionData(INIT_SEGMENTATION_DATA);
    switch (event.detail.selectedOption?.value) {
      case ExplorePathNodeType.EVENT:
        setMetadataEvents(
          metadataEventsConvertToCategoryItemType(originEvents)
        );
        break;
      case ExplorePathNodeType.SCREEN_NAME:
        setMetadataEvents(
          pathNodesConvertToCategoryItemType(nodes?.screenNames ?? [])
        );
        break;
      case ExplorePathNodeType.SCREEN_ID:
        setMetadataEvents(
          pathNodesConvertToCategoryItemType(nodes?.screenIds ?? [])
        );
        break;
      case ExplorePathNodeType.PAGE_TITLE:
        setMetadataEvents(
          pathNodesConvertToCategoryItemType(nodes?.pageTitles ?? [])
        );
        break;
      case ExplorePathNodeType.PAGE_URL:
        setMetadataEvents(
          pathNodesConvertToCategoryItemType(nodes?.pageUrls ?? [])
        );
        break;
      default:
        break;
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
              {t('analytics:explore.pathAnalysis')}
            </Header>
          }
        >
          <div className="cs-analytics-config">
            <SpaceBetween direction="vertical" size="xs">
              <Box variant="awsui-key-label">
                {t('analytics:labels.metrics')}{' '}
                <Popover
                  triggerType="custom"
                  size="small"
                  content="This instance contains insufficient memory. Stop the instance, choose a different instance type with more memory, and restart it."
                >
                  <Icon name="status-info" size="small" />
                </Popover>
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
            <SpaceBetween direction="vertical" size="xs">
              <Box variant="awsui-key-label">
                {t('analytics:labels.sessionDefinition')}{' '}
                <Popover
                  triggerType="custom"
                  size="small"
                  content="This instance contains insufficient memory. Stop the instance, choose a different instance type with more memory, and restart it."
                >
                  <Icon name="status-info" size="small" />
                </Popover>
              </Box>
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
              <Box variant="awsui-key-label">
                {t('analytics:labels.nodeType')}{' '}
                <Popover
                  triggerType="custom"
                  size="small"
                  content="This instance contains insufficient memory. Stop the instance, choose a different instance type with more memory, and restart it."
                >
                  <Icon name="status-info" size="small" />
                </Popover>
              </Box>
              <div className="cs-analytics-session-window">
                <div className="cs-analytics-session-window-type">
                  <Select
                    selectedOption={selectedNodeType}
                    options={nodeTypeOptions}
                    onChange={onNodeTypeChange}
                  />
                </div>
                {selectedNodeType?.value !== defaultNodeTypeOption?.value ? (
                  <div className="cs-analytics-session-window-unit">
                    <Select
                      selectedOption={selectedPlatform}
                      options={platformOptions}
                      onChange={(event) => {
                        setSelectedPlatform(event.detail.selectedOption);
                      }}
                    />
                  </div>
                ) : null}
              </div>
            </SpaceBetween>
          </div>
          <br />
          <ColumnLayout columns={2} variant="text-grid">
            <SpaceBetween direction="vertical" size="xs">
              <Button
                variant="link"
                iconName="menu"
                className="cs-analytics-select-event"
              >
                {t('analytics:labels.nodesSelect')}
              </Button>
              <EventsSelect
                data={eventOptionData}
                disableAddCondition={disableAddCondition}
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
                    return dataObj.filter((item, eIndex) => eIndex !== index);
                  });
                }}
                addNewConditionItem={(index: number) => {
                  setEventOptionData((prev) => {
                    const dataObj = cloneDeep(prev);
                    dataObj[index].conditionList.push(DEFAULT_CONDITION_DATA);
                    return dataObj;
                  });
                }}
                removeEventCondition={(eventIndex, conditionIndex) => {
                  setEventOptionData((prev) => {
                    const dataObj = cloneDeep(prev);
                    const newCondition = dataObj[
                      eventIndex
                    ].conditionList.filter((item, i) => i !== conditionIndex);
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
                    if (category?.valueType === MetadataValueType.STRING) {
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
                changeConditionValue={(eventIndex, conditionIndex, value) => {
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
                changeCurCategoryOption={async (eventIndex, category) => {
                  const eventName = category?.value;
                  const eventParameters = getEventParameters(eventName);
                  const parameterOption = parametersConvertToCategoryItemType(
                    userAttributes,
                    eventParameters
                  );
                  setEventOptionData((prev) => {
                    const dataObj = cloneDeep(prev);
                    dataObj[eventIndex].selectedEventOption = category;
                    dataObj[eventIndex].conditionOptions = parameterOption;
                    return dataObj;
                  });
                }}
                changeCurRelationShip={(eventIndex, relation) => {
                  setEventOptionData((prev) => {
                    const dataObj = cloneDeep(prev);
                    dataObj[eventIndex].conditionRelationShip = relation;
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

export default AnalyticsPath;
