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
import { ExtendSegment } from 'components/eventselect/AnalyticsType';
import RelationAnd from 'components/eventselect/comps/RelationAnd';
import { AnalyticsSegmentActionType } from 'components/eventselect/reducer/analyticsSegmentGroupReducer';
import { useSegmentContext } from 'context/SegmentContext';
import { identity } from 'lodash';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { defaultStr } from 'ts/utils';
import SegmentItem from './group/SegmentItem';

interface SegmentEditorProps {
  segmentObject: ExtendSegment;
  updateSegmentObject: (key: string, value: any) => void;
}

const SegmentEditor: React.FC<SegmentEditorProps> = (
  props: SegmentEditorProps
) => {
  const { t } = useTranslation();
  const { segmentObject, updateSegmentObject } = props;
  const { segmentDataState, segmentDataDispatch } = useSegmentContext();
  const [filteredData, setFilteredData] = useState<any>({});

  const filterDataRecursively = (data: any, excludeKeys: string[]): any => {
    if (Array.isArray(data)) {
      return data.map((item) => filterDataRecursively(item, excludeKeys));
    } else if (typeof data === 'object' && data !== null) {
      return Object.keys(data).reduce((acc, key) => {
        if (!excludeKeys.includes(key)) {
          acc[key] = filterDataRecursively(data[key], excludeKeys);
        }
        return acc;
      }, {});
    }
    return data;
  };

  useEffect(() => {
    const newFilteredData = filterDataRecursively(segmentDataState, [
      'eventOption',
      'eventAttributeOption',
      'values',
      'eventOperationOptions',
      'eventCalculateMethodOption',
      'userIsAttributeOptions',
      'sequenceEventAttributeOption',
    ]);
    setFilteredData(newFilteredData);
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
              value="manual"
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
            <div className="mt-10">
              <SpaceBetween direction="horizontal" size="xs">
                <Select
                  selectedOption={{ label: 'Daily', value: 'DAY' }}
                  options={[
                    { label: 'Daily', value: 'DAY' },
                    { label: 'Monthly', value: 'MONTH' },
                    { label: 'Custom(Cron)', value: 'CRON' },
                  ]}
                />
                <Select
                  selectedOption={{ label: '8PM', value: '20' }}
                  options={[
                    { label: '1AM', value: '1' },
                    { label: '12AM', value: '0' },
                    { label: '8PM', value: '20' },
                  ]}
                />
              </SpaceBetween>
            </div>
          </FormField>

          <FormField
            label={t('analytics:segment.comp.expirationSettings')}
            description={t('analytics:segment.comp.expirationSettingsDesc')}
          >
            <DatePicker value={''} placeholder="YYYY/MM/DD" />
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
        <div style={{ paddingBottom: 300 }}>
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
            <pre>{JSON.stringify(filteredData, null, 2)}</pre>
          </div>
        </div>
      </Container>
    </SpaceBetween>
  );
};

export default SegmentEditor;
