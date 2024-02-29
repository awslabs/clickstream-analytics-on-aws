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
  DOMAIN_NAME_PATTERN,
  HOST_ZONE_ID_PATTERN,
  PARAMETER_GROUP_LABEL_DOMAIN,
  PARAMETER_GROUP_LABEL_VPC,
  PARAMETER_LABEL_HOST_ZONE_ID,
  PARAMETER_LABEL_HOST_ZONE_NAME,
  PARAMETER_LABEL_PRIVATE_SUBNETS,
  PARAMETER_LABEL_PUBLIC_SUBNETS,
  PARAMETER_LABEL_RECORD_NAME,
  PARAMETER_LABEL_VPCID,
  RECORD_NAME_PATTERN,
  SUBNETS_PATTERN,
  VPC_ID_PATTERN,
  KAFKA_BROKERS_PATTERN,
  KAFKA_TOPIC_PATTERN,
  IAM_CERTIFICATE_ID_PATTERN,
  OIDC_ISSUER_PATTERN,
  OIDC_CLIENT_ID_PATTERN,
  PARAMETER_LABEL_OIDC_ISSUER,
  PARAMETER_LABEL_OIDC_CLIENT_ID,
  PARAMETER_GROUP_LABEL_OIDC,
  S3_BUCKET_NAME_PATTERN,
  PROJECT_ID_PATTERN,
  APP_ID_PATTERN,
  EMAIL_PATTERN,
  S3_PREFIX_PATTERN,
  SERVICE_CATALOG_APPREGISTRY_ARN_PATTERN,
  REDSHIFT_CLUSTER_IDENTIFIER_PATTERN,
  REDSHIFT_DB_USER_NAME_PATTERN,
  IAM_ROLE_PREFIX_PATTERN,
  PARAMETER_GROUP_LABEL_IAM_ROLE,
  PARAMETER_LABEL_IAM_ROLE_BOUNDARY_ARN,
  PARAMETER_LABEL_IAM_ROLE_PREFIX,
} from '@aws/clickstream-base-lib';
import {
  CfnParameter, CfnRule, Fn,
} from 'aws-cdk-lib';

import { Construct, IConstruct } from 'constructs';
import { KINESIS_MODE, REDSHIFT_MODE } from './model';

export enum SubnetParameterType {
  'List',
  'String'
}

interface ParameterProps {
  type?: string;
  description?: string;
  minLength?: number;
  default?: string;
  allowedPattern?: string;
  constraintDescription?: string;
  allowedValues?: string[];
}

export interface NetworkParameters {
  vpcId: CfnParameter;
  publicSubnets?: CfnParameter;
  privateSubnets: CfnParameter;
  paramLabels: any[];
  paramGroups: any[];
}

export interface OIDCParameters {
  oidcProvider: CfnParameter;
  oidcClientId: CfnParameter;
  paramLabels: any[];
  paramGroups: any[];
}

export interface DomainParameters {
  hostedZoneId: CfnParameter;
  hostedZoneName: CfnParameter;
  recordName: CfnParameter;
  paramLabels: any[];
  paramGroups: any[];
}

export class Parameters {

  public static createHostedZoneIdParameter(scope: Construct, id?: string) : CfnParameter {
    return new CfnParameter(scope, id ?? 'HostedZoneId', {
      description: 'The hosted zone ID in Route 53.',
      type: 'AWS::Route53::HostedZone::Id',
      allowedPattern: `${HOST_ZONE_ID_PATTERN}`,
      constraintDescription: `Host zone id must match pattern ${HOST_ZONE_ID_PATTERN}`,
    });
  }

  public static createHostedZoneNameParameter(scope: Construct, id?: string) : CfnParameter {
    return new CfnParameter(scope, id ?? 'HostedZoneName', {
      description: 'The hosted zone name in Route 53',
      type: 'String',
      allowedPattern: `^${DOMAIN_NAME_PATTERN}$`,
      constraintDescription: `Host zone name must match pattern ${DOMAIN_NAME_PATTERN}`,
    });
  }

  public static createDomainNameParameter(scope: Construct, id?: string) : CfnParameter {
    return new CfnParameter(scope, id ?? 'DomainName', {
      description: 'The custom domain name.',
      type: 'String',
      allowedPattern: `^${DOMAIN_NAME_PATTERN}$`,
      constraintDescription: `Domain name must match pattern ${DOMAIN_NAME_PATTERN}`,
    });
  }

  public static createIAMCertificateIdParameter(scope: Construct, id?: string) : CfnParameter {
    return new CfnParameter(scope, id ?? 'IAMCertificateId', {
      description: 'The IAM certificate id.',
      type: 'String',
      allowedPattern: `^${IAM_CERTIFICATE_ID_PATTERN}$`,
      constraintDescription: `Certifiate id must match pattern ${IAM_CERTIFICATE_ID_PATTERN}`,
    });
  }

  public static createRecordNameParameter(scope: Construct, id?: string) : CfnParameter {
    return new CfnParameter(scope, id ?? 'RecordName', {
      description: 'The record name of custom domain.',
      type: 'String',
      allowedPattern: `${RECORD_NAME_PATTERN}`,
      constraintDescription: `Record name must match pattern ${RECORD_NAME_PATTERN}`,
    });
  }

  public static createVpcIdParameter(scope: Construct, id?: string, props: ParameterProps = {}) : CfnParameter {
    const allowedPattern = props.allowedPattern ?? `^${VPC_ID_PATTERN}$`;
    return new CfnParameter(scope, id ?? 'VpcId', {
      description: 'Select the virtual private cloud (VPC).',
      type: 'AWS::EC2::VPC::Id',
      allowedPattern: allowedPattern,
      constraintDescription: `VPC id must match pattern ${allowedPattern}`,
      ...props,
    });
  }

  public static createPublicSubnetParameter(scope: Construct, id?: string, type: SubnetParameterType = SubnetParameterType.List) : CfnParameter {

    if (type === SubnetParameterType.List) {
      return new CfnParameter(scope, id ?? 'PublicSubnets', {
        description: 'Select at least one public subnet in each Availability Zone.',
        type: 'List<AWS::EC2::Subnet::Id>',
      });
    } else {
      return new CfnParameter(scope, 'PublicSubnetIds', {
        description: 'Comma delimited public subnet ids.',
        type: 'String',
        allowedPattern: `^${SUBNETS_PATTERN}$`,
        constraintDescription: `Public subnet ids must have at least 2 subnets and match pattern ${SUBNETS_PATTERN}`,
      });
    }
  }

  public static createPrivateSubnetParameter(scope: Construct, id?: string,
    type: SubnetParameterType = SubnetParameterType.List, props: ParameterProps = {}) : CfnParameter {
    if (type === SubnetParameterType.List) {
      return new CfnParameter(scope, id ?? 'PrivateSubnets', {
        description: 'Select at least one private subnet in each Availability Zone.',
        type: 'List<AWS::EC2::Subnet::Id>',
        ...props,
      });
    } else {
      const allowedPattern = props.allowedPattern ?? `^${SUBNETS_PATTERN}$`;
      return new CfnParameter(scope, id ?? 'PrivateSubnetIds', {
        description: 'Comma delimited private subnet ids.',
        type: 'String',
        constraintDescription: `Private subnet ids must have at least 2 subnets and match pattern ${allowedPattern}`,
        ...props,
        allowedPattern: allowedPattern,
      });
    }
  }

  public static createCognitoUserEmailParameter(scope: Construct, id?: string) : CfnParameter {
    return new CfnParameter(scope, id ?? 'Email', {
      description: 'Email address of admin user ',
      type: 'String',
      allowedPattern: `^${EMAIL_PATTERN}$`,
      constraintDescription: `Email address must match pattern ${EMAIL_PATTERN}`,
    });
  }

  public static createS3BucketParameter(scope: Construct, id: string,
    props: {description: string; allowedPattern?: string; default?: string}) : CfnParameter {
    return new CfnParameter(scope, id, {
      type: 'String',
      allowedPattern: `^(${S3_BUCKET_NAME_PATTERN})?$`,
      ... props,
    });
  }

  public static createS3PrefixParameter(scope: Construct, id: string,
    props: {description: string; default: string; allowedPattern?: string}) : CfnParameter {
    const pattern = props.allowedPattern ?? S3_PREFIX_PATTERN;
    return new CfnParameter(scope, id, {
      type: 'String',
      allowedPattern: pattern,
      constraintDescription: `${id} must match pattern ${pattern}.`,
      ... props,
    });
  }

  public static createNetworkParameters(
    scope: Construct,
    needPublicSubnets: boolean,
    subnetParameterType?: SubnetParameterType,
    paramGroups?: any[],
    paramLabels?: any,
    customId?: string) : NetworkParameters {
    const groups: any[] = paramGroups ?? [];
    const labels: any = paramLabels ?? {};
    const res: any[] = [];

    const vpcId = this.createVpcIdParameter(scope, customId);
    labels[vpcId.logicalId] = {
      default: PARAMETER_LABEL_VPCID,
    };
    res.push(vpcId.logicalId);

    let publicSubnets: CfnParameter | undefined;
    if (needPublicSubnets) {
      publicSubnets = this.createPublicSubnetParameter(scope, customId, subnetParameterType ?? SubnetParameterType.List);
      labels[publicSubnets.logicalId] = {
        default: PARAMETER_LABEL_PUBLIC_SUBNETS,
      };
      res.push(publicSubnets.logicalId);
    }

    const privateSubnets = this.createPrivateSubnetParameter(scope, customId, subnetParameterType ?? SubnetParameterType.List);
    labels[privateSubnets.logicalId] = {
      default: PARAMETER_LABEL_PRIVATE_SUBNETS,
    };
    res.push(privateSubnets.logicalId);

    groups.push({
      Label: { default: PARAMETER_GROUP_LABEL_VPC },
      Parameters: res,
    });

    new CfnRule(scope, 'SubnetsInVpc', {
      assertions: [
        {
          assert: Fn.conditionEachMemberIn(Fn.valueOfAll('AWS::EC2::Subnet::Id', 'VpcId'), Fn.refAll('AWS::EC2::VPC::Id')),
          assertDescription:
            'All subnets must in the VPC',
        },
      ],
    });

    return {
      vpcId,
      publicSubnets,
      privateSubnets,
      paramLabels: labels,
      paramGroups: groups,
    };
  }

  public static createDomainParameters(scope: Construct, paramGroups?: any[], paramLabels?: any, customId?: string) : DomainParameters {

    const groups: any[] = paramGroups ?? [];
    const labels: any = paramLabels ?? {};

    const hostedZoneId = this.createHostedZoneIdParameter(scope, customId ?? undefined);
    labels[hostedZoneId.logicalId] = {
      default: PARAMETER_LABEL_HOST_ZONE_ID,
    };

    const hostedZoneName = this.createHostedZoneNameParameter(scope, customId ?? undefined);
    labels[hostedZoneName.logicalId] = {
      default: PARAMETER_LABEL_HOST_ZONE_NAME,
    };


    const recordName = this.createRecordNameParameter(scope, customId ?? undefined);
    labels[recordName.logicalId] = {
      default: PARAMETER_LABEL_RECORD_NAME,
    };

    groups.push({
      Label: { default: PARAMETER_GROUP_LABEL_DOMAIN },
      Parameters: [hostedZoneId.logicalId, hostedZoneName.logicalId, recordName.logicalId],
    });

    return {
      hostedZoneId,
      hostedZoneName,
      recordName: recordName ?? undefined,
      paramLabels: labels,
      paramGroups: groups,
    };
  }

  public static createOIDCParameters(scope: Construct, paramGroups?: any[], paramLabels?: any, id?: string) : OIDCParameters {

    const groups: any[] = paramGroups ?? [];
    const labels: any = paramLabels ?? {};

    const oidcProvider = new CfnParameter(scope, id ? id + '-OIDCProvider' : 'OIDCProvider', {
      type: 'String',
      description: 'The OpenID connector issuer, get this value from your OIDC provider',
      allowedPattern: OIDC_ISSUER_PATTERN,
      constraintDescription: `Issuer must match pattern ${OIDC_ISSUER_PATTERN}`,
    });
    labels[oidcProvider.logicalId] = {
      default: PARAMETER_LABEL_OIDC_ISSUER,
    };

    const oidcClientId = new CfnParameter(scope, id ? id + '-OIDCClientId' : 'OIDCClientId', {
      type: 'String',
      description: 'The OpenID connector client id, get this value from your OIDC provider',
      allowedPattern: OIDC_CLIENT_ID_PATTERN,
      constraintDescription: `Client id must match pattern ${OIDC_CLIENT_ID_PATTERN}`,
    });
    labels[oidcClientId.logicalId] = {
      default: PARAMETER_LABEL_OIDC_CLIENT_ID,
    };

    groups.push({
      Label: { default: PARAMETER_GROUP_LABEL_OIDC },
      Parameters: [oidcProvider.logicalId, oidcClientId.logicalId],
    });

    return {
      oidcProvider,
      oidcClientId,
      paramLabels: labels,
      paramGroups: groups,
    };
  }

  public static createMskClusterNameParameter(
    scope: IConstruct,
    id: string = 'MskClusterName',
    props: ParameterProps = {},
  ) {
    const mskClusterNameParam = new CfnParameter(scope, id, {
      description:
        'Amazon managed streaming for apache kafka (Amazon MSK) cluster name',
      type: 'String',
      ...props,
    });
    return mskClusterNameParam;
  }

  public static createKafkaBrokersParameter(
    scope: IConstruct,
    id: string = 'KafkaBrokers',
    allowEmpty: boolean = false,
    props: ParameterProps = {},
  ) {
    let allowedPattern = `${KAFKA_BROKERS_PATTERN}`;
    if (allowEmpty) {
      allowedPattern = `(${allowedPattern})?`;
    }
    const kafkaBrokersParam = new CfnParameter(scope, id, {
      description: 'Kafka brokers string',
      type: 'String',
      allowedPattern: `^${allowedPattern}$`,
      constraintDescription: `${id} must match pattern ${allowedPattern}`,
      ...props,
    });

    return kafkaBrokersParam;
  }

  public static createKafkaTopicParameter(
    scope: IConstruct,
    id: string = 'KafkaTopic',
    allowEmpty: boolean = false,
    props: ParameterProps = {},
  ) {
    let allowedPattern = `${KAFKA_TOPIC_PATTERN}`;
    if (allowEmpty) {
      allowedPattern = `(${allowedPattern})?`;
    }

    const kafkaTopicParam = new CfnParameter(scope, id, {
      description: 'Kafka topic',
      type: 'String',
      allowedPattern: `^${allowedPattern}$`,
      constraintDescription: `KafkaTopic must match pattern ${allowedPattern}`,
      ...props,
    });
    return kafkaTopicParam;
  }

  public static createMskSecurityGroupIdParameter(
    scope: IConstruct,
    id: string = 'SecurityGroupId',
    allowEmpty: boolean = false,
    props: ParameterProps = {},
  ) {
    return Parameters.createSecurityGroupIdsParameter(scope, id, allowEmpty, {
      description: 'Amazon managed streaming for apache kafka (Amazon MSK) security group id',
      ...props,
    });
  }

  public static createSecurityGroupIdsParameter(
    scope: IConstruct,
    id: string = 'SecurityGroupIds',
    allowEmpty: boolean = false,
    props: ParameterProps = {},
  ) {
    const singleSGPattern = 'sg-[a-f0-9]+';
    let allowedPattern = `${singleSGPattern}(,${singleSGPattern})*`;
    if (allowEmpty) {
      allowedPattern = `(${allowedPattern})?`;
    }
    const securityGroupIdParam = new CfnParameter(scope, id, {
      description:
        'Choose security groups',
      type: 'String',
      allowedPattern: `^${allowedPattern}$`,
      constraintDescription: `Security group must match pattern ${allowedPattern}`,
      ...props,
    });

    return securityGroupIdParam;
  }

  public static createProjectIdParameter(scope: IConstruct,
    projectIdName: string = 'ProjectId') {
    const projectIdParam = new CfnParameter(scope, projectIdName, {
      description: 'Project Id',
      allowedPattern: `^${PROJECT_ID_PATTERN}$`,
      type: 'String',
    });
    return projectIdParam;
  }

  public static createProjectAndAppsParameters(scope: IConstruct,
    projectIdName: string = 'ProjectId',
    appIdsName: string = 'AppIds') {

    const projectIdParam = this.createProjectIdParameter(scope, projectIdName);

    const appIdsParam = new CfnParameter(scope, appIdsName, {
      description: 'App Ids, comma delimited list',
      type: 'String',
      default: '',
      allowedPattern: `^((${APP_ID_PATTERN})(,${APP_ID_PATTERN}){0,})?$`,
    });

    return {
      projectIdParam,
      appIdsParam,
    };
  }

  public static createAppRegistryApplicationArnParameters(scope: Construct, id?: string) : CfnParameter {
    return new CfnParameter(scope, id ?? 'AppRegistryApplicationArn', {
      description: 'Service Catalog AppRegistry Application Arn',
      type: 'String',
      default: '',
      allowedPattern: `^(|${SERVICE_CATALOG_APPREGISTRY_ARN_PATTERN})$`,
      constraintDescription: `Service Catalog AppRegistry application arn parameter can either match pattern ${SERVICE_CATALOG_APPREGISTRY_ARN_PATTERN} or be empty`,
    });
  }

  public static createRedshiftModeParameter(scope: Construct, id?: string, props: ParameterProps ={}) : CfnParameter {
    return new CfnParameter(scope, id ?? 'RedshiftMode', {
      description: 'Select Redshift cluster mode',
      type: 'String',
      default: REDSHIFT_MODE.NEW_SERVERLESS,
      allowedValues: [REDSHIFT_MODE.NEW_SERVERLESS, REDSHIFT_MODE.SERVERLESS, REDSHIFT_MODE.PROVISIONED],
      ...props,
    });
  }

  public static createRedshiftCommonParameters(scope: Construct) {
    // Set Redshift common parameters
    const redshiftDefaultDatabaseParam = new CfnParameter(scope, 'RedshiftDefaultDatabase', {
      description: 'The name of the default database in Redshift',
      type: 'String',
      default: 'dev',
      allowedPattern: '^[a-zA-Z_]{1,127}[^\s"]+$',
    });

    return {
      redshiftDefaultDatabaseParam,
    };
  }

  public static createRedshiftWorkgroupParameter(scope: Construct, id: string): CfnParameter {
    return new CfnParameter(scope, id, {
      description: 'The name of the Redshift serverless workgroup.',
      type: 'String',
      default: 'default',
      allowedPattern: '^([a-z0-9-]{3,64})?$',
    });
  }

  public static createRedshiftServerlessDataRoleParameter(scope: Construct) {
    const redshiftServerlessIAMRoleParam = new CfnParameter(scope, 'RedshiftServerlessIAMRole', {
      description: 'The ARN of IAM role of Redshift serverless user with superuser privilege.',
      type: 'String',
      default: '',
      allowedPattern: '^(arn:aws(-cn|-us-gov)?:iam::[0-9]{12}:role/.*)?$',
    });

    return redshiftServerlessIAMRoleParam;
  }

  public static createRedshiftServerlessWorkgroupAndNamespaceParameters(scope: Construct) {
    const redshiftServerlessWorkgroupIdParam = new CfnParameter(scope, 'RedshiftServerlessWorkgroupId', {
      description: '[Optional] The id of the workgroup in Redshift serverless. Please input it for least permission.',
      type: 'String',
      default: '',
      allowedPattern: '^([a-z0-9-]{24,})?$',
    });

    const redshiftServerlessNamespaceIdParam = new CfnParameter(scope, 'RedshiftServerlessNamespaceId', {
      description: 'The id of the namespace in Redshift serverless.',
      type: 'String',
      default: '',
      allowedPattern: '^([a-z0-9-]{24,})?$',
    });

    return {
      redshiftServerlessWorkgroupIdParam,
      redshiftServerlessNamespaceIdParam,
    };
  }

  public static createRedshiftServerlessParametersRule(scope: Construct, parameters: {
    redshiftModeParam: CfnParameter;
    redshiftServerlessWorkgroupNameParam: CfnParameter;
    redshiftServerlessIAMRoleParam: CfnParameter;
  }) {
    new CfnRule(scope, 'ExistingRedshiftServerlessParameters', {
      ruleCondition: Fn.conditionEquals(parameters.redshiftModeParam.valueAsString, REDSHIFT_MODE.SERVERLESS),
      assertions: [
        {
          assert: Fn.conditionAnd(
            Fn.conditionNot(
              Fn.conditionEquals(parameters.redshiftServerlessWorkgroupNameParam.valueAsString, ''),
            ),
            Fn.conditionNot(
              Fn.conditionEquals(parameters.redshiftServerlessIAMRoleParam.valueAsString, ''),
            ),
          ),
          assertDescription:
              'Workgroup and Data API Role Arn are required for using existing Redshift Serverless.',
        },
      ],
    }).overrideLogicalId('ExistingRedshiftServerlessParameters');
  }

  public static createProvisionedRedshiftParameters(scope: Construct, redshiftModeParam?: CfnParameter) {
    const redshiftClusterIdentifierParam = new CfnParameter(scope, 'RedshiftClusterIdentifier', {
      description: 'The cluster identifier of Redshift.',
      type: 'String',
      allowedPattern: REDSHIFT_CLUSTER_IDENTIFIER_PATTERN,
      default: '',
    });

    const redshiftDbUserParam = new CfnParameter(scope, 'RedshiftDbUser', {
      description: 'The name of Redshift database user.',
      type: 'String',
      allowedPattern: REDSHIFT_DB_USER_NAME_PATTERN,
      default: '',
    });

    if (redshiftModeParam) {
      new CfnRule(scope, 'RedshiftProvisionedParameters', {
        ruleCondition: Fn.conditionEquals(redshiftModeParam.valueAsString, REDSHIFT_MODE.PROVISIONED),
        assertions: [
          {
            assert: Fn.conditionAnd(
              Fn.conditionNot(
                Fn.conditionEquals(redshiftClusterIdentifierParam.valueAsString, ''),
              ),
              Fn.conditionNot(
                Fn.conditionEquals(redshiftDbUserParam.valueAsString, ''),
              ),
            ),
            assertDescription:
                'ClusterIdentifier and DbUser are required when using Redshift Provisioned cluster.',
          },
        ],
      }).overrideLogicalId('RedshiftProvisionedParameters');
    }

    return {
      redshiftClusterIdentifierParam,
      redshiftDbUserParam,
    };
  }

  public static createKinesisParameters(scope: Construct) {
    const kinesisStreamModeParam = new CfnParameter(scope, 'KinesisStreamMode', {
      description: 'Kinesis Data Stream mode',
      type: 'String',
      allowedValues: [KINESIS_MODE.ON_DEMAND, KINESIS_MODE.PROVISIONED],
      default: KINESIS_MODE.ON_DEMAND,
    });

    const kinesisShardCountParam = new CfnParameter(scope, 'KinesisShardCount', {
      description:
      'Number of Kinesis Data Stream shards, only apply for Provisioned mode',
      type: 'Number',
      default: '3',
      minValue: 1,
    });

    const kinesisDataRetentionHoursParam = new CfnParameter(
      scope,
      'KinesisDataRetentionHours',
      {
        description: 'Data retention hours in Kinesis Data Stream, from 24 hours by default, up to 8760 hours (365 days)',
        type: 'Number',
        default: '24',
        minValue: 24,
        maxValue: 8760,
      },
    );

    return {
      kinesisStreamModeParam,
      kinesisShardCountParam,
      kinesisDataRetentionHoursParam,
    };
  }

  public static createRedshiftUserKeyParameter(scope: Construct) {
    return new CfnParameter(scope, 'RedshiftParameterKeyParam', {
      description: 'Parameter key name which stores redshift user and password.',
      type: 'String',
    });
  }

  public static createIAMRolePrefixAndBoundaryParameters(scope: Construct, paramGroups?: any[], paramLabels?: any) {
    const groups: any[] = paramGroups ?? [];
    const labels: any = paramLabels ?? {};

    const iamRolePrefixParam = new CfnParameter(scope, 'IamRolePrefix', {
      description: 'The prefix of all IAM Roles.',
      type: 'String',
      allowedPattern: IAM_ROLE_PREFIX_PATTERN,
      default: '',
    });
    labels[iamRolePrefixParam.logicalId] = {
      default: PARAMETER_LABEL_IAM_ROLE_PREFIX,
    };

    const iamRoleBoundaryArnParam = new CfnParameter(scope, 'IamRoleBoundaryArn', {
      description: 'Set permissions boundaries for IAM Roles.',
      type: 'String',
      default: '',
    });
    labels[iamRoleBoundaryArnParam.logicalId] = {
      default: PARAMETER_LABEL_IAM_ROLE_BOUNDARY_ARN,
    };

    groups.push({
      Label: { default: PARAMETER_GROUP_LABEL_IAM_ROLE },
      Parameters: [iamRolePrefixParam.logicalId, iamRoleBoundaryArnParam.logicalId],
    });

    return {
      iamRolePrefixParam,
      iamRoleBoundaryArnParam,
      paramLabels: labels,
      paramGroups: groups,
    };
  }

}
