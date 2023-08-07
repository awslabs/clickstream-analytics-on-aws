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

export {};
declare global {
  interface IAnalyticsDashboard {
    id: string;
    name: string;
    description: string;
    createAt: number;
  }

  interface IMetadataEvent {
    id: string;
    type: string;
    prefix: string;

    projectId: string;
    appId: string;

    name: string;
    displayName: string;
    description: string;
    metadataSource: MetadataSource;
    hasData: boolean;
    platform: MetadataPlatform;
    dataVolumeLastDay: number;
    associatedParameters?: IMetadataRelation[];
  }

  interface IMetadataEventParameter {
    id: string;
    type: string;
    prefix: string;

    projectId: string;
    appId: string;

    parameterId: string;
    name: string;
    displayName: string;
    description: string;
    metadataSource: MetadataSource;
    hasData: boolean;
    platform: MetadataPlatform;
    parameterType: MetadataParameterType;
    valueType: MetadataValueType;
    valueEnum: IMetadataAttributeValue[];
    associatedEvents?: IMetadataRelation[];
  }

  interface IMetadataUserAttribute {
    id: string;
    type: string;
    prefix: string;

    projectId: string;
    appId: string;

    attributeId: string;
    name: string;
    displayName: string;
    description: string;
    metadataSource: MetadataSource;
    hasData: boolean;
    valueType: MetadataValueType;
    valueEnum: IMetadataAttributeValue[];
  }

  interface IMetadataAttributeValue {
    value: string;
    displayValue: string;
  }

  interface IMetadataRelation {
    id: string;
    type: string;
    prefix: string;

    projectId: string;
    appId: string;

    eventName: string;
    eventDisplayName: string;
    eventDescription: string;

    parameterId: string;
    parameterName: string;
    parameterDisplayName: string;
    parameterDescription: string;
    parameterValueType: MetadataValueType;
    parameterMetadataSource: MetadataSource;

    createAt: number;
    updateAt: number;
    operator: string;
    deleted: boolean;
  }
}
