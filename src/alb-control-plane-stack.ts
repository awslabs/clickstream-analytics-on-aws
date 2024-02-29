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

import path from 'path';
import { OUTPUT_CONTROL_PLANE_URL, OUTPUT_CONTROL_PLANE_BUCKET } from '@aws/clickstream-base-lib';
import {
  Duration,
  Stack,
  StackProps,
  Fn,
  CfnOutput, Aws, Aspects, CfnCondition,
} from 'aws-cdk-lib';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { IVpc, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { ApplicationProtocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { LambdaTarget } from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { RoleNamePrefixAspect, RolePermissionBoundaryAspect } from './common/aspects';
import {
  addCfnNagForLogRetention,
  addCfnNagForCustomResourceProvider,
  addCfnNagToStack,
  ruleToSuppressRolePolicyWithHighSPCM,
  ruleForLambdaVPCAndReservedConcurrentExecutions,
  ruleToSuppressRolePolicyWithWildcardResources,
  ruleToSuppressRolePolicyWithWildcardAction,
} from './common/cfn-nag';
import { Parameters, SubnetParameterType } from './common/parameters';
import { SolutionBucket } from './common/solution-bucket';
import { SolutionInfo } from './common/solution-info';
import { SolutionVpc } from './common/solution-vpc';
import { getExistVpc } from './common/vpc-utils';
import { ApplicationLoadBalancerLambdaPortal } from './control-plane/alb-lambda-portal';
import { ClickStreamApiConstruct } from './control-plane/backend/click-stream-api';
import { SolutionCognito } from './control-plane/private/solution-cognito';
import { generateSolutionConfig, SOLUTION_CONFIG_PATH } from './control-plane/private/solution-config';

export interface ApplicationLoadBalancerControlPlaneStackProps extends StackProps {
  /**
   * Indicate whether to create a new VPC or use existing VPC for this Solution.
   *
   * @default - false.
   */
  existingVpc?: boolean;

  /**
   * whether the application load balancer is internet facing or intranet.
   *
   */
  internetFacing: boolean;

  /**
   * whether to use customer owned domain name.
   *
   * @default - false.
   */
  useCustomDomain?: boolean;

  /**
   * user existing OIDC provider or not
   */
  useExistingOIDCProvider?: boolean;
}

export class ApplicationLoadBalancerControlPlaneStack extends Stack {

  private paramGroups: any[] = [];
  private paramLabels: any = {};

  constructor(scope: Construct, id: string, props: ApplicationLoadBalancerControlPlaneStackProps) {
    super(scope, id, props);

    this.templateOptions.description = SolutionInfo.DESCRIPTION + `- Control Plane within VPC (${props.internetFacing ? 'Public' : 'Private'})`;

    const {
      iamRolePrefixParam,
      iamRoleBoundaryArnParam,
    } = Parameters.createIAMRolePrefixAndBoundaryParameters(this, this.paramGroups, this.paramLabels);

    let vpc:IVpc|undefined = undefined;

    if (props.existingVpc) {
      const networkParameters = Parameters.createNetworkParameters(this, props.internetFacing,
        SubnetParameterType.List, this.paramGroups, this.paramLabels);

      vpc = getExistVpc(this, 'PortalVPC', {
        vpcId: networkParameters.vpcId.valueAsString,
        availabilityZones: Fn.getAzs(),
        publicSubnetIds: networkParameters.publicSubnets?.valueAsList,
        privateSubnetIds: networkParameters.privateSubnets.valueAsList,
      });
    }

    let port = 80;
    const vpcStack = new SolutionVpc(this, `${SolutionInfo.SOLUTION_NAME}Vpc`, {
      vpc: vpc,
    });

    let subnets: SubnetSelection;
    if (props.internetFacing) {
      subnets = { subnets: vpcStack.vpc.publicSubnets };
    } else {
      subnets = { subnets: vpcStack.vpc.privateSubnets };
    }

    const solutionBucket = new SolutionBucket(this, 'ClickstreamSolution');
    let domainProps = undefined;
    let protocol = ApplicationProtocol.HTTP;

    if (props.useCustomDomain) {
      port = 443;
      protocol = ApplicationProtocol.HTTPS;

      const domainParameters = Parameters.createDomainParameters(this, this.paramGroups, this.paramLabels);

      const hostedZone = HostedZone.fromHostedZoneAttributes(this, 'hostedZoneId', {
        hostedZoneId: domainParameters.hostedZoneId.valueAsString,
        zoneName: domainParameters.hostedZoneName.valueAsString,
      });

      const certificate = new Certificate(this, 'certificate', {
        domainName: Fn.join('.', [domainParameters.recordName.valueAsString, domainParameters.hostedZoneName.valueAsString]),
        validation: CertificateValidation.fromDns(hostedZone),
      });

      domainProps = {
        recordName: domainParameters.recordName.valueAsString,
        hostedZoneName: domainParameters.hostedZoneName.valueAsString,
        hostedZone: hostedZone,
        certificate: certificate,
      };
    }

    const controlPlane = new ApplicationLoadBalancerLambdaPortal(this, 'alb_control_plane', {
      applicationLoadBalancerProps: {
        internetFacing: props.internetFacing,
        protocol: protocol,
        logProps: {
          enableAccessLog: true,
          bucket: solutionBucket.bucket,
        },
      },
      networkProps: {
        vpc: vpcStack.vpc,
        subnets: subnets,
        port: port,
      },
      domainProps: domainProps,
      frontendProps: {
        directory: path.join(__dirname, '../'),
        dockerfile: 'src/control-plane/frontend/Dockerfile',
        platform: Platform.LINUX_AMD64,
        buildArgs: {
          GENERATE_SOURCEMAP: process.env.GENERATE_SOURCEMAP ?? 'false',
          CHUNK_MIN_SIZE: process.env.CHUNK_MIN_SIZE ?? '819200',
          CHUNK_MAX_SIZE: process.env.CHUNK_MAX_SIZE ?? '1024000',
        },
      },
    });

    let issuer: string;
    let clientId: string;
    let oidcLogoutUrl: string = '';
    const emailParameter = Parameters.createCognitoUserEmailParameter(this);
    /**
     * Create Cognito user pool and client for backend api,
     * The client of Cognito requires the redirect url using HTTPS
     */
    if (!props.useExistingOIDCProvider && props.useCustomDomain) {
      this.paramLabels[emailParameter.logicalId] = {
        default: 'Admin User Email',
      };

      this.paramGroups.push({
        Label: { default: 'Authentication Information' },
        Parameters: [emailParameter.logicalId],
      });

      const cognito = new SolutionCognito(this, 'solution-cognito', {
        email: emailParameter.valueAsString,
        callbackUrls: [`${controlPlane.controlPlaneUrl}/signin`],
        logoutUrls: [`${controlPlane.controlPlaneUrl}`],
      });

      issuer = cognito.oidcProps.issuer;
      clientId = cognito.oidcProps.appClientId;
      oidcLogoutUrl = cognito.oidcProps.oidcLogoutUrl!;

    } else {
      const oidcParameters = Parameters.createOIDCParameters(this, this.paramGroups, this.paramLabels);
      issuer = oidcParameters.oidcProvider.valueAsString;
      clientId = oidcParameters.oidcClientId.valueAsString;
    }

    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: this.paramGroups,
        ParameterLabels: this.paramLabels,
      },
    };

    if (!controlPlane.applicationLoadBalancer.vpc) {
      throw new Error('Application Load Balancer VPC create error.');
    }

    const healthCheckPath = '/';

    const pluginPrefix = 'plugins/';

    const isEmptyRolePrefixCondition = new CfnCondition(
      this,
      'IsEmptyRolePrefixCondition',
      {
        expression: Fn.conditionEquals(iamRolePrefixParam.valueAsString, ''),
      },
    );
    const conditionStringRolePrefix = Fn.conditionIf(
      isEmptyRolePrefixCondition.logicalId,
      SolutionInfo.SOLUTION_SHORT_NAME,
      iamRolePrefixParam.valueAsString,
    ).toString();
    const conditionStringStackPrefix = Fn.conditionIf(
      isEmptyRolePrefixCondition.logicalId,
      SolutionInfo.SOLUTION_SHORT_NAME,
      `${iamRolePrefixParam.valueAsString}-${SolutionInfo.SOLUTION_SHORT_NAME}`,
    ).toString();

    const clickStreamApi = new ClickStreamApiConstruct(this, 'ClickStreamApi', {
      fronting: 'alb',
      applicationLoadBalancer: {
        vpc: controlPlane.applicationLoadBalancer.vpc,
        subnets,
        securityGroup: controlPlane.securityGroup,
      },
      authProps: {
        issuer: issuer,
      },
      stackWorkflowS3Bucket: solutionBucket.bucket,
      pluginPrefix: pluginPrefix,
      healthCheckPath: healthCheckPath,
      adminUserEmail: emailParameter.valueAsString,
      iamRolePrefix: iamRolePrefixParam.valueAsString,
      iamRoleBoundaryArn: iamRoleBoundaryArnParam.valueAsString,
      conditionStringRolePrefix: conditionStringRolePrefix,
      conditionStringStackPrefix: conditionStringStackPrefix,
    });

    controlPlane.addRoute('api-targets', {
      routePath: '/api/*',
      priority: controlPlane.rootPathPriority - 1,
      target: [new LambdaTarget(clickStreamApi.apiFunction)],
      healthCheck: {
        enabled: true,
        path: healthCheckPath,
        interval: Duration.seconds(60),
      },
      methods: ['POST', 'GET', 'PUT', 'DELETE'],
    });

    const awsExports = generateSolutionConfig({
      issuer: issuer,
      clientId: clientId,
      redirectUrl: controlPlane.controlPlaneUrl,
      solutionVersion: SolutionInfo.SOLUTION_VERSION,
      controlPlaneMode: 'ALB',
      solutionBucket: solutionBucket.bucket.bucketName,
      solutionPluginPrefix: pluginPrefix,
      solutionRegion: Aws.REGION,
      oidcLogoutUrl: oidcLogoutUrl,
    });

    controlPlane.addFixedResponse('aws-exports', {
      routePath: SOLUTION_CONFIG_PATH,
      priority: controlPlane.rootPathPriority - 5,
      content: JSON.stringify(awsExports),
      contentType: 'application/json',
    });

    new CfnOutput(this, OUTPUT_CONTROL_PLANE_URL, {
      description: 'The url of clickstream console',
      value: controlPlane.controlPlaneUrl,
    }).overrideLogicalId(OUTPUT_CONTROL_PLANE_URL);

    new CfnOutput(this, OUTPUT_CONTROL_PLANE_BUCKET, {
      description: 'Bucket to store solution console data and services logs',
      value: solutionBucket.bucket.bucketName,
    }).overrideLogicalId(OUTPUT_CONTROL_PLANE_BUCKET);

    if (!props.internetFacing && controlPlane.sourceSecurityGroupId != undefined) {
      new CfnOutput(this, 'SourceSecurityGroup', {
        description: 'Application load balancer allow traffic from this security by default',
        value: controlPlane.sourceSecurityGroupId,
      }).overrideLogicalId('SourceSecurityGroup');
    }

    // nag
    addCfnNag(this);
    Aspects.of(this).add(new RoleNamePrefixAspect(iamRolePrefixParam.valueAsString));
    Aspects.of(this).add(new RolePermissionBoundaryAspect(iamRoleBoundaryArnParam.valueAsString));
  }
}

function addCfnNag(stack: Stack) {
  const cfnNagList = [
    {
      paths_endswith: [
        'ClickStreamApi/StackActionStateMachine/ActionFunctionRole/DefaultPolicy/Resource',
      ],
      rules_to_suppress: [
        ruleToSuppressRolePolicyWithHighSPCM('DefaultPolicy'),
      ],
    },
    {
      paths_endswith: [
        'ClickStreamApi/StackActionStateMachine/ActionFunctionRole/DefaultPolicy/Resource',
      ],
      rules_to_suppress: [
        ruleToSuppressRolePolicyWithHighSPCM('DefaultPolicy'),
        ruleToSuppressRolePolicyWithWildcardResources('DefaultPolicy', 'states'),
        ruleToSuppressRolePolicyWithWildcardAction('ActionFunctionRole'),
      ],
    },
    {
      paths_endswith: [
        'ClickStreamApi/StackWorkflowStateMachine/StackWorkflowStateMachine/Role/DefaultPolicy/Resource',
      ],
      rules_to_suppress: [
        ruleToSuppressRolePolicyWithHighSPCM('DefaultPolicy'),
        ruleToSuppressRolePolicyWithWildcardResources('DefaultPolicy', 'states'),
      ],
    },
    {
      paths_endswith: [
        'ClickStreamApi/StackActionStateMachine/StackActionStateMachine/Role/DefaultPolicy/Resource',
      ],
      rules_to_suppress: [
        ruleToSuppressRolePolicyWithWildcardResources('DefaultPolicy', 'states'),
      ],
    },
    {
      paths_endswith: [
        'ClickStreamApi/ApiFunctionRole/DefaultPolicy/Resource',
      ],
      rules_to_suppress: [
        ruleToSuppressRolePolicyWithHighSPCM('ApiFunctionRoleDefaultPolicy'),
        ruleToSuppressRolePolicyWithWildcardResources('ApiFunctionRoleDefaultPolicy', 'lambda'),
      ],
    },
    ruleForLambdaVPCAndReservedConcurrentExecutions('AWS679f53fac002430cb0da5b7982bd2287/Resource', 'ApiFunction'),
  ];
  addCfnNagToStack(stack, cfnNagList);
  addCfnNagForLogRetention(stack);
  addCfnNagForCustomResourceProvider(stack, 'CDK built-in provider for DicInitCustomResourceProvider', 'DicInitCustomResourceProvider');
  NagSuppressions.addStackSuppressions(stack, [
    {
      id: 'AwsSolutions-IAM4',
      reason:
        'LogRetention lambda role which are created by CDK uses AWSLambdaBasicExecutionRole',
    },
    {
      id: 'AwsSolutions-L1',
      // The non-container Lambda function is not configured to use the latest runtime version
      reason:
        'The lambda is created by CDK, CustomResource framework-onEvent, the runtime version will be upgraded by CDK',
    },
    {
      id: 'AwsSolutions-SQS3',
      reason: 'The SQS is a dead-letter queue (DLQ), and does not need a DLQ enabled',
    },
  ]);
}