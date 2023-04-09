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

import { Parameter } from '@aws-sdk/client-cloudformation';
import { Endpoint } from '@aws-sdk/client-redshift';
import { WorkgroupStatus } from '@aws-sdk/client-redshift-serverless';

export class ClickStreamBadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClickStreamBadRequestError';
    this.message = message;
  }
}

export class ApiResponse {
  readonly success: boolean;
  readonly message: string;

  constructor(success: boolean, message?: string) {
    this.success = success;
    this.message = message? message: '';
  }
}

export class ApiSuccess extends ApiResponse {
  readonly data?: any | never[];

  constructor(data: any | never[], message?: string) {
    super(true, message);
    this.data = data;
  }
}

export class ApiFail extends ApiResponse {
  readonly error?: any;

  constructor(message: string, error?: any) {
    super(false, message);
    this.error = error;
  }
}

export interface Policy {
  readonly Version: string;
  readonly Statement: PolicyStatement[];
}

export interface PolicyStatement {
  readonly Sid?: string;
  readonly Effect?: string;
  readonly Action?: string | string[];
  readonly Principal?: {
    [name: string]: any;
  };
  readonly Resource?: string | string[];
  readonly Condition?: any;
}

export interface ALBRegionMappingObject {
  [key: string]: {
    account: string;
  };
}

export interface StackData {
  Input: SfnStackInput;
  readonly Callback: SfnStackCallback;
}

export interface SfnStackInput {
  Action: string;
  readonly StackName: string;
  readonly TemplateURL: string;
  readonly Parameters: Parameter[];
}

export interface SfnStackCallback {
  readonly BucketName: string;
  readonly BucketPrefix: string;
}

export interface WorkflowTemplate {
  readonly Version: string;
  Workflow: WorkflowState;
}

export interface WorkflowState {
  Type: WorkflowStateType;
  Data?: StackData;
  readonly Branches?: WorkflowParallelBranch[];
  End?: boolean;
  Next?: string;
}

export enum WorkflowStateType {
  PASS = 'Pass',
  PARALLEL = 'Parallel',
  STACK = 'Stack',
}

export interface WorkflowParallelBranch {
  readonly StartAt: string;
  readonly States: {
    [name: string]: WorkflowState;
  };
}

export interface KeyVal<T> {
  [key: string]: T;
}

export interface ClickStreamRegion {
  readonly id: string;
}

export interface Certificate {
  readonly arn: string;
  readonly domain?: string;
  readonly id?: string;
  readonly name?: string;
}

export interface WorkGroup {
  readonly name: string;
  readonly description: string;
  readonly state: string;
  readonly engineVersion: string;
}

export interface ClickStreamVpc {
  readonly id: string;
  readonly name: string;
  readonly cidr: string;
  readonly isDefault: boolean;
}
export interface ClickStreamSubnet {
  readonly id: string;
  readonly name: string;
  readonly cidr: string;
  readonly availabilityZone: string;
  readonly type: string;
}

export interface IamRole {
  readonly name: string;
  readonly id: string;
  readonly arn: string;
}

export interface MSKCluster {
  readonly name: string;
  readonly arn: string;
  readonly type: string;
  readonly state: string;
  readonly securityGroupId: string;
}

export interface QuickSightUser {
  readonly userName: string;
  readonly role: string;
  readonly arn: string;
  readonly active: string;
  readonly email: string;
}

export interface RedshiftCluster {
  readonly name: string;
  readonly nodeType: string;
  readonly endpoint?: Endpoint;
  readonly status: string;
}

export interface RedshiftWorkgroup {
  readonly id: string;
  readonly arn: string;
  readonly name: string;
  readonly namespace: string;
  readonly status: WorkgroupStatus | string;
}

export interface Route53HostedZone {
  readonly id: string;
  readonly name: string;
}

export interface ClickStreamBucket {
  readonly name: string;
  readonly location: string;
}

export enum AssumeRoleType {
  ALL = 'All',
  SERVICE = 'Service',
  ACCOUNT = 'Account',
}