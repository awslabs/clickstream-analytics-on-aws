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

import React from 'react';

interface AnalyticsCustomHeaderBgProps {
  height: number;
}
const AnalyticsCustomHeaderBg: React.FC<AnalyticsCustomHeaderBgProps> = (
  props: AnalyticsCustomHeaderBgProps
) => {
  return (
    <div
      className="analytics-custom-header-bg"
      style={{ height: props.height }}
    >
      &nbsp;
    </div>
  );
};

export default AnalyticsCustomHeaderBg;
