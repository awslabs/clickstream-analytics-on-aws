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

import { UserContext } from 'context/UserContext';
import AccessDenied from 'pages/error-page/AccessDenied';
import { ReactElement, useContext } from 'react';
import { IUserRole } from 'ts/const';

const RoleRoute = ({
  children,
  roles,
}: {
  children: ReactElement;
  roles: Array<IUserRole>;
}) => {
  const currentUser = useContext(UserContext);

  const userHasRequiredRole = !!(
    currentUser && roles.includes(currentUser.role)
  );

  if (!userHasRequiredRole) {
    return <AccessDenied />;
  }

  return children;
};

export default RoleRoute;
