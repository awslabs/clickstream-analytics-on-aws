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

const BenefitsFeatures: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Container header={<Header variant="h2">{t('home:benefits.name')}</Header>}>
      <ColumnLayout columns={2} variant="text-grid">
        <div>
          <Box variant="awsui-key-label">{t('home:benefits.benefit1')}</Box>
          <div>{t('home:benefits.benefit1Desc')}</div>
        </div>
        <div>
          <Box variant="awsui-key-label">{t('home:benefits.benefit2')}</Box>
          <div>{t('home:benefits.benefit2Desc')}</div>
        </div>
        <div>
          <Box variant="awsui-key-label">{t('home:benefits.benefit3')}</Box>
          <div>{t('home:benefits.benefit3Desc')}</div>
        </div>
        <div>
          <Box variant="awsui-key-label">{t('home:benefits.benefit4')}</Box>
          <div>{t('home:benefits.benefit4Desc')}</div>
        </div>
      </ColumnLayout>
    </Container>
  );
};

export default BenefitsFeatures;
