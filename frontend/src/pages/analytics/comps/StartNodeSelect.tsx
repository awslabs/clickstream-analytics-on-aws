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

import {
  CategoryItemType,
  IAnalyticsItem,
} from 'components/eventselect/AnalyticsType';
import EventItem from 'components/eventselect/EventItem';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { defaultStr } from 'ts/utils';

interface StartNodeSelectProps {
  nodes: CategoryItemType[];
  nodeOption: IAnalyticsItem | null;
  setNodeOption: (option: IAnalyticsItem | null) => void;
  loading?: boolean;
}

const StartNodeSelect: React.FC<StartNodeSelectProps> = (
  props: StartNodeSelectProps
) => {
  const { t } = useTranslation();
  const { nodeOption, setNodeOption, nodes, loading } = props;
  return (
    <div className="cs-analytics-dropdown">
      <div className="cs-analytics-parameter">
        <div className="flex gap-10 w-75p">
          <div className="flex-1">
            <EventItem
              type="event"
              placeholder={defaultStr(
                t('analytics:labels.nodeSelectPlaceholder')
              )}
              categoryOption={nodeOption}
              changeCurCategoryOption={(item) => {
                setNodeOption(item);
              }}
              categories={nodes}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartNodeSelect;
