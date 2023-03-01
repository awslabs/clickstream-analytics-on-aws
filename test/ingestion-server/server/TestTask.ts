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
  CfnOutput,
  CfnParameter,
  RemovalPolicy,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import {
  FlowLogDestination,
  GatewayVpcEndpointAwsService,
  IpAddresses,
  IVpc,
  Port,
  SecurityGroup,
  SubnetType,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import { ApplicationProtocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Stream } from 'aws-cdk-lib/aws-kinesis';
import { Key } from 'aws-cdk-lib/aws-kms';
import { PublicHostedZone } from 'aws-cdk-lib/aws-route53';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
} from 'aws-cdk-lib/aws-s3';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { getDefaultFleetPropsByTier } from './tier-setting';
import {
  IngestionServer,
  IngestionServerProps,
  S3SinkConfig,
  KinesisSinkConfig,
  TierType,
} from '../../../src/ingestion-server/server/ingestion-server';


export interface VPCPros {
  readonly cidr: string;
  readonly createS3Endpoint?: boolean;
}

export const createVPC = (
  scope: Construct,
  props: VPCPros = {
    cidr: '10.1.0.0/16',
    createS3Endpoint: true,
  },
) => {
  const vpc = new Vpc(scope, 'vpc', {
    maxAzs: 2,
    ipAddresses: IpAddresses.cidr(props.cidr),
    enableDnsSupport: true,
    natGateways: 2,
    subnetConfiguration: [
      {
        cidrMask: 18,
        name: 'subnet-public',
        subnetType: SubnetType.PUBLIC,
      },
      {
        cidrMask: 18,
        name: 'subnet-private-with-egress',
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
    ],
  });

  if (props.createS3Endpoint) {
    vpc.addGatewayEndpoint('s3-endpoint', {
      service: GatewayVpcEndpointAwsService.S3,
    });
  }

  return vpc;
};

export function createS3Bucket(scope: Construct) {
  const s3bucket = new Bucket(scope, 's3-bucket', {
    removalPolicy: RemovalPolicy.RETAIN,
    autoDeleteObjects: false,
    enforceSSL: true,
    encryption: BucketEncryption.S3_MANAGED,
    blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    serverAccessLogsBucket: Bucket.fromBucketArn(
      scope,
      'log',
      'arn:aws:s3:::cs-test',
    ),
  });
  return s3bucket;
}

export function importS3Bucket(scope: Construct) {
  return Bucket.fromBucketName(
    scope,
    'from-bucket',
    'clickstream-infra-s3sink4dfdadf4-10ewmceey09vp',
  );
}

export function createSns(scope: Construct): Topic {
  const encryptionKey = new Key(scope, 'sns-encryptionKey', {
    enableKeyRotation: true,
  });

  const topic = new Topic(scope, 'sns', {
    displayName: 'sns',
    masterKey: encryptionKey,
  });
  return topic;
}

export function createHostZone(scope: Construct) {
  return new PublicHostedZone(scope, 'HostedZone', {
    zoneName: 'cs.test-example.com',
  });
}

export function createMSKSecurityGroup(
  scope: Construct,
  vpc: IVpc,
): SecurityGroup {
  const mskSg = new SecurityGroup(scope, 'msk-sg', {
    description: 'MSK security group',
    vpc,
    allowAllOutbound: true,
  });

  mskSg.addIngressRule(mskSg, Port.allTcp());
  return mskSg;
}

export interface TestStackProps extends StackProps {
  withAlbAccessLog?: boolean;
  withDomainZone?: boolean;
  withMskConfig?: boolean;
  withS3SinkConfig?: boolean;
  withKinesisSinkConfig?: boolean;
  serverEndpointPath?: string;
  serverCorsOrigin?: string;
  warmPoolSize?: number;
  withWarmPoolSizeParameter?: boolean;
}

export class TestStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props: TestStackProps = {
      withDomainZone: false,
      withMskConfig: false,
      withS3SinkConfig: false,
      withKinesisSinkConfig: false,
      withAlbAccessLog: false,
      serverCorsOrigin: '*',
      warmPoolSize: 0,
      withWarmPoolSizeParameter: false,
    },
  ) {
    super(scope, id, props);

    const vpc = createVPC(this);
    const logS3Bucket = createS3Bucket(this);
    //const logS3Bucket = importS3Bucket(this);
    vpc.addFlowLog('vpcLog', {
      destination: FlowLogDestination.toS3(logS3Bucket, 'vpcLog/'),
    });

    let accessLogConfig = {
      loadBalancerLogProps: {
        enableAccessLog: false,
        bucket: logS3Bucket,
      },
    };

    if (props.withAlbAccessLog) {
      accessLogConfig = {
        loadBalancerLogProps: {
          enableAccessLog: true,
          bucket: logS3Bucket,
        },
      };
    }

    const notificationsTopic = createSns(this);
    const domainZone = createHostZone(this);

    let protocol = ApplicationProtocol.HTTP;

    let domainZoneConfig = {};
    if (props.withDomainZone) {
      domainZoneConfig = {
        domainZone,
      };
      protocol = ApplicationProtocol.HTTPS;
    }

    let mskSink = {};

    if (props.withMskConfig) {
      const kafkaSinkConfig = {
        kafkaBrokers: 'mskBroker1,mskBroker2,mskBroker3',
        kafkaTopic: 'testMskTopic',
        mskSecurityGroup: createMSKSecurityGroup(this, vpc),
        mskClusterName: 'mskCluster',
      };
      mskSink = {
        kafkaSinkConfig,
      };
    }

    let s3SinkConfig: S3SinkConfig | undefined = undefined;
    if (props.withS3SinkConfig) {
      s3SinkConfig = {
        s3Bucket: logS3Bucket,
        s3Prefix: 'test-s3-data',
        batchMaxBytes: 200000,
        batchTimeoutSecs: 1,
      };
    }

    let kinesisSinkConfig: KinesisSinkConfig | undefined = undefined;
    if (props.withKinesisSinkConfig) {
      kinesisSinkConfig = {
        kinesisDataStream: Stream.fromStreamArn(this, 'test-kinesis-stream', 'arn:aws:kinesis:us-east-1:123456789012:stream/test-kinesis-stream'),
      };
    }

    let fleetProps = {
      ...getDefaultFleetPropsByTier(TierType.SMALL),
      warmPoolSize: props.warmPoolSize,
    };

    if (props.withWarmPoolSizeParameter) {
      const warmPoolSizeParam = new CfnParameter(this, 'WarmPoolSizeParam', {
        type: 'Number',
        default: '0',
        minValue: 0,
      });
      fleetProps = {
        ...getDefaultFleetPropsByTier(TierType.SMALL),
        warmPoolSize: warmPoolSizeParam.valueAsNumber,
      };
    }

    const serverProps: IngestionServerProps = {
      vpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
      fleetProps,
      serverEndpointPath: props.serverEndpointPath
        ? props.serverEndpointPath
        : '/collect',
      serverCorsOrigin: props.serverCorsOrigin || '*',
      notificationsTopic,
      protocol,
      ...mskSink,
      ...accessLogConfig,
      ...domainZoneConfig,
      s3SinkConfig,
      kinesisSinkConfig,
    };

    const ingestionServer = new IngestionServer(
      this,
      'IngestionServer',
      serverProps,
    );
    new CfnOutput(this, 'ingestionServerUrl', {
      value: ingestionServer.serverUrl,
      description: 'Server Url',
    });
  }
}
