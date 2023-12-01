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

import { ConditionCategory, MetadataValueType } from '../common/explore-types';
import { IMetadataDisplay, IMetadataDisplayNameAndDescription, IMetadataEvent, IMetadataEventParameter, IMetadataUserAttribute } from '../model/metadata';

export interface MetadataStore {
  getEvent: (projectId: string, appId: string, eventName: string) => Promise<IMetadataEvent | undefined>;
  listEvents: (projectId: string, appId: string) => Promise<IMetadataEvent[]>;

  getEventParameter: (projectId: string, appId: string, parameterName: string, category: ConditionCategory, valueType: MetadataValueType) =>
  Promise<IMetadataEventParameter | undefined>;
  listEventParameters: (projectId: string, appId: string) => Promise<IMetadataEventParameter[]>;

  getUserAttribute: (projectId: string, appId: string, userAttributeName: string, valueType: MetadataValueType) =>
  Promise<IMetadataUserAttribute | undefined>;
  listUserAttributes: (projectId: string, appId: string) => Promise<IMetadataUserAttribute[]>;

  getDisplay: (projectId: string, appId: string) => Promise<IMetadataDisplay[]>;
  updateDisplay: (id: string, projectId: string, appId: string,
    description: IMetadataDisplayNameAndDescription, displayName: IMetadataDisplayNameAndDescription) => Promise<void>;
}
