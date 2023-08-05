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
  Button,
  Header,
  HeaderProps,
  Link,
  SpaceBetween,
} from '@cloudscape-design/components';
import React from 'react';

interface EventsTableHeaderProps extends HeaderProps {
  title?: string;
  refreshButtonText?: string;
  detailsButtonText?: string;
  extraActions?: React.ReactNode;
  selectedItemsCount: number;
  onRefreshButtonClick?: () => void;
  onDetailsButtonClick?: () => void;
  onInfoLinkClick?: () => void;
}

export function EventsTableHeader({
  title = '',
  refreshButtonText = '',
  detailsButtonText = '',
  extraActions = null,
  selectedItemsCount,
  onRefreshButtonClick,
  onDetailsButtonClick,
  onInfoLinkClick,
  ...props
}: EventsTableHeaderProps) {
  return (
    <Header
      variant="awsui-h1-sticky"
      info={
        onInfoLinkClick && (
          <Link variant="info" onFollow={onInfoLinkClick}>
            Info
          </Link>
        )
      }
      actions={
        <SpaceBetween size="xs" direction="horizontal">
          {extraActions}
          <Button
            data-testid="header-btn-create"
            variant="primary"
            onClick={onRefreshButtonClick}
          >
            {refreshButtonText}
          </Button>
        </SpaceBetween>
      }
      {...props}
    >
      {title}
    </Header>
  );
}
