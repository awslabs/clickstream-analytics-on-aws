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

import { Alert } from '@cloudscape-design/components';
import { getTrafficSource } from 'apis/traffic';
import React, { useEffect, useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import ChannelGroup from './ChannelGroup';
import SourceCategory from './SourceCategory';
import { ITrafficSource, trafficSourceReducer } from './reducer/trafficReducer';

const initTrafficSource: ITrafficSource = {
  projectId: '',
  appId: '',
  channelGroups: [],
  sourceCategories: [],
};

interface TrafficSourceHomeProps {
  analysisStudioEnabled: boolean;
}

const TrafficSourceHome: React.FC<TrafficSourceHomeProps> = (
  props: TrafficSourceHomeProps
) => {
  const { t } = useTranslation();
  const { projectId, appId } = useParams();

  const [loading, setLoading] = useState(false);
  const [trafficSourceState, trafficSourceDispatch] = useReducer(
    trafficSourceReducer,
    initTrafficSource
  );

  const fetchTrafficSource = async () => {
    setLoading(true);
    try {
      if (!projectId || !appId) {
        return {};
      }
      const { success, data }: ApiResponse<ITrafficSource> =
        await getTrafficSource({ projectId, appId });
      if (success) {
        trafficSourceDispatch({ type: 'SetState', data });
      }
      setLoading(false);
      return {};
    } catch (error) {
      setLoading(false);
      return {};
    }
  };

  useEffect(() => {
    fetchTrafficSource();
  }, []);

  return (
    <>
      <Alert statusIconAriaLabel="Info">
        {t('analytics:metadata.trafficSource.alert')}
      </Alert>
      <br />
      <ChannelGroup
        loading={loading}
        setLoading={setLoading}
        state={trafficSourceState}
        dispatch={trafficSourceDispatch}
      />
      <br />
      <SourceCategory
        loading={loading}
        setLoading={setLoading}
        state={trafficSourceState}
        dispatch={trafficSourceDispatch}
      />
    </>
  );
};

export default TrafficSourceHome;
