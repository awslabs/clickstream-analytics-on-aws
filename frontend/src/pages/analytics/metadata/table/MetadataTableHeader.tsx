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
import { Header, HeaderProps } from '@cloudscape-design/components';
import InfoLink from 'components/common/InfoLink';
import { DispatchContext } from 'context/StateContext';
import { StateActionType, HelpPanelType } from 'context/reducer';
import { useContext } from 'react';

interface MetadataTableHeaderProps extends HeaderProps {
  title?: string;
  selectedItemsCount: number;
  infoType?: HelpPanelType;
}

export function MetadataTableHeader({
  title = '',
  selectedItemsCount,
  infoType,
  ...props
}: MetadataTableHeaderProps) {
  const dispatch = useContext(DispatchContext);
  return (
    <Header
      variant="awsui-h1-sticky"
      info={
        <InfoLink
          onFollow={() => {
            dispatch?.({
              type: StateActionType.SHOW_HELP_PANEL,
              payload: infoType,
            });
          }}
        />
      }
      {...props}
    >
      {title}
    </Header>
  );
}
