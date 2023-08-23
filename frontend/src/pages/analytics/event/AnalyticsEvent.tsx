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
  Select,
  SelectProps,
  SpaceBetween,
  Toggle,
} from '@cloudscape-design/components';
import { createEmbeddingContext } from 'amazon-quicksight-embedding-sdk';
import { fetchEmbeddingUrl } from 'apis/analytics';
import Loading from 'components/common/Loading';
import {
  DEFAULT_CONDITION_DATA,
  DEFAULT_EVENT_ITEM,
  IEventAnalyticsItem,
  INIT_EVENT_LIST,
  INIT_SEGMENTATION_DATA,
  MOCK_EVENT_OPTION_LIST,
  SegmetationFilterDataType,
} from 'components/eventselect/AnalyticsType';
import EventsSelect from 'components/eventselect/EventSelect';
import SegmentationFilter from 'components/eventselect/SegmentationFilter';
import Navigation from 'components/layouts/Navigation';
import { cloneDeep } from 'lodash';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { MetadataValueType } from 'ts/const';

const AnalyticsEvent: React.FC = () => {
  const { t } = useTranslation();
  const { projectId, appId } = useParams();
  const [loadingData, setLoadingData] = useState(false);

  const metricOptions = [
    {
      value: 'event',
      label: t('analytics:options.eventNumber'),
    },
    { value: 'user', label: t('analytics:options.userNumber') },
  ];

  const [selectedMetric, setSelectedMetric] =
    useState<SelectProps.Option | null>({
      value: 'event',
      label: t('analytics:options.userNumber') ?? '',
    });

  const [associateParameterChecked, setAssociateParameterChecked] =
    useState<boolean>(true);
  const [eventOptionData, setEventOptionData] =
    useState<IEventAnalyticsItem[]>(INIT_EVENT_LIST);

  const [segmentationOptionData, setSegmentationOptionData] =
    useState<SegmetationFilterDataType>(INIT_SEGMENTATION_DATA);

  const getEmbeddingUrl = async () => {
    try {
      const { success, data }: ApiResponse<any> = await fetchEmbeddingUrl(
        'ap-southeast-1',
        window.location.origin,
        'clickstream_dashboard_uat_test5_umxq_uat5_app1_a949088f',
        'ef2f9b18-8093-47d3-a3cf-59e890cfe338',
        'e0ab637b-ebc3-470c-a107-54a6b38ae07c'
      );
      if (success) {
        const embedDashboard = async () => {
          const embeddingContext = await createEmbeddingContext();
          await embeddingContext.embedVisual({
            url: data.EmbedUrl,
            container: '#qs-funnel-container',
          });
        };
        embedDashboard();
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    setLoadingData(true);
    getEmbeddingUrl();
    setLoadingData(false);
  }, []);

  useEffect(() => {
    console.info('eventOptionData:', eventOptionData);
  }, [eventOptionData]);

  return (
    <AppLayout
      toolsHide
      content={
        <ContentLayout
          header={
            <SpaceBetween size="m">
              <Header variant="h1">{t('nav.analytics.exploreEvent')}</Header>
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
                      <Button iconName="refresh">
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
                <SpaceBetween direction="vertical" size="l">
                  <div>
                    <Box variant="awsui-key-label">
                      {t('analytics:funnel.labels.metrics')}
                    </Box>
                    <Select
                      selectedOption={selectedMetric}
                      options={metricOptions}
                      onChange={(event) => {
                        setSelectedMetric(event.detail.selectedOption);
                      }}
                    />
                  </div>
                </SpaceBetween>
                <SpaceBetween direction="vertical" size="l">
                  <div>
                    <Box variant="awsui-key-label">
                      {t('analytics:funnel.labels.associateParameter')}
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
              <ColumnLayout columns={2} variant="text-grid">
                <SpaceBetween direction="vertical" size="l">
                  <div>
                    <Box variant="awsui-key-label">Define Metrics</Box>
                    <EventsSelect
                      data={eventOptionData}
                      eventOptionList={MOCK_EVENT_OPTION_LIST}
                      addEventButtonLabel={t('common:button.addEvent')}
                      addNewEventAnalyticsItem={() => {
                        setEventOptionData((prev) => {
                          const preEventList = cloneDeep(prev);
                          return [...preEventList, DEFAULT_EVENT_ITEM];
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
                      changeCurCategoryOption={(eventIndex, category) => {
                        setEventOptionData((prev) => {
                          const dataObj = cloneDeep(prev);
                          dataObj[eventIndex].selectedEventOption = category;
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

                <SpaceBetween direction="vertical" size="l">
                  <div>
                    <Box variant="awsui-key-label">Segmentation filter</Box>
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
              <div className="line"></div>
              <div>
                <Button iconName="search">Show</Button>
              </div>
            </Container>
            <Container>
              {loadingData ? (
                <Loading />
              ) : (
                <div
                  id={'qs-funnel-container'}
                  className="iframe-explore"
                ></div>
              )}
            </Container>
          </SpaceBetween>
        </ContentLayout>
      }
      headerSelector="#header"
      navigation={
        <Navigation activeHref={`/analytics/${projectId}/app/${appId}/event`} />
      }
    />
  );
};

export default AnalyticsEvent;
