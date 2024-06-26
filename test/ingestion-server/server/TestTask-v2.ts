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

import {
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
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { Stream } from 'aws-cdk-lib/aws-kinesis';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
} from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { S3SinkConfig, KafkaSinkConfig, KinesisSinkConfig } from '../../../src/ingestion-server/server/ingestion-server';
import {
  IngestionServerV2,
  IngestionServerV2Props,
  FleetProps,
} from '../../../src/ingestion-server/server-v2/ingestion-server-v2';


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

export interface TestStackV2Props extends StackProps {
  serverMin: number;
  serverMax: number;
  scaleOnCpuUtilizationPercent: number;
  workerStopTimeout: number;

  serverEndpointPath: string;
  serverCorsOrigin: string;
  protocol: string;
  domainName: string;
  certificateArn: string;
  enableApplicationLoadBalancerAccessLog: string;
  logBucketName: string;
  logPrefix: string;
  enableGlobalAccelerator: string;
  devMode: string;

  enableAuthentication: string;
  authenticationSecretArn: string;

  withMskConfig: boolean;
  kafkaBrokers?: string;
  kafkaTopic?: string;
  mskSecurityGroupId?: string;
  mskClusterName?: string;

  withKinesisSinkConfig: boolean;
  kinesisDataStreamArn?: string;

  withS3SinkConfig: boolean;
  s3BucketName?: string;
  s3Prefix?: string;
  batchTimeout?: number;
  batchMaxBytes?: number;

  privateSubnets?: string;
  publicSubnets?: string;
}

export class TestStackV2 extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props: TestStackV2Props = {
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
      workerStopTimeout: 60,
      serverEndpointPath: '/test',
      devMode: 'No',
    },
  ) {
    super(scope, id, props);

    const vpc = createVPC(this);
    const logS3Bucket = createS3Bucket(this);
    vpc.addFlowLog('vpcLog', {
      destination: FlowLogDestination.toS3(logS3Bucket, 'vpcLog/'),
    });

    let kafkaSinkConfig: KafkaSinkConfig | undefined;
    if (props.withMskConfig) {
      kafkaSinkConfig = {
        kafkaBrokers: 'mskBroker1,mskBroker2,mskBroker3',
        kafkaTopic: 'testMskTopic',
        mskSecurityGroup: createMSKSecurityGroup(this, vpc),
        mskClusterName: 'mskCluster',
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
        kinesisDataStream: Stream.fromStreamArn(this, 'test-kinesis-stream', 'arn:aws:kinesis:us-east-1:111111111111:stream/test-kinesis-stream'),
      };
    }

    const fleetProps: FleetProps = {
      workerCpu: 128,
      workerMemory: 256,
      proxyCpu: 128,
      proxyMemory: 256,
      arch: Platform.LINUX_AMD64,
      proxyMaxConnections: 1024,
      workerThreads: 6,
      workerStreamAckEnable: true,
      taskMin: props.serverMin || 1,
      taskMax: props.serverMax || 1,
      scaleOnCpuUtilizationPercent: props.scaleOnCpuUtilizationPercent || 50,
    };

    const serverProps: IngestionServerV2Props = {
      vpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
      fleetProps,
      serverEndpointPath: props.serverEndpointPath,
      serverCorsOrigin: props.serverCorsOrigin,
      s3SinkConfig,
      kinesisSinkConfig,
      kafkaSinkConfig,
      devMode: props.devMode,
      projectId: 'test-project',
      workerStopTimeout: props.workerStopTimeout,
      ecsInfraType: 'FARGATE',
      albTargetGroupArn: 'arn:aws:elasticloadbalancing:us-east-1:111111111111:targetgroup/test/xxxx',
      ecsSecurityGroupArn: 'arn:aws:ec2:us-east-1:111111111111:security-group/sg-xxxx',
      loadBalancerFullName: 'test-load-balancer',
    };

    new IngestionServerV2(
      this,
      'IngestionServer',
      serverProps,
    );
  }
}
