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
import { CreateNamespaceCommand, DeleteNamespaceCommand, GetNamespaceCommand, Namespace, NamespaceStatus, RedshiftServerlessClient, ResourceNotFoundException, UpdateNamespaceCommand } from '@aws-sdk/client-redshift-serverless';
import { CdkCustomResourceEvent, CdkCustomResourceCallback, CdkCustomResourceResponse } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { handler } from '../../../../../src/analytics/lambdas/custom-resource/create-redshift-namespace';
import 'aws-sdk-client-mock-jest';
import { getMockContext } from '../../../../common/lambda-context';
import { basicCloudFormationEvent } from '../../../../common/lambda-events';

describe('Custom resource - Create redshift serverless namespace', () => {

  const context = getMockContext();
  const callback: CdkCustomResourceCallback = async (_response) => {};

  const redshiftServerlessMock = mockClient(RedshiftServerlessClient);

  const namespaceName = 'clickstream';
  const dbName = 'myDB';
  const basicEvent = {
    ...basicCloudFormationEvent,
    ResourceProperties: {
      ...basicCloudFormationEvent.ResourceProperties,
      adminRoleArn: 'arn:aws:iam::1234567890:role/NamespaceAdminRole',
      namespaceName: namespaceName,
      databaseName: dbName,
    },
  };

  const createNamespaceEvent: CdkCustomResourceEvent = {
    ...basicEvent,
  };

  const existingPhysicalId = `redshift-serverless-namespace-${namespaceName}`;
  const updateNamespaceEvent: CdkCustomResourceEvent = {
    ...createNamespaceEvent,
    OldResourceProperties: createNamespaceEvent.ResourceProperties,
    ResourceProperties: {
      ...createNamespaceEvent.ResourceProperties,
      namespaceName: 'newNamespace',
    },
    PhysicalResourceId: existingPhysicalId,
    RequestType: 'Update',
  };

  const deleteNamespaceEvent: CdkCustomResourceEvent = {
    ...createNamespaceEvent,
    PhysicalResourceId: existingPhysicalId,
    RequestType: 'Delete',
  };

  beforeEach(() => {
    redshiftServerlessMock.reset();
  });

  const mockNamespace: Namespace = {
    namespaceArn: 'arn:aws:redshift-serverless:us-east-1:1234567890:namespace/clickstream',
    namespaceId: 'xxx-yyy-123',
    namespaceName: namespaceName,
    dbName: dbName,
    iamRoles: [],
    status: NamespaceStatus.MODIFYING,
  };

  test('Create a new namespace for Redshift serverless workgroup with waiting for status check.', async () => {
    redshiftServerlessMock.on(CreateNamespaceCommand).resolvesOnce({
      namespace: mockNamespace,
    });
    redshiftServerlessMock.on(GetNamespaceCommand).resolvesOnce({
      namespace: {
        ...mockNamespace,
        status: NamespaceStatus.AVAILABLE,
      },
    });
    const resp = await handler(createNamespaceEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftServerlessMock).toHaveReceivedNthSpecificCommandWith(1, CreateNamespaceCommand, {
      dbName,
      namespaceName: namespaceName,
    });
    expect(redshiftServerlessMock).toHaveReceivedCommandTimes(GetNamespaceCommand, 1);
  });

  test('Create a new namespace for Redshift serverless workgroup without waiting for status check.', async () => {
    redshiftServerlessMock.on(CreateNamespaceCommand).resolvesOnce({
      namespace: {
        ...mockNamespace,
        status: NamespaceStatus.AVAILABLE,
      },
    });
    redshiftServerlessMock.on(GetNamespaceCommand).rejects();
    const resp = await handler(createNamespaceEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftServerlessMock).toHaveReceivedNthSpecificCommandWith(1, CreateNamespaceCommand, {
      dbName,
      namespaceName: namespaceName,
    });
    expect(redshiftServerlessMock).toHaveReceivedCommandTimes(GetNamespaceCommand, 0);
  });

  test('Create a new namespace for Redshift serverless workgroup with waiting for status check multiple times.', async () => {
    redshiftServerlessMock.on(CreateNamespaceCommand).resolvesOnce({
      namespace: mockNamespace,
    });
    redshiftServerlessMock.on(GetNamespaceCommand).resolvesOnce({
      namespace: mockNamespace,
    }).resolvesOnce({
      namespace: mockNamespace,
    }).resolvesOnce({
      namespace: {
        ...mockNamespace,
        status: NamespaceStatus.AVAILABLE,
      },
    });
    const resp = await handler(createNamespaceEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftServerlessMock).toHaveReceivedNthSpecificCommandWith(1, CreateNamespaceCommand, {
      dbName,
      namespaceName: namespaceName,
    });
    expect(redshiftServerlessMock).toHaveReceivedCommandTimes(GetNamespaceCommand, 3);
  }, 10000);

  test('Update a new namespace for Redshift serverless workgroup with same namespace name.', async () => {
    redshiftServerlessMock.on(CreateNamespaceCommand).rejects();
    redshiftServerlessMock.on(GetNamespaceCommand).resolvesOnce({
      namespace: {
        ...mockNamespace,
        status: NamespaceStatus.AVAILABLE,
      },
    });
    const resp = await handler({
      ...updateNamespaceEvent,
      ResourceProperties: {
        ...updateNamespaceEvent.ResourceProperties,
        namespaceName: namespaceName,
      },
    }, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftServerlessMock).toHaveReceivedCommandTimes(UpdateNamespaceCommand, 0);
    expect(redshiftServerlessMock).toHaveReceivedCommandTimes(CreateNamespaceCommand, 0);
    expect(redshiftServerlessMock).toHaveReceivedCommandTimes(GetNamespaceCommand, 1);
  });

  test('Update a new namespace for Redshift serverless workgroup with different namespace name.', async () => {
    const newNamespace = updateNamespaceEvent.ResourceProperties.namespaceName;
    redshiftServerlessMock.on(CreateNamespaceCommand).resolvesOnce({
      namespace: {
        ...mockNamespace,
        namespaceName: newNamespace,
        status: NamespaceStatus.AVAILABLE,
      },
    });
    redshiftServerlessMock.on(GetNamespaceCommand).resolvesOnce({
      namespace: {
        ...mockNamespace,
        status: NamespaceStatus.AVAILABLE,
      },
    });
    const resp = await handler(updateNamespaceEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(resp.PhysicalResourceId).toEqual(`redshift-serverless-namespace-${newNamespace}`);
    expect(redshiftServerlessMock).toHaveReceivedNthSpecificCommandWith(1, CreateNamespaceCommand, {
      dbName,
      namespaceName: newNamespace,
    });
    expect(redshiftServerlessMock).toHaveReceivedCommandTimes(UpdateNamespaceCommand, 0);
    expect(redshiftServerlessMock).toHaveReceivedCommandTimes(GetNamespaceCommand, 0);
  });

  test('Delete an existing namespace of Redshift serverless', async () => {
    redshiftServerlessMock.on(CreateNamespaceCommand).rejects();
    redshiftServerlessMock.on(DeleteNamespaceCommand).resolvesOnce({
      namespace: {
        ...mockNamespace,
        status: NamespaceStatus.DELETING,
      },
    });
    redshiftServerlessMock.on(GetNamespaceCommand).resolvesOnce({
      namespace: {
        ...mockNamespace,
        status: NamespaceStatus.DELETING,
      },
    }).rejectsOnce(new ResourceNotFoundException({
      message: 'Resource not found',
      $metadata: {
        httpStatusCode: 404,
      },
    }));

    const resp = await handler(deleteNamespaceEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftServerlessMock).toHaveReceivedNthSpecificCommandWith(1, DeleteNamespaceCommand, {
      namespaceName,
    });
    expect(redshiftServerlessMock).toHaveReceivedCommandTimes(UpdateNamespaceCommand, 0);
    expect(redshiftServerlessMock).toHaveReceivedCommandTimes(GetNamespaceCommand, 2);
  }, 8000);

  test('Delete a non-existing namespace of Redshift serverless', async () => {
    redshiftServerlessMock.on(CreateNamespaceCommand).rejects();
    redshiftServerlessMock.on(DeleteNamespaceCommand).rejectsOnce(new ResourceNotFoundException({
      message: 'Resource not found',
      $metadata: {
        httpStatusCode: 404,
      },
    }));
    redshiftServerlessMock.on(GetNamespaceCommand).rejects();

    const resp = await handler(deleteNamespaceEvent, context, callback) as CdkCustomResourceResponse;
    expect(resp.Status).toEqual('SUCCESS');
    expect(redshiftServerlessMock).toHaveReceivedNthSpecificCommandWith(1, DeleteNamespaceCommand, {
      namespaceName,
    });
    expect(redshiftServerlessMock).toHaveReceivedCommandTimes(UpdateNamespaceCommand, 0);
    expect(redshiftServerlessMock).toHaveReceivedCommandTimes(GetNamespaceCommand, 0);
  });

});
