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

import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from './powertools';

export interface VisualPorps {
  readonly name: string;
  readonly sheetId: string;
  readonly visualContent: any;
  readonly dataSetConfiguration: any;
  readonly filterControl: any;
  readonly parameterDeclarations: any[];
  readonly filterGroup: any;
  readonly enventCount: number;
}

export interface DashboardAction {
  readonly action: 'ADD' | 'UPDATE' | 'DELETE';
  readonly visuals: VisualPorps[];
  readonly dashboardDef: string;
}

export function applyChangeToDashboard(dashboardAction: DashboardAction) : string {
  try {
    if (dashboardAction.action === 'ADD') {
      return addVisuals(dashboardAction.visuals, dashboardAction.dashboardDef);
    }
    return dashboardAction.dashboardDef;
  } catch (err) {
    logger.error(`The dashboard was not changed due to ${(err as Error).message}`);
    return dashboardAction.dashboardDef;
  }
};

function addVisuals(visuals: VisualPorps[], dashboardDef: string) : string {
  const dashboard = JSON.parse(dashboardDef);

  // add visuals to sheet
  for (const visual of visuals) {
    logger.info('start to add visual');
    const sheet = findElementWithProperyValue(dashboard, 'Sheets', 'SheetId', visual.sheetId);

    logger.info(`sheet: ${JSON.stringify(sheet)}`);

    if ( sheet !== undefined) {
      //add visual to sheet
      const charts = findElementByPath(sheet, 'Visuals') as Array<any>;
      logger.info(`charts: ${JSON.stringify(charts)}`);
      charts.push(visual.visualContent);

      //add dataset configuration
      const configs = findElementByPath(dashboard, 'DataSetConfigurations') as Array<any>;
      configs.push(visual.dataSetConfiguration);

      //add filter
      const controls = findElementByPath(sheet, 'FilterControls') as Array<any>;
      logger.info(`controls: ${JSON.stringify(controls)}`);
      controls.push(visual.filterControl);

      //add parameters
      const parameters = findElementByPath(dashboard, 'ParameterDeclarations') as Array<any>;
      logger.info(`parameters: ${JSON.stringify(parameters)}`);
      parameters.push(visual.parameterDeclarations);

      //add dataset configuration
      const fiterGroups = findElementByPath(dashboard, 'FilterGroups') as Array<any>;
      logger.info(`fiterGroups: ${JSON.stringify(fiterGroups)}`);
      fiterGroups.push(visual.filterGroup);

      // visual layout
      const layout = findKthElement(sheet, 'Layouts', 1) as Array<any>;
      logger.info(`layout: ${JSON.stringify(layout)}`);

      const elements = findElementByPath(layout, 'Configuration.GridLayout.Elements') as Array<any>;

      logger.info(`elements: ${JSON.stringify(elements)}`);

      const layoutControl = JSON.parse(readFileSync(join(__dirname, './quicksight-template/layout-control.json')).toString());
      const visualControl = JSON.parse(readFileSync(join(__dirname, './quicksight-template/layout-visual.json')).toString());

      if (elements.length > 0) {

        const lastElement = elements.at(elements.length - 1);
        logger.info(`lastElement: ${JSON.stringify(lastElement)}`);
        layoutControl.RowIndex = lastElement.RowIndex + lastElement.RowSpan;
        visualControl.RowIndex = lastElement.RowIndex + lastElement.RowSpan + layoutControl.RowSpan;
      }

      logger.info('start to find first child');

      const firstObj = findFirstChild(visual.filterControl);
      logger.info(`firstObj: ${JSON.stringify(firstObj)}`);

      layoutControl.ElementId = firstObj.FilterControlId;
      visualControl.RowSpan = (visual.enventCount as number) * 2;

      logger.info(`visual.visualContent: ${visual.visualContent}`);
      logger.info(`visualContent first child: ${findFirstChild(visual.visualContent)}`);
      visualControl.ElementId = findFirstChild(visual.visualContent).VisualId;
      elements.push(layoutControl);
      elements.push(visualControl);

    }
  }

  return dashboard;
};

function findElementByPath(jsonData: any, path: string): any {
  const pathKeys = path.split('.');

  for (const key of pathKeys) {
    if (jsonData && typeof jsonData === 'object' && key in jsonData) {
      jsonData = jsonData[key];
    } else {
      // If the key doesn't exist in the JSON object, return undefined
      return undefined;
    }
  }

  return jsonData;
}

function findKthElement(jsonData: any, path: string, index: number): any {
  const pathKeys = path.split('.');

  for (const key of pathKeys) {
    if (jsonData && typeof jsonData === 'object' && key in jsonData) {
      jsonData = jsonData[key];
    } else {
      // If the key doesn't exist in the JSON object, return undefined
      return undefined;
    }
  }

  if (Array.isArray(jsonData) && jsonData.length >= index) {
    return jsonData[index-1]; // Return the kth element of the array
  } else {
    return undefined; // If the path doesn't lead to an array or the array is too short, return undefined
  }
}

function findFirstChild(jsonData: any): any {
  if (Array.isArray(jsonData)) {
    logger.info('array');
    return undefined; // Return the kth element of the array
  } else if (jsonData && typeof jsonData === 'object') {
    logger.info('object');
    for (const key in jsonData) {
      logger.info(`key: ${key}`);
      if (jsonData.hasOwnProperty(key)) {
        return jsonData[key];
      }
    }
  }
  logger.info('other');
  return undefined;
}

function findElementWithProperyValue(root: any, path: string, property: string, value: string): any {
  const jsonData = findElementByPath(root, path);
  logger.info(`jsonData: ${JSON.stringify(jsonData)}`);
  logger.info(`sheetID: ${value}`);
  if (Array.isArray(jsonData)) {
    for ( const e of jsonData as Array<any>) {
      logger.info(`e: ${JSON.stringify(e)}`);
      if (e && typeof e === 'object' && property in e) {
        const v = e[property];
        logger.info(`v: ${JSON.stringify(v)}`);
        if ((v as string) === value ) {
          return e;
        }
      }
    }
    return undefined;
  } else {
    return undefined;
  }
}