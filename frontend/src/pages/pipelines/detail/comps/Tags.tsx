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

import { Header, Table } from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface TagsProps {
  pipelineInfo?: IExtPipeline;
}

const Tags: React.FC<TagsProps> = (props: TagsProps) => {
  const { pipelineInfo } = props;
  const { t } = useTranslation();
  return (
    <Table
      header={
        <Header variant="h2" counter={`(${pipelineInfo?.tags.length})`}>
          {t('pipeline:detail.tags')}
        </Header>
      }
      variant="embedded"
      columnDefinitions={[
        {
          id: 'key',
          header: t('tag.keyHeader'),
          cell: (item) => item.key || '-',
        },
        {
          id: 'value',
          header: t('tag.valueHeader'),
          cell: (item) => item.value || '-',
        },
      ]}
      items={pipelineInfo?.tags || []}
      sortingDisabled
      empty={''}
    />
  );
};

export default Tags;
