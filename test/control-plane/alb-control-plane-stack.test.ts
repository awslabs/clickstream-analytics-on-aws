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
import { findResourcesName } from './test-utils';
import { ApplicationLoadBalancerControlPlaneStack } from '../../src/alb-control-plane-stack';

function getParameter(template: Template, param: string) {
  return template.toJSON().Parameters[param];
}

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

    template.hasParameter('VpcId', {});
    template.hasParameter('PublicSubnets', {});

    template.hasParameter('HostedZoneId', {});
    template.hasParameter('HostedZoneName', {});
    template.hasParameter('RecordName', {});

    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      Scheme: 'internet-facing',
    });
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      Protocol: 'HTTPS',
    });

    expect(findResourcesName(template, 'AWS::CertificateManager::Certificate'))
      .toEqual(['certificateEC031123']);
    expect(findResourcesName(template, 'AWS::Route53::RecordSet'))
      .toEqual(['albcontrolplanealiasRecord2560DD98']);
    expect(findResourcesName(template, 'AWS::S3::Bucket'))
      .toEqual(['logBucketLogBucket8B6A5D6C']);

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

    template.hasParameter('VpcId', {});
    template.hasParameter('PublicSubnets', {});
    template.resourceCountIs('AWS::CertificateManager::Certificate', 0);
    template.resourceCountIs('AWS::Route53::RecordSet', 0);
    expect(findResourcesName(template, 'AWS::S3::Bucket'))
      .toEqual([
        'logBucketLogBucket8B6A5D6C',
      ]);

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
    expect(findResourcesName(template, 'AWS::S3::Bucket'))
      .toEqual([
        'logBucketLogBucket8B6A5D6C',
      ]);

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

    template.hasParameter('HostedZoneId', {});
    template.hasParameter('HostedZoneName', {});
    template.hasParameter('RecordName', {});

    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      Scheme: 'internet-facing',
    });

    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      Protocol: 'HTTPS',
    });
    template.resourceCountIs('AWS::CertificateManager::Certificate', 1);
    expect(findResourcesName(template, 'AWS::Route53::RecordSet'))
      .toEqual([
        'albcontrolplanealiasRecord2560DD98',
      ]);
    expect(findResourcesName(template, 'AWS::S3::Bucket'))
      .toEqual([
        'logBucketLogBucket8B6A5D6C',
      ]);

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
    template.hasParameter('VpcId', {});
    template.hasParameter('PrivateSubnets', {});
    const publicSubnets = template.findParameters('PublicSubnets', {});
    expect(publicSubnets).toEqual({});

    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      Scheme: 'internal',
    });
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      Protocol: 'HTTP',
    });
    template.resourceCountIs('AWS::CertificateManager::Certificate', 0);
    template.resourceCountIs('AWS::Route53::RecordSet', 0);

    expect(findResourcesName(template, 'AWS::S3::Bucket'))
      .toEqual([
        'logBucketLogBucket8B6A5D6C',
      ]);
    expect(findResourcesName(template, 'AWS::Lambda::Function'))
      .toEqual([
        'albcontrolplaneportalfnC6B1CDAC',
        'ClickStreamApiStackActionStateMachineCallbackFunction4F5BE492',
        'ClickStreamApiClickStreamApiFunction8C843168',
      ]);
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

    expect(findResourcesName(template, 'AWS::S3::Bucket'))
      .toEqual([
        'logBucketLogBucket8B6A5D6C',
      ]);

    template.hasOutput('ControlPlaneUrl', {});
    template.hasOutput('VpcId', {});
    template.hasOutput('SourceSecurityGroup', {});
    template.hasOutput('PublicSubnets', {});
    template.hasOutput('PrivateSubnets', {});

  });


});


describe('CloudFormation parameter check', () => {

  const app = new App();

  const portalStack = new ApplicationLoadBalancerControlPlaneStack(app, 'ALBPrivateConstrolplaneTestStack01', {
    env: {
      region: Aws.REGION,
      account: Aws.ACCOUNT_ID,
    },
    existingVpc: true,
    internetFacing: true,
    useCustomDomain: true,
  });

  const template = Template.fromStack(portalStack);

  test('VpcId pattern', () => {
    const param = getParameter(template, 'VpcId');
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);
    const validValues = [
      'vpc-ab1234c',
    ];

    for (const v of validValues) {
      expect(v).toMatch(regex);
    }

    const invalidValues = [
      'vpc-g1234567',
      'abc-f1234',
      'vpca12345',
      'vpc-ab1234c, vpc-b1234e',
    ];
    for (const v of invalidValues) {
      expect(v).not.toMatch(regex);
    }
  });

  test('HostedZoneId pattern', () => {
    const param = getParameter(template, 'HostedZoneId');
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);
    const validValues = [
      'ZERTYUGDDDDZRHJ',
    ];

    for (const v of validValues) {
      expect(v).toMatch(regex);
    }

    const invalidValues = [
      'AERTYUGDDDDZRHJ',
      'ZERTYUGDDDDabcdef',
    ];
    for (const v of invalidValues) {
      expect(v).not.toMatch(regex);
    }
  });

  test('HostedZoneName pattern', () => {
    const param = getParameter(template, 'HostedZoneName');
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);
    const validValues = [
      'abc.com',
      'test.abc.com',
      '123.test.abc.com',
      '123.test-v1.abc.com',
      'test_v1.abc.com',
      'a123#~&%.test-2.a_bc.com',
    ];

    for (const v of validValues) {
      expect(v).toMatch(regex);
    }

    const invalidValues = [
      '',
      'a',
      'abc.example_test',
      'abc.c',
      'abc^.com',
    ];
    for (const v of invalidValues) {
      expect(v).not.toMatch(regex);
    }
  });

  test('RecordName pattern', () => {
    const param = getParameter(template, 'RecordName');
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);
    const validValues = [
      'abc',
      'def-',
      'bce_',
      '124',
      'ABC123',
    ];

    for (const v of validValues) {
      expect(v).toMatch(regex);
    }

    const invalidValues = [
      '',
      'abc@',
      'abc.example',
    ];
    for (const v of invalidValues) {
      expect(v).not.toMatch(regex);
    }
  });

});


describe('ALBLambdaPotalStack DynamoDB Endpoint', () => {

  test('DynamoDB Endpoint - existvpc - public - custom domain', () => {
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
    template.resourceCountIs('AWS::EC2::VPCEndpoint', 0);
  });

  test('DynamoDB Endpoint - existvpc - public - no custom domain', () => {
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
    template.resourceCountIs('AWS::EC2::VPCEndpoint', 0);

  });

  test('DynamoDB Endpoint - new VPC - public - no custom domain', () => {
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
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      ServiceName: {
        'Fn::Join': [
          '',
          [
            'com.amazonaws.',
            {
              Ref: 'AWS::Region',
            },
            '.dynamodb',
          ],
        ],
      },
      VpcId: {
        Ref: 'ClickstreamAnalyticsonAWSVpcDefaultVPC31B28594',
      },
      RouteTableIds: [
        {
          Ref: 'ClickstreamAnalyticsonAWSVpcDefaultVPCprivateSubnet1RouteTableBD0343AE',
        },
        {
          Ref: 'ClickstreamAnalyticsonAWSVpcDefaultVPCprivateSubnet2RouteTableB93D5F20',
        },
        { Ref: 'ClickstreamAnalyticsonAWSVpcDefaultVPCpublicSubnet1RouteTable354E1075' },
        { Ref: 'ClickstreamAnalyticsonAWSVpcDefaultVPCpublicSubnet2RouteTableBCCB9C3C' },
        { Ref: 'ClickstreamAnalyticsonAWSVpcDefaultVPCisolatedSubnet1RouteTable8028ED41' },
        { Ref: 'ClickstreamAnalyticsonAWSVpcDefaultVPCisolatedSubnet2RouteTable4C8052B7' },
      ],
      VpcEndpointType: 'Gateway',
    });
  });

  test('DynamoDB Endpoint - new VPC - public - custom domain', () => {
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
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      ServiceName: {
        'Fn::Join': [
          '',
          [
            'com.amazonaws.',
            {
              Ref: 'AWS::Region',
            },
            '.dynamodb',
          ],
        ],
      },
      VpcId: {
        Ref: 'ClickstreamAnalyticsonAWSVpcDefaultVPC31B28594',
      },
      RouteTableIds: [
        {
          Ref: 'ClickstreamAnalyticsonAWSVpcDefaultVPCprivateSubnet1RouteTableBD0343AE',
        },
        {
          Ref: 'ClickstreamAnalyticsonAWSVpcDefaultVPCprivateSubnet2RouteTableB93D5F20',
        },
        { Ref: 'ClickstreamAnalyticsonAWSVpcDefaultVPCpublicSubnet1RouteTable354E1075' },
        { Ref: 'ClickstreamAnalyticsonAWSVpcDefaultVPCpublicSubnet2RouteTableBCCB9C3C' },
        { Ref: 'ClickstreamAnalyticsonAWSVpcDefaultVPCisolatedSubnet1RouteTable8028ED41' },
        { Ref: 'ClickstreamAnalyticsonAWSVpcDefaultVPCisolatedSubnet2RouteTable4C8052B7' },
      ],
      VpcEndpointType: 'Gateway',
    });

  });
});