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

import AnalyticsLayout from 'components/layouts/AnalyticsLayout';
import CommonLayout from 'components/layouts/CommonLayout';
import { UserContext } from 'context/UserContext';
import AccessDenied from 'pages/error-page/AccessDenied';
import { ReactElement, useContext } from 'react';
import { AuthContextProps } from 'react-oidc-context';
import { IUserRole } from 'ts/const';
import { getIntersectArrays, getUserInfoFromLocalStorage } from 'ts/utils';
import Loading from './Loading';

const RoleRoute = ({
  layout,
  auth,
  children,
  roles,
}: {
  auth: AuthContextProps;
  layout: 'common' | 'analytics' | 'none';
  children: ReactElement;
  roles: Array<IUserRole>;
}) => {
  const currentUser = useContext(UserContext) ?? getUserInfoFromLocalStorage();

  const userHasRequiredRole = !!(
    currentUser && getIntersectArrays(roles, currentUser.roles).length > 0
  );

  if (!currentUser) {
    return <Loading isPage />;
  }

  if (!userHasRequiredRole) {
    if (layout === 'analytics') {
      return (
        <AnalyticsLayout auth={auth}>
          <AccessDenied />
        </AnalyticsLayout>
      );
    }
    return (
      <CommonLayout auth={auth}>
        <AccessDenied />
      </CommonLayout>
    );
  }

  if (layout === 'none') {
    return children;
  }

  if (layout === 'common') {
    return <CommonLayout auth={auth}>{children}</CommonLayout>;
  }

  if (layout === 'analytics') {
    return <AnalyticsLayout auth={auth}>{children}</AnalyticsLayout>;
  }

  return children;
};

export default RoleRoute;
