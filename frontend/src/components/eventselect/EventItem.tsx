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

import { Select } from '@cloudscape-design/components';
import classNames from 'classnames';
import ErrorText from 'components/common/ErrorText';
import { StateContext } from 'context/StateContext';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ExploreAggregationMethod,
  ExploreComputeMethod,
} from 'ts/explore-types';
import { defaultStr } from 'ts/utils';
import { CategoryItemType, IAnalyticsItem } from './AnalyticsType';
import DropDownContainer from './DropDownContainer';
import GroupSelectContainer from './GroupSelectContainer';

interface EventItemProps {
  type: 'event' | 'attribute';
  showMouseoverTitle?: boolean;
  placeholder: string | null;
  isMultiSelect?: boolean;
  hasTab?: boolean;
  categoryOption: IAnalyticsItem | null;
  calcMethodOption?: IAnalyticsItem | null;
  calcMethodOptions?: IAnalyticsItem[];
  changeCurCategoryOption: (category: IAnalyticsItem | null) => void;
  changeCurCalcMethodOption?: (method: IAnalyticsItem | null) => void;
  categories: CategoryItemType[];
  loading?: boolean;
  disabled?: boolean;
  disableValidate?: boolean;
}

const EventItem: React.FC<EventItemProps> = (props: EventItemProps) => {
  const {
    type,
    showMouseoverTitle,
    placeholder,
    hasTab,
    isMultiSelect,
    categoryOption,
    calcMethodOption,
    calcMethodOptions,
    changeCurCategoryOption,
    changeCurCalcMethodOption,
    categories,
    loading,
    disabled,
    disableValidate,
  } = props;
  const { t } = useTranslation();
  const state = useContext(StateContext);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showGroupSelectDropdown, setShowGroupSelectDropdown] = useState(false);
  const [clickedOutside, setClickedOutside] = useState(false);
  const [showDropdownAtTop, setShowDropdownAtTop] = useState(false);
  const defaultComputeMethodOptions: IAnalyticsItem[] = [
    {
      value: ExploreComputeMethod.USER_ID_CNT,
      label: t('analytics:options.userNumber') ?? 'User number',
    },
    {
      value: ExploreComputeMethod.EVENT_CNT,
      label: t('analytics:options.eventNumber') ?? 'Event number',
    },
  ];

  function useOutsideAlerter(ref: any) {
    useEffect(() => {
      /**
       * Alert if clicked on outside of element
       */
      function handleClickOutside(event: any) {
        if (ref.current && !ref.current.contains(event.target)) {
          setShowDropdown(false);
          setShowGroupSelectDropdown(false);
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

  const handleClickEvent = () => {
    if (!wrapperRef.current) return;
    const element: any = wrapperRef.current;
    const distanceToBottom =
      window.innerHeight - element.getBoundingClientRect().bottom;
    console.info('distanceToBottom:', distanceToBottom);
    if (distanceToBottom < 350) {
      setShowDropdownAtTop(true);
    } else {
      setShowDropdownAtTop(false);
    }
  };

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
          role="none"
          className="flex-1 cs-dropdown-event-input"
          onClick={(e) => {
            setShowDropdown((prev) => !prev);
            setShowGroupSelectDropdown(false);
            handleClickEvent();
          }}
        >
          <Select
            onBlur={(e) => {
              e.stopPropagation();
              if (clickedOutside) {
                setShowDropdown(false);
              }
            }}
            placeholder={defaultStr(placeholder)}
            selectedOption={categoryOption}
            disabled={disabled}
          />
          {categoryOption?.label && showMouseoverTitle && (
            <div className="custom-popover">{categoryOption?.label}</div>
          )}
          {!disableValidate &&
            !showDropdown &&
            !categoryOption &&
            ((type === 'attribute' && state?.showAttributeError) ||
              (type === 'event' && state?.showEventError)) && (
              <ErrorText
                text={`${t('analytics:valid.please')}${placeholder}`}
              />
            )}
        </div>
        {isMultiSelect && (
          <div
            role="none"
            className="second-select-option"
            title={calcMethodOption?.label}
            onClick={(e) => {
              setShowGroupSelectDropdown((prev) => !prev);
              setShowDropdown(false);
              handleClickEvent();
            }}
          >
            <Select selectedOption={calcMethodOption ?? null} />
            {showGroupSelectDropdown && (
              <GroupSelectContainer
                showDropdownAtTop={showDropdownAtTop}
                categories={calcMethodOptions ?? defaultComputeMethodOptions}
                selectedItem={calcMethodOption ?? null}
                changeSelectItem={(item) => {
                  if (item) {
                    const newItem: any = { ...item };
                    if (
                      item.itemType === 'children' &&
                      item.groupName === ExploreComputeMethod.COUNT_PROPERTY
                    ) {
                      newItem.label = t('analytics:countGroupLabel', {
                        label: item.label,
                      });
                    }
                    if (
                      item.itemType === 'children' &&
                      item.groupName === ExploreAggregationMethod.MIN
                    ) {
                      newItem.label = t('analytics:minGroupLabel', {
                        label: item.label,
                      });
                    }
                    if (
                      item.itemType === 'children' &&
                      item.groupName === ExploreAggregationMethod.MAX
                    ) {
                      newItem.label = t('analytics:maxGroupLabel', {
                        label: item.label,
                      });
                    }
                    if (
                      item.itemType === 'children' &&
                      item.groupName === ExploreAggregationMethod.SUM
                    ) {
                      newItem.label = t('analytics:sumGroupLabel', {
                        label: item.label,
                      });
                    }
                    if (
                      item.itemType === 'children' &&
                      item.groupName === ExploreAggregationMethod.AVG
                    ) {
                      newItem.label = t('analytics:avgGroupLabel', {
                        label: item.label,
                      });
                    }
                    if (
                      item.itemType === 'children' &&
                      item.groupName === ExploreAggregationMethod.MEDIAN
                    ) {
                      newItem.label = t('analytics:medianGroupLabel', {
                        label: item.label,
                      });
                    }
                    changeCurCalcMethodOption?.(newItem);
                  } else {
                    changeCurCalcMethodOption?.(null);
                  }
                }}
              />
            )}
          </div>
        )}
      </div>
      {showDropdown && (
        <DropDownContainer
          showDropdownAtTop={showDropdownAtTop}
          loading={loading}
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
