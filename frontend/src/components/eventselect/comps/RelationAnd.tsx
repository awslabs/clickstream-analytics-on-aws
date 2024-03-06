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

import classNames from 'classnames';
import React from 'react';
import Radius from './Radius';
import AndIcon from '../svg/and.svg';

interface RelationAndProps {
  enableChangeRelation?: boolean;
  onClick?: () => void;
  hideRadius?: boolean;
  minHeight?: number;
  isIsolate?: boolean;
}
const RelationAnd: React.FC<RelationAndProps> = (props: RelationAndProps) => {
  const { enableChangeRelation, onClick, hideRadius, isIsolate } = props;
  return (
    <div
      onClick={onClick}
      className={classNames({
        'cs-analytics-param-logic': true,
        'and enable-change': enableChangeRelation,
      })}
      style={{ minHeight: props.minHeight }}
    >
      {isIsolate && (
        <div className="cs-analytics-param-logic-radius rotate-180">
          <Radius />
        </div>
      )}
      <div className="cs-analytics-param-logic-line"></div>
      <div className="cs-analytics-param-logic-item">
        <img src={AndIcon} alt="and" />
      </div>
      {!hideRadius && (
        <div className="cs-analytics-param-logic-radius">
          <Radius />
        </div>
      )}
    </div>
  );
};

export default RelationAnd;
