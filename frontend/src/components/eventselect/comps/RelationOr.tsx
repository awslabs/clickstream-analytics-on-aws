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
import OrIcon from '../svg/or.svg';

interface RelationOrProps {
  enableChangeRelation?: boolean;
  onClick?: () => void;
  isIsolate?: boolean;
}
const RelationOr: React.FC<RelationOrProps> = (props: RelationOrProps) => {
  const { onClick, enableChangeRelation, isIsolate } = props;
  return (
    <div
      onClick={onClick}
      className={classNames({
        'cs-analytics-param-logic': true,
        'or enable-change': enableChangeRelation,
      })}
    >
      {isIsolate && (
        <div className="cs-analytics-param-logic-radius rotate-180">
          <Radius />
        </div>
      )}

      <div className="cs-analytics-param-logic-line"></div>
      <div className="cs-analytics-param-logic-item">
        <img src={OrIcon} alt="and" />
      </div>
      <div className="cs-analytics-param-logic-radius">
        <Radius />
      </div>
    </div>
  );
};

export default RelationOr;
