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

import { App } from 'aws-cdk-lib';
import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import { TestStack } from './TestTask';

function findFirstResource(template: Template, type: string) {
  const allResources = template.toJSON().Resources;
  for (const key of Object.keys(allResources)) {
    const resource = allResources[key];
    if (resource.Type == type) {
      return resource;
    }
  }
  return;
}

function findFirstResourceKey(template: Template, type: string) {
  const allResources = template.toJSON().Resources;
  for (const key of Object.keys(allResources)) {
    const resource = allResources[key];
    if (resource.Type == type) {
      return { key, resource };
    }
  }
  return { key: undefined, resource: undefined };
}

function findResources(template: Template, type: string) {
  const resources: any[] = [];
  const allResources = template.toJSON().Resources;
  for (const key of Object.keys(allResources)) {
    const r = allResources[key];
    if (r.Type == type) {
      resources.push(r);
    }
  }
  return resources;
}

test('Has one autoscaling group', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
  });
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::AutoScaling::AutoScalingGroup', 1);
});

test('Has one ECS cluster', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
  });
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::ECS::Cluster', 1);
});

test('Has one Capacity Provider', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
  });
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::ECS::CapacityProvider', 1);
});

test('Has one ECS Service', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
  });
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::ECS::Service', 1);
});

test('WarmPool is created as expected', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
    warmPoolSize: 1,
  });
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::AutoScaling::WarmPool', {
    MinSize: 1,
  });
});

test('WarmPool is not created when warmPoolSize=0', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
    warmPoolSize: 0,
  });
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::AutoScaling::WarmPool', 0);
});


test('WarmPool is created when using CfnParameter', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
    withWarmPoolSizeParameter: true,
  });
  const paramCapture = new Capture();
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::AutoScaling::WarmPool', 1);
  template.hasResourceProperties('AWS::AutoScaling::WarmPool', {
    MinSize: {
      Ref: paramCapture,
    },
  });
  expect(paramCapture.asString()).toEqual('WarmPoolSizeParam');
});


test('ECS task has log Configuration', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
  });
  const template = Template.fromStack(stack);

  const taskDef = findFirstResource(template, 'AWS::ECS::TaskDefinition');
  const containerDefinitions = taskDef.Properties.ContainerDefinitions;

  for (const def of containerDefinitions ) {
    expect(def.LogConfiguration.LogDriver).toEqual('awslogs');
    expect(def.LogConfiguration.Options['awslogs-stream-prefix']).toMatch(new RegExp('proxy|worker'));
  }
});


test('LogGroup has config RetentionInDays', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
  });
  const template = Template.fromStack(stack);
  template.allResourcesProperties('AWS::Logs::LogGroup', {
    RetentionInDays: Match.anyValue(),
  });
});


test('ECS service has load balancer', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
  });
  const template = Template.fromStack(stack);
  const ecsService = findFirstResource(template, 'AWS::ECS::Service');

  expect(ecsService.Properties.LoadBalancers.length == 1).toBeTruthy();
});

test('ECS service has HealthCheck grace time configured', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
  });
  const template = Template.fromStack(stack);
  const ecsService = findFirstResource(template, 'AWS::ECS::Service');
  expect(ecsService.Properties.HealthCheckGracePeriodSeconds > 0).toBeTruthy();
});

test('ECS service is in two subnets of VPC', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
  });
  const template = Template.fromStack(stack);
  const ecsService = findFirstResource(template, 'AWS::ECS::Service');
  expect(
    (ecsService.Properties.NetworkConfiguration.AwsvpcConfiguration.Subnets.length = 2),
  ).toBeTruthy();
});

test('ECS service ScalingPolicy is configured', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
  });
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::ApplicationAutoScaling::ScalingPolicy', 1);
});

test('ALB default protocol is http', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
  });

  const template = Template.fromStack(stack);
  const listener = findFirstResource(
    template,
    'AWS::ElasticLoadBalancingV2::Listener',
  );
  const properties = listener.Properties;
  expect(properties.Port == 80).toBeTruthy();
  expect(properties.Protocol == 'HTTP').toBeTruthy();
});

test('ALB has certification and protocol https', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
    withDomainZone: true,
  });
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Certificates: Match.anyValue(),
    Port: 443,
    Protocol: 'HTTPS',
    SslPolicy: 'ELBSecurityPolicy-TLS-1-2-2017-01',
  });
});

test('The ECS service has one task which has two containers', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
  });
  const template = Template.fromStack(stack);
  const taskDefinition = findFirstResource(
    template,
    'AWS::ECS::TaskDefinition',
  );
  expect(
    taskDefinition.Properties.ContainerDefinitions.length == 2,
  ).toBeTruthy();
});

test('Sink to Msk container - vector environments', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
  });
  const template = Template.fromStack(stack);
  const taskDefinition = findFirstResource(
    template,
    'AWS::ECS::TaskDefinition',
  );
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
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
  });
  const template = Template.fromStack(stack);
  const taskDefinition = findFirstResource(
    template,
    'AWS::ECS::TaskDefinition',
  );
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
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
  });
  const template = Template.fromStack(stack);
  const taskDefinition = findFirstResource(
    template,
    'AWS::ECS::TaskDefinition',
  );
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

test('Hosted Zone record is Type A', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withDomainZone: true,
    withMskConfig: true,
  });
  const template = Template.fromStack(stack);
  template.hasResource('AWS::Route53::RecordSet', {
    Properties: {
      Name: 'test.cs.test-example.com.',
      Type: 'A',
      AliasTarget: Match.anyValue(),
      HostedZoneId: Match.anyValue(),
    },
  });
});

test('A Certificate is created if hosted zone is set', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withDomainZone: true,
    withMskConfig: true,
  });
  const template = Template.fromStack(stack);
  const certificate = findFirstResource(
    template,
    'AWS::CertificateManager::Certificate',
  );
  expect(
    certificate.Properties.DomainName == 'test.cs.test-example.com',
  ).toBeTruthy();
});

test('Https is used if hosted zone is set', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withDomainZone: true,
    withMskConfig: true,
  });
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
    Certificates: Match.anyValue(),
    Port: 443,
    Protocol: 'HTTPS',
  });
});

test('Http is redirected to Https if hosted zone is set', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withDomainZone: true,
    withMskConfig: true,
  });
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

test('Construct has property server url - https', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
    withDomainZone: true,
    serverEndpointPath: '/test_me',
  });
  const template = Template.fromStack(stack);
  const ingestionServerUrlOutput = template.findOutputs(
    'ingestionServerUrl',
    {},
  );
  const [https, _, path] =
    ingestionServerUrlOutput.ingestionServerUrl.Value['Fn::Join'][1];
  expect(https == 'https://').toBeTruthy();
  expect(path == '/test_me').toBeTruthy();
});

test('Construct has property server url - http', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
    serverEndpointPath: '/test_me',
  });
  const template = Template.fromStack(stack);
  const ingestionServerUrlOutput = template.findOutputs(
    'ingestionServerUrl',
    {},
  );
  const [http, _, path] =
    ingestionServerUrlOutput.ingestionServerUrl.Value['Fn::Join'][1];
  expect(http == 'http://').toBeTruthy();
  expect(path == '/test_me').toBeTruthy();
});

test('Server endpoint path can be configured in nginx task', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
    serverEndpointPath: '/test_end_point',
  });
  const template = Template.fromStack(stack);
  const taskDefinition = findFirstResource(
    template,
    'AWS::ECS::TaskDefinition',
  );
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

test('Server endpoint path can be configured in ALB', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
    serverEndpointPath: '/test_end_point',
  });
  const template = Template.fromStack(stack);

  const listenerRule = findFirstResource(
    template,
    'AWS::ElasticLoadBalancingV2::ListenerRule',
  );
  expect(
    listenerRule.Properties.Conditions[0].PathPatternConfig.Values[0].startsWith(
      '/test_end_point',
    ),
  ).toBeTruthy();
});

test('SecurityGroupIngress is added to Msk security group', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
    serverEndpointPath: '/test_end_point',
  });
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

test('SecurityGroupIngress is added to ECS cluster SecurityGroup to allow access from ALB', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
    serverEndpointPath: '/test_end_point',
  });
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
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
  });
  const template = Template.fromStack(stack);
  template.hasResourceProperties(
    'AWS::ElasticLoadBalancingV2::LoadBalancer',
    {
      //IpAddressType: 'dualstack',
      IpAddressType: 'ipv4',
      Scheme: 'internet-facing',
    },
  );
});

test('enable Alb access log is configured', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
    withAlbAccessLog: true,
  });
  const template = Template.fromStack(stack);
  const alb = findFirstResource(
    template,
    'AWS::ElasticLoadBalancingV2::LoadBalancer',
  );
  const albAttrs = alb.Properties.LoadBalancerAttributes;

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

test('S3 bucket policy is configured to allow ALB to write files when Alb access log is configured', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
    withAlbAccessLog: true,
  });
  const template = Template.fromStack(stack);
  const bucketPolices = findResources(template, 'AWS::S3::BucketPolicy');
  let hasLogDelivery = false;
  let hasAccountRoot = false;

  for (const policy of bucketPolices) {
    const statements = policy.Properties.PolicyDocument.Statement as any[];
    for (const statement of statements) {
      let principalService = statement.Principal.Service;
      let principalAWS = statement.Principal.AWS;
      if (
        'logdelivery.elasticloadbalancing.amazonaws.com' == principalService
      ) {
        hasLogDelivery = true;
      }
      if (principalAWS && principalAWS['Fn::Join']) {
        if ((principalAWS['Fn::Join'][1] as any[]).includes(':root')) {
          hasAccountRoot = true;
        }
      }
    }
  }
  expect(hasLogDelivery).toBeTruthy();
  expect(hasAccountRoot).toBeTruthy();
});


test('server EndpointPath and CorsOrigin can be configured', () => {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
    serverEndpointPath: '/abc/test',
    serverCorsOrigin: 'a.test.com,b.test.net',
  });
  const template = Template.fromStack(stack);
  const taskDefinition = findFirstResource(template, 'AWS::ECS::TaskDefinition');
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


test('ECS::ClusterCapacityProviderAssociations has DefaultCapacityProviderStrategy', ()=> {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
  });
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ECS::ClusterCapacityProviderAssociations', {
    CapacityProviders: Match.anyValue(),
    DefaultCapacityProviderStrategy: Match.anyValue(),
  });

});

test('DeleteECSClusterCustomResource depends on the ECS::ClusterCapacityProviderAssociations', ()=> {
  const app = new App();
  const stack = new TestStack(app, 'test', {
    withMskConfig: true,
  });
  const template = Template.fromStack(stack);
  const { key: associationsKey } = findFirstResourceKey(template, 'AWS::ECS::ClusterCapacityProviderAssociations');
  const dependsOnCapture = new Capture();
  template.hasResource('AWS::CloudFormation::CustomResource', {
    Properties: {
      ServiceToken: {
        'Fn::GetAtt': [
          Match.stringLikeRegexp('IngestionServerDeleteECSClusterCustomResourceProviderframeworkonEvent.*'),
          'Arn',
        ],
      },
    },
    DependsOn: dependsOnCapture,
  });
  expect(dependsOnCapture.asArray().includes(associationsKey)).toBeTruthy();
});

