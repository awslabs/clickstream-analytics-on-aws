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

import { Input } from '@cloudscape-design/components';
import React, { useState } from 'react';
import { CategoryItemType, IAnalyticsItem } from './AnalyticsType';
import CategoryList from './comps/CategoryList';
import EventPreview from './comps/EventPreview';
import ItemsList from './comps/ItemsList';

interface DropDownContainerProps {
  hasTab?: boolean;
  categories: CategoryItemType[];
  changeSelectItem: (item: IAnalyticsItem) => void;
}

const DropDownContainer: React.FC<DropDownContainerProps> = (
  props: DropDownContainerProps
) => {
  const { hasTab, categories, changeSelectItem } = props;
  // const categories: string[] = ['预置事件', '自定义事件'];
  const [selectedCategory, setSelectedCategory] = useState<number>(0);
  const [curPreviewOption, setCurPreviewOption] = useState<IAnalyticsItem>();
  const [isScroll, setIsScroll] = useState(false);

  const handleCategoryClick = (index: number) => {
    setSelectedCategory(index);
    setIsScroll(false);
  };

  const handleGroupScroll = (index: number) => {
    console.info('index:', index);
    setSelectedCategory(index);
    setIsScroll(true);
  };

  const showOptionDetails = (item: IAnalyticsItem) => {
    setCurPreviewOption(item);
  };

  return (
    <div className="cs-dropdown-pop">
      <div className="cs-dropdown-pop-wrapper">
        <div className="cs-dropdown-pop-container">
          <div className="cs-dropdown-container">
            <div>
              <div className="csdc-header">
                {hasTab && (
                  <div className="csdc-header-tab flex">
                    <div className="tab-item active">事件</div>
                    {/* <div className="tab-item">指标</div> */}
                  </div>
                )}
                <div className="csdc-header-search">
                  <Input placeholder="Search" type="search" value="" />
                </div>
              </div>
              <div className="csdc-container">
                <div className="csdc-container-event-category">
                  <div className="csdc-container-event-category-content">
                    <CategoryList
                      categories={categories}
                      selectedCategory={selectedCategory}
                      onCategoryClick={handleCategoryClick}
                    />
                  </div>
                </div>
                <div className="csdc-container-event-option-list">
                  <ItemsList
                    isScroll={isScroll}
                    categories={categories}
                    selectedCategory={selectedCategory}
                    onGroupScroll={handleGroupScroll}
                    showOptionDetails={showOptionDetails}
                    changeSelectItem={changeSelectItem}
                  />
                </div>
              </div>
            </div>
            {curPreviewOption && (
              <EventPreview previewItem={curPreviewOption} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DropDownContainer;
