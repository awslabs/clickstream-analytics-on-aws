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

import { AppLayout } from '@cloudscape-design/components';
import Navigation from 'components/layouts/Navigation';
import React from 'react';

const AnalyticsDashboardDetail: React.FC = () => {

  return (
    <AppLayout
      toolsHide
      content={
        <iframe
          title='iframe'
          src="https://toladata.io/dashboards/public/b30c3fa6-32a9-4d5e-841d-8cf85d906897/15v6-057ba175c7601f60bfbb"
          style={{height:'100%', width:'100%', border: 0, overflow:'hidden'}}
        ></iframe>
      }
      headerSelector="#header"
      navigation={<Navigation activeHref="/analytics/dashboard/detail" />}
    />
  );
};

export default AnalyticsDashboardDetail;
