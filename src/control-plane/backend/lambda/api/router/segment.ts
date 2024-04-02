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
  ExploreAnalyticsNumericOperators,
  ExploreAnalyticsOperators,
  MetadataSource,
  MetadataValueType,
  SCHEDULE_EXPRESSION_PATTERN,
  SegmentFilterConditionType,
  SegmentFilterEventMetricType,
  SegmentFilterGroup,
} from '@aws/clickstream-base-lib';
import { NextFunction, Request, Response, Router } from 'express';
import { body, param, query, ValidationChain, validationResult } from 'express-validator';
import { isValidEmpty, isXSSRequest, validate } from '../common/request-valid';
import { SegmentServ } from '../service/segment';

export const router_segment: Router = Router();
const segmentServ = new SegmentServ();

// Create new segment
router_segment.post(
  '',
  validate([
    body().custom(isValidEmpty).custom(isXSSRequest),
    ...commonValidationsForSegment(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    return segmentServ.create(req, res, next);
  },
);

// List segments of an app
router_segment.get(
  '',
  validate([
    query('appId').isString().notEmpty(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    return segmentServ.list(req, res, next);
  },
);

// Get segment by appId and segmentId
router_segment.get(
  '/:segmentId',
  validate([
    param('segmentId').isString().notEmpty(),
    query('appId').isString().notEmpty(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    return segmentServ.get(req, res, next);
  },
);

// Update segment
router_segment.patch(
  '/:segmentId',
  validate([
    body().custom(isValidEmpty).custom(isXSSRequest),
    body('id').notEmpty(),
    body('type').notEmpty(),
    body('segmentId').notEmpty(),
    ...commonValidationsForSegment(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    return segmentServ.update(req, res, next);
  },
);

// Delete segment
router_segment.delete(
  '/:segmentId',
  validate([
    param('segmentId').isString().notEmpty(),
    query('appId').isString().notEmpty(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    return segmentServ.delete(req, res, next);
  },
);

// List segment jobs
router_segment.get(
  '/:segmentId/jobs',
  validate([
    param('segmentId').isString().notEmpty(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    return segmentServ.listJobs(req, res, next);
  },
);

// Get segment sample data
router_segment.get(
  '/:segmentId/sampleData',
  validate([
    param('segmentId').isString().notEmpty(),
    query('jobRunId').optional().isString(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    return segmentServ.getSampleData(req, res, next);
  },
);

// Refresh segment
router_segment.get(
  '/:segmentId/refresh',
  validate([
    param('segmentId').isString().notEmpty(),
    query('appId').isString().notEmpty(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    return segmentServ.refreshSegment(req, res, next);
  },
);

// Get presigned url for segment export
router_segment.get(
  '/:segmentId/jobs/:jobRunId/exportS3Url',
  validate([
    param('segmentId').isString().notEmpty(),
    param('jobRunId').isString().notEmpty(),
    query('projectId').isString().notEmpty(),
    query('appId').isString().notEmpty(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    return segmentServ.getExportS3Url(req, res, next);
  },
);

/**
 * Validate refreshSchedule.cronExpression
 * @param value
 */
function validateRefreshScheduleCronExpression(value: any) {
  if (typeof value !== 'string') {
    return Promise.reject('cronExpression should be string type.');
  }

  const regex = new RegExp(SCHEDULE_EXPRESSION_PATTERN);
  const match = value.match(regex);
  if (!match || value !== match[0]) {
    return Promise.reject(`Validation error: cronExpression ${value} does not match ${SCHEDULE_EXPRESSION_PATTERN}.`);
  }
  return true;
}

/**
 * Validate metricCondition.inputValue, which is a number array with two elements
 * @param value
 */
function validateMetricConditionInputValue(value: any) {
  return Array.isArray(value) && value.every(item => typeof item === 'number') && value.length === 2;
}

/**
 * Validate parameterCondition.inputValue type, which is a string array
 * @param value
 */
function validateParameterConditionInputValue(value: any) {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function commonValidationsForSegment() {
  return [
    body('segmentType').isIn(['User', 'Session', 'Event']),
    body('name').notEmpty().trim(),
    body('description').isString().trim(),
    body('projectId').notEmpty(),
    body('appId').notEmpty(),
    body('refreshSchedule.cron').isIn(['Manual', 'Daily', 'Weekly', 'Monthly', 'Custom']),
    body('refreshSchedule.cronExpression').optional().custom(validateRefreshScheduleCronExpression),
    body('refreshSchedule.expireAfter').optional().isNumeric(),
    body('criteria.operator').isIn(['and', 'or']),
    body('criteria.filterGroups').isArray({ min: 1 }),
    body('criteria.filterGroups.*.description').optional().isString(),
    body('criteria.filterGroups.*.isRelativeDateRange').isBoolean(),
    body('criteria.filterGroups.*.startDate').optional().isISO8601(),
    body('criteria.filterGroups.*.endDate').optional().isISO8601(),
    body('criteria.filterGroups.*.lastN').optional().isNumeric(),
    body('criteria.filterGroups.*.timeUnit').optional().isString(),
    body('criteria.filterGroups.*.filters').isArray({ min: 1 }),
    body('criteria.filterGroups.*.operator').isIn(['and', 'or']),
    body('criteria.filterGroups.*.filters.*.operator').isIn(['and', 'or']),
    body('criteria.filterGroups.*.filters.*.conditions').isArray({ min: 1 }),
    body('criteria.filterGroups.*.filters.*.conditions.*.conditionType').isIn(Object.values(SegmentFilterConditionType)),
    // Apply validation rules to filter conditions based on conditionType
    body('criteria').custom(async (criteria, { req }) => {
      const filterGroups: SegmentFilterGroup[] = criteria.filterGroups;
      filterGroups.forEach((filterGroup, filterGroupIndex) => {
        const filters = filterGroup.filters;
        filters.forEach((filter, filterIndex) => {
          const conditions = filter.conditions;
          conditions.forEach(async (condition, conditionIndex) => {
            const path = `criteria.filterGroups[${filterGroupIndex}].filters[${filterIndex}].conditions[${conditionIndex}].`;
            let validations: ValidationChain[] = [];
            switch (condition.conditionType) {
              case SegmentFilterConditionType.UserEventCondition:
                validations = [
                  body(path + 'hasDone').isBoolean(),
                  body(path + 'event.eventName').notEmpty(),
                  body(path + 'event.operator').optional().isIn(['and', 'or']),
                  body(path + 'event.eventParameterConditions.*.parameterType').isIn(Object.values(MetadataSource)),
                  body(path + 'event.eventParameterConditions.*.parameterName').notEmpty(),
                  body(path + 'event.eventParameterConditions.*.dataType').isIn(Object.values(MetadataValueType)),
                  body(path + 'event.eventParameterConditions.*.conditionOperator').isIn(Object.values(ExploreAnalyticsOperators)),
                  body(path + 'event.eventParameterConditions.*.inputValue').custom(validateParameterConditionInputValue),
                  body(path + 'metricCondition.metricType').isIn(Object.values(SegmentFilterEventMetricType)),
                  body(path + 'metricCondition.conditionOperator').isIn(Object.values(ExploreAnalyticsNumericOperators)),
                  body(path + 'metricCondition.inputValue').custom(validateMetricConditionInputValue),
                  body(path + 'metricCondition.parameterType').optional().isIn(Object.values(MetadataSource)),
                  body(path + 'metricCondition.parameterName').optional().isString(),
                  body(path + 'metricCondition.dataType').optional().isIn(Object.values(MetadataValueType)),
                ];
                break;
              case SegmentFilterConditionType.EventsInSequenceCondition:
                validations = [
                  body(path + 'hasDone').isBoolean(),
                  body(path + 'events').isArray({ min: 1 }),
                  body(path + 'events.*.eventName').notEmpty(),
                  body(path + 'events.*.operator').optional().isIn(['and', 'or']),
                  body(path + 'events.*.eventParameterConditions').optional().isArray(),
                  body(path + 'events.*.eventParameterConditions.*.parameterType').isIn(Object.values(MetadataSource)),
                  body(path + 'events.*.eventParameterConditions.*.parameterName').notEmpty(),
                  body(path + 'events.*.eventParameterConditions.*.dataType').isIn(Object.values(MetadataValueType)),
                  body(path + 'events.*.eventParameterConditions.*.conditionOperator').isIn(Object.values(ExploreAnalyticsOperators)),
                  body(path + 'events.*.eventParameterConditions.*.inputValue').custom(validateParameterConditionInputValue),
                  body(path + 'isInOneSession').isBoolean(),
                  body(path + 'isDirectlyFollow').isBoolean(),
                ];
                break;
              case SegmentFilterConditionType.UserAttributeCondition:
                validations = [
                  body(path + 'hasAttribute').isBoolean(),
                  body(path + 'attributeCondition').isObject(),
                  body(path + 'attributeCondition.parameterType').isIn(Object.values(MetadataSource)),
                  body(path + 'attributeCondition.parameterName').notEmpty(),
                  body(path + 'attributeCondition.dataType').isIn(Object.values(MetadataValueType)),
                  body(path + 'attributeCondition.conditionOperator').isIn(Object.values(ExploreAnalyticsOperators)),
                  body(path + 'attributeCondition.inputValue').custom(validateParameterConditionInputValue),
                ];
                break;
              case SegmentFilterConditionType.UserInSegmentCondition:
                validations = [
                  body(path + 'segmentId').notEmpty(),
                  body(path + 'isInSegment').isBoolean(),
                ];
                break;
              default:
                return Promise.reject('Invalid segment filter condition type');
            }

            await Promise.all(validations.map(validation => validation.run(req)));
          });
        });
      });

      const errors = validationResult(req);
      return errors.isEmpty() ? true : Promise.reject(errors.array());
    }),
  ];
}
