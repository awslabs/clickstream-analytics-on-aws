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

const app = new App();

function stackSuppressions(stacks: Stack[], suppressions: NagPackSuppression[]) {
  stacks.forEach(s => NagSuppressions.addStackSuppressions(s, suppressions, true));
}

stackSuppressions([
  new ApplicationLoadBalancerControlPlaneStack(app, 'public-exist-vpc-control-plane-stack', {
    existingVpc: true,
    internetFacing: true,
    useCustomDomain: false,
    synthesizer: synthesizer(),
  }),
], [
  { id: 'AwsSolutions-IAM5', reason: 'allow the logs of Lambda publishing to CloudWatch Logs with ambiguous logstream name' },
  { id: 'AwsSolutions-EC23', reason: 'It is a public facing service so it works as desgin' },
]);

stackSuppressions([
  new ApplicationLoadBalancerControlPlaneStack(app, 'public-exist-vpc-custom-domian-control-plane-stack', {
    existingVpc: true,
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
], [
  { id: 'AwsSolutions-IAM5', reason: 'allow the logs of Lambda publishing to CloudWatch Logs with ambiguous logstream name' },
]);

stackSuppressions([
  new ApplicationLoadBalancerControlPlaneStack(app, 'public-new-vpc-control-plane-stack', {
    existingVpc: false,
    internetFacing: true,
    useCustomDomain: false,
    synthesizer: synthesizer(),
  }),
], [
  { id: 'AwsSolutions-IAM5', reason: 'allow the logs of Lambda publishing to CloudWatch Logs with ambiguous logstream name' },
  { id: 'AwsSolutions-EC23', reason: 'It is a public facing service so it works as desgin' },
]);

stackSuppressions([
  new ApplicationLoadBalancerControlPlaneStack(app, 'public-new-vpc-custom-codmain-control-plane-stack', {
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
  new ApplicationLoadBalancerControlPlaneStack(app, 'private-new-vpc-control-plane-stack', {
    existingVpc: false,
    internetFacing: false,
    useCustomDomain: false,
    synthesizer: synthesizer(),
  }),
], [
  { id: 'AwsSolutions-IAM5', reason: 'allow the logs of Lambda publishing to CloudWatch Logs with ambiguous logstream name' },
]);

Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

if (process.env.USE_BSS) {
  Aspects.of(app).add(new CompositeECRRepositoryAspect());
}

function synthesizer() {
  return process.env.USE_BSS ? new BootstraplessStackSynthesizer(): undefined;
}