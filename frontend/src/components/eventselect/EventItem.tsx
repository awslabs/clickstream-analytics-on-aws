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

import { Select, SelectProps } from '@cloudscape-design/components';
import classNames from 'classnames';
import React, { useEffect, useRef, useState } from 'react';
import {
  CategoryItemType,
  IAnalyticsItem,
  MOCK_CACLULATION_OPTION_LIST,
} from './AnalyticsType';
import DropDownContainer from './DropDownContainer';

interface EventItemProps {
  isMultiSelect?: boolean;
  hasTab?: boolean;
  categoryOption: IAnalyticsItem | null;
  calcMethodOption?: SelectProps.Option | null;
  changeCurCategoryOption: (category: SelectProps.Option | null) => void;
  changeCurCalcMethodOption?: (method: SelectProps.Option | null) => void;
  categories: CategoryItemType[];
}

const EventItem: React.FC<EventItemProps> = (props: EventItemProps) => {
  const {
    hasTab,
    isMultiSelect,
    categoryOption,
    calcMethodOption,
    changeCurCategoryOption,
    changeCurCalcMethodOption,
    categories,
  } = props;
  const [showDropdown, setShowDropdown] = useState(false);
  const [clickedOutside, setClickedOutside] = useState(false);

  function useOutsideAlerter(ref: any) {
    useEffect(() => {
      /**
       * Alert if clicked on outside of element
       */
      function handleClickOutside(event: any) {
        if (ref.current && !ref.current.contains(event.target)) {
          setShowDropdown(false);
          setClickedOutside(true);
        } else {
          setClickedOutside(false);
        }
      }
      // Bind the event listener
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        // Unbind the event listener on clean up
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [ref]);
  }
  const wrapperRef = useRef(null);
  useOutsideAlerter(wrapperRef);
  return (
    <div ref={wrapperRef} className="cs-dropdown-input">
      <div
        className={classNames({
          'dropdown-input-column': true,
          flex: isMultiSelect,
        })}
      >
        <div
          className="flex-1 cs-dropdown-event-input"
          onClick={() => setShowDropdown((prev) => !prev)}
        >
          <Select
            onBlur={(e) => {
              e.stopPropagation();
              if (clickedOutside) {
                setShowDropdown(false);
              }
            }}
            placeholder="Select event"
            selectedOption={categoryOption}
          />
        </div>
        {isMultiSelect && (
          <div className="second-select-option">
            <Select
              placeholder="Please select caculate method"
              selectedOption={calcMethodOption ?? null}
              onChange={(e) => {
                changeCurCalcMethodOption &&
                  changeCurCalcMethodOption(e.detail.selectedOption);
              }}
              options={MOCK_CACLULATION_OPTION_LIST}
            />
          </div>
        )}
      </div>
      {showDropdown && (
        <DropDownContainer
          selectedItem={categoryOption}
          changeSelectItem={(item) => {
            changeCurCategoryOption(item);
            setShowDropdown(false);
          }}
          hasTab={hasTab}
          categories={categories}
        />
      )}
    </div>
  );
};

export default EventItem;
