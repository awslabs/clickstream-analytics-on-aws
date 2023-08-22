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
  DateRangePicker,
  Header,
  Input,
  Select,
  SelectProps,
  SpaceBetween,
  Toggle,
} from '@cloudscape-design/components';
import { DateRangePickerProps } from '@cloudscape-design/components/date-range-picker/interfaces';
import { createEmbeddingContext } from 'amazon-quicksight-embedding-sdk';
import {
  fetchEmbeddingUrl,
  getMetadataEventDetails,
  getMetadataEventsList,
  getMetadataParametersList,
  getMetadataUserAttributesList,
  getPipelineDetailByProjectId,
  previewFunnel,
} from 'apis/analytics';
import Loading from 'components/common/Loading';
import {
  CategoryItemType,
  DEFAULT_CONDITION_DATA,
  DEFAULT_EVENT_ITEM,
  IEventAnalyticsItem,
  INIT_SEGMENTATION_DATA,
  SegmetationFilterDataType,
} from 'components/eventselect/AnalyticsType';
import EventsSelect from 'components/eventselect/EventSelect';
import SegmentationFilter from 'components/eventselect/SegmentationFilter';
import Navigation from 'components/layouts/Navigation';
import { cloneDeep } from 'lodash';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import {
  COMMON_ALERT_TYPE,
  ExploreComputeMethod,
  ExploreConversionIntervalType,
  ExploreGroupColumn,
  ExploreRelativeTimeUnit,
  ExploreTimeScopeType,
  FunnelRequestAction,
  MetadataSource,
  MetadataValueType,
} from 'ts/const';
import {
  OUTPUT_DATA_MODELING_REDSHIFT_BI_USER_NAME_SUFFIX,
  OUTPUT_DATA_MODELING_REDSHIFT_DATA_API_ROLE_ARN_SUFFIX,
  OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_NAME,
  OUTPUT_REPORTING_QUICKSIGHT_DATA_SOURCE_ARN,
} from 'ts/constant-ln';
import {
  alertMsg,
  generateStr,
  getValueFromStackOutputs,
  metadataEventsConvertToCategoryItemType,
  parametersConvertToCategoryItemType,
  validConditionItemType,
  validEventAnalyticsItem,
} from 'ts/utils';

const AnalyticsFunnel: React.FC = () => {
  const { t } = useTranslation();
  const { projectId, appId } = useParams();
  const [loadingData, setLoadingData] = useState(false);
  const [emptyData, setEmptyData] = useState(true);
  const [pipeline, setPipeline] = useState({} as IPipeline);
  const [metadataEvents, setMetadataEvents] = useState(
    [] as CategoryItemType[]
  );

  const getEmbeddingUrl = async (
    dashboardId: string,
    sheetId: string | undefined,
    visualId: string | undefined,
    containerId: string
  ) => {
    try {
      const { success, data }: ApiResponse<any> = await fetchEmbeddingUrl(
        pipeline.region,
        window.location.origin,
        dashboardId,
        sheetId,
        visualId
      );
      if (success) {
        const embedDashboard = async () => {
          const embeddingContext = await createEmbeddingContext();
          await embeddingContext.embedVisual({
            url: data.EmbedUrl,
            container: containerId,
          });
        };
        embedDashboard();
      }
    } catch (error) {
      console.log(error);
    }
  };

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
    }
    return [];
  };

  const getEventParameters = async (eventName: string | undefined) => {
    if (!projectId || !appId || !eventName) {
      return [];
    }
    try {
      const { success, data }: ApiResponse<IMetadataEvent> =
        await getMetadataEventDetails({
          projectId: projectId,
          appId: appId,
          eventName: eventName,
        });
      if (success) {
        return data.associatedParameters ?? [];
      }
    } catch (error) {
      console.log(error);
    }
    return [];
  };

  const listMetadataEvents = async () => {
    if (!projectId || !appId) {
      return;
    }
    try {
      const { success, data }: ApiResponse<ResponseTableData<IMetadataEvent>> =
        await getMetadataEventsList({ projectId, appId });
      if (success) {
        const events = metadataEventsConvertToCategoryItemType(data.items);
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
      }
    } catch (error) {
      console.log(error);
      setLoadingData(false);
    }
  };

  const listAllAttributes = async () => {
    try {
      const parameters = await getAllParameters();
      const presetParameters = parameters.filter(
        (item) => item.metadataSource === MetadataSource.PRESET
      );
      const userAttributes = await getUserAttributes();
      const presetUserAttributes = userAttributes.filter(
        (item) => item.metadataSource === MetadataSource.PRESET
      );
      const conditionOptions = parametersConvertToCategoryItemType(
        presetUserAttributes,
        presetParameters,
        []
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

  const metricOptions = [
    {
      value: ExploreComputeMethod.EVENT_CNT,
      label: t('analytics:options.eventNumber'),
    },
    {
      value: ExploreComputeMethod.USER_CNT,
      label: t('analytics:options.userNumber'),
    },
  ];
  const [dateRangeValue, setDateRangeValue] =
    React.useState<DateRangePickerProps.Value>({
      type: 'relative',
      amount: 7,
      unit: 'day',
    });

  const [windowValue, setWindowValue] = useState<string>('5');
  const [selectedMetric, setSelectedMetric] =
    useState<SelectProps.Option | null>({
      value: ExploreComputeMethod.USER_CNT,
      label: t('analytics:options.userNumber') ?? '',
    });

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
  const [selectedWindowType, setSelectedWindowType] =
    useState<SelectProps.Option | null>(customWindowType);

  const windowUnitOptions = [
    { value: 'second', label: t('analytics:options.secondWindowUnit') },
    { value: 'minute', label: t('analytics:options.minuteWindowUnit') },
    { value: 'hour', label: t('analytics:options.hourWindowUnit') },
    { value: 'day', label: t('analytics:options.dayWindowUnit') },
  ];
  const [selectedWindowUnit, setSelectedWindowUnit] =
    useState<SelectProps.Option | null>({
      value: 'minute',
      label: t('analytics:options.minuteWindowUnit') ?? '',
    });

  const [associateParameterChecked, setAssociateParameterChecked] =
    useState<boolean>(true);

  const [eventOptionData, setEventOptionData] = useState<IEventAnalyticsItem[]>(
    [
      {
        ...DEFAULT_EVENT_ITEM,
        isMultiSelect: false,
      },
    ]
  );

  const [segmentationOptionData, setSegmentationOptionData] =
    useState<SegmetationFilterDataType>(INIT_SEGMENTATION_DATA);

  const getEventAndConditions = () => {
    const eventAndConditions: IEventAndCondition[] = [];
    eventOptionData.forEach((item) => {
      if (validEventAnalyticsItem(item)) {
        const conditions: ICondition[] = [];
        item.conditionList.forEach((condition) => {
          if (validConditionItemType(condition)) {
            const conditionObj: ICondition = {
              category: 'other',
              property: condition.conditionOption?.value ?? '',
              operator: condition.conditionOperator?.value ?? '',
              value: condition.conditionValue,
              dataType:
                condition.conditionOption?.valueType ??
                MetadataValueType.STRING,
            };
            conditions.push(conditionObj);
          }
        });

        const eventAndCondition: IEventAndCondition = {
          eventName: item.selectedEventOption?.value ?? '',
          conditions: conditions,
          conditionOperator: 'and',
        };
        eventAndConditions.push(eventAndCondition);
      }
    });
    return eventAndConditions;
  };

  const getFirstEventAndConditions = () => {
    if (
      eventOptionData.length === 0 ||
      !validEventAnalyticsItem(eventOptionData[0])
    ) {
      return;
    }
    const firstEventName = eventOptionData[0].selectedEventOption?.value ?? '';
    const conditions: ICondition[] = [];
    segmentationOptionData.data.forEach((condition) => {
      if (validConditionItemType(condition)) {
        const conditionObj: ICondition = {
          category: 'other',
          property: condition.conditionOption?.value ?? '',
          operator: condition.conditionOperator?.value ?? '',
          value: condition.conditionValue,
          dataType:
            condition.conditionOption?.valueType ?? MetadataValueType.STRING,
        };
        conditions.push(conditionObj);
      }
    });
    const firstEventAndCondition: IEventAndCondition = {
      eventName: firstEventName,
      conditions: conditions,
      conditionOperator: segmentationOptionData.conditionRelationShip,
    };
    return firstEventAndCondition;
  };

  const getConversionIntervalInSeconds = () => {
    if (selectedWindowType?.value === ExploreConversionIntervalType.CUSTOMIZE) {
      if (selectedWindowUnit?.value === 'second') {
        return Number(windowValue);
      } else if (selectedWindowUnit?.value === 'minute') {
        return Number(windowValue) * 60;
      } else if (selectedWindowUnit?.value === 'hour') {
        return Number(windowValue) * 60 * 60;
      } else if (selectedWindowUnit?.value === 'day') {
        return Number(windowValue) * 60 * 60 * 24;
      }
    } else {
      return 0;
    }
  };

  const getDateRange = () => {
    let groupColumn = ExploreGroupColumn.DAY;
    if (dateRangeValue?.type === 'relative') {
      let unit = ExploreRelativeTimeUnit.DD;
      if (dateRangeValue.unit === 'day') {
        unit = ExploreRelativeTimeUnit.DD;
        groupColumn = ExploreGroupColumn.DAY;
      } else if (dateRangeValue.unit === 'week') {
        unit = ExploreRelativeTimeUnit.WK;
        groupColumn = ExploreGroupColumn.WEEK;
      } else if (dateRangeValue.unit === 'month') {
        unit = ExploreRelativeTimeUnit.MM;
      } else if (dateRangeValue.unit === 'year') {
        unit = ExploreRelativeTimeUnit.Q;
      }

      return {
        timeScopeType: ExploreTimeScopeType.RELATIVE,
        lastN: dateRangeValue.amount,
        timeUnit: unit,
        groupColumn: groupColumn,
      };
    } else if (dateRangeValue?.type === 'absolute') {
      return {
        timeScopeType: ExploreTimeScopeType.FIXED,
        timeStart: dateRangeValue.startDate,
        timeEnd: dateRangeValue.endDate,
        groupColumn: groupColumn,
      };
    }
  };

  const getFunnelRequest = (action: FunnelRequestAction) => {
    const funnelId = generateStr(6);
    const redshiftOutputs = getValueFromStackOutputs(
      pipeline,
      'DataModelingRedshift',
      [
        OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_NAME,
        OUTPUT_DATA_MODELING_REDSHIFT_DATA_API_ROLE_ARN_SUFFIX,
        OUTPUT_DATA_MODELING_REDSHIFT_BI_USER_NAME_SUFFIX,
      ]
    );
    const reportingOutputs = getValueFromStackOutputs(pipeline, 'Reporting', [
      OUTPUT_REPORTING_QUICKSIGHT_DATA_SOURCE_ARN,
    ]);
    if (
      !redshiftOutputs.get(
        OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_NAME
      ) ||
      !redshiftOutputs.get(
        OUTPUT_DATA_MODELING_REDSHIFT_DATA_API_ROLE_ARN_SUFFIX
      ) ||
      !redshiftOutputs.get(OUTPUT_DATA_MODELING_REDSHIFT_BI_USER_NAME_SUFFIX) ||
      !reportingOutputs.get(OUTPUT_REPORTING_QUICKSIGHT_DATA_SOURCE_ARN)
    ) {
      return undefined;
    }
    const dateRangeParams = getDateRange();
    const body: IFunnelRequest = {
      action: action,
      projectId: pipeline.projectId,
      pipelineId: pipeline.pipelineId,
      appId: appId ?? '',
      sheetName: `funnel_sheet_${funnelId}`,
      viewName: `funnel_view_${funnelId}`,
      dashboardCreateParameters: {
        region: pipeline.region,
        redshift: {
          user:
            redshiftOutputs.get(
              OUTPUT_DATA_MODELING_REDSHIFT_BI_USER_NAME_SUFFIX
            ) ?? '',
          dataApiRole:
            redshiftOutputs.get(
              OUTPUT_DATA_MODELING_REDSHIFT_DATA_API_ROLE_ARN_SUFFIX
            ) ?? '',
          newServerless: {
            workgroupName:
              redshiftOutputs.get(
                OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_NAME
              ) ?? '',
          },
        },
        quickSight: {
          dataSourceArn:
            reportingOutputs.get(OUTPUT_REPORTING_QUICKSIGHT_DATA_SOURCE_ARN) ??
            '',
        },
      },
      computeMethod: selectedMetric?.value ?? ExploreComputeMethod.USER_CNT,
      specifyJoinColumn: associateParameterChecked,
      joinColumn: 'user_pseudo_id',
      conversionIntervalType:
        selectedWindowType?.value ?? ExploreConversionIntervalType.CURRENT_DAY,
      conversionIntervalInSeconds: getConversionIntervalInSeconds(),
      eventAndConditions: getEventAndConditions(),
      firstEventExtraCondition: getFirstEventAndConditions(),
      timeScopeType: dateRangeParams?.timeScopeType,
      groupColumn: dateRangeParams?.groupColumn,
      ...dateRangeParams,
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
    setLoadingData(true);
    setEmptyData(false);
    try {
      const body = getFunnelRequest(FunnelRequestAction.PREVIEW);
      if (!body) {
        setLoadingData(false);
        alertMsg(
          t('analytics:valid.funnelPipelineVersionError'),
          COMMON_ALERT_TYPE.Error as AlertType
        );
        return;
      }
      console.log(body);
      const { success, data }: ApiResponse<any> = await previewFunnel(body);
      if (success) {
        getEmbeddingUrl(
          data.dashboardId,
          data.sheetId,
          data.visualIds[0],
          '#qs-funnel-container'
        );
        getEmbeddingUrl(
          data.dashboardId,
          data.sheetId,
          data.visualIds[1],
          '#qs-funnel-table-container'
        );
      }
      setLoadingData(false);
    } catch (error) {
      setLoadingData(false);
    }
  };

  const resetConfig = async () => {
    setLoadingData(true);
    setSelectedMetric({
      value: ExploreComputeMethod.USER_CNT,
      label: t('analytics:options.userNumber') ?? '',
    });
    setSelectedWindowType(customWindowType);
    setSelectedWindowUnit({
      value: 'minute',
      label: t('analytics:options.minuteWindowUnit') ?? '',
    });
    setAssociateParameterChecked(true);
    setEventOptionData([
      {
        ...DEFAULT_EVENT_ITEM,
        isMultiSelect: false,
      },
    ]);
    setSegmentationOptionData(INIT_SEGMENTATION_DATA);
    setDateRangeValue({
      type: 'relative',
      amount: 7,
      unit: 'day',
    });
    await listMetadataEvents();
    await listAllAttributes();
    setLoadingData(false);
  };

  return (
    <AppLayout
      toolsHide
      content={
        <ContentLayout
          header={
            <SpaceBetween size="m">
              <Header variant="h1">{t('nav.analytics.exploreFunnel')}</Header>
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
                        {t('analytics:funnel.labels.reset')}
                      </Button>
                      <Button variant="primary" loading={loadingData}>
                        {t('analytics:funnel.labels.save')}
                      </Button>
                    </SpaceBetween>
                  }
                >
                  {t('analytics:header.configurations')}
                </Header>
              }
            >
              <div className="cs-analytics-config">
                <SpaceBetween direction="vertical" size="xs">
                  <Box variant="awsui-key-label">
                    {t('analytics:funnel.labels.metrics')}
                  </Box>
                  <div className="cs-analytics-config">
                    <Select
                      selectedOption={selectedMetric}
                      options={metricOptions}
                      onChange={(event) => {
                        setSelectedMetric(event.detail.selectedOption);
                      }}
                    />
                  </div>
                </SpaceBetween>
                <SpaceBetween direction="vertical" size="xs">
                  <Box variant="awsui-key-label">
                    {t('analytics:funnel.labels.window')}
                  </Box>
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
                            placeholder="5"
                            value={windowValue}
                            onChange={(event) => {
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
                <SpaceBetween direction="vertical" size="xs">
                  <Box variant="awsui-key-label">
                    {t('analytics:funnel.labels.associateParameter')}
                  </Box>
                  <div className="cs-analytics-config">
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
              </div>
              <br />
              <SpaceBetween direction="vertical" size="xs">
                <Box variant="awsui-key-label">
                  {t('analytics:funnel.labels.funnelDateRange')}
                </Box>
                <div>
                  <DateRangePicker
                    onChange={({ detail }) => {
                      setDateRangeValue(
                        detail.value as DateRangePickerProps.Value
                      );
                    }}
                    value={dateRangeValue ?? null}
                    dateOnly
                    relativeOptions={[
                      {
                        key: 'previous-1-day',
                        amount: 1,
                        unit: 'day',
                        type: 'relative',
                      },
                      {
                        key: 'previous-7-days',
                        amount: 7,
                        unit: 'day',
                        type: 'relative',
                      },
                      {
                        key: 'previous-14-days',
                        amount: 14,
                        unit: 'day',
                        type: 'relative',
                      },
                      {
                        key: 'previous-1-month',
                        amount: 1,
                        unit: 'month',
                        type: 'relative',
                      },
                      {
                        key: 'previous-3-months',
                        amount: 3,
                        unit: 'month',
                        type: 'relative',
                      },
                      {
                        key: 'previous-6-months',
                        amount: 6,
                        unit: 'month',
                        type: 'relative',
                      },
                      {
                        key: 'previous-1-year',
                        amount: 1,
                        unit: 'year',
                        type: 'relative',
                      },
                    ]}
                    isValidRange={(
                      range: DateRangePickerProps.Value | null
                    ) => {
                      if (range?.type === 'absolute') {
                        const [startDateWithoutTime] =
                          range.startDate.split('T');
                        const [endDateWithoutTime] = range.endDate.split('T');
                        if (!startDateWithoutTime || !endDateWithoutTime) {
                          return {
                            valid: false,
                            errorMessage:
                              'The selected date range is incomplete. Select a start and end date for the date range.',
                          };
                        }
                        if (
                          new Date(range.startDate).getTime() -
                            new Date(range.endDate).getTime() >
                          0
                        ) {
                          return {
                            valid: false,
                            errorMessage:
                              'The selected date range is invalid. The start date must be before the end date.',
                          };
                        }
                      }
                      return { valid: true };
                    }}
                    i18nStrings={{
                      relativeModeTitle:
                        t('analytics:dateRange.relativeModeTitle') ?? '',
                      absoluteModeTitle:
                        t('analytics:dateRange.absoluteModeTitle') ?? '',
                      relativeRangeSelectionHeading:
                        t(
                          'analytics:dateRange.relativeRangeSelectionHeading'
                        ) ?? '',
                      cancelButtonLabel:
                        t('analytics:dateRange.cancelButtonLabel') ?? '',
                      applyButtonLabel:
                        t('analytics:dateRange.applyButtonLabel') ?? '',
                      clearButtonLabel:
                        t('analytics:dateRange.clearButtonLabel') ?? '',
                      customRelativeRangeOptionLabel:
                        t(
                          'analytics:dateRange.customRelativeRangeOptionLabel'
                        ) ?? '',
                      formatRelativeRange: (
                        value: DateRangePickerProps.RelativeValue
                      ) => {
                        return `${t(
                          'analytics:dateRange.formatRelativeRangeLabel'
                        )} ${value.amount} ${value.unit}`;
                      },
                    }}
                  />
                </div>
              </SpaceBetween>
              <br />
              <ColumnLayout columns={2} variant="text-grid">
                <SpaceBetween direction="vertical" size="xs">
                  <Box variant="awsui-key-label">
                    {t('analytics:funnel.labels.funnelSteps')}
                  </Box>
                  <div>
                    <EventsSelect
                      data={eventOptionData}
                      eventOptionList={metadataEvents}
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
                          return dataObj.filter(
                            (item, eIndex) => eIndex !== index
                          );
                        });
                      }}
                      addNewConditionItem={(index: number) => {
                        setEventOptionData((prev) => {
                          const dataObj = cloneDeep(prev);
                          dataObj[index].conditionList.push(
                            DEFAULT_CONDITION_DATA
                          );
                          return dataObj;
                        });
                      }}
                      removeEventCondition={(eventIndex, conditionIndex) => {
                        setEventOptionData((prev) => {
                          const dataObj = cloneDeep(prev);
                          const newCondition = dataObj[
                            eventIndex
                          ].conditionList.filter(
                            (item, i) => i !== conditionIndex
                          );
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
                          if (
                            category?.valueType === MetadataValueType.STRING
                          ) {
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
                      changeConditionValue={(
                        eventIndex,
                        conditionIndex,
                        value
                      ) => {
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
                        const eventParameters = await getEventParameters(
                          eventName
                        );
                        const userAttributes = await getUserAttributes();
                        const parameterOption =
                          parametersConvertToCategoryItemType(
                            userAttributes,
                            [],
                            eventParameters
                          );
                        setEventOptionData((prev) => {
                          const dataObj = cloneDeep(prev);
                          dataObj[eventIndex].selectedEventOption = category;
                          dataObj[eventIndex].conditionOptions =
                            parameterOption;
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
                  </div>
                </SpaceBetween>
                <SpaceBetween direction="vertical" size="xs">
                  <Box variant="awsui-key-label">
                    {t('analytics:funnel.labels.filters')}
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
              <br />
              <Button
                variant="primary"
                onClick={clickPreview}
                loading={loadingData}
              >
                {t('common:button.preview')}
              </Button>
            </Container>
            <Container>
              {loadingData ? (
                <Loading />
              ) : (
                <div id={'qs-funnel-container'} className="iframe-explore">
                  {emptyData ? (
                    <Box
                      margin={{ vertical: 'xs' }}
                      textAlign="center"
                      color="inherit"
                    >
                      <SpaceBetween size="m">
                        <b>{t('analytics:emptyData')}</b>
                      </SpaceBetween>
                    </Box>
                  ) : null}
                </div>
              )}
            </Container>
            <Container>
              {loadingData ? (
                <Loading />
              ) : (
                <div
                  id={'qs-funnel-table-container'}
                  className="iframe-explore"
                >
                  {emptyData ? (
                    <Box
                      margin={{ vertical: 'xs' }}
                      textAlign="center"
                      color="inherit"
                    >
                      <SpaceBetween size="m">
                        <b>{t('analytics:emptyData')}</b>
                      </SpaceBetween>
                    </Box>
                  ) : null}
                </div>
              )}
            </Container>
          </SpaceBetween>
        </ContentLayout>
      }
      headerSelector="#header"
      navigation={
        <Navigation
          activeHref={`/analytics/${projectId}/app/${appId}/funnel`}
        />
      }
    />
  );
};

export default AnalyticsFunnel;
