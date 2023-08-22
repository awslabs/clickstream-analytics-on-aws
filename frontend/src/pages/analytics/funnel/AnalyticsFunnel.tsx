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
  Header,
  Input,
  Select,
  SelectProps,
  SpaceBetween,
  Toggle,
} from '@cloudscape-design/components';
import { createEmbeddingContext } from 'amazon-quicksight-embedding-sdk';
import {
  fetchEmbeddingUrl,
  getMetadataEventDetails,
  getMetadataEventsList,
  getMetadataUserAttributesList,
  getPipelineDetailByProjectId,
  previewFunnel,
} from 'apis/analytics';
import Divider from 'components/common/Divider';
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
    try {
      if (!projectId || !appId) {
        return;
      }
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

  const loadPipeline = async (projectId: string) => {
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

  useEffect(() => {
    if (projectId) {
      loadPipeline(projectId);
      listMetadataEvents();
    }
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
      const conditions: ICondition[] = [];
      item.conditionList.forEach((condition) => {
        const conditionObj: ICondition = {
          category: 'other',
          property: condition.conditionOption?.value ?? '',
          operator: condition.conditionOperator?.value ?? '',
          value: condition.conditionValue,
          dataType:
            condition.conditionOption?.valueType ?? MetadataValueType.STRING,
        };
        conditions.push(conditionObj);
      });

      const eventAndCondition: IEventAndCondition = {
        eventName: item.selectedEventOption?.value ?? '',
        conditions: conditions,
        conditionOperator: 'and',
      };
      eventAndConditions.push(eventAndCondition);
    });
    return eventAndConditions;
  };

  const clickPreview = async () => {
    setLoadingData(true);
    setEmptyData(false);
    try {
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
        !redshiftOutputs.get(
          OUTPUT_DATA_MODELING_REDSHIFT_BI_USER_NAME_SUFFIX
        ) ||
        !reportingOutputs.get(OUTPUT_REPORTING_QUICKSIGHT_DATA_SOURCE_ARN)
      ) {
        alertMsg(
          t('analytics:valid.funnelPipelineVersionError'),
          COMMON_ALERT_TYPE.Error as AlertType
        );
        setLoadingData(false);
        return;
      }

      const { success, data }: ApiResponse<any> = await previewFunnel({
        action: 'PREVIEW',
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
              reportingOutputs.get(
                OUTPUT_REPORTING_QUICKSIGHT_DATA_SOURCE_ARN
              ) ?? '',
          },
        },
        computeMethod: selectedMetric?.value ?? ExploreComputeMethod.USER_CNT,
        specifyJoinColumn: associateParameterChecked,
        joinColumn: 'user_pseudo_id',
        conversionIntervalType:
          selectedWindowType?.value ??
          ExploreConversionIntervalType.CURRENT_DAY,
        conversionIntervalInSeconds: 7200,
        eventAndConditions: getEventAndConditions(),
        timeScopeType: 'RELATIVE',
        lastN: 4,
        timeUnit: 'WK',
        groupColumn: 'week',
      });
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

  const resetConfig = () => {
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
                      <Button iconName="refresh" onClick={resetConfig}>
                        {t('analytics:funnel.labels.reset')}
                      </Button>
                      <Button variant="primary">
                        {t('analytics:funnel.labels.save')}
                      </Button>
                    </SpaceBetween>
                  }
                >
                  {t('analytics:header.configurations')}
                </Header>
              }
            >
              <ColumnLayout columns={3} variant="text-grid">
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
                  <div className="cs-analytics-config">
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
              </ColumnLayout>
              <br />
              <Divider height={1} />
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
                            eventParameters,
                            userAttributes
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
                  {/* Temporary Display Data */}
                  <div>
                    <pre>
                      <code>{JSON.stringify(eventOptionData, null, 2)}</code>
                    </pre>
                  </div>
                  {/* Temporary Display Data */}
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
                  {/* Temporary Display Data */}
                  <div>
                    <pre>
                      <code>
                        {JSON.stringify(segmentationOptionData, null, 2)}
                      </code>
                    </pre>
                  </div>
                  {/* Temporary Display Data */}
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
