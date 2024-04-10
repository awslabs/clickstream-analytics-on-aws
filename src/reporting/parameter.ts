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

  const quickSightPrincipalParam = new CfnParameter(scope, 'QuickSightPrincipalParam', {
    description: 'Arn of the QuickSight principal, dashboard resource will be share to this principal',
    type: 'String',
    allowedPattern: QUICKSIGHT_USER_ARN_PATTERN,
  });
  labels[quickSightPrincipalParam.logicalId] = {
    default: 'QuickSight Principal Arn',
  };

  const quickSightTemplateArnParam = new CfnParameter(scope, 'QuickSightTemplateArnParam', {
    description: 'Arn of the QuickSight template.',
    type: 'String',
    default: '',
  });
  labels[quickSightTemplateArnParam.logicalId] = {
    default: 'QuickSight Template Arn',
  };

  const quickSightTimezoneParam = new CfnParameter(scope, 'QuickSightTimezoneParam', {
    description: 'The time zone with app id',
    type: 'String',
    default: '[]',
  });
  labels[quickSightTimezoneParam.logicalId] = {
    default: 'Dashboard Timezone Setting',
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

  const redshiftDefaultDBParam = new CfnParameter(scope, 'RedshiftDefaultDBParam', {
    description: 'Redshift default database name.',
    type: 'String',
    default: 'dev',
    allowedPattern: REDSHIFT_DB_NAME_PATTERN,
    constraintDescription: `Redshift default database name must match ${REDSHIFT_DB_NAME_PATTERN}`,
  });
  labels[redshiftDefaultDBParam.logicalId] = {
    default: 'Redshift Default Database Name',
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

  groups.push({
    Label: { default: 'QuickSight Information' },
    Parameters: [
      quickSightNamespaceParam.logicalId,
      quickSightUserParam.logicalId,
      quickSightVpcConnectionSGParam.logicalId,
      quickSightVpcConnectionSubnetParam.logicalId,
      quickSightOwnerPrincipalParam.logicalId,
      quickSightPrincipalParam.logicalId,
      quickSightTemplateArnParam.logicalId,
      quickSightTimezoneParam.logicalId,
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
    ],
  });

  return {
    quickSightUserParam,
    quickSightNamespaceParam,
    quickSightVpcConnectionSGParam,
    quickSightVpcConnectionSubnetParam,
    quickSightOwnerPrincipalParam,
    quickSightPrincipalParam,
    quickSightTemplateArnParam,
    quickSightTimezoneParam,
    redshiftEndpointParam,
    redshiftDBParam,
    redshiftDefaultDBParam,
    redShiftDBSchemaParam,
    redshiftPortParam,
    redshiftParameterKeyParam,
    paramLabels: labels,
    paramGroups: groups,
  };
}

