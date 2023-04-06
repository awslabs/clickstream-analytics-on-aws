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

import { RedshiftServerlessClient, GetWorkgroupCommand, GetNamespaceCommand, UpdateNamespaceCommand } from '@aws-sdk/client-redshift-serverless';
import { CdkCustomResourceCallback, CdkCustomResourceResponse, CloudFormationCustomResourceUpdateEvent, CloudFormationCustomResourceDeleteEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { getMockContext } from './context';
import { basicCloudFormationEvent } from './event';
import { handler } from '../../../../src/analytics/lambdas/custom-resource/redshift-associate-iam-role';
import 'aws-sdk-client-mock-jest';

describe('Custom resource - Associate IAM role to redshift cluster', () => {

  const context = getMockContext();
  const callback: CdkCustomResourceCallback = async (_response) => {};
  const redshiftServerlessMock = mockClient(RedshiftServerlessClient);

  const workgroupName = 'demo';
  const namespaceName = 'myNamespace';
  const copyRole = 'arn:aws:iam::1234567890:role/CopyRole';
  const copyRole2 = 'arn:aws:iam::1234567890:role/CopyRole2';

  const createEventForServerless = {
    ...basicCloudFormationEvent,
    ResourceProperties: {
      ...basicCloudFormationEvent.ResourceProperties,
      roleArn: copyRole,
      serverlessRedshiftProps: {
        workgroupName: workgroupName,
      },
    },
  };

  const updateEventForServerless: CloudFormationCustomResourceUpdateEvent = {
    ...basicCloudFormationEvent,
    OldResourceProperties: createEventForServerless.ResourceProperties,
    ResourceProperties: {
      ...basicCloudFormationEvent.ResourceProperties,
      roleArn: copyRole2,
      serverlessRedshiftProps: {
        workgroupName: workgroupName,
      },
    },
    PhysicalResourceId: 'physical-resource-id',
    RequestType: 'Update',
  };

  const deleteEventForServerless: CloudFormationCustomResourceDeleteEvent = {
    ...basicCloudFormationEvent,
    ResourceProperties: {
      ...basicCloudFormationEvent.ResourceProperties,
      roleArn: copyRole,
      serverlessRedshiftProps: {
        workgroupName: workgroupName,
      },
    },
    PhysicalResourceId: 'physical-resource-id',
    RequestType: 'Delete',
  };

  beforeEach(() => {
    redshiftServerlessMock.reset();
  });

  test('Associate to redshift serverless workgroup without existing IAM roles', async () => {
    redshiftServerlessMock.on(GetWorkgroupCommand, {
      workgroupName,
    }).resolvesOnce({
      workgroup: {
        namespaceName: namespaceName,
      },
    });
    redshiftServerlessMock.on(GetNamespaceCommand, {
      namespaceName,
    }).resolvesOnce({
      namespace: {
        namespaceName,
        iamRoles: [],
      },
    });
    redshiftServerlessMock.on(UpdateNamespaceCommand).resolvesOnce({});
    const resp = await handler(createEventForServerless, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftServerlessMock).toHaveReceivedCommandTimes(GetWorkgroupCommand, 1);
    expect(redshiftServerlessMock).toHaveReceivedCommandTimes(GetNamespaceCommand, 1);
    expect(redshiftServerlessMock).toHaveReceivedCommandWith(UpdateNamespaceCommand, {
      namespaceName,
      iamRoles: [
        copyRole,
      ],
      defaultIamRoleArn: copyRole,
    });
  });

  test('Associate to redshift serverless workgroup with existing IAM roles', async () => {
    const existingIAMRoles = [
      'arn:aws:iam::1234567890:role/redshift-role-1',
      'arn:aws:iam::1234567890:role/redshift-role-2',
    ];
    redshiftServerlessMock.on(GetWorkgroupCommand, {
      workgroupName,
    }).resolvesOnce({
      workgroup: {
        namespaceName: namespaceName,
      },
    });
    redshiftServerlessMock.on(GetNamespaceCommand, {
      namespaceName,
    }).resolvesOnce({
      namespace: {
        iamRoles: existingIAMRoles.map(role => `IamRole(applyStatus=in-sync, iamRoleArn=${role})`),
        defaultIamRoleArn: existingIAMRoles[1],
      },
    });
    redshiftServerlessMock.on(UpdateNamespaceCommand).resolvesOnce({});
    const resp = await handler(createEventForServerless, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftServerlessMock).toHaveReceivedCommandTimes(GetWorkgroupCommand, 1);
    expect(redshiftServerlessMock).toHaveReceivedCommandTimes(GetNamespaceCommand, 1);
    expect(redshiftServerlessMock).toHaveReceivedCommandWith(UpdateNamespaceCommand, {
      namespaceName: namespaceName,
      iamRoles: [
        ...existingIAMRoles,
        copyRole,
      ],
      defaultIamRoleArn: existingIAMRoles[1],
    });
  });

  test('Updating the association to redshift serverless workgroup without existing roles', async () => {
    const existingIAMRoles = [
      copyRole,
    ];
    redshiftServerlessMock.on(GetWorkgroupCommand).resolvesOnce({
      workgroup: {
        namespaceName: namespaceName,
      },
    });
    redshiftServerlessMock.on(GetNamespaceCommand).resolvesOnce({
      namespace: {
        iamRoles: existingIAMRoles.map(role => `IamRole(applyStatus=in-sync, iamRoleArn=${role})`),
      },
    });
    redshiftServerlessMock.on(UpdateNamespaceCommand).resolvesOnce({});
    const resp = await handler(updateEventForServerless, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftServerlessMock).toHaveReceivedCommandWith(GetWorkgroupCommand, {
      workgroupName,
    });
    expect(redshiftServerlessMock).toHaveReceivedCommandWith(GetNamespaceCommand, {
      namespaceName,
    });
    expect(redshiftServerlessMock).toHaveReceivedCommandWith(UpdateNamespaceCommand, {
      namespaceName,
      iamRoles: [
        copyRole2,
      ],
      defaultIamRoleArn: copyRole2,
    });
  });

  test('Updating the association to redshift serverless workgroup with existing roles, the default is old role', async () => {
    const existingIAMRoles = [
      copyRole,
      'arn:aws:iam::1234567890:role/redshift-role-1',
      'arn:aws:iam::1234567890:role/redshift-role-2',
    ];
    redshiftServerlessMock.on(GetWorkgroupCommand).resolvesOnce({
      workgroup: {
        namespaceName: namespaceName,
      },
    });
    redshiftServerlessMock.on(GetNamespaceCommand).resolvesOnce({
      namespace: {
        iamRoles: existingIAMRoles.map(role => `IamRole(applyStatus=in-sync, iamRoleArn=${role})`),
        defaultIamRoleArn: copyRole,
      },
    });
    redshiftServerlessMock.on(UpdateNamespaceCommand).resolvesOnce({});
    const resp = await handler(updateEventForServerless, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftServerlessMock).toHaveReceivedCommandWith(GetWorkgroupCommand, {
      workgroupName,
    });
    expect(redshiftServerlessMock).toHaveReceivedCommandWith(GetNamespaceCommand, {
      namespaceName,
    });
    expect(redshiftServerlessMock).toHaveReceivedCommandWith(UpdateNamespaceCommand, {
      namespaceName,
      iamRoles: [
        'arn:aws:iam::1234567890:role/redshift-role-1',
        'arn:aws:iam::1234567890:role/redshift-role-2',
        copyRole2,
      ],
      defaultIamRoleArn: copyRole2,
    });
  });

  test('Updating the association to redshift serverless workgroup with existing roles, the default is another role', async () => {
    const existingIAMRoles = [
      copyRole,
      'arn:aws:iam::1234567890:role/redshift-role-1',
      'arn:aws:iam::1234567890:role/redshift-role-2',
    ];
    redshiftServerlessMock.on(GetWorkgroupCommand).resolvesOnce({
      workgroup: {
        namespaceName: namespaceName,
      },
    });
    redshiftServerlessMock.on(GetNamespaceCommand).resolvesOnce({
      namespace: {
        iamRoles: existingIAMRoles.map(role => `IamRole(applyStatus=in-sync, iamRoleArn=${role})`),
        defaultIamRoleArn: 'arn:aws:iam::1234567890:role/redshift-role-1',
      },
    });
    redshiftServerlessMock.on(UpdateNamespaceCommand).resolvesOnce({});
    const resp = await handler(updateEventForServerless, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftServerlessMock).toHaveReceivedCommandWith(GetWorkgroupCommand, {
      workgroupName,
    });
    expect(redshiftServerlessMock).toHaveReceivedCommandWith(GetNamespaceCommand, {
      namespaceName,
    });
    expect(redshiftServerlessMock).toHaveReceivedCommandWith(UpdateNamespaceCommand, {
      namespaceName,
      iamRoles: [
        'arn:aws:iam::1234567890:role/redshift-role-1',
        'arn:aws:iam::1234567890:role/redshift-role-2',
        copyRole2,
      ],
      defaultIamRoleArn: 'arn:aws:iam::1234567890:role/redshift-role-1',
    });
  });

  test('Deleting the association to redshift serverless workgroup without other roles', async () => {
    const existingIAMRoles = [
      copyRole,
    ];
    redshiftServerlessMock.on(GetWorkgroupCommand).resolvesOnce({
      workgroup: {
        namespaceName: namespaceName,
      },
    });
    redshiftServerlessMock.on(GetNamespaceCommand).resolvesOnce({
      namespace: {
        iamRoles: existingIAMRoles.map(role => `IamRole(applyStatus=in-sync, iamRoleArn=${role})`),
        defaultIamRoleArn: copyRole,
      },
    });
    redshiftServerlessMock.on(UpdateNamespaceCommand).resolvesOnce({});
    const resp = await handler(deleteEventForServerless, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftServerlessMock).toHaveReceivedCommandWith(GetWorkgroupCommand, {
      workgroupName,
    });
    expect(redshiftServerlessMock).toHaveReceivedCommandWith(GetNamespaceCommand, {
      namespaceName,
    });
    expect(redshiftServerlessMock).toHaveReceivedCommandWith(UpdateNamespaceCommand, {
      namespaceName,
      iamRoles: [],
      defaultIamRoleArn: '',
    });
  });

  test('Deleting the association to redshift serverless workgroup with other roles', async () => {
    const existingIAMRoles = [
      copyRole,
      copyRole2,
    ];
    redshiftServerlessMock.on(GetWorkgroupCommand).resolvesOnce({
      workgroup: {
        namespaceName: namespaceName,
      },
    });
    redshiftServerlessMock.on(GetNamespaceCommand).resolvesOnce({
      namespace: {
        iamRoles: existingIAMRoles.map(role => `IamRole(applyStatus=in-sync, iamRoleArn=${role})`),
        defaultIamRoleArn: copyRole,
      },
    });
    redshiftServerlessMock.on(UpdateNamespaceCommand).resolvesOnce({});
    const resp = await handler(deleteEventForServerless, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftServerlessMock).toHaveReceivedCommandWith(GetWorkgroupCommand, {
      workgroupName,
    });
    expect(redshiftServerlessMock).toHaveReceivedCommandWith(GetNamespaceCommand, {
      namespaceName,
    });
    expect(redshiftServerlessMock).toHaveReceivedCommandWith(UpdateNamespaceCommand, {
      namespaceName,
      iamRoles: [
        copyRole2,
      ],
      defaultIamRoleArn: copyRole2,
    });
  });

  test('Error when calling redshift serverless API', async () => {
    const existingIAMRoles = [
      'arn:aws:iam::1234567890:role/redshift-role-1',
      'arn:aws:iam::1234567890:role/redshift-role-2',
    ];
    redshiftServerlessMock.on(GetWorkgroupCommand, {
      workgroupName,
    }).resolvesOnce({
      workgroup: {
        namespaceName: namespaceName,
      },
    });
    redshiftServerlessMock.on(GetNamespaceCommand, {
      namespaceName,
    }).resolvesOnce({
      namespace: {
        iamRoles: existingIAMRoles.map(role => `IamRole(applyStatus=in-sync, iamRoleArn=${role})`),
      },
    });
    redshiftServerlessMock.on(UpdateNamespaceCommand).rejects();
    try {
      await handler(createEventForServerless, context, callback) as CdkCustomResourceResponse;
      fail('The redshift-serverless API error was caught that is not expected behavior');
    } catch (error) {
      expect(redshiftServerlessMock).toHaveReceivedCommandTimes(GetWorkgroupCommand, 1);
      expect(redshiftServerlessMock).toHaveReceivedCommandTimes(GetNamespaceCommand, 1);
      expect(redshiftServerlessMock).toHaveReceivedCommandWith(UpdateNamespaceCommand, {
        namespaceName,
        iamRoles: [
          'arn:aws:iam::1234567890:role/redshift-role-1',
          'arn:aws:iam::1234567890:role/redshift-role-2',
          copyRole,
        ],
        defaultIamRoleArn: copyRole,
      });
    }
  });

  const createEventForProvisionedCluster = {
    ...basicCloudFormationEvent,
    ResourceProperties: {
      ...basicCloudFormationEvent.ResourceProperties,
      roleArn: copyRole,
      provisionedRedshiftProps: {
        clusterIdentifier: 'cluster-1',
        dbUser: 'aUser',
      },
    },
  };

  test('Associate to redshift provisioned cluster without existing IAM roles', async () => {
    try {
      await handler(createEventForProvisionedCluster, context, callback) as CdkCustomResourceResponse;
      fail('The non implemented error was caught');
    } catch (error) {
      expect(redshiftServerlessMock).toHaveReceivedCommandTimes(GetWorkgroupCommand, 0);
      expect(redshiftServerlessMock).toHaveReceivedCommandTimes(GetNamespaceCommand, 0);
      expect(redshiftServerlessMock).toHaveReceivedCommandTimes(UpdateNamespaceCommand, 0);
    }
  });

  test('Associate with unknown redshift cluster info', async () => {
    try {
      await handler(basicCloudFormationEvent, context, callback) as CdkCustomResourceResponse;
      fail('The no redshift info error was caught');
    } catch (error) {
      expect(redshiftServerlessMock).toHaveReceivedCommandTimes(GetWorkgroupCommand, 0);
      expect(redshiftServerlessMock).toHaveReceivedCommandTimes(GetNamespaceCommand, 0);
      expect(redshiftServerlessMock).toHaveReceivedCommandTimes(UpdateNamespaceCommand, 0);
    }
  });
});