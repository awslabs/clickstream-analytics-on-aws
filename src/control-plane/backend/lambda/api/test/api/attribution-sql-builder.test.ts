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

import { AttributionModelType, ConditionCategory, ExploreComputeMethod, ExploreGroupColumn, ExploreTimeScopeType, MetadataValueType } from '../../common/explore-types';
// import { logger } from '../../common/powertools';
import { _buildCommonPartSql } from '../../service/quicksight/sql-builder';
import { buildSQLForSinglePointModel } from '../../service/quicksight/sql-builder-attribution';

describe('Attribution SQL Builder test', () => {

  beforeEach(() => {
  });

  test('last touch model - event count', () => {
    const sql = buildSQLForSinglePointModel({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.EVENT_CNT,
      globalEventCondition: {
        conditions: [
          {
            category: ConditionCategory.OTHER,
            property: 'platform',
            operator: '=',
            value: ['Android'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.GEO,
            property: 'country',
            operator: '=',
            value: ['China'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.USER,
            property: '_user_first_touch_timestamp',
            operator: '>',
            value: [1686532526770],
            dataType: MetadataValueType.INTEGER,
          },
          {
            category: ConditionCategory.USER_OUTER,
            property: '_channel',
            operator: '<>',
            value: ['google'],
            dataType: MetadataValueType.STRING,
          },
        ],
      },
      targetEventAndCondition:
        {
          eventName: 'purchase',
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '<>',
                value: ['google'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
        },
      eventAndConditions: [
        {
          eventName: 'view_item',
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: 'user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '=',
                value: ['apple'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
        },
        {
          eventName: 'add_to_cart',
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '=',
                value: ['apple'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
        },
      ],
      modelType: AttributionModelType.LAST_TOUCH,
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    console.log(sql);

    expect(sql.trim().replace(/ /g, '')).toEqual(`
   
    `.trim().replace(/ /g, ''));

  });

  test('last touch model - user count', () => {
    const sql = buildSQLForSinglePointModel({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.USER_CNT,
      globalEventCondition: {
        conditions: [
          {
            category: ConditionCategory.OTHER,
            property: 'platform',
            operator: '=',
            value: ['Android'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.GEO,
            property: 'country',
            operator: '=',
            value: ['China'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.USER,
            property: '_user_first_touch_timestamp',
            operator: '>',
            value: [1686532526770],
            dataType: MetadataValueType.INTEGER,
          },
          {
            category: ConditionCategory.USER_OUTER,
            property: '_channel',
            operator: '<>',
            value: ['google'],
            dataType: MetadataValueType.STRING,
          },
        ],
      },
      targetEventAndCondition:
        {
          eventName: 'purchase',
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '<>',
                value: ['google'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
        },
      eventAndConditions: [
        {
          eventName: 'view_item',
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: 'user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '=',
                value: ['apple'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
        },
        {
          eventName: 'add_to_cart',
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '=',
                value: ['apple'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
        },
      ],
      modelType: AttributionModelType.LAST_TOUCH,
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    console.log(sql);

    expect(sql.trim().replace(/ /g, '')).toEqual(`
   
    `.trim().replace(/ /g, ''));

  });

  test('last touch model - sum value', () => {
    const sql = buildSQLForSinglePointModel({
      schemaName: 'shop',
      computeMethod: ExploreComputeMethod.SUM_VALUE,
      globalEventCondition: {
        conditions: [
          {
            category: ConditionCategory.OTHER,
            property: 'platform',
            operator: '=',
            value: ['Android'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.GEO,
            property: 'country',
            operator: '=',
            value: ['China'],
            dataType: MetadataValueType.STRING,
          },
          {
            category: ConditionCategory.USER,
            property: '_user_first_touch_timestamp',
            operator: '>',
            value: [1686532526770],
            dataType: MetadataValueType.INTEGER,
          },
          {
            category: ConditionCategory.USER_OUTER,
            property: '_channel',
            operator: '<>',
            value: ['google'],
            dataType: MetadataValueType.STRING,
          },
        ],
      },
      targetEventAndCondition:
        {
          eventName: 'purchase',
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '<>',
                value: ['google'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
          groupColumn: {
            category: ConditionCategory.EVENT,
            property: '_session_duration',
            dataType: MetadataValueType.FLOAT,
          },
        },
      eventAndConditions: [
        {
          eventName: 'view_item',
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: 'user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '=',
                value: ['apple'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
        },
        {
          eventName: 'add_to_cart',
          sqlCondition: {
            conditionOperator: 'and',
            conditions: [
              {
                category: ConditionCategory.OTHER,
                property: 'platform',
                operator: '=',
                value: ['Android'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.GEO,
                property: 'country',
                operator: '=',
                value: ['China'],
                dataType: MetadataValueType.STRING,
              },
              {
                category: ConditionCategory.USER,
                property: '_user_first_touch_timestamp',
                operator: '>',
                value: [1686532526770],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.EVENT,
                property: '_session_duration',
                operator: '>',
                value: [200],
                dataType: MetadataValueType.INTEGER,
              },
              {
                category: ConditionCategory.USER_OUTER,
                property: '_channel',
                operator: '=',
                value: ['apple'],
                dataType: MetadataValueType.STRING,
              },
            ],
          },
        },
      ],
      modelType: AttributionModelType.LAST_TOUCH,
      timeScopeType: ExploreTimeScopeType.FIXED,
      timeStart: new Date('2023-10-01'),
      timeEnd: new Date('2025-10-10'),
      groupColumn: ExploreGroupColumn.DAY,
    });

    console.log(sql);

    expect(sql.trim().replace(/ /g, '')).toEqual(`
   
    `.trim().replace(/ /g, ''));

  });


});