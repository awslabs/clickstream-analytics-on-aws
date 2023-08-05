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
import { getMetadataEventDetails } from 'apis/analytics';
import Navigation from 'components/layouts/Navigation';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import EventTable from './EventsTable';
import MetadataEventSplitPanel from './MetadataEventSplitPanel';

const MetadataEvents: React.FC = () => {
  const { pid, appid } = useParams();

  const [showSplit, setShowSplit] = useState(false);
  const [curEvent, setCurEvent] = useState<IMetadataEvent | null>();

  return (
    <AppLayout
      toolsHide
      content={
        <EventTable
          projectId={pid ?? ''}
          appId={appid ?? ''}
          loadHelpPanelContent={() => {
            console.log(1);
          }}
          setShowDetails={(show: boolean, data?: IMetadataEvent) => {
            setShowSplit(show);
            if (data) {
              setCurEvent(data);
            }
          }}
        ></EventTable>
      }
      headerSelector="#header"
      navigation={
        <Navigation
          activeHref={`/analytics/${pid}/app/${appid}/metadata/events`}
        />
      }
      splitPanelOpen={showSplit}
      onSplitPanelToggle={(e) => {
        setShowSplit(e.detail.open);
      }}
      splitPanel={curEvent ? <MetadataEventSplitPanel event={curEvent} /> : ''}
    />
  );
};

export default MetadataEvents;
