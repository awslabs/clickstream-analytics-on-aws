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

import { embedAnalyzesUrl } from 'apis/analytics';
import ExploreEmbedFrame from 'pages/analytics/comps/ExploreEmbedFrame';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { defaultStr } from 'ts/utils';

const AnalyticsAnalyzesFullWindow: React.FC = () => {
  const { projectId } = useParams();
  const [dashboardEmbedUrl, setDashboardEmbedUrl] = useState('');

  const getAnalyzes = async () => {
    try {
      const { success, data }: ApiResponse<any> = await embedAnalyzesUrl(
        defaultStr(projectId),
        window.location.origin
      );
      if (success && data.EmbedUrl) {
        setDashboardEmbedUrl(data.EmbedUrl);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (projectId) {
      getAnalyzes();
    }
  }, [projectId]);

  return (
    <ExploreEmbedFrame
      embedType="console"
      embedUrl={dashboardEmbedUrl}
      embedPage="analyze"
    />
  );
};

export default AnalyticsAnalyzesFullWindow;
