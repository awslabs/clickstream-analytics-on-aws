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
import { identity } from 'lodash';
import React from 'react';
import { CategoryItemType } from '../AnalyticsType';

interface CategoryListProps {
  categories: CategoryItemType[];
  selectedCategory: number;
  onCategoryClick: (index: number) => void;
}

const CategoryList: React.FC<CategoryListProps> = (
  props: CategoryListProps
) => {
  const { categories, selectedCategory, onCategoryClick } = props;
  return (
    <div>
      {categories.map((category: CategoryItemType, index: number) => (
        <div
          key={identity(index)}
          onClick={() => onCategoryClick(index)}
          className={classNames({
            'category-item': true,
            active: index === selectedCategory,
          })}
        >
          {category.categoryName}
        </div>
      ))}
    </div>
  );
};

export default CategoryList;
