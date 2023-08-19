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
import OrIcon from '../svg/or.svg';

interface RelationOrProps {
  enableChangeRelation?: boolean;
  onClick?: () => void;
}
const RelationOr: React.FC<RelationOrProps> = (props: RelationOrProps) => {
  const { onClick, enableChangeRelation } = props;
  return (
    <div
      onClick={onClick}
      className={classNames({
        'cs-analytics-param-logic': true,
        'or enable-change': enableChangeRelation,
      })}
    >
      <div className="cs-analytics-param-logic-line"></div>
      <div className="cs-analytics-param-logic-item">
        <img src={OrIcon} alt="and" />
      </div>
      <div className="cs-analytics-param-logic-radius">
        <svg
          width="6"
          height="10"
          viewBox="0 0 6 10"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M1 0C1.55228 0 2 0.447715 2 1V3.342C2 5.42622 3.29286 7.29182 5.24438 8.02364L5.35112 8.06367C5.86824 8.25759 6.13025 8.834 5.93633 9.35112C5.74241 9.86824 5.166 10.1302 4.64888 9.93633L4.54214 9.8963C1.81001 8.87175 0 6.25991 0 3.342V1C0 0.447715 0.447715 0 1 0Z"
          ></path>
        </svg>
      </div>
    </div>
  );
};

export default RelationOr;
