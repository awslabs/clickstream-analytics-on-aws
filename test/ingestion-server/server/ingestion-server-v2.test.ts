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

import { INGESTION_SERVER_PING_PATH } from '@aws/clickstream-base-lib';
import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { TestStackV2, TestStackV2Props } from './TestTask-v2';
import { WIDGETS_ORDER } from '../../../src/metrics/settings';
import { findFirstResource, findResources } from '../../utils';

if (process.env.CI !== 'true') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  jest.mock('aws-cdk-lib/aws-lambda-nodejs', () => require('../../cdk-lambda-nodejs-mock'));
}

function generateCommonTestStackProps() {
  const commonTestStackProps: TestStackV2Props = {
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
  const stack = new TestStackV2(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::ECS::Cluster', 1);
});

test('Has one ECS Service', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  const stack = new TestStackV2(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::ECS::Service', 1);
});

test('ECS task has log Configuration', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  const stack = new TestStackV2(app, 'test', commonTestStackProps);
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
  const stack = new TestStackV2(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  template.allResourcesProperties('AWS::Logs::LogGroup', {
    RetentionInDays: Match.anyValue(),
  });
});

test('ECS service has load balancer', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  const stack = new TestStackV2(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  const ecsService = findFirstResource(template, 'AWS::ECS::Service')?.resource;

  expect(ecsService.Properties.LoadBalancers.length == 1).toBeTruthy();
});

test('ECS service has HealthCheck grace time configured', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  const stack = new TestStackV2(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  const ecsService = findFirstResource(template, 'AWS::ECS::Service')?.resource;
  expect(ecsService.Properties.HealthCheckGracePeriodSeconds > 0).toBeTruthy();
});

test('ECS service is in two subnets of VPC', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  const stack = new TestStackV2(app, 'test', commonTestStackProps);
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
  const stack = new TestStackV2(app, 'test', commonTestStackProps);
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::ApplicationAutoScaling::ScalingPolicy', 1);
});

test('The ECS service has one task which has two containers', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  const stack = new TestStackV2(app, 'test', commonTestStackProps);
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
  const stack = new TestStackV2(app, 'test', commonTestStackProps);
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
  const stack = new TestStackV2(app, 'test', commonTestStackProps);
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
  const stack = new TestStackV2(app, 'test', commonTestStackProps);
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

test('Server endpoint path can be configured in nginx task', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  commonTestStackProps.serverEndpointPath = '/test_end_point';
  const stack = new TestStackV2(app, 'test', commonTestStackProps);
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
  const stack = new TestStackV2(app, 'test', commonTestStackProps);
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
  const stack = new TestStackV2(app, 'test', commonTestStackProps);
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

test('server EndpointPath and CorsOrigin can be configured', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withMskConfig = true;
  commonTestStackProps.serverEndpointPath = '/abc/test';
  commonTestStackProps.serverCorsOrigin = 'a.test.com,b.test.net';
  const stack = new TestStackV2(app, 'test', commonTestStackProps);
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

  const evn3 = {
    Name: 'PING_ENDPOINT_PATH',
    Value: INGESTION_SERVER_PING_PATH,
  };

  const hasPath =
    proxy.Environment.filter(
      (e: any) => e.Name == env1.Name && e.Value == env1.Value,
    ).length == 1;

  const hasCorsOrigin =
    proxy.Environment.filter(
      (e: any) => e.Name == env2.Name && e.Value == env2.Value,
    ).length == 1;

  const hasPingPath =
    proxy.Environment.filter(
      (e: any) => e.Name == evn3.Name && e.Value == evn3.Value,
    ).length == 1;


  expect(hasPath).toBeTruthy();
  expect(hasCorsOrigin).toBeTruthy();
  expect(hasPingPath).toBeTruthy();
});

test('Sink to S3 container - vector environments', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  commonTestStackProps.withS3SinkConfig = true;
  const stack = new TestStackV2(app, 'test', commonTestStackProps);
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
  const stack = new TestStackV2(app, 'test', commonTestStackProps);
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
  const stack = new TestStackV2(app, 'test', commonTestStackProps);
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

test('Should set metrics widgets', () => {
  const app = new App();
  let commonTestStackProps = generateCommonTestStackProps();
  const stack = new TestStackV2(app, 'test', commonTestStackProps);
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
  const stack = new TestStackV2(app, 'test', commonTestStackProps);
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
