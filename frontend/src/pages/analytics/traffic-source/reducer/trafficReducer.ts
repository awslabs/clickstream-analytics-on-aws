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

export type SetState = {
  type: 'SetState';
  data: ITrafficSource;
};

export type TrafficSourceAction = SetState;

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
  if (action.type === 'SetState') {
    return action.data;
  }
  return state;
};
