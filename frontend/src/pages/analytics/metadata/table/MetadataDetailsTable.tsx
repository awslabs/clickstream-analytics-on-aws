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

interface MetadataDetailsTableProps {
  data: any[];
  tableColumnDefinitions: any[];
  tableI18nStrings: {
    loadingText: string;
    emptyText: string;
  };
}

const MetadataDetailsTable: React.FC<MetadataDetailsTableProps> = (
  props: MetadataDetailsTableProps
) => {
  const { data, tableColumnDefinitions, tableI18nStrings } = props;
  const { items, paginationProps } = useCollection(data, {
    pagination: { pageSize: 10 },
  });

  return (
    <Table
      columnDefinitions={tableColumnDefinitions}
      items={items}
      loadingText={tableI18nStrings.loadingText}
      sortingDisabled
      empty={
        <Box margin={{ vertical: 'xs' }} textAlign="center" color="inherit">
          <SpaceBetween size="m">
            <b>{tableI18nStrings.emptyText}</b>
          </SpaceBetween>
        </Box>
      }
      pagination={<Pagination {...paginationProps} />}
    />
  );
};

export default MetadataDetailsTable;
