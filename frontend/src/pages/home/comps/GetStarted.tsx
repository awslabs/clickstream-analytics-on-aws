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

import { Box, Container, Header, Link } from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  getWorkingWithQuickSightLink,
  getWorkingWithRedshiftLink,
  getWorkshopLink,
} from 'ts/url';

const GetStarted: React.FC = () => {
  const { t, i18n } = useTranslation();
  return (
    <Container
      header={<Header variant="h2">{t('home:getStarted.name')}</Header>}
    >
      <Box padding={{ vertical: 'xs' }}>
        <Link href={getWorkshopLink(i18n.language)} target="_blank">
          {t('home:getStarted.link1')}
        </Link>
      </Box>
      <Box padding={{ vertical: 'xs' }}>
        <Link href={getWorkingWithRedshiftLink(i18n.language)}>
          {t('home:getStarted.link4')}
        </Link>
      </Box>
      <Box padding={{ vertical: 'xs' }}>
        <Link href={getWorkingWithQuickSightLink(i18n.language)}>
          {t('home:getStarted.link5')}
        </Link>
      </Box>
    </Container>
  );
};

export default GetStarted;
