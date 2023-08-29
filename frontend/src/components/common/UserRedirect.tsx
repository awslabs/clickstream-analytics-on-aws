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
import React, { useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { IUserRole } from 'ts/const';

const UserRedirect: React.FC = () => {
  const location = useLocation();
  const currentUser = useContext(UserContext);

  const redirectUrl = () => {
    console.log(currentUser);
    if (location.pathname.startsWith('/analytics')) {
      if (currentUser?.role === IUserRole.DEVELOPER) {
        window.location.href = '/';
      }
    } else if (location.pathname !== '/signin') {
      if (currentUser?.role === IUserRole.ANALYST) {
        window.location.href = '/analytics';
      }
    }
  };

  useEffect(() => {
    redirectUrl();
  }, []);

  return <div></div>;
};

export default UserRedirect;
