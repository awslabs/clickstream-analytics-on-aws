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
import { isEqual } from 'lodash';
import {
  CLICK_STREAM_USER_DATA,
  EPipelineStatus,
  ExecutionType,
} from './const';
import { ServerlessRedshiftRPUByRegionMapping } from './constant-ln';

/**
 * The `ternary` function in TypeScript returns `caseOne` if `cond` is true, otherwise it returns
 */
export const ternary = <T>(cond: any, caseOne: T, caseTwo: T) =>
  cond ? caseOne : caseTwo;

export const defaultStr = (
  expectStr: string | null | undefined,
  defaultValue?: string
) => {
  return expectStr ?? defaultValue ?? '';
};

export const generateStr = (length: number) => {
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  let randomString = '';
  let seed = new Date().getTime();

  while (randomString.length < length) {
    seed = (seed * 9301 + 49297) % 233280;
    const randomIndex = Math.floor((seed / 233280) * characters.length);
    randomString += characters.charAt(randomIndex);
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

export const EMAIL_PATTERN =
  '\\w+([-+.]\\w+)*@\\w+([-.]\\w+)*\\.\\w+([-.]\\w+)*';
export const validateEmails = (emails: string) => {
  const emailArray = emails.split(',');
  const regex = new RegExp(`${EMAIL_PATTERN}`);
  for (const item of emailArray) {
    const email = item.trim();
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
  const regex = /^[a-zA-Z]\w{0,126}$/;
  if (!regex.test(appId)) {
    return false;
  }
  return true;
};

export const validatePluginName = (name: string) => {
  const re = /[^0-9a-zA-Z_\- |]/g;
  if (!re?.test(name)) {
    return true;
  }
  return false;
};

export const validatePluginMainFunction = (functionName: string) => {
  const re = /[^0-9a-zA-Z._\- |]/g;
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

const buildCronFixedRate = (
  fixedValue: number,
  unit: SelectProps.Option | null,
  defaultValue: string
) => {
  if (fixedValue && fixedValue > 0) {
    if (unit?.value === 'hour') {
      return `rate(${fixedValue} ${ternary(fixedValue > 1, 'hours', 'hour')})`;
    } else if (unit?.value === 'minute') {
      return `rate(${fixedValue} ${ternary(
        fixedValue > 1,
        'minutes',
        'minute'
      )})`;
    } else if (unit?.value === 'day') {
      return `rate(${fixedValue} ${ternary(fixedValue > 1, 'days', 'day')})`;
    } else {
      return defaultValue;
    }
  } else {
    return defaultValue;
  }
};

export const generateCronDateRange = (
  type: string | undefined,
  fixedValue: number,
  cronExp: string,
  unit: SelectProps.Option | null,
  attr: 'processing' | 'dataload'
) => {
  let DEFAULT_VALUE = `rate(1 hour)`;
  if (attr === 'dataload') {
    DEFAULT_VALUE = `rate(5 minutes)`;
  }
  if (type === ExecutionType.FIXED_RATE) {
    return buildCronFixedRate(fixedValue, unit, DEFAULT_VALUE);
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
  const regex = /^arn:aws.*:redshift-serverless:[^:]+:(\d{12}):/;
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
  const regex = /^arn:aws.*:cloudwatch:(\w{2}-\w{1,10}-\d):\d{12}:/;
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

export const defaultSelectOptions = (
  optionDefault: SelectProps.Option,
  optionNotSure?: SelectProps.Option | null
) => {
  if (optionNotSure) {
    return optionNotSure;
  } else {
    return optionDefault;
  }
};

export const checkDisable = (condOne?: boolean, condTwo?: boolean) => {
  if (condOne) {
    return true;
  }
  if (condTwo) {
    return true;
  }
  return false;
};

export const defaultGenericsValue = <T>(expectValue: T, defaultValue: T) => {
  if (expectValue) {
    return expectValue;
  } else {
    return defaultValue;
  }
};

export const getEventParameters = (
  metadataEvents: IMetadataEvent[],
  eventName?: string
) => {
  if (!eventName) {
    return [];
  }
  const event = metadataEvents.find((item) => item.name === eventName);
  if (event) {
    return event.associatedParameters ?? [];
  }
  return [];
};

export const getUserInfoFromLocalStorage = () => {
  if (window.localStorage.getItem(CLICK_STREAM_USER_DATA)) {
    return JSON.parse(
      window.localStorage.getItem(CLICK_STREAM_USER_DATA) ?? ''
    );
  } else {
    return null;
  }
};
