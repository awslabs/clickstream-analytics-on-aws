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

import { Box } from '@cloudscape-design/components';

interface MetadataDataVolumeFCProps {
  dataVolume: number;
}

const MetadataDataVolumeFC: React.FC<MetadataDataVolumeFCProps> = (
  props: MetadataDataVolumeFCProps
) => {
  const { dataVolume } = props;

  const formatCount = (num: number, decimals = 2) => {
    if (!num) return '0';
    if (num === 0) return '0';
    const k = 1000;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'];
    const i = Math.floor(Math.log(num) / Math.log(k));
    return parseFloat((num / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return <Box>{formatCount(dataVolume)}</Box>;
};

export default MetadataDataVolumeFC;
