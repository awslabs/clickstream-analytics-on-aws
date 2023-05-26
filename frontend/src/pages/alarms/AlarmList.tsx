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
  Container,
  ContentLayout,
} from '@cloudscape-design/components';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import Navigation from 'components/layouts/Navigation';
import React from 'react';
import { useTranslation } from 'react-i18next';
import AlarmsHeader from './comps/AlarmsHeader';
import AlarmsTable from './comps/AlarmsTable';

const AlarmsList: React.FC = () => {
  const { t } = useTranslation();
  const breadcrumbItems = [
    {
      text: t('breadCrumb.name'),
      href: '/',
    },
    {
      text: t('breadCrumb.alarms'),
      href: '/',
    },
  ];
  return (
    <AppLayout
      toolsHide
      content={
        <ContentLayout header={<AlarmsHeader />}>
          <Container>
            <AlarmsTable />
          </Container>
        </ContentLayout>
      }
      headerSelector="#header"
      breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
      navigation={<Navigation activeHref="/alarms" />}
    />
  );
};

export default AlarmsList;
