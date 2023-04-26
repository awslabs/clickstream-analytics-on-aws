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
  AppLayout,
  Button,
  ContentLayout,
  Header,
} from '@cloudscape-design/components';
import { unsubscribQuickSight } from 'apis/resource';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import Navigation from 'components/layouts/Navigation';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const QuickSight: React.FC = () => {
  const { t } = useTranslation();
  const breadcrumbItems = [
    {
      text: t('breadCrumb.name'),
      href: '/',
    },
    {
      text: t('breadCrumb.quicksight'),
      href: '/',
    },
  ];

  const [loadingUnsub, setLoadingUnsub] = useState(false);

  // unsubscribe quicksight
  const unsubscribTheQuickSight = async () => {
    setLoadingUnsub(true);
    try {
      const { success, data }: ApiResponse<string> =
        await unsubscribQuickSight();
      if (success && data) {
        setLoadingUnsub(false);
        // TODO
      }
    } catch (error) {
      setLoadingUnsub(false);
    }
  };
  return (
    <AppLayout
      content={
        <ContentLayout
          header={<Header variant="h1">{t('breadCrumb.quicksight')}</Header>}
        >
          <Button
            loading={loadingUnsub}
            onClick={() => {
              unsubscribTheQuickSight();
            }}
          >
            {t('button.unsubscribe')}
          </Button>
        </ContentLayout>
      }
      headerSelector="#header"
      breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
      navigation={<Navigation activeHref="/quicksight" />}
    />
  );
};

export default QuickSight;
