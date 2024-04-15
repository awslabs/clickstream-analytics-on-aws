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
import { Button } from '@cloudscape-design/components';
import AppRouter from 'AppRouter';
import { getSystemInfo } from 'apis/system';
import { getUserDetails } from 'apis/user';
import Loading from 'components/common/Loading';
import { SystemInfoContext } from 'context/SystemInfoContext';
import { UserContext } from 'context/UserContext';
import ReSignIn from 'pages/error-page/ReSignIn';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from 'react-oidc-context';
import { CLICK_STREAM_USER_DATA } from 'ts/const';

const SignedInPage: React.FC = () => {
  const auth = useAuth();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<IUser>();
  const [systemInfo, setSystemInfo] = useState<SystemInfo>();

  const getCurrentUser = async () => {
    if (!auth.user?.profile.email) {
      return;
    }
    try {
      const { success, data }: ApiResponse<IUser> = await getUserDetails(
        auth.user?.profile.email
      );
      if (success) {
        window.localStorage.setItem(
          CLICK_STREAM_USER_DATA,
          JSON.stringify(data)
        );
        setCurrentUser(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSystemInfo = async () => {
    try {
      const { success, data }: ApiResponse<SystemInfo> = await getSystemInfo();
      if (success) {
        setSystemInfo(data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (auth.isAuthenticated) {
      getCurrentUser();
      fetchSystemInfo();
    }
  }, [auth]);

  if (auth.isLoading) {
    return <Loading isPage />;
  }

  if (auth.error) {
    return (
      <>
        <ReSignIn auth={auth} />
        <AppRouter sessionExpired={true} auth={auth} />
      </>
    );
  }

  if (auth.isAuthenticated) {
    return (
      <UserContext.Provider value={currentUser}>
        <SystemInfoContext.Provider value={systemInfo}>
          <AppRouter auth={auth} sessionExpired={false} />
        </SystemInfoContext.Provider>
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
