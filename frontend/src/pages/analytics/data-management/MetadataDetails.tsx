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
import MetadataParameterSplitPanel from '../metadata/event-parameters/MetadataParameterSplitPanel';
import MetadataEventSplitPanel from '../metadata/events/MetadataEventSplitPanel';
import MetadataUserAttributeSplitPanel from '../metadata/user-attributes/MetadataUserAttributeSplitPanel';

interface MetadataDetailsProps {
  type: 'event' | 'eventParameter' | 'userAttribute';
  metadata:
    | IMetadataEvent
    | IMetadataEventParameter
    | IMetadataUserAttribute
    | null;
}

const MetadataDetails: React.FC<MetadataDetailsProps> = (
  props: MetadataDetailsProps
) => {
  const { type, metadata } = props;
  if (type === 'event') {
    return <MetadataEventSplitPanel event={metadata as IMetadataEvent} />;
  }
  if (type === 'eventParameter') {
    return (
      <MetadataParameterSplitPanel
        parameter={metadata as IMetadataEventParameter}
      />
    );
  }
  return (
    <MetadataUserAttributeSplitPanel
      attribute={metadata as IMetadataUserAttribute}
    />
  );
};

export default MetadataDetails;
