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

export enum HelpPanelType {
  NONE = 'NONE',
  ANALYTICS_DASHBOARD = 'ANALYTICS_DASHBOARD',
}

export interface IState {
  showHelpPanel: boolean;
  helpPanelType: HelpPanelType;
}

export enum HelpInfoActionType {
  SHOW_HELP_PANEL = 'SHOW_HELP_PANEL',
  HIDE_HELP_PANEL = 'HIDE_HELP_PANEL',
}

export type Action = { type: HelpInfoActionType; payload: any };

export const initialState: IState = {
  showHelpPanel: false,
  helpPanelType: HelpPanelType.NONE,
};

export const reducer = (state: IState, action: Action): IState => {
  switch (action.type) {
    case HelpInfoActionType.SHOW_HELP_PANEL:
      return { ...state, showHelpPanel: true, helpPanelType: action.payload };
    case HelpInfoActionType.HIDE_HELP_PANEL:
      return {
        ...state,
        showHelpPanel: false,
      };

    default:
      return state;
  }
};
