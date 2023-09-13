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
import Loading from 'components/common/Loading';
import {
  DEFAULT_RETENTION_ITEM,
  IRetentionAnalyticsItem,
  MOCK_EVENT_OPTION_LIST,
} from 'components/eventselect/AnalyticsType';
import RetentionSelect from 'components/eventselect/RetentionSelect';
import Navigation from 'components/layouts/Navigation';
import { cloneDeep } from 'lodash';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

const AnalyticsRetention: React.FC = () => {
  const { t } = useTranslation();
  const { projectId, appId } = useParams();
  const [loadingData, setLoadingData] = useState(false);

  const [eventOptionData, setEventOptionData] = useState<
    IRetentionAnalyticsItem[]
  >([
    {
      ...DEFAULT_RETENTION_ITEM,
    },
  ]);

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

  useEffect(() => {
    setLoadingData(true);
    setLoadingData(false);
  }, []);

  return (
    <AppLayout
      toolsHide
      content={
        <ContentLayout
          header={
            <SpaceBetween size="m">
              <Header variant="h1">
                {t('nav.analytics.exploreRetention')}
              </Header>
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

              <br />
              <ColumnLayout columns={2} variant="text-grid">
                <SpaceBetween direction="vertical" size="xs">
                  <Box variant="awsui-key-label">
                    {t('analytics:labels.eventsSelect')}
                  </Box>
                  <div>
                    <RetentionSelect
                      data={eventOptionData}
                      eventOptionList={MOCK_EVENT_OPTION_LIST}
                      addEventButtonLabel="留存指标"
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
                          return dataObj.filter(
                            (item, eIndex) => eIndex !== index
                          );
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
                        setEventOptionData((prev) => {
                          const dataObj = cloneDeep(prev);
                          dataObj[index].startEventOption = item;
                          return dataObj;
                        });
                      }}
                      changeRevisitEvent={(index, item) => {
                        setEventOptionData((prev) => {
                          const dataObj = cloneDeep(prev);
                          dataObj[index].revisitEventOption = item;
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
                  </div>
                  <pre>{JSON.stringify(eventOptionData, null, 2)}</pre>
                </SpaceBetween>
                <SpaceBetween direction="vertical" size="xs">
                  <Box variant="awsui-key-label">
                    {t('analytics:labels.filters')}
                  </Box>
                  <div></div>
                </SpaceBetween>
              </ColumnLayout>
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
        <Navigation
          activeHref={`/analytics/${projectId}/app/${appId}/retention`}
        />
      }
    />
  );
};

export default AnalyticsRetention;
