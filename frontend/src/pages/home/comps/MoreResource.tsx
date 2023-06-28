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
  FAQ_LINK_CN,
  FAQ_LINK_EN,
  SUBMMIT_ISSUE_LINK,
  buildDocumentLink,
} from 'ts/url';

const MoreResource: React.FC = () => {
  const { t, i18n } = useTranslation();
  return (
    <Container
      header={<Header variant="h2">{t('home:moreResource.name')}</Header>}
    >
      <Box padding={{ vertical: 'xs' }}>
        <Link
          href={buildDocumentLink(i18n.language, FAQ_LINK_EN, FAQ_LINK_CN)}
          target="_blank"
        >
          {t('home:moreResource.faq')}
        </Link>
      </Box>
      <Box padding={{ vertical: 'xs' }}>
        <Link href={SUBMMIT_ISSUE_LINK} target="_blank">
          {t('home:moreResource.submitIssue')}
        </Link>
      </Box>
    </Container>
  );
};

export default MoreResource;
