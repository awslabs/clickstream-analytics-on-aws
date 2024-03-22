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
  Container,
  DatePicker,
  FormField,
  Header,
  Input,
  RadioGroup,
  Select,
  SpaceBetween,
} from '@cloudscape-design/components';
import {
  ExtendSegment,
  IEventSegmentationObj,
} from 'components/eventselect/AnalyticsType';
import RelationAnd from 'components/eventselect/comps/RelationAnd';
import { AnalyticsSegmentActionType } from 'components/eventselect/reducer/analyticsSegmentGroupReducer';
import { useSegmentContext } from 'context/SegmentContext';
import { identity } from 'lodash';
import {
  convertCronExpByTimeRange,
  getAutoRefreshDayOptionsByType,
} from 'pages/analytics/analytics-utils';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SEGMENT_AUTO_REFRESH_OPTIONS } from 'ts/const';
import { defaultStr } from 'ts/utils';
import SegmentItem from './group/SegmentItem';

interface SegmentEditorProps {
  segmentObject: ExtendSegment;
  updateSegmentObject: (key: string, value: any) => void;
  updateSegmentState: (segment: IEventSegmentationObj) => void;
}

const SegmentEditor: React.FC<SegmentEditorProps> = (
  props: SegmentEditorProps
) => {
  const { t } = useTranslation();
  const { segmentObject, updateSegmentObject, updateSegmentState } = props;
  const { segmentDataState, segmentDataDispatch } = useSegmentContext();

  useEffect(() => {
    updateSegmentState(segmentDataState);
  }, [segmentDataState]);

  return (
    <SpaceBetween direction="vertical" size="l">
      <Container
        header={
          <Header>{t('analytics:segment.comp.userSegmentSettings')}</Header>
        }
      >
        <SpaceBetween direction="vertical" size="m">
          <FormField
            label={t('analytics:segment.comp.segmentName')}
            description={t('analytics:segment.comp.segmentNameDesc')}
          >
            <Input
              value={segmentObject.name}
              placeholder={defaultStr(
                t('analytics:segment.comp.segmentNamePlaceholder')
              )}
              onChange={(e) => updateSegmentObject('name', e.detail.value)}
            />
          </FormField>
          <FormField
            label={t('analytics:segment.comp.segmentDescription')}
            description={t('analytics:segment.comp.segmentDescriptionDesc')}
          >
            <Input
              value={segmentObject.description}
              placeholder={defaultStr(
                t('analytics:segment.comp.segmentDescriptionPlaceholder')
              )}
              onChange={(e) => {
                updateSegmentObject('description', e.detail.value);
              }}
            />
          </FormField>
          <FormField
            label={t('analytics:segment.comp.refreshMethod')}
            description={t('analytics:segment.comp.refreshMethodDesc')}
          >
            <RadioGroup
              value={segmentObject.refreshType}
              onChange={(e) => {
                updateSegmentObject('refreshType', e.detail.value);
                if (e.detail.value === 'manual') {
                  updateSegmentObject('autoRefreshOption', null);
                  updateSegmentObject('autoRefreshDayOption', null);
                  updateSegmentObject('refreshSchedule', {
                    cron: 'Manual',
                    cronExpression: undefined,
                    expireAfter: segmentObject.refreshSchedule.expireAfter,
                  });
                } else {
                  const defaultDailyOption = SEGMENT_AUTO_REFRESH_OPTIONS[0];
                  updateSegmentObject('autoRefreshOption', defaultDailyOption);
                  updateSegmentObject('refreshSchedule', {
                    cron: defaultDailyOption.value,
                    cronExpression: convertCronExpByTimeRange(
                      defaultDailyOption,
                      getAutoRefreshDayOptionsByType(
                        defaultDailyOption.value ?? ''
                      )?.[0].value ?? ''
                    ),
                    expireAfter: segmentObject.refreshSchedule.expireAfter,
                  });
                  updateSegmentObject(
                    'autoRefreshDayOption',
                    getAutoRefreshDayOptionsByType(
                      defaultDailyOption.value ?? ''
                    )?.[0]
                  );
                }
              }}
              items={[
                {
                  value: 'manual',
                  label: t('analytics:segment.comp.refreshMethodManual'),
                },
                {
                  value: 'auto',
                  label: t('analytics:segment.comp.refreshMethodAuto'),
                },
              ]}
            />
            {segmentObject.refreshType === 'auto' && (
              <div className="mt-10">
                <SpaceBetween direction="horizontal" size="xs">
                  <Select
                    selectedOption={segmentObject.autoRefreshOption}
                    options={SEGMENT_AUTO_REFRESH_OPTIONS}
                    onChange={(e) => {
                      updateSegmentObject(
                        'autoRefreshOption',
                        e.detail.selectedOption
                      );
                      updateSegmentObject(
                        'autoRefreshDayOption',
                        getAutoRefreshDayOptionsByType(
                          e.detail.selectedOption.value ?? ''
                        )?.[0]
                      );
                      updateSegmentObject('refreshSchedule', {
                        ...segmentObject.refreshSchedule,
                        cron: e.detail.selectedOption.value,
                        cronExpression: convertCronExpByTimeRange(
                          e.detail.selectedOption,
                          getAutoRefreshDayOptionsByType(
                            e.detail.selectedOption.value ?? ''
                          )?.[0]?.value ?? ''
                        ),
                      });
                    }}
                  />
                  {segmentObject.autoRefreshOption?.value === 'Custom' ? (
                    <Input
                      placeholder="cron(15 10 * * ? *)"
                      value={segmentObject.refreshSchedule.cronExpression ?? ''}
                      onChange={(e) => {
                        updateSegmentObject('refreshSchedule', {
                          ...segmentObject.refreshSchedule,
                          cronExpression: e.detail.value,
                        });
                      }}
                    />
                  ) : (
                    <Select
                      selectedOption={segmentObject.autoRefreshDayOption}
                      options={getAutoRefreshDayOptionsByType(
                        segmentObject.autoRefreshOption?.value ?? ''
                      )}
                      onChange={(e) => {
                        updateSegmentObject(
                          'autoRefreshDayOption',
                          e.detail.selectedOption
                        );
                        updateSegmentObject('refreshSchedule', {
                          ...segmentObject.refreshSchedule,
                          cronExpression: convertCronExpByTimeRange(
                            segmentObject.autoRefreshOption,
                            e.detail.selectedOption.value ?? ''
                          ),
                        });
                      }}
                    />
                  )}
                </SpaceBetween>
              </div>
            )}
          </FormField>

          <FormField
            label={t('analytics:segment.comp.expirationSettings')}
            description={t('analytics:segment.comp.expirationSettingsDesc')}
          >
            <DatePicker
              value={segmentObject.expireDate}
              isDateEnabled={(date) => date.getTime() > new Date().getTime()}
              onChange={(e) => {
                updateSegmentObject('expireDate', e.detail.value);
                updateSegmentObject('refreshSchedule', {
                  ...segmentObject.refreshSchedule,
                  expireAfter:
                    new Date(e.detail.value).getTime() - new Date().getTime(),
                });
              }}
              placeholder="YYYY/MM/DD"
            />
          </FormField>
        </SpaceBetween>
      </Container>

      <Container
        header={
          <Header description={t('analytics:segment.comp.filterGroupDesc')}>
            {t('analytics:segment.comp.filterGroup')}
          </Header>
        }
      >
        <div>
          <div className="flex-v">
            {segmentDataState?.subItemList?.map((item, index) => {
              return (
                <div data-testid="test-segment-item" key={identity(index)}>
                  <SegmentItem
                    segmentItemData={item}
                    index={index}
                    hideRemove={
                      segmentDataState.subItemList.length === 1 &&
                      index === segmentDataState.subItemList.length - 1
                    }
                  />
                  {segmentDataState.subItemList &&
                    index < segmentDataState?.subItemList?.length - 1 && (
                      <div className="cs-analytics-dropdown">
                        <RelationAnd hideRadius minHeight={50} />
                      </div>
                    )}
                </div>
              );
            })}
            <div className="mt-10">
              <Button
                data-testid="test-add-filter-group"
                iconName="add-plus"
                onClick={() => {
                  segmentDataDispatch({
                    type: AnalyticsSegmentActionType.AddFilterGroup,
                  });
                }}
              >
                {t('button.filterGroup')}
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </SpaceBetween>
  );
};

export default SegmentEditor;
