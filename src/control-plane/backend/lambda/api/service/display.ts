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
import { isEmpty } from '../common/utils';
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

  private pathEventInfoFromWhiteList(event: IMetadataEvent, whiteList: IMetadataWhiteList) {
    const presetEvent = whiteList.PresetEvents.find((e: any) => e.name === event.name);
    event.metadataSource = presetEvent ? MetadataSource.PRESET : MetadataSource.CUSTOM;
    event.description = isEmpty(event.description) && presetEvent ? presetEvent.description : '';
  }

  private pathEventParameterInfoFromWhiteList(parameter: IMetadataEventParameter, whiteList: IMetadataWhiteList) {
    const presetEventParameter = whiteList.PresetEventParameters.find((e: any) => e.name === parameter.name);
    const publicEventParameter = whiteList.PublicEventParameters.find((e: any) => e.name === parameter.name);
    parameter.metadataSource = presetEventParameter ? MetadataSource.PRESET : MetadataSource.CUSTOM;
    parameter.description = isEmpty(parameter.description) && presetEventParameter ? presetEventParameter.description : '';
    parameter.parameterType = publicEventParameter ? MetadataParameterType.PUBLIC : MetadataParameterType.PRIVATE;
  }

  private pathUserAttributeInfoFromWhiteList(attribute: IMetadataUserAttribute, whiteList: IMetadataWhiteList) {
    const presetUserAttribute = whiteList.PresetUserAttributes.find((e: any) => e.name === attribute.name);
    attribute.metadataSource = presetUserAttribute ? MetadataSource.PRESET : MetadataSource.CUSTOM;
    attribute.description = isEmpty(attribute.description) && presetUserAttribute ? presetUserAttribute.description : '';
  }

  public async patch(projectId: string, appId: string,
    metadataArray: IMetadataEvent[] | IMetadataEventParameter[] | IMetadataUserAttribute[]) {
    try {
      const displays = await this.getDisplay(projectId, appId);
      const whiteList = await this.getWhiteList();
      for (let metadata of metadataArray) {
        const prefix = metadata.prefix.split('#')[0];
        if (metadata.prefix.startsWith('EVENT#')) {
          const event = metadata as IMetadataEvent;
          this.pathEventInfoFromWhiteList(event, whiteList!);
          event.associatedParameters = this.patchAssociatedWithData(event.associatedParameters) as IMetadataEventParameter[];
          event.associatedParameters = this.patchValueEnumWithData(event.associatedParameters) as IMetadataEventParameter[];
        }
        if (metadata.prefix.startsWith('EVENT_PARAMETER#')) {
          let parameter = metadata as IMetadataEventParameter;
          this.pathEventParameterInfoFromWhiteList(parameter, whiteList!);
          parameter.associatedEvents = this.patchAssociatedWithData(parameter.associatedEvents) as IMetadataEvent[];
          parameter = (this.patchValueEnumWithData([parameter]) as IMetadataEventParameter[])[0];
        }
        if (metadata.prefix.startsWith('USER_ATTRIBUTE#')) {
          let userAttribute = metadata as IMetadataUserAttribute;
          this.pathUserAttributeInfoFromWhiteList(userAttribute, whiteList!);
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