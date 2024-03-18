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

import { IEventSegmentationObj } from 'components/eventselect/AnalyticsType';
import {
  AnalyticsSegmentAction,
  analyticsSegmentGroupReducer,
} from 'components/eventselect/reducer/analyticsSegmentGroupReducer';
import {
  ReactElement,
  createContext,
  useContext,
  useMemo,
  useReducer,
} from 'react';
import { DEFAULT_SEGMENT_GROUP_DATA } from 'ts/const';

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
  const [segmentDataState, segmentDataDispatch] = useReducer(
    analyticsSegmentGroupReducer,
    { ...DEFAULT_SEGMENT_GROUP_DATA }
  );

  const contextValue = useMemo(
    () => ({ segmentDataState, segmentDataDispatch }),
    [segmentDataState, segmentDataDispatch]
  );

  return (
    <SegmentContext.Provider value={contextValue}>
      {children}
    </SegmentContext.Provider>
  );
};

export const useSegmentContext = (): SegmentContextType => {
  const context = useContext(SegmentContext);
  if (context === undefined) {
    throw new Error('useMainContext must be used within a MainProvider');
  }
  return context;
};
