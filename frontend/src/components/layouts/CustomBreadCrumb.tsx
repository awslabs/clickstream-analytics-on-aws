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

import { BreadcrumbGroup } from '@cloudscape-design/components';
import React from 'react';

type BreadCrumbType = {
  text: string;
  href: string;
};

interface ICustomBreadCrumbProps {
  breadcrumbItems: BreadCrumbType[];
}

const CustomBreadCrumb: React.FC<ICustomBreadCrumbProps> = (
  props: ICustomBreadCrumbProps
) => {
  const { breadcrumbItems } = props;
  return (
    <BreadcrumbGroup
      items={breadcrumbItems}
      expandAriaLabel="Show path"
      ariaLabel="Breadcrumbs"
    />
  );
};

export default CustomBreadCrumb;
