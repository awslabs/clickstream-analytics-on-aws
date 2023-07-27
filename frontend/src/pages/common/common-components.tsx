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

import { Box, Button, SpaceBetween } from '@cloudscape-design/components';

export const TableNoMatchState = ({
  onClearFilter,
}: {
  onClearFilter: () => void;
}) => (
  <Box margin={{ vertical: 'xs' }} textAlign="center" color="inherit">
    <SpaceBetween size="xxs">
      <div>
        <b>No matches</b>
        <Box variant="p" color="inherit">
          We can't find a match.
        </Box>
      </div>
      <Button onClick={onClearFilter}>Clear filter</Button>
    </SpaceBetween>
  </Box>
);

export const TableEmptyState = ({ resourceName }: { resourceName: string }) => (
  <Box margin={{ vertical: 'xs' }} textAlign="center" color="inherit">
    <SpaceBetween size="xxs">
      <div>
        <b>No {resourceName.toLowerCase()}s</b>
        <Box variant="p" color="inherit">
          No {resourceName.toLowerCase()}s associated with this resource.
        </Box>
      </div>
      <Button>Create {resourceName.toLowerCase()}</Button>
    </SpaceBetween>
  </Box>
);
