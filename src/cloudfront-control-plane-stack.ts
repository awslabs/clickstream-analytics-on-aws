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
import { Aspects, Aws, CfnOutput, CfnResource, DockerImage, Duration, Fn, IAspect, Stack, StackProps } from 'aws-cdk-lib';
import { TokenAuthorizer } from 'aws-cdk-lib/aws-apigateway';
import { DnsValidatedCertificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
  CfnDistribution,
  FunctionCode,
  FunctionEventType,
  OriginProtocolPolicy,
  OriginRequestCookieBehavior,
  OriginRequestPolicy,
  OriginRequestQueryStringBehavior,
  Function,
  ResponseHeadersPolicy,
  HeadersFrameOption,
  HeadersReferrerPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { AddBehaviorOptions } from 'aws-cdk-lib/aws-cloudfront/lib/distribution';
import { FunctionAssociation } from 'aws-cdk-lib/aws-cloudfront/lib/function';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Source } from 'aws-cdk-lib/aws-s3-deployment';
import { NagSuppressions } from 'cdk-nag';
import { Construct, IConstruct } from 'constructs';
import { addCfnNagForCustomResourceProvider, addCfnNagForLogRetention, addCfnNagSuppressRules, addCfnNagToStack, rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions } from './common/cfn-nag';
import { OUTPUT_CONTROL_PLANE_BUCKET, OUTPUT_CONTROL_PLANE_URL } from './common/constant';
import { Parameters } from './common/parameters';
import { POWERTOOLS_ENVS } from './common/powertools';
import { SolutionBucket } from './common/solution-bucket';
import { SolutionInfo } from './common/solution-info';
import { getShortIdOfStack } from './common/stack';
import { ClickStreamApiConstruct } from './control-plane/backend/click-stream-api';
import { CloudFrontS3Portal, CNCloudFrontS3PortalProps, DomainProps } from './control-plane/cloudfront-s3-portal';
import { Constant } from './control-plane/private/constant';
import { supressWarningsForCloudFrontS3Portal } from './control-plane/private/nag';
import { SolutionCognito } from './control-plane/private/solution-cognito';
import { generateSolutionConfig, SOLUTION_CONFIG_PATH } from './control-plane/private/solution-config';

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

export class CloudFrontControlPlaneStack extends Stack {

  private paramGroups: any[] = [];
  private paramLabels: any = {};

  constructor(scope: Construct, id: string, props?: CloudFrontControlPlaneStackProps) {
    super(scope, id, props);

    this.templateOptions.description = SolutionInfo.DESCRIPTION + '- Control Plane';

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

      Aspects.of(this).add(new InjectCustomResourceConfig('true'));

      this.addToParamGroups(
        'Domain Information',
        iamCertificateId.logicalId,
        domainName.logicalId,
      );
    } else {
      if (props?.useCustomDomainName) {

        const domainParameters = Parameters.createDomainParameters(this, this.paramGroups, this.paramLabels);

        const hostedzone = HostedZone.fromHostedZoneAttributes(this, 'hostZone', {
          hostedZoneId: domainParameters.hostedZoneId.valueAsString,
          zoneName: domainParameters.hostedZoneName.valueAsString,
        });

        const certificate = new DnsValidatedCertificate(this, 'certificate', {
          domainName: Fn.join('.', [domainParameters.recordName.valueAsString, domainParameters.hostedZoneName.valueAsString]),
          hostedZone: hostedzone,
          region: 'us-east-1',
        });

        domainProps = {
          hostZone: hostedzone,
          recordName: domainParameters.recordName.valueAsString,
          certificate: certificate,
        };
      }
    }

    const functionAssociations: FunctionAssociation[] = [];
    if (!props?.targetToCNRegions) {
      functionAssociations.push({
        function: new Function(this, 'FrontRewriteFunction', {
          functionName: `FrontRewriteFunction-${Aws.REGION}-${getShortIdOfStack(this)}`,
          code: FunctionCode.fromInline(`function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri.startsWith('/signin') || 
    uri.startsWith('/projects') || 
    uri.startsWith('/project') || 
    uri.startsWith('/pipelines') || 
    uri.startsWith('/plugins') || 
    uri.startsWith('/alarms') || 
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

    if (createCognitoUserPool) {
      responseHeadersPolicy = new ResponseHeadersPolicy(this, 'response_headers_policy', {
        responseHeadersPolicyName: `clickstream-response_header-policy-${getShortIdOfStack(this)}`,
        securityHeadersBehavior: {
          contentSecurityPolicy: {
            contentSecurityPolicy: `default-src 'self' data:; upgrade-insecure-requests; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self' ${cspUrl}`,
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

        dockerImage: DockerImage.fromRegistry(Constant.NODE_IMAGE_V16),
        buildCommand: [
          'bash', '-c',
          'export APP_PATH=/tmp/app && mkdir $APP_PATH && cd ./frontend/ && find -L . -type f -not -path "./build/*" -not -path "./node_modules/*" \
          -exec cp --parents {} $APP_PATH \\; && cd $APP_PATH && yarn install --loglevel error && yarn run build --loglevel error && cp -r ./build/* /asset-output/',
        ],
        environment: {
          GENERATE_SOURCEMAP: process.env.GENERATE_SOURCEMAP ?? 'false',
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

    let issuer: string;
    let clientId: string;
    let jwksUriSuffix: string;
    //Create Cognito user pool and client for backend api
    if (createCognitoUserPool) {
      const emailParamerter = Parameters.createCognitoUserEmailParameter(this);
      this.addToParamLabels('Admin User Email', emailParamerter.logicalId);
      this.addToParamGroups('Authentication Information', emailParamerter.logicalId);

      const cognito = new SolutionCognito(this, 'solution-cognito', {
        email: emailParamerter.valueAsString,
        callbackUrls: [`${controlPlane.controlPlaneUrl}/signin`],
      });

      issuer = cognito.oidcProps.issuer;
      clientId = cognito.oidcProps.appClientId;
      jwksUriSuffix = '/.well-known/jwks.json';

    } else {
      const oidcParameters = Parameters.createOIDCParameters(this, this.paramGroups, this.paramLabels);
      issuer = oidcParameters.oidcProvider.valueAsString;
      clientId = oidcParameters.oidcClientId.valueAsString;
      jwksUriSuffix = oidcParameters.jwksUriSuffix.valueAsString;
    }

    const authFunction = new NodejsFunction(this, 'AuthorizerFunction', {
      runtime: props?.targetToCNRegions ? Runtime.NODEJS_16_X : Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: './src/control-plane/auth/index.ts',
      environment: {
        JWKS_URI: Fn.join('', [issuer, jwksUriSuffix]),
        ISSUER: issuer,
        ... POWERTOOLS_ENVS,
      },
      architecture: props?.targetToCNRegions ? undefined : Architecture.ARM_64,
      logRetention: RetentionDays.TEN_YEARS,
    });
    addCfnNagSuppressRules(authFunction.node.defaultChild as CfnResource, [
      ...rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions('AuthorizerFunction'),
    ]);

    const authorizer = new TokenAuthorizer(this, 'JWTAuthorizer', {
      handler: authFunction,
      validationRegex: '^(Bearer )[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)$',
      resultsCacheTtl: Duration.seconds(0),
    });

    const pluginPrefix = 'plugins/';
    const clickStreamApi = new ClickStreamApiConstruct(this, 'ClickStreamApi', {
      fronting: 'cloudfront',
      apiGateway: {
        stageName: 'api',
        authorizer: authorizer,
      },
      targetToCNRegions: props?.targetToCNRegions,
      stackWorkflowS3Bucket: solutionBucket.bucket,
      pluginPrefix: pluginPrefix,
      healthCheckPath: '/',
    });

    if (!clickStreamApi.lambdaRestApi) {
      throw new Error('Backend api create error.');
    }

    let behaviorOptions: AddBehaviorOptions = {};
    if (!props?.targetToCNRegions) {
      behaviorOptions = {
        originRequestPolicy: new OriginRequestPolicy(this, 'ApiGatewayOriginRequestPolicy', {
          comment: 'Policy to forward all parameters in viewer requests except for the Host header',
          originRequestPolicyName: `ApiGatewayOriginRequestPolicy-${getShortIdOfStack(this)}`,
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
      issuer: issuer,
      clientId: clientId,
      redirectUrl: controlPlane.controlPlaneUrl,
      solutionVersion: process.env.BUILD_VERSION || 'v1',
      cotrolPlaneMode: 'CLOUDFRONT',
      solutionBucket: solutionBucket.bucket.bucketName,
      solutionPluginPrefix: pluginPrefix,
      solutionRegion: Aws.REGION,
    });

    controlPlane.buckeyDeployment.addSource(Source.jsonData(key, awsExports));

    if (props?.targetToCNRegions) {
      const portalDist = controlPlane.distribution.node.defaultChild as CfnDistribution;

      //This is a tricky to avoid 403 error when aceess paths except /index.html
      //TODO issue #17
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

    //supress nag warnings
    supressWarningsForCloudFrontS3Portal(this);

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
        'ClickStreamApi/ApiGatewayAccessLogs/Resource',
      ],
      rules_to_suppress: [
        {
          id: 'W84',
          reason:
            'By default CloudWatchLogs LogGroups data is encrypted using the CloudWatch server-side encryption keys (AWS Managed Keys)',
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


