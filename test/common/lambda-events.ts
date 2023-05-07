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

import { CdkCustomResourceEvent } from 'aws-lambda';

export const basicCloudFormationEvent: CdkCustomResourceEvent = {
  RequestType: 'Create',
  ServiceToken: 'ServiceToken1',
  ResponseURL: '',
  StackId: 'stack1',
  RequestId: 'requestId-1',
  LogicalResourceId: 'logicalResouceId-1',
  ResourceType: '',
  ResourceProperties: {
    ServiceToken: 'ServiceToken1',
  },
};

export const basicCloudFormationUpdateEvent: CdkCustomResourceEvent = {
  RequestType: 'Update',
  ServiceToken: 'ServiceToken1',
  ResponseURL: '',
  StackId: 'stack1',
  RequestId: 'requestId-1',
  PhysicalResourceId: 'physicalResourceId-1',
  LogicalResourceId: 'logicalResouceId-1',
  ResourceType: '',
  ResourceProperties: {
    ServiceToken: 'ServiceToken1',
  },
  OldResourceProperties: {
  },
};


export const basicCloudFormationDeleteEvent: CdkCustomResourceEvent = {
  RequestType: 'Delete',
  ServiceToken: 'ServiceToken1',
  ResponseURL: '',
  StackId: 'stack1',
  RequestId: 'requestId-1',
  LogicalResourceId: 'logicalResouceId-1',
  PhysicalResourceId: 'physicalResourceId-1',
  ResourceType: '',
  ResourceProperties: {
    ServiceToken: 'ServiceToken1',
  },
};