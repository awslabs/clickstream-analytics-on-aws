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

import { readFileSync } from 'fs';
import { join } from 'path';
import { OUTPUT_REPORTING_QUICKSIGHT_DASHBOARDS, OUTPUT_REPORTING_QUICKSIGHT_DATA_SOURCE_ARN } from '@aws/clickstream-base-lib';
import {
  Aspects,
  Aws,
  CfnCondition,
  CfnOutput,
  Fn,
  Stack,
} from 'aws-cdk-lib';
import { PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { CfnDataSource, CfnTemplate, CfnVPCConnection } from 'aws-cdk-lib/aws-quicksight';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { RolePermissionBoundaryAspect } from './common/aspects';
import {
  addCfnNagForLogRetention,
  addCfnNagForCustomResourceProvider,
  addCfnNagToStack,
  addCfnNagForCfnResource,
  ruleRolePolicyWithWildcardResourcesAndHighSPCM,
  ruleRolePolicyWithWildcardResources,
} from './common/cfn-nag';
import { Parameters } from './common/parameters';
import { SolutionInfo } from './common/solution-info';
import { associateApplicationWithStack, getShortIdOfStack } from './common/stack';
import { createNetworkInterfaceCheckCustomResource } from './reporting/network-interface-check-custom-resource';
import { createStackParametersQuickSight } from './reporting/parameter';
import { createQuicksightCustomResource } from './reporting/quicksight-custom-resource';

export class DataReportingQuickSightStack extends Stack {

  private paramGroups: any[] = [];
  private paramLabels: any = {};

  constructor(scope: Construct, id: string, props: {}) {
    super(scope, id, props);

    const featureName = 'Reporting - QuickSight';
    this.templateOptions.description = `(${SolutionInfo.SOLUTION_ID}-rep) ${SolutionInfo.SOLUTION_NAME} - ${featureName} ${SolutionInfo.SOLUTION_VERSION_DETAIL}`;

    const stackParams = createStackParametersQuickSight(this, this.paramGroups, this.paramLabels);

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
    const vPCConnectionResource = new CfnVPCConnection(this, 'Clickstream-VPCConnectionResource', {
      availabilityStatus: 'AVAILABLE',
      awsAccountId: Aws.ACCOUNT_ID,
      name: `VPC Connection for Clickstream pipeline ${stackParams.redshiftDBParam.valueAsString}`,
      roleArn: vpcConnectionCreateRole.roleArn,
      securityGroupIds: stackParams.quickSightVpcConnectionSGParam.valueAsList,
      subnetIds: Fn.split(',', stackParams.quickSightVpcConnectionSubnetParam.valueAsString),
      vpcConnectionId: vpcConnectionId,
    });

    vPCConnectionResource.node.addDependency(vpcConnectionCreateRole);
    const vpcConnectionArn = vPCConnectionResource.getAtt('Arn').toString();
    const networkInterfaces = vPCConnectionResource.getAtt('NetworkInterfaces').toString();
    const interfaceCheckCR = createNetworkInterfaceCheckCustomResource(this, {
      networkInterfaces,
      vpcConnectionId,
    });
    interfaceCheckCR.node.addDependency(vPCConnectionResource);

    const useTemplateArnCondition = new CfnCondition(
      this,
      'useTemplateArnCondition',
      {
        expression:
          Fn.conditionNot(Fn.conditionEquals(stackParams.quickSightTemplateArnParam.valueAsString, '')),
      },
    );

    const templateId = `clickstream_template_${stackParams.redshiftDBParam.valueAsString}_${getShortIdOfStack(Stack.of(this))}`;
    const template = new CfnTemplate(this, 'Clickstream-Template-Def', {
      templateId,
      awsAccountId: Aws.ACCOUNT_ID,
      permissions: [{
        principal: stackParams.quickSightOwnerPrincipalParam.valueAsString,
        actions: [
          'quicksight:UpdateTemplatePermissions',
          'quicksight:DescribeTemplatePermissions',
          'quicksight:DescribeTemplate',
          'quicksight:DeleteTemplate',
          'quicksight:UpdateTemplate',
        ],
      }],

      sourceEntity: Fn.conditionIf(useTemplateArnCondition.logicalId, {
        SourceTemplate: {
          Arn: stackParams.quickSightTemplateArnParam.valueAsString,
        },
      }, Aws.NO_VALUE),

      definition: Fn.conditionIf(useTemplateArnCondition.logicalId,
        Aws.NO_VALUE,
        JSON.parse(readFileSync(join(__dirname, 'reporting/private/template-def.json'), 'utf-8')),
      ),
    });

    const userSecret = Secret.fromSecretNameV2(this, 'Clickstream-Redshift-Secret', `${stackParams.redshiftParameterKeyParam.valueAsString}`);

    const dataSourceId = `clickstream_datasource_${stackParams.redshiftDBParam.valueAsString}_${getShortIdOfStack(Stack.of(this))}`;
    const dataSource = new CfnDataSource(this, 'Clickstream-DataSource', {
      awsAccountId: Aws.ACCOUNT_ID,
      dataSourceId: dataSourceId,
      name: `Clickstream DataSource ${stackParams.redshiftDBParam.valueAsString}`,
      type: 'REDSHIFT',
      credentials: {
        credentialPair: {
          username: userSecret.secretValueFromJson('username').toString(),
          password: userSecret.secretValueFromJson('password').toString(),
        },
      },
      dataSourceParameters: {
        redshiftParameters: {
          database: stackParams.redshiftDefaultDBParam.valueAsString,
          host: stackParams.redshiftEndpointParam.valueAsString,
          port: stackParams.redshiftPortParam.valueAsNumber,
        },
      },
      vpcConnectionProperties: {
        vpcConnectionArn,
      },
    });
    dataSource.node.addDependency(interfaceCheckCR);
    dataSource.node.addDependency(template);

    const cr = createQuicksightCustomResource(this, {
      templateArn: template.attrArn,
      templateId: template.templateId,
      dataSourceArn: dataSource.attrArn,
      databaseName: stackParams.redshiftDBParam.valueAsString,
      timezone: stackParams.timezoneWithAppIdParam.valueAsString,
      quickSightProps: {
        userName: stackParams.quickSightUserParam.valueAsString,
        namespace: stackParams.quickSightNamespaceParam.valueAsString,
        sharePrincipalArn: stackParams.quickSightPrincipalParam.valueAsString,
        ownerPrincipalArn: stackParams.quickSightOwnerPrincipalParam.valueAsString,
      },
      redshiftProps: {
        databaseSchemaNames: stackParams.redShiftDBSchemaParam.valueAsString,
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

    const dashboards = cr.getAttString('dashboards');
    new CfnOutput(this, OUTPUT_REPORTING_QUICKSIGHT_DASHBOARDS, {
      description: 'The QuickSight dashboard list',
      value: dashboards,
    }).overrideLogicalId(OUTPUT_REPORTING_QUICKSIGHT_DASHBOARDS);

    new CfnOutput(this, OUTPUT_REPORTING_QUICKSIGHT_DATA_SOURCE_ARN, {
      description: 'The QuickSight data source arn',
      value: dataSource.attrArn,
    }).overrideLogicalId(OUTPUT_REPORTING_QUICKSIGHT_DATA_SOURCE_ARN);

    addCfnNag(this);

    // Associate Service Catalog AppRegistry application with stack
    associateApplicationWithStack(this);
    const {
      iamRoleBoundaryArnParam,
    } = Parameters.createIAMRolePrefixAndBoundaryParameters(this);
    Aspects.of(this).add(new RolePermissionBoundaryAspect(iamRoleBoundaryArnParam.valueAsString));
  }
}

function addCfnNag(stack: Stack) {
  addCfnNagForLogRetention(stack);
  addCfnNagForCustomResourceProvider(stack, 'CDK built-in provider for QuicksightCustomResource', 'QuicksightCustomResourceProvider');
  addCfnNagForCustomResourceProvider(stack, 'CDK built-in provider for NetworkInterfaceCheckCustomResource', 'NetworkInterfaceCheckCustomResourceProvider');
  addCfnNagForCfnResource(stack, 'QuicksightCustomResourceLambda', 'QuicksightCustomResourceLambda' );
  addCfnNagToStack(stack, [
    ruleRolePolicyWithWildcardResources('VPCConnectionCreateRole/DefaultPolicy/Resource', 'vpc connection', 'eni'),
  ]);
  addCfnNagToStack(stack, [
    ruleRolePolicyWithWildcardResourcesAndHighSPCM('QuicksightCustomResourceLambdaRole/DefaultPolicy/Resource', 'QuicksightCustomResourceLambda', 'eni'),
  ]);
}

