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

import { CreateNamespaceCommand, DeleteNamespaceCommand, Namespace, NamespaceStatus, RedshiftServerlessClient, ResourceNotFoundException, Tag } from '@aws-sdk/client-redshift-serverless';
import { fromTemporaryCredentials } from '@aws-sdk/credential-providers';
import { CdkCustomResourceEvent, CdkCustomResourceHandler, CdkCustomResourceResponse, Context } from 'aws-lambda';
import { getRedshiftServerlessNamespace } from './redshift-serverless';
import { getFunctionTags } from '../../../common/lambda/tags';
import { logger } from '../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../common/sdk-client-config';
import { sleep } from '../../../common/utils';
import { NewNamespaceCustomProperties } from '../../private/model';

type ResourcePropertiesType = NewNamespaceCustomProperties & {
  readonly ServiceToken: string;
}

export const handler: CdkCustomResourceHandler = async (event: CdkCustomResourceEvent, context: Context) => {
  const resourceProps = event.ResourceProperties as ResourcePropertiesType;
  const physicalRequestId = `redshift-serverless-namespace-${resourceProps.namespaceName}`;
  let namespace: Namespace | undefined;

  const client = getRedshiftServerlessClient(resourceProps.adminRoleArn);
  try {
    switch (event.RequestType) {
      case 'Create':
      case 'Update':
        namespace = (await doUpdate(event, context, client))!;
        break;
      case 'Delete':
        const oldNamespace = (await deleteNamespace(client, resourceProps))!;
        await waitForRedshiftServerlessNamespaceStatus(client, oldNamespace.namespaceName!);
        break;
    }
  } catch (e) {
    if (event.RequestType == 'Delete') {
      if (e instanceof ResourceNotFoundException) {
        logger.info(`Namespace ${resourceProps.namespaceName} has been deleted.`);
      }
    } else {
      if (e instanceof Error) {
        logger.error('Error when creating redshift serverless cluster.', e);
      }
      throw e;
    }
  }

  const response: CdkCustomResourceResponse = {
    PhysicalResourceId: physicalRequestId,
    Data: {
      NamespaceId: namespace?.namespaceId,
      NamespaceName: namespace?.namespaceName,
      DatabaseName: namespace?.dbName,
    },
    Status: 'SUCCESS',
  };
  return response;
};

async function doUpdate(event: CdkCustomResourceEvent, context: Context, client: RedshiftServerlessClient) {
  const resourceProps = event.ResourceProperties as ResourcePropertiesType;
  const physicalRequestId = `redshift-serverless-namespace-${resourceProps.namespaceName}`;
  let namespace: Namespace | undefined;

  if ('PhysicalResourceId' in event && physicalRequestId == event.PhysicalResourceId) {
    // can not update the namespace name and default database of redshift-serverless
    namespace = await waitForRedshiftServerlessNamespaceStatus(client, resourceProps.namespaceName);
  } else {
    const funcTags = await getFunctionTags(context);
    const tags: Tag[] = funcTags ? Object.entries(funcTags).map(([key, value]) => ({ key, value })) : [];
    namespace = (await createNamespace(client, resourceProps, tags))!;
    if (namespace.status != NamespaceStatus.AVAILABLE) {
      await waitForRedshiftServerlessNamespaceStatus(client, namespace.namespaceName!);
    }
  }
  return namespace;
}

async function createNamespace(client: RedshiftServerlessClient, props: ResourcePropertiesType, tags: Tag[]): Promise<Namespace | undefined> {
  const input = { // CreateNamespace
    dbName: props.databaseName,
    namespaceName: props.namespaceName,
    tags,
  };
  logger.info('Creating redshift serverless namespace with input', { input });
  const command = new CreateNamespaceCommand(input);
  const response = await client.send(command);
  return response.namespace!;
}

//creeat function updateNamespace like createNamespace
async function deleteNamespace(client: RedshiftServerlessClient, props: ResourcePropertiesType): Promise<Namespace | undefined> {
  const input = { // DeleteNamespace
    namespaceName: props.namespaceName,
  };
  logger.info('Deleting redshift serverless namespace with input', { input });
  const command = new DeleteNamespaceCommand(input);
  const response = await client.send(command);
  return response.namespace!;
}

export function getRedshiftServerlessClient(roleArn: string) {
  return new RedshiftServerlessClient({
    ...aws_sdk_client_common_config,
    credentials: fromTemporaryCredentials({
      // Required. Options passed to STS AssumeRole operation.
      params: {
        // Required. ARN of role to assume.
        RoleArn: roleArn,
        // Optional. An identifier for the assumed role session. If skipped, it generates a random
        // session name with prefix of 'aws-sdk-js-'.
        RoleSessionName: 'redshift-serverless-api-in-clickstream',
        // Optional. The duration, in seconds, of the role session.
        DurationSeconds: 900,
      },
    }),
  });
}

async function waitForRedshiftServerlessNamespaceStatus(
  client: RedshiftServerlessClient, namespaceName: string): Promise<Namespace | undefined> {
  for (const _i of Array(10).keys()) {
    const namespace = (await getRedshiftServerlessNamespace(client, namespaceName))!;
    if (namespace.status === NamespaceStatus.AVAILABLE) {
      return namespace;
    }
    await sleep(3000);
  }
  throw new Error(`Namespace ${namespaceName} is not available.`);
}