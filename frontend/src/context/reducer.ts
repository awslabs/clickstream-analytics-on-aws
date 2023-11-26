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

import { IConditionItemType } from 'components/eventselect/AnalyticsType';
import { validateFilterConditions } from 'pages/analytics/analytics-utils';

export enum HelpPanelType {
  NONE = 'NONE',
  ANALYTICS_DASHBOARD = 'ANALYTICS_DASHBOARD',
  USER_LIFECYCLE_INFO = 'USER_LIFECYCLE_INFO',
  ANALYTICS_EXPLORE = 'ANALYTICS_EXPLORE',
  EXPLORE_EVENT_INFO = 'EXPLORE_EVENT_INFO',
  EXPLORE_FUNNEL_INFO = 'EXPLORE_FUNNEL_INFO',
  EXPLORE_PATH_INFO = 'EXPLORE_PATH_INFO',
  EXPLORE_RETENTION_INFO = 'EXPLORE_RETENTION_INFO',
  ANALYTICS_ANALYZES = 'ANALYTICS_ANALYZES_INFO',
  ANALYTICS_METADATA = 'ANALYTICS_METADATA',
  METADATA_EVENT_INFO = 'METADATA_EVENT_INFO',
  METADATA_EVENT_PARAM_INFO = 'METADATA_EVENT_PARAM_INFO',
  METADATA_USER_PARAM_INFO = 'METADATA_USER_PARAM_INFO',
}

export interface IState {
  showHelpPanel: boolean;
  helpPanelType: HelpPanelType;
  showEventError: boolean;
  showAttributeError: boolean;
  showAttributeOperatorError: boolean;
  showAttributeValueError: boolean;
}

export enum StateActionType {
  SHOW_HELP_PANEL = 'SHOW_HELP_PANEL',
  HIDE_HELP_PANEL = 'HIDE_HELP_PANEL',
  RESET_VALID_ERROR = 'RESET_VALID_ERROR',
  SHOW_EVENT_VALID_ERROR = 'SHOW_EVENT_VALID_ERROR',
  HIDE_EVENT_VALID_ERROR = 'HIDE_EVENT_VALID_ERROR',
  VALIDATE_FILTER_CONDITIONS = 'VALIDATE_FILTER_CONDITIONS',
}

export type Action = { type: StateActionType; payload: any };

export const initialState: IState = {
  showHelpPanel: false,
  helpPanelType: HelpPanelType.NONE,
  showEventError: false,
  showAttributeError: false,
  showAttributeOperatorError: false,
  showAttributeValueError: false,
};

export const reducer = (state: IState, action: Action): IState => {
  switch (action.type) {
    case StateActionType.SHOW_HELP_PANEL: {
      return { ...state, showHelpPanel: true, helpPanelType: action.payload };
    }
    case StateActionType.HIDE_HELP_PANEL: {
      return {
        ...state,
        showHelpPanel: false,
      };
    }
    case StateActionType.RESET_VALID_ERROR: {
      return {
        ...state,
        showEventError: false,
        showAttributeError: false,
        showAttributeOperatorError: false,
        showAttributeValueError: false,
      };
    }
    case StateActionType.SHOW_EVENT_VALID_ERROR: {
      return {
        ...state,
        showEventError: true,
      };
    }
    case StateActionType.HIDE_EVENT_VALID_ERROR: {
      return {
        ...state,
        showEventError: false,
      };
    }
    case StateActionType.VALIDATE_FILTER_CONDITIONS: {
      const data: IConditionItemType[] = action.payload;
      const {
        hasValidConditionOption,
        hasValidConditionOperator,
        hasValidConditionValue,
      } = validateFilterConditions(data);
      return {
        ...state,
        showAttributeError: !hasValidConditionOption,
        showAttributeOperatorError: !hasValidConditionOperator,
        showAttributeValueError: !hasValidConditionValue,
      };
    }
    default:
      return state;
  }
};
