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
import { CdkCustomResourceHandler, CdkCustomResourceEvent, CdkCustomResourceResponse } from 'aws-lambda';
import { logger } from '../../../common/powertools';
import { ServerlessRedshiftProps, ProvisionedRedshiftProps } from '../../private/model';

interface CustomProperties {
  readonly roleArn: string;
  readonly serverlessRedshiftProps?: ServerlessRedshiftProps | undefined;
  readonly provisionedRedshiftProps?: ProvisionedRedshiftProps | undefined;
}

type ResourcePropertiesType = CustomProperties & {
  readonly ServiceToken: string;
}

interface IamRole {
  applyStatus: string;
  iamRoleArn: string;
}

function parseIamRole(str: string): IamRole {
  const matches = str.match(/IamRole\(applyStatus=(.*), iamRoleArn=(.*)\)/);

  if (!matches || matches.length < 3) {
    throw new Error('Invalid IamRole string');
  }

  return {
    applyStatus: matches[1],
    iamRoleArn: matches[2],
  };
}

export const handler: CdkCustomResourceHandler = async (event: CdkCustomResourceEvent) => {
  logger.info(JSON.stringify(event));
  try {
    const resourceProps = event.ResourceProperties as ResourcePropertiesType;
    var roleToBeAssociated: string | undefined;
    var roleToBeUnassociated: string | undefined;

    var physicalRequestId: string | undefined;
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
      const client = new RedshiftServerlessClient({ });
      const getWorkgroup = new GetWorkgroupCommand({
        workgroupName: resourceProps.serverlessRedshiftProps.workgroupName,
      });
      const workgroupResp = await client.send(getWorkgroup);
      const namespaceName = workgroupResp.workgroup!.namespaceName!;
      const getWorkspace = new GetNamespaceCommand({
        namespaceName,
      });
      const getWorkspaceResp = await client.send(getWorkspace);
      const existingRoles = getWorkspaceResp.namespace!.iamRoles ?? [];
      const roles = existingRoles.map(roleStr => parseIamRole(roleStr))
        .filter(role => role.applyStatus !== 'removing').map(role => role.iamRoleArn);
      if (roleToBeUnassociated) {
        const index = roles.indexOf(roleToBeUnassociated, 0);
        if (index > -1) {
          roles.splice(index, 1);
        }
      }
      if (roleToBeAssociated) {
        roles.push(roleToBeAssociated);
      }

      var defaultRole: string | undefined = getWorkspaceResp.namespace!.defaultIamRoleArn;
      if (getWorkspaceResp.namespace!.defaultIamRoleArn == roleToBeUnassociated) {defaultRole = '';}
      if (!defaultRole && roleToBeAssociated) {defaultRole = roleToBeAssociated;}
      if (!defaultRole) {defaultRole = roles.length > 0 ? roles[0] : '';}

      const updateNamespace = new UpdateNamespaceCommand({
        namespaceName,
        iamRoles: roles,
        defaultIamRoleArn: defaultRole,
      });
      logger.debug('Update namespace command ', { updateNamespace });
      await client.send(updateNamespace);
    } else if (resourceProps.provisionedRedshiftProps) {
      throw new Error('Not implemented yet');
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