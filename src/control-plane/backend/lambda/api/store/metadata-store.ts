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

import { ConditionCategory, MetadataValueType } from '@aws/clickstream-base-lib';
import { MetadataVersionType } from '../common/model-ln';
import { IMetadataDisplay, IMetadataDisplayNameAndDescription, IMetadataEvent, IMetadataEventParameter, IMetadataUserAttribute } from '../model/metadata';

export interface MetadataStore {
  getEvent: (projectId: string, appId: string, eventName: string) => Promise<IMetadataEvent | undefined>;
  getEventV2: (projectId: string, appId: string, eventName: string, version: MetadataVersionType) => Promise<IMetadataEvent | undefined>;
  listEvents: (projectId: string, appId: string) => Promise<IMetadataEvent[]>;
  listEventsV2: (projectId: string, appId: string, version: MetadataVersionType) => Promise<IMetadataEvent[]>;

  getEventParameter: (projectId: string, appId: string, parameterName: string, category: ConditionCategory, valueType: MetadataValueType) =>
  Promise<IMetadataEventParameter | undefined>;
  getEventParameterV2: (projectId: string, appId: string, parameterName: string, category: ConditionCategory,
    valueType: MetadataValueType, version: MetadataVersionType) =>
  Promise<IMetadataEventParameter | undefined>;
  listEventParameters: (projectId: string, appId: string) => Promise<IMetadataEventParameter[]>;
  listEventParametersV2: (projectId: string, appId: string, version: MetadataVersionType) => Promise<IMetadataEventParameter[]>;

  listUserAttributes: (projectId: string, appId: string) => Promise<IMetadataUserAttribute[]>;
  listUserAttributesV2: (projectId: string, appId: string, version: MetadataVersionType) => Promise<IMetadataUserAttribute[]>;

  getDisplay: (projectId: string, appId: string) => Promise<IMetadataDisplay[]>;
  updateDisplay: (id: string, projectId: string, appId: string,
    description: IMetadataDisplayNameAndDescription, displayName: IMetadataDisplayNameAndDescription) => Promise<void>;
}
