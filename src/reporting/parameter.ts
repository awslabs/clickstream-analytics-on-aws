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

import {
  QUICKSIGHT_USER_NAME_PATTERN,
  QUICKSIGHT_NAMESPACE_PATTERN,
  REDSHIFT_DB_NAME_PATTERN,
  MULTI_APP_ID_PATTERN,
  DOMAIN_NAME_PATTERN,
  SECURITY_GROUP_PATTERN,
  SUBNETS_PATTERN,
  QUICKSIGHT_USER_ARN_PATTERN,
  IAM_ROLE_ARN_PATTERN,
} from '@aws/clickstream-base-lib';
import { CfnParameter } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Parameters } from '../common/parameters';

export function createStackParametersQuickSight(scope: Construct, paramGroups?: any[], paramLabels?: any) {

  const groups: any[] = paramGroups ?? [];
  const labels: any = paramLabels ?? {};

  const quickSightUserParam = new CfnParameter(scope, 'QuickSightUserParam', {
    description: 'The QuickSight user name.',
    type: 'String',
    allowedPattern: QUICKSIGHT_USER_NAME_PATTERN,
    constraintDescription: `QuickSight user name must match ${QUICKSIGHT_USER_NAME_PATTERN}`,
  });
  labels[quickSightUserParam.logicalId] = {
    default: 'QuickSight User Name',
  };

  const quickSightNamespaceParam = new CfnParameter(scope, 'QuickSightNamespaceParam', {
    description: 'QuickSight namespace name.',
    type: 'String',
    default: 'default',
    allowedPattern: QUICKSIGHT_NAMESPACE_PATTERN,
    constraintDescription: `QuickSight namespace must match ${QUICKSIGHT_NAMESPACE_PATTERN}`,
  });
  labels[quickSightNamespaceParam.logicalId] = {
    default: 'QuickSight Namespace Name',
  };

  const quickSightVpcConnectionSGParam = new CfnParameter(scope, 'QuickSightVpcConnectionSGParam', {
    description: 'Comma delimited security group ids used to create QuickSight VPC connection.',
    type: 'CommaDelimitedList',
    allowedPattern: `^${SECURITY_GROUP_PATTERN}$`,
    constraintDescription: `Security group id must match ${SECURITY_GROUP_PATTERN}`,
  });
  labels[quickSightVpcConnectionSGParam.logicalId] = {
    default: 'Comma Delimited Security Group Ids',
  };

  const quickSightVpcConnectionSubnetParam = new CfnParameter(scope, 'QuickSightVpcConnectionSubnetParam', {
    description: 'Comma delimited subnet ids used to create QuickSight VPC connection.',
    type: 'String',
    allowedPattern: `^${SUBNETS_PATTERN}$`,
    constraintDescription: `Subnet id must match ${SUBNETS_PATTERN}`,
  });
  labels[quickSightVpcConnectionSubnetParam.logicalId] = {
    default: 'Comma Delimited Subnet Ids',
  };

  const quickSightOwnerPrincipalParam = new CfnParameter(scope, 'QuickSightOwnerPrincipalParam', {
    description: 'Arn of the QuickSight principal, QuickSight resource will be owned by this principal.',
    type: 'String',
    allowedPattern: QUICKSIGHT_USER_ARN_PATTERN,
  });
  labels[quickSightOwnerPrincipalParam.logicalId] = {
    default: 'QuickSight Owner Principal Arn',
  };

  const quickSightTimezoneParam = new CfnParameter(scope, 'QuickSightTimezoneParam', {
    description: 'The time zone with app id',
    type: 'String',
    default: '[]',
  });
  labels[quickSightTimezoneParam.logicalId] = {
    default: 'Dashboard Timezone Setting',
  };

  const allowedValues = ['no', 'yes'];
  const quickSightUseSpiceParam = new CfnParameter(scope, 'QuickSightUseSpiceParam', {
    description: 'Use SPICE to import data set or not.',
    type: 'String',
    allowedValues: allowedValues,
    default: allowedValues[0],
  });
  labels[quickSightUseSpiceParam.logicalId] = {
    default: 'Enable QuickSight SPICE Import Mode',
  };

  const redshiftDefaultDBParam = new CfnParameter(scope, 'RedshiftDefaultDBParam', {
    description: 'Redshift Default database name.',
    type: 'String',
    default: 'dev',
  });
  labels[redshiftDefaultDBParam.logicalId] = {
    default: 'Redshift Default Database Name',
  };

  const redshiftDBParam = new CfnParameter(scope, 'RedshiftDBParam', {
    description: 'Redshift database name.',
    type: 'String',
    allowedPattern: REDSHIFT_DB_NAME_PATTERN,
    constraintDescription: `Redshift database name must match ${REDSHIFT_DB_NAME_PATTERN}`,
  });
  labels[redshiftDBParam.logicalId] = {
    default: 'Redshift Database Name',
  };

  const redShiftDBSchemaParam = new CfnParameter(scope, 'RedShiftDBSchemaParam', {
    description: 'Comma delimited Redshift database schema name list',
    type: 'String',
    allowedPattern: MULTI_APP_ID_PATTERN,
    constraintDescription: `Redshift database schema name must match ${MULTI_APP_ID_PATTERN}`,
  });
  labels[redShiftDBSchemaParam.logicalId] = {
    default: 'Redshift Database Schema Names',
  };

  const redshiftEndpointParam = new CfnParameter(scope, 'RedshiftEndpointParam', {
    description: 'Redshift endpoint url.',
    type: 'String',
    allowedPattern: `^${DOMAIN_NAME_PATTERN}$`,
    constraintDescription: `Redshift database name must match ${DOMAIN_NAME_PATTERN}`,
  });
  labels[redshiftEndpointParam.logicalId] = {
    default: 'Redshift Endpoint Url',
  };

  const redshiftPortParam = new CfnParameter(scope, 'RedshiftPortParam', {
    description: 'Redshift endpoint port.',
    type: 'Number',

  });
  labels[redshiftPortParam.logicalId] = {
    default: 'Redshift Endpoint Port',
  };

  const redshiftParameterKeyParam = Parameters.createRedshiftUserKeyParameter(scope);
  labels[redshiftParameterKeyParam.logicalId] = {
    default: 'Parameter Key Name',
  };

  const redshiftIAMRoleParam = new CfnParameter(scope, 'RedshiftIAMRoleParam', {
    description: 'The ARN of IAM role used by Redshift Data API.',
    type: 'String',
    allowedPattern: IAM_ROLE_ARN_PATTERN,
  });
  labels[redshiftIAMRoleParam.logicalId] = {
    default: 'Redshift Data API Role ARN',
  };

  groups.push({
    Label: { default: 'QuickSight Information' },
    Parameters: [
      quickSightNamespaceParam.logicalId,
      quickSightUserParam.logicalId,
      quickSightVpcConnectionSGParam.logicalId,
      quickSightVpcConnectionSubnetParam.logicalId,
      quickSightOwnerPrincipalParam.logicalId,
      quickSightTimezoneParam.logicalId,
      quickSightUseSpiceParam.logicalId,
    ],
  });

  groups.push({
    Label: { default: 'Redshift Information' },
    Parameters: [
      redshiftEndpointParam.logicalId,
      redshiftDefaultDBParam.logicalId,
      redshiftDBParam.logicalId,
      redShiftDBSchemaParam.logicalId,
      redshiftPortParam.logicalId,
      redshiftParameterKeyParam.logicalId,
      redshiftIAMRoleParam.logicalId,
    ],
  });

  return {
    quickSightUserParam,
    quickSightNamespaceParam,
    quickSightVpcConnectionSGParam,
    quickSightVpcConnectionSubnetParam,
    quickSightOwnerPrincipalParam,
    quickSightTimezoneParam,
    quickSightUseSpiceParam,
    redshiftEndpointParam,
    redshiftDefaultDBParam,
    redshiftDBParam,
    redShiftDBSchemaParam,
    redshiftPortParam,
    redshiftParameterKeyParam,
    redshiftIAMRoleParam,
    paramLabels: labels,
    paramGroups: groups,
  };
}

