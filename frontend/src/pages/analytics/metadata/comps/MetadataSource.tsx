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

import { Badge } from '@cloudscape-design/components';
import { MetadataSource } from 'ts/explore-types-ln';

interface MetadataSourceFCProps {
  source: MetadataSource;
}

const MetadataSourceFC: React.FC<MetadataSourceFCProps> = (
  props: MetadataSourceFCProps
) => {
  const { source } = props;
  enum colors {
    BLUE = 'blue',
    GREY = 'grey',
    GREEN = 'green',
  }
  const colorMap = {
    [MetadataSource.CUSTOM]: colors.BLUE,
    [MetadataSource.PRESET]: colors.GREY,
    [MetadataSource.TEMPLATE]: colors.GREEN,
  };

  return <Badge color={colorMap[source]}>{source}</Badge>;
};

export default MetadataSourceFC;
