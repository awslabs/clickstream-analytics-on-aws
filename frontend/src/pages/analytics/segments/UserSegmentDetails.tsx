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
  SegmentDdbItem,
  SegmentJobStatus,
  SegmentJobStatusItem,
} from '@aws/clickstream-base-lib';
import {
  AppLayout,
  Box,
  Button,
  ButtonDropdown,
  ColumnLayout,
  Container,
  ContentLayout,
  Header,
  MixedLineBarChart,
  Spinner,
  StatusIndicator,
} from '@cloudscape-design/components';
import Table from '@cloudscape-design/components/table';
import {
  deleteSegment,
  getExportFileS3Url,
  getSampleData,
  getSegmentById,
  getSegmentJobs,
  refreshSegment,
} from 'apis/segments';
import AnalyticsNavigation from 'components/layouts/AnalyticsNavigation';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import HelpInfo from 'components/layouts/HelpInfo';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { defaultStr } from '../../../ts/utils';

const UserSegmentDetails: React.FC = () => {
  const { t } = useTranslation();
  const [segment, setSegment] = useState<SegmentDdbItem>();
  const [isLoading, setIsLoading] = useState(false);
  const [segmentJobs, setSegmentJobs] = useState<SegmentJobStatusItem[]>([]);
  const [isJobsLoading, setIsJobsLoading] = useState(false);
  const [segmentSample, setSegmentSample] = useState<SegmentJobStatusItem>();
  const [isSampleDataLoading, setIsSampleDataLoading] = useState(false);

  const params = useParams();
  const projectId = params.projectId ?? '';
  const appId = params.appId ?? '';
  const segmentId = params.segmentId ?? '';

  const breadcrumbItems = [
    {
      text: t('breadCrumb.name'),
      href: '/',
    },
    {
      text: t('breadCrumb.segments'),
      href: `/analytics/${projectId}/app/${appId}/segments`,
    },
    {
      text: segmentId,
      href: `/analytics/${projectId}/app/${appId}/segments/${segmentId}`,
    },
  ];

  useEffect(() => {
    const getSegmentDetails = async () => {
      setIsLoading(true);

      const segmentApiResponse = await getSegmentById({
        appId: appId,
        segmentId: segmentId,
      });
      if (segmentApiResponse.success) {
        const segment: SegmentDdbItem = segmentApiResponse.data;
        console.log(segment);
        setSegment(segment);
      }

      setIsLoading(false);
    };

    getSegmentDetails();
  }, []);

  useEffect(() => {
    getSegmentJobHistory();
    getSegmentSampleData();
  }, []);

  const getSegmentJobHistory = async () => {
    setIsJobsLoading(true);

    const segmentJobsResponse = await getSegmentJobs({ segmentId });
    if (segmentJobsResponse.success) {
      setSegmentJobs(segmentJobsResponse.data as SegmentJobStatusItem[]);
    }

    setIsJobsLoading(false);
  };

  const getSegmentSampleData = async () => {
    setIsSampleDataLoading(true);

    const sampleDataResponse = await getSampleData({ segmentId });
    if (sampleDataResponse.success) {
      setSegmentSample(sampleDataResponse.data as SegmentJobStatusItem);
      console.log(sampleDataResponse.data);
    }

    setIsSampleDataLoading(false);
  };

  const constructSegmentTrendChart = () => {
    const getTimeLabel = (time: number) => new Date(time).toLocaleString();
    const jobs = segmentJobs.filter((job) => job.jobStatus === 'Completed');

    return (
      <MixedLineBarChart
        series={
          jobs.length === 0
            ? []
            : [
                {
                  title: defaultStr(
                    t('analytics:segment.details.segmentUserNumber')
                  ),
                  type: 'bar',
                  data: jobs.map((job) => ({
                    x: getTimeLabel(job.jobStartTime),
                    y: job.segmentUserNumber,
                  })),
                },
                {
                  title: defaultStr(
                    t('analytics:segment.details.totalUserNumber')
                  ),
                  type: 'line',
                  data: jobs.map((job) => ({
                    x: getTimeLabel(job.jobStartTime),
                    y: job.totalUserNumber,
                  })),
                },
              ]
        }
        xDomain={jobs.map((job) => getTimeLabel(job.jobStartTime))}
        xScaleType="categorical"
        xTitle={defaultStr(t('analytics:segment.details.date'))}
        yTitle={defaultStr(t('analytics:segment.details.userNumber'))}
        hideFilter
        statusType={isJobsLoading ? 'loading' : 'finished'}
        empty={
          <Box textAlign="center" color="inherit">
            <b>{defaultStr(t('analytics:segment.details.noSegmentJobData'))}</b>
          </Box>
        }
      />
    );
  };

  const constructJobStatusCell = (status: SegmentJobStatus) => {
    if (status === SegmentJobStatus.COMPLETED) {
      return (
        <StatusIndicator type="success">
          {t('status.completed')}
        </StatusIndicator>
      );
    } else if (status === SegmentJobStatus.IN_PROGRESS) {
      return (
        <StatusIndicator type="in-progress">
          {t('status.inProgress')}
        </StatusIndicator>
      );
    } else if (status === SegmentJobStatus.FAILED) {
      return (
        <StatusIndicator type="error">{t('status.failed')}</StatusIndicator>
      );
    } else if (status === SegmentJobStatus.PENDING) {
      return (
        <StatusIndicator type="pending">{t('status.pending')}</StatusIndicator>
      );
    }
  };

  return (
    <div className="flex">
      <AnalyticsNavigation
        activeHref={`/analytics/${projectId}/app/${appId}/segments`}
      />
      <div className="flex-1">
        <AppLayout
          tools={<HelpInfo />}
          navigationHide
          headerSelector="#header"
          breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
          content={
            <ContentLayout
              header={
                <Header description={t('analytics:segment.details.desc')}>
                  {t('analytics:segment.details.title')}
                </Header>
              }
            >
              {isLoading ? (
                <Container>
                  <Box textAlign="center">
                    <Spinner size="big" />
                  </Box>
                </Container>
              ) : (
                <>
                  <Container
                    header={
                      <Header
                        variant="h2"
                        description={segment?.description ?? ''}
                        actions={
                          <ButtonDropdown
                            items={[
                              {
                                text: defaultStr(t('button.edit')),
                                id: 'edit',
                              },
                              {
                                text: defaultStr(t('button.duplicate')),
                                id: 'duplicate',
                              },
                              {
                                text: defaultStr(t('button.delete')),
                                id: 'delete',
                              },
                              {
                                text: defaultStr(t('button.refreshSegment')),
                                id: 'refresh',
                              },
                            ]}
                            onItemClick={async (e) => {
                              const hrefPath = `/analytics/${projectId}/app/${appId}/segments/${segmentId}/`;

                              switch (e.detail.id) {
                                case 'delete':
                                  try {
                                    setIsLoading(true);
                                    await deleteSegment({
                                      segmentId,
                                      appId,
                                    });
                                    window.location.href = `/analytics/${projectId}/app/${appId}/segments`;
                                  } catch (error) {
                                    console.error('Failed to delete segment.');
                                  }
                                  break;
                                case 'duplicate':
                                  window.location.href = hrefPath + 'duplicate';
                                  break;
                                case 'edit':
                                  window.location.href = hrefPath + 'edit';
                                  break;
                                case 'refresh':
                                  try {
                                    setIsJobsLoading(true);
                                    await refreshSegment({
                                      segmentId,
                                      appId,
                                    });
                                    await getSegmentJobHistory();
                                  } catch (error) {
                                    console.error('Failed to refresh segment.');
                                  }
                                  break;
                                default:
                                  break;
                              }
                            }}
                          >
                            {t('button.actions')}
                          </ButtonDropdown>
                        }
                      >
                        {segment?.name ?? ''}
                      </Header>
                    }
                  >
                    <Box padding={{ vertical: 's' }}>
                      <ColumnLayout columns={4} variant="text-grid">
                        <div>
                          <Box variant="awsui-key-label">
                            {t('analytics:segment.details.refreshSchedule')}
                          </Box>
                          <Box margin={{ top: 'xxs' }}>
                            {getRefreshSchedule(segment)}
                          </Box>
                        </div>
                        <div>
                          <Box variant="awsui-key-label">
                            {t('analytics:segment.details.refreshExpiration')}
                          </Box>
                          <Box margin={{ top: 'xxs' }}>
                            {getAutoRefreshExpiration(segment)}
                          </Box>
                        </div>
                        <div>
                          <Box variant="awsui-key-label">
                            {t('analytics:segment.details.createdBy')}
                          </Box>
                          <Box margin={{ top: 'xxs' }}>
                            {getCreatedByInfo(segment)}
                          </Box>
                        </div>
                        <div>
                          <Box variant="awsui-key-label">
                            {t('analytics:segment.details.updatedBy')}
                          </Box>
                          <Box margin={{ top: 'xxs' }}>
                            {getUpdatedByInfo(segment)}
                          </Box>
                        </div>
                      </ColumnLayout>
                    </Box>
                    <Box margin={{ vertical: 'l' }}>
                      {constructSegmentTrendChart()}
                    </Box>
                    <Table
                      loading={isJobsLoading}
                      header={
                        <Header
                          variant="h2"
                          description={t(
                            'analytics:segment.details.segmentHistoryDesc'
                          )}
                        >
                          {t('analytics:segment.details.segmentHistory')}
                        </Header>
                      }
                      variant="borderless"
                      columnDefinitions={[
                        {
                          id: 'date',
                          header: t('analytics:segment.details.date'),
                          cell: (e: SegmentJobStatusItem) => e.date,
                        },
                        {
                          id: 'status',
                          header: t('analytics:segment.details.jobStatus'),
                          cell: (e: SegmentJobStatusItem) =>
                            constructJobStatusCell(e.jobStatus),
                        },
                        {
                          id: 'startTime',
                          header: t('analytics:segment.details.startTime'),
                          cell: (e: SegmentJobStatusItem) =>
                            new Date(e.jobStartTime).toLocaleString(),
                        },
                        {
                          id: 'endTime',
                          header: t('analytics:segment.details.endTime'),
                          cell: (e: SegmentJobStatusItem) =>
                            e.jobEndTime === 0
                              ? '-'
                              : new Date(e.jobEndTime).toLocaleString(),
                        },
                        {
                          id: 'userNumber',
                          header: t('analytics:segment.details.userNumber'),
                          cell: (e: SegmentJobStatusItem) =>
                            e.jobStatus === SegmentJobStatus.COMPLETED
                              ? e.segmentUserNumber
                              : '-',
                        },
                        {
                          id: 'percentageOfTotalUser',
                          header: t(
                            'analytics:segment.details.percentageOfTotalUser'
                          ),
                          cell: (e: SegmentJobStatusItem) => {
                            if (e.jobStatus !== SegmentJobStatus.COMPLETED) {
                              return '-';
                            }

                            const percentage =
                              (e.segmentUserNumber / e.totalUserNumber) * 100;
                            return percentage.toFixed(2) + '%';
                          },
                        },
                        {
                          id: 'export',
                          header: t('analytics:segment.details.export'),
                          cell: (e: SegmentJobStatusItem) => {
                            return (
                              <Button
                                variant="icon"
                                iconName="download"
                                disabled={
                                  e.jobStatus !== SegmentJobStatus.COMPLETED
                                }
                                onClick={async () => {
                                  const segmentApiResponse =
                                    await getExportFileS3Url({
                                      projectId,
                                      appId,
                                      segmentId,
                                      jobRunId: e.jobRunId,
                                    });

                                  if (segmentApiResponse.success) {
                                    const url =
                                      segmentApiResponse.data.presignedUrl;
                                    console.log(url);

                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = `${
                                      segment?.name || 'segment'
                                    }.csv`;
                                    link.click();
                                  }
                                }}
                              />
                            );
                          },
                        },
                      ]}
                      items={segmentJobs}
                    />
                  </Container>
                  <Box margin={{ vertical: 'm' }}>
                    <Table
                      loading={isSampleDataLoading}
                      header={
                        <Header
                          variant="h2"
                          description={t(
                            'analytics:segment.details.segmentUserSampleDesc'
                          )}
                        >
                          {t('analytics:segment.details.segmentUserSample')}
                        </Header>
                      }
                      variant="container"
                      columnDefinitions={[
                        {
                          id: 'user_pseudo_id',
                          header: 'User pseudo id',
                          cell: (e: any) => e.user_pseudo_id,
                        },
                        {
                          id: 'user_id',
                          header: 'User id',
                          cell: (e: any) => e.user_id,
                        },
                        {
                          id: 'event_timestamp',
                          header: 'Event timestamp',
                          cell: (e: any) => e.event_timestamp,
                        },
                        {
                          id: 'user_properties_json_str',
                          header: 'User properties',
                          cell: (e: any) => e.user_properties_json_str,
                        },
                        {
                          id: 'first_touch_time_msec',
                          header: 'First touch time',
                          cell: (e: any) => e.first_touch_time_msec,
                        },
                        {
                          id: 'first_visit_date',
                          header: 'First visit date',
                          cell: (e: any) => e.first_visit_date,
                        },
                        {
                          id: 'first_app_install_source',
                          header: 'First app install source',
                          cell: (e: any) => e.first_app_install_source,
                        },
                        {
                          id: 'first_referrer',
                          header: 'First referrer',
                          cell: (e: any) => e.first_referrer,
                        },
                        {
                          id: 'first_traffic_category',
                          header: 'First traffic category',
                          cell: (e: any) => e.first_traffic_category,
                        },
                        {
                          id: 'first_traffic_source',
                          header: 'First traffic source',
                          cell: (e: any) => e.first_traffic_source,
                        },
                        {
                          id: 'first_traffic_medium',
                          header: 'First traffic medium',
                          cell: (e: any) => e.first_traffic_medium,
                        },
                        {
                          id: 'first_traffic_campaign_id',
                          header: 'First traffic campaign id',
                          cell: (e: any) => e.first_traffic_campaign_id,
                        },
                        {
                          id: 'first_traffic_campaign',
                          header: 'First traffic campaign',
                          cell: (e: any) => e.first_traffic_campaign,
                        },
                        {
                          id: 'first_traffic_content',
                          header: 'First traffic content',
                          cell: (e: any) => e.first_traffic_content,
                        },
                        {
                          id: 'first_traffic_term',
                          header: 'First traffic term',
                          cell: (e: any) => e.first_traffic_term,
                        },
                        {
                          id: 'first_traffic_clid_platform',
                          header: 'First traffic clid platform',
                          cell: (e: any) => e.first_traffic_clid_platform,
                        },
                        {
                          id: 'first_traffic_clid',
                          header: 'First traffic clid',
                          cell: (e: any) => e.first_traffic_clid,
                        },
                        {
                          id: 'first_traffic_channel_group',
                          header: 'First traffic channel group',
                          cell: (e: any) => e.first_traffic_channel_group,
                        },
                      ]}
                      items={segmentSample?.sampleData || []}
                      empty={
                        <Box variant="h5">
                          {t('analytics:segment.details.noSampleData')}
                        </Box>
                      }
                    />
                  </Box>
                </>
              )}
            </ContentLayout>
          }
        />
      </div>
    </div>
  );
};

const getRefreshSchedule = (segment) => {
  if (!segment) {
    return '';
  }

  const type = segment.refreshSchedule.cron;
  if (type === 'Manual') {
    return type;
  } else if (type === 'Custom') {
    return type + ' | ' + segment.refreshSchedule.cronExpression;
  } else {
    const segmentObj = segment.uiRenderingObject.segmentObject;
    const day = segmentObj.autoRefreshDayOption?.label ?? '';
    const time = segmentObj.autoRefreshTimeOption?.label ?? '';
    return type + ' | ' + day + ' ' + time;
  }
};

const getAutoRefreshExpiration = (segment: SegmentDdbItem | undefined) => {
  if (!segment) {
    return '-';
  }

  const expiration = segment?.refreshSchedule.expireAfter;
  return new Date(expiration).toLocaleString();
};

const getCreatedByInfo = (segment: SegmentDdbItem | undefined) => {
  if (!segment) {
    return '-';
  }

  return (
    <>
      <Box variant="p">{segment.createBy}</Box>
      <Box variant="p">{new Date(segment.createAt).toLocaleDateString()}</Box>
    </>
  );
};

const getUpdatedByInfo = (segment: SegmentDdbItem | undefined) => {
  if (!segment) {
    return '-';
  }

  return (
    <>
      <Box variant="p">{segment.lastUpdateBy}</Box>
      <Box variant="p">
        {new Date(segment.lastUpdateAt).toLocaleDateString()}
      </Box>
    </>
  );
};

export default UserSegmentDetails;
