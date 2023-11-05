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

import { Container, Alert, Button } from '@cloudscape-design/components';
import CommonLayout from 'components/layouts/CommonLayout';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AuthContextProps } from 'react-oidc-context';

interface ReSignInProps {
  auth: AuthContextProps;
}

const ReSignIn: React.FC<ReSignInProps> = (props: ReSignInProps) => {
  const { auth } = props;
  const { t } = useTranslation();
  return (
    <CommonLayout auth={auth}>
      <Container>
        <div className="mt-10">
          <Alert
            action={
              <Button
                onClick={() => {
                  window.location.reload();
                }}
              >
                {t('button.reload')}
              </Button>
            }
            statusIconAriaLabel="Error"
            type="warning"
            header={t('header.reSignIn')}
          >
            {t('header.reSignInDesc')}
          </Alert>
        </div>
      </Container>
    </CommonLayout>
  );
};

export default ReSignIn;
