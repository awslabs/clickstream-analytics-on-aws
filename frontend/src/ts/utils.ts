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

import { SelectProps } from '@cloudscape-design/components';
import { OptionDefinition } from '@cloudscape-design/components/internal/components/option/interfaces';
import {
  ANALYTICS_OPERATORS,
  CategoryItemType,
  IConditionItemType,
  IEventAnalyticsItem,
} from 'components/eventselect/AnalyticsType';
import { isEqual } from 'lodash';
import moment from 'moment';
import { EPipelineStatus, ExecutionType, TIME_FORMAT } from './const';
import { ServerlessRedshiftRPUByRegionMapping } from './constant-ln';
import { MetadataSource } from './explore-types';

export const generateStr = (length: number) => {
  let randomString = '';
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * letters.length);
    randomString += letters[randomIndex];
  }
  return randomString;
};

export const generateRedshiftRPUOptionListByRegion = (region: string) => {
  const STEP = 8;
  const minMaxObject = (
    ServerlessRedshiftRPUByRegionMapping as RPURegionListType
  )[region];
  if (region && minMaxObject && minMaxObject.min > 0) {
    const options = [];
    for (let i = minMaxObject.min; i <= minMaxObject.max; i += STEP) {
      options.push({ label: i.toString(), value: i.toString() });
    }
    return options;
  }
  return [];
};

export const alertMsg = (alertTxt: string, alertType: AlertType) => {
  const patchEvent = new CustomEvent('showAlertMsg', {
    detail: {
      alertTxt,
      alertType,
    },
  });
  window.dispatchEvent(patchEvent);
};

export const isPositiveInteger = (num: number) => {
  return Number.isInteger(num) && num > 0;
};

export const checkStringValidRegex = (str: string, regex: RegExp) => {
  return regex.test(str);
};

export const validateEmails = (emails: string) => {
  const emailArray = emails.split(',');
  const regex = /\w[-\w.+]*@([A-Za-z0-9][-A-Za-z0-9]+\.)+[A-Za-z]{2,14}/;
  for (let i = 0; i < emailArray.length; i++) {
    const email = emailArray[i].trim();
    if (!regex.test(email)) {
      return false;
    }
  }
  return true;
};

export const validateProjectId = (projectId: string) => {
  const regex = /^[a-z_][a-z0-9_]{0,126}$/;
  if (!regex.test(projectId)) {
    return false;
  }
  return true;
};

export const validateAppId = (appId: string) => {
  const regex = /^[a-zA-Z][a-zA-Z0-9_]{0,126}$/;
  if (!regex.test(appId)) {
    return false;
  }
  return true;
};

export const validatePluginName = (name: string) => {
  const re = /[^0-9a-zA-Z_\- |-]/g;
  if (!re?.test(name)) {
    return true;
  }
  return false;
};

export const validatePluginMainFunction = (functionName: string) => {
  const re = /[^0-9a-zA-Z._\- |-]/g;
  if (!re?.test(functionName)) {
    return true;
  }
  return false;
};

export const generateFileDownloadLink = (fileContent: string): string => {
  // Create Blob url
  const blob = new Blob([fileContent], { type: 'text/plain' });
  // create URL Object
  const url = URL.createObjectURL(blob);
  return url;
};

export const generateCronDateRange = (
  type: string | undefined,
  fixedValue: number,
  cronExp: string,
  unit: SelectProps.Option | null,
  attr: 'processing' | 'upsert' | 'dataload'
) => {
  let DEFAULT_VALUE = `rate(1 hour)`;
  if (attr === 'upsert') {
    DEFAULT_VALUE = `rate(1 day)`;
  }
  if (attr === 'dataload') {
    DEFAULT_VALUE = `rate(5 minutes)`;
  }
  if (type === ExecutionType.FIXED_RATE) {
    if (fixedValue && fixedValue > 0) {
      if (unit?.value === 'hour') {
        return `rate(${fixedValue} ${fixedValue > 1 ? 'hours' : 'hour'})`;
      } else if (unit?.value === 'minute') {
        return `rate(${fixedValue} ${fixedValue > 1 ? 'minutes' : 'minute'})`;
      } else if (unit?.value === 'day') {
        return `rate(${fixedValue} ${fixedValue > 1 ? 'days' : 'day'})`;
      } else {
        return DEFAULT_VALUE;
      }
    } else {
      return DEFAULT_VALUE;
    }
  } else if (type === ExecutionType.CRON_EXPRESS) {
    if (cronExp) {
      return `cron(${cronExp})`;
    } else {
      return DEFAULT_VALUE;
    }
  } else {
    return DEFAULT_VALUE;
  }
};

export const reverseCronDateRange = (value: string) => {
  if (value.startsWith('cron')) {
    return {
      value: value.substring(5, value.length - 1),
      unit: '',
      type: ExecutionType.CRON_EXPRESS,
    } as ICronFixed;
  } else {
    const indexSpace = value.indexOf(' ');
    const fixedValue = value.substring(5, indexSpace);
    let fixedUnitStr = value.substring(indexSpace + 1, value.length - 1);
    if (fixedUnitStr.endsWith('s')) {
      fixedUnitStr = fixedUnitStr.substring(0, fixedUnitStr.length - 1);
    }
    return {
      value: fixedValue,
      unit: fixedUnitStr,
      type: ExecutionType.FIXED_RATE,
    } as ICronFixed;
  }
};

export const generateRedshiftInterval = (value?: number, unit?: string) => {
  if (value) {
    if (unit === 'month') {
      return value * 60 * 24 * 30;
    }
    if (unit === 'day') {
      return value * 60 * 24;
    }
    return value;
  } else {
    return 6 * 60 * 24 * 30;
  }
};

export const reverseRedshiftInterval = (value: number) => {
  if (value) {
    if (value / (60 * 24 * 30) >= 1 && value % (60 * 24 * 30) === 0) {
      return {
        value: (value / (60 * 24 * 30)).toString(),
        unit: 'month',
      } as IInterval;
    }
    if (value / (60 * 24) >= 1 && value % (60 * 24) === 0) {
      return {
        value: (value / (60 * 24)).toString(),
        unit: 'day',
      } as IInterval;
    }
  }
  return {
    value: '0',
    unit: 'day',
  } as IInterval;
};

export const reverseFreshnessInHour = (value: number) => {
  if (value) {
    if (value / 24 >= 1 && value % 24 === 0) {
      return {
        value: (value / 24).toString(),
        unit: 'day',
      } as IInterval;
    }
    return {
      value: value.toString(),
      unit: 'hour',
    } as IInterval;
  }
  return {
    value: '0',
    unit: 'hour',
  } as IInterval;
};

export const extractAccountIdFromArn = (arn: string) => {
  const regex = /^arn:aws.*:redshift-serverless:[^:]+:([0-9]{12}):/;
  const matchResult = arn.match(regex);
  return matchResult ? matchResult[1] : '';
};

export const isEmpty = (a: any) => {
  if (a === '') return true; //Verify empty string
  if (a === 'null') return true; //Verify null string
  if (a === 'undefined') return true; //Verify undefined string
  if (!a && a !== 0 && a !== '') return true; //Verify undefined and null
  // eslint-disable-next-line no-prototype-builtins
  if (Array.prototype.isPrototypeOf(a) && a.length === 0) return true; //Verify empty array
  // eslint-disable-next-line no-prototype-builtins
  if (Object.prototype.isPrototypeOf(a) && Object.keys(a).length === 0)
    return true; //Verify empty objects
  return false;
};

export const extractRegionFromCloudWatchArn = (arn: string) => {
  const regex = /^arn:aws.*:cloudwatch:(\w{2}-\w{1,10}-\d):[0-9]{12}:/;
  const matchResult = arn.match(regex);
  return matchResult ? matchResult[1] : '';
};

export const isDisabled = (update?: boolean, pipelineInfo?: IExtPipeline) => {
  return (
    update &&
    (pipelineInfo?.status?.status === EPipelineStatus.Failed ||
      pipelineInfo?.status?.status === EPipelineStatus.Active)
  );
};

// Validate subnets cross N AZs
export const validateSubnetCrossInAZs = (
  subnets: OptionDefinition[],
  nAZ: number
) => {
  const subnetsAZs = subnets.map(
    (element) => element?.description?.split(':')[0]
  );
  const subnetSets = new Set(subnetsAZs);
  if (subnetSets.size < nAZ) {
    return false;
  }
  return true;
};

// Validate Private Subnet in same AZ with Public Subnets
export const validatePublicSubnetInSameAZWithPrivateSubnets = (
  publicSubnets: OptionDefinition[],
  privateSubnets: OptionDefinition[]
) => {
  const publicSubnetsAZs = publicSubnets.map(
    (element) => element?.description?.split(':')[0]
  );
  const privateSubnetsAZs = privateSubnets.map(
    (element) => element?.description?.split(':')[0]
  );
  return isEqual(new Set(publicSubnetsAZs), new Set(privateSubnetsAZs));
};

export const getValueFromStackOutputs = (
  pipeline: IPipeline,
  stackType: string,
  keys: string[]
) => {
  const res: Map<string, string> = new Map<string, string>();
  const stackDetail = pipeline.status?.stackDetails?.find(
    (s) => s.stackType === stackType
  );
  if (!stackDetail) {
    return res;
  }
  const stackOutputs = stackDetail.outputs;
  for (const key of keys) {
    for (const output of stackOutputs) {
      if (output.OutputKey?.endsWith(key)) {
        res.set(key, output.OutputValue ?? '');
        break;
      }
    }
  }
  return res;
};

export const metadataEventsConvertToCategoryItemType = (
  apiDataItems: IMetadataEvent[]
) => {
  const categoryItems: CategoryItemType[] = [];
  const categoryPresetItems: CategoryItemType = {
    categoryName: '预置事件',
    categoryType: 'event',
    itemList: [],
  };
  const categoryCustomItems: CategoryItemType = {
    categoryName: '自定义事件',
    categoryType: 'event',
    itemList: [],
  };
  apiDataItems.forEach((item) => {
    if (item.metadataSource === MetadataSource.PRESET) {
      categoryPresetItems.itemList.push({
        label: item.displayName,
        value: item.name,
        description: item.description,
        metadataSource: item.metadataSource,
        modifyTime: moment(item.updateAt).format(TIME_FORMAT) || '-',
      });
    } else if (item.metadataSource === MetadataSource.CUSTOM) {
      categoryCustomItems.itemList.push({
        label: item.displayName,
        value: item.name,
        description: item.description,
        metadataSource: item.metadataSource,
        modifyTime: moment(item.updateAt).format(TIME_FORMAT) || '-',
      });
    }
  });
  categoryItems.push(categoryPresetItems);
  categoryItems.push(categoryCustomItems);
  return categoryItems;
};

export const parametersConvertToCategoryItemType = (
  userAttributeItems: IMetadataUserAttribute[],
  parameterItems?: IMetadataEventParameter[],
  relationItems?: IMetadataRelation[]
) => {
  const categoryItems: CategoryItemType[] = [];
  const categoryEventItems: CategoryItemType = {
    categoryName: '事件属性',
    categoryType: 'attribute',
    itemList: [],
  };
  const categoryUserItems: CategoryItemType = {
    categoryName: '用户属性',
    categoryType: 'attribute',
    itemList: [],
  };
  if (parameterItems) {
    parameterItems.forEach((item) => {
      categoryEventItems.itemList.push({
        label: item.displayName,
        value: item.name,
        description: item.description,
        metadataSource: item.metadataSource,
        valueType: item.valueType,
        modifyTime: moment(item.updateAt).format(TIME_FORMAT) || '-',
      });
    });
  } else if (relationItems) {
    relationItems.forEach((item) => {
      categoryEventItems.itemList.push({
        label: item.parameterDisplayName,
        value: item.parameterName,
        description: item.parameterDescription,
        metadataSource: item.parameterMetadataSource,
        valueType: item.parameterValueType,
        modifyTime: moment(item.updateAt).format(TIME_FORMAT) || '-',
      });
    });
  }
  userAttributeItems.forEach((item) => {
    categoryUserItems.itemList.push({
      label: item.displayName,
      value: item.name,
      description: item.description,
      metadataSource: item.metadataSource,
      valueType: item.valueType,
      modifyTime: moment(item.updateAt).format(TIME_FORMAT) || '-',
    });
  });
  categoryItems.push(categoryEventItems);
  categoryItems.push(categoryUserItems);
  return categoryItems;
};

export const validEventAnalyticsItem = (item: IEventAnalyticsItem) => {
  return (
    item.selectedEventOption !== null &&
    item.selectedEventOption.value?.trim() !== ''
  );
};

export const validConditionItemType = (condition: IConditionItemType) => {
  if (
    condition.conditionOption !== null &&
    condition.conditionOption.value?.trim() !== '' &&
    condition.conditionOperator !== null &&
    condition.conditionOperator.value?.trim() !== ''
  ) {
    if (
      condition.conditionOperator.value === ANALYTICS_OPERATORS.is_null.value ||
      condition.conditionOperator.value ===
        ANALYTICS_OPERATORS.is_not_null.value
    ) {
      return true;
    } else {
      return condition.conditionValue.trim() !== '';
    }
  }
  return false;
};
