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

import { ConditionCategory, MetadataParameterType, MetadataSource } from '@aws/clickstream-base-lib';
import { logger } from '../common/powertools';
import { isEmpty } from '../common/utils';
import { IMetadataAttributeValue, IMetadataDisplay, IMetadataEvent, IMetadataEventParameter, IMetadataUserAttribute, IMetadataBuiltInList, IMetadataDisplayNameAndDescription } from '../model/metadata';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbMetadataStore } from '../store/dynamodb/dynamodb-metadata-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';
import { MetadataStore } from '../store/metadata-store';

const metadataStore: MetadataStore = new DynamoDbMetadataStore();
const store: ClickStreamStore = new DynamoDbStore();

export class CMetadataDisplay {

  private displays: IMetadataDisplay[];
  private builtList?: IMetadataBuiltInList;

  constructor() {
    this.displays = [];
    this.builtList = undefined;
  }

  public async getDisplay(projectId: string, appId: string) {
    if (this.displays.length === 0) {
      this.displays = await metadataStore.getDisplay(projectId, appId);
    }
    return this.displays;
  }

  public async getBuiltList() {
    if (!this.builtList) {
      const dic = await store.getDictionary('MetadataBuiltInList');
      if (dic) {
        this.builtList = dic.data as IMetadataBuiltInList;
      }
    }
    return this.builtList;
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

  private patchEventInfo(event: IMetadataEvent) {
    if (!this.displays) {
      return;
    }
    const prefix = event.prefix.split('#')[0];
    const key = `${prefix}#${event.projectId}#${event.appId}#${event.name}`;
    const metadataDisplay = this.displays.find((d: IMetadataDisplay) => d.id === key);
    event.displayName = metadataDisplay?.displayName ?? { 'en-US': event.name, 'zh-CN': event.name };
    event.description = metadataDisplay?.description ?? { 'en-US': '', 'zh-CN': '' };
    if (!this.builtList) {
      return;
    }
    const presetEvent = this.builtList.PresetEvents.find((e: any) => e.name === event.name);
    event.metadataSource = presetEvent ? MetadataSource.PRESET : MetadataSource.CUSTOM;
    if (!metadataDisplay && presetEvent) {
      event.displayName = presetEvent ? presetEvent.displayName : event.displayName;
      event.description = presetEvent ? presetEvent.description : event.description;
    }
  }

  private patchEventParameterInfo(parameter: IMetadataEventParameter, eventName?: string) {
    if (!this.displays) {
      return;
    }
    const prefix = parameter.prefix.split('#')[0];
    const key = `${prefix}#${parameter.projectId}#${parameter.appId}#${parameter.category}#${parameter.name}#${parameter.valueType}`;
    const metadataDisplay = this.displays.find((d: IMetadataDisplay) => d.id === key);
    parameter.displayName = this.patchCategoryToDisplayName(parameter.category, parameter.name, metadataDisplay?.displayName);
    parameter.description = metadataDisplay?.description ?? { 'en-US': '', 'zh-CN': '' };
    this._patchEventParameterInfoFromPresetConfiguration(parameter, eventName);
  }

  private _patchEventParameterInfoFromPresetConfiguration(
    parameter: IMetadataEventParameter,
    eventName?: string) {
    if (!this.builtList) {
      return;
    }
    this._findInPresetConfiguration(this.builtList, parameter, eventName);
  }

  private _findInPresetConfiguration(builtList: IMetadataBuiltInList, parameter: IMetadataEventParameter, eventName?: string) {
    let matchParameter: any;
    if (eventName) {
      matchParameter = builtList.PresetEventParameters.find(
        (e: any) => e.eventName === eventName && e.name === parameter.name && e.dataType === parameter.valueType);
      if (matchParameter) {
        parameter.displayName = matchParameter.displayName;
        parameter.description = matchParameter.description;
        parameter.metadataSource = MetadataSource.PRESET;
        parameter.parameterType = MetadataParameterType.PRIVATE;
      }
    }
    if (!matchParameter) {
      matchParameter = builtList.PresetEventParameters.find(
        (e: any) => e.name === parameter.name && e.dataType === parameter.valueType);
      if (matchParameter) {
        parameter.displayName = matchParameter.displayName;
        parameter.description = matchParameter.description;
        parameter.metadataSource = MetadataSource.PRESET;
        parameter.parameterType = MetadataParameterType.PRIVATE;
      }
    }
    if (!matchParameter) {
      matchParameter = builtList.PublicEventParameters.find((e: any) => e.name === parameter.name && e.dataType === parameter.valueType);
      if (matchParameter) {
        parameter.displayName = matchParameter.displayName;
        parameter.description = matchParameter.description;
        parameter.metadataSource = MetadataSource.PRESET;
        parameter.parameterType = MetadataParameterType.PUBLIC;
      }
    }
    if (!matchParameter) {
      parameter.metadataSource = MetadataSource.CUSTOM;
      parameter.parameterType = MetadataParameterType.PRIVATE;
    }
  }

  private patchUserAttributeInfo(attribute: IMetadataUserAttribute) {
    if (!this.displays) {
      return;
    }
    const prefix = attribute.prefix.split('#')[0];
    const key = `${prefix}#${attribute.projectId}#${attribute.appId}#${attribute.category}#${attribute.name}#${attribute.valueType}`;
    const metadataDisplay = this.displays.find((d: IMetadataDisplay) => d.id === key);
    attribute.displayName = this.patchCategoryToDisplayName(attribute.category, attribute.name, metadataDisplay?.displayName);
    attribute.description = metadataDisplay?.description ?? { 'en-US': '', 'zh-CN': '' };
    if (!this.builtList) {
      return;
    }
    const presetUserAttribute = this.builtList.PresetUserAttributes.find(
      (e: any) => e.name === attribute.name && e.dataType === attribute.valueType);
    attribute.metadataSource = presetUserAttribute ? MetadataSource.PRESET : MetadataSource.CUSTOM;
    if (!metadataDisplay && presetUserAttribute) {
      attribute.displayName = presetUserAttribute ? presetUserAttribute.displayName : attribute.displayName;
      attribute.description = presetUserAttribute ? presetUserAttribute.description : attribute.description;
    }
  }

  public async patch(projectId: string, appId: string,
    metadataArray: IMetadataEvent[] | IMetadataEventParameter[] | IMetadataUserAttribute[],
    eventName?: string) {
    try {
      await this.getDisplay(projectId, appId);
      await this.getBuiltList();
      for (let metadata of metadataArray) {
        const prefix = metadata.prefix.split('#')[0];
        switch (prefix) {
          case 'EVENT':
            let event = metadata as IMetadataEvent;
            this.patchEventInfo(event);
            event.associatedParameters = this.patchAssociated(event.associatedParameters, event.name) as IMetadataEventParameter[];
            event.associatedParameters = this.patchValues(event.associatedParameters) as IMetadataEventParameter[];
            break;
          case 'EVENT_PARAMETER':
            let parameter = metadata as IMetadataEventParameter;
            this.patchEventParameterInfo(parameter, eventName);
            parameter.associatedEvents = this.patchAssociated(parameter.associatedEvents) as IMetadataEvent[];
            parameter = this.patchValues([parameter])[0] as IMetadataEventParameter;
            break;
          case 'USER_ATTRIBUTE':
            let userAttribute = metadata as IMetadataUserAttribute;
            this.patchUserAttributeInfo(userAttribute);
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

  private patchAssociated(associated: IMetadataEvent[] | IMetadataEventParameter[] | undefined, eventName?: string) {
    if (!associated || associated.length === 0) {
      return [];
    }
    for (let metadata of associated) {
      const prefix = metadata.prefix.split('#')[0];
      switch (prefix) {
        case 'EVENT':
          const event = metadata as IMetadataEvent;
          this.patchEventInfo(event);
          break;
        case 'EVENT_PARAMETER':
          const parameter = metadata as IMetadataEventParameter;
          this.patchEventParameterInfo(parameter, eventName);
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
        const key = `DICTIONARY#${parameter.projectId}#${parameter.appId}#${parameter.category}#${parameter.name}#${parameter.valueType}#${e.value}`;
        const display = displays.find((d: IMetadataDisplay) => d.id === key);
        values.push({
          value: e.value,
          displayValue: display?.displayName['en-US'] ?? e.value,
        });
      }
      parameter.valueEnum = undefined;
      parameter.values = values;
    }
    return parameters;
  }

  private patchCategoryToDisplayName(category: ConditionCategory, name: string, displayName?: IMetadataDisplayNameAndDescription) {
    return {
      'en-US': !isEmpty(displayName?.['en-US']) ? displayName?.['en-US'] : `[${category}] ${name}`,
      'zh-CN': !isEmpty(displayName?.['zh-CN']) ? displayName?.['zh-CN'] : `[${category}] ${name}`,
    } as IMetadataDisplayNameAndDescription;
  }
}