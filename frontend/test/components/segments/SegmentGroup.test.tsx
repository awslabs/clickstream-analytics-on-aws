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

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  getBuiltInMetadata,
  getMetadataEventsList,
  getMetadataParametersList,
  getMetadataUserAttributesList,
} from 'apis/analytics';
import { getSegmentsList } from 'apis/segments';
import { EventsParameterProvider } from 'context/AnalyticsEventsContext';
import { SegmentProvider } from 'context/SegmentContext';
import SegmentEditor from 'pages/analytics/segments/components/SegmentEditor';
import { ReactElement } from 'react';
import { act } from 'react-dom/test-utils';
import { useParams } from 'react-router-dom';
import { INIT_SEGMENT_OBJ } from 'ts/const';
import {
  mockAttributeListData,
  mockBuiltInData,
  mockEventListData,
  mockSegmentsList,
  mockUserAttributeListData,
} from './data/mock_data';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useParams: jest.fn(),
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

jest.mock('apis/segments', () => ({
  getSegmentsList: jest.fn(),
}));
jest.mock('apis/analytics', () => ({
  getBuiltInMetadata: jest.fn(),
  getMetadataEventsList: jest.fn(),
  getMetadataParametersList: jest.fn(),
  getMetadataUserAttributesList: jest.fn(),
}));

beforeEach(() => {
  (getSegmentsList as any).mockResolvedValue(mockSegmentsList);
  (getBuiltInMetadata as any).mockResolvedValue(mockBuiltInData);
  (getMetadataEventsList as any).mockResolvedValue(mockEventListData);
  (getMetadataParametersList as any).mockResolvedValue(mockAttributeListData);
  (getMetadataUserAttributesList as any).mockResolvedValue(
    mockUserAttributeListData
  );
  const mockParams = {
    appId: 'shopping',
    projectId: 'test_magic_project_gpvz',
  };
  // Make useParams return the mock parameters
  (useParams as any).mockReturnValue(mockParams);
  jest.spyOn(console, 'error').mockImplementation(jest.fn());
});

afterEach(() => {
  jest.clearAllMocks();
});

const renderWithProvider = (component: ReactElement) => {
  return render(
    <EventsParameterProvider>
      <SegmentProvider>{component}</SegmentProvider>
    </EventsParameterProvider>
  );
};

const updateSegmentObjFn = jest.fn();

describe('SegmentEditor', () => {
  it('should render without errors', async () => {
    let queryAllByTestId;
    await act(async () => {
      const result = renderWithProvider(
        <SegmentEditor
          segmentObject={{ ...INIT_SEGMENT_OBJ }}
          updateSegmentObject={updateSegmentObjFn}
        />
      );
      queryAllByTestId = result.queryAllByTestId;
    });
    await waitFor(() => {
      expect(screen.queryByText('loading')).not.toBeInTheDocument();
    });
    const listItems = queryAllByTestId('test-segment-item');
    expect(listItems).toHaveLength(1);
  });

  it('should call add filter group after click add filter group button', async () => {
    let getByTestId, queryAllByTestId;
    await act(async () => {
      const result = renderWithProvider(
        <SegmentEditor
          segmentObject={{ ...INIT_SEGMENT_OBJ }}
          updateSegmentObject={updateSegmentObjFn}
        />
      );
      queryAllByTestId = result.queryAllByTestId;
      getByTestId = result.getByTestId;
    });
    await waitFor(() => {
      expect(screen.queryByText('loading')).not.toBeInTheDocument();
    });
    let listItems = queryAllByTestId('test-segment-item');
    expect(listItems).toHaveLength(1);
    await act(async () => {
      fireEvent.click(getByTestId('test-add-filter-group'));
    });
    listItems = queryAllByTestId('test-segment-item');
    expect(listItems).toHaveLength(2);
  });
});
