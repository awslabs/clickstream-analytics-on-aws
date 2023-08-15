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
import Loading from 'components/common/Loading';
import Navigation from 'components/layouts/Navigation';
import HeaderSwitchSpaceModal from 'components/layouts/SwitchSpaceModal';
import { useLocalStorage } from 'pages/common/use-local-storage';
import React, { useEffect, useState } from 'react';
import { ANALYTICS_INFO_KEY } from 'ts/const';

const AnalyticsHome: React.FC = () => {
  const [loadingData, setLoadingData] = useState(true);
  const [switchProjectVisible, setSwitchProjectVisible] = useState(false);
  const [analyticsInfo, setAnalyticsInfo] = useLocalStorage(
    ANALYTICS_INFO_KEY,
    {
      pid: '',
      pname: '',
      appid: '',
      appname: '',
    }
  );

  useEffect(() => {
    setLoadingData(true);
    if (analyticsInfo.pid && analyticsInfo.appid) {
      window.location.href = `/analytics/${analyticsInfo.pid}/app/${analyticsInfo.appid}/dashboards`;
    } else {
      setSwitchProjectVisible(true);
    }
    setLoadingData(false);
  }, []);

  return (
    <AppLayout
      toolsHide
      content={
        <div>
          {loadingData ? (
            <Loading />
          ) : (
            <HeaderSwitchSpaceModal
              visible={switchProjectVisible}
              disableClose={true}
              setSwitchProjectVisible={setSwitchProjectVisible}
              setAnalyticsInfo={setAnalyticsInfo}
            />
          )}
        </div>
      }
      headerSelector="#header"
      navigation={<Navigation activeHref="/analytics" />}
    />
  );
};

export default AnalyticsHome;
