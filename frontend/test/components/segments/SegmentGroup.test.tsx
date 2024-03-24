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
import { EventsParameterProvider } from 'context/AnalyticsEventsContext';
import { SegmentProvider } from 'context/SegmentContext';
import SegmentEditor from 'pages/analytics/segments/components/SegmentEditor';
import { ReactElement } from 'react';

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

const renderWithProvider = (component: ReactElement) => {
  return render(
    <EventsParameterProvider>
      <SegmentProvider>{component}</SegmentProvider>
    </EventsParameterProvider>
  );
};

describe('SegmentEditor', () => {
  it('should render without errors', () => {
    renderWithProvider(<SegmentEditor />);
  });

  it('should call add filter group after click add filter group button', () => {
    const { getByTestId, queryAllByTestId } = renderWithProvider(
      <SegmentEditor />
    );
    let listItems = queryAllByTestId('test-segment-item');
    expect(listItems).toHaveLength(1);
    fireEvent.click(getByTestId('test-add-filter-group'));
    listItems = queryAllByTestId('test-segment-item');
    expect(listItems).toHaveLength(2);
  });
});
