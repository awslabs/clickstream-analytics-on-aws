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

import { Box, SpaceBetween } from '@cloudscape-design/components';
import { useTranslation } from 'react-i18next';

export const TableNoMatchState = ({
  onClearFilter,
}: {
  onClearFilter: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <Box margin={{ vertical: 'xs' }} textAlign="center" color="inherit">
      <SpaceBetween size="xxs">
        <b>{t('common:table.noMatches')}</b>
      </SpaceBetween>
    </Box>
  );
};

export const TableEmptyState = ({ resourceName }: { resourceName: string }) => {
  const { t } = useTranslation();
  return (
    <Box margin={{ vertical: 'xs' }} textAlign="center" color="inherit">
      <SpaceBetween size="xxs">
        <b>{t('common:table.empty')}</b>
      </SpaceBetween>
    </Box>
  );
};
