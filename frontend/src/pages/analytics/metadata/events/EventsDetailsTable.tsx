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

import { useCollection } from '@cloudscape-design/collection-hooks';
import {
  Box,
  Pagination,
  SpaceBetween,
  Table,
} from '@cloudscape-design/components';
import { useTranslation } from 'react-i18next';
import '../styles/table-select.scss';

interface EventsDetailsTableProps {
  data: IMetadataEventParameter[];
}

const EventsDetailsTable: React.FC<EventsDetailsTableProps> = (
  props: EventsDetailsTableProps
) => {
  const { data } = props;
  const { t } = useTranslation();

  const { items, paginationProps } = useCollection(data, {
    pagination: { pageSize: 10 },
  });

  return (
    <Table
      columnDefinitions={[
        {
          id: 'name',
          header: (
            <Box fontWeight="bold">
              {t('analytics:metadata.event.split.parameterName')}
            </Box>
          ),
          cell: (item) => item.name || '-',
          sortingField: 'name',
          isRowHeader: true,
        },
        {
          id: 'displayName',
          header: (
            <Box fontWeight="bold">
              {t('analytics:metadata.event.split.displayName')}
            </Box>
          ),
          cell: (item) => item.displayName || '-',
        },
        {
          id: 'description',
          header: (
            <Box fontWeight="bold">
              {t('analytics:metadata.event.split.description')}
            </Box>
          ),
          cell: (item) => item.description || '-',
        },
        {
          id: 'dataType',
          header: (
            <Box fontWeight="bold">
              {t('analytics:metadata.event.split.dataType')}
            </Box>
          ),
          cell: (item) => item.dataType || '-',
        },
      ]}
      items={items}
      loadingText="Loading resources"
      sortingDisabled
      empty={
        <Box margin={{ vertical: 'xs' }} textAlign="center" color="inherit">
          <SpaceBetween size="m">
            <b>No resources</b>
          </SpaceBetween>
        </Box>
      }
      pagination={<Pagination {...paginationProps} />}
    />
  );
};

export default EventsDetailsTable;
