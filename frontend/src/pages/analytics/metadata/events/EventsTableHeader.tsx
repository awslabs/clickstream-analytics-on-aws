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
  createButtonText?: string;
  extraActions?: React.ReactNode;
  selectedItemsCount: number;
  onInfoLinkClick?: () => void;
}

export function EventsTableHeader({
  title = '',
  createButtonText = '',
  extraActions = null,
  selectedItemsCount,
  onInfoLinkClick,
  ...props
}: EventsTableHeaderProps) {
  const isOnlyOneSelected = selectedItemsCount === 1;

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
            data-testid="header-btn-view-details"
            disabled={!isOnlyOneSelected}
          >
            View details
          </Button>
          <Button data-testid="header-btn-edit" disabled={!isOnlyOneSelected}>
            Edit
          </Button>
          <Button
            data-testid="header-btn-delete"
            disabled={selectedItemsCount === 0}
          >
            Delete
          </Button>
          <Button data-testid="header-btn-create" variant="primary">
            {createButtonText}
          </Button>
        </SpaceBetween>
      }
      {...props}
    >
      {title}
    </Header>
  );
}
