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

const HowItWorks: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Container
      header={<Header variant="h2">{t('home:howItWorks.name')}</Header>}
    >
      <ColumnLayout columns={2} variant="text-grid">
        <div>
          <Box variant="awsui-key-label">{t('home:howItWorks.step1')}</Box>
          <Box variant="awsui-key-label">
            {t('home:howItWorks.step1SubTitle')}
          </Box>
          <div>{t('home:howItWorks.step1Desc')}</div>
        </div>
        <div>
          <Box variant="awsui-key-label">{t('home:howItWorks.step2')}</Box>
          <Box variant="awsui-key-label">
            {t('home:howItWorks.step2SubTitle')}
          </Box>
          <div>{t('home:howItWorks.step2Desc')}</div>
        </div>
        <div>
          <Box variant="awsui-key-label">{t('home:howItWorks.step3')}</Box>
          <Box variant="awsui-key-label">
            {t('home:howItWorks.step3SubTitle')}
          </Box>
          <div>{t('home:howItWorks.step3Desc')}</div>
        </div>
        <div>
          <Box variant="awsui-key-label">{t('home:howItWorks.step4')}</Box>
          <Box variant="awsui-key-label">
            {t('home:howItWorks.step4SubTitle')}
          </Box>
          <div>{t('home:howItWorks.step4Desc')}</div>
        </div>
      </ColumnLayout>
    </Container>
  );
};

export default HowItWorks;
