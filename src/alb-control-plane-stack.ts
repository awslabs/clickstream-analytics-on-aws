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
import {
  Duration,
  Stack,
  StackProps,
  Fn,
  CfnOutput, Aws, RemovalPolicy,
} from 'aws-cdk-lib';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { AttributeType, BillingMode, Table, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { IVpc, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { ApplicationProtocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { LambdaTarget } from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import {
  addCfnNagForLogRetention,
  addCfnNagForCustomResourceProvider,
  addCfnNagToStack,
} from './common/cfn-nag';
import { OUTPUT_CONTROL_PLANE_URL, OUTPUT_CONTROL_PLANE_BUCKET } from './common/constant';
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

  /**, OUTPUT_CONSOLE_BUCKET, OUTPUT_CONSOLE_BUCKE, OUTPUT_CONSOLE_BUCKET, OUTPUT_CONSOLE_BUCKET, OUTPUT_CONSOLE_BUCKETT
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
    // this.addTransform('AWS::LanguageExtensions');

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
        plaform: Platform.LINUX_AMD64,
        buildArgs: {
          GENERATE_SOURCEMAP: process.env.GENERATE_SOURCEMAP ?? 'false',
          CHUNK_MIN_SIZE: process.env.CHUNK_MIN_SIZE ?? '102400',
          CHUNK_MAX_SIZE: process.env.CHUNK_MAX_SIZE ?? '204800',
        },
      },
    });

    let issuer: string;
    let clientId: string;
    let oidcLogoutUrl: string = '';
    /**
     * Create Cognito user pool and client for backend api,
     * The client of Congito requires the redirect url using HTTPS
     */
    if (!props.useExistingOIDCProvider && props.useCustomDomain) {
      const emailParamerter = Parameters.createCognitoUserEmailParameter(this);
      this.paramLabels[emailParamerter.logicalId] = {
        default: 'Admin User Email',
      };

      this.paramGroups.push({
        Label: { default: 'Authentication Information' },
        Parameters: [emailParamerter.logicalId],
      });

      const cognito = new SolutionCognito(this, 'solution-cognito', {
        email: emailParamerter.valueAsString,
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

    const authorizerTable = new Table(this, 'AuthorizerCache', {
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
      encryption: TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'ttl',
    });

    const healthCheckPath = '/';

    const pluginPrefix = 'plugins/';
    const clickStreamApi = new ClickStreamApiConstruct(this, 'ClickStreamApi', {
      fronting: 'alb',
      applicationLoadBalancer: {
        vpc: controlPlane.applicationLoadBalancer.vpc,
        subnets,
        securityGroup: controlPlane.securityGroup,
      },
      authProps: {
        issuer: issuer,
        authorizerTable: authorizerTable,
      },
      stackWorkflowS3Bucket: solutionBucket.bucket,
      pluginPrefix: pluginPrefix,
      healthCheckPath: healthCheckPath,
    });

    controlPlane.addRoute('api-targets', {
      routePath: '/api/*',
      priority: controlPlane.rootPathPriority - 1,
      target: [new LambdaTarget(clickStreamApi.clickStreamApiFunction)],
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
      cotrolPlaneMode: 'ALB',
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
  }
}

function addCfnNag(stack: Stack) {
  const cfnNagList = [
    {
      paths_endswith: [
        'ClickStreamApi/ClickStreamApiFunctionRole/DefaultPolicy/Resource',
      ],
      rules_to_suppress: [
        {
          id: 'W76',
          reason:
          'This policy needs to be able to call other AWS service by design',
        },
      ],
    },
  ];
  addCfnNagToStack(stack, cfnNagList);
  addCfnNagForLogRetention(stack);
  addCfnNagForCustomResourceProvider(stack, 'CDK built-in provider for DicInitCustomResourceProvider', 'DicInitCustomResourceProvider', undefined);
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
  ]);
}