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

import { ProtocalType, ResourceCreateMehod, SinkType } from './const';

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
  },
  bucket: {
    name: '',
    prefix: '',
  },
  ingestionServer: {
    size: {
      serverMin: 2,
      serverMax: 4,
      warmPoolSize: 1,
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
    sinkType: SinkType.MSK,
    sinkBatch: {
      size: 50000,
      intervalSeconds: 3000,
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
  etl: {
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
  dataAnalytics: {
    athena: false,
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
    loadWorkflow: {
      loadJobScheduleIntervalExpression: '',
    },
    upsertUsers: {
      scheduleExpression: '',
    },
  },
  report: {
    quickSight: {
      accountName: '',
      user: '',
    },
  },

  selectedRegion: null,
  selectedVPC: null,
  selectedSDK: null,
  selectedPublicSubnet: [],
  selectedPrivateSubnet: [],
  selectedCertificate: null,
  selectedSecret: null,
  mskCreateMethod: ResourceCreateMehod.EXSITING,
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
  enableAthena: false,
  eventFreshValue: '3',
  redshiftExecutionValue: '6',

  selectedExcutionType: null,
  selectedExcutionUnit: null,
  selectedEventFreshUnit: null,
  selectedRedshiftCluster: null,
  selectedRedshiftRole: null,
  selectedRedshiftExecutionUnit: null,

  selectedTransformPlugins: [],
  selectedEnrichPlugins: [],
  enableReporting: true,
  selectedQuickSightUser: null,
  arnAccountId: '',
  enableAuthentication: false,
  redshiftType: 'serverless',
  redshiftBaseCapacity: null,
  redshiftServerlessVPC: null,
  redshiftServerlessSG: [],
  redshiftServerlessSubnets: [],
  redshiftDataLoadValue: '5',
  redshiftDataLoadUnit: null,
  redshiftUpsertFreqValue: '1',
  redshiftUpsertFreqUnit: null,
  selectedUpsertType: null,
  upsertCronExp: '',
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
};
