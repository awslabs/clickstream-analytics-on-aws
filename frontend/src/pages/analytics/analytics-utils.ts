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

import {
  DateRangePickerProps,
  SelectProps,
} from '@cloudscape-design/components';
import {
  CategoryItemType,
  IConditionItemType,
  IEventAnalyticsItem,
  IRetentionAnalyticsItem,
  SegmentationFilterDataType,
} from 'components/eventselect/AnalyticsType';
import i18n from 'i18n';
import moment from 'moment';
import { TIME_FORMAT } from 'ts/const';
import {
  OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_NAME,
  OUTPUT_DATA_MODELING_REDSHIFT_DATA_API_ROLE_ARN_SUFFIX,
  OUTPUT_DATA_MODELING_REDSHIFT_BI_USER_NAME_SUFFIX,
  OUTPUT_REPORTING_QUICKSIGHT_DATA_SOURCE_ARN,
} from 'ts/constant-ln';
import {
  ExploreComputeMethod,
  ExploreConversionIntervalType,
  ExplorePathSessionDef,
  ExploreRelativeTimeUnit,
  ExploreTimeScopeType,
  MetadataSource,
  MetadataValueType,
} from 'ts/explore-types';
import { getValueFromStackOutputs } from 'ts/utils';

export const metadataEventsConvertToCategoryItemType = (
  apiDataItems: IMetadataEvent[]
) => {
  const categoryItems: CategoryItemType[] = [];
  const categoryPresetItems: CategoryItemType = {
    categoryName: i18n.t('analytics:labels.presetEvent'),
    categoryType: 'event',
    itemList: [],
  };
  const categoryCustomItems: CategoryItemType = {
    categoryName: i18n.t('analytics:labels.customEvent'),
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

export const pathNodesConvertToCategoryItemType = (
  pathNodes: IMetadataAttributeValue[]
) => {
  const categoryItems: CategoryItemType[] = [];
  const categoryNodeItems: CategoryItemType = {
    categoryName: i18n.t('analytics:labels.pathNode'),
    categoryType: 'node',
    itemList: [],
  };
  pathNodes.forEach((item) => {
    categoryNodeItems.itemList.push({
      label: item.displayValue,
      value: item.value,
    });
  });
  categoryItems.push(categoryNodeItems);
  return categoryItems;
};

export const parametersConvertToCategoryItemType = (
  userAttributeItems: IMetadataUserAttribute[],
  parameterItems?: IMetadataEventParameter[]
) => {
  const categoryItems: CategoryItemType[] = [];
  const categoryEventItems: CategoryItemType = {
    categoryName: i18n.t('analytics:labels.eventAttribute'),
    categoryType: 'attribute',
    itemList: [],
  };
  const categoryUserItems: CategoryItemType = {
    categoryName: i18n.t('analytics:labels.userAttribute'),
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
        values: item.values,
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
      values: item.values,
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

export const validRetentionAnalyticsItem = (item: IRetentionAnalyticsItem) => {
  return (
    item.startEventOption !== null &&
    item.startEventOption.value?.trim() !== '' &&
    item.revisitEventOption !== null &&
    item.revisitEventOption.value?.trim() !== ''
  );
};

export const validConditionItemType = (condition: IConditionItemType) => {
  return (
    condition.conditionOption?.value !== null &&
    condition.conditionOption?.value?.length !== 0
  );
};

export const getEventAndConditions = (
  eventOptionData: IEventAnalyticsItem[]
) => {
  const eventAndConditions: IEventAndCondition[] = [];
  eventOptionData.forEach((item) => {
    if (validEventAnalyticsItem(item)) {
      const conditions: ICondition[] = [];
      item.conditionList.forEach((condition) => {
        if (validConditionItemType(condition)) {
          const conditionObj: ICondition = {
            category: 'other',
            property: condition.conditionOption?.value ?? '',
            operator: condition.conditionOperator?.value ?? '',
            value: condition.conditionValue,
            dataType:
              condition.conditionOption?.valueType ?? MetadataValueType.STRING,
          };
          conditions.push(conditionObj);
        }
      });

      const eventAndCondition: IEventAndCondition = {
        eventName: item.selectedEventOption?.value ?? '',
        conditions: conditions,
        conditionOperator: item.conditionRelationShip,
        method:
          item.calculateMethodOption?.value ?? ExploreComputeMethod.USER_CNT,
      };
      eventAndConditions.push(eventAndCondition);
    }
  });
  return eventAndConditions;
};

export const getPairEventAndConditions = (
  retentionOptionData: IRetentionAnalyticsItem[]
) => {
  const pairEventAndConditions: IPairEventAndCondition[] = [];
  retentionOptionData.forEach((item) => {
    if (validRetentionAnalyticsItem(item)) {
      const startConditions: ICondition[] = [];
      const revisitConditions: ICondition[] = [];
      item.startConditionList.forEach((condition) => {
        if (validConditionItemType(condition)) {
          const conditionObj: ICondition = {
            category: 'other',
            property: condition.conditionOption?.value ?? '',
            operator: condition.conditionOperator?.value ?? '',
            value: condition.conditionValue,
            dataType:
              condition.conditionOption?.valueType ?? MetadataValueType.STRING,
          };
          startConditions.push(conditionObj);
        }
      });
      item.revisitConditionList.forEach((condition) => {
        if (validConditionItemType(condition)) {
          const conditionObj: ICondition = {
            category: 'other',
            property: condition.conditionOption?.value ?? '',
            operator: condition.conditionOperator?.value ?? '',
            value: condition.conditionValue,
            dataType:
              condition.conditionOption?.valueType ?? MetadataValueType.STRING,
          };
          revisitConditions.push(conditionObj);
        }
      });

      const pairEventAndCondition: IPairEventAndCondition = {
        startEvent: {
          eventName: item.startEventOption?.value ?? '',
          conditions: startConditions,
          conditionOperator: item.startConditionRelationShip,
          method: ExploreComputeMethod.USER_CNT,
        },
        backEvent: {
          eventName: item.revisitEventOption?.value ?? '',
          conditions: revisitConditions,
          conditionOperator: item.revisitConditionRelationShip,
          method: ExploreComputeMethod.USER_CNT,
        },
      };
      pairEventAndConditions.push(pairEventAndCondition);
    }
  });
  return pairEventAndConditions;
};

export const getGlobalEventCondition = (
  segmentationOptionData: SegmentationFilterDataType
) => {
  const conditions: ICondition[] = [];
  segmentationOptionData.data.forEach((condition) => {
    if (validConditionItemType(condition)) {
      const conditionObj: ICondition = {
        category: 'other',
        property: condition.conditionOption?.value ?? '',
        operator: condition.conditionOperator?.value ?? '',
        value: condition.conditionValue,
        dataType:
          condition.conditionOption?.valueType ?? MetadataValueType.STRING,
      };
      conditions.push(conditionObj);
    }
  });
  const globalEventCondition: ISQLCondition = {
    conditions: conditions,
    conditionOperator: segmentationOptionData.conditionRelationShip,
  };
  return globalEventCondition;
};

export const getIntervalInSeconds = (
  windowType: SelectProps.Option | null,
  selectedWindowUnit: SelectProps.Option | null,
  windowValue: string
) => {
  if (
    windowType?.value === ExploreConversionIntervalType.CUSTOMIZE ||
    windowType?.value === ExplorePathSessionDef.CUSTOMIZE
  ) {
    switch (selectedWindowUnit?.value) {
      case 'second':
        return Number(windowValue);
      case 'minute':
        return Number(windowValue) * 60;
      case 'hour':
        return Number(windowValue) * 60 * 60;
      case 'day':
        return Number(windowValue) * 60 * 60 * 24;
      default:
        return Number(windowValue) * 60;
    }
  } else {
    return 0;
  }
};

export const getDateRange = (dateRangeValue: DateRangePickerProps.Value) => {
  if (dateRangeValue?.type === 'relative') {
    let unit;
    switch (dateRangeValue.unit) {
      case 'week':
        unit = ExploreRelativeTimeUnit.WK;
        break;
      case 'month':
        unit = ExploreRelativeTimeUnit.MM;
        break;
      case 'year':
        unit = ExploreRelativeTimeUnit.YY;
        break;
      default:
        unit = ExploreRelativeTimeUnit.DD;
    }
    return {
      timeScopeType: ExploreTimeScopeType.RELATIVE,
      lastN: dateRangeValue.amount,
      timeUnit: unit,
    };
  } else if (dateRangeValue?.type === 'absolute') {
    return {
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: dateRangeValue.startDate,
      timeEnd: dateRangeValue.endDate,
    };
  }
};

export const getDashboardCreateParameters = (
  pipeline: IPipeline,
  allowedDomain: string
) => {
  const redshiftOutputs = getValueFromStackOutputs(
    pipeline,
    'DataModelingRedshift',
    [
      OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_NAME,
      OUTPUT_DATA_MODELING_REDSHIFT_DATA_API_ROLE_ARN_SUFFIX,
      OUTPUT_DATA_MODELING_REDSHIFT_BI_USER_NAME_SUFFIX,
    ]
  );
  const reportingOutputs = getValueFromStackOutputs(pipeline, 'Reporting', [
    OUTPUT_REPORTING_QUICKSIGHT_DATA_SOURCE_ARN,
  ]);
  if (
    !redshiftOutputs.get(
      OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_NAME
    ) ||
    !redshiftOutputs.get(
      OUTPUT_DATA_MODELING_REDSHIFT_DATA_API_ROLE_ARN_SUFFIX
    ) ||
    !redshiftOutputs.get(OUTPUT_DATA_MODELING_REDSHIFT_BI_USER_NAME_SUFFIX) ||
    !reportingOutputs.get(OUTPUT_REPORTING_QUICKSIGHT_DATA_SOURCE_ARN)
  ) {
    return undefined;
  }
  return {
    region: pipeline.region,
    allowedDomain: allowedDomain,
    redshift: {
      user:
        redshiftOutputs.get(
          OUTPUT_DATA_MODELING_REDSHIFT_BI_USER_NAME_SUFFIX
        ) ?? '',
      dataApiRole:
        redshiftOutputs.get(
          OUTPUT_DATA_MODELING_REDSHIFT_DATA_API_ROLE_ARN_SUFFIX
        ) ?? '',
      newServerless: {
        workgroupName:
          redshiftOutputs.get(
            OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_NAME
          ) ?? '',
      },
    },
    quickSight: {
      dataSourceArn:
        reportingOutputs.get(OUTPUT_REPORTING_QUICKSIGHT_DATA_SOURCE_ARN) ?? '',
    },
  };
};

export const getWarmUpParameters = (
  projectId: string,
  appId: string,
  pipeline: IPipeline
) => {
  const redshiftOutputs = getValueFromStackOutputs(
    pipeline,
    'DataModelingRedshift',
    [
      OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_NAME,
      OUTPUT_DATA_MODELING_REDSHIFT_DATA_API_ROLE_ARN_SUFFIX,
    ]
  );
  if (
    !projectId ||
    !appId ||
    !redshiftOutputs.get(
      OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_NAME
    ) ||
    !redshiftOutputs.get(OUTPUT_DATA_MODELING_REDSHIFT_DATA_API_ROLE_ARN_SUFFIX)
  ) {
    return undefined;
  }
  return {
    projectId: projectId,
    appId: appId,
    dashboardCreateParameters: {
      region: pipeline.region,
      redshift: {
        dataApiRole:
          redshiftOutputs.get(
            OUTPUT_DATA_MODELING_REDSHIFT_DATA_API_ROLE_ARN_SUFFIX
          ) ?? '',
        newServerless: {
          workgroupName:
            redshiftOutputs.get(
              OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_NAME
            ) ?? '',
        },
      },
    },
  };
};
