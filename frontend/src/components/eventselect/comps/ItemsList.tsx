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
import { debounce, identity } from 'lodash';
import React, { useEffect, useRef, useState } from 'react';
import { CategoryItemType, IAnalyticsItem } from '../AnalyticsType';

interface ItemsListProps {
  filterText: string;
  isScroll: boolean;
  categories: CategoryItemType[];
  selectedCategory: number;
  onGroupScroll: (index: number) => void;
  showOptionDetails: (item: IAnalyticsItem) => void;
  selectedItem: IAnalyticsItem | null;
  changeSelectItem: (item: IAnalyticsItem) => void;
}

const ItemsList: React.FC<ItemsListProps> = (props: ItemsListProps) => {
  const {
    filterText,
    isScroll,
    categories,
    selectedCategory,
    onGroupScroll,
    showOptionDetails,
    selectedItem,
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

  const filteredItemList = (itemList: IAnalyticsItem[]) => {
    return itemList.filter((item: IAnalyticsItem) => {
      return (
        item?.label
          ?.toLocaleLowerCase()
          .includes(filterText.toLocaleLowerCase()) ??
        item?.value
          ?.toLocaleLowerCase()
          .includes(filterText.toLocaleLowerCase())
      );
    });
  };

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
        <div key={identity(index)} className="item-group">
          <div className="item-group-header">
            {category.categoryName}
            <span className="count">
              {filteredItemList(category.itemList).length}
            </span>
          </div>
          {filteredItemList(category.itemList).map((element, index) => {
            return (
              <div
                className={classNames({
                  'event-item': true,
                  'item-selected':
                    element.value === selectedItem?.value &&
                    element.label === selectedItem?.label,
                })}
                key={identity(index)}
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
