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
  EIngestionType,
  ENetworkType,
  ProtocalType,
  ResourceCreateMethod,
  SinkType,
} from './const';

export const INIT_PROJECT_DATA = {
  id: 'my_project_id',
  name: '',
  description: '',
  emails: '',
  platform: '',
  region: '',
  environment: '',
};

export const INIT_EXT_PIPELINE_DATA: IExtPipeline = {
  id: '',
  type: '',
  prefix: '',
  projectId: '',
  pipelineId: '',
  appIds: [],
  region: '',
  dataCollectionSDK: '',
  tags: [],
  network: {
    vpcId: '',
    publicSubnetIds: [],
    privateSubnetIds: [],
    type: ENetworkType.General,
  },
  bucket: {
    name: '',
    prefix: '',
  },
  ingestionServer: {
    ingestionType: EIngestionType.EC2,
    size: {
      serverMin: 2,
      serverMax: 4,
      warmPoolSize: 0,
      scaleOnCpuUtilizationPercent: 50,
    },
    domain: {
      domainName: '',
      certificateArn: '',
    },
    loadBalancer: {
      serverEndpointPath: '/collect',
      serverCorsOrigin: '',
      protocol: ProtocalType.HTTPS,
      enableGlobalAccelerator: false,
      enableApplicationLoadBalancerAccessLog: false,
      authenticationSecretArn: '',
      logS3Bucket: {
        name: '',
        prefix: '',
      },
      notificationsTopicArn: '',
    },
    sinkType: SinkType.KDS,
    sinkBatch: {
      size: 10000,
      intervalSeconds: 300,
    },
    sinkS3: {
      sinkBucket: {
        name: '',
        prefix: '',
      },
      s3BufferSize: 10,
      s3BufferInterval: 300,
    },
    sinkKafka: {
      brokers: [],
      topic: '',
      securityGroupId: '',
      mskCluster: {
        name: '',
        arn: '',
      },
      kafkaConnector: {
        enable: true,
      },
    },
    sinkKinesis: {
      kinesisStreamMode: '',
      kinesisShardCount: 2,
      sinkBucket: {
        name: '',
        prefix: '',
      },
    },
  },
  dataProcessing: {
    dataFreshnessInHour: 72,
    scheduleExpression: '',
    sourceS3Bucket: {
      name: '',
      prefix: '',
    },
    sinkS3Bucket: {
      name: '',
      prefix: '',
    },
    pipelineBucket: {
      name: '',
      prefix: '',
    },
    transformPlugin: '',
    enrichPlugin: [],
  },
  dataModeling: {
    athena: true,
    redshift: {
      dataRange: 0,
      provisioned: {
        clusterIdentifier: '',
        dbUser: '',
      },
      newServerless: {
        network: {
          vpcId: '',
          subnetIds: [],
          securityGroups: [],
        },
        baseCapacity: 16,
      },
    },
  },
  reporting: {
    quickSight: {
      accountName: '',
    },
  },

  selectedRegion: null,
  selectedVPC: null,
  selectedSDK: null,
  selectedS3Bucket: null,
  selectedPublicSubnet: [],
  selectedPrivateSubnet: [],
  selectedCertificate: null,
  selectedSecret: null,
  mskCreateMethod: ResourceCreateMethod.EXISTING,
  selectedMSK: null,
  selectedSelfHostedMSKSG: null,
  seledtedKDKProvisionType: null,
  kafkaSelfHost: false,
  kafkaBrokers: '',

  enableDataProcessing: true,
  scheduleExpression: '',

  exeCronExp: '',
  excutionFixedValue: '1',
  enableRedshift: true,
  eventFreshValue: '3',
  redshiftExecutionValue: '6',

  selectedExcutionType: null,
  selectedExcutionUnit: null,
  selectedEventFreshUnit: null,
  selectedRedshiftCluster: null,
  selectedRedshiftRole: null,
  selectedRedshiftExecutionUnit: null,

  selectedQuickSightUser: null,
  selectedTransformPlugins: [],
  selectedEnrichPlugins: [],
  enableReporting: true,
  arnAccountId: '',
  enableAuthentication: false,
  redshiftType: 'serverless',
  redshiftBaseCapacity: null,
  redshiftServerlessVPC: null,
  redshiftServerlessSG: [],
  redshiftServerlessSubnets: [],
  redshiftDataLoadValue: '5',
  redshiftDataLoadUnit: null,
  selectedDataLoadType: null,
  dataLoadCronExp: '',
  serviceStatus: {
    AGA: false,
    EMR_SERVERLESS: false,
    REDSHIFT_SERVERLESS: false,
    MSK: false,
    QUICK_SIGHT: false,
  },
  showServiceStatus: false,
  enrichPluginChanged: false,
  transformPluginChanged: false,
};

export const INIT_USER_DATA: IUser = {
  id: '',
  type: 'USER',
  prefix: 'USER',
  name: '',
  roles: [],
  createAt: 0,
  updateAt: 0,
  operator: '',
  deleted: false,
};
