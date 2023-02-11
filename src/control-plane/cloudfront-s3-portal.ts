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

import path from 'path';
import {
  RemovalPolicy,
  Fn,
  DockerImage,
  BundlingOutput,
  ArnFormat,
  Arn,
  Aws,
  Stack,
  Duration,
} from 'aws-cdk-lib';
import { ICertificate, DnsValidatedCertificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
  IDistribution,
  Distribution,
  CfnOriginAccessControl,
  AllowedMethods,
  CachedMethods,
  ViewerProtocolPolicy,
  PriceClass,
  SecurityPolicyProtocol,
  CfnDistribution,
  CachePolicy,
  OriginAccessIdentity,
  CloudFrontWebDistribution,
  CloudFrontAllowedMethods,
  ViewerCertificate,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { PolicyStatement, Effect, ServicePrincipal, CanonicalUserPrincipal } from 'aws-cdk-lib/aws-iam';

import { ARecord, IHostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import {
  BlockPublicAccess,
  IBucket,
  Bucket,
  BucketEncryption,
  BucketAccessControl,
} from 'aws-cdk-lib/aws-s3';
import {
  Source,
  BucketDeployment,
} from 'aws-cdk-lib/aws-s3-deployment';

import { Construct } from 'constructs';
import { LogProps } from '../common/alb';
import { addCfnNagSuppressRules } from '../common/cfn-nag';
import { Constant } from './private/constant';

export interface DistributionProps {
  readonly enableIpv6?: boolean;
  readonly cachedMethods?: CachedMethods;
  readonly logProps?: LogProps;
}

export interface DomainProps {
  readonly recordName: string;
  readonly hostZone: IHostedZone;
  readonly certificate?: ICertificate;
}

export interface CNCloudFrontS3PortalProps {
  readonly iamCertificateId: string;
  readonly domainName: string;
}

export interface CloudFrontS3PortalProps {
  readonly assetPath: string;
  readonly distributionProps?: DistributionProps;
  readonly domainProps?: DomainProps;
  readonly cnCloudFrontS3PortalProps?: CNCloudFrontS3PortalProps;
}

export class CloudFrontS3Portal extends Construct {

  public readonly distribution: IDistribution;
  public readonly bucket: IBucket;
  public readonly logBucket: IBucket;
  public readonly controlPlaneUrl: string;

  constructor(scope: Construct, id: string, props: CloudFrontS3PortalProps) {
    super(scope, id);

    this.node.addValidation({
      validate: () => {
        const messages: string[] = [];
        if (props.cnCloudFrontS3PortalProps !== undefined && props.domainProps !== undefined) {
          messages.push('DomainProps is unnecessary when cnCloudFrontS3PortalProps is not undefined and vice versa');
        }

        return messages;
      },
    });

    this.logBucket = props.distributionProps?.logProps?.bucket ?? new Bucket(this, 'portal_log_bucket', {
      encryption: BucketEncryption.S3_MANAGED,
      accessControl: BucketAccessControl.LOG_DELIVERY_WRITE,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      serverAccessLogsPrefix: 'log-bucket-access-log/',
    });

    const portalBucket = new Bucket(this, 'portal_bucket', {
      versioned: false,
      encryption: BucketEncryption.S3_MANAGED,
      accessControl: BucketAccessControl.LOG_DELIVERY_WRITE,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      serverAccessLogsBucket: this.logBucket,
      serverAccessLogsPrefix: 'portal-bucket-access-log/',
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    });

    const distributionDescription = `CloudFront distribution for ${Stack.of(this).templateOptions.description}`;

    let origin: S3Origin;
    let portalBucketPolicyStatement: PolicyStatement;
    if (props.cnCloudFrontS3PortalProps !== undefined) {
      const originAccessIdentity = new OriginAccessIdentity(this, 'origin_access_identity',
        {
          comment: 'portal-distribution-originAccessIdentity',
        },
      );
      origin = new S3Origin(portalBucket, {
        originAccessIdentity: originAccessIdentity,
      });

      portalBucketPolicyStatement = new PolicyStatement({
        actions: ['s3:GetObject'],
        effect: Effect.ALLOW,
        principals: [
          new CanonicalUserPrincipal(
            originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId,
          ),
        ],
        resources: [`${portalBucket.bucketArn}/*`],
      });

      this.distribution = new CloudFrontWebDistribution(this, 'PortalDistribution', {
        enableIpV6: false,
        priceClass: PriceClass.PRICE_CLASS_ALL,
        defaultRootObject: 'index.html',
        viewerProtocolPolicy: ViewerProtocolPolicy.ALLOW_ALL,
        viewerCertificate: ViewerCertificate.fromCloudFrontDefaultCertificate(props.cnCloudFrontS3PortalProps.domainName),
        originConfigs: [
          {
            s3OriginSource: {
              s3BucketSource: portalBucket,
              originAccessIdentity,
            },
            behaviors: [{
              isDefaultBehavior: true,
              forwardedValues: {
                queryString: false,
              },
              defaultTtl: Duration.days(7),
              maxTtl: Duration.days(30),
              allowedMethods: CloudFrontAllowedMethods.GET_HEAD,
              compress: true,
            }],

          },
        ],
        loggingConfig: {
          bucket: this.logBucket,
          prefix: 'cloudfront-access-log',
        },
        comment: distributionDescription,
      });

      addCfnNagSuppressRules(
        this.distribution.node.defaultChild as CfnDistribution,
        [
          {
            id: 'W70', //Cloudfront should use minimum protocol version TLS 1.2
            reason: Constant.NAG_REASON_TLSV_REQUIRED_CN_REGION,
          },
        ],
      );

      this.controlPlaneUrl = 'https://' + this.distribution.distributionDomainName;

    } else {
      origin = new S3Origin(portalBucket);
      portalBucketPolicyStatement = new PolicyStatement({
        actions: ['s3:GetObject'],
        effect: Effect.ALLOW,
        principals: [
          new ServicePrincipal('cloudfront.amazonaws.com'),
        ],
        resources: [`${portalBucket.bucketArn}/*`],
      });

      let certificate: ICertificate | undefined = undefined;
      let domainName: string | undefined = undefined;
      if (props.domainProps != undefined) {
        domainName = Fn.join('.', [props.domainProps.recordName, props.domainProps.hostZone.zoneName]);
        if (props.domainProps?.certificate === undefined) {
          certificate = new DnsValidatedCertificate(this, 'certificate', {
            domainName: Fn.join('.', [props.domainProps.recordName, props.domainProps.hostZone.zoneName]),
            hostedZone: props.domainProps.hostZone,
            region: 'us-east-1',
          });
        } else {
          certificate = props.domainProps.certificate;
        }
      }

      const oac = new CfnOriginAccessControl(this, 'origin_access_control', {
        originAccessControlConfig: {
          name: Stack.of(this).stackName + '-oac',
          originAccessControlOriginType: 's3',
          signingBehavior: 'always',
          signingProtocol: 'sigv4',
        },
      });

      this.distribution = new Distribution(this, 'PortalDistribution', {
        certificate,
        minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2019,
        domainNames: domainName ? [domainName] : [],
        defaultBehavior: {
          origin,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
          cachedMethods: props.distributionProps?.cachedMethods ?? CachedMethods.CACHE_GET_HEAD,
          cachePolicy: new CachePolicy(this, 'defaultCachePolicy', {
            cachePolicyName: `cachepolicy-${Stack.of(this).stackName}`,
            defaultTtl: Duration.days(7),
            minTtl: Duration.seconds(0),
            maxTtl: Duration.days(30),
          }),
        },

        defaultRootObject: 'index.html',
        priceClass: PriceClass.PRICE_CLASS_ALL,
        enableIpv6: props.distributionProps?.enableIpv6 ?? false,
        enableLogging: props.distributionProps?.logProps?.enableAccessLog,
        logBucket: this.logBucket,
        logFilePrefix: props.distributionProps?.logProps?.prefix ?? 'cloudfront-access-log',
        comment: distributionDescription,
      });

      const portalDist = this.distribution.node.defaultChild as CfnDistribution;

      addCfnNagSuppressRules(
        portalDist,
        [
          {
            id: 'W70', //Cloudfront should use minimum protocol version TLS 1.2
            reason: Constant.NAG_REASON_TLSV1_2_DEFAULT_CERT_DOMAIN,
          },
        ],
      );

      portalDist.addPropertyOverride(
        'DistributionConfig.Origins.0.OriginAccessControlId',
        oac.getAtt('Id'),
      );
      portalDist.addPropertyOverride(
        'DistributionConfig.Origins.0.S3OriginConfig.OriginAccessIdentity',
        '',
      );

      portalBucketPolicyStatement.addCondition('StringEquals', {
        'AWS:SourceArn': Arn.format({
          resource: 'distribution/' + this.distribution.distributionId,
          service: 'cloudfront',
          account: Aws.ACCOUNT_ID,
          region: '',
          partition: Aws.PARTITION,
          arnFormat: ArnFormat.COLON_RESOURCE_NAME,
        }),
      });

      if (props.domainProps !== undefined) {
        new ARecord(this, 'arecord', {
          recordName: props.domainProps.recordName!,
          zone: props.domainProps.hostZone,
          target: RecordTarget.fromAlias(new CloudFrontTarget(this.distribution)),
        });

        this.controlPlaneUrl = 'https://' + Fn.join('.', [props.domainProps.recordName, props.domainProps.hostZone.zoneName]);
      } else {
        this.controlPlaneUrl = 'https://' + this.distribution.distributionDomainName;
      }
    }

    portalBucket.addToResourcePolicy(portalBucketPolicyStatement);
    this.bucket = portalBucket;

    // upload static web assets
    new BucketDeployment(this, 'portal_deploy', {
      sources: [
        Source.asset(path.join(__dirname, props.assetPath), {
          bundling: {
            image: DockerImage.fromRegistry(Constant.NODE_IMAGE_V16_SLIM),
            command: [
              'bash', '-c',
              'npm install && npm run build && cp -r ./build/* /asset-output/',
            ],
            outputType: BundlingOutput.NOT_ARCHIVED,
          },
        }),
      ],
      destinationBucket: portalBucket,
      prune: false,
      distribution: this.distribution,
      distributionPaths: ['/index.html', '/asset-manifest.json', '/robots.txt', '/locales/*'],
    });
  }

}
