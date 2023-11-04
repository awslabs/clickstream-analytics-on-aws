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
import { Button, Alert, Container } from '@cloudscape-design/components';
import AppRouter from 'AppRouter';
import { getUserDetails } from 'apis/user';
import Loading from 'components/common/Loading';
import CommonLayout from 'components/layouts/CommonLayout';
import { UserContext } from 'context/UserContext';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from 'react-oidc-context';

const SignedInPage: React.FC = () => {
  const auth = useAuth();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<IUser>();

  const getCurrentUser = async () => {
    if (!auth.user?.profile.email) {
      return;
    }
    try {
      const { success, data }: ApiResponse<IUser> = await getUserDetails(
        auth.user?.profile.email
      );
      if (success) {
        setCurrentUser(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (auth.isAuthenticated) {
      getCurrentUser();
    }
  }, [auth.isAuthenticated]);

  if (auth.isLoading) {
    return <Loading isPage />;
  }

  if (auth.error) {
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
  }

  if (auth.isAuthenticated) {
    return (
      <UserContext.Provider value={currentUser}>
        <AppRouter auth={auth} />
      </UserContext.Provider>
    );
  }

  return (
    <div className="oidc-login">
      <div>
        <div className="title">{t('welcome')}</div>
      </div>
      {
        <div>
          <Button
            variant="primary"
            onClick={() => {
              auth.signinRedirect();
            }}
          >
            {t('button.signIn')}
          </Button>
        </div>
      }
    </div>
  );
};

export default SignedInPage;
