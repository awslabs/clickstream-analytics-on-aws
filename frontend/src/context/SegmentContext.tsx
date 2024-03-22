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

import { ConditionNumericOperator } from '@aws/clickstream-base-lib';
import { Container, Spinner } from '@cloudscape-design/components';
import { IEventSegmentationObj } from 'components/eventselect/AnalyticsType';
import {
  AnalyticsSegmentAction,
  AnalyticsSegmentActionType,
  analyticsSegmentGroupReducer,
} from 'components/eventselect/reducer/analyticsSegmentGroupReducer';
import { parametersConvertToUserCategoryItemType } from 'pages/analytics/analytics-utils';
import {
  ReactElement,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_SEGMENT_GROUP_DATA, enumToSelectOptions } from 'ts/const';
import { defaultStr, getEventParameters } from 'ts/utils';
import { useUserEventParameter } from './AnalyticsEventsContext';

interface SegmentContextType {
  segmentDataState: IEventSegmentationObj;
  segmentDataDispatch: React.Dispatch<AnalyticsSegmentAction>;
}
const SegmentContext = createContext<SegmentContextType>(
  {} as SegmentContextType
);

export const SegmentProvider: React.FC<{ children: ReactElement }> = ({
  children,
}) => {
  const { data, loading } = useUserEventParameter();
  const { t } = useTranslation();
  const [segmentDataState, segmentDataDispatch] = useReducer(
    analyticsSegmentGroupReducer,
    {
      ...DEFAULT_SEGMENT_GROUP_DATA,
      eventOperationOptions: enumToSelectOptions(
        ConditionNumericOperator,
        'calculateOperator'
      ).map((item) => {
        return { label: defaultStr(t(item.label ?? '')), value: item.value };
      }),
      eventSessionOptions: [
        { label: t('analytics:segment.options.withInSession'), value: 'true' },
        {
          label: t('analytics:segment.options.withOutSession'),
          value: 'false',
        },
      ],
      eventFlowOptions: [
        { label: t('analytics:segment.options.directlyFollow'), value: 'true' },
        {
          label: t('analytics:segment.options.indirectlyFollow'),
          value: 'false',
        },
      ],
    }
  );

  const contextValue = useMemo(
    () => ({ segmentDataState, segmentDataDispatch }),
    [segmentDataState, segmentDataDispatch]
  );

  useEffect(() => {
    if (data.categoryEvents) {
      segmentDataDispatch({
        type: AnalyticsSegmentActionType.SetEventOption,
        eventOption: data.categoryEvents,
        userIsAttributeOptions: parametersConvertToUserCategoryItemType(
          data.metaDataUserAttributes,
          getEventParameters(
            data.metaDataEventParameters,
            data.metaDataEvents,
            data.builtInMetaData
          )
        ),
        segmentGroupList: data.segmentGroupList ?? [],
      });
    }
  }, [data]);

  if (loading) {
    return (
      <Container>
        <Spinner />
      </Container>
    );
  }

  return (
    <SegmentContext.Provider value={contextValue}>
      {children}
    </SegmentContext.Provider>
  );
};

export const useSegmentContext = (): SegmentContextType => {
  const context = useContext(SegmentContext);
  if (context === undefined) {
    throw new Error('useSegmentContext must be used within a SegmentProvider');
  }
  return context;
};
