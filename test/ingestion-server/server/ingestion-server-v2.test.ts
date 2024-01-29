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

import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { TestStack, TestStackProps } from './TestTask-v2';
import { WIDGETS_ORDER } from '../../../src/metrics/settings';
import { findConditionByName, findFirstResource, findResources } from '../../utils';

function generateCommonTestStackProps() {
  const commonTestStackProps: TestStackProps = {
    withMskConfig: false,
    withS3SinkConfig: false,
    withKinesisSinkConfig: false,
    enableApplicationLoadBalancerAccessLog: 'No',
    logBucketName: 'clickstream-infra-bucket1111',
    logPrefix: 'test',
    enableGlobalAccelerator: 'No',
    serverCorsOrigin: '*',
    domainName: 'www.example.com',
    certificateArn: 'arn:aws:acm:us-east-1:111111111111:certificate/fake',
    authenticationSecretArn: 'arn:aws:secretsmanager:us-east-1:111111111111:secret:fake-xxxxxx',
    serverMin: 1,
    enableAuthentication: 'No',
    protocol: 'HTTP',
    serverMax: 1,
    scaleOnCpuUtilizationPercent: 50,
    workerStopTimeout: 330,
    serverEndpointPath: '/collect',
    devMode: 'No',
  };
  return commonTestStackProps;
}

test('Has one ECS cluster', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::ECS::Cluster', 1);
});

test('Has one ECS Service', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::ECS::Service', 1);
});

test('ECS task has log Configuration', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);

  const taskDef = findFirstResource(
    template,
    'AWS::ECS::TaskDefinition',
  )?.resource;
  const containerDefinitions = taskDef.Properties.ContainerDefinitions;

  for (const def of containerDefinitions) {
    expect(def.LogConfiguration.LogDriver).toEqual('awslogs');
    expect(def.LogConfiguration.Options['awslogs-stream-prefix']).toMatch(
      new RegExp('proxy|worker'),
    );
  }
});

test('LogGroup has config RetentionInDays', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  template.allResourcesProperties('AWS::Logs::LogGroup', {
    RetentionInDays: Match.anyValue(),
  });
});

test('ECS service has load balancer', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  const ecsService = findFirstResource(template, 'AWS::ECS::Service')?.resource;

  expect(ecsService.Properties.LoadBalancers.length == 1).toBeTruthy();
});

test('ECS service has HealthCheck grace time configured', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  const ecsService = findFirstResource(template, 'AWS::ECS::Service')?.resource;
  expect(ecsService.Properties.HealthCheckGracePeriodSeconds > 0).toBeTruthy();
});

test('ECS service is in two subnets of VPC', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  const ecsService = findFirstResource(template, 'AWS::ECS::Service')?.resource;
  expect(
    (ecsService.Properties.NetworkConfiguration.AwsvpcConfiguration.Subnets.length = 2),
  ).toBeTruthy();
});

test('ECS service ScalingPolicy is configured', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::ApplicationAutoScaling::ScalingPolicy', 1);
});

test('ALB protocol is condition with IsHTTPS', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  const stack = new TestStack(app, 'test', commonTestStackProps);

  const template = Template.fromStack(stack);
  const listener = findFirstResource(
    template,
    'AWS::ElasticLoadBalancingV2::Listener',
  )?.resource;
  const properties = listener.Properties;
  expect(properties.Protocol).toEqual(
    { 'Fn::If': ['IsHTTPS', 'HTTPS', 'HTTP'] },
  );
  expect(properties.Port).toEqual({ 'Fn::If': ['IsHTTPS', 443, 80] });
});

test('The ECS service has one task which has two containers', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  const taskDefinition = findFirstResource(
    template,
    'AWS::ECS::TaskDefinition',
  )?.resource;
  expect(
    taskDefinition.Properties.ContainerDefinitions.length == 2,
  ).toBeTruthy();
});

test('Sink to Msk container - vector environments', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  const taskDefinition = findFirstResource(
    template,
    'AWS::ECS::TaskDefinition',
  )?.resource;
  const containerDefinitions = taskDefinition.Properties.ContainerDefinitions;
  const vector = containerDefinitions.filter((c: any) => c.Name == 'worker')[0];

  const env1 = {
    Name: 'AWS_MSK_BROKERS',
    Value: 'mskBroker1,mskBroker2,mskBroker3',
  };

  const env2 = {
    Name: 'AWS_MSK_TOPIC',
    Value: 'testMskTopic',
  };

  const hasBrokers =
    vector.Environment.filter(
      (e: any) => e.Name == env1.Name && e.Value == env1.Value,
    ).length == 1;
  const hasTopic =
    vector.Environment.filter(
      (e: any) => e.Name == env2.Name && e.Value == env2.Value,
    ).length == 1;

  expect(hasBrokers).toBeTruthy();
  expect(hasTopic).toBeTruthy();
});

test('Sink to Msk - vector configure as ACK', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  const taskDefinition = findFirstResource(
    template,
    'AWS::ECS::TaskDefinition',
  )?.resource;
  const containerDefinitions = taskDefinition.Properties.ContainerDefinitions;
  const vector = containerDefinitions.filter((c: any) => c.Name == 'worker')[0];
  const env1 = {
    Name: 'STREAM_ACK_ENABLE',
    Value: 'true',
  };
  const hasEnv1 =
    vector.Environment.filter(
      (e: any) => e.Name == env1.Name && e.Value == env1.Value,
    ).length == 1;
  expect(hasEnv1).toBeTruthy();
});

test('Sink to Msk container - nginx environments', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  const taskDefinition = findFirstResource(
    template,
    'AWS::ECS::TaskDefinition',
  )?.resource;
  const containerDefinitions = taskDefinition.Properties.ContainerDefinitions;
  const nginx = containerDefinitions.filter((c: any) => c.Name == 'proxy')[0];
  const env1 = {
    Name: 'SERVER_ENDPOINT_PATH',
    Value: '/collect',
  };

  const hasEndpointEnv =
    nginx.Environment.filter(
      (e: any) => e.Name == env1.Name && e.Value == env1.Value,
    ).length == 1;

  expect(hasEndpointEnv).toBeTruthy();
});

test('Http is redirected to Https if hosted zone is set', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  commonTestStackProps.domainName = 'www.example.com';
  commonTestStackProps.certificateArn =
    'arn:aws:acm:us-east-1:111111111111:certificate/fake';
  commonTestStackProps.protocol = 'HTTPS';
  const stack = new TestStack(app, 'test', commonTestStackProps);

  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    DefaultActions: [
      {
        RedirectConfig: {
          Port: '443',
          Protocol: 'HTTPS',
          StatusCode: 'HTTP_302',
        },
        Type: 'redirect',
      },
    ],
    Port: 80,
    Protocol: 'HTTP',
  });
});

test('Construct has property server dns - https', () => {
  const app = new App();

  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  commonTestStackProps.domainName = 'www.example.com';
  commonTestStackProps.certificateArn =
    'arn:aws:acm:us-east-1:111111111111:certificate/fake';
  commonTestStackProps.protocol = 'HTTPS';
  commonTestStackProps.serverEndpointPath = '/test_me';
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  const ingestionServerDnsOutput = template.findOutputs(
    'ingestionServerDNS',
    {},
  );
  expect(ingestionServerDnsOutput.ingestionServerDNS.Value)
    .toEqual({ 'Fn::If': ['acceleratorEnableCondition', { 'Fn::GetAtt': ['IngestionServerGlobalAccelerator22B37939', 'DnsName'] }, { 'Fn::GetAtt': ['IngestionServerALBclickstreamingestionservicealbC894A3C2', 'DNSName'] }] });
});

test('Construct has property server url - https', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  commonTestStackProps.domainName = 'www.example.com';
  commonTestStackProps.certificateArn =
    'arn:aws:acm:us-east-1:111111111111:certificate/fake';
  commonTestStackProps.protocol = 'HTTPS';
  commonTestStackProps.serverEndpointPath = '/test_me';
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  const ingestionServerUrlOutput = template.findOutputs(
    'ingestionServerUrl',
    {},
  );
  expect(ingestionServerUrlOutput.ingestionServerUrl.Value).toEqual('https://www.example.com/test_me');
});

test('Construct has property server url - http', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  commonTestStackProps.serverEndpointPath = '/test_me';
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  const ingestionServerUrlOutput = template.findOutputs(
    'ingestionServerUrl',
    {},
  );
  expect(ingestionServerUrlOutput.ingestionServerUrl.Value)
    .toEqual({ 'Fn::Join': ['', ['http://', { 'Fn::If': ['acceleratorEnableCondition', { 'Fn::GetAtt': ['IngestionServerGlobalAccelerator22B37939', 'DnsName'] }, { 'Fn::GetAtt': ['IngestionServerALBclickstreamingestionservicealbC894A3C2', 'DNSName'] }] }, '/test_me']] });
});

test('Construct has property server dns - http', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  commonTestStackProps.serverEndpointPath = '/test_me';
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  const ingestionServerDnsOutput = template.findOutputs(
    'ingestionServerDNS',
    {},
  );
  expect(ingestionServerDnsOutput.ingestionServerDNS.Value)
    .toEqual({ 'Fn::If': ['acceleratorEnableCondition', { 'Fn::GetAtt': ['IngestionServerGlobalAccelerator22B37939', 'DnsName'] }, { 'Fn::GetAtt': ['IngestionServerALBclickstreamingestionservicealbC894A3C2', 'DNSName'] }] });
});

test('Server endpoint path can be configured in nginx task', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  commonTestStackProps.serverEndpointPath = '/test_end_point';
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  const taskDefinition = findFirstResource(
    template,
    'AWS::ECS::TaskDefinition',
  )?.resource;
  const containerDefinitions = taskDefinition.Properties.ContainerDefinitions;
  const nginx = containerDefinitions.filter((c: any) => c.Name == 'proxy')[0];
  const env1 = {
    Name: 'SERVER_ENDPOINT_PATH',
    Value: '/test_end_point',
  };
  const hasEndpointEnv =
    nginx.Environment.filter(
      (e: any) => e.Name == env1.Name && e.Value == env1.Value,
    ).length == 1;
  expect(hasEndpointEnv).toBeTruthy();
});

test('SecurityGroupIngress is added to Msk security group', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  commonTestStackProps.serverEndpointPath = '/test_end_point';
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  const sgIngress = findResources(template, 'AWS::EC2::SecurityGroupIngress');
  let findSgIngress = false;
  for (const ingress of sgIngress) {
    if (
      ingress.Properties.FromPort == 9092 &&
      ingress.Properties.ToPort == 9198
    ) {
      findSgIngress = true;
      break;
    }
  }
  expect(findSgIngress).toBeTruthy();
});

test('SecurityGroup is added into SecurityGroupIngress for MSK as sink', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  commonTestStackProps.serverEndpointPath = '/test_end_point';
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  const sgIngress = findResources(template, 'AWS::EC2::SecurityGroupIngress');
  let findSgIngress = false;
  for (const ingress of sgIngress) {
    if (JSON.stringify(ingress.Properties.GroupId) == JSON.stringify(ingress.Properties.SourceSecurityGroupId)) {
      findSgIngress = true;
      break;
    }
  }
  expect(findSgIngress).toBeTruthy();
});

test('SecurityGroupIngress is added to ECS cluster SecurityGroup to allow access from ALB', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  commonTestStackProps.serverEndpointPath = '/test_end_point';
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
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
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);

  template.hasCondition('IsPrivateSubnets', {
    'Fn::Equals': [
      'publicSubnet1,publicSubnet2',
      'privateSubnet1,privateSubnet2',
    ],
  });
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    //IpAddressType: 'dualstack',
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
          'publicSubnet1',
          'publicSubnet2',
        ],
      ],
    },
  });
});

test('Alb drop_invalid_header_fields is enabled', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  commonTestStackProps.enableApplicationLoadBalancerAccessLog = 'Yes';
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
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
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  commonTestStackProps.enableApplicationLoadBalancerAccessLog = 'Yes';
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
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

test('server EndpointPath and CorsOrigin can be configured', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  commonTestStackProps.serverEndpointPath = '/abc/test';
  commonTestStackProps.serverCorsOrigin = 'a.test.com,b.test.net';
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  const taskDefinition = findFirstResource(
    template,
    'AWS::ECS::TaskDefinition',
  )?.resource;
  const containerDefinitions = taskDefinition.Properties.ContainerDefinitions;
  const proxy = containerDefinitions.filter((c: any) => c.Name == 'proxy')[0];

  const env1 = {
    Name: 'SERVER_ENDPOINT_PATH',
    Value: '/abc/test',
  };

  const env2 = {
    Name: 'SERVER_CORS_ORIGIN',
    Value: 'a.test.com,b.test.net',
  };

  const hasPath =
    proxy.Environment.filter(
      (e: any) => e.Name == env1.Name && e.Value == env1.Value,
    ).length == 1;

  const hasCorsOrigin =
    proxy.Environment.filter(
      (e: any) => e.Name == env2.Name && e.Value == env2.Value,
    ).length == 1;

  expect(hasPath).toBeTruthy();
  expect(hasCorsOrigin).toBeTruthy();
});

test('Sink to S3 container - vector environments', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withS3SinkConfig = true;
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  const taskDefinition = findFirstResource(
    template,
    'AWS::ECS::TaskDefinition',
  )?.resource;
  const containerDefinitions = taskDefinition.Properties.ContainerDefinitions;
  const vector = containerDefinitions.filter((c: any) => c.Name == 'worker')[0];

  const bucketValue = vector.Environment.filter((e: any) => e.Name == 'AWS_S3_BUCKET')[0].Value;
  expect(bucketValue).not.toEqual('__NOT_SET__');
  const prefixValue = vector.Environment.filter((e: any) => e.Name == 'AWS_S3_PREFIX')[0].Value;
  expect(prefixValue).toEqual('test-s3-data');

});

test('Sink to Kinesis container - vector environments', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withKinesisSinkConfig = true;
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  const taskDefinition = findFirstResource(
    template,
    'AWS::ECS::TaskDefinition',
  )?.resource;
  const containerDefinitions = taskDefinition.Properties.ContainerDefinitions;
  const vector = containerDefinitions.filter((c: any) => c.Name == 'worker')[0];
  const streamValue = vector.Environment.filter((e: any) => e.Name == 'AWS_KINESIS_STREAM_NAME')[0].Value;
  expect(streamValue).not.toEqual('__NOT_SET__');

});

test('Sink both to MSK and Kinesis and S3 container - vector environments', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  commonTestStackProps.withKinesisSinkConfig = true;
  commonTestStackProps.withS3SinkConfig = true;
  commonTestStackProps.devMode = 'Yes';
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  const taskDefinition = findFirstResource(
    template,
    'AWS::ECS::TaskDefinition',
  )?.resource;
  const containerDefinitions = taskDefinition.Properties.ContainerDefinitions;
  const vector = containerDefinitions.filter((c: any) => c.Name == 'worker')[0];

  const stopTimeoutValue = vector.StopTimeout;
  expect(stopTimeoutValue).toEqual(330);

  const mskBrokersValue = vector.Environment.filter((e: any) => e.Name == 'AWS_MSK_BROKERS')[0].Value;
  expect(mskBrokersValue).not.toEqual('__NOT_SET__');

  const bucketValue = vector.Environment.filter((e: any) => e.Name == 'AWS_S3_BUCKET')[0].Value;
  expect(bucketValue).not.toEqual('__NOT_SET__');

  const prefixValue = vector.Environment.filter((e: any) => e.Name == 'AWS_S3_PREFIX')[0].Value;
  expect(prefixValue).toEqual('test-s3-data');
  const streamValue = vector.Environment.filter((e: any) => e.Name == 'AWS_KINESIS_STREAM_NAME')[0].Value;
  expect(streamValue).not.toEqual('__NOT_SET__');
  const devModeValue = vector.Environment.filter((e: any) => e.Name == 'DEV_MODE')[0].Value;
  expect(devModeValue).not.toEqual('__NOT_SET__');
  expect(devModeValue).toEqual('Yes');

});

test('Enable Global Accelerator feature', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.enableGlobalAccelerator = 'Yes';
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  const accelerator = findResources(template, 'AWS::GlobalAccelerator::Accelerator');

  expect(accelerator.length === 1).toBeTruthy();

  const conditionName = accelerator[0].Condition;

  const condition = findConditionByName(template, conditionName);

  expect(condition['Fn::And'][0]).toEqual({ 'Fn::Equals': ['Yes', 'Yes'] });

  expect(condition['Fn::And'][1]['Fn::Not'][0]['Fn::Or'][0]).toEqual({ 'Fn::Equals': [{ Ref: 'AWS::Region' }, 'cn-north-1'] });
  expect(condition['Fn::And'][1]['Fn::Not'][0]['Fn::Or'][1]).toEqual({ 'Fn::Equals': [{ Ref: 'AWS::Region' }, 'cn-northwest-1'] });

});

test('Disable Global Accelerator feature', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.enableGlobalAccelerator = 'No';
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  const accelerator = findResources(template, 'AWS::GlobalAccelerator::Accelerator');

  expect(accelerator.length === 1).toBeTruthy();

  const conditionName = accelerator[0].Condition;

  const condition = findConditionByName(template, conditionName);

  expect(condition['Fn::And'][0]).toEqual({ 'Fn::Equals': ['No', 'Yes'] });

  expect(condition['Fn::And'][1]['Fn::Not'][0]['Fn::Or'][0]).toEqual({ 'Fn::Equals': [{ Ref: 'AWS::Region' }, 'cn-north-1'] });
  expect(condition['Fn::And'][1]['Fn::Not'][0]['Fn::Or'][1]).toEqual({ 'Fn::Equals': [{ Ref: 'AWS::Region' }, 'cn-northwest-1'] });

});

test('Should set metrics widgets', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::CloudFormation::CustomResource', {
    metricsWidgetsProps: {
      order: WIDGETS_ORDER.ingestionServer,
      projectId: Match.anyValue(),
      name: Match.anyValue(),
      description: {
        markdown: Match.anyValue(),
      },
      widgets: Match.anyValue(),
    },
  });
});


test('Ingestion server with MskConfig should set metrics widgets for kafkaCluster', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  const stack = new TestStack(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::CloudFormation::CustomResource', {
    metricsWidgetsProps: {
      order: WIDGETS_ORDER.kafkaCluster,
      projectId: Match.anyValue(),
      name: Match.anyValue(),
      description: {
        markdown: Match.anyValue(),
      },
      widgets: Match.anyValue(),
    },
  });
});

test('Check security group count', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withS3SinkConfig = true;
  const stack = new TestStack(app, 'test', commonTestStackProps);

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::EC2::SecurityGroup', 2);
});
