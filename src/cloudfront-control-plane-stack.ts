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

import { join } from 'path';
import { OUTPUT_CONTROL_PLANE_BUCKET, OUTPUT_CONTROL_PLANE_URL } from '@aws/clickstream-base-lib';
import { Aspects, Aws, CfnCondition, CfnOutput, CfnResource, DockerImage, Duration, Fn, IAspect, Stack, StackProps } from 'aws-cdk-lib';
import { IAuthorizer, TokenAuthorizer } from 'aws-cdk-lib/aws-apigateway';
import { DnsValidatedCertificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
  CfnDistribution,
  FunctionCode,
  FunctionEventType,
  OriginProtocolPolicy,
  OriginRequestCookieBehavior,
  OriginRequestPolicy,
  OriginRequestQueryStringBehavior,
  Function as CloudFrontFunction,
  ResponseHeadersPolicy,
  HeadersFrameOption,
  HeadersReferrerPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { AddBehaviorOptions } from 'aws-cdk-lib/aws-cloudfront/lib/distribution';
import { FunctionAssociation } from 'aws-cdk-lib/aws-cloudfront/lib/function';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Source } from 'aws-cdk-lib/aws-s3-deployment';
import { NagSuppressions } from 'cdk-nag';
import { Construct, IConstruct } from 'constructs';
import { RoleNamePrefixAspect, RolePermissionBoundaryAspect } from './common/aspects';
import { addCfnNagForCustomResourceProvider, addCfnNagForLogRetention, addCfnNagSuppressRules, addCfnNagToStack, ruleForLambdaVPCAndReservedConcurrentExecutions, ruleToSuppressRolePolicyWithHighSPCM, ruleToSuppressRolePolicyWithWildcardAction, ruleToSuppressRolePolicyWithWildcardResources, rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions } from './common/cfn-nag';
import { createLambdaRole } from './common/lambda';
import { Parameters } from './common/parameters';
import { SolutionBucket } from './common/solution-bucket';
import { SolutionInfo } from './common/solution-info';
import { getShortIdOfStackWithRegion } from './common/stack';
import { ClickStreamApiConstruct } from './control-plane/backend/click-stream-api';
import { CloudFrontS3Portal, CNCloudFrontS3PortalProps, DomainProps } from './control-plane/cloudfront-s3-portal';
import { Constant } from './control-plane/private/constant';
import { suppressWarningsForCloudFrontS3Portal as suppressWarningsForCloudFrontS3Portal } from './control-plane/private/nag';
import { SolutionCognito } from './control-plane/private/solution-cognito';
import { generateSolutionConfig, SOLUTION_CONFIG_PATH } from './control-plane/private/solution-config';
import { SolutionNodejsFunction } from './private/function';

export interface CloudFrontControlPlaneStackProps extends StackProps {
  /**
   * Indicate whether to create stack in CN regions
   *
   * @default - false.
   */
  targetToCNRegions?: boolean;

  /**
   * Whether to use custom domain name
   */
  useCustomDomainName?: boolean;

  /**
   * user existing OIDC provider or not
   */
  useExistingOIDCProvider?: boolean;
}

interface OIDCInfo {
  readonly issuer: string;
  readonly clientId: string;
  readonly oidcLogoutUrl: string;
  readonly adminEmail: string;
}

interface BackendApiProps {
  readonly authorizer: IAuthorizer;
  readonly oidcInfo: OIDCInfo;
  readonly pluginPrefix: string;
  readonly bucket: IBucket;
  readonly iamRolePrefix: string;
  readonly iamRoleBoundaryArn: string;
  readonly conditionStringRolePrefix: string;
  readonly conditionStringStackPrefix: string;
  readonly targetToCNRegions?: boolean;
}

export class CloudFrontControlPlaneStack extends Stack {

  private paramGroups: any[] = [];
  private paramLabels: any = {};

  constructor(scope: Construct, id: string, props?: CloudFrontControlPlaneStackProps) {
    super(scope, id, props);

    this.templateOptions.description = SolutionInfo.DESCRIPTION + '- Control Plane';

    const {
      iamRolePrefixParam,
      iamRoleBoundaryArnParam,
    } = Parameters.createIAMRolePrefixAndBoundaryParameters(this, this.paramGroups, this.paramLabels);

    let domainProps: DomainProps | undefined = undefined;
    let cnCloudFrontS3PortalProps: CNCloudFrontS3PortalProps | undefined;
    const solutionBucket = new SolutionBucket(this, 'ClickstreamSolution');

    if (props?.targetToCNRegions) {
      const iamCertificateId = Parameters.createIAMCertificateIdParameter(this);
      this.addToParamLabels('Certificate Id', iamCertificateId.logicalId);

      const domainName = Parameters.createDomainNameParameter(this);
      this.addToParamLabels('Domain Name', domainName.logicalId);

      cnCloudFrontS3PortalProps = {
        domainName: domainName.valueAsString,
        iamCertificateId: iamCertificateId.valueAsString,
      };

      Aspects.of(this).add(new InjectCustomResourceConfig('false'));

      this.addToParamGroups(
        'Domain Information',
        iamCertificateId.logicalId,
        domainName.logicalId,
      );
    } else {
      if (props?.useCustomDomainName) {

        const domainParameters = Parameters.createDomainParameters(this, this.paramGroups, this.paramLabels);

        const hostedZone = HostedZone.fromHostedZoneAttributes(this, 'hostZone', {
          hostedZoneId: domainParameters.hostedZoneId.valueAsString,
          zoneName: domainParameters.hostedZoneName.valueAsString,
        });

        const certificate = new DnsValidatedCertificate(this, 'certificate', { //NOSONAR
          domainName: Fn.join('.', [domainParameters.recordName.valueAsString, domainParameters.hostedZoneName.valueAsString]),
          hostedZone: hostedZone,
          region: 'us-east-1',
        });

        domainProps = {
          hostZone: hostedZone,
          recordName: domainParameters.recordName.valueAsString,
          certificate: certificate,
        };
      }
    }

    const functionAssociations: FunctionAssociation[] = [];
    if (!props?.targetToCNRegions) {
      functionAssociations.push({
        function: new CloudFrontFunction(this, 'FrontRewriteFunction', {
          functionName: `FrontRewriteFunction-${getShortIdOfStackWithRegion(this)}`,
          code: FunctionCode.fromInline(`function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri.startsWith('/signin') || 
    uri.startsWith('/projects') || 
    uri.startsWith('/project') || 
    uri.startsWith('/pipelines') || 
    uri.startsWith('/plugins') || 
    uri.startsWith('/alarms') || 
    uri.startsWith('/user') || 
    uri.startsWith('/analytics') || 
    uri.startsWith('/quicksight')) {
      request.uri = '/index.html'; 
  }
  return request; 
}`),
        }),
        eventType: FunctionEventType.VIEWER_REQUEST,
      });
    }

    const createCognitoUserPool = !props?.useExistingOIDCProvider && !props?.targetToCNRegions;
    let responseHeadersPolicy: ResponseHeadersPolicy | undefined = undefined;
    const cspUrl = [
      `https://cognito-idp.${Aws.REGION}.amazonaws.com`,
      `*.auth.${Aws.REGION}.amazoncognito.com`,
      solutionBucket.bucket.bucketDomainName,
      solutionBucket.bucket.bucketRegionalDomainName,
    ].join(' ');

    const frameCSPUrl = [
      `*.quicksight.${Aws.PARTITION}.amazon.com`,
      'cn-north-1.quicksight.amazonaws.cn',
      'cn-northwest-1.quicksight.amazonaws.cn',
    ].join(' ');

    if (createCognitoUserPool) {
      responseHeadersPolicy = new ResponseHeadersPolicy(this, 'response_headers_policy', {
        responseHeadersPolicyName: `clickstream-response_header-policy-${getShortIdOfStackWithRegion(this)}`,
        securityHeadersBehavior: {
          contentSecurityPolicy: {
            contentSecurityPolicy: `default-src 'self' data:; upgrade-insecure-requests; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self' ${cspUrl}; frame-src ${frameCSPUrl};`,
            override: true,
          },
          contentTypeOptions: { override: true },
          frameOptions: { frameOption: HeadersFrameOption.DENY, override: true },
          referrerPolicy: { referrerPolicy: HeadersReferrerPolicy.NO_REFERRER, override: true },
          strictTransportSecurity: { accessControlMaxAge: Duration.seconds(600), includeSubdomains: true, override: true },
          xssProtection: { protection: true, modeBlock: true, override: true },
        },
      });
    }

    const controlPlane = new CloudFrontS3Portal(this, 'cloudfront_control_plane', {
      frontendProps: {
        assetPath: join(__dirname, '..'),

        dockerImage: DockerImage.fromRegistry(Constant.NODE_IMAGE_V18),
        buildCommands: [
          'npm install -g pnpm@8.15.3 --prefix /tmp/node/.npm-global',
          'export PATH=/tmp/node/.npm-global/bin:$PATH',
          'export APP_PATH=/tmp/app',
          'mkdir $APP_PATH',
          'tar --exclude=\'node_modules\' --exclude=\'cdk.out\' --exclude=\'build\' -cf - . | (cd $APP_PATH && tar -xf -)',
          'cd $APP_PATH',
          'pnpm install',
          'pnpm projen',
          'pnpm nx run-many --target=build',
          'cd ./frontend',
          'cp -r ./build/* /asset-output/',
        ],
        environment: {
          GENERATE_SOURCEMAP: process.env.GENERATE_SOURCEMAP ?? 'false',
          REACT_APP_SOLUTION_VERSION: SolutionInfo.SOLUTION_VERSION,
        },
        user: 'node',
        autoInvalidFilePaths: ['/index.html', '/asset-manifest.json', '/robots.txt', SOLUTION_CONFIG_PATH, '/locales/*'],
      },
      cnCloudFrontS3PortalProps,
      domainProps,
      distributionProps: {
        logProps: {
          enableAccessLog: true,
          bucket: solutionBucket.bucket,
        },
        functionAssociations: functionAssociations,
        responseHeadersPolicy,
      },
    });

    const oidcInfo = this.oidcInfo(createCognitoUserPool ? controlPlane.controlPlaneUrl : undefined);
    const authorizer = this.createAuthorizer(oidcInfo);
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
    const clickStreamApi = this.createBackendApi({
      authorizer,
      oidcInfo,
      pluginPrefix,
      bucket: solutionBucket.bucket,
      iamRolePrefix: iamRolePrefixParam.valueAsString,
      iamRoleBoundaryArn: iamRoleBoundaryArnParam.valueAsString,
      conditionStringRolePrefix,
      conditionStringStackPrefix,
      targetToCNRegions: props?.targetToCNRegions,
    });

    if (!clickStreamApi.lambdaRestApi) {
      throw new Error('Backend api create error.');
    }

    let behaviorOptions: AddBehaviorOptions = {};
    if (!props?.targetToCNRegions) {
      behaviorOptions = {
        originRequestPolicy: new OriginRequestPolicy(this, 'ApiGatewayOriginRequestPolicy', {
          comment: 'Policy to forward all parameters in viewer requests except for the Host header',
          originRequestPolicyName: `ApiGatewayOriginRequestPolicy-${getShortIdOfStackWithRegion(this)}`,
          cookieBehavior: OriginRequestCookieBehavior.all(),
          headerBehavior: {
            behavior: 'allExcept',
            headers: ['host'],
          },
          queryStringBehavior: OriginRequestQueryStringBehavior.all(),
        }),
      };
    }
    controlPlane.addHttpOrigin(
      `/${clickStreamApi.lambdaRestApi.deploymentStage.stageName}/*`,
      Fn.select(2, Fn.split('/', clickStreamApi.lambdaRestApi.url)),
      {
        protocolPolicy: OriginProtocolPolicy.HTTPS_ONLY,
        originPath: `/${clickStreamApi.lambdaRestApi.deploymentStage.stageName}`,
      },
      behaviorOptions,
    );

    // upload config to S3
    const key = SOLUTION_CONFIG_PATH.substring(1); //remove slash
    const awsExports = generateSolutionConfig({
      issuer: oidcInfo.issuer,
      clientId: oidcInfo.clientId,
      redirectUrl: controlPlane.controlPlaneUrl,
      solutionVersion: process.env.BUILD_VERSION || 'v1',
      controlPlaneMode: 'CLOUDFRONT',
      solutionBucket: solutionBucket.bucket.bucketName,
      solutionPluginPrefix: pluginPrefix,
      solutionRegion: Aws.REGION,
      oidcLogoutUrl: oidcInfo.oidcLogoutUrl,
    });

    controlPlane.bucketDeployment.addSource(Source.jsonData(key, awsExports));

    if (props?.targetToCNRegions) {
      const portalDist = controlPlane.distribution.node.defaultChild as CfnDistribution;

      //This is a tricky to avoid 403 error when access paths except /index.html
      portalDist.addPropertyOverride(
        'DistributionConfig.CustomErrorResponses',
        [
          {
            ErrorCode: 403,
            ResponseCode: 200,
            ResponsePagePath: '/index.html',
          },
        ],
      );
    }

    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: this.paramGroups,
        ParameterLabels: this.paramLabels,
      },
    };

    //suppress nag warnings
    suppressWarningsForCloudFrontS3Portal(this);

    new CfnOutput(this, OUTPUT_CONTROL_PLANE_URL, {
      description: 'The url of clickstream console',
      value: controlPlane.controlPlaneUrl,
    }).overrideLogicalId(OUTPUT_CONTROL_PLANE_URL);

    new CfnOutput(this, OUTPUT_CONTROL_PLANE_BUCKET, {
      description: 'Bucket to store solution console data and services logs',
      value: controlPlane.logBucket.bucketName,
    }).overrideLogicalId(OUTPUT_CONTROL_PLANE_BUCKET);

    if (cnCloudFrontS3PortalProps !== undefined) {
      new CfnOutput(this, 'CloudFrontDomainName', {
        description: 'CloudFront domain name',
        value: controlPlane.distribution.distributionDomainName,
      }).overrideLogicalId('CloudFrontDomainName');
    }

    // nag
    addCfnNag(this);
    Aspects.of(this).add(new RoleNamePrefixAspect(iamRolePrefixParam.valueAsString));
    Aspects.of(this).add(new RolePermissionBoundaryAspect(iamRoleBoundaryArnParam.valueAsString));
  }

  private oidcInfo(controlPlaneUrl?: string): OIDCInfo {
    let issuer: string;
    let clientId: string;
    let oidcLogoutUrl: string = '';
    const emailParameter = Parameters.createCognitoUserEmailParameter(this);
    //Create Cognito user pool and client for backend api
    if (controlPlaneUrl) {
      this.addToParamLabels('Admin User Email', emailParameter.logicalId);
      this.addToParamGroups('Authentication Information', emailParameter.logicalId);

      const cognito = new SolutionCognito(this, 'solution-cognito', {
        email: emailParameter.valueAsString,
        callbackUrls: [`${controlPlaneUrl}/signin`],
        logoutUrls: [`${controlPlaneUrl}`],
      });

      issuer = cognito.oidcProps.issuer;
      clientId = cognito.oidcProps.appClientId;
      oidcLogoutUrl = cognito.oidcProps.oidcLogoutUrl;

    } else {
      const oidcParameters = Parameters.createOIDCParameters(this, this.paramGroups, this.paramLabels);
      issuer = oidcParameters.oidcProvider.valueAsString;
      clientId = oidcParameters.oidcClientId.valueAsString;
    }

    return {
      issuer,
      clientId,
      oidcLogoutUrl,
      adminEmail: emailParameter.valueAsString,
    };
  }

  private createAuthorizer(oidcInfo: OIDCInfo): TokenAuthorizer {
    const authFunction = new SolutionNodejsFunction(this, 'AuthorizerFunction', {
      handler: 'handler',
      entry: './src/control-plane/auth/index.ts',
      environment: {
        ISSUER: oidcInfo.issuer,
      },
      timeout: Duration.seconds(15),
      memorySize: 512,
      logConf: {
        retention: RetentionDays.TEN_YEARS,
      },
      applicationLogLevel: 'WARN',
      role: createLambdaRole(this, 'AuthorizerFunctionRole', false, []),
    });
    addCfnNagSuppressRules(authFunction.node.defaultChild as CfnResource, [
      ...rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions('AuthorizerFunction'),
    ]);

    const authorizer = new TokenAuthorizer(this, 'JWTAuthorizer', {
      handler: authFunction,
      validationRegex: '^(Bearer )[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)$',
      resultsCacheTtl: Duration.seconds(0),
    });

    return authorizer;
  }

  private createBackendApi(props: BackendApiProps): ClickStreamApiConstruct {
    const clickStreamApi = new ClickStreamApiConstruct(this, 'ClickStreamApi', {
      fronting: 'cloudfront',
      apiGateway: {
        stageName: 'api',
        authorizer: props.authorizer,
      },
      targetToCNRegions: props.targetToCNRegions,
      stackWorkflowS3Bucket: props.bucket,
      pluginPrefix: props.pluginPrefix,
      healthCheckPath: '/',
      adminUserEmail: props.oidcInfo.adminEmail,
      iamRolePrefix: props.iamRolePrefix,
      iamRoleBoundaryArn: props.iamRoleBoundaryArn,
      conditionStringRolePrefix: props.conditionStringRolePrefix,
      conditionStringStackPrefix: props.conditionStringStackPrefix,
    });

    return clickStreamApi;
  }

  private addToParamGroups(label: string, ...param: string[]) {
    this.paramGroups.push({
      Label: { default: label },
      Parameters: param,
    });
  }

  private addToParamLabels(label: string, param: string) {
    this.paramLabels[param] = {
      default: label,
    };
  }
}

class InjectCustomResourceConfig implements IAspect {
  public constructor(private isInstallLatestAwsSdk: string) { }

  public visit(node: IConstruct): void {
    if (
      node instanceof CfnResource &&
      node.cfnResourceType === 'Custom::AWS'
    ) {
      node.addPropertyOverride('InstallLatestAwsSdk', this.isInstallLatestAwsSdk);
    }
  }
}

function addCfnNag(stack: Stack) {
  const cfnNagList = [
    {
      paths_endswith: [
        'ClickStreamApi/ClickStreamApiFunctionRole/DefaultPolicy/Resource',
      ],
      rules_to_suppress: [
        ruleToSuppressRolePolicyWithHighSPCM('DefaultPolicy'),
      ],
    },
    {
      paths_endswith: [
        'ClickStreamApi/StackWorkflowStateMachine/StackWorkflowStateMachine/Role/DefaultPolicy/Resource',
      ],
      rules_to_suppress: [
        ruleToSuppressRolePolicyWithWildcardResources('DefaultPolicy', 'states'),
        ruleToSuppressRolePolicyWithHighSPCM('DefaultPolicy'),
      ],
    },
    {
      paths_endswith: [
        'ClickStreamApi/StackActionStateMachine/ActionFunctionRole/DefaultPolicy/Resource',
      ],
      rules_to_suppress: [
        ruleToSuppressRolePolicyWithHighSPCM('DefaultPolicy'),
        ruleToSuppressRolePolicyWithWildcardAction('ActionFunctionRole'),
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
    ruleForLambdaVPCAndReservedConcurrentExecutions('AWS679f53fac002430cb0da5b7982bd2287/Resource', 'AddAdminUserFunction'),
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


