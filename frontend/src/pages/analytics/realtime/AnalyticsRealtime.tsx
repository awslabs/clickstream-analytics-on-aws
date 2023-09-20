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
  Alert,
  AppLayout,
  Button,
  ColumnLayout,
  Container,
  ContentLayout,
  DateRangePicker,
  DateRangePickerProps,
  Header,
  Link,
  Popover,
  SpaceBetween,
  Toggle,
} from '@cloudscape-design/components';
import AnalyticsNavigation from 'components/layouts/AnalyticsNavigation';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import i18n from 'i18n';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

const AnalyticsRealtime: React.FC = () => {
  const { t } = useTranslation();
  const { projectId, appId } = useParams();

  const [checked, setChecked] = React.useState(false);

  const [dateRangeValue, setDateRangeValue] =
    React.useState<DateRangePickerProps.Value>({
      type: 'relative',
      amount: 30,
      unit: 'minute',
    });

  const relativeOptions: ReadonlyArray<DateRangePickerProps.RelativeOption> = [
    {
      key: 'previous-10-minute',
      amount: 10,
      unit: 'minute',
      type: 'relative',
    },
    {
      key: 'previous-30-minute',
      amount: 30,
      unit: 'minute',
      type: 'relative',
    },
    {
      key: 'previous-1-hour',
      amount: 1,
      unit: 'hour',
      type: 'relative',
    },
  ];

  const isValidRange = (
    range: DateRangePickerProps.Value | null
  ): DateRangePickerProps.ValidationResult => {
    if (range?.type === 'absolute') {
      const [startDateWithoutTime] = range.startDate.split('T');
      const [endDateWithoutTime] = range.endDate.split('T');
      if (!startDateWithoutTime || !endDateWithoutTime) {
        return {
          valid: false,
          errorMessage: t('analytics:valid.dateRangeIncomplete'),
        };
      }
      if (
        new Date(range.startDate).getTime() -
          new Date(range.endDate).getTime() >
        0
      ) {
        return {
          valid: false,
          errorMessage: t('analytics:valid.dateRangeInvalid'),
        };
      }
    }
    return { valid: true };
  };

  const breadcrumbItems = [
    {
      text: t('breadCrumb.analyticsStudio'),
      href: '/analytics',
    },
    {
      text: t('breadCrumb.realtime'),
      href: `/analytics/${projectId}/app/${appId}/realtime`,
    },
  ];

  return (
    <div className="flex">
      <AnalyticsNavigation
        activeHref={`/analytics/${projectId}/app/${appId}/realtime`}
      />
      <div className="flex-1">
        <AppLayout
          toolsHide
          navigationHide
          content={
            <ContentLayout
              header={
                <SpaceBetween size="m">
                  <Header
                    variant="h1"
                    description={t('analytics:realtime.description')}
                    info={
                      <Popover
                        triggerType="custom"
                        content={t('analytics:information.realtimeInfo')}
                      >
                        <Link variant="info">Info</Link>
                      </Popover>
                    }
                  >
                    {t('analytics:realtime.title')}
                  </Header>
                </SpaceBetween>
              }
            >
              <Container>
                <ColumnLayout columns={2}>
                  <div>
                    <Toggle
                      onChange={({ detail }) => setChecked(detail.checked)}
                      checked={checked}
                    >
                      {checked
                        ? t('analytics:labels.realtimeStarted')
                        : t('analytics:labels.realtimeStopped')}
                    </Toggle>
                  </div>
                  <div>
                    <DateRangePicker
                      onChange={({ detail }) => {
                        setDateRangeValue(
                          detail.value as DateRangePickerProps.Value
                        );
                      }}
                      value={dateRangeValue ?? null}
                      relativeOptions={relativeOptions}
                      isValidRange={isValidRange}
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
                          )} ${value.amount} ${i18n.t(
                            `analytics:dateRange.${value.unit}`
                          )}`;
                        },
                      }}
                    />
                  </div>
                </ColumnLayout>
                <br />
                <Alert
                  statusIconAriaLabel="Info"
                  action={
                    <Button iconAlign="right" iconName="external">
                      {t('analytics:realtime.configProject')}
                    </Button>
                  }
                >
                  {t('analytics:realtime.disableMessage')}
                </Alert>
              </Container>
            </ContentLayout>
          }
          breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
          headerSelector="#header"
        />
      </div>
    </div>
  );
};

export default AnalyticsRealtime;
