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

import { useMemo } from 'react';
import { useLocalStorage } from './use-local-storage';

export const addToColumnDefinitions = (
  columnDefinitions: any,
  propertyName: string,
  columns: any
) =>
  columnDefinitions.map((colDef: { [x: string]: any; id: any }) => {
    const column = (columns || []).find(
      (col: { id: any }) => col.id === colDef.id
    );
    return {
      ...colDef,
      [propertyName]: (column && column[propertyName]) || colDef[propertyName],
    };
  });

export const mapWithColumnDefinitionIds = (
  columnDefinitions: any,
  propertyName: string,
  items: any
) =>
  columnDefinitions.map((colDef: { [x: string]: any; id: any }, i: number) => ({
    id: colDef.id,
    [propertyName]: items[i],
  }));

export function useColumnWidths(storageKey: string, columnDefinitions: any) {
  const [widths, saveWidths] = useLocalStorage(storageKey);

  function handleWidthChange(event: any) {
    saveWidths(
      mapWithColumnDefinitionIds(
        columnDefinitions,
        'width',
        event.detail.widths
      )
    );
  }
  const memoDefinitions = useMemo(() => {
    return addToColumnDefinitions(columnDefinitions, 'width', widths);
  }, [widths, columnDefinitions]);

  return [memoDefinitions, handleWidthChange];
}
