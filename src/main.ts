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

import { App, Aspects, Stack } from 'aws-cdk-lib';
import { BootstraplessStackSynthesizer, CompositeECRRepositoryAspect } from 'cdk-bootstrapless-synthesizer';
import { AwsSolutionsChecks, NagPackSuppression, NagSuppressions } from 'cdk-nag';
import { ApplicationLoadBalancerControlPlaneStack } from './alb-control-plane-stack';
import { CloudFrontControlPlaneStack } from './cloudfront-control-plane-stack';
import { DataAnalyticsRedshiftStack } from './data-analytics-redshift-stack';
import { DataModelingAthenaStack } from './data-modeling-athena-stack';
import { DataPipelineStack } from './data-pipeline-stack';
import { DataReportingQuickSightStack } from './data-reporting-quicksight-stack';
import { IngestionServerStack } from './ingestion-server-stack';
import { KafkaS3SinkConnectorStack } from './kafka-s3-connector-stack';
import { MetricsStack } from './metrics-stack';

const app = new App();

function stackSuppressions(stacks: Stack[], suppressions: NagPackSuppression[]) {
  stacks.forEach(s => {
    NagSuppressions.addStackSuppressions(s, suppressions, true);
  });
}

const commonSuppresionRulesForALBLambdaPattern = [
  { id: 'AwsSolutions-IAM5', reason: 'allow the logs of Lambda publishing to CloudWatch Logs with ambiguous logstream name' },
  { id: 'AwsSolutions-EC23', reason: 'It is a public facing service so it works as desgin' },
];

stackSuppressions([
  new ApplicationLoadBalancerControlPlaneStack(app, 'public-exist-vpc-control-plane-stack', {
    existingVpc: true,
    internetFacing: true,
    useCustomDomain: false,
    useExistingOIDCProvider: true,
    synthesizer: synthesizer(),
  }),
  new ApplicationLoadBalancerControlPlaneStack(app, 'public-exist-vpc-custom-domain-control-plane-stack', {
    existingVpc: true,
    internetFacing: true,
    useCustomDomain: true,
    useExistingOIDCProvider: false,
    synthesizer: synthesizer(),
  }),
], commonSuppresionRulesForALBLambdaPattern);


stackSuppressions([
  new ApplicationLoadBalancerControlPlaneStack(app, 'private-exist-vpc-control-plane-stack', {
    existingVpc: true,
    internetFacing: false,
    useCustomDomain: false,
    useExistingOIDCProvider: true,
    synthesizer: synthesizer(),
  }),
  new ApplicationLoadBalancerControlPlaneStack(app, 'private-exist-vpc-cognito-control-plane-stack', {
    existingVpc: true,
    internetFacing: false,
    useCustomDomain: true,
    useExistingOIDCProvider: false,
    synthesizer: synthesizer(),
  }),
], commonSuppresionRulesForALBLambdaPattern);

const commonSuppresionRulesForCloudFrontS3Pattern = [
  { id: 'AwsSolutions-IAM4', reason: 'Cause by CDK BucketDeployment construct (aws-cdk-lib/aws-s3-deployment)' },
  { id: 'AwsSolutions-IAM5', reason: 'Cause by CDK BucketDeployment construct (aws-cdk-lib/aws-s3-deployment)' },
  { id: 'AwsSolutions-APIG2', reason: 'The REST API input validation in Lambda(Express) code, the front ApiGateway does not need repeated validation.' },
  { id: 'AwsSolutions-COG4', reason: 'The REST API validate input via OIDC authorizer, there is no need to use Cognito user pool authorizer.' },
];

stackSuppressions([
  new CloudFrontControlPlaneStack(app, 'cloudfront-s3-control-plane-stack-cn', {
    targetToCNRegions: true,
    useCustomDomainName: true,
    synthesizer: synthesizer(),
  }),
], [
  ...commonSuppresionRulesForCloudFrontS3Pattern,
  { id: 'AwsSolutions-CFR4', reason: 'TLSv1 is required in China regions' },
]);

const commonSuppresionRulesForCloudFrontS3PatternInGloabl = [
  ...commonSuppresionRulesForCloudFrontS3Pattern,
  { id: 'AwsSolutions-CFR4', reason: 'Cause by using default default CloudFront viewer certificate' },
  { id: 'AwsSolutions-L1', reason: 'Managed by CDK Cognito module for get service token' },
];

stackSuppressions([
  new CloudFrontControlPlaneStack(app, 'cloudfront-s3-control-plane-stack-global', {
    synthesizer: synthesizer(),
  }),
  new CloudFrontControlPlaneStack(app, 'cloudfront-s3-control-plane-stack-global-oidc', {
    useExistingOIDCProvider: true,
    synthesizer: synthesizer(),
  }),
], commonSuppresionRulesForCloudFrontS3PatternInGloabl);

stackSuppressions([
  new CloudFrontControlPlaneStack(app, 'cloudfront-s3-control-plane-stack-global-customdomain', {
    useCustomDomainName: true,
    synthesizer: synthesizer(),
  }),
  new CloudFrontControlPlaneStack(app, 'cloudfront-s3-control-plane-stack-global-customdomain-oidc', {
    useCustomDomainName: true,
    useExistingOIDCProvider: true,
    synthesizer: synthesizer(),
  }),
], [
  ...commonSuppresionRulesForCloudFrontS3PatternInGloabl,
  { id: 'AwsSolutions-L1', reason: 'Caused by CDK DnsValidatedCertificate resource when request ACM certificate' },
]);

stackSuppressions([
  new IngestionServerStack(app, 'ingestion-server-kafka-stack', { //To Kafka
    synthesizer: synthesizer(),
    deliverToKafka: true,
    deliverToKinesis: false,
    deliverToS3: false,
  }),
  new IngestionServerStack(app, 'ingestion-server-kinesis-stack', { //To Kinesis
    synthesizer: synthesizer(),
    deliverToKafka: false,
    deliverToKinesis: true,
    deliverToS3: false,
  }),
  new IngestionServerStack(app, 'ingestion-server-s3-stack', { //To S3
    synthesizer: synthesizer(),
    deliverToKafka: false,
    deliverToKinesis: false,
    deliverToS3: true,
  }),
], [
  {
    id: 'AwsSolutions-IAM4',
    reason:
        'LogRetention lambda role which are created by CDK uses AWSLambdaBasicExecutionRole',
  },
  {
    id: 'AwsSolutions-IAM5',
    reason:
        'LogRetention lambda policy which are created by CDK contains wildcard permissions',
  },
  {
    id: 'AwsSolutions-AS3',
    reason: 'notifications configuration for autoscaling group is optional',
  },
  {
    id: 'AwsSolutions-ECS2',
    reason: 'No secret data in environment variables',
  },
  {
    id: 'AwsSolutions-EC23',
    reason: 'The ALB should be public',
  },
  {
    id: 'AwsSolutions-EC26',
    reason: 'The EC2 instances used by ECS don\'t persist the customer\'s data',
  },
  {
    id: 'AwsSolutions-ELB2',
    reason: 'The ALB log is optional by the customer\'s selection',
  },
  {
    id: 'AwsSolutions-SNS2',
    reason: 'The SNS Topic is set by cfnParameter, not created in this stack',
  },
  {
    id: 'AwsSolutions-SNS3',
    reason: 'The SNS Topic is set by cfnParameter, not created in this stack',
  },
  {
    id: 'AwsSolutions-L1',
    // The non-container Lambda function is not configured to use the latest runtime version
    reason:
        'The lambda is created by CDK, CustomResource framework-onEvent, the runtime version will be upgraded by CDK',
  },
]);

new KafkaS3SinkConnectorStack(app, 'kafka-s3-sink-stack', { // Kafka S3 sink connector
  synthesizer: synthesizer(),
});

new DataPipelineStack(app, 'data-pipeline-stack', {
  synthesizer: synthesizer(),
});

stackSuppressions([
  new DataAnalyticsRedshiftStack(app, app.node.tryGetContext('stackName') ?? 'data-analytics-redshift-stack', {
    synthesizer: synthesizer(),
  }),
], [
  { id: 'AwsSolutions-IAM4', reason: 'Caused by CDK built-in Lambda LogRetention/BucketNotificationsHandler used managed role AWSLambdaBasicExecutionRole to enable S3 bucket EventBridge notification' },
  { id: 'AwsSolutions-IAM5', reason: 'Caused by CDK built-in Lambda LogRetention/BucketNotificationsHandler with wildcard policy' },
  { id: 'AwsSolutions-L1', reason: 'Caused by CDK built-in custom resource provider not using latest Nodejs runtime' },
]);

new DataModelingAthenaStack(app, app.node.tryGetContext('stackName') ?? 'data-modeling-athena-stack', {
  synthesizer: synthesizer(),
}),

stackSuppressions([
  new DataReportingQuickSightStack(app, 'data-reporting-quicksight-stack', {
    synthesizer: synthesizer(),
  }),
], [
  {
    id: 'AwsSolutions-IAM4',
    reason:
      'LogRetention lambda role which are created by CDK uses AWSLambdaBasicExecutionRole',
  },
  {
    id: 'AwsSolutions-IAM5',
    reason:
      'LogRetention lambda policy which are created by CDK contains wildcard permissions',
  },
  {
    id: 'AwsSolutions-L1',
    reason:
      'Caused by CDK built-in custom resource provider not using latest Nodejs runtime',
  },
]);


stackSuppressions([
  new MetricsStack(app, 'metrics-stack', {
    synthesizer: synthesizer(),
  }),
], [
  { id: 'AwsSolutions-IAM4', reason: 'Caused by CDK built-in Lambda LogRetention lambda handler used managed role AWSLambdaBasicExecutionRole to enable S3 bucket EventBridge notification' },
  { id: 'AwsSolutions-IAM5', reason: 'Caused by CDK built-in Lambda LogRetention lambda handler with wildcard policy' },
  { id: 'AwsSolutions-L1', reason: 'Caused by CDK built-in custom resource provider not using latest Nodejs runtime' },
]);

Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
if (process.env.USE_BSS) {
  Aspects.of(app).add(new CompositeECRRepositoryAspect());
}

function synthesizer() {
  return process.env.USE_BSS ? new BootstraplessStackSynthesizer(): undefined;
}