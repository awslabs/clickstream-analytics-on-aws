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

import { App, Aspects, Stack } from 'aws-cdk-lib';
import { BootstraplessStackSynthesizer, CompositeECRRepositoryAspect } from 'cdk-bootstrapless-synthesizer';
import { AwsSolutionsChecks, NagPackSuppression, NagSuppressions } from 'cdk-nag';
import { ApplicationLoadBalancerControlPlaneStack } from './alb-control-plane-stack';
import { CloudFrontControlPlaneStack } from './cloudfront-control-plane-stack';
import { DataPipelineStack } from './data-pipeline-stack';
import { IngestionServerStack } from './ingestion-server-stack';
import { KafkaS3SinkConnectorStack } from './kafka-s3-connector-stack';

const app = new App();

function stackSuppressions(stacks: Stack[], suppressions: NagPackSuppression[]) {
  stacks.forEach(s => {
    NagSuppressions.addStackSuppressions(s, suppressions, true);
  });
}

stackSuppressions([
  new ApplicationLoadBalancerControlPlaneStack(app, 'public-exist-vpc-control-plane-stack', {
    existingVpc: true,
    internetFacing: true,
    useCustomDomain: false,
    synthesizer: synthesizer(),
  }),
  new ApplicationLoadBalancerControlPlaneStack(app, 'public-exist-vpc-custom-domain-control-plane-stack', {
    existingVpc: true,
    internetFacing: true,
    useCustomDomain: true,
    synthesizer: synthesizer(),
  }),
  new ApplicationLoadBalancerControlPlaneStack(app, 'public-new-vpc-control-plane-stack', {
    existingVpc: false,
    internetFacing: true,
    useCustomDomain: false,
    synthesizer: synthesizer(),
  }),
  new ApplicationLoadBalancerControlPlaneStack(app, 'public-new-vpc-custom-domain-control-plane-stack', {
    existingVpc: false,
    internetFacing: true,
    useCustomDomain: true,
    synthesizer: synthesizer(),
  }),
], [
  { id: 'AwsSolutions-IAM5', reason: 'allow the logs of Lambda publishing to CloudWatch Logs with ambiguous logstream name' },
  { id: 'AwsSolutions-EC23', reason: 'It is a public facing service so it works as desgin' },
]);


stackSuppressions([
  new ApplicationLoadBalancerControlPlaneStack(app, 'private-exist-vpc-control-plane-stack', {
    existingVpc: true,
    internetFacing: false,
    useCustomDomain: false,
    synthesizer: synthesizer(),
  }),
  new ApplicationLoadBalancerControlPlaneStack(app, 'private-new-vpc-control-plane-stack', {
    existingVpc: false,
    internetFacing: false,
    useCustomDomain: false,
    synthesizer: synthesizer(),
  }),
], [
  { id: 'AwsSolutions-IAM5', reason: 'allow the logs of Lambda publishing to CloudWatch Logs with ambiguous logstream name' },
]);

const commonSuppresionRulesForCloudFrontS3Pattern = [
  { id: 'AwsSolutions-IAM4', reason: 'Cause by CDK BucketDeployment construct (aws-cdk-lib/aws-s3-deployment)' },
  { id: 'AwsSolutions-IAM5', reason: 'Cause by CDK BucketDeployment construct (aws-cdk-lib/aws-s3-deployment)' },
  { id: 'AwsSolutions-APIG1', reason: 'TODO: Fix it later' },
  { id: 'AwsSolutions-APIG2', reason: 'TODO: Fix it later' },
  { id: 'AwsSolutions-APIG3', reason: 'TODO: Fix it later' },
  { id: 'AwsSolutions-APIG4', reason: 'TODO: Fix it later' },
  { id: 'AwsSolutions-COG1', reason: 'TODO: Fix it later' },
  { id: 'AwsSolutions-COG4', reason: 'TODO: Fix it later' },
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
  { id: 'AwsSolutions-L1', reason: 'NODEJS_18_X is not supported in China regions' },
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
], commonSuppresionRulesForCloudFrontS3PatternInGloabl);

stackSuppressions([
  new CloudFrontControlPlaneStack(app, 'cloudfront-s3-control-plane-stack-global-customdomain', {
    useCustomDomainName: true,
    synthesizer: synthesizer(),
  }),
], [
  ...commonSuppresionRulesForCloudFrontS3PatternInGloabl,
  { id: 'AwsSolutions-L1', reason: 'Caused by CDK DnsValidatedCertificate resource when request ACM certificate' },
]);


new IngestionServerStack(app, 'ingestion-server-kafka-stack', { //To Kafka
  synthesizer: synthesizer(),
  deliverToKafka: true,
  deliverToKinesis: false,
  deliverToS3: false,
});


new IngestionServerStack(app, 'ingestion-server-kinesis-stack', { //To Kinesis
  synthesizer: synthesizer(),
  deliverToKafka: false,
  deliverToKinesis: true,
  deliverToS3: false,
});


new IngestionServerStack(app, 'ingestion-server-s3-stack', { //To S3
  synthesizer: synthesizer(),
  deliverToKafka: false,
  deliverToKinesis: false,
  deliverToS3: true,
});

new KafkaS3SinkConnectorStack(app, 'kafka-s3-sink-stack', { // Kafka S3 sink connector
  synthesizer: synthesizer(),
});

new DataPipelineStack(app, 'data-pipeline-stack', {
  synthesizer: synthesizer(),
});


Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
if (process.env.USE_BSS) {
  Aspects.of(app).add(new CompositeECRRepositoryAspect());
}

function synthesizer() {
  return process.env.USE_BSS ? new BootstraplessStackSynthesizer(): undefined;
}