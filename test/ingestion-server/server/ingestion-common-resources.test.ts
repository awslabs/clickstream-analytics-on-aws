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

import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { IngestionCommonResourcesNestedStack } from '../../../src/ingestion-server/common-resources/ingestion-common-resources-nested-stack';
import { findResources, findFirstResource, findConditionByName } from '../../utils';

const app = new App();
const mainStack = new Stack(app, 'mainStack');
function generateCommonTestStackProps() {
  return {
    vpcId: 'vpc-1234',
    privateSubnetIds: 'privateSubnet1,privateSubnet2',
    publicSubnetIds: '',
    serverEndpointPath: '/collect',
    protocol: 'HTTP',
    enableAuthentication: 'No',
    certificateArn: 'arn:aws:acm:us-west-2:111111111111:certificate/xxx',
    domainName: 'example.com',
    enableApplicationLoadBalancerAccessLog: 'No',
    logBucketName: 'log-bucket',
    logPrefix: 'log-prefix',
    appIds: 'app1,app2',
    clickStreamSDK: 'Yes',
    authenticationSecretArn: 'arn:aws:secretsmanager:us-west-2:111111111111:secret:xxx',
    enableGlobalAccelerator: 'No',
  };
}

const stack = new IngestionCommonResourcesNestedStack(mainStack, 'test', generateCommonTestStackProps());
const template = Template.fromStack(stack);

test('Construct has property server dns - https', () => {
  const ingestionServerDnsOutput = template.findOutputs(
    'ingestionServerDNS',
    {},
  );
  expect(ingestionServerDnsOutput.ingestionServerDNS.Value)
    .toEqual({ 'Fn::If': ['acceleratorEnableCondition', { 'Fn::GetAtt': ['GlobalAccelerator739CF9C3', 'DnsName'] }, { 'Fn::GetAtt': ['ALBclickstreamingestionservicealb6D06150F', 'DNSName'] }] });
});

test('Construct has property server url', () => {
  const ingestionServerUrlOutput = template.findOutputs(
    'ingestionServerUrl',
    {},
  );
  expect(ingestionServerUrlOutput.ingestionServerUrl.Value)
    .toEqual(
      {
        'Fn::If': ['IsHTTPS', 'https://example.com/collect',
          {
            'Fn::Join': ['', ['http://',
              {
                'Fn::If': ['acceleratorEnableCondition',
                  { 'Fn::GetAtt': ['GlobalAccelerator739CF9C3', 'DnsName'] },
                  { 'Fn::GetAtt': ['ALBclickstreamingestionservicealb6D06150F', 'DNSName'] }],
              }, '/collect']],
          }],
      });
});

test('SecurityGroupIngress is added to ECS cluster SecurityGroup to allow access from ALB', () => {
  const sgIngress = findResources(template, 'AWS::EC2::SecurityGroupIngress');
  let findSgIngress = false;
  for (const ingress of sgIngress) {
    if (
      ingress.Properties.FromPort == 8088 &&
      ingress.Properties.ToPort == 8088
    ) {
      findSgIngress = true;
      break;
    }
  }
  expect(findSgIngress).toBeTruthy();
});

test('Alb is internet-facing and ipv4 by default', () => {
  template.hasCondition('IsPrivateSubnets', {
    'Fn::Equals': [
      '',
      'privateSubnet1,privateSubnet2',
    ],
  });
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    IpAddressType: 'ipv4',
    Scheme: {
      'Fn::If': ['IsPrivateSubnets', 'internal', 'internet-facing'],
    },
    Subnets: {
      'Fn::If': [
        'IsPrivateSubnets',
        [
          'privateSubnet1',
          'privateSubnet2',
        ],
        [
          '',
        ],
      ],
    },
  });
});

test('Alb drop_invalid_header_fields is enabled', () => {
  const alb = findFirstResource(
    template,
    'AWS::ElasticLoadBalancingV2::LoadBalancer',
  )?.resource;

  const albAttrs = alb.Properties.LoadBalancerAttributes['Fn::If'][1];

  let drop_invalid_header_fields = false;

  for (const attr of albAttrs) {
    if (attr.Key == 'routing.http.drop_invalid_header_fields.enabled') {
      drop_invalid_header_fields = attr.Value;
    }
  }
  expect(drop_invalid_header_fields).toBeTruthy();
});

test('enable Alb access log is configured', () => {
  const alb = findFirstResource(
    template,
    'AWS::ElasticLoadBalancingV2::LoadBalancer',
  )?.resource;
  const albAttrs = alb.Properties.LoadBalancerAttributes['Fn::If'][1];

  let access_logs_s3_bucket = false;
  let access_logs_s3_enabled = false;

  for (const attr of albAttrs) {
    if (attr.Key == 'access_logs.s3.bucket') {
      access_logs_s3_bucket = true;
    }
    if (attr.Key == 'access_logs.s3.enabled') {
      access_logs_s3_enabled = true;
    }
  }
  expect(access_logs_s3_bucket).toBeTruthy();
  expect(access_logs_s3_enabled).toBeTruthy();
});

test('Enable Global Accelerator feature', () => {
  const accelerator = findResources(template, 'AWS::GlobalAccelerator::Accelerator');

  expect(accelerator.length === 1).toBeTruthy();

  const conditionName = accelerator[0].Condition;

  const condition = findConditionByName(template, conditionName);

  expect(condition['Fn::And'][0]).toEqual({ 'Fn::Equals': ['No', 'Yes'] });

  expect(condition['Fn::And'][1]['Fn::Not'][0]['Fn::Or'][0]).toEqual({ 'Fn::Equals': [{ Ref: 'AWS::Region' }, 'cn-north-1'] });
  expect(condition['Fn::And'][1]['Fn::Not'][0]['Fn::Or'][1]).toEqual({ 'Fn::Equals': [{ Ref: 'AWS::Region' }, 'cn-northwest-1'] });

});

test('Check security group count', () => {
  template.resourceCountIs('AWS::EC2::SecurityGroup', 2);
});