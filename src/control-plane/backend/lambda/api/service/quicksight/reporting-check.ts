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

import { ExploreRelativeTimeUnit, ExploreRequestAction, ExploreTimeScopeType, MetadataValueType } from '@aws/clickstream-base-lib';
import { Condition, EventAndCondition, PairEventAndCondition, SQLCondition } from './sql-builder';
import { validSpecialCharacters } from '../../common/request-valid';

export interface CheckParamsStatus {
  readonly success: boolean;
  readonly message: string;
}

export class ReportingCheck {
  status: CheckParamsStatus;
  params: any;

  constructor(params: any) {
    this.status = {
      success: true,
      message: 'OK',
    };
    this.params = params;
  }

  public CommonParameterRequired() {
    if (this.params.viewName === undefined
      || this.params.projectId === undefined
      || this.params.pipelineId === undefined
      || this.params.appId === undefined
      || this.params.computeMethod === undefined
      || this.params.dashboardCreateParameters === undefined
    ) {
      this.status = {
        success: false,
        message: 'Required parameter is not provided.',
      };
    }

    if (this.params.action !== ExploreRequestAction.PREVIEW && this.params.action !== ExploreRequestAction.PUBLISH) {
      this.status = {
        success: false,
        message: 'Invalid request action.',
      };
    } else if (this.params.action === ExploreRequestAction.PUBLISH) {
      if (this.params.chartTitle === undefined
      || this.params.chartTitle === ''
      || this.params.dashboardId === undefined
      || this.params.sheetId === undefined
      ) {
        this.status = {
          success: false,
          message: 'At least missing one of following parameters [dashboardId,sheetId,chartTitle,chartSubTitle].',
        };
      }
      if (!validSpecialCharacters(this.params.chartTitle) || !validSpecialCharacters(this.params.chartSubTitle)) {
        this.status = {
          success: false,
          message: 'The input cannot contain special characters(! @ # $ % ^ & * + = { } [ ] : ; < > , . ? ~ / \' " |).',
        };
      }
    }
    return this;
  }

  public GroupCondition() {
    if (this.params.groupCondition !== undefined && this.params.groupCondition.property === '') {
      this.status = {
        success: false,
        message: '\'property\' attribute of grouping condition is empty.',
      };
    }

    if (this.params.groupCondition !== undefined &&
       !(this.params.groupCondition.dataType === MetadataValueType.STRING ||
        this.params.groupCondition.dataType === MetadataValueType.BOOLEAN)) {
      this.status = {
        success: false,
        message: 'Grouping function only supports string and boolean data type.',
      };
    }
    return this;
  }

  public FilterTypeAndValue() {
    const allConditions: Condition[] = this._mergeFilterConditions(this.params);
    for (const filter of allConditions) {
      if (filter.dataType !== MetadataValueType.STRING) {
        for ( const value of filter.value) {
          if (isNaN(value)) {
            this.status = {
              success: false,
              message: 'Filter value is not a number.',
            };
          }
        }
      }
    }
    return this;
  }

  public Condition() {
    const allConditions:Condition[] = [];
    const eventAndConditions = this.params.eventAndConditions;
    if (eventAndConditions !== undefined) {
      for (const eventCondition of eventAndConditions) {
        if (eventCondition.sqlCondition?.conditions !== undefined) {
          allConditions.push(...eventCondition.sqlCondition.conditions);
        }
      }
    }

    const globalEventCondition = this.params.globalEventCondition;
    if (globalEventCondition !== undefined && globalEventCondition.conditions !== undefined) {
      allConditions.push(...globalEventCondition.conditions);
    }

    allConditions.push(...this._getRetentionAnalysisConditions(this.params));

    for (const condition of allConditions) {
      if (condition.category === undefined
        || condition.property === undefined || condition.property === ''
        ||condition.operator === undefined || condition.operator === ''
        || condition.value === undefined) {
        this.status = {
          success: false,
          message: 'Incomplete filter conditions.',
        };
      }
    }
    return this;
  }


  public TimeParameters() {
    if (this.params.timeScopeType !== ExploreTimeScopeType.FIXED && this.params.timeScopeType !== ExploreTimeScopeType.RELATIVE) {
      this.status = {
        success: false,
        message: 'Invalid parameter [timeScopeType].',
      };
    } else if (this.params.timeScopeType === ExploreTimeScopeType.FIXED) {
      if (this.params.timeStart === undefined || this.params.timeEnd === undefined ) {
        this.status = {
          success: false,
          message: 'At least missing one of following parameters [timeStart, timeEnd].',
        };
      }
    } else if (this.params.timeScopeType === ExploreTimeScopeType.RELATIVE) {
      if (this.params.lastN === undefined || this.params.timeUnit === undefined ) {
        this.status = {
          success: false,
          message: 'At least missing one of following parameters [lastN, timeUnit].',
        };
      }
    }
    return this;
  }

  public TimeLargeThan10Years() {
    if (this.params.timeScopeType === ExploreTimeScopeType.FIXED) {
      const timeStart = new Date(this.params.timeStart);
      const timeEnd = new Date(this.params.timeEnd);
      if (timeEnd.getTime() - timeStart.getTime() > 10 * 365 * 24 * 60 * 60 * 1000) {
        this.status = {
          success: false,
          message: 'Time interval too long, max is 10 years.',
        };
      }
    } else if (this.params.timeScopeType === ExploreTimeScopeType.RELATIVE) {
      if (this.params.lastN !== undefined && this.params.timeUnit !== undefined
        && this.params.lastN * this._exploreRelativeTimeUnitToSeconds(this.params.timeUnit) > 10 * 365 * 24 * 60 * 60) {
        this.status = {
          success: false,
          message: 'Time interval too long, max is 10 years.',
        };
      }
    }
    return this;
  }


  public DuplicatedEvent() {
    const conditions = this.params.eventAndConditions as EventAndCondition[];
    const eventNames: string[] = [];
    for (const condition of conditions) {

      if (eventNames.includes(condition.eventName)) {
        this.status = {
          success: false,
          message: 'Duplicated event.',
        };
      } else {
        eventNames.push(condition.eventName);
      }
    }
    return this;
  }


  public NodesLimit() {
    const eventAndConditions = this.params.eventAndConditions as EventAndCondition[];
    if (eventAndConditions?.length > 10) {
      this.status = {
        success: false,
        message: 'The maximum number of event conditions is 10.',
      };
    }

    const globalEventCondition = this.params.globalEventCondition as SQLCondition;
    if (globalEventCondition?.conditions?.length > 10) {
      this.status = {
        success: false,
        message: 'The maximum number of global filter conditions is 10.',
      };
    }

    const pairEventAndConditions = this.params.pairEventAndConditions as PairEventAndCondition[];
    if (pairEventAndConditions?.length > 5) {
      this.status = {
        success: false,
        message: 'The maximum number of pair event conditions is 5.',
      };
    }

  }


  private _mergeFilterConditionsForRetention(params: any): Condition[] {
    const allConditions: Condition[] = [];
    if (params.pairEventAndConditions !== undefined) {
      for (const pairCondition of params.pairEventAndConditions) {
        if (pairCondition.startEvent.sqlCondition?.conditions !== undefined) {
          allConditions.push(...pairCondition.startEvent.sqlCondition.conditions);
        }
        if (pairCondition.backEvent.sqlCondition?.conditions !== undefined) {
          allConditions.push(...pairCondition.backEvent.sqlCondition.conditions);
        }
      }
    }

    return allConditions;
  }

  private _mergeFilterConditions(params: any): Condition[] {
    const allConditions: Condition[] = [];
    const eventAndConditions = params.eventAndConditions as EventAndCondition[];
    const globalEventCondition = params.globalEventCondition as SQLCondition;

    if (eventAndConditions !== undefined) {
      for (const condition of eventAndConditions) {
        if (condition.sqlCondition?.conditions !== undefined) {
          allConditions.push(...condition.sqlCondition.conditions);
        }
      }
    }

    if (globalEventCondition !== undefined && globalEventCondition.conditions !== undefined) {
      allConditions.push(...globalEventCondition.conditions);
    }

    allConditions.push(...this._mergeFilterConditionsForRetention(params));

    return allConditions;
  }


  private _getRetentionAnalysisConditions(params: any) {

    const allPairConditions:Condition[] = [];
    const pairEventAndConditions = params.pairEventAndConditions;
    if (pairEventAndConditions !== undefined) {
      for (const pairCondition of pairEventAndConditions) {
        if (pairCondition.startEvent.sqlCondition?.conditions !== undefined) {
          allPairConditions.push(...pairCondition.startEvent.sqlCondition.conditions);
        }
        if (pairCondition.backEvent.sqlCondition?.conditions !== undefined) {
          allPairConditions.push(...pairCondition.backEvent.sqlCondition.conditions);
        }
      }
    }

    return allPairConditions;
  }

  private _exploreRelativeTimeUnitToSeconds(timeUnit: string) : number {
    switch (timeUnit) {
      case ExploreRelativeTimeUnit.DD:
        return 24 * 60 * 60;
      case ExploreRelativeTimeUnit.WK:
        return 7 * 24 * 60 * 60;
      case ExploreRelativeTimeUnit.MM:
        return 30 * 24 * 60 * 60;
      default:
        return 365 * 24 * 60 * 60;
    }
  }
};

