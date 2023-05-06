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

export {};
declare global {
  interface IApplication {
    id?: string;
    type?: string;
    prefix?: string;

    projectId: string;
    appId: string;
    name: string;
    description: string;
    androidPackage: string;
    iosBundleId: string;
    iosAppStoreId: string;
    pipeline?: {
      id: string;
      name: string;
      status: {
        details: IStackStatus[];
        status: string;
      };
      endpoint: string;
      dns: string;
    };
    createAt?: number;
    updateAt?: number;
    operator?: string;
    deleted?: boolean;
  }
}
