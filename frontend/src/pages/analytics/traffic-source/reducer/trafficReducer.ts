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

import { IState } from 'context/reducer';
import React from 'react';

export interface ITrafficSource {
  readonly projectId: string;
  readonly appId: string;

  readonly channelGroups: IChannelGroup[];
  readonly sourceCategories: ISourceCategory[];
}

export interface IChannelGroup {
  readonly id: string;
  readonly channel: string;
  readonly displayName: {
    [key: string]: string;
  };
  readonly description: {
    [key: string]: string;
  };
  readonly condition: any;
}

export interface ISourceCategory {
  readonly url: string;
  readonly source: string;
  readonly category: ESourceCategory;
  readonly params: string[];
}

export enum ESourceCategory {
  SEARCH = 'Search',
  SOCIAL = 'Social',
  SHOPPING = 'Shopping',
  VIDEO = 'Video',
  INTERNAL = 'Internal',
  OTHER = 'Other',
}

export enum ITrafficSourceAction {
  NEW = 'NEW',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  REORDER = 'REORDER',
}

export type SetState = {
  type: 'SetState';
  data: ITrafficSource;
};

export type NewItem = {
  type: 'NewItem';
  channel?: IChannelGroup;
  category?: ISourceCategory;
};

export type UpdateItem = {
  type: 'UpdateItem';
  channel?: IChannelGroup;
  category?: ISourceCategory;
};

export type DeleteItem = {
  type: 'DeleteItem';
  channel?: IChannelGroup;
  category?: ISourceCategory;
};
export type TrafficSourceAction = SetState | NewItem | UpdateItem | DeleteItem;

export type TrafficSourceDispatchFunction = (
  action: TrafficSourceAction
) => void;

export const TrafficSourceStateContext = React.createContext<
  IState | undefined
>(undefined);

export const trafficSourceReducer = (
  state: ITrafficSource,
  action: TrafficSourceAction
): ITrafficSource => {
  switch (action.type) {
    case 'SetState':
      return action.data;
    case 'NewItem':
      return _newItem(state, action);
    case 'UpdateItem':
      return _updateItem(state, action);
    case 'DeleteItem':
      return _deleteItem(state, action);
    default:
      return state;
  }
};

const _newItem = (state: ITrafficSource, action: NewItem) => {
  if (action.channel) {
    return {
      ...state,
      channelGroups: [action.channel, ...state.channelGroups],
    };
  }
  if (action.category) {
    return {
      ...state,
      sourceCategories: [action.category, ...state.sourceCategories],
    };
  }
  return state;
};

const _updateItem = (state: ITrafficSource, action: UpdateItem) => {
  if (action.channel) {
    return {
      ...state,
      channelGroups: state.channelGroups.map((item) =>
        item.id === action.channel?.id ? action.channel : item
      ),
    };
  }
  if (action.category) {
    return {
      ...state,
      sourceCategories: state.sourceCategories.map((item) =>
        item.url === action.category?.url ? action.category : item
      ),
    };
  }
  return state;
};

const _deleteItem = (state: ITrafficSource, action: DeleteItem) => {
  if (action.channel) {
    return {
      ...state,
      channelGroups: state.channelGroups.filter(
        (item) => item.id !== action.channel?.id
      ),
    };
  }
  if (action.category) {
    return {
      ...state,
      sourceCategories: state.sourceCategories.filter(
        (item) => item.url !== action.category?.url
      ),
    };
  }
  return state;
};
