/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { join } from 'path';
import { Stack, StackProps, CfnOutput, Fn, IAspect, CfnResource, Aspects, DockerImage } from 'aws-cdk-lib';
import { DnsValidatedCertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { CfnDistribution, OriginProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { Architecture, CfnFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Construct, IConstruct } from 'constructs';
import { addCfnNagToStack, addCfnNagSuppressRules } from './common/cfn-nag';

import { Parameters } from './common/parameters';
import { SolutionInfo } from './common/solution-info';
import { ClickStreamApiConstruct } from './control-plane/backend/click-stream-api';
import { CloudFrontS3Portal, DomainProps, CNCloudFrontS3PortalProps } from './control-plane/cloudfront-s3-portal';
import { Constant } from './control-plane/private/constant';
import {
  supressWarningsForCloudFrontS3Portal,
} from './control-plane/private/nag';
import { SolutionCognito } from './control-plane/private/solution-cognito';

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

      new CfnOutput(this, 'CustomDomainName', {
        description: 'Custom domain name',
        value: domainName.valueAsString,
      }).overrideLogicalId('CustomDomainName');

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

    const clickStreamApi = new ClickStreamApiConstruct(this, 'ClickStreamApi', {
      fronting: 'cloudfront',
      apiGateway: {
        stageName: 'api',
      },
    });

    const controlPlane = new CloudFrontS3Portal(this, 'cloudfront_control_plane', {
      frontendProps: {
        assetPath: join(__dirname, '../frontend'),
        dockerImage: DockerImage.fromRegistry(Constant.NODE_IMAGE_V16),
        buildCommand: [
          'bash', '-c',
          'export APP_PATH=/tmp/app && mkdir $APP_PATH && cp -r `ls -A /asset-input | grep -v "node_modules" | grep -v "build"` $APP_PATH && cd $APP_PATH && npm install --loglevel error && npm run build --loglevel error && cp -r ./build/* /asset-output/',
        ],
        user: 'node',
        autoInvalidFilePaths: ['/index.html', '/asset-manifest.json', '/robots.txt', '/locales/*'],
      },
      cnCloudFrontS3PortalProps,
      domainProps,
      distributionProps: {
        logProps: {
          enableAccessLog: true,
        },
      },
    });

    let issuer: string;
    //Create Cognito user pool and client for backend api
    if (!props?.useExistingOIDCProvider && !props?.targetToCNRegions) {
      const emailParamerter = Parameters.createCognitoUserEmailParameter(this);
      this.addToParamLabels('Admin User Email', emailParamerter.logicalId);
      this.addToParamGroups('Authentication Information', emailParamerter.logicalId);

      const cognito = new SolutionCognito(this, 'solution-cognito', {
        email: emailParamerter.valueAsString,
        callbackUrls: [controlPlane.controlPlaneUrl],
      });

      issuer = cognito.oidcProps.issuer;

    } else {
      const oidcParameters = Parameters.createOIDCParameters(this, this.paramGroups, this.paramLabels);
      issuer = oidcParameters.oidcProvider.valueAsString;
    }

    const authFunction = new NodejsFunction(this, 'AuthorizerFunction', {
      runtime: props?.targetToCNRegions ? Runtime.NODEJS_16_X : Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: './src/control-plane/auth/index.ts',
      environment: {
        JWKS_URI: issuer + '/.well-known/jwks.json',
        ISSUER: issuer,
      },
      architecture: Architecture.ARM_64,
      reservedConcurrentExecutions: 100,
    });
    addCfnNagSuppressRules(
      authFunction.node.defaultChild as CfnFunction,
      [
        {
          id: 'W89', //Lambda functions should be deployed inside a VPC
          reason: Constant.NAG_REASON_NO_VPC_INVOLVED,
        },
      ],
    );

    // keep for future use
    // new TokenAuthorizer(this, 'JWTAuthorizer', {
    //   handler: authFunction,
    //   validationRegex: "^(Bearer )[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)$"
    // });

    if (!clickStreamApi.lambdaRestApi) {
      throw new Error('Backend api create error.');
    }
    controlPlane.addHttpOrigin(
      `/${clickStreamApi.lambdaRestApi.deploymentStage.stageName}/*`,
      Fn.select(2, Fn.split('/', clickStreamApi.lambdaRestApi.url)),
      {
        protocolPolicy: OriginProtocolPolicy.HTTPS_ONLY,
        originPath: `/${clickStreamApi.lambdaRestApi.deploymentStage.stageName}`,
      },
    );

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

    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: this.paramGroups,
        ParameterLabels: this.paramLabels,
      },
    };

    //supress nag warnings
    supressWarningsForCloudFrontS3Portal(this);

    new CfnOutput(this, 'ControlPlaneUrl', {
      description: 'The CloudFront distribution domain name',
      value: controlPlane.controlPlaneUrl,
    }).overrideLogicalId('ControlPlaneUrl');

    new CfnOutput(this, 'PortalBucket', {
      description: 'Bucket to store the portal asset',
      value: controlPlane.bucket.bucketName,
    }).overrideLogicalId('PortalBucket');

    new CfnOutput(this, 'LogBucket', {
      description: 'Bucket to store access log',
      value: controlPlane.logBucket.bucketName,
    }).overrideLogicalId('LogBucket');

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
        'ClickStreamApi/ClickStreamApi/Default/{proxy+}/ANY/Resource',
        'ClickStreamApi/ClickStreamApi/Default/ANY/Resource',
      ],
      rules_to_suppress: [
        {
          id: 'W59',
          reason: 'TODO authorization will be added later',
        },
      ],
    },
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
}


