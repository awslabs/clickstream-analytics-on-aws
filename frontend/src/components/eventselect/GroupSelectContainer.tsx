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

import { Icon } from '@cloudscape-design/components';
import classNames from 'classnames';
import Loading from 'components/common/Loading';
import { identity } from 'lodash';
import React, { useEffect, useState } from 'react';
import { IAnalyticsItem } from './AnalyticsType';
import EventPreview from './comps/EventPreview';

interface DropDownContainerProps {
  categories: IAnalyticsItem[];
  selectedItem: IAnalyticsItem | null;
  changeSelectItem: (item: IAnalyticsItem) => void;
  loading?: boolean;
}

const GroupSelectContainer: React.FC<DropDownContainerProps> = (
  props: DropDownContainerProps
) => {
  const { categories, selectedItem, changeSelectItem, loading } = props;
  const [mouseoverCurrentCategory, setMouseoverCurrentCategory] =
    useState<IAnalyticsItem | null>(selectedItem);
  const [curPreviewOption, setCurPreviewOption] =
    useState<IAnalyticsItem | null>(null);
  const [showSubList, setShowSubList] = useState(false);

  useEffect(() => {
    if (selectedItem && selectedItem.itemType === 'children') {
      setShowSubList(true);
    }
  }, []);

  const itemSelectClass = (item: IAnalyticsItem) => {
    return (
      item.value === selectedItem?.value ||
      item.value === selectedItem?.groupName
    );
  };

  return (
    <div className="cs-dropdown-pop">
      <div className="cs-dropdown-pop-wrapper group-select">
        <div className="cs-dropdown-pop-container">
          <div className="cs-dropdown-container">
            {loading ? (
              <Loading isPage />
            ) : (
              <>
                <div className="click-stream-container">
                  <div className="click-stream-container-event-option-list">
                    <div className="item-container">
                      {categories.map((category, index) => {
                        return (
                          <div
                            title={category.label}
                            key={identity(index)}
                            className={classNames({
                              'group-select-item': true,
                              'item-selected': itemSelectClass(category),
                            })}
                            onClick={(e) => {
                              if (
                                !category.subList ||
                                category.subList.length === 0
                              ) {
                                changeSelectItem(category);
                              } else {
                                e.preventDefault();
                                e.stopPropagation();
                              }
                            }}
                            onMouseMove={() => {
                              if (
                                category.subList &&
                                category.subList.length > 0
                              ) {
                                setShowSubList(true);
                              } else {
                                setShowSubList(false);
                              }
                              setCurPreviewOption(null);
                              setMouseoverCurrentCategory(category);
                            }}
                          >
                            <div>{category.label}</div>
                            {category.subList &&
                              category.subList.length > 0 && (
                                <Icon size="small" name="angle-right" />
                              )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {showSubList && (
                    <div className="group-select-sub-list">
                      {categories
                        .find(
                          (item) =>
                            item.value === mouseoverCurrentCategory?.value ||
                            item.value === mouseoverCurrentCategory?.groupName
                        )
                        ?.subList?.map((item, index) => {
                          return (
                            <div
                              title={item.label}
                              key={identity(index)}
                              className={classNames({
                                'group-select-item': true,
                                'item-selected': itemSelectClass(item),
                              })}
                              onMouseMove={() => {
                                setShowSubList(true);
                                setCurPreviewOption(item);
                              }}
                              onClick={() => {
                                changeSelectItem(item);
                              }}
                            >
                              {item.label}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
                {curPreviewOption && showSubList && (
                  <EventPreview previewItem={curPreviewOption} />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupSelectContainer;
