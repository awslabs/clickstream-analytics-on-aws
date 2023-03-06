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
  Box,
  ColumnLayout,
  Container,
  Header,
} from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';

const UseCases: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="mt-20">
      <Container
        header={<Header variant="h2">{t('home:useCase.name')}</Header>}
      >
        <ColumnLayout columns={2} variant="text-grid">
          <div>
            <Box variant="awsui-key-label">{t('home:useCase.useCase1')}</Box>
            <div>{t('home:useCase.useCase1Desc')}</div>
          </div>
          <div>
            <Box variant="awsui-key-label">{t('home:useCase.useCase2')}</Box>
            <div>{t('home:useCase.useCase2Desc')}</div>
          </div>
        </ColumnLayout>
      </Container>
    </div>
  );
};

export default UseCases;
