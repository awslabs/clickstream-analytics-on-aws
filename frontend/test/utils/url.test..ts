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

import { getSolutionVersion } from '../../src/ts/url';

describe('getSolutionVersion', () => {
  let originalGetItem: typeof localStorage.getItem;
  let mockGetItem: jest.Mock;

  beforeAll(() => {
    originalGetItem = localStorage.getItem;
    mockGetItem = jest.fn();
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: mockGetItem,
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
        length: 0,
        key: jest.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    mockGetItem.mockReset();
  });

  afterAll(() => {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: originalGetItem,
        setItem: localStorage.setItem,
        removeItem: localStorage.removeItem,
        clear: localStorage.clear,
        length: localStorage.length,
        key: localStorage.key,
      },
      writable: true,
    });
  });

  test('returns "latest" if PROJECT_CONFIG_JSON is not in localStorage', () => {
    mockGetItem.mockReturnValue(null);
    expect(getSolutionVersion()).toBe('latest');
  });

  test('returns correct major version when solution_version is standard', () => {
    mockGetItem.mockReturnValue(
      JSON.stringify({ solution_version: 'v1.10.0' })
    );
    expect(getSolutionVersion()).toBe('1.10.x');
  });

  test('extracts numeric part correctly when solution_version has non-numeric characters', () => {
    mockGetItem.mockReturnValue(
      JSON.stringify({ solution_version: 'version2.5.0' })
    );
    expect(getSolutionVersion()).toBe('2.5.x');
  });

  test('returns "latest" when solution_version has only one numeric and one character part', () => {
    mockGetItem.mockReturnValue(JSON.stringify({ solution_version: 'v3' }));
    expect(getSolutionVersion()).toBe('latest');
  });

  test('returns "latest" when solution_version has only one numeric part', () => {
    mockGetItem.mockReturnValue(JSON.stringify({ solution_version: '3' }));
    expect(getSolutionVersion()).toBe('latest');
  });
});
