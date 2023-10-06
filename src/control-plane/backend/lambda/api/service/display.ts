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

import { MetadataParameterType, MetadataSource } from '../common/explore-types';
import { logger } from '../common/powertools';
import { IMetadataAttributeValue, IMetadataDisplay, IMetadataEvent, IMetadataEventParameter, IMetadataUserAttribute, IMetadataWhiteList } from '../model/metadata';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbMetadataStore } from '../store/dynamodb/dynamodb-metadata-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';
import { MetadataStore } from '../store/metadata-store';

const metadataStore: MetadataStore = new DynamoDbMetadataStore();
const store: ClickStreamStore = new DynamoDbStore();

export class CMetadataDisplay {

  private displays: IMetadataDisplay[];
  private whiteList?: IMetadataWhiteList;

  constructor() {
    this.displays = [];
    this.whiteList = undefined;
  }

  public async getDisplay(projectId: string, appId: string) {
    if (this.displays.length === 0) {
      this.displays = await metadataStore.getDisplay(projectId, appId);
    }
    return this.displays;
  }

  public async getWhiteList() {
    if (!this.whiteList) {
      const dic = await store.getDictionary('MetadataWhiteList');
      if (dic) {
        this.whiteList = dic.data as IMetadataWhiteList;
      }
    }
    return this.whiteList;
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

  private pathEventInfo(event: IMetadataEvent) {
    if (!this.displays) {
      return;
    }
    const prefix = event.prefix.split('#')[0];
    const key = `${prefix}#${event.projectId}#${event.appId}#${event.name}`;
    const metadataDisplay = this.displays.find((d: IMetadataDisplay) => d.id === key);
    event.displayName = metadataDisplay?.displayName ?? event.name;
    event.description = metadataDisplay?.description ?? '';
    if (!this.whiteList) {
      return;
    }
    const presetEvent = this.whiteList.PresetEvents.find((e: any) => e.name === event.name);
    event.metadataSource = presetEvent ? MetadataSource.PRESET : MetadataSource.CUSTOM;
    event.description = presetEvent ? presetEvent.description : event.description;
  }

  private pathEventParameterInfo(parameter: IMetadataEventParameter) {
    if (!this.displays) {
      return;
    }
    const prefix = parameter.prefix.split('#')[0];
    const key = `${prefix}#${parameter.projectId}#${parameter.appId}#${parameter.name}#${parameter.valueType}`;
    const metadataDisplay = this.displays.find((d: IMetadataDisplay) => d.id === key);
    parameter.displayName = metadataDisplay?.displayName ?? parameter.name;
    parameter.description = metadataDisplay?.description ?? '';
    if (!this.whiteList) {
      return;
    }
    const presetEventParameter = this.whiteList.PresetEventParameters.find(
      (e: any) => e.name === parameter.name && e.dataType === parameter.valueType);
    const publicEventParameter = this.whiteList.PublicEventParameters.find(
      (e: any) => e.name === parameter.name && e.dataType === parameter.valueType);
    parameter.metadataSource = presetEventParameter ? MetadataSource.PRESET : MetadataSource.CUSTOM;
    parameter.description = presetEventParameter ? presetEventParameter.description : parameter.description;
    parameter.parameterType = publicEventParameter ? MetadataParameterType.PUBLIC : MetadataParameterType.PRIVATE;
  }

  private pathUserAttributeInfo(attribute: IMetadataUserAttribute) {
    if (!this.displays) {
      return;
    }
    const prefix = attribute.prefix.split('#')[0];
    const key = `${prefix}#${attribute.projectId}#${attribute.appId}#${attribute.name}#${attribute.valueType}`;
    const metadataDisplay = this.displays.find((d: IMetadataDisplay) => d.id === key);
    attribute.displayName = metadataDisplay?.displayName ?? attribute.name;
    attribute.description = metadataDisplay?.description ?? '';
    if (!this.whiteList) {
      return;
    }
    const presetUserAttribute = this.whiteList.PresetUserAttributes.find(
      (e: any) => e.name === attribute.name && e.dataType === attribute.valueType);
    attribute.metadataSource = presetUserAttribute ? MetadataSource.PRESET : MetadataSource.CUSTOM;
    attribute.description = presetUserAttribute ? presetUserAttribute.description : attribute.description;
  }

  public async patch(projectId: string, appId: string,
    metadataArray: IMetadataEvent[] | IMetadataEventParameter[] | IMetadataUserAttribute[]) {
    try {
      await this.getDisplay(projectId, appId);
      await this.getWhiteList();
      for (let metadata of metadataArray) {
        const prefix = metadata.prefix.split('#')[0];
        switch (prefix) {
          case 'EVENT':
            let event = metadata as IMetadataEvent;
            this.pathEventInfo(event);
            event.associatedParameters = this.patchAssociated(event.associatedParameters) as IMetadataEventParameter[];
            event.associatedParameters = this.patchValues(event.associatedParameters) as IMetadataEventParameter[];
            break;
          case 'EVENT_PARAMETER':
            let parameter = metadata as IMetadataEventParameter;
            this.pathEventParameterInfo(parameter);
            parameter.associatedEvents = this.patchAssociated(parameter.associatedEvents) as IMetadataEvent[];
            parameter = this.patchValues([parameter])[0] as IMetadataEventParameter;
            break;
          case 'USER_ATTRIBUTE':
            let userAttribute = metadata as IMetadataUserAttribute;
            this.pathUserAttributeInfo(userAttribute);
            userAttribute = this.patchValues([userAttribute])[0];
            break;
          default:
            break;
        }
      }
    } catch (error) {
      logger.error('Patch display error', { error });
    }
    return metadataArray;
  }

  private patchAssociated(associated: IMetadataEvent[] | IMetadataEventParameter[] | undefined) {
    if (!associated || associated.length === 0) {
      return [];
    }
    for (let metadata of associated) {
      const prefix = metadata.prefix.split('#')[0];
      switch (prefix) {
        case 'EVENT':
          const event = metadata as IMetadataEvent;
          this.pathEventInfo(event);
          break;
        case 'EVENT_PARAMETER':
          const parameter = metadata as IMetadataEventParameter;
          this.pathEventParameterInfo(parameter);
          break;
        default:
          break;
      }
    }
    return associated;
  }

  private patchValues(parameters: IMetadataEventParameter[] | IMetadataUserAttribute[] | undefined) {
    const displays = this.displays;
    if (!parameters || parameters.length === 0) {
      return [];
    }
    for (let parameter of parameters) {
      const valueEnum = parameter.valueEnum ?? [];
      const values: IMetadataAttributeValue[] = [];
      for (let e of valueEnum) {
        const key = `DICTIONARY#${parameter.projectId}#${parameter.appId}#${parameter.name}#${parameter.valueType}#${e.value}`;
        const display = displays.find((d: IMetadataDisplay) => d.id === key);
        values.push({
          value: e.value,
          displayValue: display?.displayName ?? e.value,
        });
      }
      parameter.valueEnum = undefined;
      parameter.values = values;
    }
    return parameters;
  }
}