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

import { ConditionCategory, MetadataParameterType, MetadataPlatform, MetadataSource, MetadataValueType } from '../common/explore-types';

export interface IMetadataRawValue {
  readonly value: string;
  readonly count: number;
}

export interface IMetadataRaw {
  readonly id: string;
  readonly month: string;
  readonly prefix: string;

  readonly projectId: string;
  readonly appId: string;

  readonly name: string;
  readonly eventName?: string;
  readonly category?: ConditionCategory;
  readonly valueType?: MetadataValueType;

  readonly summary: {
    readonly platform?: MetadataPlatform[];
    readonly valueEnum?: IMetadataRawValue[];
    readonly hasData?: boolean;
  };
}

export interface IMetadataEvent {
  readonly id: string;
  readonly month: string;
  readonly prefix: string;

  readonly projectId: string;
  readonly appId: string;
  readonly name: string;

  readonly dataVolumeLastDay: number;
  readonly hasData: boolean;
  readonly platform: MetadataPlatform[];

  displayName?: string;
  description?: IMetadataDescription;
  metadataSource?: MetadataSource;

  associatedParameters? : IMetadataEventParameter[];
}

export interface IMetadataAttributeValue {
  readonly value: string;
  displayValue: string;
}

export interface IMetadataEventParameter {
  readonly id: string;
  readonly month: string;
  readonly prefix: string;

  readonly projectId: string;
  readonly appId: string;
  readonly name: string;
  readonly eventName: string;

  readonly valueType: MetadataValueType;
  readonly category: ConditionCategory;
  readonly hasData: boolean;
  readonly platform: MetadataPlatform[];

  displayName?: string;
  description?: IMetadataDescription;
  metadataSource?: MetadataSource;
  parameterType?: MetadataParameterType;
  valueEnum?: IMetadataRawValue[];
  values?: IMetadataAttributeValue[];

  associatedEvents? : IMetadataEvent[];
}

export interface IMetadataUserAttribute {
  readonly id: string;
  readonly month: string;
  readonly prefix: string;

  readonly projectId: string;
  readonly appId: string;
  readonly name: string;

  readonly valueType: MetadataValueType;
  readonly category: ConditionCategory;
  readonly hasData: boolean;

  displayName?: string;
  description?: IMetadataDescription;
  metadataSource?: MetadataSource;
  valueEnum?: IMetadataRawValue[];
  values?: IMetadataAttributeValue[];
}

export interface IMetadataDisplay {
  readonly id: string;
  readonly projectId: string;
  readonly appId: string;

  readonly displayName: string;
  readonly description: IMetadataDescription;
  readonly updateAt: number;
}

export interface IMetadataBuiltInList {
  readonly PresetEvents: Array<{
    name: string;
    description: IMetadataDescription;
  }>;
  readonly PresetEventParameters: Array<{
    name: string;
    eventName?: string;
    category: ConditionCategory;
    dataType: MetadataValueType;
    description: IMetadataDescription;
  }>;
  readonly PublicEventParameters: Array<{
    name: string;
    dataType: MetadataValueType;
    category: ConditionCategory;
    description: IMetadataDescription;
  }>;
  readonly PresetUserAttributes: Array<{
    name: string;
    dataType: MetadataValueType;
    category: ConditionCategory;
    description: IMetadataDescription;
  }>;
}

export interface IMetadataDescription {
  'zh-CN': string;
  'en-US': string;
}
