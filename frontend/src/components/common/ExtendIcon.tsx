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
import React from 'react';
import {
  BsKanban,
  BsActivity,
  BsFunnel,
  BsPencilSquare,
  BsBarChartFill,
  BsGraphUp,
  BsPieChart,
  BsFilter,
} from 'react-icons/bs';

interface ExtendIconProps {
  icon: string;
  color?: string;
}
const ExtendIcon: React.FC<ExtendIconProps> = (props: ExtendIconProps) => {
  const { icon, color } = props;

  const switchIcon = () => {
    switch (icon) {
      case 'BsKanban':
        return <BsKanban color={color ?? 'white'} />;
      case 'BsActivity':
        return <BsActivity color={color ?? 'white'} />;
      case 'BsFunnel':
        return <BsFunnel color={color ?? 'white'} />;
      case 'BsPencilSquare':
        return <BsPencilSquare color={color ?? 'white'} />;
      case 'BsBarChartFill':
        return <BsBarChartFill color={color ?? 'white'} />;
      case 'BsGraphUp':
        return <BsGraphUp color={color ?? 'white'} />;
      case 'BsPieChart':
        return <BsPieChart color={color ?? 'white'} />;
      case 'BsFilter':
        return <BsFilter color={color ?? 'white'} size={0.5} />;
      case 'settings':
        return <Icon name="settings" variant="inverted" />;
      default:
        return <Icon name="settings" variant="inverted" />;
    }
  };

  return <>{switchIcon()}</>;
};

export default ExtendIcon;
