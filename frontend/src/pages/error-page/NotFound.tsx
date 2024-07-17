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

import { Alert, Container, ContentLayout } from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface NotFoundProps {
  object: string;
}

const NotFound: React.FC<NotFoundProps> = (props: NotFoundProps) => {
  const { t } = useTranslation();
  const { object } = props;

  const getObjectName = (type: string) => {
    if (type === 'pipeline') {
      return t('error.notFoundPipeline');
    } else if (type === 'project') {
      return t('error.notFoundProject');
    }
    return t('error.notFoundPage');
  };

  return (
    <ContentLayout headerVariant="high-contrast">
      <Container>
        <div className="mt-10">
          <Alert statusIconAriaLabel="Info" header={t('error.notFoundTitle')}>
            {t('error.notFoundMessage', {
              object: getObjectName(object),
            })}
          </Alert>
        </div>
      </Container>
    </ContentLayout>
  );
};

export default NotFound;
