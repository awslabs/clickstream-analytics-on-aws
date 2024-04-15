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

import { RedshiftClient, DescribeClustersCommand, ModifyClusterIamRolesCommand, ClusterIamRole } from '@aws-sdk/client-redshift';
import { RedshiftServerlessClient, GetWorkgroupCommand, UpdateNamespaceCommand } from '@aws-sdk/client-redshift-serverless';
import { CdkCustomResourceHandler, CdkCustomResourceEvent, CdkCustomResourceResponse } from 'aws-lambda';
import { getRedshiftServerlessNamespace } from './redshift-serverless';
import { logger } from '../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../common/sdk-client-config';
import { sleep } from '../../../common/utils';
import { AssociateIAMRoleToRedshift } from '../../private/model';

type ResourcePropertiesType = AssociateIAMRoleToRedshift & {
  ServiceToken: string;
};

function strToIamRole(str: string): ClusterIamRole {
  logger.debug('Parsing IAM role string: ', { str });

  const statusMatches = str.match(/applyStatus=([^,]+)[,|\)]/);
  if (!statusMatches || statusMatches.length < 2) {
    throw new Error('Invalid IamRole String ($str), can not extract status.');
  }

  const roleMatches = str.match(/iamRoleArn=([^,]+)[,|\)]/);
  if (!roleMatches || roleMatches.length < 2) {
    throw new Error('Invalid IamRole String ($str), can not extract role arn.');
  }

  return {
    ApplyStatus: statusMatches[1] as 'in-sync' | 'removing' | 'adding',
    IamRoleArn: roleMatches[1],
  };
}

function iamRoleToArn(iamRoles: ClusterIamRole[]): string[] {
  return iamRoles.filter(role => role.ApplyStatus !== 'removing').map(role => role.IamRoleArn!);
}

function getNewDefaultIAMRole(rolesToBeHaved: string[], rolesToBeAssociated?: string, roleToRemoved?: string,
  currentDefaultRole?: string): string | undefined {
  let defaultRole = currentDefaultRole;
  if (currentDefaultRole == roleToRemoved) {defaultRole = '';}
  if (!defaultRole && rolesToBeAssociated) {defaultRole = rolesToBeAssociated;}
  if (!defaultRole) {defaultRole = rolesToBeHaved.length > 0 ? rolesToBeHaved[0] : '';}

  return defaultRole;
}

function excludeToBeUnassociated(roles: string[], toBeUnassociated?: string): string[] {
  if (toBeUnassociated) {
    const index = roles.indexOf(toBeUnassociated, 0);
    if (index > -1) {
      roles.splice(index, 1);
    }
  }
  return roles;
}

export const handler: CdkCustomResourceHandler = async (event: CdkCustomResourceEvent) => {
  let physicalRequestId: string | undefined;
  try {
    const resourceProps = event.ResourceProperties as ResourcePropertiesType;
    let roleToBeAssociated: string | undefined;
    let roleToBeUnassociated: string | undefined;
    switch (event.RequestType) {
      case 'Create':
        physicalRequestId = 'redshift-associate-iam-role';
        roleToBeAssociated = resourceProps.roleArn;
        break;
      case 'Update':
        physicalRequestId = event.PhysicalResourceId;
        roleToBeAssociated = resourceProps.roleArn;
        const oldResourceProps = event.OldResourceProperties as ResourcePropertiesType;
        if (oldResourceProps) {roleToBeUnassociated = oldResourceProps.roleArn;}
        break;
      case 'Delete':
        physicalRequestId = event.PhysicalResourceId;
        roleToBeUnassociated = resourceProps.roleArn;
        break;
    }

    if (resourceProps.serverlessRedshiftProps) {
      await doServerlessRedshift(resourceProps.serverlessRedshiftProps.workgroupName,
        resourceProps.timeoutInSeconds, roleToBeAssociated, roleToBeUnassociated);
    } else if (resourceProps.provisionedRedshiftProps) {
      await doProvisionedRedshift(resourceProps.provisionedRedshiftProps.clusterIdentifier, roleToBeAssociated, roleToBeUnassociated);
    } else {
      const msg = 'Can\'t identity the mode Redshift cluster!';
      logger.error(msg);
      throw new Error(msg);
    }
  } catch (e) {
    if (e instanceof Error) {
      logger.error('Error when processing custom resource', e);
    }
    throw e;
  }
  const response: CdkCustomResourceResponse = {
    PhysicalResourceId: physicalRequestId,
    Data: {
    },
    Status: 'SUCCESS',
  };
  return response;
};

async function doServerlessRedshift(workgroupName: string, timeoutInSeconds: number,
  roleToBeAssociated: string | undefined, roleToBeUnassociated: string | undefined) {
  const client = new RedshiftServerlessClient({
    ...aws_sdk_client_common_config,
  });
  const getWorkgroup = new GetWorkgroupCommand({
    workgroupName: workgroupName,
  });
  const workgroupResp = await client.send(getWorkgroup);
  const namespaceName = workgroupResp.workgroup!.namespaceName!;
  const [iamRoles, defaultRoleArn] = await getRedshiftServerlessIAMRoles(namespaceName, client);
  const roles = excludeToBeUnassociated(
    iamRoleToArn(iamRoles), roleToBeUnassociated);
  if (roleToBeAssociated) {
    roles.push(roleToBeAssociated);
  }

  const defaultRole = getNewDefaultIAMRole(roles, roleToBeAssociated, roleToBeUnassociated, defaultRoleArn);

  const updateNamespace = new UpdateNamespaceCommand({
    namespaceName,
    iamRoles: roles,
    defaultIamRoleArn: defaultRole,
  });
  logger.info('Update namespace command ', { updateNamespace });
  await client.send(updateNamespace);

  if (roleToBeAssociated) {await waitForRedshiftServerlessIAMRolesUpdating(namespaceName, client, timeoutInSeconds);}
}

async function doProvisionedRedshift(clusterIdentifier: string,
  roleToBeAssociated: string | undefined, roleToBeUnassociated: string | undefined) {
  const client = new RedshiftClient({
    ...aws_sdk_client_common_config,
  });
  const getCluster = new DescribeClustersCommand({
    ClusterIdentifier: clusterIdentifier,
  });
  const cluster = (await client.send(getCluster)).Clusters![0];
  let defaultIAMRole = cluster.DefaultIamRoleArn;
  const updateIAM = new ModifyClusterIamRolesCommand({
    ClusterIdentifier: clusterIdentifier,
    AddIamRoles: roleToBeAssociated ? [roleToBeAssociated] : [],
    RemoveIamRoles: roleToBeUnassociated ? [roleToBeUnassociated] : [],
    DefaultIamRoleArn: getNewDefaultIAMRole([
      ...excludeToBeUnassociated(
        iamRoleToArn(cluster.IamRoles ?? []), roleToBeUnassociated),
      ...(roleToBeAssociated ? [roleToBeAssociated] : []),
    ], roleToBeAssociated, roleToBeUnassociated, defaultIAMRole),
  });
  logger.info('Updating iam roles of Redshift cluster', { updateIAM });
  await client.send(updateIAM);
}

async function getRedshiftServerlessIAMRoles(
  namespaceName: string, client: RedshiftServerlessClient): Promise<[ClusterIamRole[], string | undefined]> {
  const namespace = (await getRedshiftServerlessNamespace(client, namespaceName))!;
  const existingRoles = namespace.iamRoles ?? [];
  const iamRoles = existingRoles.map(roleStr => strToIamRole(roleStr));
  logger.info(`Got IAM roles of namespace ${namespaceName}`, { iamRoles });
  return [iamRoles, namespace.defaultIamRoleArn];
}

async function waitForRedshiftServerlessIAMRolesUpdating(
  namespaceName: string, client: RedshiftServerlessClient, timeoutInSeconds: number) {
  const timeoutRound = timeoutInSeconds > 50 ? Math.round(timeoutInSeconds / 5) : 10;
  for (const _i of Array(timeoutRound).keys()) {
    const [iamRoles] = await getRedshiftServerlessIAMRoles(namespaceName, client);
    if (iamRoles.every(iamRole => iamRole.ApplyStatus === 'in-sync')) {
      return;
    }
    await sleep(5000);
  }
}