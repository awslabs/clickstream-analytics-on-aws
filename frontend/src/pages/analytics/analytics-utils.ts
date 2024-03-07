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

import { OUTPUT_REPORTING_QUICKSIGHT_DATA_SOURCE_ARN } from '@aws/clickstream-base-lib';
import {
  DateRangePickerProps,
  SelectProps,
} from '@cloudscape-design/components';
import {
  CategoryItemType,
  IAnalyticsItem,
  IConditionItemType,
  IEventAnalyticsItem,
  IRetentionAnalyticsItem,
  SegmentationFilterDataType,
} from 'components/eventselect/AnalyticsType';
import i18n from 'i18n';
import moment from 'moment';
import { DEFAULT_EN_LANG, TIME_FORMAT } from 'ts/const';
import {
  ConditionCategory,
  ExploreAggregationMethod,
  ExploreAnalyticsOperators,
  ExploreComputeMethod,
  ExploreConversionIntervalType,
  ExplorePathSessionDef,
  ExploreRelativeTimeUnit,
  ExploreTimeScopeType,
  MetadataSource,
  MetadataValueType,
} from 'ts/explore-types';
import { defaultStr, getValueFromStackOutputs } from 'ts/utils';

export const metadataEventsConvertToCategoryItemType = (
  apiDataItems: IMetadataEvent[]
) => {
  const categoryItems: CategoryItemType[] = [];
  const categoryPresetItems: CategoryItemType = {
    categoryId: 'preset',
    categoryName: i18n.t('analytics:labels.presetEvent'),
    categoryType: 'event',
    itemList: [],
  };
  const categoryCustomItems: CategoryItemType = {
    categoryId: 'custom',
    categoryName: i18n.t('analytics:labels.customEvent'),
    categoryType: 'event',
    itemList: [],
  };
  apiDataItems.forEach((item) => {
    if (item.metadataSource === MetadataSource.PRESET) {
      categoryPresetItems.itemList.push({
        label: item.displayName,
        name: item.name,
        value: item.id,
        description: item.description,
        metadataSource: item.metadataSource,
        platform: item.platform,
        modifyTime: moment(item.updateAt).format(TIME_FORMAT) || '-',
      });
    } else if (item.metadataSource === MetadataSource.CUSTOM) {
      categoryCustomItems.itemList.push({
        label: item.displayName,
        name: item.name,
        value: item.id,
        description: item.description,
        metadataSource: item.metadataSource,
        platform: item.platform,
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
    categoryId: 'node',
    categoryName: i18n.t('analytics:labels.pathNode'),
    categoryType: 'node',
    itemList: [],
  };
  pathNodes.forEach((item) => {
    categoryNodeItems.itemList.push({
      label: item.displayValue,
      name: item.value,
      value: item.value,
    });
  });
  categoryItems.push(categoryNodeItems);
  return categoryItems;
};

const buildEventItem = (item: IMetadataEventParameter) => {
  return {
    label: item.displayName,
    name: item.name,
    value: item.id,
    description: item.description,
    metadataSource: item.metadataSource,
    valueType: item.valueType,
    category: item.category,
    platform: item.platform,
    values: item.values,
    modifyTime: item.updateAt ? moment(item.updateAt).format(TIME_FORMAT) : '-',
  };
};

export const parametersConvertToCategoryItemType = (
  userAttributeItems: IMetadataUserAttribute[],
  parameterItems: IMetadataEventParameter[]
) => {
  //If parameters name are same
  patchSameName(userAttributeItems, parameterItems);
  const categoryItems: CategoryItemType[] = getCategories(parameterItems);
  for (const parameter of parameterItems) {
    const categoryItem = categoryItems.find(
      (item) => item.categoryId === parameter.category
    );
    if (categoryItem) {
      categoryItem.itemList.push(buildEventItem(parameter));
    }
  }
  const categoryUserItems: CategoryItemType = {
    categoryId: 'user',
    categoryName: i18n.t('analytics:category.user'),
    categoryType: 'attribute',
    itemList: [],
  };
  userAttributeItems.forEach((item) => {
    categoryUserItems.itemList.push({
      label: userAttributeDisplayname(item.displayName),
      name: item.name,
      value: item.id,
      description: item.description,
      metadataSource: item.metadataSource,
      valueType: item.valueType,
      category: item.category,
      values: item.values,
      modifyTime: moment(item.updateAt).format(TIME_FORMAT) || '-',
    });
  });
  categoryItems.push(categoryUserItems);
  const otherIndex = categoryItems.findIndex(
    (item) => item.categoryId === ConditionCategory.OTHER
  );
  if (otherIndex !== -1) {
    categoryItems.push(categoryItems.splice(otherIndex, 1)[0]);
  }
  return categoryItems;
};

const getCategories = (parameterItems: IMetadataEventParameter[]) => {
  const categories: CategoryItemType[] = [];
  for (const item of parameterItems) {
    const category = item.category;
    if (categories.find((c) => c.categoryId === category)) {
      continue;
    }
    const categoryItem: CategoryItemType = {
      categoryId: category,
      categoryName: i18n.t(`analytics:category.${category}`) ?? category,
      categoryType: 'attribute',
      itemList: [],
    };
    categories.push(categoryItem);
  }

  return categories.sort((a, b) => a.categoryId.localeCompare(b.categoryId));
};

const _metadataValueType = (
  valueType: MetadataValueType,
  checkType: string
) => {
  if (
    checkType === 'all' ||
    (checkType === 'string' && valueType === MetadataValueType.STRING) ||
    (checkType === 'number' && valueType !== MetadataValueType.STRING)
  ) {
    return true;
  }
  return false;
};

const _getSubList = (
  userAttributeItems: IMetadataUserAttribute[],
  parameterItems: IMetadataEventParameter[],
  groupName: string,
  type: string
) => {
  const targetParameters = parameterItems.filter((item) =>
    _metadataValueType(item.valueType, type)
  );
  const targetAttributes = userAttributeItems.filter((item) =>
    _metadataValueType(item.valueType, type)
  );
  const targetParametersAndAttributes = [
    ...targetParameters,
    ...targetAttributes,
  ];
  const subList: IAnalyticsItem[] = [];
  for (const parameter of targetParametersAndAttributes) {
    subList.push({
      value: parameter.name,
      label: parameter.displayName,
      name: parameter.name,
      valueType: parameter.valueType,
      category: parameter.category,
      groupName: groupName,
      itemType: 'children',
    } as IAnalyticsItem);
  }
  return subList;
};

export const getEventMethodOptions = (
  userAttributeItems: IMetadataUserAttribute[],
  parameterItems: IMetadataEventParameter[]
) => {
  const computeMethodOptions: IAnalyticsItem[] = [
    {
      value: ExploreComputeMethod.USER_ID_CNT,
      label: i18n.t('analytics:options.userNumber') ?? 'User number',
    },
    {
      value: ExploreComputeMethod.EVENT_CNT,
      label: i18n.t('analytics:options.eventNumber') ?? 'Event number',
    },
    {
      label: defaultStr(i18n.t('analytics:countGroup')),
      value: ExploreComputeMethod.COUNT_PROPERTY,
      subList: _getSubList(
        userAttributeItems,
        parameterItems,
        ExploreComputeMethod.COUNT_PROPERTY,
        'all'
      ),
    },
    {
      label: defaultStr(i18n.t('analytics:minGroup')),
      value: ExploreAggregationMethod.MIN,
      subList: _getSubList(
        userAttributeItems,
        parameterItems,
        ExploreAggregationMethod.MIN,
        'number'
      ),
    },
    {
      label: defaultStr(i18n.t('analytics:maxGroup')),
      value: ExploreAggregationMethod.MAX,
      subList: _getSubList(
        userAttributeItems,
        parameterItems,
        ExploreAggregationMethod.MAX,
        'number'
      ),
    },
    {
      label: defaultStr(i18n.t('analytics:sumGroup')),
      value: ExploreAggregationMethod.SUM,
      subList: _getSubList(
        userAttributeItems,
        parameterItems,
        ExploreAggregationMethod.SUM,
        'number'
      ),
    },
    {
      label: defaultStr(i18n.t('analytics:avgGroup')),
      value: ExploreAggregationMethod.AVG,
      subList: _getSubList(
        userAttributeItems,
        parameterItems,
        ExploreAggregationMethod.AVG,
        'number'
      ),
    },
    {
      label: defaultStr(i18n.t('analytics:medianGroup')),
      value: ExploreAggregationMethod.MEDIAN,
      subList: _getSubList(
        userAttributeItems,
        parameterItems,
        ExploreAggregationMethod.MEDIAN,
        'number'
      ),
    },
  ];
  return computeMethodOptions;
};

export const getAttributionMethodOptions = (
  userAttributeItems: IMetadataUserAttribute[],
  parameterItems: IMetadataEventParameter[]
) => {
  const computeMethodOptions: IAnalyticsItem[] = [
    {
      value: ExploreComputeMethod.EVENT_CNT,
      label: i18n.t('analytics:options.eventNumber') ?? 'Event number',
    },
    {
      label: defaultStr(i18n.t('analytics:sumGroup')),
      value: ExploreComputeMethod.SUM_VALUE,
      subList: [],
    },
  ];
  const numberParameters = parameterItems.filter(
    (item) => item.valueType !== MetadataValueType.STRING
  );
  const numberAttributes = userAttributeItems.filter(
    (item) => item.valueType !== MetadataValueType.STRING
  );
  const numberParametersAndAttributes = [
    ...numberParameters,
    ...numberAttributes,
  ];
  for (const parameter of numberParametersAndAttributes) {
    computeMethodOptions[1].subList?.push({
      value: parameter.name,
      label: parameter.displayName,
      name: parameter.name,
      valueType: parameter.valueType,
      category: parameter.category,
      groupName: ExploreComputeMethod.SUM_VALUE,
      itemType: 'children',
    } as IAnalyticsItem);
  }
  return computeMethodOptions;
};

function patchSameName(
  userAttributeItems: IMetadataUserAttribute[],
  parameterItems: IMetadataEventParameter[]
) {
  const parameterNames: string[] = [];
  const duplicatedParameterNames: string[] = [];
  for (const p of parameterItems) {
    if (parameterNames.includes(p.name)) {
      duplicatedParameterNames.push(p.name);
    }
    parameterNames.push(p.name);
  }
  for (const p of parameterItems) {
    if (duplicatedParameterNames.includes(p.name)) {
      p.displayName = `${p.displayName}(${p.valueType})`;
    }
  }
  const userAttributeNames: string[] = [];
  const duplicatedUserAttributeNames: string[] = [];
  for (const u of userAttributeItems) {
    if (userAttributeNames.includes(u.name)) {
      duplicatedUserAttributeNames.push(u.name);
    }
    userAttributeNames.push(u.name);
  }
  for (const u of userAttributeItems) {
    if (duplicatedUserAttributeNames.includes(u.name)) {
      u.displayName = `${u.displayName}(${u.valueType})`;
    }
  }
}

export const validateFilterConditions = (conditions: IConditionItemType[]) => {
  const hasValidConditionOption = conditions.every(
    (item) =>
      item.conditionOption && Object.keys(item.conditionOption).length > 0
  );
  const hasValidConditionOperator = conditions.every(
    (item) => item.conditionOperator !== null
  );
  const hasValidConditionValue = conditions.every((item) => {
    if (
      item.conditionOperator?.value &&
      [
        ExploreAnalyticsOperators.NULL,
        ExploreAnalyticsOperators.NOT_NULL,
      ].includes(item.conditionOperator.value as ExploreAnalyticsOperators)
    ) {
      return true;
    }
    return Array.isArray(item.conditionValue) && item.conditionValue.length > 0;
  });
  return {
    hasValidConditionOption,
    hasValidConditionOperator,
    hasValidConditionValue,
  };
};

export const validEventAnalyticsItem = (item: IEventAnalyticsItem) => {
  return (
    item.selectedEventOption && item.selectedEventOption.value?.trim() !== ''
  );
};

export const validMultipleEventAnalyticsItems = (
  items: IEventAnalyticsItem[]
) => {
  return items.every((item) => {
    return (
      item.selectedEventOption && item.selectedEventOption.value?.trim() !== ''
    );
  });
};

export const validRetentionAnalyticsItem = (item: IRetentionAnalyticsItem) => {
  return (
    item.startEventOption &&
    item.startEventOption?.value?.trim() !== '' &&
    item.revisitEventOption &&
    item.revisitEventOption?.value?.trim() !== ''
  );
};

export const validRetentionJoinColumnDatatype = (
  items: IRetentionAnalyticsItem[]
) => {
  return items.every((item) => {
    return (
      item.startEventRelationAttribute?.valueType ===
      item.revisitEventRelationAttribute?.valueType
    );
  });
};

export const validMultipleRetentionAnalyticsItem = (
  items: IRetentionAnalyticsItem[]
) => {
  return items.every((item) => {
    return (
      item.startEventOption &&
      item.startEventOption?.value?.trim() !== '' &&
      item.revisitEventOption &&
      item.revisitEventOption?.value?.trim() !== ''
    );
  });
};

export const validConditionItemType = (condition: IConditionItemType) => {
  const isValidConditionOption =
    condition.conditionOption && condition.conditionOption.name?.trim() !== '';
  const shouldCheckConditionValue =
    condition.conditionOperator?.value &&
    ![
      ExploreAnalyticsOperators.NULL,
      ExploreAnalyticsOperators.NOT_NULL,
    ].includes(condition.conditionOperator.value as ExploreAnalyticsOperators);
  return (
    isValidConditionOption &&
    (!shouldCheckConditionValue ||
      (Array.isArray(condition.conditionValue) &&
        condition.conditionValue.length > 0))
  );
};

export const getTouchPointsAndConditions = (
  eventOptionData: IEventAnalyticsItem[]
) => {
  const touchPoints: AttributionTouchPoint[] = [];
  eventOptionData.forEach((item) => {
    if (validEventAnalyticsItem(item)) {
      const conditions: ICondition[] = [];
      item.conditionList.forEach((condition) => {
        if (validConditionItemType(condition)) {
          const conditionObj: ICondition = {
            category: defaultStr(
              condition.conditionOption?.category,
              ConditionCategory.OTHER
            ),
            property: defaultStr(condition.conditionOption?.name),
            operator: defaultStr(condition.conditionOperator?.value),
            value: condition.conditionValue,
            dataType: defaultStr(
              condition.conditionOption?.valueType,
              MetadataValueType.STRING
            ),
          };
          conditions.push(conditionObj);
        }
      });

      const touchPoint: AttributionTouchPoint = {
        eventName: defaultStr(item.selectedEventOption?.name),
        sqlCondition: {
          conditions: conditions,
          conditionOperator: item.conditionRelationShip,
        },
      };
      touchPoints.push(touchPoint);
    }
  });
  return touchPoints;
};

export const getGoalAndConditions = (
  eventOptionData: IEventAnalyticsItem[]
) => {
  if (eventOptionData.length === 0) {
    return;
  }
  const goalData = eventOptionData[0];
  const conditions: ICondition[] = [];
  goalData.conditionList.forEach((condition) => {
    if (validConditionItemType(condition)) {
      const conditionObj: ICondition = {
        category: defaultStr(
          condition.conditionOption?.category,
          ConditionCategory.OTHER
        ),
        property: defaultStr(condition.conditionOption?.name),
        operator: defaultStr(condition.conditionOperator?.value),
        value: condition.conditionValue,
        dataType: defaultStr(
          condition.conditionOption?.valueType,
          MetadataValueType.STRING
        ),
      };
      conditions.push(conditionObj);
    }
  });
  let groupColumn: IColumnAttribute | undefined;
  if (goalData.calculateMethodOption?.name) {
    groupColumn = {
      category: defaultStr(
        goalData.calculateMethodOption?.category,
        ConditionCategory.OTHER
      ),
      property: defaultStr(goalData.calculateMethodOption?.name),
      dataType: defaultStr(
        goalData.calculateMethodOption?.valueType,
        MetadataValueType.STRING
      ),
    };
  }
  return {
    eventName: defaultStr(goalData.selectedEventOption?.name),
    sqlCondition: {
      conditions: conditions,
      conditionOperator: goalData.conditionRelationShip,
    },
    groupColumn,
  } as AttributionTouchPoint;
};

export const getTargetComputeMethod = (
  eventOptionData: IEventAnalyticsItem[]
) => {
  if (eventOptionData.length === 0) {
    return;
  }
  const goalData = eventOptionData[0];
  if (
    goalData.calculateMethodOption?.value === ExploreComputeMethod.EVENT_CNT
  ) {
    return ExploreComputeMethod.EVENT_CNT;
  }
  return ExploreComputeMethod.SUM_VALUE;
};

const _getComputeMethod = (groupName: string, value: string) => {
  if (
    groupName === ExploreAggregationMethod.MIN ||
    groupName === ExploreAggregationMethod.MAX ||
    groupName === ExploreAggregationMethod.SUM ||
    groupName === ExploreAggregationMethod.AVG ||
    groupName === ExploreAggregationMethod.MEDIAN
  ) {
    return ExploreComputeMethod.AGGREGATION_PROPERTY;
  } else if (groupName === ExploreComputeMethod.COUNT_PROPERTY) {
    return ExploreComputeMethod.COUNT_PROPERTY;
  }
  return value;
};

const _gatEventExtParameter = (
  computeMethod: string,
  computeMethodOption: IAnalyticsItem | null | undefined
) => {
  if (
    computeMethod === ExploreComputeMethod.AGGREGATION_PROPERTY ||
    computeMethod === ExploreComputeMethod.COUNT_PROPERTY
  ) {
    return {
      targetProperty: {
        category: defaultStr(
          computeMethodOption?.category,
          ConditionCategory.OTHER
        ),
        property: defaultStr(computeMethodOption?.value),
        dataType: defaultStr(
          computeMethodOption?.valueType,
          MetadataValueType.STRING
        ),
      },
      aggregationMethod: computeMethodOption?.groupName,
    };
  }
  return undefined;
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
            category: defaultStr(
              condition.conditionOption?.category,
              ConditionCategory.OTHER
            ),
            property: defaultStr(condition.conditionOption?.name),
            operator: defaultStr(condition.conditionOperator?.value),
            value: condition.conditionValue,
            dataType: defaultStr(
              condition.conditionOption?.valueType,
              MetadataValueType.STRING
            ),
          };
          conditions.push(conditionObj);
        }
      });

      const computeMethod = _getComputeMethod(
        item.calculateMethodOption?.groupName ?? '',
        item.calculateMethodOption?.value ?? ''
      );
      const eventExtParameter = _gatEventExtParameter(
        computeMethod,
        item.calculateMethodOption
      );
      const eventAndCondition: IEventAndCondition = {
        eventName: defaultStr(item.selectedEventOption?.name),
        sqlCondition: {
          conditions: conditions,
          conditionOperator: item.conditionRelationShip,
        },
        computeMethod: computeMethod,
        eventExtParameter: eventExtParameter,
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
            category: defaultStr(
              condition.conditionOption?.category,
              ConditionCategory.OTHER
            ),
            property: defaultStr(condition.conditionOption?.name),
            operator: defaultStr(condition.conditionOperator?.value),
            value: condition.conditionValue,
            dataType: defaultStr(
              condition.conditionOption?.valueType,
              MetadataValueType.STRING
            ),
          };
          startConditions.push(conditionObj);
        }
      });
      item.revisitConditionList.forEach((condition) => {
        if (validConditionItemType(condition)) {
          const conditionObj: ICondition = {
            category: defaultStr(
              condition.conditionOption?.category,
              ConditionCategory.OTHER
            ),
            property: defaultStr(condition.conditionOption?.name, ''),
            operator: defaultStr(condition.conditionOperator?.value, ''),
            value: condition.conditionValue,
            dataType: defaultStr(
              condition.conditionOption?.valueType,
              MetadataValueType.STRING
            ),
          };
          revisitConditions.push(conditionObj);
        }
      });

      let pairEventAndCondition: IPairEventAndCondition = {
        startEvent: {
          eventName: defaultStr(item.startEventOption?.name, ''),
          sqlCondition: {
            conditions: startConditions,
            conditionOperator: item.startConditionRelationShip,
          },
        },
        backEvent: {
          eventName: defaultStr(item.revisitEventOption?.name, ''),
          sqlCondition: {
            conditions: revisitConditions,
            conditionOperator: item.revisitConditionRelationShip,
          },
        },
      };
      if (item.startEventRelationAttribute) {
        pairEventAndCondition = {
          ...pairEventAndCondition,
          startEvent: {
            ...pairEventAndCondition.startEvent,
            retentionJoinColumn: {
              category: defaultStr(
                item.startEventRelationAttribute?.category,
                ConditionCategory.OTHER
              ),
              property: defaultStr(item.startEventRelationAttribute?.name, ''),
              dataType: defaultStr(
                item.startEventRelationAttribute?.valueType,
                MetadataValueType.STRING
              ),
            },
          },
        };
      }
      if (item.revisitEventRelationAttribute) {
        pairEventAndCondition = {
          ...pairEventAndCondition,
          backEvent: {
            ...pairEventAndCondition.backEvent,
            retentionJoinColumn: {
              category: defaultStr(
                item.revisitEventRelationAttribute?.category,
                ConditionCategory.OTHER
              ),
              property: defaultStr(
                item.revisitEventRelationAttribute?.name,
                ''
              ),
              dataType: defaultStr(
                item.revisitEventRelationAttribute?.valueType,
                MetadataValueType.STRING
              ),
            },
          },
        };
      }
      pairEventAndConditions.push(pairEventAndCondition);
    }
  });
  return pairEventAndConditions;
};

export const getGroupCondition = (
  option: IAnalyticsItem | null,
  groupApplyToFirst: boolean | null
) => {
  let groupingCondition: GroupingCondition = {
    category: defaultStr(option?.category, ConditionCategory.OTHER),
    property: defaultStr(option?.name, ''),
    dataType: defaultStr(option?.valueType, MetadataValueType.STRING),
  };
  if (groupApplyToFirst !== null) {
    groupingCondition = {
      ...groupingCondition,
      applyTo: groupApplyToFirst ? 'FIRST' : 'ALL',
    };
  }
  if (groupingCondition.property === '') {
    return undefined;
  }
  return groupingCondition;
};

export const getGlobalEventCondition = (
  segmentationOptionData: SegmentationFilterDataType
) => {
  const conditions: ICondition[] = [];
  segmentationOptionData.data.forEach((condition) => {
    if (validConditionItemType(condition)) {
      const conditionObj: ICondition = {
        category: defaultStr(
          condition.conditionOption?.category,
          ConditionCategory.OTHER
        ),
        property: defaultStr(condition.conditionOption?.name, ''),
        operator: defaultStr(condition.conditionOperator?.value, ''),
        value: condition.conditionValue,
        dataType: defaultStr(
          condition.conditionOption?.valueType,
          MetadataValueType.STRING
        ),
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
      case 'month':
        return Number(windowValue) * 60 * 60 * 24 * 30;
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
  const reportingOutputs = getValueFromStackOutputs(pipeline, 'Reporting', [
    OUTPUT_REPORTING_QUICKSIGHT_DATA_SOURCE_ARN,
  ]);
  if (!reportingOutputs.get(OUTPUT_REPORTING_QUICKSIGHT_DATA_SOURCE_ARN)) {
    return undefined;
  }
  return {
    region: pipeline.region,
    allowedDomain: allowedDomain,
    quickSight: {
      dataSourceArn: defaultStr(
        reportingOutputs.get(OUTPUT_REPORTING_QUICKSIGHT_DATA_SOURCE_ARN)
      ),
    },
  };
};

export const getLngFromLocalStorage = () => {
  return localStorage.getItem('i18nextLng') ?? DEFAULT_EN_LANG;
};

export const userAttributeDisplayname = (displayName: string) => {
  return displayName.replace(
    ConditionCategory.USER_OUTER,
    ConditionCategory.USER
  );
};
