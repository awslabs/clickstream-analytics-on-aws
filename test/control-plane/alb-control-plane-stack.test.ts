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

import {
  App,
  Aws,
} from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ApplicationLoadBalancerControlPlaneStack } from '../../src/alb-control-plane-stack';

describe('ALBLambdaPotalStack', () => {

  test('ALBPotalStack - existvpc - public - custom domain', () => {
    const app = new App();

    //WHEN
    const portalStack = new ApplicationLoadBalancerControlPlaneStack(app, 'ALBPublicConstrolplaneTestStack01', {
      env: {
        region: Aws.REGION,
        account: Aws.ACCOUNT_ID,
      },
      existingVpc: true,
      internetFacing: true,
      useCustomDomain: true,
    });

    const template = Template.fromStack(portalStack);

    template.hasParameter('vpcId', {});
    template.hasParameter('publicSubnets', {});
    template.hasParameter('privateSubnets', {});

    template.hasParameter('hostZoneId', {});
    template.hasParameter('hostZoneName', {});
    template.hasParameter('recordName', {});

    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      Scheme: 'internet-facing',
    });
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      Protocol: 'HTTPS',
    });
    template.resourceCountIs('AWS::CertificateManager::Certificate', 1);
    template.resourceCountIs('AWS::Route53::RecordSet', 1);

    template.resourceCountIs('AWS::S3::Bucket', 1);

    template.hasOutput('ControlPlaneUrl', {});
    template.hasOutput('VpcId', {});

  });

  test('ALBPotalStack - existvpc - public - no custom domain', () => {
    const app = new App();

    //WHEN
    const portalStack = new ApplicationLoadBalancerControlPlaneStack(app, 'ALBPublicConstrolplaneTestStack02', {
      env: {
        region: Aws.REGION,
        account: Aws.ACCOUNT_ID,
      },
      existingVpc: true,
      internetFacing: true,
      useCustomDomain: false,
    });

    const template = Template.fromStack(portalStack);

    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      Scheme: 'internet-facing',
    });

    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      Protocol: 'HTTP',
    });

    template.hasParameter('vpcId', {});
    template.hasParameter('publicSubnets', {});
    template.hasParameter('privateSubnets', {});
    template.resourceCountIs('AWS::CertificateManager::Certificate', 0);
    template.resourceCountIs('AWS::Route53::RecordSet', 0);
    template.resourceCountIs('AWS::S3::Bucket', 1);

    template.hasOutput('ControlPlaneUrl', {});
    template.hasOutput('VpcId', {});

  });

  test('ALBPotalStack - new VPC - public - no custom domain', () => {
    const app = new App();

    //WHEN
    const portalStack = new ApplicationLoadBalancerControlPlaneStack(app, 'ALBPublicConstrolplaneTestStack03', {
      env: {
        region: Aws.REGION,
        account: Aws.ACCOUNT_ID,
      },
      existingVpc: false,
      internetFacing: true,
      useCustomDomain: false,
    });

    const template = Template.fromStack(portalStack);

    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      Scheme: 'internet-facing',
    });

    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      Protocol: 'HTTP',
    });
    template.resourceCountIs('AWS::CertificateManager::Certificate', 0);
    template.resourceCountIs('AWS::Route53::RecordSet', 0);
    template.resourceCountIs('AWS::S3::Bucket', 1);

    template.hasOutput('ControlPlaneUrl', {});
    template.hasOutput('VpcId', {});
    template.hasOutput('PublicSubnets', {});
    template.hasOutput('PrivateSubnets', {});

  });

  test('ALBPotalStack - new VPC - public - custom domain', () => {
    const app = new App();

    //WHEN
    const portalStack = new ApplicationLoadBalancerControlPlaneStack(app, 'ALBPublicConstrolplaneTestStack04', {
      env: {
        region: Aws.REGION,
        account: Aws.ACCOUNT_ID,
      },
      existingVpc: false,
      internetFacing: true,
      useCustomDomain: true,
    });

    const template = Template.fromStack(portalStack);

    template.hasParameter('hostZoneId', {});
    template.hasParameter('hostZoneName', {});
    template.hasParameter('recordName', {});

    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      Scheme: 'internet-facing',
    });

    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      Protocol: 'HTTPS',
    });
    template.resourceCountIs('AWS::CertificateManager::Certificate', 1);
    template.resourceCountIs('AWS::Route53::RecordSet', 1);
    template.resourceCountIs('AWS::S3::Bucket', 1);

    template.hasOutput('ControlPlaneUrl', {});
    template.hasOutput('VpcId', {});
    template.hasOutput('PublicSubnets', {});
    template.hasOutput('PrivateSubnets', {});

  });
});


describe('ALBPotalStack - exist VPC - private - no custom domain', () => {

  test('Test control palne stack in existing vpc', () => {
    const app = new App();

    //WHEN
    const portalStack = new ApplicationLoadBalancerControlPlaneStack(app, 'ALBPrivateConstrolplaneTestStack01', {
      env: {
        region: Aws.REGION,
        account: Aws.ACCOUNT_ID,
      },
      existingVpc: true,
      internetFacing: false,
      useCustomDomain: false,
    });

    const template = Template.fromStack(portalStack);

    template.hasParameter('vpcId', {});
    template.hasParameter('publicSubnets', {});
    template.hasParameter('privateSubnets', {});

    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      Scheme: 'internal',
    });
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      Protocol: 'HTTP',
    });
    template.resourceCountIs('AWS::CertificateManager::Certificate', 0);
    template.resourceCountIs('AWS::Route53::RecordSet', 0);
    template.resourceCountIs('AWS::S3::Bucket', 1);

    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.hasResourceProperties('AWS::Lambda::Function', {
      PackageType: 'Image',
      ReservedConcurrentExecutions: 5,
    });

    template.hasOutput('ControlPlaneUrl', {});
    template.hasOutput('VpcId', {});
    template.hasOutput('SourceSecurityGroup', {});

  });

  test('ALBPotalStack - new VPC - private - no custom domain', () => {
    const app = new App();

    //WHEN
    const portalStack = new ApplicationLoadBalancerControlPlaneStack(app, 'ALBPrivateConstrolplaneTestStack02', {
      env: {
        region: Aws.REGION,
        account: Aws.ACCOUNT_ID,
      },
      existingVpc: false,
      internetFacing: false,
      useCustomDomain: false,
    });

    const template = Template.fromStack(portalStack);

    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      Scheme: 'internal',
    });
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      Protocol: 'HTTP',
    });
    template.resourceCountIs('AWS::CertificateManager::Certificate', 0);
    template.resourceCountIs('AWS::Route53::RecordSet', 0);
    template.resourceCountIs('AWS::S3::Bucket', 1);

    template.hasOutput('ControlPlaneUrl', {});
    template.hasOutput('VpcId', {});
    template.hasOutput('SourceSecurityGroup', {});
    template.hasOutput('PublicSubnets', {});
    template.hasOutput('PrivateSubnets', {});

  });


});