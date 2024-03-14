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

import { render, fireEvent } from '@testing-library/react';
import { ERelationShip } from 'components/eventselect/AnalyticsType';
import { AnalyticsSegmentActionType } from 'components/eventselect/reducer/analyticsSegmentGroupReducer';
import SegmentEditor from 'pages/analytics/segments/components/SegmentEditor';
import { DEFAULT_FILTER_GROUP_ITEM } from 'ts/const';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: any) => key,
    i18n: {
      language: 'en',
    },
  }),
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
  initReactI18next: {
    type: '3rdParty',
    init: (i18next) => i18next,
  },
}));

const mockDispatch = jest.fn();

const initSegmentState = {
  filterGroupRelationShip: ERelationShip.AND,
  subItemList: [{ ...DEFAULT_FILTER_GROUP_ITEM }],
};

describe('SegmentEditor', () => {
  it('should render without errors', () => {
    render(
      <SegmentEditor
        segmentDataState={initSegmentState}
        segmentDataDispatch={jest.fn()}
      />
    );
  });

  it('should call add filter group after click add filter group button', () => {
    const { getByTestId, queryAllByTestId } = render(
      <SegmentEditor
        segmentDataState={initSegmentState}
        segmentDataDispatch={mockDispatch}
      />
    );
    const listItems = queryAllByTestId('test-segment-item');
    expect(listItems).toHaveLength(1);
    fireEvent.click(getByTestId('test-add-filter-group'));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: AnalyticsSegmentActionType.AddFilterGroup,
    });
  });
});
