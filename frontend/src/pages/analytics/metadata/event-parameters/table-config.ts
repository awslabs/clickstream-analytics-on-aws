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


export const SEARCHABLE_COLUMNS = ['id', 'name', 'displayName', 'description'];

export const CONTENT_DISPLAY_OPTIONS = [
  { id: 'id', label: 'ID', alwaysVisible: true },
  { id: 'name', label: 'Name1' },
  { id: 'displayName', label: 'DisplayName' },
  { id: 'description', label: 'Description' },
  { id: 'type', label: 'Type' },
];

export const DEFAULT_PREFERENCES = {
  pageSize: 10,
  contentDisplay: [
    { id: 'id', visible: true },
    { id: 'name', visible: true },
    { id: 'displayName', visible: true },
    { id: 'description', visible: true },
    { id: 'type', visible: true },
  ],
  wrapLines: false,
  stripedRows: false,
  contentDensity: 'comfortable',
  stickyColumns: { first: 0, last: 1 },
};

export const PAGE_SIZE_OPTIONS = [
  { value: 10, label: '10 Items' },
  { value: 30, label: '30 Items' },
  { value: 50, label: '50 Items' },
];
