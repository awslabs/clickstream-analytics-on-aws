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
import { createEmbeddingContext } from 'amazon-quicksight-embedding-sdk';
import { fetchEmbeddingUrl } from 'apis/analytics';
import Loading from 'components/common/Loading';
import Navigation from 'components/layouts/Navigation';
import React, { useEffect, useState } from 'react';

const AnalyticsDashboardDetail: React.FC = () => {
  const [loadingData, setLoadingData] = useState(false);

  const getEmbeddingUrl = async () => {
    try {
      const { success, data }: ApiResponse<any> = await fetchEmbeddingUrl(
        'ap-southeast-1',
        window.location.origin,
        'clickstream_dashboard_uat_test5_umxq_uat5_app1_a949088f'
      );
      if (success) {
        const embedDashboard = async () => {
          const embeddingContext = await createEmbeddingContext();
          await embeddingContext.embedDashboard({
            url: data.EmbedUrl,
            container: '#qs-container',
          });
        };
        embedDashboard();
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    setLoadingData(true);
    getEmbeddingUrl();
    setLoadingData(false);
  }, []);

  return (
    <AppLayout
      toolsHide
      content={
        loadingData ? (
          <Loading />
        ) : (
          // <iframe
          //   title="iframe"
          //   src={embeddingUrl}
          //   // src="https://toladata.io/dashboards/public/b30c3fa6-32a9-4d5e-841d-8cf85d906897/15v6-057ba175c7601f60bfbb"
          //   style={{
          //     height: '100%',
          //     width: '100%',
          //     border: 0,
          //     overflow: 'hidden',
          //   }}
          // ></iframe>
          <div
            id={'qs-container'}
            style={{
              height: '100%',
              width: '100%',
              border: 0,
              overflow: 'hidden',
            }}
          ></div>
        )
      }
      headerSelector="#header"
      navigation={<Navigation activeHref="/analytics/dashboard/detail" />}
    />
  );
};

export default AnalyticsDashboardDetail;
