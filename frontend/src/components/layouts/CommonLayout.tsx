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

import Header from 'components/layouts/Header';
import React, { ReactElement } from 'react';
import { AuthContextProps } from 'react-oidc-context';
import { PROJECT_CONFIG_JSON } from 'ts/const';
import Footer from './Footer';
interface CommonLayoutProps {
  auth: AuthContextProps;
  children: ReactElement;
}

const CommonLayout: React.FC<CommonLayoutProps> = (
  props: CommonLayoutProps
) => {
  const { auth, children } = props;
  return (
    <>
      <div id="b">
        <Header
          user={auth.user}
          signOut={() => {
            auth.removeUser();
            localStorage.removeItem(PROJECT_CONFIG_JSON);
          }}
        />
        <div id="app">{children}</div>
      </div>
      <Footer />
    </>
  );
};

export default CommonLayout;
