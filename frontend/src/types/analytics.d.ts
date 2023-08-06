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
    name: string;
    displayName: string;
    description: string;
    type: MetadataEventType;
    hasData: boolean;
    platform: string;
    dataVolumeLastDay: number;
    parameters?: IMetadataEventParameter[];
  }

  interface IMetadataEventParameter {
    id: string;
    name: string;
    displayName: string;
    description: string;
    type: MetadataEventType;
    hasData: boolean;
    platform: string;
    dataType: MetadataDataType;
    source: string;
    events?: IMetadataEvent[];
  }

  interface IMetadataUserAttribute {
    id: string;
    name: string;
    displayName: string;
    description: string;
    type: string;
  }
}
