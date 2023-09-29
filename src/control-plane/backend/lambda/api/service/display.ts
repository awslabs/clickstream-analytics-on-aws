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

import { MetadataValueType } from '../common/explore-types';
import { logger } from '../common/powertools';
import { IMetadataAttributeValue, IMetadataDisplay, IMetadataEvent, IMetadataEventParameter, IMetadataUserAttribute } from '../model/metadata';
import { DynamoDbMetadataStore } from '../store/dynamodb/dynamodb-metadata-store';
import { MetadataStore } from '../store/metadata-store';

const metadataStore: MetadataStore = new DynamoDbMetadataStore();

export class CMetadataDisplay {

  private displays: IMetadataDisplay[] = [];

  constructor() {
    this.displays = [];
  }

  public async getDisplay(projectId: string, appId: string) {
    if (this.displays.length === 0) {
      this.displays = await metadataStore.getDisplay(projectId, appId);
    }
    return this.displays;
  }

  public async update(display: IMetadataDisplay) {
    try {
      await metadataStore.updateDisplay(display.id, display.projectId, display.appId, display.description, display.displayName);
      this.displays = await metadataStore.getDisplay(display.projectId, display.appId);
      return true;
    } catch (error) {
      logger.error('Update display error', { error });
      return false;
    }
  }

  private _getOriginalName(name: string, valueType: MetadataValueType) {
    const typeSuffix = `_${valueType}`;
    if (name.endsWith(typeSuffix)) {
      return name.substring(0, name.length - typeSuffix.length);
    }
    return name;
  }

  public async patch(projectId: string, appId: string,
    metadataArray: IMetadataEvent[] | IMetadataEventParameter[] | IMetadataUserAttribute[]) {
    try {
      const displays = await this.getDisplay(projectId, appId);
      for (let metadata of metadataArray) {
        const prefix = metadata.prefix.split('#')[0];
        if (metadata.prefix.startsWith('EVENT#')) {
          const event = metadata as IMetadataEvent;
          const key = `${prefix}#${metadata.projectId}#${metadata.appId}#${event.name}`;
          const metadataDisplay = displays.find((d: IMetadataDisplay) => d.id === key);
          event.displayName = metadataDisplay?.displayName ?? event.name;
          event.description = metadataDisplay?.description ?? '';
          event.associatedParameters = this.patchAssociatedWithData(event.associatedParameters) as IMetadataEventParameter[];
          event.associatedParameters = this.patchValueEnumWithData(event.associatedParameters) as IMetadataEventParameter[];
        }
        if (metadata.prefix.startsWith('EVENT_PARAMETER#')) {
          let parameter = metadata as IMetadataEventParameter;
          const originalName = this._getOriginalName(parameter.name, parameter.valueType);
          const key = `${prefix}#${metadata.projectId}#${metadata.appId}#${originalName}`;
          const metadataDisplay = displays.find((d: IMetadataDisplay) => d.id === key);
          parameter.name = originalName;
          parameter.displayName = metadataDisplay?.displayName ?? originalName;
          parameter.description = metadataDisplay?.description ?? '';
          parameter.associatedEvents = this.patchAssociatedWithData(parameter.associatedEvents) as IMetadataEvent[];
          parameter = (this.patchValueEnumWithData([parameter]) as IMetadataEventParameter[])[0];
        }
        if (metadata.prefix.startsWith('USER_ATTRIBUTE#')) {
          let userAttribute = metadata as IMetadataUserAttribute;
          const originalName = this._getOriginalName(userAttribute.name, userAttribute.valueType);
          const key = `${prefix}#${metadata.projectId}#${metadata.appId}#${originalName}`;
          const metadataDisplay = displays.find((d: IMetadataDisplay) => d.id === key);
          userAttribute.name = originalName;
          userAttribute.displayName = metadataDisplay?.displayName ?? originalName;
          userAttribute.description = metadataDisplay?.description ?? '';
          userAttribute = (this.patchValueEnumWithData([userAttribute]) as IMetadataUserAttribute[])[0];
        }
      }
    } catch (error) {
      logger.error('Patch display error', { error });
    }
    return metadataArray;
  }

  private patchAssociatedWithData(associated: IMetadataEvent[] | IMetadataEventParameter[] | undefined) {
    const displays = this.displays;
    if (!associated || associated.length === 0) {
      return [];
    }
    for (let metadata of associated) {
      const prefix = metadata.prefix.split('#')[0];
      const key = `${prefix}#${metadata.projectId}#${metadata.appId}#${metadata.name}`;
      const metadataDisplay = displays.find((d: IMetadataDisplay) => d.id === key);
      if (metadata.prefix.startsWith('EVENT_PARAMETER#')) {
        let parameter = metadata as IMetadataEventParameter;
        parameter.name = this._getOriginalName(parameter.name, parameter.valueType);
        parameter.displayName = metadataDisplay?.displayName ?? this._getOriginalName(parameter.name, parameter.valueType);
        parameter.description = metadataDisplay?.description ?? '';
      } else if (metadata.prefix.startsWith('EVENT#')) {
        metadata.displayName = metadataDisplay?.displayName ?? metadata.name;
        metadata.description = metadataDisplay?.description ?? '';
      }
    }
    return associated;
  }

  private patchValueEnumWithData(parameters: IMetadataEventParameter[] | IMetadataUserAttribute[] | undefined) {
    const displays = this.displays;
    if (!parameters || parameters.length === 0) {
      return [];
    }
    for (let parameter of parameters) {
      const valueEnum = parameter.valueEnum;
      const values: IMetadataAttributeValue[] = [];
      for (let v of valueEnum!) {
        const key = `DICTIONARY#${parameter.projectId}#${parameter.appId}#${parameter.name}#${v}`;
        const display = displays.find((d: IMetadataDisplay) => d.id === key);
        const value: IMetadataAttributeValue = {
          value: v,
          displayValue: display?.displayName ?? v,
        };
        values.push(value);
      }
      parameter.values = values;
      parameter.valueEnum = undefined;
    }
    return parameters;
  }
}