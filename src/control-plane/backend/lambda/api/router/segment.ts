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
  ConditionNumericOperator,
  ConditionOperator,
  ParameterDataType,
  ParameterType, SCHEDULE_EXPRESSION_PATTERN,
  SegmentFilterConditionType,
  SegmentFilterEventMetricType,
} from '@aws/clickstream-base-lib';
import { NextFunction, Request, Response, Router } from 'express';
import { body, param, query } from 'express-validator';
import { isValidEmpty, isXSSRequest, validate } from '../common/request-valid';
import { SegmentServ } from '../service/segment';

export const router_segment: Router = Router();
const segmentServ = new SegmentServ();

// Create new segment
router_segment.post(
  '',
  validate([
    body().custom(isValidEmpty).custom(isXSSRequest),
    body('segmentType').isIn(['User', 'Session', 'Event']),
    body('name').notEmpty().trim(),
    body('description').isString().trim(),
    body('projectId').notEmpty(),
    body('appId').notEmpty(),
    body('refreshSchedule.cron').isIn(['Manual', 'Daily', 'Weekly', 'Monthly', 'Custom']),
    body('refreshSchedule.cronExpression').optional().custom(validateRefreshScheduleCronExpression),
    body('refreshSchedule.expireAfter').isNumeric(),
    body('criteria.operator').isIn(['and', 'or']),
    body('criteria.filterGroups').isArray({ min: 1 }),
    body('criteria.filterGroups.*.description').optional().isString(),
    body('criteria.filterGroups.*.startDate').optional().isISO8601(),
    body('criteria.filterGroups.*.endDate').optional().isISO8601(),
    body('criteria.filterGroups.*.relativeDateRange').optional().isString(),
    body('criteria.filterGroups.*.filters').isArray({ min: 1 }),
    body('criteria.filterGroups.*.operator').isIn(['and', 'or']),
    body('criteria.filterGroups.*.filters.*.operator').isIn(['and', 'or']),
    body('criteria.filterGroups.*.filters.*.conditions').isArray({ min: 1 }),
    body('criteria.filterGroups.*.filters.*.conditions.*.conditionType').isIn(Object.values(SegmentFilterConditionType)),
    // Dynamically apply validation rules based on conditionType
    body('criteria.filterGroups.*.filters.*.conditions.*').custom(value => {
      switch (value.conditionType) {
        case SegmentFilterConditionType.UserEventCondition:
          return [
            body('hasDone').isBoolean(),
            body('event.eventName').isString(),
            body('event.operator').optional().isIn(['and', 'or']),
            body('event.eventParameterConditions.*.parameterType').isIn(Object.values(ParameterType)),
            body('event.eventParameterConditions.*.parameterName').isString(),
            body('event.eventParameterConditions.*.dataType').isIn(Object.values(ParameterDataType)),
            body('event.eventParameterConditions.*.conditionOperator').isIn(Object.values(ConditionOperator)),
            body('event.eventParameterConditions.*.inputValue').custom(validateParameterConditionInputValue),
            body('metricCondition.metricType').isIn(Object.values(SegmentFilterEventMetricType)),
            body('metricCondition.conditionOperator').isIn(Object.values(ConditionNumericOperator)),
            body('metricCondition.inputValue').custom(validateMetricConditionInputValue),
            body('metricCondition.parameterType').optional().isIn(Object.values(ParameterType)),
            body('metricCondition.parameterName').optional().isString(),
            body('metricCondition.dataType').optional().isIn(Object.values(ParameterDataType)),
          ];
        case SegmentFilterConditionType.EventsInSequenceCondition:
          return [
            body('events').isArray({ min: 1 }),
            body('events.*.eventName').isString(),
            body('events.*.operator').optional().isIn(['and', 'or']),
            body('events.*.eventParameterConditions').optional().isArray(),
            body('events.*.eventParameterConditions.*.parameterType').isIn(Object.values(ParameterType)),
            body('events.*.eventParameterConditions.*.parameterName').isString(),
            body('events.*.eventParameterConditions.*.dataType').isIn(Object.values(ParameterDataType)),
            body('events.*.eventParameterConditions.*.conditionOperator').isIn(Object.values(ConditionOperator)),
            body('events.*.eventParameterConditions.*.inputValue').custom(validateParameterConditionInputValue),
            body('isInOneSession').isBoolean(),
            body('isDirectlyFollow').isBoolean(),
          ];
        case SegmentFilterConditionType.UserAttributeCondition:
          return [
            body('hasAttribute').isBoolean(),
            body('attributeCondition').isObject(),
            body('attributeCondition.parameterType').isIn(Object.values(ParameterType)),
            body('attributeCondition.parameterName').isString(),
            body('attributeCondition.dataType').isIn(Object.values(ParameterDataType)),
            body('attributeCondition.conditionOperator').isIn(Object.values(ConditionOperator)),
            body('attributeCondition.inputValue').custom(validateParameterConditionInputValue),
          ];
        case SegmentFilterConditionType.UserInSegmentCondition:
          return [
            body('segmentId').isString(),
            body('isInSegment').isBoolean(),
          ];
        default:
          return false;
      }
    }),
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
 * Validate metricCondition.inputValue, which can be number, or number array with two elements
 * @param value
 */
function validateMetricConditionInputValue(value: any) {
  if (Array.isArray(value)) {
    return value.every(item => typeof item === 'number') && value.length === 2 && value[0] <= value[1]; // number range
  } else {
    return typeof value === 'number';
  }
}

/**
 * Validate parameterCondition.inputValue type, which can be number | number[] | string | string[]
 * @param value
 */
function validateParameterConditionInputValue(value: any) {
  if (Array.isArray(value)) {
    return value.every(item => typeof item === 'number' || typeof item === 'string');
  } else {
    return typeof value === 'number' || typeof value === 'string';
  }
}
