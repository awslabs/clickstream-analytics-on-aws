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

import { S3ResourceSelector } from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';

const S3Selector: React.FC = () => {
  const { t } = useTranslation();
  const [resource, setResource] = React.useState({
    uri: '',
  });
  return (
    <S3ResourceSelector
      onChange={({ detail }) => setResource(detail.resource)}
      resource={resource}
      objectsIsItemDisabled={(item) => !item.IsFolder}
      fetchBuckets={() => Promise.resolve([])}
      fetchObjects={() => Promise.resolve([])}
      fetchVersions={() => Promise.resolve([])}
      i18nStrings={{
        inContextInputPlaceholder: t('s3.inContextInputPlaceholder'),
        inContextSelectPlaceholder: t('s3.inContextSelectPlaceholder'),
        inContextBrowseButton: t('s3.inContextBrowseButton'),
        inContextViewButton: t('s3.inContextViewButton'),
        inContextViewButtonAriaLabel:
          t('s3.inContextViewButtonAriaLabel') || '',
        inContextLoadingText: t('s3.inContextLoadingText'),
        inContextUriLabel: t('s3.inContextUriLabel'),
        inContextVersionSelectLabel: t('s3.inContextVersionSelectLabel'),
        modalTitle: t('s3.modalTitle'),
        modalCancelButton: t('s3.modalCancelButton'),
        modalSubmitButton: t('s3.modalSubmitButton'),
        modalBreadcrumbRootItem: t('s3.modalBreadcrumbRootItem'),
        selectionBuckets: t('s3.selectionBuckets'),
        selectionObjects: t('s3.selectionObjects'),
        selectionVersions: t('s3.selectionVersions'),
        selectionBucketsSearchPlaceholder: t(
          's3.selectionBucketsSearchPlaceholder'
        ),
        selectionObjectsSearchPlaceholder: t(
          's3.selectionObjectsSearchPlaceholder'
        ),
        selectionVersionsSearchPlaceholder: t(
          's3.selectionVersionsSearchPlaceholder'
        ),
        selectionBucketsLoading: t('s3.selectionBucketsLoading'),
        selectionBucketsNoItems: t('s3.selectionBucketsNoItems'),
        selectionObjectsLoading: t('s3.selectionObjectsLoading'),
        selectionObjectsNoItems: t('s3.selectionObjectsNoItems'),
        selectionVersionsLoading: t('s3.selectionVersionsLoading'),
        selectionVersionsNoItems: t('s3.selectionVersionsNoItems'),
        filteringCounterText: (count) =>
          '' +
          count +
          (count === 1
            ? t('s3.filteringCounterTextMatch')
            : t('s3.filteringCounterTextMatches')),
        filteringNoMatches: t('s3.filteringNoMatches'),
        filteringCantFindMatch: t('s3.filteringCantFindMatch'),
        clearFilterButtonText: t('s3.clearFilterButtonText'),
        columnBucketName: t('s3.columnBucketName'),
        columnBucketCreationDate: t('s3.columnBucketCreationDate') || '',
        columnBucketRegion: t('s3.columnBucketRegion') || '',
        columnObjectKey: t('s3.columnObjectKey'),
        columnObjectLastModified: t('s3.columnObjectLastModified') || '',
        columnObjectSize: t('s3.columnObjectSize') || '',
        columnVersionID: t('s3.columnVersionID'),
        columnVersionLastModified: t('s3.columnVersionLastModified'),
        columnVersionSize: t('s3.columnVersionSize') || '',
        validationPathMustBegin: t('s3.validationPathMustBegin') || '',
        validationBucketLowerCase: t('s3.validationBucketLowerCase'),
        validationBucketMustNotContain: t('s3.validationBucketMustNotContain'),
        validationBucketMustComplyDns: t('s3.validationBucketMustComplyDns'),
        validationBucketLength: t('s3.validationBucketLength'),
        labelSortedDescending: (columnName) =>
          columnName + t('s3.labelSortedDescending'),
        labelSortedAscending: (columnName) =>
          columnName + t('s3.labelSortedDescending'),
        labelNotSorted: (columnName) => columnName + t('s3.labelNotSorted'),
        labelsPagination: {
          nextPageLabel: t('s3.labelsPagination.nextPageLabel') || '',
          previousPageLabel: t('s3.labelsPagination.previousPageLabel') || '',
          pageLabel: (pageNumber) =>
            t('s3.labelsPagination.page') +
            pageNumber +
            t('s3.labelsPagination.pageLabel'),
        },
        labelsBucketsSelection: {
          itemSelectionLabel: (data, item: any) => item.Name,
          selectionGroupLabel: t(
            's3.labelsBucketsSelection.selectionGroupLabel'
          ),
        },
        labelsObjectsSelection: {
          itemSelectionLabel: (data, item: any) => item.Key,
          selectionGroupLabel: t(
            's3.labelsObjectsSelection.selectionGroupLabel'
          ),
        },
        labelsVersionsSelection: {
          itemSelectionLabel: (data, item: any) => item.CreationDate,
          selectionGroupLabel: t(
            's3.labelsVersionsSelection.selectionGroupLabel'
          ),
        },
        labelFiltering: (itemsType) => t('s3.labelFiltering') + itemsType,
        labelRefresh: t('s3.labelRefresh'),
        labelModalDismiss: t('s3.labelModalDismiss'),
        labelBreadcrumbs: t('s3.labelBreadcrumbs'),
      }}
      selectableItemsTypes={['buckets', 'objects']}
    />
  );
};

export default S3Selector;
