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

import { Aws, CfnCondition, CfnResource, Fn, IAspect, Stack } from 'aws-cdk-lib';
import { CfnRole, Role } from 'aws-cdk-lib/aws-iam';
import { IConstruct } from 'constructs';
import { addCfnNagSuppressRules } from './cfn-nag';
import { getShortIdOfStackWithRegion } from './stack';

export class RolePermissionBoundaryAspect implements IAspect {
  readonly permissionBoundary: string;
  private conditionCache: { [key: string]: CfnCondition } = {};

  constructor(permissionBoundary: string) {
    this.permissionBoundary = permissionBoundary;
  }

  public visit(node: IConstruct): void {
    if (this.permissionBoundary && CfnResource.isCfnResource(node) && node.cfnResourceType === 'AWS::IAM::Role') {
      node.addPropertyOverride('PermissionsBoundary',
        Fn.conditionIf(
          this.isEmptyPermissionBoundaryCondition(Stack.of(node), this.permissionBoundary).logicalId,
          Aws.NO_VALUE,
          this.permissionBoundary,
        ),
      );
    }
  }

  private isEmptyPermissionBoundaryCondition(stack: Stack, permissionBoundary: string): CfnCondition {
    const existingCondition = this.conditionCache[stack.artifactId];
    if (existingCondition) {
      return existingCondition;
    }
    const permissionBoundaryCondition = new CfnCondition(
      stack,
      'isEmptyPermissionBoundary',
      {
        expression: Fn.conditionEquals(permissionBoundary, ''),
      },
    );
    this.conditionCache[stack.artifactId] = permissionBoundaryCondition;
    return permissionBoundaryCondition;
  }
}

export class RoleNamePrefixAspect implements IAspect {
  private prefix: string;
  private conditionCache: { [key: string]: CfnCondition } = {};

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  public visit(node: IConstruct): void {
    if (Role.isRole(node)) {
      let roleId = node.node.id;
      if (roleId === 'ServiceRole' || roleId === 'Role') {
        const parentId = node.node.scope?.node.id;
        roleId = `${parentId}${roleId}`;
      }
      const cfnRole = node.node.defaultChild as CfnRole;
      cfnRole.addPropertyOverride('RoleName',
        Fn.conditionIf(
          this.isEmptyRolePrefixCondition(Stack.of(node), this.prefix).logicalId,
          Aws.NO_VALUE,
          this.getRoleName(this.prefix, roleId, getShortIdOfStackWithRegion(Stack.of(node))),
        ),
      );
      addCfnNagSuppressRules(
        cfnRole,
        [
          {
            id: 'W28',
            reason: 'Set the role name with prefix',
          },
        ],
      );
    } else if (CfnResource.isCfnResource(node) && node.cfnResourceType === 'AWS::IAM::Role') {
      if (!(node as CfnRole).roleName) {
        const parentId = node.node.scope?.node.id;
        node.addPropertyOverride('RoleName',
          Fn.conditionIf(
            this.isEmptyRolePrefixCondition(Stack.of(node), this.prefix).logicalId,
            Aws.NO_VALUE,
            this.getRoleName(this.prefix, `${parentId}Role`, getShortIdOfStackWithRegion(Stack.of(node))),
          ),
        );
        addCfnNagSuppressRules(
          node,
          [
            {
              id: 'W28',
              reason: 'Set the role name with prefix',
            },
          ],
        );
      }
    }
  }

  private getRoleName(prefix: string, id: string, suffix: string): string {
    const roleNameMaxLength = 64;
    const splitLength = 2;
    const prefixLength = prefix.length;
    const suffixLength = 23;
    if (prefixLength + suffixLength + splitLength > roleNameMaxLength) {
      throw new Error(`Role name length is greater than ${roleNameMaxLength}`);
    }
    const nameLength = roleNameMaxLength - prefixLength - suffixLength - splitLength;
    if (id.length < nameLength) {
      return `${prefix}-${id}-${suffix}`;
    }
    const name = id.substring(id.length - nameLength, id.length);
    return `${prefix}-${name}-${suffix}`;
  };

  private isEmptyRolePrefixCondition(stack: Stack, rolePrefix: string): CfnCondition {
    const existingCondition = this.conditionCache[stack.artifactId];
    if (existingCondition) {
      return existingCondition;
    }
    const rolePrefixCondition = new CfnCondition(
      stack,
      'isEmptyRolePrefix',
      {
        expression: Fn.conditionEquals(rolePrefix, ''),
      },
    );
    this.conditionCache[stack.artifactId] = rolePrefixCondition;
    return rolePrefixCondition;
  }
}