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
  getDateTimeWithTimezoneString,
  getLocaleDateString,
  SegmentDdbItem,
  SegmentJobStatus,
  SegmentJobStatusItem,
  SegmentUserItem,
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
import { getApplicationDetail } from 'apis/application';
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
import moment from 'moment-timezone';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { createDownloadLink, defaultStr, ternary } from 'ts/utils';

const UserSegmentDetails: React.FC = () => {
  const { t } = useTranslation();
  const [segment, setSegment] = useState<SegmentDdbItem>();
  const [timezone, setTimezone] = useState('');
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

  // Get segment setting details
  useEffect(() => {
    const getSegmentDetails = async () => {
      setIsLoading(true);

      const segmentApiResponse = await getSegmentById({
        appId: appId,
        segmentId: segmentId,
      });
      if (segmentApiResponse.success) {
        const segment: SegmentDdbItem = segmentApiResponse.data;
        setSegment(segment);
      }

      // Get app details for timezone info
      const appApiResponse = await getApplicationDetail({
        id: appId,
        pid: projectId,
      });
      if (appApiResponse.success) {
        const { timezone } = appApiResponse.data;
        setTimezone(timezone);
      }

      setIsLoading(false);
    };

    getSegmentDetails();
  }, []);

  // Get segment job history and sample data
  useEffect(() => {
    getSegmentJobHistory();
    getSegmentSampleData();
  }, []);

  const getSegmentJobHistory = async () => {
    setIsJobsLoading(true);

    const segmentJobsResponse = await getSegmentJobs({ segmentId });
    if (segmentJobsResponse.success) {
      setSegmentJobs(segmentJobsResponse.data);
    }

    setIsJobsLoading(false);
  };

  const getSegmentSampleData = async () => {
    setIsSampleDataLoading(true);

    const sampleDataResponse = await getSampleData({ segmentId });
    if (sampleDataResponse.success) {
      setSegmentSample(sampleDataResponse.data);
    }

    setIsSampleDataLoading(false);
  };

  const renderSegmentTrendChart = () => {
    const getTimeLabel = (time: number) =>
      getDateTimeWithTimezoneString(time, timezone);
    const jobs = segmentJobs.filter((job) => job.jobStatus === 'Completed');

    return (
      <MixedLineBarChart
        series={ternary(
          jobs.length === 0,
          [],
          [
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
              title: defaultStr(t('analytics:segment.details.totalUserNumber')),
              type: 'line',
              data: jobs.map((job) => ({
                x: getTimeLabel(job.jobStartTime),
                y: job.totalUserNumber,
              })),
            },
          ]
        )}
        xDomain={jobs.map((job) => getTimeLabel(job.jobStartTime))}
        xScaleType="categorical"
        xTitle={defaultStr(t('analytics:segment.details.date'))}
        yTitle={defaultStr(t('analytics:segment.details.userNumber'))}
        hideFilter
        statusType={ternary(isJobsLoading, 'loading', 'finished')}
        empty={
          <Box textAlign="center" color="inherit">
            <b>{defaultStr(t('analytics:segment.details.noSegmentJobData'))}</b>
          </Box>
        }
      />
    );
  };

  const renderJobStatusCell = (status: SegmentJobStatus) => {
    switch (status) {
      case SegmentJobStatus.COMPLETED:
        return (
          <StatusIndicator type="success">
            {t('status.completed')}
          </StatusIndicator>
        );
      case SegmentJobStatus.IN_PROGRESS:
        return (
          <StatusIndicator type="in-progress">
            {t('status.inProgress')}
          </StatusIndicator>
        );
      case SegmentJobStatus.FAILED:
        return (
          <StatusIndicator type="error">{t('status.failed')}</StatusIndicator>
        );
      case SegmentJobStatus.PENDING:
        return (
          <StatusIndicator type="pending">
            {t('status.pending')}
          </StatusIndicator>
        );
    }
  };

  const renderExportDownloadLink = (jobStatusItem: SegmentJobStatusItem) => {
    return (
      <Button
        variant="icon"
        iconName="download"
        disabled={jobStatusItem.jobStatus !== SegmentJobStatus.COMPLETED}
        onClick={async () => {
          const segmentApiResponse = await getExportFileS3Url({
            projectId,
            appId,
            segmentId,
            jobRunId: jobStatusItem.jobRunId,
          });

          if (segmentApiResponse.success) {
            const url = segmentApiResponse.data.presignedUrl;
            const name = defaultStr(segment?.name, 'segment') + '.csv';
            createDownloadLink(url, name);
          }
        }}
      />
    );
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
                        description={defaultStr(segment?.description)}
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
                        {defaultStr(segment?.name)}
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
                            {getRefreshSchedule(segment, timezone)}
                          </Box>
                        </div>
                        <div>
                          <Box variant="awsui-key-label">
                            {t('analytics:segment.details.refreshExpiration')}
                          </Box>
                          <Box margin={{ top: 'xxs' }}>
                            {getAutoRefreshExpiration(segment, timezone)}
                          </Box>
                        </div>
                        <div>
                          <Box variant="awsui-key-label">
                            {t('analytics:segment.details.createdBy')}
                          </Box>
                          <Box margin={{ top: 'xxs' }}>
                            {getCreatedByInfo(segment, timezone)}
                          </Box>
                        </div>
                        <div>
                          <Box variant="awsui-key-label">
                            {t('analytics:segment.details.updatedBy')}
                          </Box>
                          <Box margin={{ top: 'xxs' }}>
                            {getUpdatedByInfo(segment, timezone)}
                          </Box>
                        </div>
                      </ColumnLayout>
                    </Box>
                    <Box margin={{ vertical: 'l' }}>
                      {renderSegmentTrendChart()}
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
                            renderJobStatusCell(e.jobStatus),
                        },
                        {
                          id: 'startTime',
                          header: t('analytics:segment.details.startTime'),
                          cell: (e: SegmentJobStatusItem) =>
                            getDateTimeWithTimezoneString(
                              e.jobStartTime,
                              timezone
                            ),
                        },
                        {
                          id: 'endTime',
                          header: t('analytics:segment.details.endTime'),
                          cell: (e: SegmentJobStatusItem) =>
                            ternary(
                              e.jobEndTime === 0,
                              '-',
                              getDateTimeWithTimezoneString(
                                e.jobEndTime,
                                timezone
                              )
                            ),
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
                          cell: (e: SegmentJobStatusItem) =>
                            renderExportDownloadLink(e),
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
                          cell: (e: SegmentUserItem) => e.user_pseudo_id,
                        },
                        {
                          id: 'user_id',
                          header: 'User id',
                          cell: (e: SegmentUserItem) => e.user_id,
                        },
                        {
                          id: 'event_timestamp',
                          header: 'Event timestamp',
                          cell: (e: SegmentUserItem) => e.event_timestamp,
                        },
                        {
                          id: 'user_properties_json_str',
                          header: 'User properties',
                          cell: (e: SegmentUserItem) =>
                            e.user_properties_json_str,
                        },
                        {
                          id: 'first_touch_time_msec',
                          header: 'First touch time',
                          cell: (e: SegmentUserItem) => e.first_touch_time_msec,
                        },
                        {
                          id: 'first_visit_date',
                          header: 'First visit date',
                          cell: (e: SegmentUserItem) => e.first_visit_date,
                        },
                        {
                          id: 'first_app_install_source',
                          header: 'First app install source',
                          cell: (e: SegmentUserItem) =>
                            e.first_app_install_source,
                        },
                        {
                          id: 'first_referrer',
                          header: 'First referrer',
                          cell: (e: SegmentUserItem) => e.first_referrer,
                        },
                        {
                          id: 'first_traffic_category',
                          header: 'First traffic category',
                          cell: (e: SegmentUserItem) =>
                            e.first_traffic_category,
                        },
                        {
                          id: 'first_traffic_source',
                          header: 'First traffic source',
                          cell: (e: SegmentUserItem) => e.first_traffic_source,
                        },
                        {
                          id: 'first_traffic_medium',
                          header: 'First traffic medium',
                          cell: (e: SegmentUserItem) => e.first_traffic_medium,
                        },
                        {
                          id: 'first_traffic_campaign_id',
                          header: 'First traffic campaign id',
                          cell: (e: SegmentUserItem) =>
                            e.first_traffic_campaign_id,
                        },
                        {
                          id: 'first_traffic_campaign',
                          header: 'First traffic campaign',
                          cell: (e: SegmentUserItem) =>
                            e.first_traffic_campaign,
                        },
                        {
                          id: 'first_traffic_content',
                          header: 'First traffic content',
                          cell: (e: SegmentUserItem) => e.first_traffic_content,
                        },
                        {
                          id: 'first_traffic_term',
                          header: 'First traffic term',
                          cell: (e: SegmentUserItem) => e.first_traffic_term,
                        },
                        {
                          id: 'first_traffic_clid_platform',
                          header: 'First traffic clid platform',
                          cell: (e: SegmentUserItem) =>
                            e.first_traffic_clid_platform,
                        },
                        {
                          id: 'first_traffic_clid',
                          header: 'First traffic clid',
                          cell: (e: SegmentUserItem) => e.first_traffic_clid,
                        },
                        {
                          id: 'first_traffic_channel_group',
                          header: 'First traffic channel group',
                          cell: (e: SegmentUserItem) =>
                            e.first_traffic_channel_group,
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

const getRefreshSchedule = (segment, timezone) => {
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
    const tz = moment.tz(timezone).format('z');
    return `${type} | ${day} ${time}(${tz})`;
  }
};

const getAutoRefreshExpiration = (
  segment: SegmentDdbItem | undefined,
  timezone: string
) => {
  if (!segment) {
    return '-';
  }

  const expiration = segment?.refreshSchedule.expireAfter;
  return getDateTimeWithTimezoneString(expiration, timezone);
};

const getCreatedByInfo = (
  segment: SegmentDdbItem | undefined,
  timezone: string
) => {
  if (!segment) {
    return '-';
  }

  return (
    <>
      <Box variant="p">{segment.createBy}</Box>
      <Box variant="p">{getLocaleDateString(segment.createAt, timezone)}</Box>
    </>
  );
};

const getUpdatedByInfo = (
  segment: SegmentDdbItem | undefined,
  timezone: string
) => {
  if (!segment) {
    return '-';
  }

  return (
    <>
      <Box variant="p">{segment.lastUpdateBy}</Box>
      <Box variant="p">
        {getLocaleDateString(segment.lastUpdateAt, timezone)}
      </Box>
    </>
  );
};

export default UserSegmentDetails;
