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
  IVpc,
  SubnetSelection,
  InstanceType,
  Port,
  SecurityGroup,
} from 'aws-cdk-lib/aws-ec2';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { Construct } from 'constructs';
import { ECSEc2Cluster } from './private/ecs-ec2-cluster';
import { ECSFargateCluster } from './private/ecs-fargate-cluster';
import { ECS_INFRA_TYPE_MODE } from '../../common/model';
import { deleteECSClusterCustomResource } from '../custom-resource/delete-ecs-cluster';
import { S3SinkConfig, KafkaSinkConfig, KinesisSinkConfig } from '../server/ingestion-server';
import { grantMskReadWrite } from '../server/private/iam';
import { createMetricsWidgetForKafka } from '../server/private/metircs-kafka';
import { createMetricsWidgetForServerV2 } from '../server/private/metircs-server';

export const RESOURCE_ID_PREFIX = 'clickstream-ingestion-service-';

export interface FleetProps {
  readonly workerCpu: number;
  readonly workerMemory: number;
  readonly proxyCpu: number;
  readonly proxyMemory: number;
  readonly workerThreads: number;
  readonly workerStreamAckEnable: boolean;
  readonly arch: Platform;
  readonly proxyMaxConnections: number;
  readonly taskMin: number;
  readonly taskMax: number;
  readonly scaleOnCpuUtilizationPercent: number;
  readonly instanceType?: InstanceType;
  readonly warmPoolSize?: number;
}

export interface MskS3SinkConnectorSetting {
  readonly maxWorkerCount: number;
  readonly minWorkerCount: number;
  readonly workerMcuCount: number;
}

export interface IngestionServerV2Props {
  readonly vpc: IVpc;
  readonly vpcSubnets: SubnetSelection;
  readonly fleetProps: FleetProps;
  readonly serverEndpointPath: string;
  readonly serverCorsOrigin: string;
  readonly kafkaSinkConfig?: KafkaSinkConfig;
  readonly s3SinkConfig?: S3SinkConfig;
  readonly kinesisSinkConfig?: KinesisSinkConfig;
  readonly devMode: string;
  readonly projectId: string;
  readonly workerStopTimeout: number;

  readonly ecsInfraType: string;
  readonly albTargetGroupArn: string;
  readonly ecsSecurityGroupArn: string;
  readonly loadBalancerFullName: string;
}

export class IngestionServerV2 extends Construct {
  constructor(scope: Construct, id: string, props: IngestionServerV2Props) {
    super(scope, id);
    const ecsSecurityGroup = SecurityGroup.fromSecurityGroupId(
      scope,
      'ecsSecurityGroup',
      props.ecsSecurityGroupArn,
    );

    if (props.kafkaSinkConfig?.mskSecurityGroup) {
      const mskSg = props.kafkaSinkConfig?.mskSecurityGroup;
      mskSg.addIngressRule(ecsSecurityGroup, Port.tcpRange(9092, 9198));
      mskSg.addIngressRule(mskSg, Port.tcpRange(9092, 9198));
    }

    let ecsCluster;
    if (props.ecsInfraType === ECS_INFRA_TYPE_MODE.FARGATE) {
      ecsCluster = new ECSFargateCluster(this, 'ECSFargateCluster', {
        ...props,
        ecsSecurityGroup,
      });
    } else {
      ecsCluster = new ECSEc2Cluster(this, 'ECSEc2Cluster', {
        ...props,
        ecsSecurityGroup,
      });
    }

    const mskClusterName = props.kafkaSinkConfig?.mskClusterName;
    if (mskClusterName) {
      const autoScalingGroupRole = ecsCluster.ecsInfraRole;
      grantMskReadWrite(
        this,
        autoScalingGroupRole,
        mskClusterName,
        'ingestion-to-msk-policy',
      );
    }

    createMetricsWidgetForServerV2(this, {
      projectId: props.projectId,
      albFullName: props.loadBalancerFullName,
      ecsServiceName: ecsCluster.ecsService.serviceName,
      ecsClusterName: ecsCluster.ecsService.cluster.clusterName,
    });

    if (props.kafkaSinkConfig && mskClusterName) {
      createMetricsWidgetForKafka(this, {
        projectId: props.projectId,
        mskClusterName: mskClusterName,
        kafkaBrokers: props.kafkaSinkConfig.kafkaBrokers,
        kafkaTopic: props.kafkaSinkConfig.kafkaTopic,
      });
    }

    createDeleteECSClusterHook(
      this,
      ecsCluster.ecsCluster.clusterArn,
      ecsCluster.ecsCluster.clusterName,
      ecsCluster.ecsService.serviceName,
    );
  }
}

function createDeleteECSClusterHook(scope: Construct, ecsClusterArn: string, ecsClusterName: string, ecsServiceName: string) {
  deleteECSClusterCustomResource(scope, {
    ecsClusterArn,
    ecsClusterName,
    ecsServiceName,
  });
}