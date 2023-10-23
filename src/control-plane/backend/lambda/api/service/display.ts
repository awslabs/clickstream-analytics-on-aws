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

import { ConditionCategory, MetadataParameterType, MetadataSource, MetadataValueType } from '../common/explore-types';
import { logger } from '../common/powertools';
import { getCurMonthStr } from '../common/utils';
import { IMetadataAttributeValue, IMetadataDisplay, IMetadataEvent, IMetadataEventParameter, IMetadataUserAttribute, IMetadataBuiltInList } from '../model/metadata';
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

  private pathEventInfo(event: IMetadataEvent) {
    if (!this.displays) {
      return;
    }
    const prefix = event.prefix.split('#')[0];
    const key = `${prefix}#${event.projectId}#${event.appId}#${event.name}`;
    const metadataDisplay = this.displays.find((d: IMetadataDisplay) => d.id === key);
    event.displayName = metadataDisplay?.displayName ?? event.name;
    event.description = metadataDisplay?.description ?? { 'en-US': '', 'zh-CN': '' };
    if (!this.builtList) {
      return;
    }
    const presetEvent = this.builtList.PresetEvents.find((e: any) => e.name === event.name);
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
    parameter.description = metadataDisplay?.description ?? { 'en-US': '', 'zh-CN': '' };
    if (!this.builtList) {
      return;
    }
    const presetEventParameter = this.builtList.PresetEventParameters.find(
      (e: any) => e.name === parameter.name && e.dataType === parameter.valueType);
    const publicEventParameter = this.builtList.PublicEventParameters.find(
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
    attribute.description = metadataDisplay?.description ?? { 'en-US': '', 'zh-CN': '' };
    if (!this.builtList) {
      return;
    }
    const presetUserAttribute = this.builtList.PresetUserAttributes.find(
      (e: any) => e.name === attribute.name && e.dataType === attribute.valueType);
    attribute.metadataSource = presetUserAttribute ? MetadataSource.PRESET : MetadataSource.CUSTOM;
    attribute.description = presetUserAttribute ? presetUserAttribute.description : attribute.description;
  }

  public async patch(projectId: string, appId: string,
    metadataArray: IMetadataEvent[] | IMetadataEventParameter[] | IMetadataUserAttribute[]) {
    try {
      await this.getDisplay(projectId, appId);
      await this.getBuiltList();
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

  public async patchPresetEvents(projectId: string, appId: string, eventArray: IMetadataEvent[], associated?: boolean) {
    try {
      if (eventArray.length === 0) {
        return this.getPresetEvents(projectId, appId, associated);
      }
    } catch (error) {
      logger.error('Patch Preset Events error', { error });
    }
    return eventArray;
  }

  private getPresetEvents(projectId: string, appId: string, associated?: boolean) {
    const presetEvents: IMetadataEvent[] = [];
    if (this.builtList) {
      for (let e of this.builtList.PresetEvents) {
        const presetEvent: IMetadataEvent = {
          id: `${projectId}#${appId}#${e.name}`,
          month: getCurMonthStr(),
          prefix: `EVENT#${projectId}#${appId}`,
          projectId: projectId,
          appId: appId,
          name: e.name,
          dataVolumeLastDay: 0,
          hasData: true,
          platform: [],
          displayName: e.name,
          description: e.description,
          metadataSource: MetadataSource.PRESET,
          associatedParameters: [],
        };
        if (associated) {
          const associatedParameters = this.getPresetEventParameters(projectId, appId, e.name).concat(
            this.getPublicEventParameters(projectId, appId, e.name),
          );
          presetEvent.associatedParameters = associatedParameters;
        }
        presetEvents.push(presetEvent);
      }
    }
    return presetEvents;
  }

  private getPresetEventParameters(projectId: string, appId: string, eventName: string, associated?: boolean) {
    const presetEventParameters: IMetadataEventParameter[] = [];
    if (this.builtList) {
      for (let p of this.builtList.PresetEventParameters) {
        const parameter: IMetadataEventParameter = {
          id: `${projectId}#${appId}#${eventName}#${p.dataType}`,
          month: getCurMonthStr(),
          prefix: `EVENT_PARAMETER#${projectId}#${appId}`,
          projectId: projectId,
          appId: appId,
          name: p.name,
          eventName: eventName,
          valueType: p.dataType as MetadataValueType,
          category: ConditionCategory.EVENT,
          hasData: true,
          platform: [],
          displayName: p.name,
          description: p.description,
          metadataSource: MetadataSource.PRESET,
          parameterType: MetadataParameterType.PRIVATE,
          values: [],
        };
        if (associated) {
          parameter.associatedEvents = this.getPresetEvents(projectId, appId);
        }
        presetEventParameters.push(parameter);
      }
    }
    return presetEventParameters;
  }

  private getPublicEventParameters(projectId: string, appId: string, eventName: string, associated?: boolean) {
    const publicEventParameters: IMetadataEventParameter[] = [];
    if (this.builtList) {
      for (let p of this.builtList.PublicEventParameters) {
        const parameter: IMetadataEventParameter = {
          id: `${projectId}#${appId}#${eventName}#${p.dataType}`,
          month: getCurMonthStr(),
          prefix: `EVENT_PARAMETER#${projectId}#${appId}`,
          projectId: projectId,
          appId: appId,
          name: p.name,
          eventName: eventName,
          valueType: p.dataType as MetadataValueType,
          category: ConditionCategory.EVENT,
          hasData: true,
          platform: [],
          displayName: p.name,
          description: p.description,
          metadataSource: MetadataSource.PRESET,
          parameterType: MetadataParameterType.PUBLIC,
          values: [],
        };
        if (associated) {
          parameter.associatedEvents = this.getPresetEvents(projectId, appId);
        }
        publicEventParameters.push(parameter);
      }
    }
    return publicEventParameters;
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