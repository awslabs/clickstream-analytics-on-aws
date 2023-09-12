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

import { logger } from '../common/powertools';
import { IMetadataDisplay, IMetadataEvent, IMetadataEventParameter, IMetadataUserAttribute } from '../model/metadata';
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

  public async patch(projectId: string, appId: string,
    metadatas: IMetadataEvent[] | IMetadataEventParameter[] | IMetadataUserAttribute[]) {
    try {
      const displays = await this.getDisplay(projectId, appId);
      if (displays.length === 0 || metadatas.length === 0) {
        return metadatas;
      }
      for (let metadata of metadatas) {
        const metadataDisplay = displays.find((d: IMetadataDisplay) => d.id === `${metadata.prefix}#${metadata.name}`);
        if (metadataDisplay) {
          metadata.displayName = metadataDisplay.displayName;
          metadata.description = metadataDisplay.description;
        }
        if (metadata.prefix.startsWith('EVENT#')) {
          const event = metadata as IMetadataEvent;
          event.associatedParameters = this.patchAssociatedWithData(event.associatedParameters) as IMetadataEventParameter[];
          event.associatedParameters = this.patchValueEnumWithData(event.associatedParameters);
        }
        if (metadata.prefix.startsWith('EVENT_PARAMETER#')) {
          let parameter = metadata as IMetadataEventParameter;
          parameter.associatedEvents = this.patchAssociatedWithData(parameter.associatedEvents) as IMetadataEvent[];
          parameter = this.patchValueEnumWithData([parameter])[0];
        }
      }
      return metadatas;
    } catch (error) {
      logger.error('Patch display error', { error });
      return metadatas;
    }
  }

  private patchAssociatedWithData(associated: IMetadataEvent[] | IMetadataEventParameter[] | undefined) {
    const displays = this.displays;
    if (!associated || associated.length === 0) {
      return [];
    }
    if (displays.length === 0) {
      return associated;
    }
    for (let metadata of associated) {
      const metadataDisplay = displays.find((d: IMetadataDisplay) => d.id === `${metadata.prefix}#${metadata.name}`);
      if (metadataDisplay) {
        metadata.displayName = metadataDisplay.displayName;
        metadata.description = metadataDisplay.description;
      }
    }
    return associated;
  }

  private patchValueEnumWithData(parameters: IMetadataEventParameter[] | undefined) {
    const displays = this.displays;
    if (!parameters || parameters.length === 0) {
      return [];
    }
    if (displays.length === 0) {
      return parameters;
    }
    for (let parameter of parameters) {
      const valueEnum = parameter.valueEnum;
      for (let v of valueEnum) {
        const display = displays.find((d: IMetadataDisplay) => d.id === `DICTIONARY#${parameter.prefix}#${parameter.name}#${v.value}`);
        if (display) {
          v.displayValue = display.displayName;
        }
      }
    }
    return parameters;
  }
}