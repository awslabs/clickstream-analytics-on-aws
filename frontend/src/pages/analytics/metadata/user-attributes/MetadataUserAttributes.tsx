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
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import MetadataUserAttributeSplitPanel from './MetadataUserAttributeSplitPanel';
import UserAttributeTable from './UserAttributesTable';

const MetadataUserAttributes: React.FC = () => {
  const { pid, appid } = useParams();

  const [showSplit, setShowSplit] = useState(false);
  const [selectedItems, setSelectedItems] = useState<IMetadataUserAttribute[]>(
    []
  );
  const [curEvent, setCurEvent] = useState<IMetadataUserAttribute | null>();
  const [refreshPage, setRefreshPage] = useState(0);

  useEffect(() => {
    if (selectedItems.length >= 1) {
      setShowSplit(true);
      setCurEvent(selectedItems[0]);
    } else {
      setShowSplit(false);
      setCurEvent(null);
    }
  }, [selectedItems]);

  return (
    <AppLayout
      toolsHide
      content={
        <UserAttributeTable
          projectId={pid ?? ''}
          appId={appid ?? ''}
          refresh={refreshPage}
          defaultSelectedItems={selectedItems}
          changeSelectedItems={(items) => {
            setSelectedItems(items);
          }}
        ></UserAttributeTable>
      }
      headerSelector="#header"
      navigation={
        <Navigation
          activeHref={`/analytics/${pid}/app/${appid}/metadata/user-attributes`}
        />
      }
      splitPanelOpen={showSplit}
      onSplitPanelToggle={(e) => {
        setShowSplit(e.detail.open);
      }}
      splitPanel={
        curEvent ? (
          <MetadataUserAttributeSplitPanel
            event={curEvent}
            refreshPage={() => {
              setRefreshPage((prev) => {
                return prev + 1;
              });
            }}
          />
        ) : (
          ''
        )
      }
    />
  );
};

export default MetadataUserAttributes;
