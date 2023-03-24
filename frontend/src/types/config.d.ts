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
  type AlertType = 'error' | 'warning' | 'info' | 'success';

  interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    error: string;
  }

  interface ResponseTableData<T> {
    totalCount: number;
    items: Array<T>;
  }

  interface ResponseCreate {
    id: string;
  }

  interface CommonAlertProps {
    alertTxt: string;
    alertType: AlertType;
  }

  interface ConfigType {
    oidc_provider: string;
    oidc_client_id: string;
    oidc_redirect_url: string;
    oidc_logout_endpoint: string;
    project_region: string;
    solution_version: string;
  }
}
