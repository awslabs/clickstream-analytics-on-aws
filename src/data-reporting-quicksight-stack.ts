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
  Aws,
  CfnOutput,
  CfnResource,
  Fn,
  Stack,
} from 'aws-cdk-lib';
import { PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { CfnDataSource, CfnTemplate } from 'aws-cdk-lib/aws-quicksight';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import {
  addCfnNagForLogRetention,
  addCfnNagForCustomResourceProvider,
  addCfnNagToStack,
  addCfnNagForCfnResource,
} from './common/cfn-nag';
import { SolutionInfo } from './common/solution-info';
import { getShortIdOfStack } from './common/stack';
import { createStackParametersQuickSight } from './reporting/parameter';
import { createQuicksightCustomResource } from './reporting/quicksight-custom-resource';

export class DataReportingQuickSightStack extends Stack {

  private paramGroups: any[] = [];
  private paramLabels: any = {};

  constructor(scope: Construct, id: string, props: {}) {
    super(scope, id, props);

    const featureName = 'Reporting - QuickSight';
    this.templateOptions.description = `(${SolutionInfo.SOLUTION_ID}) ${SolutionInfo.SOLUTION_NAME} - ${featureName} (Version ${SolutionInfo.SOLUTION_VERSION})`;

    const stackParames = createStackParametersQuickSight(this, this.paramGroups, this.paramLabels);

    const vpcConnectionCreateRole = new Role(this, 'VPCConnectionCreateRole', {
      assumedBy: new ServicePrincipal('quicksight.amazonaws.com'),
      description: 'IAM role use to create QuickSight VPC connection.',
    });

    vpcConnectionCreateRole.addToPolicy(new PolicyStatement({
      actions: [
        'ec2:DescribeSubnets',
        'ec2:DescribeSecurityGroups',
        'ec2:CreateNetworkInterface',
        'ec2:ModifyNetworkInterfaceAttribute',
        'ec2:DeleteNetworkInterface',
      ],
      resources: ['*'],
    }));

    const vpcConnectionId = `clickstream-quicksight-vpc-connection-${getShortIdOfStack(Stack.of(this))}`;
    const vPCConnectionResource = new CfnResource(this, 'Clickstream-VPCConnectionResource', {
      type: 'AWS::QuickSight::VPCConnection',
      properties: {
        AwsAccountId: Aws.ACCOUNT_ID,
        Name: `VPC Connection for Clickstream pipeline ${stackParames.redshiftDBParam.valueAsString}`,
        RoleArn: vpcConnectionCreateRole.roleArn,
        SecurityGroupIds: stackParames.quickSightVpcConnectionSGParam.valueAsList,
        SubnetIds: Fn.split(',', stackParames.quickSightVpcConnectionSubnetParam.valueAsString),
        VPCConnectionId: vpcConnectionId,
      },
    });
    vPCConnectionResource.node.addDependency(vpcConnectionCreateRole);
    const vpcConnectionArn = vPCConnectionResource.getAtt('Arn').toString();

    const principalPrefix = `arn:${Aws.PARTITION}:quicksight:us-east-1:${Aws.ACCOUNT_ID}`;
    const quickSightNamespace = stackParames.quickSightNamespaceParam.valueAsString;
    const quickSightUser = stackParames.quickSightUserParam.valueAsString;
    const principalArn = `${principalPrefix}:user/${quickSightNamespace}/${quickSightUser}`;

    const templateId = `clickstream_template_${stackParames.redshiftDBParam.valueAsString}_${getShortIdOfStack(Stack.of(this))}`;
    const template = new CfnTemplate(this, 'Clickstream-Template', {
      templateId,
      awsAccountId: Aws.ACCOUNT_ID,
      permissions: [{
        principal: principalArn,
        actions: [
          'quicksight:UpdateTemplatePermissions',
          'quicksight:DescribeTemplatePermissions',
          'quicksight:DescribeTemplate',
          'quicksight:DeleteTemplate',
          'quicksight:UpdateTemplate',
        ],
      }],

      sourceEntity: {
        sourceTemplate: {
          arn: stackParames.quickSightTemplateArnParam.valueAsString,
        },
      },

      // definition: lowercaseKeys(TEMPLATE_DEF_V1),
    });

    const userSecret = Secret.fromSecretNameV2(this, 'Clickstrem-Redshift-Secret', `${stackParames.redshiftParameterKeyParam.valueAsString}`);

    const datasourceId = `clickstream_datasource_${stackParames.redshiftDBParam.valueAsString}_${getShortIdOfStack(Stack.of(this))}`;
    const dataSource = new CfnDataSource(this, 'Clickstream-DataSource', {
      awsAccountId: Aws.ACCOUNT_ID,
      dataSourceId: datasourceId,
      name: `Clicksteam DataSource ${stackParames.redshiftDBParam.valueAsString}`,
      type: 'REDSHIFT',
      credentials: {
        credentialPair: {
          username: userSecret.secretValueFromJson('username').toString(),
          password: userSecret.secretValueFromJson('password').toString(),
        },
      },
      dataSourceParameters: {
        redshiftParameters: {
          database: stackParames.redshiftDBParam.valueAsString,
          host: stackParames.redshiftEndpointParam.valueAsString,
          port: stackParames.redshiftPortParam.valueAsNumber,
        },
      },
      permissions: [
        {
          principal: principalArn,
          actions: [
            'quicksight:UpdateDataSourcePermissions',
            'quicksight:DescribeDataSourcePermissions',
            'quicksight:PassDataSource',
            'quicksight:DescribeDataSource',
            'quicksight:DeleteDataSource',
            'quicksight:UpdateDataSource',
          ],
        },
      ],
      vpcConnectionProperties: {
        vpcConnectionArn,
      },
    });
    dataSource.node.addDependency(vPCConnectionResource);

    const cr = createQuicksightCustomResource(this, {
      templateArn: template.attrArn,
      dataSourceArn: dataSource.attrArn,
      databaseName: stackParames.redshiftDBParam.valueAsString,
      quickSightProps: {
        userName: stackParames.quickSightUserParam.valueAsString,
        namespace: stackParames.quickSightNamespaceParam.valueAsString,
        principalArn: stackParames.quickSightPrincipalParam.valueAsString,
      },
      redshiftProps: {
        databaseSchemaNames: stackParames.redShiftDBSchemaParam.valueAsString,
      },
    });
    cr.node.addDependency(vPCConnectionResource);
    cr.node.addDependency(template);

    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: this.paramGroups,
        ParameterLabels: this.paramLabels,
      },
    };

    const dababoards = cr.getAttString('dashboards');
    new CfnOutput(this, 'Dashboards', {
      description: 'The QuickSight dashboard list',
      value: dababoards,
    }).overrideLogicalId('Dashboards');

    addCfnNag(this);
  }

}

function addCfnNag(stack: Stack) {

  addCfnNagForLogRetention(stack);
  addCfnNagForCustomResourceProvider(stack, 'CDK built-in provider for QuicksightCustomResource', 'QuicksightCustomResourceProvider', undefined);
  addCfnNagForCfnResource(stack, 'QuicksightCustomResourceLambda', 'QuicksightCustomResourceLambda' );
  addCfnNagToStack(stack, [
    {
      paths_endswith: ['QuicksightCustomResourceLambdaRole/DefaultPolicy/Resource'],
      rules_to_suppress: [
        {
          id: 'W76',
          reason: 'ACK: SPCM for IAM policy document is higher than 25',
        },
        {
          id: 'W12',
          reason: 'Policy is generated by CDK, * resource for read only access',
        },
      ],
    },
    {
      paths_endswith: ['VPCConnectionCreateRole/DefaultPolicy/Resource'],
      rules_to_suppress: [
        {
          id: 'W12',
          reason: 'Create QuickSight VPC connection need permission on * resource',
        },
      ],
    },

  ]);

}

