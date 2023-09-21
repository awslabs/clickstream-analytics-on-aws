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

import { MetadataParameterType, MetadataPlatform, MetadataSource, MetadataValueType } from '../common/explore-types';

export interface IMetadataEvent {
  readonly id: string;
  readonly type: string;
  readonly prefix: string;

  readonly projectId: string;
  readonly appId: string;

  readonly name: string;
  displayName: string;
  description: string;
  readonly metadataSource: MetadataSource;
  readonly dataVolumeLastDay: number;
  hasData: boolean;
  platform: MetadataPlatform[];
  associatedParameters? : IMetadataEventParameter[];

  readonly createAt: number;
  readonly updateAt: number;
  readonly operator: string;
  readonly deleted: boolean;
}

export interface IMetadataAttributeValue {
  readonly value: string;
  displayValue: string;
}

export interface IMetadataEventParameter {
  readonly id: string;
  readonly type: string;
  readonly prefix: string;

  readonly projectId: string;
  readonly appId: string;

  readonly eventName: string;

  readonly parameterId: string;
  readonly name: string;
  displayName: string;
  description: string;
  readonly metadataSource: MetadataSource;
  hasData: boolean;
  platform: MetadataPlatform[];
  readonly parameterType: MetadataParameterType;
  readonly valueType: MetadataValueType;
  valueEnum: string[];
  values: IMetadataAttributeValue[];
  associatedEvents? : IMetadataEvent[];
  readonly category: string;

  readonly createAt: number;
  readonly updateAt: number;
  readonly operator: string;
  readonly deleted: boolean;
}

export interface IMetadataUserAttribute {
  readonly id: string;
  readonly type: string;
  readonly prefix: string;

  readonly projectId: string;
  readonly appId: string;

  readonly eventName: string;

  readonly attributeId: string;
  readonly name: string;
  displayName: string;
  description: string;
  readonly metadataSource: MetadataSource;
  hasData: boolean;
  readonly valueType: MetadataValueType;
  valueEnum: string[];
  values: IMetadataAttributeValue[];
  readonly category: string;

  readonly createAt: number;
  readonly updateAt: number;
  readonly operator: string;
  readonly deleted: boolean;
}

export interface IMetadataDisplay {
  readonly id: string;
  readonly projectId: string;
  readonly appId: string;

  readonly displayName: string;
  readonly description: string;
  readonly updateAt: number;
}
