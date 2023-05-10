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
  interface FetchOutsideResponse {
    data: any;
    ok: boolean;
    status: number;
  }

  interface RegionResponse {
    id: string;
    cn_name: string;
    en_name: string;
  }

  interface VPCResponse {
    cidr: string;
    id: string;
    isDefault: boolean;
    name: string;
  }

  interface SubnetResponse {
    id: string;
    name: string;
    cidr: string;
    availabilityZone: string;
    type: string;
  }

  interface SDKResponse {
    data: [{ name: string; value: string }];
    name: 'SDK_Type';
  }

  interface HostedZoneResponse {
    id: string;
    name: string;
  }

  interface S3Response {
    name: string;
  }

  interface MSKResponse {
    arn: string;
    name: string;
    securityGroupId: string;
    state: string;
    type: string;
    authentication: string[];
  }

  interface RedshiftResponse {
    endpoint: {
      Address: string;
      Port: string;
    };
    Port: string;
    name: string;
    nodeType: string;
    status: string;
    masterUsername: string;
  }

  interface RedshiftServerlessResponse {
    arn: string;
    id: string;
    name: string;
    namespace: string;
    status: string;
  }

  interface IAMRoleResponse {
    arn: string;
    id: string;
    name: string;
  }

  interface CetificateResponse {
    arn: string;
    domain: string;
  }

  interface QuickSightUserResponse {
    active: boolean;
    arn: string;
    email: string;
    role: string;
    userName: string;
  }

  interface SubscribeQuickSightResponse {
    IAMUser: boolean;
    accountName: string;
    directoryType: string;
    vpcConnectionsUrl: string;
  }

  interface SSMSecretRepoose {
    name: string;
    arn: string;
  }

  interface QuickSightDetailResponse {
    accountName: string;
    accountSubscriptionStatus: string;
    authenticationType: string;
    edition: string;
    notificationEmail: string;
  }

  interface SecurityGroupResponse {
    description: string;
    id: string;
    name: string;
  }

  interface UploadTokenResponse {
    AccessKeyId: string;
    Expiration: string;
    SecretAccessKey: string;
    SessionToken: string;
  }
}
