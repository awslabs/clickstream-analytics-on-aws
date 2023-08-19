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

import { debounce } from 'lodash';
import React, { useEffect, useRef, useState } from 'react';
import { CategoryItemType, IAnalyticsItem } from '../AnalyticsType';

interface ItemsListProps {
  isScroll: boolean;
  categories: CategoryItemType[];
  selectedCategory: number;
  onGroupScroll: (index: number) => void;
  showOptionDetails: (item: IAnalyticsItem) => void;
  changeSelectItem: (item: IAnalyticsItem) => void;
}

const ItemsList: React.FC<ItemsListProps> = (props: ItemsListProps) => {
  const {
    isScroll,
    categories,
    selectedCategory,
    onGroupScroll,
    showOptionDetails,
    changeSelectItem,
  } = props;
  const itemContainerRef: any = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    if (itemContainerRef.current && !isScroll) {
      itemContainerRef.current.scrollTop = scrollTop;
    }
  }, [scrollTop]);

  const handleGroupScroll = (index: number) => {
    const itemGroup = itemContainerRef.current.children[index];
    if (itemGroup) {
      const scrollTop =
        itemGroup.offsetTop - itemContainerRef.current.offsetTop;
      setScrollTop(scrollTop);
    }
  };

  const getCategoryFromScroll = () => {
    const itemContainer = itemContainerRef.current;
    let closestCategory = 0;
    let closestDistance = Infinity;

    for (let i = 0; i < itemContainer.children.length; i++) {
      const itemGroup = itemContainer.children[i];
      const distance = Math.abs(itemGroup.offsetTop - itemContainer.scrollTop);
      if (distance < closestDistance) {
        closestCategory = i;
        closestDistance = distance;
      }
    }
    return closestCategory;
  };

  const handleScroll = debounce(() => {
    onGroupScroll(getCategoryFromScroll());
  }, 200);

  useEffect(() => {
    if (selectedCategory >= 0) {
      handleGroupScroll(selectedCategory);
    }
  }, [selectedCategory]);

  return (
    <div
      ref={itemContainerRef}
      className="item-container"
      onScroll={handleScroll}
    >
      {categories.map((category: CategoryItemType, index: number) => (
        <div key={index} className="item-group">
          <div className="item-group-header">
            {category.categoryName}{' '}
            <span className="count">{category.itemList.length}</span>
          </div>
          {category.itemList.map((element, index) => {
            return (
              <div
                className="event-item"
                key={index}
                onMouseOver={() => {
                  showOptionDetails(element);
                }}
                onClick={() => {
                  changeSelectItem(element);
                }}
              >
                {element.label}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default ItemsList;
